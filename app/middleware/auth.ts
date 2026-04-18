export default defineNuxtRouteMiddleware(async () => {
  const token = useCookie('auth_token')

  if (!token.value) {
    return navigateTo('/login')
  }

  const authStore = useAuthStore()

  // Only validate token & fetch user data on client side
  // SSR trusts the cookie existence; client verifies with backend
  if (import.meta.client && !authStore.user) {
    try {
      const res: any = await $fetch('/api/user/auth/me')
      authStore.user = res.data.user
    }
    catch {
      token.value = null
      return navigateTo('/login')
    }
  }
})
