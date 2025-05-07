package com.voiceassistant;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.info.Contact;

@SpringBootApplication
@EnableAsync
@EnableScheduling
@OpenAPIDefinition(
    info = @Info(
        title = "Voice Assistant API",
        version = "1.0",
        description = "Voice-to-Voice Conversational AI Business Assistant powered by Amazon Bedrock and Nova Sonic model",
        license = @License(name = "Private", url = "https://example.com"),
        contact = @Contact(name = "Voice Assistant Team", email = "team@example.com")
    )
)
public class VoiceAssistantApplication {
    public static void main(String[] args) {
        SpringApplication.run(VoiceAssistantApplication.class, args);
    }
}