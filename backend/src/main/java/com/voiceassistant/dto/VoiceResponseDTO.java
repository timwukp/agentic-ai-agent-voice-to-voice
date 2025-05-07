package com.voiceassistant.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoiceResponseDTO {
    
    private String requestId;
    private String conversationId;
    private String audioUrl;
    private String message;
    private String status;
    private String text;
    
    // Factory method for successful processing response
    public static VoiceResponseDTO processingStarted(String requestId, String conversationId) {
        return VoiceResponseDTO.builder()
                .requestId(requestId)
                .conversationId(conversationId)
                .message("Audio processing started")
                .status("PROCESSING")
                .build();
    }
    
    // Factory method for completed response
    public static VoiceResponseDTO completed(String requestId, String conversationId, String text, String audioUrl) {
        return VoiceResponseDTO.builder()
                .requestId(requestId)
                .conversationId(conversationId)
                .text(text)
                .audioUrl(audioUrl)
                .status("COMPLETED")
                .message("Processing completed")
                .build();
    }
    
    // Factory method for error response
    public static VoiceResponseDTO error(String message) {
        return VoiceResponseDTO.builder()
                .status("ERROR")
                .message(message)
                .build();
    }
}