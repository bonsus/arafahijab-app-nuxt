// Google OAuth callback handler
import { OAuth2Client } from 'google-auth-library'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)

  if (!query.code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Authorization code not provided'
    })
  }

  try {
    const client = new OAuth2Client(
      config.googleClientId,
      config.googleClientSecret,
      `${config.public.siteUrl || 'http://localhost:3000'}/api/auth/google/callback`
    )

    // Exchange authorization code for tokens
    const { tokens } = await client.getToken(query.code as string)
    client.setCredentials(tokens)

    // Get user info from Google
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: config.googleClientId
    })

    const payload = ticket.getPayload()

    if (!payload) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid Google token'
      })
    }

    const userInfo = {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      emailVerified: payload.email_verified
    }
    console.log('Google user info:', userInfo)
    // Check if user exists in your database
    // This is where you'd integrate with your existing user system
    const existingUser = await $fetch(`${config.apiUrl}/api/user/google/check`, {
      method: 'POST',
      body: { googleId: userInfo.googleId, email: userInfo.email }
    }).catch(() => null)

    if (existingUser) {
      // User exists, log them in
      const loginResponse = await $fetch(`${config.apiUrl}/api/user/google/login`, {
        method: 'POST',
        body: userInfo
      })

      return loginResponse
    } else {
      // User doesn't exist, register them
      const registerResponse = await $fetch(`${config.apiUrl}/api/user/google/register`, {
        method: 'POST',
        body: userInfo
      })

      return registerResponse
    }

  } catch (error) {
    console.error('Google OAuth error:', error)
    // throw createError({
    //   statusCode: 500,
    //   statusMessage: 'Google authentication failed'
    // })
  }
})
