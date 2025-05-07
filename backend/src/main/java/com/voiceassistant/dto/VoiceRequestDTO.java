package com.voiceassistant.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoiceRequestDTO {
    
    @NotBlank(message = "Audio data is required")
    private String audioData; // base64 encoded audio
    
    @NotBlank(message = "User ID is required")
    private String userId;
    
    private String sessionId;
    
    private String conversationId; // Optional, new conversation will be created if not provided
}