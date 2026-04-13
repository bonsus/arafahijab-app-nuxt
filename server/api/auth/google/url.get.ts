// Google OAuth configuration
import { OAuth2Client } from 'google-auth-library'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    const client = new OAuth2Client(
      config.googleClientId,
      config.googleClientSecret,
      `${config.public.siteUrl || 'http://localhost:3000'}/api/auth/google/callback`
    )

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['profile', 'email'],
      prompt: 'consent'
    })

    return { authUrl }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate Google auth URL'
    })
  }
})
