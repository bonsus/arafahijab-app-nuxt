import type { AdminApiError } from '~/types/admin'

// Admin HTTP client. Routes through the dedicated /admin-api proxy
// (separate cookie & backend base URL). Mirrors useApi() but isolated.
export function useAdminApi() {
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
        baseURL: '/admin-api',
        method: options.method || 'GET',
        body: options.body,
        params: options.params,
        responseType: options.responseType,
      })
      return response as T
    }
    catch (error: any) {
      const statusCode = error?.response?.status || error?.statusCode || 500

      // Nitro createError({ data }) → client $fetch sees it as error.data.data
      const backendBody = error?.data?.data || error?.data || {}
      const message = backendBody.error || backendBody.message || error?.statusMessage || 'Terjadi kesalahan'
      const errors = backendBody.errors

      // Global auth/permission handling: 401 -> login, 403 -> access denied popup
      useAdminAccessControl().handleHttpError(statusCode, message)

      throw { statusCode, message, errors } as AdminApiError
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
