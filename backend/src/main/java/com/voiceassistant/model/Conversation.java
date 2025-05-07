package com.voiceassistant.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import io.awspring.cloud.dynamodb.DynamoDbTableNameOverride;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@DynamoDbBean
public class Conversation {
    
    private String conversationId;
    private long timestamp;
    private String userId;
    private String sessionId;
    private String requestId;
    private String type; // INPUT or OUTPUT
    private String status; // PROCESSING, TRANSCRIBED, COMPLETED, ERROR
    private String audioS3Path;
    private String transcriptionJobName;
    private String transcript; // For INPUT type
    private String text; // For OUTPUT type
    private Long updatedAt;

    @DynamoDbPartitionKey
    public String getConversationId() {
        return conversationId;
    }

    @DynamoDbSortKey
    public long getTimestamp() {
        return timestamp;
    }

    public static Conversation createNewInputConversation(String userId, String sessionId, String audioS3Path, String transcriptionJobName) {
        return Conversation.builder()
                .conversationId(UUID.randomUUID().toString())
                .timestamp(Instant.now().toEpochMilli())
                .userId(userId)
                .sessionId(sessionId)
                .requestId(UUID.randomUUID().toString())
                .type("INPUT")
                .status("PROCESSING")
                .audioS3Path(audioS3Path)
                .transcriptionJobName(transcriptionJobName)
                .build();
    }
    
    public static Conversation createResponseConversation(Conversation input, String text, String audioS3Path) {
        return Conversation.builder()
                .conversationId(input.getConversationId())
                .timestamp(Instant.now().toEpochMilli())
                .userId(input.getUserId())
                .sessionId(input.getSessionId())
                .requestId(input.getRequestId() + "-response")
                .type("OUTPUT")
                .status("COMPLETED")
                .text(text)
                .audioS3Path(audioS3Path)
                .build();
    }
}