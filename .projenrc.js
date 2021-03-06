const { AwsCdkTypeScriptApp } = require('projen');
const project = new AwsCdkTypeScriptApp({
  cdkVersion: '1.110.0',
  defaultReleaseBranch: 'main',
  name: 'cdk-ecs-pipelines-template',

  cdkDependencies: [
    '@aws-cdk/aws-codebuild',
    '@aws-cdk/aws-codecommit',
    '@aws-cdk/aws-codedeploy',
    '@aws-cdk/aws-codepipeline',
    '@aws-cdk/aws-codepipeline-actions',
    '@aws-cdk/aws-lambda',
    '@aws-cdk/core',
    '@aws-cdk/aws-s3',
    '@aws-cdk/pipelines',
    '@aws-cdk/aws-iam',
    '@aws-cdk/aws-ecr',
    '@aws-cdk/aws-ecs-patterns',
    '@aws-cdk/aws-ec2',
    '@aws-cdk/aws-ecs',
    '@aws-cdk/aws-ssm',
    '@aws-cdk/aws-sns',
  ], /* Which AWS CDK modules (those that start with "@aws-cdk/") this app uses. */
  context: {
    '@aws-cdk/core:newStyleStackSynthesis': true,
  },
  deps: [
    'chalk',
  ], /* Runtime dependencies of this module. */
  // description: undefined,            /* The description is just a string that helps people understand the purpose of the package. */
  devDeps: [
    'cdk-assume-role-credential-plugin',
  ], /* Build dependencies for this module. */
  // packageName: undefined,            /* The "name" in package.json. */
  // projectType: ProjectType.UNKNOWN,  /* Which type of project this is (library/app). */
  // releaseWorkflow: undefined,        /* Define a GitHub workflow for releasing from "main" when new versions are bumped. */
});
project.cdkConfig.plugin = ['cdk-assume-role-credential-plugin'];
project.synth();