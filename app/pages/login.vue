<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const authStore = useAuthStore()

const form = reactive({
  email: '',
  password: '',
})

const isLoading = ref(false)
const errorMessage = ref('')
const fieldErrors = ref<Record<string, string[]>>({})

async function handleLogin() {
  isLoading.value = true
  errorMessage.value = ''
  fieldErrors.value = {}

  try {
    await authStore.login({
      email: form.email,
      password: form.password,
    })
    navigateTo('/dashboard')
  }
  catch (error: any) {
    if (error?.errors) {
      fieldErrors.value = error.errors
    }
    if (error?.message) {
      errorMessage.value = error.message
    }
    if (!error?.errors && !error?.message) {
      errorMessage.value = 'Login gagal. Silakan coba lagi.'
    }
  }
  finally {
    isLoading.value = false
  }
}
</script>
<template>
  <div class="w-full max-w-md">
    <div class="rounded-xl bg-white p-8 shadow-lg">
      <!-- Header -->
      <div class="mb-8 text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-lg font-bold text-white">
          A
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Masuk ke Arafa ERP</h1>
        <p class="mt-1 text-sm text-gray-500">Silakan masuk dengan akun Anda</p>
      </div>

      <!-- Error Message -->
      <div
        v-if="errorMessage"
        class="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </div>

      <!-- Validation Errors -->
      <div
        v-if="Object.keys(fieldErrors).length"
        class="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        <ul class="list-inside list-disc space-y-1">
          <li v-for="(messages, field) in fieldErrors" :key="field">
            {{ messages.join(', ') }}
          </li>
        </ul>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin">
        <div class="space-y-4">
          <!-- Email -->
          <div>
            <label for="email" class="mb-1.5 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              autocomplete="email"
              placeholder="nama@perusahaan.com"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="mb-1.5 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              required
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="isLoading"
          class="mt-6 flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            v-if="isLoading"
            class="mr-2 h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {{ isLoading ? 'Memproses...' : 'Masuk' }}
        </button>
      </form>
    </div>
  </div>
</template>
