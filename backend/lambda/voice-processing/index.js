const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS services
const transcribe = new AWS.TranscribeService();
const polly = new AWS.Polly();
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda();

// S3 bucket for temporary audio storage
const AUDIO_BUCKET = process.env.AUDIO_BUCKET || 'voice-assistant-audio-storage';
const REGION = process.env.REGION || 'us-east-1';
const CONVERSATION_TABLE = process.env.CONVERSATION_TABLE;

/**
 * Main Lambda handler for processing voice input
 */
exports.handler = async (event) => {
    try {
        console.log('Received event:', JSON.stringify(event));
        
        // Handle different event sources
        if (event.httpMethod === 'POST' && event.path === '/voice/process') {
            return await handleVoiceProcessing(event);
        } else if (event.Records && event.Records[0]?.s3) {
            return await handleTranscriptionComplete(event);
        } else if (event.detail?.status === 'COMPLETED' && event.source === 'aws.transcribe') {
            return await handleTranscriptionEventBridge(event);
        } else {
            return formatResponse(400, { error: 'Unsupported event type' });
        }
    } catch (error) {
        console.error('Error processing request:', error);
        return formatResponse(500, { error: 'Internal server error', details: error.message });
    }
};

/**
 * Handles voice processing requests from API Gateway
 */
async function handleVoiceProcessing(event) {
    // Parse the incoming request
    const body = JSON.parse(event.body);
    const { audioData, userId, sessionId, conversationId } = body;
    
    if (!audioData) {
        return formatResponse(400, { error: 'Missing audioData in request body' });
    }

    // Generate a unique ID for this request
    const requestId = uuidv4();
    const actualConversationId = conversationId || uuidv4();
    
    try {
        // Decode and save the audio data to S3
        const buffer = Buffer.from(audioData, 'base64');
        const s3Key = `input/${userId}/${actualConversationId}/${requestId}.wav`;
        
        await s3.putObject({
            Bucket: AUDIO_BUCKET,
            Key: s3Key,
            Body: buffer,
            ContentType: 'audio/wav'
        }).promise();
        
        // Start transcription job
        const transcriptionJobName = `transcribe-${requestId}`;
        
        await transcribe.startTranscriptionJob({
            TranscriptionJobName: transcriptionJobName,
            Media: {
                MediaFileUri: `s3://${AUDIO_BUCKET}/${s3Key}`
            },
            MediaFormat: 'wav',
            LanguageCode: 'en-US',
            OutputBucketName: AUDIO_BUCKET,
            OutputKey: `transcripts/${userId}/${actualConversationId}/${requestId}.json`,
            Settings: {
                ShowSpeakerLabels: true,
                MaxSpeakerLabels: 2
            }
        }).promise();
        
        // Save conversation metadata
        await dynamoDB.put({
            TableName: CONVERSATION_TABLE,
            Item: {
                conversationId: actualConversationId,
                timestamp: Date.now(),
                userId,
                sessionId,
                requestId,
                status: 'PROCESSING',
                type: 'INPUT',
                audioS3Path: s3Key,
                transcriptionJobName
            }
        }).promise();
        
        return formatResponse(202, { 
            message: 'Audio processing started', 
            requestId,
            conversationId: actualConversationId
        });
    } catch (error) {
        console.error('Error processing audio:', error);
        return formatResponse(500, { error: 'Error processing audio', details: error.message });
    }
}

/**
 * Handles transcription completion events from S3 notifications
 */
async function handleTranscriptionComplete(event) {
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\\+/g, ' '));
    
    if (!key.startsWith('transcripts/')) {
        console.log('Not a transcript file, skipping');
        return { status: 'skipped' };
    }
    
    try {
        // Get the transcript file from S3
        const transcriptObject = await s3.getObject({
            Bucket: bucket,
            Key: key
        }).promise();
        
        const transcriptData = JSON.parse(transcriptObject.Body.toString());
        const transcript = transcriptData.results.transcripts[0]?.transcript || '';
        
        if (!transcript) {
            console.warn('Empty transcript detected');
        }
        
        // Extract metadata from the key pattern: transcripts/userId/conversationId/requestId.json
        const pathParts = key.split('/');
        const userId = pathParts[1];
        const conversationId = pathParts[2];
        const requestId = pathParts[3].replace('.json', '');
        
        // Update the conversation record
        await dynamoDB.update({
            TableName: CONVERSATION_TABLE,
            Key: {
                conversationId,
                timestamp: { // Use a condition expression to find the correct item
                    ConditionExpression: 'requestId = :requestId',
                    ExpressionAttributeValues: { ':requestId': requestId }
                }
            },
            UpdateExpression: 'SET transcript = :transcript, status = :status, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':transcript': transcript,
                ':status': 'TRANSCRIBED',
                ':updatedAt': Date.now()
            }
        }).promise();
        
        // Invoke Bedrock integration Lambda
        await lambda.invoke({
            FunctionName: 'BedrockIntegrationLambda',
            InvocationType: 'Event', // Asynchronous invocation
            Payload: JSON.stringify({
                conversationId,
                userId,
                requestId,
                transcript
            })
        }).promise();
        
        return { status: 'success', conversationId, requestId };
    } catch (error) {
        console.error('Error processing transcript:', error);
        return { status: 'error', error: error.message };
    }
}

/**
 * Handles transcription completion events from EventBridge
 */
async function handleTranscriptionEventBridge(event) {
    const jobName = event.detail.TranscriptionJobName;
    
    try {
        // Get the transcription job details
        const transcriptionJob = await transcribe.getTranscriptionJob({
            TranscriptionJobName: jobName
        }).promise();
        
        const transcriptUri = transcriptionJob.TranscriptionJob.Transcript.TranscriptFileUri;
        
        // Parse the transcript URI to get bucket and key
        const parsedUrl = new URL(transcriptUri);
        const key = parsedUrl.pathname.substring(1); // Remove leading slash
        
        // Query DynamoDB to find the corresponding conversation record
        const queryResult = await dynamoDB.query({
            TableName: CONVERSATION_TABLE,
            IndexName: 'TranscriptionJobIndex', // Assuming a GSI exists for this
            KeyConditionExpression: 'transcriptionJobName = :jobName',
            ExpressionAttributeValues: { ':jobName': jobName },
            Limit: 1
        }).promise();
        
        if (queryResult.Items.length === 0) {
            console.warn(`No conversation record found for transcription job: ${jobName}`);
            return { status: 'warning', message: 'No matching conversation record found' };
        }
        
        const conversationRecord = queryResult.Items[0];
        const { conversationId, requestId, userId } = conversationRecord;
        
        // Get the transcript content
        const s3Response = await s3.getObject({
            Bucket: AUDIO_BUCKET,
            Key: key
        }).promise();
        
        const transcriptData = JSON.parse(s3Response.Body.toString());
        const transcript = transcriptData.results.transcripts[0]?.transcript || '';
        
        // Update the conversation record
        await dynamoDB.update({
            TableName: CONVERSATION_TABLE,
            Key: {
                conversationId,
                timestamp: conversationRecord.timestamp
            },
            UpdateExpression: 'SET transcript = :transcript, status = :status, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':transcript': transcript,
                ':status': 'TRANSCRIBED',
                ':updatedAt': Date.now()
            }
        }).promise();
        
        // Invoke Bedrock integration Lambda
        await lambda.invoke({
            FunctionName: 'BedrockIntegrationLambda',
            InvocationType: 'Event',
            Payload: JSON.stringify({
                conversationId,
                userId,
                requestId,
                transcript
            })
        }).promise();
        
        return { status: 'success', conversationId, requestId };
    } catch (error) {
        console.error('Error processing transcription event:', error);
        return { status: 'error', error: error.message };
    }
}

/**
 * Converts text to speech using Amazon Polly
 */
async function textToSpeech(text, voiceId = 'Joanna') {
    try {
        const pollyResult = await polly.synthesizeSpeech({
            OutputFormat: 'mp3',
            SampleRate: '24000',
            Text: text,
            TextType: 'text',
            VoiceId: voiceId,
            Engine: 'neural'
        }).promise();
        
        // Return audio as base64
        return Buffer.from(pollyResult.AudioStream).toString('base64');
    } catch (error) {
        console.error('Error converting text to speech:', error);
        throw error;
    }
}

/**
 * Format HTTP response
 */
function formatResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        },
        body: JSON.stringify(body)
    };
}