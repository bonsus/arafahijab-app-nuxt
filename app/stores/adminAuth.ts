import { defineStore } from 'pinia'
import type { Admin, AdminLoginPayload, AdminLoginResponse, AdminResponse } from '~/types/admin'

// Isolated admin session store. Uses the `admin_token` cookie (separate from
// the main app's `auth_token`) and talks to the admin backend via useAdminApi.
export const useAdminAuthStore = defineStore('adminAuth', () => {
  const token = useCookie('admin_token', {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
    sameSite: 'lax',
    secure: import.meta.env.PROD,
  })
  const admin = ref<Admin | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  async function login(payload: AdminLoginPayload) {
    const api = useAdminApi()
    // Login response is NOT wrapped in { data }; token & admin sit at top level.
    const response = await api.post<AdminLoginResponse>('/admin/auth/login', payload)
    token.value = response.token
    admin.value = response.admin
  }

  async function fetchMe() {
    const api = useAdminApi()
    // Me is a POST that returns { data: {...admin} }.
    const response = await api.post<AdminResponse<Admin>>('/admin/auth/me')
    admin.value = response.data
  }

  function logout() {
    token.value = null
    admin.value = null
    navigateTo('/admin/login')
  }

  return {
    token,
    admin,
    isAuthenticated,
    login,
    fetchMe,
    logout,
  }
})
