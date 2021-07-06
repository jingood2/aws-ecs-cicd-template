import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as cdk from '@aws-cdk/core';
import { envVars } from './config';

export interface EcsClusterStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  stageName: string;
}

export class EcsClusterStack extends cdk.Stack {
  public readonly ecsCluster: ecs.Cluster;

  constructor(scope: cdk.Construct, id: string, props: EcsClusterStackProps) {
    super(scope, id, props);

    this.ecsCluster = new ecs.Cluster(this, 'EcsCluster', {
      clusterName: `${envVars.PROJECT_NAME}-${props.stageName}-cluster`,
      vpc: props.vpc,
    });
    this.output();

  }

  private output() {
    new cdk.CfnOutput(this, 'ECSCluster_ARN', { value: this.ecsCluster.clusterArn });
  }
}