import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as cdk from '@aws-cdk/core';

export interface EcsAppProps {
  cluster: ecs.Cluster;
}

export class EcsApp extends cdk.Construct {
  private fargateService: ecsPatterns.ApplicationLoadBalancedFargateService;

  public readonly service: ecs.IBaseService;
  public readonly containerName: string;
  public readonly ecrRepo: ecr.Repository;

  constructor(scope: cdk.Construct, id: string, props: EcsAppProps) {
    super(scope, id);

    this.fargateService = this.createService(props.cluster);

    this.ecrRepo = new ecr.Repository(this, 'ECRRepo');
    this.ecrRepo.grantPull(this.fargateService.taskDefinition.executionRole!);
    this.service = this.fargateService.service;
    this.containerName = this.fargateService.taskDefinition.defaultContainer!.containerName;

    this.addAutoScaling();
    this.output();
  }

  private createService(cluster: ecs.Cluster) {
    return new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'EcsFargateService', {
      cluster,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
      },
    });
  }

  private addAutoScaling() {
    const autoScalingGroup = this.fargateService.service.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 3,
    });

    autoScalingGroup.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });
  }

  private output() {
    new cdk.CfnOutput(this, 'EcrRepo_ARN', { value: this.ecrRepo.repositoryArn } );
    new cdk.CfnOutput(this, 'ContainerName', { value: this.containerName } );
  }
}