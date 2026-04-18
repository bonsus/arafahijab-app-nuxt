export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  // Use raw event path to preserve trailing slashes (getRouterParam strips them)
  const path = (event.path || '').split('?')[0]!.replace(/^\/api\//, '')
  const method = event.method
  const query = getQuery(event)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Inject Bearer token from cookie
  const token = getCookie(event, 'auth_token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const rawBody = ['POST', 'PUT', 'PATCH'].includes(method)
    ? await readBody(event)
    : undefined

  // ofetch only auto-serializes plain objects, not arrays.
  // Stringify arrays explicitly so the backend receives valid JSON.
  const body = Array.isArray(rawBody) ? JSON.stringify(rawBody) : rawBody

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await $fetch(`/${path}`, {
      baseURL: config.apiBaseUrl,
      method: method as any,
      headers,
      body,
      params: query,
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
