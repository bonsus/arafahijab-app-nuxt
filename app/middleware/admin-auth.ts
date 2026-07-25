export default defineNuxtRouteMiddleware(async () => {
  const token = useCookie('admin_token')

  if (!token.value) {
    return navigateTo('/admin/login')
  }

  const authStore = useAdminAuthStore()

  // SSR trusts the cookie existence; client verifies with the admin backend.
  if (import.meta.client && !authStore.admin) {
    try {
      const res: any = await $fetch('/admin-api/admin/auth/me', { method: 'POST' })
      authStore.admin = res.data
    }
    catch {
      token.value = null
      return navigateTo('/admin/login')
    }
  }
})
