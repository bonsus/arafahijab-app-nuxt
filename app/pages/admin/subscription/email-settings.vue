<script setup lang="ts">
import { Loader2, Save, Mail, KeyRound, CheckCircle2 } from 'lucide-vue-next'
import type { EmailSettings, AdminResponse } from '~/types/admin'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const api = useAdminApi()
const toast = useToast()

const loading = ref(false)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})
const form = reactive<EmailSettings>({
  enabled: false,
  host: '',
  port: 587,
  username: '',
  password: '',
  from: '',
  from_name: '',
})

async function fetchSettings() {
  loading.value = true
  try {
    const res = await api.get<AdminResponse<EmailSettings>>('/admin/subscription/email-settings')
    Object.assign(form, {
      enabled: res.data.enabled ?? false,
      host: res.data.host || '',
      port: res.data.port || 587,
      username: res.data.username || '',
      // Password tidak pernah dikembalikan API — selalu kosong.
      password: '',
      from: res.data.from || '',
      from_name: res.data.from_name || '',
    })
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memuat pengaturan email')
  }
  finally {
    loading.value = false
  }
}

onMounted(fetchSettings)

async function save() {
  saving.value = true
  formErrors.value = {}
  try {
    // Kosongkan password agar backend tidak mengubah password lama.
    const payload = { ...form }
    if (!payload.password) delete payload.password
    const res = await api.put<AdminResponse<EmailSettings>>('/admin/subscription/email-settings', payload)
    toast.success(res.message || 'Pengaturan email disimpan')
  }
  catch (error: any) {
    if (error?.errors) formErrors.value = error.errors
    else toast.error(error?.message || 'Gagal menyimpan pengaturan email')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="flex items-center gap-2 text-xl font-bold text-gray-900">
        <Mail class="h-5 w-5 text-indigo-600" /> Pengaturan Email
      </h1>
      <p class="mt-1 text-sm text-gray-500">
        Konfigurasi SMTP untuk seluruh notifikasi email billing (pembayaran, perpanjangan, trial, masa tenggang).
      </p>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20 text-gray-400">
      <Loader2 class="h-6 w-6 animate-spin" />
    </div>

    <div v-else class="max-w-xl rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div class="space-y-4">
        <!-- Enabled toggle -->
        <label class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
          <div>
            <p class="text-sm font-medium text-gray-900">Aktifkan Notifikasi Email</p>
            <p class="text-xs text-gray-500">Jika nonaktif, semua email di-skip (aman untuk development).</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="form.enabled"
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
            :class="form.enabled ? 'bg-indigo-600' : 'bg-gray-200'"
            @click="form.enabled = !form.enabled"
          >
            <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform" :class="form.enabled ? 'translate-x-6' : 'translate-x-1'" />
          </button>
        </label>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">SMTP Host</label>
            <input v-model="form.host" type="text" placeholder="smtp.gmail.com" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            <p v-if="formErrors.host" class="mt-1 text-xs text-red-600">{{ formErrors.host.join(', ') }}</p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Port</label>
            <input v-model.number="form.port" type="number" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            <p v-if="formErrors.port" class="mt-1 text-xs text-red-600">{{ formErrors.port.join(', ') }}</p>
          </div>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Username</label>
          <input v-model="form.username" type="text" placeholder="no-reply@ordeo.id" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.username" class="mt-1 text-xs text-red-600">{{ formErrors.username.join(', ') }}</p>
        </div>

        <div>
          <label class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <KeyRound class="h-3.5 w-3.5 text-gray-400" /> Password
          </label>
          <input v-model="form.password" type="password" placeholder="Kosongkan jika tidak diubah" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p class="mt-1 text-xs text-gray-400">Password tidak pernah ditampilkan. Kosongkan untuk menyimpan password lama.</p>
          <p v-if="formErrors.password" class="mt-1 text-xs text-red-600">{{ formErrors.password.join(', ') }}</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Dari (Email)</label>
            <input v-model="form.from" type="email" placeholder="no-reply@ordeo.id" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            <p v-if="formErrors.from" class="mt-1 text-xs text-red-600">{{ formErrors.from.join(', ') }}</p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Dari (Nama)</label>
            <input v-model="form.from_name" type="text" placeholder="Ordeo" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            <p v-if="formErrors.from_name" class="mt-1 text-xs text-red-600">{{ formErrors.from_name.join(', ') }}</p>
          </div>
        </div>
      </div>

      <div class="mt-5 flex justify-end border-t border-gray-100 pt-4">
        <button :disabled="saving" class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60" @click="save">
          <Save v-if="!saving" class="h-4 w-4" />
          <Loader2 v-else class="h-4 w-4 animate-spin" />
          Simpan
        </button>
      </div>
    </div>
  </div>
</template>
