# Project Structure

```
voice-assistant/
├── .github/
│   └── workflows/
│       └── ci-cd.yml               # CI/CD pipeline configuration
├── docs/
│   ├── api/                        # API documentation
│   ├── architecture/               # Architecture diagrams and docs
│   ├── user-guides/                # End user guides
│   └── deployment/                 # Deployment guides
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/                 # Static assets
│   │   ├── components/             # React components
│   │   │   ├── common/             # Shared components
│   │   │   ├── conversation/       # Voice conversation components
│   │   │   └── dashboard/          # Dashboard components
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── pages/                  # Pages components
│   │   ├── services/               # API services
│   │   ├── store/                  # Redux store
│   │   ├── types/                  # TypeScript types
│   │   ├── utils/                  # Utility functions
│   │   ├── App.tsx                 # Main App component
│   │   └── index.tsx               # Entry point
│   ├── .eslintrc.js                # ESLint configuration
│   ├── package.json                # Frontend dependencies
│   └── tsconfig.json               # TypeScript configuration
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/voiceassistant/
│   │   │   │   ├── config/         # Configuration classes
│   │   │   │   ├── controller/     # API controllers
│   │   │   │   ├── model/          # Domain models
│   │   │   │   ├── repository/     # Data repositories
│   │   │   │   ├── service/        # Business logic
│   │   │   │   ├── security/       # Security config
│   │   │   │   ├── exception/      # Exception handling
│   │   │   │   └── VoiceAssistantApplication.java
│   │   │   └── resources/
│   │   │       ├── application.yml # Application config
│   │   └── test/                   # Unit and integration tests
│   ├── pom.xml                     # Maven dependencies
│   └── Dockerfile                  # Backend container definition
├── infrastructure/
│   ├── lib/                        # CDK stack definitions
│   ├── bin/                        # CDK app entry point
│   ├── cdk.json                    # CDK configuration
│   └── package.json                # CDK dependencies
└── README.md                       # Project overview
```