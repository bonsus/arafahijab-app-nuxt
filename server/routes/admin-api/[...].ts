// Dedicated proxy for the Admin backend (apps/admin).
// All admin requests go through /admin-api/* and are forwarded to
// runtimeConfig.adminApiBaseUrl, injecting the isolated `admin_token` cookie.
// Kept fully separate from the main /api proxy (different cookie & base URL).
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  // Use raw event path to preserve trailing slashes (getRouterParam strips them)
  const path = (event.path || '').split('?')[0]!.replace(/^\/admin-api\//, '')
  const method = event.method
  const query = getQuery(event)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Inject Bearer token from the admin-only cookie
  const token = getCookie(event, 'admin_token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const rawBody = ['POST', 'PUT', 'PATCH'].includes(method)
    ? await readBody(event)
    : undefined

  const contentType = getHeader(event, 'content-type') || ''
  // multipart/form-data pass-through
  if (contentType.includes('multipart/form-data')) {
    if (token) {
      event.node.req.headers.authorization = `Bearer ${token}`
    }
    return proxyRequest(event, `${config.adminApiBaseUrl}/${path}`)
  }

  // ofetch only auto-serializes plain objects, not arrays.
  const body = Array.isArray(rawBody) ? JSON.stringify(rawBody) : rawBody

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await $fetch(`/${path}`, {
      baseURL: config.adminApiBaseUrl,
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
