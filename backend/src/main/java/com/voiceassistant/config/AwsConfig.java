package com.voiceassistant.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.bedrock.BedrockClient;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.polly.PollyClient;
import software.amazon.awssdk.services.transcribe.TranscribeClient;
import software.amazon.awssdk.services.lambda.LambdaClient;

import io.awspring.cloud.dynamodb.DynamoDbTemplate;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

@Configuration
public class AwsConfig {

    @Value("${aws.region:us-east-1}")
    private String awsRegion;

    @Bean
    public AwsCredentialsProvider awsCredentialsProvider() {
        return DefaultCredentialsProvider.create();
    }

    @Bean
    @Primary
    public Region awsRegion() {
        return Region.of(awsRegion);
    }

    @Bean
    public S3Client s3Client(AwsCredentialsProvider credentialsProvider, Region region) {
        return S3Client.builder()
                .credentialsProvider(credentialsProvider)
                .region(region)
                .build();
    }

    @Bean
    public DynamoDbClient dynamoDbClient(AwsCredentialsProvider credentialsProvider, Region region) {
        return DynamoDbClient.builder()
                .credentialsProvider(credentialsProvider)
                .region(region)
                .build();
    }

    @Bean
    public DynamoDbEnhancedClient dynamoDbEnhancedClient(DynamoDbClient dynamoDbClient) {
        return DynamoDbEnhancedClient.builder()
                .dynamoDbClient(dynamoDbClient)
                .build();
    }

    @Bean
    public DynamoDbTemplate dynamoDbTemplate(DynamoDbEnhancedClient enhancedClient) {
        return new DynamoDbTemplate(enhancedClient);
    }

    @Bean
    public BedrockClient bedrockClient(AwsCredentialsProvider credentialsProvider, Region region) {
        return BedrockClient.builder()
                .credentialsProvider(credentialsProvider)
                .region(region)
                .build();
    }

    @Bean
    public BedrockRuntimeClient bedrockRuntimeClient(AwsCredentialsProvider credentialsProvider, Region region) {
        return BedrockRuntimeClient.builder()
                .credentialsProvider(credentialsProvider)
                .region(region)
                .build();
    }

    @Bean
    public PollyClient pollyClient(AwsCredentialsProvider credentialsProvider, Region region) {
        return PollyClient.builder()
                .credentialsProvider(credentialsProvider)
                .region(region)
                .build();
    }

    @Bean
    public TranscribeClient transcribeClient(AwsCredentialsProvider credentialsProvider, Region region) {
        return TranscribeClient.builder()
                .credentialsProvider(credentialsProvider)
                .region(region)
                .build();
    }

    @Bean
    public LambdaClient lambdaClient(AwsCredentialsProvider credentialsProvider, Region region) {
        return LambdaClient.builder()
                .credentialsProvider(credentialsProvider)
                .region(region)
                .build();
    }
}