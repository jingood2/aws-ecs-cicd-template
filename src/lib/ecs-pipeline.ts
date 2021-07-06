import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import * as sns from '@aws-cdk/aws-sns';
import * as ssm from '@aws-cdk/aws-ssm';
import * as cdk from '@aws-cdk/core';

import { envVars } from './config';
import { EcsApp } from './ecs-app';

export interface githubInfo {
  repo: string;
  owner: string;
}

export interface EcsPipelineProps {
  ecsApp: EcsApp;
  githubInfo?: githubInfo;
}

export class EcsPipeline extends cdk.Construct {
  public readonly ecsApp: EcsApp;
  public readonly service: ecs.IBaseService;
  public readonly containerName: string;
  public readonly ecrRepo: ecr.Repository;

  public readonly pipeline: codepipeline.Pipeline;

  constructor(scope: cdk.Construct, id: string, props: EcsPipelineProps) {
    super(scope, id);

    this.ecsApp = props.ecsApp;
    this.service = props.ecsApp.service;
    this.ecrRepo = props.ecsApp.ecrRepo;
    this.containerName = props.ecsApp.containerName;

    this.pipeline = this.createPipeline();
    this.output();
  }

  private createPipeline(): codepipeline.Pipeline {

    // source output artifact
    const sourceOutput = new codepipeline.Artifact();
    // docker build output artifact
    const buildOutput = new codepipeline.Artifact();

    return new codepipeline.Pipeline(this, 'Pipeline', {
      stages: [
        this.createSourceStage('Source', sourceOutput),
        this.createImageBuildStage('Build', sourceOutput, buildOutput),
        this.createDeployStage('DeployOnDev', buildOutput),
        this.createApprovalStage('Approval'),
        this.createDeployStage('DeployOnProd', buildOutput),
      ],
    });
  }

  private createSourceStage(stageName: string, output: codepipeline.Artifact) : codepipeline.StageProps {
    const secret = cdk.SecretValue.secretsManager(`/${envVars.PROJECT_NAME}/${envVars.APP.NAME}/GITHUB_TOKEN`);
    const repo = ssm.StringParameter.valueForStringParameter(this, `/${envVars.PROJECT_NAME}/${envVars.APP.NAME}/GITHUB_REPO`);
    const owner = ssm.StringParameter.valueForStringParameter(this, `/${envVars.PROJECT_NAME}/${envVars.APP.NAME}/GITHUB_OWNER`);

    const githubAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'Github_Source',
      owner: owner,
      repo: repo,
      oauthToken: secret,
      output: output,
    });

    return {
      stageName: stageName,
      actions: [githubAction],
    };
  }

  private createImageBuildStage(
    stageName: string,
    input: codepipeline.Artifact,
    output: codepipeline.Artifact ) : codepipeline.StageProps {

    const project = new codebuild.PipelineProject(this, 'Project', {
      buildSpec: this.createBuildSpec(),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
        privileged: true,
      },
      environmentVariables: {
        REPOSITORY_URI: { value: this.ecrRepo.repositoryUri },
        CONTAINER_NAME: { value: this.containerName },
      },
    });
    this.ecrRepo.grantPullPush(project.grantPrincipal);

    const codebuildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'CodeBuild_Action',
      input: input,
      outputs: [output],
      project: project,
    });

    return {
      stageName: stageName,
      actions: [codebuildAction],
    };
  }

  private createApprovalStage( stageName: string ) : codepipeline.StageProps {
    const manualApprovalAction = new codepipeline_actions.ManualApprovalAction({
      actionName: 'Approve',
      notificationTopic: new sns.Topic(this, 'Topic'), // optional
      notifyEmails: [
        'some_email@example.com',
      ], // optional
      additionalInformation: 'additional info', // optional
    });

    return {
      stageName: stageName,
      actions: [manualApprovalAction],
    };
  }

  private createDeployStage(
    stageName: string,
    input: codepipeline.Artifact) : codepipeline.StageProps {

    const ecsDeployAction = new codepipeline_actions.EcsDeployAction({
      actionName: 'ECSDeploy_Action',
      input: input,
      service: this.service,
    });

    return {
      stageName: stageName,
      actions: [ecsDeployAction],
    };
  }

  private createBuildSpec() : codebuild.BuildSpec {
    return codebuild.BuildSpec.fromObject({
      version: '0.2',
      phase: {
        pre_build: {
          command: [
            'aws --version',
            '$(aws ecr get-login --region ${AWS_DEFAULT_REGION} --no-include-email |  sed \'s|https://||\')',
            'COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)',
            'IMAGE_TAG=${COMMIT_HASH:=latest}', // NOTE: parameter is unset, default is latest
          ],
        },
        build: {
          commands: [
            'docker build -t $REPOSITORY_URI:latest .',
            'docker tag $REPOSITORY_URI:latest $REPOSITORY_URI:$IAMGE_TAG',
          ],
        },

        post_build: {
          commands: [
            'docker push $REPOSITORY_URI:latest',
            'docker push $REPOSITORY_URI:$IMAGE_TAG',
            'printf "{\\"name\\":\\"${CONTAINER_NAME}\\",\\"imageUri:\\"${REPOSITORY_URI}:latest\\"}]" > imagedefinitions.json',
          ],
        },
      },
      artifacts: {
        files: ['imagedefinitions.json'],
      },
    });
  }

  private output() {
    new cdk.CfnOutput(this, 'Pipeline ARN', { value: this.pipeline.pipelineArn } );
  }

}