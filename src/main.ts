import { App, Construct, Stack, StackProps } from '@aws-cdk/core';
import { InfraPipelineStack } from './lib/infra-pipeline';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new InfraPipelineStack(app, 'project-app-pipelines', { env: devEnv });

app.synth();