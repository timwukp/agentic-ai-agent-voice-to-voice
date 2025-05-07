/**
 * Nova Sonic bidirectional streaming for text-to-speech
 */
const { BedrockRuntimeClient, StartSpeechSynthesisCommand } = require("@aws-sdk/client-bedrock-runtime");

// Initialize Bedrock Runtime client
const bedrockRuntime = new BedrockRuntimeClient({ region: process.env.REGION || 'us-east-1' });

/**
 * Convert text to speech using Bedrock Nova Sonic
 * @param {string} text - Text to convert to speech
 * @param {Object} options - Optional parameters for voice customization
 * @returns {Promise<Buffer>} - Audio buffer
 */
async function textToSpeechWithNovaSonic(text, options = {}) {
    try {
        console.log('Starting Nova Sonic text-to-speech');
        
        // Default voice options
        const voiceOptions = {
            voice: options.voice || "female", // female or male
            speed: options.speed || 1.0       // Speed multiplier (0.5 to 2.0)
        };
        
        // Create command for bidirectional streaming
        const command = new StartSpeechSynthesisCommand({
            modelId: "anthropic.nova-sonic:latest", 
            content_type: "text/plain",
            accept: "audio/mp3",
            text: text,
            voice_id: voiceOptions.voice,
            speed: voiceOptions.speed
        });
        
        // Process text through Nova Sonic bidirectional streaming API
        const speechResponse = await bedrockRuntime.send(command);
        
        // Collect audio chunks
        const audioChunks = [];
        for await (const chunk of speechResponse.audioStream) {
            audioChunks.push(chunk);
        }
        
        // Combine chunks into a single buffer
        const audioBuffer = Buffer.concat(audioChunks);
        
        console.log('Nova Sonic text-to-speech completed successfully');
        return audioBuffer.toString('base64');
    } catch (error) {
        console.error('Error in Nova Sonic text-to-speech:', error);
        throw new Error(`Nova Sonic text-to-speech failed: ${error.message}`);
    }
}

module.exports = {
    textToSpeechWithNovaSonic
};