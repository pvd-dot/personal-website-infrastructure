#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PersonalWebsiteStack } from '../lib/personal_website-stack';
import { CertStack } from '../lib/personal_website-cert-stack';

const app = new cdk.App();

const certStack = new CertStack(app, 'PersonalWebsiteCertStack', {
});

const personalWebsiteStack = new PersonalWebsiteStack(app, 'PersonalWebsiteStack', {
  hostedZone: certStack.hostedZone,
  certificate: certStack.certificate,
});

