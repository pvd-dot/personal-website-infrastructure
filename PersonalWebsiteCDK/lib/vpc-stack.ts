import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { FckNatInstanceProvider } from 'cdk-fck-nat'

export class VPCStack extends cdk.Stack {
  readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const natGatewayProvider = new FckNatInstanceProvider({
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.NANO),
      });
  
      this.vpc = new ec2.Vpc(this, 'PersonalWebsiteVPC', {
        natGatewayProvider,
      });
  
      natGatewayProvider.securityGroup.addIngressRule(ec2.Peer.ipv4(this.vpc.vpcCidrBlock), ec2.Port.allTraffic());
  }
}


