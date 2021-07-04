import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as ecr from '@aws-cdk/aws-ecr';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import { envVars } from './config';


export interface BuildStackProps extends cdk.StackProps {
}

export class BuildStack extends cdk.Stack {

  //public imageTag: string;
  public readonly imageTag: cdk.CfnOutput;

  constructor(scope: cdk.Construct, id: string, props: BuildStackProps) {
    super(scope, id, props);

    const repo = new codecommit.Repository(this, 'APpCodeSourceRepository', { repositoryName: `${envVars.APP.REPO_NAME}` });

    const ecrRepository = new ecr.Repository(this, 'ECRRepository', {
      repositoryName: `${envVars.PROJECT_NAME}/${envVars.APP.NAME}`,
    });

    const buildRole = new iam.Role(this, 'DockerBuildRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
    });
    ecrRepository.grantPullPush(buildRole);

    // Pipeline
    // NOTE: If there is no App Code in this repo, Add SourceAction to this pipelines
    const sourceOuput = new codepipeline.Artifact();

    const appSourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'CodeCommit_Source',
      repository: repo,
      output: sourceOuput,
    });

    const appBuildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'UnitTest_Runner',
      input: sourceOuput,
      project: new codebuild.Project(this, 'DockerBuild', {
        role: buildRole,
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
          privileged: true,
        },
        buildSpec: this.getDockerBuildSpec(ecrRepository.repositoryUri),
      }),
    });

    new codepipeline.Pipeline(this, 'AppBuildPipeline', {
      stages: [
        {
          stageName: 'Source',
          actions: [
            appSourceAction,
          ],
        },
        {
          stageName: 'Build',
          actions: [
            appBuildAction,
          ],
        },
      ],
    });

    this.imageTag = new cdk.CfnOutput(this, 'ImageTag', {
      value: appBuildAction.variable('imageTag'),
    });

    //this.imageTag = appBuildAcption.variable('imageTag');
  }

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
            //'cd app',
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
            'export iamgeTag=$CODEBUILD_RESOLVED_SOURCE_VERSION',
          ],
        },
      },
    });
  }
}