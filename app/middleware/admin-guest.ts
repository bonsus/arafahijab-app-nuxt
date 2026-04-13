export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip di server-side rendering
  if (process.server) return

  const authStore = useAuthAdminStore()

  // Jika sudah ada user data, redirect ke admin dashboard
  if (authStore.user) {
    return navigateTo('/admin')
  }

  // Coba fetch user dari server untuk mengecek apakah masih ada session
  try {
    await authStore.fetchUser()
    if (authStore.user) {
      return navigateTo('/admin')
    }
  } catch (error) {
    // Jika error, user belum login, lanjutkan ke halaman login
  }
})
