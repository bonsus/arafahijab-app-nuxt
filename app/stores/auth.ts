import { defineStore } from 'pinia'
import type { User, LoginPayload, LoginResponse, ApiResponse } from '~/types'

export const useAuthStore = defineStore('auth', () => {
  const token = useCookie('auth_token', {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
    sameSite: 'lax',
    secure: import.meta.env.PROD,
  })
  const user = ref<User | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  async function login(payload: LoginPayload) {
    const api = useApi()
    const response = await api.post<ApiResponse<LoginResponse>>('/user/auth/login', payload)
    token.value = response.data.token
    user.value = response.data.user
  }

  async function fetchMe() {
    const api = useApi()
    const response = await api.get<ApiResponse<LoginResponse>>('/user/auth/me')
    user.value = response.data.user
  }

  function logout() {
    token.value = null
    user.value = null
    navigateTo('/login')
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    fetchMe,
    logout,
  }
})
