package com.voiceassistant.controller;

import com.voiceassistant.dto.VoiceRequestDTO;
import com.voiceassistant.dto.VoiceResponseDTO;
import com.voiceassistant.service.LambdaService;
import com.voiceassistant.service.S3Service;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/voice")
@RequiredArgsConstructor
@Tag(name = "Voice API", description = "API endpoints for voice processing")
public class VoiceController {

    private final LambdaService lambdaService;
    private final S3Service s3Service;

    @PostMapping("/process")
    @Operation(summary = "Process voice input", description = "Submit voice data for processing")
    public ResponseEntity<VoiceResponseDTO> processVoice(@Valid @RequestBody VoiceRequestDTO request) {
        log.info("Received voice processing request for user: {}", request.getUserId());
        
        try {
            // Create a request payload for the Lambda function
            Map<String, Object> payload = new HashMap<>();
            payload.put("httpMethod", "POST");
            payload.put("path", "/voice/process");
            payload.put("body", Map.of(
                "audioData", request.getAudioData(),
                "userId", request.getUserId(),
                "sessionId", request.getSessionId(),
                "conversationId", request.getConversationId()
            ));
            
            // Invoke the Lambda function
            Map<String, Object> response = lambdaService.invokeVoiceProcessing(payload);
            
            // Parse the response
            int statusCode = (Integer) response.get("statusCode");
            Map<String, Object> body = parseResponseBody(response);
            
            if (statusCode == 202) {
                // Processing started
                String requestId = (String) body.get("requestId");
                String conversationId = (String) body.get("conversationId");
                
                return ResponseEntity.accepted()
                        .body(VoiceResponseDTO.processingStarted(requestId, conversationId));
            } else {
                // Error
                String errorMessage = body.containsKey("error") 
                    ? (String) body.get("error") 
                    : "Unknown error";
                
                return ResponseEntity.status(statusCode)
                        .body(VoiceResponseDTO.error(errorMessage));
            }
        } catch (Exception e) {
            log.error("Error processing voice request: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(VoiceResponseDTO.error("Failed to process voice request: " + e.getMessage()));
        }
    }
    
    @GetMapping("/conversations/{conversationId}/messages")
    @Operation(summary = "Get conversation messages", description = "Retrieve messages for a specific conversation")
    public ResponseEntity<List<Map<String, Object>>> getConversationMessages(
            @PathVariable String conversationId,
            @RequestParam String userId) {
        
        log.info("Fetching conversation messages for conversation: {}, user: {}", conversationId, userId);
        
        // This would typically be implemented with a DynamoDB query
        // For now, we'll return a placeholder response
        
        return ResponseEntity.ok(List.of(
            Map.of(
                "conversationId", conversationId,
                "timestamp", System.currentTimeMillis() - 60000,
                "type", "INPUT",
                "transcript", "What is the weather forecast for today?",
                "status", "TRANSCRIBED"
            ),
            Map.of(
                "conversationId", conversationId,
                "timestamp", System.currentTimeMillis() - 30000,
                "type", "OUTPUT",
                "text", "The weather today will be sunny with a high of 75°F.",
                "status", "COMPLETED",
                "audioUrl", s3Service.getPresignedUrl(
                    String.format("output/%s/%s/response.mp3", userId, conversationId), 
                    3600
                )
            )
        ));
    }
    
    @GetMapping("/conversations")
    @Operation(summary = "Get user conversations", description = "Retrieve all conversations for a user")
    public ResponseEntity<List<Map<String, Object>>> getUserConversations(
            @RequestParam String userId) {
        
        log.info("Fetching conversations for user: {}", userId);
        
        // This would typically be implemented with a DynamoDB query
        // For now, we'll return a placeholder response
        
        return ResponseEntity.ok(List.of(
            Map.of(
                "conversationId", UUID.randomUUID().toString(),
                "title", "Weather Inquiry",
                "lastMessageTimestamp", System.currentTimeMillis() - 30000,
                "messageCount", 2
            ),
            Map.of(
                "conversationId", UUID.randomUUID().toString(),
                "title", "Meeting Schedule",
                "lastMessageTimestamp", System.currentTimeMillis() - 86400000,
                "messageCount", 5
            )
        ));
    }
    
    @SuppressWarnings("unchecked")
    private Map<String, Object> parseResponseBody(Map<String, Object> response) {
        String bodyStr = (String) response.get("body");
        try {
            // Use Jackson to parse the body string
            return lambdaService.getObjectMapper().readValue(bodyStr, Map.class);
        } catch (Exception e) {
            log.error("Error parsing response body: {}", e.getMessage(), e);
            return Map.of("error", "Failed to parse response: " + e.getMessage());
        }
    }
}