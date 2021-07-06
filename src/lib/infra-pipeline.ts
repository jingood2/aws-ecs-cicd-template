import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import * as pipelines from '@aws-cdk/pipelines';
//import { BuildStage } from './build-stage';

import { envVars } from './config';
//import { DevStage } from './dev-stage';

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
        //subdirectory: 'infra',
        installCommand: 'yarn install --frozen-lockfile && yarn projen',
        buildCommand: 'yarn build',
      }),
    });

    ec2.Vpc.fromLookup(this, 'VPC', {
      vpcId: envVars.DEV_STAGE_ENV.VPC_ID,
    });

    //pipeline.addApplicationStage(new BuildStage(this, 'DevStage', { vpc: vpc, stage: 'Develop', env: { account: '037729278610', region: 'ap-northeast-2' } }));

    /* pipeline.addApplicationStage(new DevStage(this, 'dev', {
      env: { account: '037729278610', region: 'ap-northeast-2' },
      vpc: vpc,
    } ) ); */

  }
}