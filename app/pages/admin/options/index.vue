<script setup lang="ts">
import { Loader2, Download, Save } from 'lucide-vue-next'
import type { AdminResponse } from '~/types/admin'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const api = useAdminApi()
const toast = useToast()

const name = ref('')
const valueText = ref('')
const loading = ref(false)
const saving = ref(false)
const loadedName = ref('')

const suggestions = ['site_info', 'payment_config', 'notification_config']

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  }
  catch {
    return String(value)
  }
}

async function load() {
  if (!name.value.trim()) {
    toast.warning('Masukkan nama option')
    return
  }
  loading.value = true
  try {
    const res = await api.get<AdminResponse<unknown>>(`/admin/options/${encodeURIComponent(name.value.trim())}`)
    valueText.value = prettyJson(res.data)
    loadedName.value = name.value.trim()
    toast.success('Option dimuat')
  }
  catch (error: any) {
    if (error?.statusCode === 404) {
      valueText.value = '{\n  \n}'
      loadedName.value = name.value.trim()
      toast.info('Option belum ada. Anda dapat membuatnya.')
    }
    else {
      toast.error(error?.message || 'Gagal memuat option')
    }
  }
  finally {
    loading.value = false
  }
}

async function save() {
  if (!name.value.trim()) {
    toast.warning('Masukkan nama option')
    return
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(valueText.value)
  }
  catch {
    toast.error('Value bukan JSON yang valid')
    return
  }
  saving.value = true
  try {
    await api.put('/admin/options', { name: name.value.trim(), value: parsed })
    toast.success('Option berhasil disimpan')
    loadedName.value = name.value.trim()
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal menyimpan option')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-5">
    <div>
      <h1 class="text-xl font-bold text-gray-900">Options</h1>
      <p class="mt-1 text-sm text-gray-500">Konfigurasi key–value platform (value berupa JSON).</p>
    </div>

    <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div class="flex-1">
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Option</label>
          <input
            v-model="name"
            type="text"
            placeholder="site_info"
            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            @keyup.enter="load"
          />
        </div>
        <button
          :disabled="loading"
          class="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          @click="load"
        >
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
          <Download v-else class="h-4 w-4" />
          Muat
        </button>
      </div>

      <div class="mt-2 flex flex-wrap gap-1.5">
        <span class="text-xs text-gray-400">Contoh:</span>
        <button
          v-for="s in suggestions"
          :key="s"
          class="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200"
          @click="name = s"
        >{{ s }}</button>
      </div>

      <div class="mt-5">
        <label class="mb-1.5 block text-sm font-medium text-gray-700">Value (JSON)</label>
        <textarea
          v-model="valueText"
          rows="14"
          spellcheck="false"
          placeholder='{\n  "key": "value"\n}'
          class="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-mono text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      <div class="mt-4 flex justify-end">
        <button
          :disabled="saving"
          class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          @click="save"
        >
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          Simpan Option
        </button>
      </div>
    </div>
  </div>
</template>
