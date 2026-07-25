// Global handling for admin auth/permission HTTP errors.
// - 401: token invalid/expired -> clear admin session & redirect to /admin/login
// - 403: access denied -> show a global "no access" popup
//
// Module-scoped state so <AdminAccessDenied> (mounted once in app.vue) and
// useAdminApi() share the same instance. Fully separate from useAccessControl.

const adminAccessDeniedVisible = ref(false)
const adminAccessDeniedMessage = ref('')

export function useAdminAccessControl() {
  function showAccessDenied(message?: string) {
    adminAccessDeniedMessage.value = message || 'Anda tidak memiliki hak akses untuk melakukan aksi ini.'
    adminAccessDeniedVisible.value = true
  }

  function closeAccessDenied() {
    adminAccessDeniedVisible.value = false
  }

  function redirectToLogin() {
    if (!import.meta.client) return
    // Avoid loops when the 401 originates from the login screen itself.
    if (window.location.pathname === '/admin/login') return
    document.cookie = 'admin_token=; Max-Age=0; path=/'
    window.location.href = '/admin/login'
  }

  /** Centralised handler invoked by useAdminApi() on every request failure. */
  function handleHttpError(statusCode: number, message?: string) {
    if (!import.meta.client) return
    if (statusCode === 401) {
      redirectToLogin()
    }
    else if (statusCode === 403) {
      showAccessDenied(message)
    }
  }

  return {
    adminAccessDeniedVisible,
    adminAccessDeniedMessage,
    showAccessDenied,
    closeAccessDenied,
    handleHttpError,
  }
}
