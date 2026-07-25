export default defineNuxtRouteMiddleware(() => {
  const authStore = useAdminAuthStore()

  if (authStore.isAuthenticated) {
    return navigateTo('/admin/dashboard')
  }
})
