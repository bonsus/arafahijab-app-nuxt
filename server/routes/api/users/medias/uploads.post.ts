export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const headers: Record<string, string> = {}
  const token = getCookie(event, 'auth_token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Read raw multipart body and forward content-type header (with boundary)
  const contentType = getRequestHeader(event, 'content-type')
  if (contentType) {
    headers['Content-Type'] = contentType
  }

  const body = await readRawBody(event, false)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)

    const response = await $fetch('/users/medias/uploads', {
      baseURL: config.apiBaseUrl,
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    })

    clearTimeout(timeout)
    return response
  }
  catch (error: any) {
    if (error?.name === 'AbortError') {
      throw createError({
        statusCode: 504,
        data: { error: 'Backend server tidak merespons' },
      })
    }

    const statusCode = error?.response?.status || error?.statusCode || 500
    const data = error?.data || {}

    throw createError({
      statusCode,
      data,
    })
  }
})
