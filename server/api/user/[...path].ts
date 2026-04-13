// server/api/[...path].ts

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'user-token')
  // if (!token) {
  //   throw createError({
  //     statusCode: 401,
  //     statusMessage: 'Unauthorized - No token'
  //   })
  // }
  const path = event.context.params?.path
  const method = getMethod(event)
  const body = method === 'GET' ? undefined : await readBody(event)

  const url = process.env.API_URL + `/user/${Array.isArray(path) ? path.join('/') : path}`

  try {
    const res = await $fetch<{ data?: any }>(url, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      params: getQuery(event),
      body,
    })
    return res?.data || {}
  } catch (err: any) {
    const errorData = err.response?.data || err.data || {}

    if (errorData.errors || errorData.error) {
      setResponseStatus(event, err.response?.status || 400)
      return {
        error: errorData.error || '',
        errors: errorData.errors || {},
      }
    }
  }
})
