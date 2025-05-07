package com.voiceassistant.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Service for sending WebSocket messages to connected clients
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WebSocketService {
    
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    
    private static final String CONVERSATION_TOPIC = "/topic/conversation/%s";
    private static final String USER_TOPIC = "/topic/user/%s";
    
    /**
     * Send a message to a specific conversation topic
     *
     * @param conversationId The conversation ID
     * @param payload The message payload
     */
    public void sendToConversation(String conversationId, Object payload) {
        try {
            String destination = String.format(CONVERSATION_TOPIC, conversationId);
            log.debug("Sending WebSocket message to {}: {}", destination, payload);
            messagingTemplate.convertAndSend(destination, payload);
        } catch (Exception e) {
            log.error("Error sending WebSocket message to conversation {}: {}", conversationId, e.getMessage(), e);
        }
    }
    
    /**
     * Send a message to a specific user topic
     *
     * @param userId The user ID
     * @param payload The message payload
     */
    public void sendToUser(String userId, Object payload) {
        try {
            String destination = String.format(USER_TOPIC, userId);
            log.debug("Sending WebSocket message to {}: {}", destination, payload);
            messagingTemplate.convertAndSend(destination, payload);
        } catch (Exception e) {
            log.error("Error sending WebSocket message to user {}: {}", userId, e.getMessage(), e);
        }
    }
    
    /**
     * Send a transcription update to a conversation
     *
     * @param conversationId The conversation ID
     * @param requestId The request ID
     * @param transcript The transcript text
     */
    public void sendTranscriptionUpdate(String conversationId, String requestId, String transcript) {
        sendToConversation(conversationId, Map.of(
            "type", "TRANSCRIPTION_UPDATE",
            "requestId", requestId,
            "transcript", transcript,
            "timestamp", System.currentTimeMillis()
        ));
    }
    
    /**
     * Send an AI response to a conversation
     *
     * @param conversationId The conversation ID
     * @param requestId The request ID
     * @param response The AI response text
     * @param audioUrl The URL to the audio file
     */
    public void sendAIResponse(String conversationId, String requestId, String response, String audioUrl) {
        sendToConversation(conversationId, Map.of(
            "type", "AI_RESPONSE",
            "requestId", requestId,
            "response", response,
            "audioUrl", audioUrl,
            "timestamp", System.currentTimeMillis()
        ));
    }
    
    /**
     * Send an error message to a conversation
     *
     * @param conversationId The conversation ID
     * @param requestId The request ID
     * @param errorMessage The error message
     */
    public void sendError(String conversationId, String requestId, String errorMessage) {
        sendToConversation(conversationId, Map.of(
            "type", "ERROR",
            "requestId", requestId,
            "message", errorMessage,
            "timestamp", System.currentTimeMillis()
        ));
    }
}