import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import { BuildStack } from './build-stack';
import { EcsStack } from './ecs-stack';

export interface BuildStageProps extends cdk.StageProps {
  stage: string;
  vpc: ec2.IVpc;
}

export class BuildStage extends cdk.Stage {
  constructor(scope: cdk.Construct, id: string, props: BuildStageProps) {
    super(scope, id, props);

    const buildStack = new BuildStack(this, 'BuildStack',
      { env: { account: process.env.CDK_DEPLOY_ACCOUNT, region: process.env.CDK_DEPLOY_REGION } });

    // NOTE: Need to get vpcId fromLookup
    /* const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      vpcId: 'vpc-0718c770a1fe6ebe6',
    });
    */

    new EcsStack(this, 'EcsStack', { stage: props.stage, vpc: props.vpc, imageTag: buildStack.imageTag.toString() });

  }
}