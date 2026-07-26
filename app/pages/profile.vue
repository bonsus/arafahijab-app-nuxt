<script setup lang="ts">
import type { ApiError } from '~/types'

definePageMeta({
  middleware: 'auth',
})

const api = useApi()
const toast = useToast()
const authStore = useAuthStore()

const savingProfile = ref(false)
const savingPassword = ref(false)

const profileForm = reactive({
  name: '',
})

const passwordForm = reactive({
  password: '',
  new_password: '',
  new_password_confirmation: '',
})

onMounted(() => {
  profileForm.name = authStore.user?.name || ''
})

async function handleSaveProfile() {
  savingProfile.value = true
  try {
    await api.post('/user/auth/update-profile', {
      name: profileForm.name,
    })
    await authStore.fetchMe()
    toast.success('Profil berhasil diperbarui')
  }
  catch (err) {
    toast.error((err as ApiError).message || 'Gagal memperbarui profil')
  }
  finally {
    savingProfile.value = false
  }
}

async function handleSavePassword() {
  if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
    toast.error('Konfirmasi password baru tidak cocok')
    return
  }
  savingPassword.value = true
  try {
    await api.post('/user/auth/update-password', {
      password: passwordForm.password,
      new_password: passwordForm.new_password,
      new_password_confirmation: passwordForm.new_password_confirmation,
    })
    passwordForm.password = ''
    passwordForm.new_password = ''
    passwordForm.new_password_confirmation = ''
    toast.success('Password berhasil diubah')
  }
  catch (err) {
    toast.error((err as ApiError).message || 'Gagal mengubah password')
  }
  finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <h1 class="text-2xl font-bold text-gray-900">Profil Saya</h1>

    <!-- Profile -->
    <form class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200" @submit.prevent="handleSaveProfile">
      <h2 class="mb-5 text-lg font-semibold text-gray-900">Informasi Profil</h2>
      <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <!-- Nama -->
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama</label>
          <input v-model="profileForm.name" type="text" class="form-input" placeholder="Nama lengkap" required />
        </div>
        <!-- Email (read-only) -->
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
          <input :value="authStore.user?.email || ''" type="email" class="form-input bg-gray-50 text-gray-500" disabled />
        </div>
      </div>
      <div class="mt-6 flex justify-end">
        <button
          type="submit"
          :disabled="savingProfile"
          class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ savingProfile ? 'Menyimpan...' : 'Simpan Profil' }}
        </button>
      </div>
    </form>

    <!-- Password -->
    <form class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200" @submit.prevent="handleSavePassword">
      <h2 class="mb-5 text-lg font-semibold text-gray-900">Ubah Password</h2>
      <div class="space-y-5">
        <!-- Current password -->
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Password Saat Ini</label>
          <input v-model="passwordForm.password" type="password" class="form-input" placeholder="Password saat ini" autocomplete="current-password" required />
        </div>
        <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <!-- New password -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Password Baru</label>
            <input v-model="passwordForm.new_password" type="password" class="form-input" placeholder="Password baru" autocomplete="new-password" required />
          </div>
          <!-- Confirm new password -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Konfirmasi Password Baru</label>
            <input v-model="passwordForm.new_password_confirmation" type="password" class="form-input" placeholder="Ulangi password baru" autocomplete="new-password" required />
          </div>
        </div>
      </div>
      <div class="mt-6 flex justify-end">
        <button
          type="submit"
          :disabled="savingPassword"
          class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ savingPassword ? 'Menyimpan...' : 'Ubah Password' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.form-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
