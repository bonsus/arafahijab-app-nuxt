<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})
// get current domain url
const url = useRequestURL()
const domain = url.hostname

const authStore = useAuthStore()

const form = reactive({
  company: '',
  name: '',
  phone: '',
  email: '',
  password: '',
  password_confirmation: '',
})

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const fieldErrors = ref<Record<string, string[]>>({})

async function handleRegister() {
  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  fieldErrors.value = {}

  if (form.password !== form.password_confirmation) {
    fieldErrors.value = { password_confirmation: ['Konfirmasi password tidak sama'] }
    isLoading.value = false
    return
  }

  try {
    await authStore.register({
      company: form.company || undefined,
      name: form.name,
      phone: form.phone || undefined,
      email: form.email,
      password: form.password,
      password_confirmation: form.password_confirmation,
    })
    successMessage.value = 'Registrasi berhasil. Silakan masuk dengan akun Anda.'
    setTimeout(() => navigateTo('/login'), 1500)
  }
  catch (error: any) {
    if (error?.errors) {
      fieldErrors.value = error.errors
    }
    if (error?.message) {
      errorMessage.value = error.message
    }
    if (!error?.errors && !error?.message) {
      errorMessage.value = 'Registrasi gagal. Silakan coba lagi.'
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
        <template v-if="domain=='app.ordeo.id'">
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-lg font-bold text-white">
            O
          </div>
          <h1 class="text-2xl font-bold text-gray-900">Daftar ke Ordeo</h1>
        </template>
        <template v-else>
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-lg font-bold text-white">
            A
          </div>
          <h1 class="text-2xl font-bold text-gray-900">Daftar ke Arafa App</h1>
        </template>
        <p class="mt-1 text-sm text-gray-500">Buat akun baru untuk memulai</p>
      </div>

      <!-- Success Message -->
      <div
        v-if="successMessage"
        class="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700"
      >
        {{ successMessage }}
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
      <form @submit.prevent="handleRegister">
        <div class="space-y-4">
          <!-- Company -->
          <div>
            <label for="company" class="mb-1.5 block text-sm font-medium text-gray-700">
              Nama Perusahaan
              <span class="font-normal text-gray-400">(opsional)</span>
            </label>
            <input
              id="company"
              v-model="form.company"
              type="text"
              autocomplete="organization"
              placeholder="Toko Maju"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <!-- Name -->
          <div>
            <label for="name" class="mb-1.5 block text-sm font-medium text-gray-700">
              Nama
            </label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              required
              autocomplete="name"
              placeholder="John Doe"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <!-- Phone -->
          <div>
            <label for="phone" class="mb-1.5 block text-sm font-medium text-gray-700">
              Nomor Telepon
              <span class="font-normal text-gray-400">(opsional)</span>
            </label>
            <input
              id="phone"
              v-model="form.phone"
              type="tel"
              autocomplete="tel"
              placeholder="08123456789"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

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
              minlength="8"
              autocomplete="new-password"
              placeholder="Minimal 8 karakter"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <!-- Password Confirmation -->
          <div>
            <label for="password_confirmation" class="mb-1.5 block text-sm font-medium text-gray-700">
              Konfirmasi Password
            </label>
            <input
              id="password_confirmation"
              v-model="form.password_confirmation"
              type="password"
              required
              minlength="8"
              autocomplete="new-password"
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
          {{ isLoading ? 'Memproses...' : 'Daftar' }}
        </button>
      </form>

      <!-- Link to Login -->
      <p class="mt-6 text-center text-sm text-gray-500">
        Sudah punya akun?
        <NuxtLink to="/login" class="font-semibold text-primary-600 hover:text-primary-700">
          Masuk
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
