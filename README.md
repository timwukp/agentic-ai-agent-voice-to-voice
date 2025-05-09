# Voice-to-Voice Conversational AI Business Assistant

## Overview
A sophisticated voice-to-voice conversational AI business assistant built with Amazon Bedrock and Nova Sonic model. This application enables natural voice interactions for business users, providing real-time responses and information retrieval through a modern web interface.

## Features
- **Voice-to-Voice Conversations**: Seamless voice input and output using bidirectional streaming
- **AI-Powered Responses**: Utilizing Amazon Bedrock's Nova Sonic model for natural language understanding
- **Enterprise Integration**: Connects with business knowledge bases and systems
- **Real-time Processing**: Low-latency responses through WebSocket communication
- **Secure Authentication**: Cognito User Pool with MFA and OAuth2 based security
- **Enterprise Search**: Retrieval-Augmented Generation (RAG) with feedback loops using OpenSearch
- **Multi-Agent Orchestration**: Coordinated AI agents for complex business tasks
- **End-to-End Encryption**: KMS-based encryption for sensitive data

## Architecture

### System Components
- **Frontend**: React 18+ with TypeScript, Material-UI, Redux Toolkit, and RecordRTC for audio recording
- **Backend**: 
  - Spring Boot 3.1.0 with WebSockets and RESTful APIs
  - AWS Lambda functions for specialized processing
  - ECS Fargate for containerized services
- **AI Services**: Amazon Bedrock, Transcribe, and Polly
- **Database**: DynamoDB for conversation and session storage
- **Search**: OpenSearch for vector embeddings and semantic search
- **Caching**: Amazon ElastiCache Redis for session management
- **Event Processing**: Amazon EventBridge for event orchestration
- **Infrastructure**: AWS CDK for infrastructure as code

### Data Flow
1. Voice input captured in browser and streamed via WebSockets
2. Audio processed and transcribed (Amazon Transcribe)
3. Text processed through Nova Sonic model (Amazon Bedrock)
4. Relevant information retrieved from knowledge bases (OpenSearch)
5. Response generated and converted to voice (Amazon Polly)
6. Conversation history stored in DynamoDB

## Getting Started

### Prerequisites
- AWS Account with access to Amazon Bedrock
- JDK 17
- Maven 3.8+
- Node.js 16+
- AWS CLI configured
- AWS CDK installed

### Installation

1. **Backend Setup**
   ```bash
   cd backend
   mvn clean install
   mvn spring-boot:run
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Deploy Infrastructure**
   ```bash
   cd infrastructure
   npm install
   cdk bootstrap  # Only needed first time
   cdk deploy
   ```

### Configuration
Create a `.env` file in the frontend directory with:
```
REACT_APP_API_URL=https://your-api-gateway-url
REACT_APP_WS_URL=wss://your-websocket-url
REACT_APP_USER_POOL_ID=your-cognito-user-pool-id
REACT_APP_USER_POOL_CLIENT_ID=your-cognito-user-pool-client-id
```

## Security
- End-to-end encryption using KMS for data at rest and in transit
- PII data protection mechanisms
- GDPR and regulatory compliance
- IAM role-based access control
- Multi-factor authentication via Cognito
- HTTPS enforcement for all API endpoints
- Node-to-node encryption in OpenSearch

## Development

### Project Structure
```
voice-assistant/
├── frontend/           # React application with TypeScript
│   ├── public/         # Static files
│   ├── src/            # Source code
│   │   ├── assets/     # Static assets
│   │   ├── components/ # React components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── pages/      # Page components
│   │   ├── services/   # API services
│   │   ├── store/      # Redux store
│   │   ├── types/      # TypeScript types
│   │   └── utils/      # Utility functions
│   ├── package.json    # Frontend dependencies
│   └── tsconfig.json   # TypeScript configuration
├── backend/            # Spring Boot services
│   ├── lambda/         # AWS Lambda functions
│   ├── src/            # Backend source code
│   │   ├── main/       # Main application code
│   │   └── test/       # Unit and integration tests
│   └── pom.xml         # Maven dependencies
├── infrastructure/     # AWS CDK infrastructure
│   ├── lib/            # CDK stack definitions
│   └── bin/            # CDK app entry point
└── docs/               # Documentation
```

### Key Technologies
- **Frontend**: React 18, TypeScript, Material-UI, Redux Toolkit, RecordRTC
- **Backend**: Spring Boot 3.1, Spring Security, Spring WebSocket
- **AWS Services**: Bedrock, DynamoDB, OpenSearch, ElastiCache, Lambda, API Gateway, Cognito, ECS Fargate
- **Infrastructure as Code**: AWS CDK with TypeScript
- **CI/CD**: GitHub Actions

## License
[Specify License]

## Contributing
[Contribution Guidelines]