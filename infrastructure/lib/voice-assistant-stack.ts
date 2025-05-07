import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as opensearchservice from 'aws-cdk-lib/aws-opensearchservice';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';

export class VoiceAssistantStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC for secure networking
    const vpc = new ec2.Vpc(this, 'VoiceAssistantVPC', {
      maxAzs: 2,
      natGateways: 1,
    });

    // KMS Key for encryption
    const encryptionKey = new kms.Key(this, 'EncryptionKey', {
      enableKeyRotation: true,
      description: 'KMS key for encrypting voice assistant data',
    });

    // DynamoDB Tables
    const conversationTable = new dynamodb.Table(this, 'ConversationTable', {
      partitionKey: { name: 'conversationId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    const userSessionTable = new dynamodb.Table(this, 'UserSessionTable', {
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      timeToLiveAttribute: 'expiration',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ElastiCache Redis cluster for session management
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis cluster',
      subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
    });

    const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc,
      description: 'Security group for Redis cluster',
      allowAllOutbound: true,
    });

    const redisCluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      cacheNodeType: 'cache.t3.medium',
      engine: 'redis',
      numCacheNodes: 1,
      cacheSubnetGroupName: redisSubnetGroup.ref,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
      engineVersion: '6.x',
      preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
      snapshotRetentionLimit: 7,
      automaticFailoverEnabled: false,
    });

    // OpenSearch cluster for vector search
    const openSearchDomain = new opensearchservice.Domain(this, 'VectorSearchDomain', {
      version: opensearchservice.EngineVersion.OPENSEARCH_2_3,
      ebs: {
        volumeSize: 100,
        volumeType: ec2.EbsDeviceVolumeType.GP3,
      },
      capacity: {
        dataNodeInstanceType: 'r6g.large.search',
        dataNodes: 3,
      },
      zoneAwareness: {
        enabled: true,
      },
      logging: {
        slowSearchLogEnabled: true,
        appLogEnabled: true,
        slowIndexLogEnabled: true,
      },
      encryption: {
        atRest: {
          enabled: true,
        },
        transit: {
          enabled: true,
        },
      },
      nodeToNodeEncryption: true,
      enforceHttps: true,
      encryptionAtRest: {
        enabled: true,
      },
    });

    // Cognito User Pool for authentication
    const userPool = new cognito.UserPool(this, 'VoiceAssistantUserPool', {
      selfSignUpEnabled: true,
      autoVerify: {
        email: true,
        phone: true,
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      mfa: cognito.Mfa.REQUIRED,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'VoiceAssistantUserPoolClient', {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true,
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
      preventUserExistenceErrors: true,
    });

    // IAM Role for Bedrock access
    const bedrockRole = new iam.Role(this, 'BedrockExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    bedrockRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
          'bedrock:GetFoundationModel',
          'bedrock:ListFoundationModels',
        ],
        resources: ['*'],
      })
    );

    // Lambda function for voice processing
    const voiceProcessingLambda = new lambda.Function(this, 'VoiceProcessingLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/lambda/voice-processing'),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        CONVERSATION_TABLE: conversationTable.tableName,
        REGION: cdk.Stack.of(this).region,
      },
      vpc,
      role: bedrockRole,
    });

    // Lambda function for Bedrock integration
    const bedrockIntegrationLambda = new lambda.Function(this, 'BedrockIntegrationLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/lambda/bedrock-integration'),
      memorySize: 2048,
      timeout: cdk.Duration.seconds(60),
      environment: {
        CONVERSATION_TABLE: conversationTable.tableName,
        OPENSEARCH_DOMAIN: openSearchDomain.domainEndpoint,
        REGION: cdk.Stack.of(this).region,
      },
      vpc,
      role: bedrockRole,
    });

    // Lambda function for WebSocket handling
    const websocketHandlerLambda = new lambda.Function(this, 'WebSocketHandlerLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/lambda/websocket-handler'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
      environment: {
        USER_SESSION_TABLE: userSessionTable.tableName,
        REGION: cdk.Stack.of(this).region,
      },
      vpc,
    });

    // Grant permissions
    conversationTable.grantReadWriteData(voiceProcessingLambda);
    conversationTable.grantReadWriteData(bedrockIntegrationLambda);
    userSessionTable.grantReadWriteData(websocketHandlerLambda);

    // API Gateway for RESTful endpoints
    const api = new apigateway.RestApi(this, 'VoiceAssistantApi', {
      description: 'Voice Assistant API Gateway',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // WebSocket API for real-time communication
    const websocketApi = new apigateway.WebSocketApi(this, 'VoiceAssistantWebSocketApi', {
      connectRouteOptions: {
        integration: new apigateway.WebSocketLambdaIntegration('ConnectIntegration', websocketHandlerLambda),
      },
      disconnectRouteOptions: {
        integration: new apigateway.WebSocketLambdaIntegration('DisconnectIntegration', websocketHandlerLambda),
      },
      defaultRouteOptions: {
        integration: new apigateway.WebSocketLambdaIntegration('DefaultIntegration', websocketHandlerLambda),
      },
    });

    const websocketStage = new apigateway.WebSocketStage(this, 'WebSocketProdStage', {
      webSocketApi: websocketApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    // EventBridge for event orchestration
    const eventBus = new events.EventBus(this, 'VoiceAssistantEventBus', {
      eventBusName: 'voice-assistant-events',
    });

    // ECR Repository for Spring Boot application
    const ecrRepo = new ecr.Repository(this, 'SpringBootAppRepository', {
      repositoryName: 'voice-assistant-backend',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      imageTagMutability: ecr.TagMutability.MUTABLE,
      imageScanOnPush: true,
    });

    // ECS Fargate for Spring Boot application
    const cluster = new ecs.Cluster(this, 'VoiceAssistantCluster', {
      vpc,
    });

    const backendLogGroup = new logs.LogGroup(this, 'BackendLogGroup', {
      logGroupName: '/ecs/voice-assistant-backend',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_WEEK,
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'BackendTaskDefinition', {
      memoryLimitMiB: 2048,
      cpu: 1024,
    });

    const springBootContainer = taskDefinition.addContainer('SpringBootContainer', {
      image: ecs.ContainerImage.fromEcrRepository(ecrRepo, 'latest'),
      essential: true,
      environment: {
        CONVERSATION_TABLE: conversationTable.tableName,
        USER_SESSION_TABLE: userSessionTable.tableName,
        OPENSEARCH_DOMAIN: openSearchDomain.domainEndpoint,
        REGION: cdk.Stack.of(this).region,
      },
      logging: new ecs.AwsLogDriver({
        logGroup: backendLogGroup,
        streamPrefix: 'voice-assistant',
      }),
      portMappings: [
        {
          containerPort: 8080,
          protocol: ecs.Protocol.TCP,
        },
      ],
    });

    const backendService = new ecs.FargateService(this, 'BackendService', {
      cluster,
      taskDefinition,
      desiredCount: 2,
      assignPublicIp: false,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    });
    
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
    });

    new cdk.CfnOutput(this, 'WebSocketUrl', {
      value: websocketStage.url,
    });

    new cdk.CfnOutput(this, 'OpenSearchDomainEndpoint', {
      value: openSearchDomain.domainEndpoint,
    });
  }
}