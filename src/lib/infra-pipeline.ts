import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as ecr from '@aws-cdk/aws-ecr';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import * as pipelines from '@aws-cdk/pipelines';

import { envVars } from './config';

export interface InfraPipelineStackProps extends cdk.StackProps {

}

export class InfraPipelineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: InfraPipelineStackProps) {
    super(scope, id, props);

    const sourceArtifact = new codepipeline.Artifact('Source');
    const cdkOutputArtifact = new codepipeline.Artifact('CdkOutput');

    var sourceAction;

    // NOTE: Specify your pipeline repository info
    if (envVars.GIT_PROVIDER == 'github') {
      sourceAction = new codepipeline_actions.GitHubSourceAction({
        actionName: 'Github-Source',
        owner: 'jingood2',
        repo: envVars.INFRA.REPO_NAME,
        oauthToken: cdk.SecretValue.secretsManager(`${envVars.INFRA.GITHUB_TOKEN}`),
        branch: 'main',
        output: sourceArtifact,
        trigger: codepipeline_actions.GitHubTrigger.POLL,
      });
    } else {
      const repo = new codecommit.Repository(this, 'Repo', {
        repositoryName: envVars.INFRA.REPO_NAME,
        description: 'aws cdk vpc pipeline repository',
      });

      sourceAction = new codepipeline_actions.CodeCommitSourceAction({
        actionName: 'codecommit',
        output: sourceArtifact,
        branch: 'main',
        trigger: codepipeline_actions.CodeCommitTrigger.EVENTS,
        repository: repo,
      });

    }

    const pipeline = new pipelines.CdkPipeline(this, 'CdkPipeline', {
      pipelineName: 'cdk-cdkpipeline',
      cloudAssemblyArtifact: cdkOutputArtifact,
      sourceAction: sourceAction,
      synthAction: pipelines.SimpleSynthAction.standardYarnSynth({
        sourceArtifact: sourceArtifact,
        cloudAssemblyArtifact: cdkOutputArtifact,
        subdirectory: 'infra',
      }),
    });

    // NOTE: If there is no App Code in this repo, Add SourceAction to this pipelines
    const appCodeSourceOutput = new codepipeline.Artifact();

    const sourceStage = pipeline.addStage('AppSource');
    sourceStage.addActions(new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'AppCodeSource',
      // NOTE : CodeCommit Repository Name
      repository: new codecommit.Repository(this, 'APpCodeSourceRepository', { repositoryName: `${envVars.APP.REPO_NAME}` }),
      output: appCodeSourceOutput,
    }));

    // 2. Build and Publish application artifacts
    const ecrRepository = new ecr.Repository(this, 'ECRRepository', {
      // NOTE : ECR Repository Name
      repositoryName: `${envVars.PROJECT_NAME}-${envVars.APP.NAME}`,
    });

    const buildRole = new iam.Role(this, 'DockerBuildRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
    });
    ecrRepository.grantPullPush(buildRole);

    const buildStage = pipeline.addStage('AppDockerBuild');

    const appCodeDockerBuild = new codebuild.Project(this, 'DockerBuild', {
      role: buildRole,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
        privileged: true,
      },
      buildSpec: this.getDockerBuildSpec(ecrRepository.repositoryUri),
    });

    const appCodeBuildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'DockerBuild',
      //input: sourceArtifact,
      input: appCodeSourceOutput,
      project: appCodeDockerBuild,
    });

    appCodeBuildAction.variable('imageTag');

    buildStage.addActions(appCodeBuildAction);

  } // constructor

  private getDockerBuildSpec(repositoryUri: string): codebuild.BuildSpec {
    return codebuild.BuildSpec.fromObject({
      version: '0.2',
      phases: {
        pre_build: {
          commands: [
            'echo Logging in to Amazon ECR...',
            '$(aws ecr get-login --no-include-email --region $AWS_DEFAULT_REGION)',
          ],
        },
        build: {
          commands: [
            'echo change directory where the Dockerfile is',
            'cd app',
            'echo Build started on `date`',
            'echo Building the Docker image...',
            `docker build -t ${repositoryUri}:$CODEBUILD_RESOLVED_SOURCE_VERSION .`,
          ],
        },
        post_build: {
          commands: [
            'echo Build completed on `date`',
            'echo Pushing the Docker image...',
            `docker push ${repositoryUri}:$CODEBUILD_RESOLVED_SOURCE_VERSION`,
            'export iamgeTag=$CODEBUILD_RESOLVED_SOURCE_VERSION'
          ],
        },
        env: {
          'exported-variables': [
            'imageTag',
          ],
        },
      },
    });
  }
}