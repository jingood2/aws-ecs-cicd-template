import * as chalk from 'chalk';

export const envVars = {
  REGION: process.env.REGION || 'ap-northeast-2',
  PROJECT_NAME: 'project',
  GIT_PROVIDER: 'github',
  INFRA: {
    REPO_NAME: process.env.REPO_NAME || 'project-app-pipelines-template',
    REPO_OWNER: process.env.REPO_OWNER || 'jingood2',
    BUILD_BRANCH: process.env.BUILD_BRANCH || 'main',
    GITHUB_TOKEN: 'atcl/jingood2/github-token',
  },
  APP: {
    NAME: process.env.APP_NAME || 'demo-app',
    REPO_NAME: process.env.REPO_NAME || 'project-demo-app',
    REPO_OWNER: process.env.REPO_OWNER || 'jingood2',
    BUILD_BRANCH: process.env.BUILD_BRANCH || 'main',
  },
  DEV_STAGE_ENV: {
    VPC_ID: '<<VPC_ID>>',
    PUB_SUBNET_ID: '<<PUBLIC_SUBNET_LIST>>',
    PRI_SUBNET_ID: '<<PRIVATE_SUBNET_LIST>>',
  },
  PROD_STAGE_ENV: {
    VPC_ID: '<<VPC_ID>>',
    PUB_SUBNET_ID: '<<PUBLIC_SUBNET_LIST>>',
    PRI_SUBNET_ID: '<<PRIVATE_SUBNET_LIST>>',
  },
};

export function validateEnvVariables() {
  for (let variable in envVars) {
    if (!envVars[variable as keyof typeof envVars]) {
      throw Error(
        chalk.red(`[app]: Environment variable ${variable} is not defined!`),
      );
    }
  }
}