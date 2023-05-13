import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as certmgr from 'aws-cdk-lib/aws-certificatemanager';
import { LogGroup } from 'aws-cdk-lib/aws-logs';

export interface PersonalWebsiteStackProps extends cdk.StackProps {
  /**
   * Hosted zone for DNS records
  */
  readonly hostedZone: route53.HostedZone;
  /**
   * Certificate for HTTPS
   */
  readonly certificate: certmgr.Certificate;
}

export class PersonalWebsiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PersonalWebsiteStackProps) {
    super(scope, id, props);

    // VPC for the ECS cluster
    const vpc = new ec2.Vpc(this, 'PersonalWebsiteVPC', {
      // Need at least two AZs to support an ALB
      maxAzs: 2,
      natGateways: 1,
    });


    // ECS Cluster that will run the dockerfile 
    const cluster = new ecs.Cluster(this, 'PersonalWebsiteCluster', {
      vpc,
      // Minimal capacity to keep costs low :)
      capacity: {
        instanceType: new ec2.InstanceType('t3.nano'),
        minCapacity: 1,
        maxCapacity: 1,
      },
    });
    // Container for the dockerfile holding your go server
    const taskDefinition = new ecs.Ec2TaskDefinition(this, 'PersonalWebsiteTask', {
      networkMode: ecs.NetworkMode.AWS_VPC,

    });
    taskDefinition.addContainer('PersonalWebsiteContainer', {
      image: ecs.ContainerImage.fromAsset('../PersonalWebsiteGo'),
      memoryLimitMiB: 256,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'PersonalWebsite',
        logGroup: new LogGroup(this, 'PersonalWebsiteLogGroup', {
          logGroupName: 'PersonalWebsiteLogGroup',
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      }),
      // go server listens on port 8000, so expose this port
      portMappings: [{
        containerPort: 8000,
        hostPort: 8000,
        protocol: ecs.Protocol.TCP
      }],
    });
    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'PersonalWebsiteSecurityGroup', {
      vpc,
      description: 'Allow access from load balancer to ECS cluster',
    });
    const service = new ecs.Ec2Service(this, 'PersonalWebsiteService', {
      cluster: cluster,
      taskDefinition: taskDefinition,
      securityGroups: [ecsSecurityGroup],
      desiredCount: 1,
      // Each t2.Nano instance can only support a single task, due to ENI constraints.
      // To be able to successfully deploy new task definitions to ECS,
      // we need to allow ECS to spin down the current task, before spinning up a new one.
      // If you want to avoid any downtime on deploys, you can spend more money 
      // on a larger instance type and raise the minHealthyPercent to 100.  
      minHealthyPercent: 0,
      maxHealthyPercent: 100,
      assignPublicIp: false,
    });

    // Load balancer that will send internet traffic to the ECS service 
    const lb = new elbv2.ApplicationLoadBalancer(this, 'PersonalWebsiteLoadBalancer', {
      vpc,
      internetFacing: true,
    });
    const lbSecurityGroup = lb.connections.securityGroups[0];
    ecsSecurityGroup.addIngressRule(lbSecurityGroup, ec2.Port.tcp(8000), 'Allow traffic from load balancer');
    // Require HTTPS on the load balancer
    const httpsListener = lb.addListener('PersonalWebsiteHttpsListener', {
      protocol: elbv2.ApplicationProtocol.HTTPS,
      port: 443,
      certificates: [props.certificate],
    });
    // Send HTTPS traffic to ECS service listening on port 8000
    httpsListener.addTargets('PersonalWebsiteServiceTargetGroup', {
      port: 8000,
      targets: [service],
    });
    // Redirect any HTTP traffic to HTTPS
    const httpListener = lb.addListener('PersonalWebsiteHttpListener', {
      port: 80,
    });
    httpListener.addAction('PersonalWebsiteHttpRedirect', {
      action: elbv2.ListenerAction.redirect({
        port: '443',
        protocol: elbv2.ApplicationProtocol.HTTPS,
        permanent: true,
      }),
    });


    // DNS record for the load balancer
    new route53.ARecord(this, 'AliasRecord', {
      zone: props.hostedZone,
      target: route53.RecordTarget.fromAlias(new route53Targets.LoadBalancerTarget(lb)),
    });
  }
}
