# Sevalla Deployment Guide

To deploy this full-stack application to Sevalla, follow these steps:

## 1. Environment Variables
Set the following environment variables in your Sevalla dashboard:
- `NODE_ENV`: `production`
- `GEMINI_API_KEY`: Your Google Gemini API key.
- `SESSION_SECRET`: A random string for session encryption.
- `STRIPE_SECRET_KEY`: Your Stripe secret key.
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret.
- `FIREBASE_PROJECT_ID`: Your Firebase project ID.
- `APP_URL`: Your deployment URL (e.g., `https://your-app.sevalla.app`).

## 2. Build and Start Commands
Sevalla should automatically detect the `package.json` and use:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

## 3. Port Configuration
The application is configured to use the `PORT` environment variable provided by Sevalla. If not provided, it defaults to `3000`.

## 4. Troubleshooting 404 Errors
If you get a 404 error:
- Ensure the **Build Command** is set to `npm run build`. This creates the `dist` folder which the server needs to serve the frontend.
- Ensure the **Start Command** is set to `npm start`. This runs the Express server.
- If Sevalla is configured as a "Static Site", it will NOT work because this app requires a Node.js server. Ensure you are deploying as a **Web Service** or **Application**.
