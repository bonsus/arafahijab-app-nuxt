export default defineEventHandler(async (event) => {
  // Debug: Cek semua cookies

  // Cek apakah ada admin-token cookie
  const token = getCookie(event, 'user-token')

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - No token'
    })
  }

  const apiUrl = process.env.API_URL
  interface meResponse {
    data: {}
  }
  try {
    // Coba fetch user data dari backend menggunakan token
    const user = await $fetch<meResponse>(`${apiUrl}/user/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    return user.data
  } catch (error: any) {
    console.error('Error fetching user data:', error)

    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - Invalid token'
    })
  }
})
