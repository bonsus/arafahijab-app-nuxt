// Global handling for auth/permission HTTP errors coming from the API.
// - 401: token invalid/expired -> clear session & redirect to /login
// - 403: access denied -> show a global "no access" popup
//
// State is module-scoped so the <AppAccessDenied> popup (mounted once in
// app.vue) and useApi() share the same instance.

const accessDeniedVisible = ref(false)
const accessDeniedMessage = ref('')

export function useAccessControl() {
  function showAccessDenied(message?: string) {
    accessDeniedMessage.value = message || 'Anda tidak memiliki hak akses untuk melakukan aksi ini.'
    accessDeniedVisible.value = true
  }

  function closeAccessDenied() {
    accessDeniedVisible.value = false
  }

  function redirectToLogin() {
    if (!import.meta.client) return
    // Avoid loops when the 401 originates from the login screen itself.
    if (window.location.pathname === '/login') return
    // Clear the (non-httpOnly) auth cookie then hard-redirect to reset state.
    document.cookie = 'auth_token=; Max-Age=0; path=/'
    window.location.href = '/login'
  }

  /** Centralised handler invoked by useApi() on every request failure. */
  function handleHttpError(statusCode: number, message?: string) {
    // Only act on the client; module-scoped state must not be mutated on the server.
    if (!import.meta.client) return
    if (statusCode === 401) {
      redirectToLogin()
    }
    else if (statusCode === 403) {
      showAccessDenied(message)
    }
  }

  return {
    accessDeniedVisible,
    accessDeniedMessage,
    showAccessDenied,
    closeAccessDenied,
    handleHttpError,
  }
}
