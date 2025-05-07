const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { textToSpeechWithNovaSonic } = require('./nova-sonic-tts');

// Initialize AWS services
const bedrock = new AWS.BedrockRuntime();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const lambda = new AWS.Lambda();

// Configuration
const CONVERSATION_TABLE = process.env.CONVERSATION_TABLE;
const AUDIO_BUCKET = process.env.AUDIO_BUCKET || 'voice-assistant-audio-storage';
const OPENSEARCH_DOMAIN = process.env.OPENSEARCH_DOMAIN;
const REGION = process.env.REGION || 'us-east-1';
const MAX_CONVERSATION_HISTORY = 10; // Number of previous exchanges to include in context

// Nova Sonic model ID
const NOVA_SONIC_MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';

/**
 * Main Lambda handler for Bedrock integration
 */
exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event));
    
    try {
        const { conversationId, userId, requestId, transcript } = event;
        
        if (!conversationId || !transcript) {
            console.error('Missing required parameters');
            return { 
                statusCode: 400, 
                body: JSON.stringify({ error: 'Missing required parameters' })
            };
        }
        
        // Get conversation history
        const history = await getConversationHistory(conversationId);
        
        // Retrieve relevant knowledge from the knowledge base
        const relevantKnowledge = await retrieveRelevantKnowledge(transcript);
        
        // Generate response using Nova Sonic model
        const aiResponse = await generateAIResponse(transcript, history, relevantKnowledge);
        
        // Convert response to speech
        const audioBase64 = await textToSpeech(aiResponse);
        
        // Save audio to S3
        const s3Key = `output/${userId}/${conversationId}/${requestId}-response.mp3`;
        await s3.putObject({
            Bucket: AUDIO_BUCKET,
            Key: s3Key,
            Body: Buffer.from(audioBase64, 'base64'),
            ContentType: 'audio/mpeg'
        }).promise();
        
        // Save response in DynamoDB
        const timestamp = Date.now();
        await dynamoDB.put({
            TableName: CONVERSATION_TABLE,
            Item: {
                conversationId,
                timestamp,
                userId,
                requestId: `${requestId}-response`,
                type: 'OUTPUT',
                text: aiResponse,
                audioS3Path: s3Key,
                status: 'COMPLETED'
            }
        }).promise();
        
        // Send real-time update via WebSocket
        await notifyWebSocket(userId, conversationId, {
            type: 'AI_RESPONSE',
            conversationId,
            requestId,
            response: aiResponse,
            audioUrl: `https://${AUDIO_BUCKET}.s3.${REGION}.amazonaws.com/${s3Key}`,
            timestamp
        });
        
        return { 
            statusCode: 200, 
            body: JSON.stringify({
                conversationId,
                response: aiResponse,
                audioS3Path: s3Key
            })
        };
    } catch (error) {
        console.error('Error processing request:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Error processing request', details: error.message })
        };
    }
};

/**
 * Retrieve conversation history from DynamoDB
 */
async function getConversationHistory(conversationId) {
    try {
        const response = await dynamoDB.query({
            TableName: CONVERSATION_TABLE,
            KeyConditionExpression: 'conversationId = :cid',
            ExpressionAttributeValues: {
                ':cid': conversationId
            },
            Limit: MAX_CONVERSATION_HISTORY * 2, // Get both user inputs and AI responses
            ScanIndexForward: false // Most recent first
        }).promise();
        
        // Transform into a format suitable for context window
        const history = response.Items.reverse().map(item => {
            return {
                role: item.type === 'INPUT' ? 'user' : 'assistant',
                content: item.type === 'INPUT' ? item.transcript : item.text
            };
        });
        
        return history;
    } catch (error) {
        console.error('Error retrieving conversation history:', error);
        return [];
    }
}

/**
 * Retrieve relevant knowledge from OpenSearch/vector store
 */
async function retrieveRelevantKnowledge(query) {
    if (!OPENSEARCH_DOMAIN) {
        console.log('OpenSearch domain not configured, skipping knowledge retrieval');
        return '';
    }
    
    try {
        // In a real implementation, this would connect to OpenSearch
        // For now, returning placeholder text
        return `
        [Relevant business knowledge might be displayed here based on the query: "${query}"]
        
        This is a placeholder for the RAG (Retrieval Augmented Generation) component.
        In a complete implementation, this would retrieve relevant business knowledge,
        documentation, and context from the vector store and knowledge graph.
        `;
    } catch (error) {
        console.error('Error retrieving knowledge:', error);
        return '';
    }
}

/**
 * Generate AI response using Nova Sonic model
 */
async function generateAIResponse(userInput, history, relevantKnowledge) {
    try {
        // Build messages array for the model
        const messages = [];
        
        // Add system prompt with instructions
        messages.push({
            role: 'system',
            content: `You are a helpful voice-enabled business assistant powered by Nova Sonic AI.
            
            Your capabilities include:
            1. Answering business-related questions accurately and concisely
            2. Providing insights based on available business data
            3. Helping with meeting scheduling, email drafting, and other administrative tasks
            4. Offering recommendations based on user's preferences and history
            
            Important guidelines:
            - Keep your responses concise and suitable for voice output (2-3 sentences is ideal)
            - Be professional, friendly, and helpful
            - Focus on delivering accurate information
            - If you don't know something, say so clearly
            - Do not make up information
            - When appropriate, offer to help with follow-up actions
            
            Today's date is ${new Date().toLocaleDateString()}
            
            ${relevantKnowledge ? `Here is some relevant information that may help with your response:\n${relevantKnowledge}` : ''}`
        });
        
        // Add conversation history
        history.forEach(msg => messages.push(msg));
        
        // Add latest user input if not already in history
        if (history.length === 0 || history[history.length - 1].role !== 'user') {
            messages.push({
                role: 'user',
                content: userInput
            });
        }
        
        // Log the messages being sent to Bedrock (without the full RAG context for brevity)
        const logMessages = JSON.parse(JSON.stringify(messages));
        if (logMessages[0].content.length > 100) {
            logMessages[0].content = logMessages[0].content.substring(0, 100) + '... [truncated]';
        }
        console.log('Sending to Bedrock:', JSON.stringify(logMessages));
        
        // Prepare request payload for Nova Sonic model
        const payload = {
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 1000,
            messages: messages,
            temperature: 0.7,
            top_p: 0.9,
            top_k: 250,
            system: "You are a helpful, harmless voice assistant."
        };
        
        // Invoke Bedrock model
        const response = await bedrock.invokeModel({
            modelId: NOVA_SONIC_MODEL_ID,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(payload)
        }).promise();
        
        // Parse response
        const responseBody = JSON.parse(Buffer.from(response.body).toString('utf-8'));
        const aiMessage = responseBody.content[0].text;
        
        return aiMessage;
    } catch (error) {
        console.error('Error generating AI response:', error);
        return "I'm sorry, I encountered an error while processing your request. Please try again later.";
    }
}

/**
 * Convert text to speech using Amazon Bedrock Nova Sonic
 */
async function textToSpeech(text, voiceOptions = {}) {
    try {
        // Use Nova Sonic for text-to-speech via bidirectional streaming
        return await textToSpeechWithNovaSonic(text, {
            voice: voiceOptions.voice || 'female',
            speed: voiceOptions.speed || 1.0
        });
    } catch (error) {
        console.error('Error converting text to speech with Nova Sonic:', error);
        throw error;
    }
}

/**
 * Notify connected WebSocket clients
 */
async function notifyWebSocket(userId, conversationId, payload) {
    try {
        await lambda.invoke({
            FunctionName: 'WebSocketHandlerLambda',
            InvocationType: 'Event',
            Payload: JSON.stringify({
                action: 'sendMessage',
                userId,
                conversationId,
                payload
            })
        }).promise();
    } catch (error) {
        console.error('Error notifying WebSocket:', error);
    }
}