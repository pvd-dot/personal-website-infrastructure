import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as certmgr from 'aws-cdk-lib/aws-certificatemanager';

// Create route 53 hosted zone and certificate in a separate stack, as per aws recommendation
// https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager-readme.html#aws-certificate-manager-construct-library 
// Note - deploying this stack requires a manual change in the AWS console, since setup for registering a domain is not supported in CDK. 
// To successfully deploy, you need to have a domain name already registered in Route 53.
// After the hosted zone has been created by this stack, you will need to need to update the registered domain name servers 
// to match the name servers of your hosted zone. This will allow the certificate validation to successfully complete.
export class CertStack extends cdk.Stack {
  readonly certificate: certmgr.Certificate;
  readonly hostedZone: route53.HostedZone;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    if (!process.env.PERSONAL_WEBSITE_DOMAIN_NAME) {
      throw new Error('PERSONAL_WEBSITE_DOMAIN_NAME environment variable is not set');
    }

    const personalWebsiteDomainName = process.env.PERSONAL_WEBSITE_DOMAIN_NAME as string;

    this.hostedZone = new route53.HostedZone(this, 'PersonalWebsiteHostedZone', {
      zoneName: personalWebsiteDomainName,
    });

    this.certificate = new certmgr.Certificate(this, 'PersonalWebsiteCertificate', {
      domainName: personalWebsiteDomainName,
      certificateName: 'Personal Website',
      validation: certmgr.CertificateValidation.fromDns(this.hostedZone),
    });
  }
}


