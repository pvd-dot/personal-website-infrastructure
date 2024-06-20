#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PersonalWebsiteStack } from '../lib/server-stack';
import { CertStack } from '../lib/cert-stack';
import { VPCStack } from '../lib/vpc-stack';

const app = new cdk.App();

const certStack = new CertStack(app, 'CertStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.AWS_DEFAULT_REGION,    
  }
});

const vpcStack = new VPCStack(app, 'VPCStack', {
  env: {  
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.AWS_DEFAULT_REGION,
  }
});

const personalWebsiteStack = new PersonalWebsiteStack(app, 'PersonalWebsiteStack', {
  hostedZone: certStack.hostedZone,
  certificate: certStack.certificate,
  vpc: vpcStack.vpc,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.AWS_DEFAULT_REGION,
  }
});
personalWebsiteStack.addDependency(certStack);
personalWebsiteStack.addDependency(vpcStack);

