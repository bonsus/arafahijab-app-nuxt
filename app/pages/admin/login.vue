<script setup lang="ts">
import { ShieldCheck, Loader2 } from 'lucide-vue-next'

definePageMeta({
  layout: 'admin-auth',
  middleware: 'admin-guest',
})

const authStore = useAdminAuthStore()

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
    await authStore.login({ email: form.email, password: form.password })
    navigateTo('/admin/dashboard')
  }
  catch (error: any) {
    if (error?.errors) fieldErrors.value = error.errors
    if (error?.message) errorMessage.value = error.message
    if (!error?.errors && !error?.message) errorMessage.value = 'Login gagal. Silakan coba lagi.'
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-md">
    <div class="rounded-2xl bg-white p-8 shadow-2xl">
      <div class="mb-8 text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <ShieldCheck class="h-7 w-7" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p class="mt-1 text-sm text-gray-500">Masuk ke area administrasi</p>
      </div>

      <div v-if="errorMessage" class="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ errorMessage }}
      </div>

      <div
        v-if="Object.keys(fieldErrors).length"
        class="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        <ul class="list-inside list-disc space-y-1">
          <li v-for="(messages, field) in fieldErrors" :key="field">{{ messages.join(', ') }}</li>
        </ul>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="space-y-4">
          <div>
            <label for="email" class="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              autocomplete="email"
              placeholder="admin@ordeo.id"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label for="password" class="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              required
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin" />
            {{ isLoading ? 'Memproses...' : 'Masuk' }}
          </button>
        </div>
      </form>
    </div>
    <p class="mt-6 text-center text-xs text-slate-500">Ordeo ERP — Admin Console</p>
  </div>
</template>
