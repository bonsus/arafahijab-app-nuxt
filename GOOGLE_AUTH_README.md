# Google OAuth Authentication Implementation

## Overview
This implementation provides Google OAuth authentication for both login and registration functionality in your Nuxt 3 application.

## Components Created

### 1. Backend API Endpoints
- **`/server/api/auth/google/url.get.ts`** - Generates Google OAuth authorization URL
- **`/server/api/auth/google/callback.get.ts`** - Handles OAuth callback and processes user authentication

### 2. Frontend Components
- **`/app/composables/useGoogleAuth.ts`** - Composable for handling Google authentication
- **`/app/pages/auth/google/callback.vue`** - OAuth callback page
- Updated **LoginForm** and **RegisterForm** components with Google authentication buttons

### 3. Configuration
- Updated `nuxt.config.ts` with Google OAuth environment variables
- Environment variables: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

## How It Works

### Authentication Flow
1. User clicks "Sign in with Google" button
2. Frontend calls `/api/auth/google/url` to get authorization URL
3. User is redirected to Google OAuth consent screen
4. After consent, Google redirects to `/auth/google/callback`
5. Callback page processes the authorization code
6. Backend exchanges code for tokens and gets user information
7. System checks if user exists:
   - **If exists**: Log them in
   - **If new**: Register and log them in
8. User is redirected to the application

### Backend Integration Required
You'll need to implement these endpoints in your main API server:
- `POST /api/user/google/check` - Check if user exists by Google ID or email
- `POST /api/user/google/login` - Login existing Google user
- `POST /api/user/google/register` - Register new Google user

### Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (development)
   - `https://yourdomain.com/auth/google/callback` (production)

## Environment Variables
Add these to your `.env` file:
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NUXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Features Implemented
- ✅ Google OAuth authentication flow
- ✅ Automatic user registration for new Google users
- ✅ Seamless login for existing users
- ✅ Loading states and error handling
- ✅ Bilingual support (Indonesian/English)
- ✅ SSR-compatible implementation
- ✅ Integration with existing toast notification system

## Usage
Users can now:
1. Click "Sign in with Google" on login page
2. Click "Sign up with Google" on register page
3. Authenticate with their Google account
4. Be automatically logged in and redirected to the application

The Google authentication works alongside the existing email/password authentication system.
