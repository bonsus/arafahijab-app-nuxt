// Dedicated proxy for the SingaPay payment-gateway webhook.
// The gateway signs its requests with X-Signature + X-Timestamp and sends
// straight through the backend, so we MUST forward EVERY header and the raw
// body unchanged. proxyRequest replays the original request as-is, which is
// exactly what signature verification needs.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const target = `${config.apiBaseUrl}/billing/webhook/singapay`

  try {
    return await proxyRequest(event, target)
  }
  catch (error: any) {
    const statusCode = error?.response?.status || error?.statusCode || 500
    const data = error?.data || {}

    throw createError({
      statusCode,
      data,
    })
  }
})