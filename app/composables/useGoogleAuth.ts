// Composable for Google authentication
export const useGoogleAuth = () => {
  const loading = ref(false)
  const error = ref('')

  const loginWithGoogle = async () => {
    loading.value = true
    error.value = ''
    
    try {
      // Get Google auth URL
      const { authUrl } = await $fetch('/api/auth/google/url')
      
      // Redirect to Google OAuth
      await navigateTo(authUrl, { external: true })
      
    } catch (err: any) {
      error.value = err.data?.message || 'Failed to start Google authentication'
      console.error('Google auth error:', err)
    } finally {
      loading.value = false
    }
  }

  const handleGoogleCallback = async (code: string) => {
    loading.value = true
    error.value = ''
    
    try {
      const response = await $fetch('/api/auth/google/callback', {
        query: { code }
      })
      
      // Redirect to app after successful authentication
      await navigateTo('/app')
      
      return response
    } catch (err: any) {
      error.value = err.data?.message || 'Google authentication failed'
      console.error('Google callback error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loginWithGoogle,
    handleGoogleCallback,
    loading: readonly(loading),
    error: readonly(error)
  }
}
