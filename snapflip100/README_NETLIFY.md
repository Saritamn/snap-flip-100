# Netlify Deployment Guide

This application is now configured for easy deployment to Netlify.

## Configuration Files
- `netlify.toml`: Configures the build command, publish directory, and redirects.
- `netlify/functions/api.ts`: Wraps the Express backend as a Netlify Function.

## Deployment Steps
1. Connect your repository to Netlify.
2. Netlify will automatically detect the `netlify.toml` file.
3. Set the following environment variables in the Netlify UI:
   - `SESSION_SECRET`: A random string for session encryption.
   - `STRIPE_SECRET_KEY`: Your Stripe secret key.
   - `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret.
   - `RESEND_API_KEY`: Your Resend API key.
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret.
   - `GEMINI_API_KEY`: Your Gemini API key.
   - `APP_URL`: Your Netlify site URL (e.g., `https://your-site.netlify.app`).

## Important Note on Database
This app currently uses **SQLite** (`better-sqlite3`). 
**SQLite is not persistent on Netlify Functions.** 
Every time the function starts or scales, the database will be reset to its initial state (or empty).

**Recommendation for Production:**
For a persistent database on Netlify, you should migrate to a managed database provider like:
- **Supabase** (PostgreSQL)
- **MongoDB Atlas**
- **PlanetScale** (MySQL)
- **Neon** (PostgreSQL)

You will need to update `app.ts` to use the client library for your chosen database instead of `better-sqlite3`.
