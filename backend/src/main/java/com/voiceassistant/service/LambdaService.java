package com.voiceassistant.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.lambda.LambdaClient;
import software.amazon.awssdk.services.lambda.model.InvokeRequest;
import software.amazon.awssdk.services.lambda.model.InvokeResponse;
import software.amazon.awssdk.services.lambda.model.InvocationType;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class LambdaService {

    private final LambdaClient lambdaClient;
    private final ObjectMapper objectMapper;
    
    @Value("${aws.lambda.voice-processing-function:VoiceProcessingLambda}")
    private String voiceProcessingFunction;
    
    @Value("${aws.lambda.bedrock-integration-function:BedrockIntegrationLambda}")
    private String bedrockIntegrationFunction;
    
    /**
     * Invoke the voice processing Lambda function
     * 
     * @param payload The JSON payload to send to the Lambda function
     * @return The response from the Lambda function
     */
    public Map<String, Object> invokeVoiceProcessing(Object payload) {
        return invokeLambda(voiceProcessingFunction, payload, InvocationType.REQUEST_RESPONSE);
    }
    
    /**
     * Invoke the Bedrock integration Lambda function asynchronously
     * 
     * @param payload The JSON payload to send to the Lambda function
     */
    public void invokeBedrockIntegrationAsync(Object payload) {
        invokeLambda(bedrockIntegrationFunction, payload, InvocationType.EVENT);
    }
    
    /**
     * Generic method to invoke a Lambda function
     * 
     * @param functionName The name of the Lambda function
     * @param payload The JSON payload to send to the Lambda function
     * @param invocationType The invocation type (RequestResponse or Event)
     * @return The response from the Lambda function, or null if async invocation
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> invokeLambda(String functionName, Object payload, InvocationType invocationType) {
        try {
            // Convert payload to JSON
            String payloadJson = objectMapper.writeValueAsString(payload);
            SdkBytes payloadBytes = SdkBytes.fromUtf8String(payloadJson);
            
            // Build the invoke request
            InvokeRequest request = InvokeRequest.builder()
                    .functionName(functionName)
                    .payload(payloadBytes)
                    .invocationType(invocationType)
                    .build();
            
            // Invoke the Lambda function
            InvokeResponse response = lambdaClient.invoke(request);
            
            // If async invocation, return null
            if (invocationType == InvocationType.EVENT) {
                return null;
            }
            
            // Check for errors
            if (response.functionError() != null) {
                String errorMessage = new String(response.payload().asByteArray(), StandardCharsets.UTF_8);
                log.error("Lambda function {} returned an error: {}", functionName, errorMessage);
                throw new RuntimeException("Lambda invocation error: " + errorMessage);
            }
            
            // Parse and return the response
            String responseJson = new String(response.payload().asByteArray(), StandardCharsets.UTF_8);
            return objectMapper.readValue(responseJson, Map.class);
        } catch (Exception e) {
            log.error("Error invoking Lambda function {}: {}", functionName, e.getMessage(), e);
            throw new RuntimeException("Failed to invoke Lambda function: " + e.getMessage(), e);
        }
    }
}