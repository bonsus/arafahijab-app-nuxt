export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip di server-side rendering
  if (process.server) return

  const authStore = useAuthUserStore()

  // Jika belum ada user data, coba fetch dari server
  if (!authStore.user) {
    try {
      await authStore.fetchUser()
    } catch (error) {
      // Jika gagal fetch user, redirect ke admin login
      return navigateTo('/login')
    }
  }

  // Jika tidak ada user setelah fetch, redirect ke login
  if (!authStore.user) {
    return navigateTo('/login')
  }
})
