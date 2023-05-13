import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class PersonalWebsiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC
    const vpc = new ec2.Vpc(this, 'MyVpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    // Create a security group
    const securityGroup = new ec2.SecurityGroup(this, 'MySecurityGroup', {
      vpc,
      description: 'Allow SSH access to the instance',
    });

    // Add SSH rule to the security group
    // securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH access from the internet');

    // Create an ECS cluster
    const cluster = new ecs.Cluster(this, 'MyCluster', {
      vpc,
    });

    // Add an ECS capacity provider with a t3.nano instance
    cluster.addCapacity('MyCapacityProvider', {
      instanceType: new ec2.InstanceType('t3.nano'),
      minCapacity: 1,
      maxCapacity: 1,
    });

    // Create a task definition
    const taskDefinition = new ecs.Ec2TaskDefinition(this, 'MyTask', {
      networkMode: ecs.NetworkMode.AWS_VPC
    });

    // Add a container to the task definition using your Dockerfile
    const container = taskDefinition.addContainer('MyContainer', {
      // load image from Dockerfile in root directory
      image: ecs.ContainerImage.fromAsset('../PersonalWebsiteGo'),
      memoryLimitMiB: 256,
    });

    // Create a service to run the task definition
    new ecs.Ec2Service(this, 'MyService', {
      cluster: cluster,
      taskDefinition: taskDefinition,
      securityGroups: [securityGroup],
    });

    const keyPair = new ec2.CfnKeyPair(this, 'MyKeyPair', {
      keyName: 'personal-website-bastion-key-pair',
    });


    const bastionHostSecurityGroup = new ec2.SecurityGroup(this, 'BastionHostSecurityGroup', {
      vpc,
      description: 'Allow SSH access to the bastion host',
    });
    bastionHostSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH access from the internet');
    const bastionHost = new ec2.Instance(this, 'BastionHost', {
      vpc,
      instanceType: new ec2.InstanceType('t3.nano'),
      machineImage: new ec2.AmazonLinuxImage(),
      securityGroup: bastionHostSecurityGroup,
      keyName: keyPair.keyName,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC }, // explicitly choosing public subnet
    });
    securityGroup.addIngressRule(bastionHostSecurityGroup, ec2.Port.tcp(22), 'Allow SSH access from the bastion host');



  }
}
