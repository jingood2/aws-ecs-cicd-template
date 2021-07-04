import { App, Construct, Stack, StackProps } from '@aws-cdk/core';
import { InfraPipelineStack } from './lib/infra-pipeline';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
  }
}

// for development, use account/region from cdk cli
/* const devEnv = {
  account: process.env.CDK_DEPLOY_ACCOUNT,
  region: process.env.CDK_DEPLOY_REGION,
}; */

const app = new App();

new InfraPipelineStack(app, 'project-app-pipelines', { env: { account: '037729278610', region: 'ap-northeast-2' } } );

//app.synth();