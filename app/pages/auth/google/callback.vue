<script setup lang="ts">
// Google OAuth callback page
const route = useRoute()
const { handleGoogleCallback, loading, error } = useGoogleAuth()

// Handle the OAuth callback
onMounted(async () => {
  const code = route.query.code as string
  const errorParam = route.query.error as string
  
  if (errorParam) {
    console.error('Google OAuth error:', errorParam)
    await navigateTo('/login?error=google_auth_failed')
    return
  }
  
  if (code) {
    try {
      await handleGoogleCallback(code)
      // Navigation to /app is handled in the composable
    } catch (err) {
      console.error('Callback error:', err)
      await navigateTo('/login?error=google_auth_failed')
    }
  } else {
    await navigateTo('/login?error=invalid_callback')
  }
})

useHead({
  title: 'Google Authentication'
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <Card class="w-full max-w-md">
      <CardContent class="p-6">
        <div class="text-center space-y-4">
          <div v-if="loading">
            <Spinner class="mx-auto mb-4" />
            <h2 class="text-xl font-semibold">Authenticating with Google...</h2>
            <p class="text-gray-600">Please wait while we process your login.</p>
          </div>
          
          <div v-else-if="error" class="text-red-600">
            <h2 class="text-xl font-semibold">Authentication Failed</h2>
            <p>{{ error }}</p>
            <Button @click="navigateTo('/login')" class="mt-4">
              Return to Login
            </Button>
          </div>
          
          <div v-else>
            <h2 class="text-xl font-semibold">Processing...</h2>
            <p class="text-gray-600">Redirecting you to the application.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
