export default defineNuxtRouteMiddleware(async (to, from) => {
  // // Skip di server-side rendering
  // if (process.server) return

  // const authStore = useAuthAdminStore()

  // // Jika belum ada user data, coba fetch dari server
  // if (!authStore.user) {
  //   try {
  //     await authStore.fetchUser()
  //   } catch (error) {
  //     // Jika gagal fetch user, redirect ke admin login
  //     return navigateTo('/admin/login')
  //   }
  // }

  // // Jika tidak ada user setelah fetch, redirect ke login
  // if (!authStore.user) {
  //   return navigateTo('/admin/login')
  // }
  return
})
