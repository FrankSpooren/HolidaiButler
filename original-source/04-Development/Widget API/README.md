# Context-Aware Chat API v3

A clean, production-ready TypeScript-based API for intelligent POI search with conversational flow, context tracking, and semantic understanding.

## What's Included

This version contains only the essential files needed for the chatbot API to function:

### Core Files
- `src/server.ts` - Main entry point
- `src/app.ts` - Express application setup
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.env` - Environment variables (already configured)

### Source Structure
- **config/** - Configuration files (database, logger, mistral, etc.)
- **controllers/** - API route handlers
- **middleware/** - Authentication, rate limiting, validation
- **models/** - TypeScript interfaces and types
- **routes/** - Express route definitions
- **services/** - Business logic services
- **utils/** - Utility functions
- **logs/** - Log files directory

## Quick Start

### Prerequisites
- Node.js 18+
- ChromaDB running locally (port 8000)
- Mistral API key (already configured in .env)

### Installation & Build

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start the server
npm start
```

### Development

```bash
# Start in development mode
npm run dev
```

## API Endpoints

- `POST /api/search` - Perform context-aware search
- `GET /api/context/:sessionId` - Get session context
- `DELETE /api/context/:sessionId` - Clear session context
- `GET /api/health` - API health status

## What Was Excluded

The following files/folders were intentionally excluded as they are not needed for core functionality:
- All test files (`test-*.js`)
- Documentation files (`*.md` except this README)
- Temporary files (`temp-*.txt`)
- Debug files (`debug-*.js`)
- Implementation plans and analysis files
- CSV data files
- Batch/PowerShell scripts
- Jest configuration (tests excluded)

## Architecture

```
Frontend → Chat API → Search Service → ChromaDB
    ↓         ↓           ↓
Session   Context    Multiple
Management Detection Embeddings
```

This clean version focuses on the core functionality without the development/testing artifacts.
