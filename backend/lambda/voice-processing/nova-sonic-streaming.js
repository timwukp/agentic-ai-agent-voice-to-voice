/**
 * Nova Sonic bidirectional streaming for speech-to-text
 */
const { BedrockRuntimeClient, StartStreamTranscriptionCommand } = require("@aws-sdk/client-bedrock-runtime");

// Initialize Bedrock Runtime client
const bedrockRuntime = new BedrockRuntimeClient({ region: process.env.REGION || 'us-east-1' });

/**
 * Process audio using Bedrock Nova Sonic for speech-to-text
 * @param {Buffer} audioBuffer - Audio buffer in WAV format
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribeAudioWithNovaSonic(audioBuffer) {
    try {
        console.log('Starting Nova Sonic transcription');
        
        // Create stream command for bidirectional streaming
        const command = new StartStreamTranscriptionCommand({
            modelId: "anthropic.nova-sonic:latest",
            include_intermediate_results: false,
            content_type: "audio/wav",
            accept: "application/json",
            input_stream: audioBuffer, // Pass the audio buffer directly
        });
        
        // Process audio through Nova Sonic bidirectional streaming API
        const transcriptionResponse = await bedrockRuntime.send(command);
        
        // Extract transcript from response
        let transcript = '';
        
        // Handle streaming response
        for await (const chunk of transcriptionResponse.transcriptionEvent) {
            if (chunk.transcript && !chunk.is_partial) {
                transcript += chunk.transcript.results[0]?.alternatives[0]?.words || '';
            }
        }
        
        console.log('Nova Sonic transcription completed successfully');
        return transcript;
    } catch (error) {
        console.error('Error in Nova Sonic transcription:', error);
        throw new Error(`Nova Sonic transcription failed: ${error.message}`);
    }
}

module.exports = {
    transcribeAudioWithNovaSonic
};