<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Microfixd

Microfixd is a Vite + React frontend backed by a Node/Express runtime that serves API routes and the production `dist` bundle.

## Local development

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Create a local env file from the template:
   `cp .env.example .env.local`
3. Fill in the environment variables your features require.
4. Start the app:
   `npm run dev`

## Production build

Build the frontend and bundled server:

`npm run build`

Start the production server:

`npm start`

## Railway deployment

This repository is prepared to run on Railway as a Node service.

### Railway settings

- **Root Directory:** repository root
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

Railway will provide `PORT` automatically. The app now reads `process.env.PORT` in production.

### Required environment variables

Set these in Railway as needed by your enabled features:

- `NODE_ENV=production`
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `SQL_HOST`
- `SQL_USER`
- `SQL_PASSWORD`
- `SQL_DB_NAME`
- `SQL_ADMIN_USER`
- `SQL_ADMIN_PASSWORD`
- Any additional Firebase-related configuration or credentials required by your environment

Use `.env.example` as the reference template.

## Security note

Do **not** commit `.env.local` or any real secrets. If secrets were previously committed, rotate them before deploying.
