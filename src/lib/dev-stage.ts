import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import { EcsAppStack } from './ecs-app-stack';
import { EcsClusterStack } from './ecs-cluster-stack';

export interface DevStageProps extends cdk.StageProps {
  vpc: ec2.IVpc;
}

export class DevStage extends cdk.Stage {
  constructor(scope: cdk.Construct, id: string, props: DevStageProps) {
    super(scope, id, props);

    // ECS Cluster Stack
    const clusterStack = new EcsClusterStack(this, 'ECSCluster', {
      vpc: props.vpc,
      stageName: 'Dev',
      env: { account: process.env.CDK_DEPLOY_ACCOUNT, region: process.env.CDK_DEPLOY_REGION },
    });

    new EcsAppStack(this, 'ECSAppStack', {
      cluster: clusterStack.ecsCluster,
      env: { account: process.env.CDK_DEPLOY_ACCOUNT, region: process.env.CDK_DEPLOY_REGION },
    });
    // Alb Stack

  }
}