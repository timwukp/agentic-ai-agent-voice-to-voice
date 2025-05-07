const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS services
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const apiGateway = new AWS.ApiGatewayManagementApi();

// Constants
const USER_SESSION_TABLE = process.env.USER_SESSION_TABLE;
const REGION = process.env.REGION || 'us-east-1';

/**
 * Main Lambda handler for WebSocket events
 */
exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event));
    
    // Set the API Gateway endpoint based on the event
    if (event.requestContext && event.requestContext.domainName && event.requestContext.stage) {
        apiGateway.endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
    }
    
    try {
        // Handle different route types
        if (event.requestContext) {
            const connectionId = event.requestContext.connectionId;
            const routeKey = event.requestContext.routeKey;
            
            switch (routeKey) {
                case '$connect':
                    return await handleConnect(event);
                case '$disconnect':
                    return await handleDisconnect(connectionId);
                case '$default':
                    return await handleDefault(connectionId, event.body);
                default:
                    return { statusCode: 400, body: 'Unsupported route' };
            }
        } else if (event.action === 'sendMessage') {
            return await broadcastMessage(event);
        } else {
            return { statusCode: 400, body: 'Unsupported event type' };
        }
    } catch (error) {
        console.error('Error processing WebSocket event:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
    }
};

/**
 * Handle WebSocket connection events
 */
async function handleConnect(event) {
    try {
        const connectionId = event.requestContext.connectionId;
        const queryParams = event.queryStringParameters || {};
        const userId = queryParams.userId;
        
        if (!userId) {
            console.error('Missing userId in connection request');
            return { statusCode: 400, body: 'Missing userId parameter' };
        }
        
        // Store the connection details in DynamoDB
        const timestamp = Date.now();
        const sessionId = uuidv4();
        const ttl = Math.floor(timestamp / 1000) + 86400; // 24 hours expiration
        
        await dynamoDB.put({
            TableName: USER_SESSION_TABLE,
            Item: {
                sessionId,
                connectionId,
                userId,
                connected: true,
                timestamp,
                expiration: ttl
            }
        }).promise();
        
        console.log(`Connection established for user ${userId} with connection ID ${connectionId}`);
        return { statusCode: 200, body: 'Connected' };
    } catch (error) {
        console.error('Error handling WebSocket connection:', error);
        return { statusCode: 500, body: 'Failed to connect: ' + error.message };
    }
}

/**
 * Handle WebSocket disconnection events
 */
async function handleDisconnect(connectionId) {
    try {
        // Find the session associated with this connection
        const queryResult = await dynamoDB.query({
            TableName: USER_SESSION_TABLE,
            IndexName: 'ConnectionIdIndex', // Assuming a GSI exists for connectionId
            KeyConditionExpression: 'connectionId = :connectionId',
            ExpressionAttributeValues: {
                ':connectionId': connectionId
            },
            Limit: 1
        }).promise();
        
        if (queryResult.Items && queryResult.Items.length > 0) {
            const session = queryResult.Items[0];
            
            // Update the connection status in DynamoDB
            await dynamoDB.update({
                TableName: USER_SESSION_TABLE,
                Key: {
                    sessionId: session.sessionId
                },
                UpdateExpression: 'SET connected = :connected',
                ExpressionAttributeValues: {
                    ':connected': false
                }
            }).promise();
            
            console.log(`Connection terminated for user ${session.userId} with connection ID ${connectionId}`);
        } else {
            console.warn(`No session found for connection ID ${connectionId}`);
        }
        
        return { statusCode: 200, body: 'Disconnected' };
    } catch (error) {
        console.error('Error handling WebSocket disconnection:', error);
        return { statusCode: 500, body: 'Failed to disconnect: ' + error.message };
    }
}

/**
 * Handle default WebSocket message events
 */
async function handleDefault(connectionId, body) {
    try {
        let messageData;
        try {
            messageData = JSON.parse(body);
        } catch (e) {
            return { statusCode: 400, body: 'Invalid JSON in request body' };
        }
        
        const { action } = messageData;
        
        // Find the session associated with this connection
        const queryResult = await dynamoDB.query({
            TableName: USER_SESSION_TABLE,
            IndexName: 'ConnectionIdIndex',
            KeyConditionExpression: 'connectionId = :connectionId',
            ExpressionAttributeValues: {
                ':connectionId': connectionId
            },
            Limit: 1
        }).promise();
        
        if (!queryResult.Items || queryResult.Items.length === 0) {
            return { statusCode: 400, body: 'No active session found for this connection' };
        }
        
        const session = queryResult.Items[0];
        
        // Process different action types
        switch (action) {
            case 'ping':
                await sendMessageToClient(connectionId, {
                    action: 'pong',
                    timestamp: Date.now()
                });
                break;
                
            case 'subscribe':
                const { conversationId } = messageData;
                if (!conversationId) {
                    return { statusCode: 400, body: 'Missing conversationId for subscribe action' };
                }
                
                // Update subscription info in DynamoDB
                await dynamoDB.update({
                    TableName: USER_SESSION_TABLE,
                    Key: {
                        sessionId: session.sessionId
                    },
                    UpdateExpression: 'SET conversationId = :conversationId',
                    ExpressionAttributeValues: {
                        ':conversationId': conversationId
                    }
                }).promise();
                
                await sendMessageToClient(connectionId, {
                    action: 'subscribed',
                    conversationId,
                    timestamp: Date.now()
                });
                break;
                
            default:
                return { statusCode: 400, body: `Unsupported action: ${action}` };
        }
        
        return { statusCode: 200, body: 'Message processed' };
    } catch (error) {
        console.error('Error handling default WebSocket message:', error);
        return { statusCode: 500, body: 'Failed to process message: ' + error.message };
    }
}

/**
 * Broadcast message to all connected clients for a specific user and conversation
 */
async function broadcastMessage(event) {
    const { userId, conversationId, payload } = event;
    
    if (!userId || !conversationId || !payload) {
        console.error('Missing required parameters for broadcasting');
        return { statusCode: 400, body: 'Missing required parameters' };
    }
    
    try {
        // Find all active connections for this user that are subscribed to this conversation
        const queryResult = await dynamoDB.query({
            TableName: USER_SESSION_TABLE,
            IndexName: 'UserIdIndex', // Assuming a GSI exists for userId
            KeyConditionExpression: 'userId = :userId',
            FilterExpression: 'connected = :connected AND conversationId = :conversationId',
            ExpressionAttributeValues: {
                ':userId': userId,
                ':connected': true,
                ':conversationId': conversationId
            }
        }).promise();
        
        if (!queryResult.Items || queryResult.Items.length === 0) {
            console.log(`No active connections found for user ${userId} and conversation ${conversationId}`);
            return { statusCode: 200, body: 'No clients to broadcast to' };
        }
        
        // Send the message to each connected client
        const sendPromises = queryResult.Items.map(async (session) => {
            try {
                await sendMessageToClient(session.connectionId, payload);
                return true;
            } catch (error) {
                if (error.statusCode === 410) {
                    // Connection is stale, mark it as disconnected
                    console.log(`Stale connection detected: ${session.connectionId}`);
                    await dynamoDB.update({
                        TableName: USER_SESSION_TABLE,
                        Key: {
                            sessionId: session.sessionId
                        },
                        UpdateExpression: 'SET connected = :connected',
                        ExpressionAttributeValues: {
                            ':connected': false
                        }
                    }).promise();
                }
                return false;
            }
        });
        
        const results = await Promise.all(sendPromises);
        const successCount = results.filter(Boolean).length;
        
        console.log(`Successfully sent message to ${successCount} out of ${queryResult.Items.length} clients`);
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                recipients: successCount
            })
        };
    } catch (error) {
        console.error('Error broadcasting message:', error);
        return { statusCode: 500, body: 'Failed to broadcast message: ' + error.message };
    }
}

/**
 * Send a message to a specific WebSocket client
 */
async function sendMessageToClient(connectionId, payload) {
    try {
        await apiGateway.postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify(payload)
        }).promise();
    } catch (error) {
        console.error(`Error sending message to client ${connectionId}:`, error);
        throw error;
    }
}