import type { ApiError, ApiErrorResponse } from '~/types'

export function useApi() {
  async function request<T>(
    url: string,
    options: {
      method?: string
      body?: unknown
      params?: Record<string, string>
    } = {},
  ): Promise<T> {
    try {
      const response = await ($fetch as Function)(url, {
        baseURL: '/api',
        method: options.method || 'GET',
        body: options.body,
        params: options.params,
      })
      return response as T
    }
    catch (error: any) {
      const statusCode = error?.response?.status || error?.statusCode || 500

      // Nitro createError({ data }) → client $fetch sees it as error.data.data
      const backendBody = error?.data?.data || error?.data || {}
      const message = backendBody.error || backendBody.message || error?.statusMessage || 'Terjadi kesalahan'
      const errors = backendBody.errors

      throw { statusCode, message, errors } as ApiError
    }
  }

  return {
    get: <T>(url: string, params?: Record<string, string>) =>
      request<T>(url, { method: 'GET', params }),

    post: <T>(url: string, body?: unknown) =>
      request<T>(url, { method: 'POST', body }),

    put: <T>(url: string, body?: unknown) =>
      request<T>(url, { method: 'PUT', body }),

    patch: <T>(url: string, body?: unknown) =>
      request<T>(url, { method: 'PATCH', body }),

    delete: <T>(url: string) =>
      request<T>(url, { method: 'DELETE' }),
  }
}
