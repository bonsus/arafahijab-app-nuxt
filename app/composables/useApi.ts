import type { ApiError, ApiErrorResponse } from '~/types'

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
        params: options.params,
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
