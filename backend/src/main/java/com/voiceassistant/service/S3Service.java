package com.voiceassistant.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.util.Base64;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3Service {

    private final S3Client s3Client;
    
    @Value("${aws.s3.audio-bucket:voice-assistant-audio-storage}")
    private String audioBucket;
    
    /**
     * Upload audio data to S3 bucket
     *
     * @param userId User ID
     * @param conversationId Conversation ID
     * @param audioData Base64 encoded audio data
     * @return S3 object key
     */
    public String uploadAudio(String userId, String conversationId, String audioData) {
        try {
            String requestId = UUID.randomUUID().toString();
            String key = String.format("input/%s/%s/%s.wav", userId, conversationId, requestId);
            
            // Decode base64 audio data
            byte[] decodedAudio = Base64.getDecoder().decode(audioData);
            
            // Upload to S3
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(audioBucket)
                    .key(key)
                    .contentType("audio/wav")
                    .build();
            
            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(decodedAudio));
            log.info("Uploaded audio file to S3: {}/{}", audioBucket, key);
            
            return key;
        } catch (Exception e) {
            log.error("Error uploading audio to S3: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload audio to S3", e);
        }
    }
    
    /**
     * Get a pre-signed URL for an S3 object
     *
     * @param key The object key
     * @param expirationSeconds URL expiration time in seconds
     * @return Pre-signed URL
     */
    public String getPresignedUrl(String key, long expirationSeconds) {
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(audioBucket)
                    .key(key)
                    .build();
            
            // In a real implementation, we'd use the S3Presigner to create a presigned URL
            // For now, we'll construct a simple URL
            return String.format("https://%s.s3.amazonaws.com/%s", audioBucket, key);
        } catch (Exception e) {
            log.error("Error creating presigned URL: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create presigned URL", e);
        }
    }
    
    /**
     * Download an object from S3 and return as base64 string
     *
     * @param key Object key
     * @return Base64 encoded content
     */
    public String downloadAsBase64(String key) {
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(audioBucket)
                    .key(key)
                    .build();
            
            ResponseBytes<GetObjectResponse> objectBytes = s3Client.getObjectAsBytes(getObjectRequest);
            byte[] data = objectBytes.asByteArray();
            
            return Base64.getEncoder().encodeToString(data);
        } catch (S3Exception e) {
            log.error("Error downloading object from S3: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to download object from S3", e);
        }
    }
    
    /**
     * Check if an object exists in S3
     *
     * @param key Object key
     * @return true if object exists, false otherwise
     */
    public boolean objectExists(String key) {
        try {
            HeadObjectRequest headObjectRequest = HeadObjectRequest.builder()
                    .bucket(audioBucket)
                    .key(key)
                    .build();
            
            s3Client.headObject(headObjectRequest);
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (S3Exception e) {
            log.error("Error checking if object exists: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to check if object exists", e);
        }
    }
}