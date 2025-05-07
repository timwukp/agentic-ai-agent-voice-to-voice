package com.voiceassistant.model;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@DynamoDbBean
public class UserSession {
    
    private String sessionId;
    private String connectionId;
    private String userId;
    private boolean connected;
    private String conversationId;
    private long timestamp;
    private long expiration;

    @DynamoDbPartitionKey
    public String getSessionId() {
        return sessionId;
    }
}