<script setup lang="ts">
import AlertSuccess from '../AlertSuccess.vue'

// Use login-specific SSR translation
const { t, tc, isLoaded } = useLoginTranslation()
// Google authentication
const { loginWithGoogle, loading: googleLoading } = useGoogleAuth()

const form = ref({
  email: '',
  password: '',
})

const route = useRoute()
const loading = ref(false)
const error = ref('')
const success = ref('')

const loginUser = async () => {
  if (route.query.registered) {
    navigateTo({ path: '/login' })
  }
  loading.value = true
  try {
    await $fetch('/api/user/auth/login', {
      method: 'POST',
      body: form.value,
    })
    error.value = ''
    success.value = t('messages.success')
    navigateTo('/app')
  } catch (err: any) {
    error.value = err.data.error || t('messages.error')
  } finally {
    loading.value = false
  }
}

</script>
<template>
  <div class="w-full max-w-md mb-4" v-if="$route.query.registered">
    <AlertSuccess>
      {{ t('messages.registered') }}
    </AlertSuccess>
  </div>
  <Card class="w-full max-w-md">
    <CardHeader class="text-center">
      <CardTitle class="text-2xl font-semibold flex-1 text-center">{{ t('title') }}</CardTitle>
      <CardDescription>
        {{ t('subtitle') }}
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <AlertError v-if="error">
        {{ error }}
      </AlertError>
      <AlertSuccess v-if="success">
        {{ success }}
      </AlertSuccess>
      <div>
        <div class="space-y-4">
          <div class="flex flex-col space-y-2">
            <Label for="email">{{ t('form.email') }}</Label>
            <Input id="email" v-model="form.email" :placeholder="t('form.placeholders.email')" type="email" />
          </div>
          <div class="flex flex-col space-y-2">
            <div class="flex items-center">
              <Label for="password">{{ t('form.password') }}</Label>
              <NuxtLink to="/forgot-password" class="ml-auto inline-block text-sm text-blue-600 hover:text-blue-500 underline">
                {{ t('form.forgot_password') }}
              </NuxtLink>
            </div>
            <Input id="password" v-model="form.password" :placeholder="t('form.placeholders.password')" type="password" />
          </div>
          <Button @click="loginUser()" type="submit" class="w-full" :disabled="loading">
            <Spinner v-if="loading" />
            {{ loading ? tc('loading') : t('button.login') }}
          </Button>
        </div>
      </div>
      <div class="text-center">
        <Button @click="loginWithGoogle" variant="outline" class="w-full" :disabled="googleLoading">
          <span class="flex items-center justify-center space-x-2">
            <Spinner v-if="googleLoading" class="mr-2" />
            <span v-else class="mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="w-5 h-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.17 1.53 7.59 2.82l5.61-5.61C33.53 3.95 29.23 2 24 2 14.94 2 7.48 7.94 4.58 15.49l6.95 5.41C13.1 14.42 17.98 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.1 24.5c0-1.57-.14-2.71-.45-3.89H24v7.38h12.74c-.26 2.08-1.71 5.2-4.93 7.29l7.59 5.85c4.41-4.06 6.7-10.05 6.7-16.63z"/>
                <path fill="#FBBC05" d="M10.09 28.36c-.48-1.44-.76-2.97-.76-4.61s.28-3.17.76-4.61L3.14 13.72A22.003 22.003 0 002 23.75c0 3.49.84 6.79 2.34 9.78l7.75-5.17z"/>
                <path fill="#34A853" d="M24 46c5.9 0 10.85-1.95 14.46-5.3l-7.59-5.85c-2.03 1.37-4.77 2.17-6.87 2.17-6.01 0-11.14-4.9-12.95-11.41l-7.75 5.17C7.48 40.06 14.94 46 24 46z"/>
                <path fill="none" d="M2 2h44v44H2z"/>
              </svg>
            </span>
            <span>{{ googleLoading ? tc('loading') : t('button.google_login') }}</span>
          </span>
        </Button>
      </div>
      <div class="text-center text-sm text-gray-600 mb-10">
        {{ t('registration.text') }}
        <NuxtLink to="/register" class="text-blue-600 hover:underline">
          {{ t('registration.link') }}
        </NuxtLink>
      </div>
      <div class="flex justify-end">
        <LanguageSwitcher />
      </div>
    </CardContent>
  </Card>
</template>
