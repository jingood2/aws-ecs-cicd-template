import * as ecs from '@aws-cdk/aws-ecs';
import * as cdk from '@aws-cdk/core';
import { EcsApp } from './ecs-app';
import { EcsPipeline } from './ecs-pipeline';

export interface EcsAppStackProps extends cdk.StackProps {
  cluster: ecs.Cluster;
}

export class EcsAppStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;

  constructor(scope: cdk.Construct, id: string, props: EcsAppStackProps) {
    super(scope, id, props);

    this.cluster = props.cluster;

    // Create Ecs Service
    const ecsApp = new EcsApp(this, 'EcsApp', {
      cluster: this.cluster,
    });

    new EcsPipeline(this, 'EcsPipeline', {
      ecsApp: ecsApp,
    });
  }
}