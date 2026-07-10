import type { ApiError, ApiErrorResponse } from '~/types'

/**
 * Normalize `date_from` / `date_to` query params to RFC3339 with the local
 * timezone offset before sending to the API.
 * - `date_from`: plain date (YYYY-MM-DD) → start of day, e.g. 2026-07-01T00:00:00+07:00
 * - `date_to`:   plain date (YYYY-MM-DD) → end of day,   e.g. 2026-07-09T23:59:59+07:00
 * Values already containing a time component (e.g. "T") are left untouched.
 *
 * Only runs on the client so the offset always reflects the end user's browser
 * timezone (on the server the offset would be the server's timezone instead).
 */
function normalizeDateParams(params?: Record<string, string>): Record<string, string> | undefined {
  if (!params || !import.meta.client) return params
  const isPlainDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)
  const next = { ...params }
  if (next.date_from && isPlainDate(next.date_from)) next.date_from = formatDateFromForApi(next.date_from)
  if (next.date_to && isPlainDate(next.date_to)) next.date_to = formatDateToForApi(next.date_to)
  return next
}

export function useApi() {
  async function request<T>(
    url: string,
    options: {
      method?: string
      body?: unknown
      params?: Record<string, string>
      responseType?: 'json' | 'blob' | 'text'
    } = {},
  ): Promise<T> {
    try {
      const response = await ($fetch as Function)(url, {
        baseURL: '/api',
        method: options.method || 'GET',
        body: options.body,
        params: normalizeDateParams(options.params),
        responseType: options.responseType,
      })
      return response as T
    }
    catch (error: any) {
      const statusCode = error?.response?.status || error?.statusCode || 500

      // Special handling for blob errors - error might be in blob format
      if (options.responseType === 'blob') {
        // Check if error.data is a Blob
        if (error?.data instanceof Blob) {
          try {
            const text = await error.data.text()
            const jsonError = JSON.parse(text)
            const message = jsonError.error || jsonError.message || 'Terjadi kesalahan'
            throw { statusCode, message, errors: jsonError.errors } as ApiError
          }
          catch (parseError) {
            // If parsing fails, use default error message
            useAccessControl().handleHttpError(statusCode)
            throw { statusCode, message: 'Terjadi kesalahan saat memproses response', errors: undefined } as ApiError
          }
        }
        // Check if error.data is already an object (JSON parsed by $fetch)
        else if (error?.data && typeof error.data === 'object') {
          const message = error.data.error || error.data.message || 'Terjadi kesalahan'
          useAccessControl().handleHttpError(statusCode, message)
          throw { statusCode, message, errors: error.data.errors } as ApiError
        }
      }

      // Nitro createError({ data }) → client $fetch sees it as error.data.data
      const backendBody = error?.data?.data || error?.data || {}
      const message = backendBody.error || backendBody.message || error?.statusMessage || 'Terjadi kesalahan'
      const errors = backendBody.errors

      // Global auth/permission handling: 401 -> login, 403 -> access denied popup
      useAccessControl().handleHttpError(statusCode, message)

      throw { statusCode, message, errors } as ApiError
    }
  }

  return {
    get: <T>(url: string, params?: Record<string, string>, options?: { responseType?: 'json' | 'blob' | 'text' }) =>
      request<T>(url, { method: 'GET', params, ...options }),

    post: <T>(url: string, body?: unknown, options?: { responseType?: 'json' | 'blob' | 'text' }) =>
      request<T>(url, { method: 'POST', body, ...options }),

    put: <T>(url: string, body?: unknown) =>
      request<T>(url, { method: 'PUT', body }),

    patch: <T>(url: string, body?: unknown) =>
      request<T>(url, { method: 'PATCH', body }),

    delete: <T>(url: string) =>
      request<T>(url, { method: 'DELETE' }),
  }
}
