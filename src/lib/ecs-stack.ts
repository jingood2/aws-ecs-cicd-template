import { IVpc } from '@aws-cdk/aws-ec2';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ecs_patterns from '@aws-cdk/aws-ecs-patterns';
import * as cdk from '@aws-cdk/core';

export interface EcsStackProps extends cdk.StackProps {
  stage: string;
  vpc: IVpc;
  imageTag: string;
}

export class EcsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    /*  const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      vpcId: props.vpcId,
    });
 */
    const repository = ecr.Repository.fromRepositoryName(this, 'Repository', 'project/demo-app');
    const imageTag = props.imageTag || process.env.CODEBUILD_RESOLVED_SOURCE_VERSION ;

    const cluster = new ecs.Cluster(this, `Cluster_${props.stage}`, {
      clusterName: `cdk-cicd_${props.stage}`,
      vpc: props.vpc,
    });

    const albService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, `Service_${props.stage}`, {
      cluster: cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      taskImageOptions: {
        containerName: 'app',
        containerPort: 8080,
        image: ecs.ContainerImage.fromEcrRepository(repository, imageTag),
      },

      publicLoadBalancer: true,
      healthCheckGracePeriod: cdk.Duration.seconds(10),
    });

    const serviceScaling = albService.service.autoScaleTaskCount({ maxCapacity: 2 });
    serviceScaling.scaleOnCpuUtilization('ScalingCpu', {
      targetUtilizationPercent: 60,
    });

    albService.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '30');

    albService.targetGroup.configureHealthCheck({
      enabled: true,
      path: '/_health',
    });


  }
}