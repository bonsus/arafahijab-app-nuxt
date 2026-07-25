<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import type { Admin, AdminResponse } from '~/types/admin'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const api = useAdminApi()
const toast = useToast()
const authStore = useAdminAuthStore()

const profile = reactive({ name: '', email: '' })
const profileErrors = ref<Record<string, string[]>>({})
const savingProfile = ref(false)

const pwd = reactive({ password: '', new_password: '', new_password_confirmation: '' })
const pwdErrors = ref<Record<string, string[]>>({})
const savingPwd = ref(false)

onMounted(() => {
  profile.name = authStore.admin?.name || ''
  profile.email = authStore.admin?.email || ''
})

async function saveProfile() {
  savingProfile.value = true
  profileErrors.value = {}
  try {
    const res = await api.put<AdminResponse<Admin>>('/admin/auth/me', { ...profile })
    authStore.admin = res.data
    toast.success('Profil berhasil diperbarui')
  }
  catch (error: any) {
    if (error?.errors) profileErrors.value = error.errors
    else toast.error(error?.message || 'Gagal memperbarui profil')
  }
  finally {
    savingProfile.value = false
  }
}

async function savePassword() {
  savingPwd.value = true
  pwdErrors.value = {}
  try {
    await api.put('/admin/auth/update-password', { ...pwd })
    toast.success('Password berhasil diubah')
    pwd.password = ''
    pwd.new_password = ''
    pwd.new_password_confirmation = ''
  }
  catch (error: any) {
    if (error?.errors) pwdErrors.value = error.errors
    else toast.error(error?.message || 'Gagal mengubah password')
  }
  finally {
    savingPwd.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <h1 class="text-xl font-bold text-gray-900">Profil Saya</h1>

    <!-- Profile -->
    <form class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm" @submit.prevent="saveProfile">
      <h2 class="text-sm font-semibold text-gray-900">Data Profil</h2>
      <div class="mt-4 space-y-4">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama</label>
          <input
            v-model="profile.name"
            type="text"
            required
            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <p v-if="profileErrors.name" class="mt-1 text-xs text-red-600">{{ profileErrors.name.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
          <input
            v-model="profile.email"
            type="email"
            required
            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <p v-if="profileErrors.email" class="mt-1 text-xs text-red-600">{{ profileErrors.email.join(', ') }}</p>
        </div>
      </div>
      <div class="mt-5 flex justify-end">
        <button
          type="submit"
          :disabled="savingProfile"
          class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          <Loader2 v-if="savingProfile" class="h-4 w-4 animate-spin" />
          Simpan Profil
        </button>
      </div>
    </form>

    <!-- Password -->
    <form class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm" @submit.prevent="savePassword">
      <h2 class="text-sm font-semibold text-gray-900">Ubah Password</h2>
      <div class="mt-4 space-y-4">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Password Saat Ini</label>
          <input
            v-model="pwd.password"
            type="password"
            required
            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <p v-if="pwdErrors.password" class="mt-1 text-xs text-red-600">{{ pwdErrors.password.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Password Baru</label>
          <input
            v-model="pwd.new_password"
            type="password"
            required
            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <p v-if="pwdErrors.new_password" class="mt-1 text-xs text-red-600">{{ pwdErrors.new_password.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Konfirmasi Password Baru</label>
          <input
            v-model="pwd.new_password_confirmation"
            type="password"
            required
            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <p v-if="pwdErrors.new_password_confirmation" class="mt-1 text-xs text-red-600">{{ pwdErrors.new_password_confirmation.join(', ') }}</p>
        </div>
      </div>
      <div class="mt-5 flex justify-end">
        <button
          type="submit"
          :disabled="savingPwd"
          class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          <Loader2 v-if="savingPwd" class="h-4 w-4 animate-spin" />
          Ubah Password
        </button>
      </div>
    </form>
  </div>
</template>
