#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VoiceAssistantStack } from '../lib/voice-assistant-stack';

const app = new cdk.App();
new VoiceAssistantStack(app, 'VoiceAssistantStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
  },
  description: 'Voice-to-Voice Conversational AI Business Assistant powered by Amazon Bedrock and Nova Sonic model',
  tags: {
    Environment: 'production',
    Project: 'voice-assistant',
    Owner: 'ai-team'
  }
});