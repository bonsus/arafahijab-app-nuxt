<script setup lang="ts">
// Use custom toast composable
const toast = useToast()
// Use register-specific SSR translation
const { t, tc, isLoaded } = useRegisterTranslation()
// Google authentication
const { loginWithGoogle, loading: googleLoading } = useGoogleAuth()

const form = ref({
  name: '',
  phone: '',
  company: '',
  email: '',
  password: '',
  password_confirmation: '',
})

const loading = ref(false)
const error = ref('')
const errors = ref({
  name: [],
  phone: [],
  company: [],
  email: [],
  password: [],
  password_confirmation: []
})
const registerUser = async () => {
  loading.value = true
  try {
    await $fetch('/api/user/auth/register', {
      method: 'POST',
      body: form.value,
    })
    // toast.success(t('messages.success'))
    navigateTo('/login?registered=true')
  } catch (err: any) {
    if (err?.data?.error) {
      toast.error(err.data.error)
    } else {
      toast.error(t('messages.error'))
    }
    errors.value = err.data.errors || {}
  } finally {
    loading.value = false
  }
}

</script>
<template>
  <Card class="w-full max-w-md">
    <CardHeader class="text-center">
      <CardTitle class="text-2xl font-semibold flex-1 text-center">{{ t('title') }}</CardTitle>
      <CardDescription>
        {{ t('subtitle') }}
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div>
        <div class="space-y-4">
          <div class="flex flex-col space-y-2">
            <Label for="name">{{ t('form.name') }}</Label>
            <Input :aria-invalid="errors.name?.length > 0" id="name" v-model="form.name" :placeholder="t('form.placeholders.name')" />
            <p v-if="errors.name?.length > 0" class="text-red-500 text-xs">{{ errors.name[0] }}</p>
          </div>
          <!-- <div class="flex flex-col space-y-2">
            <Label for="phone">{{ t('form.phone') }}</Label>
            <Input :aria-invalid="errors.phone?.length > 0" id="phone" v-model="form.phone" :placeholder="t('form.placeholders.phone')" type="tel" />
            <p v-if="errors.phone?.length > 0" class="text-red-500 text-xs">{{ errors.phone[0] }}</p>
          </div> -->
          <div class="flex flex-col space-y-2">
            <Label for="email">{{ t('form.email') }}</Label>
            <Input :aria-invalid="errors.email?.length > 0" id="email" v-model="form.email" :placeholder="t('form.placeholders.email')" type="email" />
            <p v-if="errors.email?.length > 0" class="text-red-500 text-xs">{{ errors.email[0] }}</p>
          </div>
          <div class="flex flex-col space-y-2">
            <Label for="password">{{ t('form.password') }}</Label>
            <Input :aria-invalid="errors.password?.length > 0" id="password" v-model="form.password" :placeholder="t('form.placeholders.password')" type="password" />
            <p v-if="errors.password?.length > 0" class="text-red-500 text-xs">{{ errors.password[0] }}</p>
          </div>
          <div class="flex flex-col space-y-2">
            <Label for="password_confirmation">{{ t('form.password_confirmation') }}</Label>
            <Input :aria-invalid="errors.password_confirmation?.length > 0" id="password_confirmation" v-model="form.password_confirmation" :placeholder="t('form.placeholders.password_confirmation')" type="password" />
            <p v-if="errors.password_confirmation?.length > 0" class="text-red-500 text-xs">{{ errors.password_confirmation[0] }}</p>
          </div>
          <Button @click="registerUser()" type="submit" class="w-full" :disabled="loading">
            <Spinner v-if="loading" />
            {{ loading ? tc('loading') : t('button.register') }}
          </Button>
        </div>
      </div>
      <!-- <Separator class="my-6" /> -->
      <!-- <div class="text-center">
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
            <span>{{ googleLoading ? tc('loading') : t('button.google_signup') }}</span>
          </span>
        </Button>
      </div> -->
      <!-- <Separator class="my-6" /> -->
      <p class="text-center text-sm text-gray-600">
        {{ t('login_link.text') }}
        <NuxtLink to="/login" class="text-blue-600 hover:underline">
          {{ t('login_link.link') }}
        </NuxtLink>
      </p>
      <div class="flex justify-end mt-6">
        <LanguageSwitcher />
      </div>
    </CardContent>
  </Card>
</template>
