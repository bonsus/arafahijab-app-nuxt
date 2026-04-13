// server/api/login.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  interface LoginResponse {
    data: {
      token: string;
      user: {
        name: string;
        // tambahkan properti lain jika diperlukan
      };
    };
  }

  const apiUrl = process.env.API_URL
  try {
    const res = await $fetch<LoginResponse>(`${apiUrl}/user/auth/login`, {
      method: 'POST',
      body,
    })
    // console.log('Login response:', res)

    // Misalnya response-nya: { token: '...', user: { name: 'Rizal' } }
    setCookie(event, 'user-token', res.data.token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 1, // 1 hari
    })

    return res.data.user
  } catch (error: any) {
    if (error?.data?.error || error?.data?.errors) {
      setResponseStatus(event, error.statusCode || 400)
      return {
        error: error.data.error || '',
        errors: error.data.errors || {},
      }
    }
  }
})
