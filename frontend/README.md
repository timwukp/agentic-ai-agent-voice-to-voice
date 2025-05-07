# Voice Assistant Frontend

This is the frontend for the Voice-to-Voice Conversational AI Business Assistant built with React, TypeScript, and Material-UI.

## Features

- Voice-to-voice conversation with AI assistant
- Conversation history management
- User authentication and profile management
- Real-time audio processing
- Responsive design for desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js (v16.x or later)
- npm (v8.x or later) or yarn

### Installation

1. Clone the repository
2. Navigate to the frontend directory:
   ```bash
   cd voice-assistant/frontend
   ```
3. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
4. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── assets/                 # Static assets
├── components/             # React components
│   ├── common/             # Shared components
│   ├── conversation/       # Voice conversation components
│   └── dashboard/          # Dashboard components
├── hooks/                  # Custom React hooks
├── pages/                  # Pages components
├── services/               # API services
├── store/                  # Redux store
├── types/                  # TypeScript types
├── utils/                  # Utility functions
├── App.tsx                 # Main App component
└── index.tsx               # Entry point
```

## Available Scripts

In the project directory, you can run:

- `npm start`: Runs the app in development mode
- `npm test`: Launches the test runner
- `npm run build`: Builds the app for production
- `npm run lint`: Runs ESLint to check code quality

## API Integration

The frontend connects to the backend REST API for processing voice commands, managing conversations, and handling user authentication. The API endpoints are defined in the `/services` directory.

## State Management

Redux Toolkit is used for state management with the following slices:

- Authentication state
- Conversation state
- UI state

## Voice Processing

Voice recording is handled using the RecordRTC library, which provides browser-compatible audio recording functionality.