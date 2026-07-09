<script setup lang="ts">
import {
  Key, Webhook, RefreshCw, Copy, Check, Eye, EyeOff, Send, Loader2, Save,
} from 'lucide-vue-next'
import { formatDateTime } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

interface ApiKeyInfo {
  key: string
  created_at: string
}

interface WebhookInfo {
  url: string
  secret: string
  events: string[]
  status: string
}

interface ExternalSetting {
  api_key: ApiKeyInfo | null
  webhook: WebhookInfo | null
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const AVAILABLE_EVENTS: { value: string; label: string }[] = [
  { value: 'order.created', label: 'Order dibuat' },
//   { value: 'order.updated', label: 'Order diperbarui' },
  { value: 'order.status_updated', label: 'Status order diperbarui' },
  { value: 'payment.received', label: 'Pembayaran diterima' },
  { value: 'payment.updated', label: 'Pembayaran diperbarui' },
  { value: 'stock.changed', label: 'Stok berubah' },
]

const loading = ref(true)
const apiKey = ref<ApiKeyInfo | null>(null)
const webhook = reactive({
  url: '',
  secret: '',
  events: [] as string[],
  status: 'active',
})

const regeneratingKey = ref(false)
const savingWebhook = ref(false)
const regeneratingSecret = ref(false)
const testingWebhook = ref(false)

const showApiKey = ref(false)
const showSecret = ref(false)
const copiedField = ref('')

async function fetchSetting() {
  loading.value = true
  try {
    const res = await api.get<{ data: ExternalSetting }>('/external/setting')
    const data = res.data
    apiKey.value = data?.api_key || null
    if (data?.webhook) {
      webhook.url = data.webhook.url || ''
      webhook.secret = data.webhook.secret || ''
      webhook.events = data.webhook.events || []
      webhook.status = data.webhook.status || 'active'
    }
  }
  catch {
    // No config yet — keep defaults
  }
  finally {
    loading.value = false
  }
}

async function copyToClipboard(text: string, field: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copiedField.value = field
    setTimeout(() => { copiedField.value = '' }, 2000)
  }
  catch {
    toast.error('Gagal menyalin')
  }
}

function maskValue(val: string): string {
  if (!val) return '-'
  if (val.length <= 12) return '••••••••'
  return val.slice(0, 6) + '••••••••••••' + val.slice(-4)
}

async function regenerateApiKey() {
  const ok = await confirm({
    title: 'Buat Ulang API Key',
    message: 'API key lama akan langsung nonaktif dan tidak dapat digunakan lagi. Lanjutkan?',
    confirmText: 'Buat Ulang',
    variant: 'danger',
  })
  if (!ok) return
  regeneratingKey.value = true
  try {
    const res = await api.post<{ data: ApiKeyInfo }>('/external/api-key/regenerate')
    apiKey.value = res.data
    showApiKey.value = true
    toast.success('API key berhasil dibuat ulang')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal membuat ulang API key')
  }
  finally {
    regeneratingKey.value = false
  }
}

function toggleEvent(ev: string) {
  const i = webhook.events.indexOf(ev)
  if (i >= 0) webhook.events.splice(i, 1)
  else webhook.events.push(ev)
}

async function saveWebhook() {
  if (!webhook.url) {
    toast.error('URL webhook wajib diisi')
    return
  }
  if (!webhook.events.length) {
    toast.error('Pilih minimal satu event')
    return
  }
  savingWebhook.value = true
  try {
    const res = await api.put<{ data: WebhookInfo }>('/external/webhook', {
      url: webhook.url,
      status: webhook.status,
      events: webhook.events,
    })
    const data = res.data
    if (data) {
      webhook.secret = data.secret || webhook.secret
      webhook.events = data.events || webhook.events
      webhook.status = data.status || webhook.status
    }
    toast.success('Konfigurasi webhook berhasil disimpan')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan webhook')
  }
  finally {
    savingWebhook.value = false
  }
}

async function regenerateSecret() {
  const ok = await confirm({
    title: 'Buat Ulang Secret Webhook',
    message: 'Secret lama akan nonaktif. Pastikan memperbarui secret di sistem Anda setelah dibuat ulang. Lanjutkan?',
    confirmText: 'Buat Ulang',
    variant: 'danger',
  })
  if (!ok) return
  regeneratingSecret.value = true
  try {
    const res = await api.post<{ data: WebhookInfo }>('/external/webhook/regenerate')
    if (res.data?.secret) webhook.secret = res.data.secret
    showSecret.value = true
    toast.success('Secret webhook berhasil dibuat ulang')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal membuat ulang secret')
  }
  finally {
    regeneratingSecret.value = false
  }
}

async function testWebhook() {
  if (!webhook.url) {
    toast.error('Simpan URL webhook terlebih dahulu')
    return
  }
  testingWebhook.value = true
  try {
    await api.post('/external/webhook/test')
    toast.success('Test webhook dikirim')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengirim test webhook')
  }
  finally {
    testingWebhook.value = false
  }
}

onMounted(fetchSetting)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Developer</h1>
      <p class="mt-1 text-sm text-gray-500">Kelola API key dan webhook untuk integrasi eksternal.</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-gray-200">
      <NuxtLink
        to="/developer"
        class="border-b-2 border-primary-600 px-4 py-2.5 text-sm font-semibold text-primary-600"
      >
        Konfigurasi
      </NuxtLink>
      <NuxtLink
        to="/developer/webhook-history"
        class="border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-700"
      >
        Webhook History
      </NuxtLink>
      <NuxtLink
        to="/developer/documentation"
        class="border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-700"
      >
        Dokumentasi API
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center gap-2 rounded-xl bg-white py-16 text-sm text-gray-400 shadow-sm ring-1 ring-gray-200">
      <Loader2 class="h-5 w-5 animate-spin" /> Memuat konfigurasi...
    </div>

    <template v-else>
      <!-- API Key -->
      <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <Key class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-base font-semibold text-gray-900">API Key</h2>
            <p class="mt-0.5 text-sm text-gray-500">Gunakan API key ini untuk mengautentikasi permintaan ke API.</p>

            <div class="mt-4">
              <label class="mb-1.5 block text-xs font-medium text-gray-500">Key</label>
              <div v-if="apiKey" class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div class="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <code class="min-w-0 flex-1 truncate font-mono text-sm text-gray-700">
                    {{ showApiKey ? apiKey.key : maskValue(apiKey.key) }}
                  </code>
                  <button
                    type="button"
                    class="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
                    :title="showApiKey ? 'Sembunyikan' : 'Tampilkan'"
                    @click="showApiKey = !showApiKey"
                  >
                    <EyeOff v-if="showApiKey" class="h-4 w-4" />
                    <Eye v-else class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="shrink-0 text-gray-400 transition-colors hover:text-primary-600"
                    title="Salin"
                    @click="copyToClipboard(apiKey.key, 'apikey')"
                  >
                    <Check v-if="copiedField === 'apikey'" class="h-4 w-4 text-green-500" />
                    <Copy v-else class="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  :disabled="regeneratingKey"
                  class="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="regenerateApiKey"
                >
                  <Loader2 v-if="regeneratingKey" class="h-4 w-4 animate-spin" />
                  <RefreshCw v-else class="h-4 w-4" />
                  Buat Ulang
                </button>
              </div>

              <!-- No key yet -->
              <div v-else class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p class="text-sm text-gray-400">Belum ada API key.</p>
                <button
                  type="button"
                  :disabled="regeneratingKey"
                  class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="regenerateApiKey"
                >
                  <Loader2 v-if="regeneratingKey" class="h-4 w-4 animate-spin" />
                  <Key v-else class="h-4 w-4" />
                  Buat API Key
                </button>
              </div>

              <p v-if="apiKey" class="mt-2 text-xs text-gray-400">
                Dibuat: {{ formatDateTime(apiKey.created_at) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Webhook -->
      <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <Webhook class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 class="text-base font-semibold text-gray-900">Webhook</h2>
                <p class="mt-0.5 text-sm text-gray-500">Terima notifikasi realtime saat terjadi event tertentu.</p>
              </div>
              <span
                class="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="webhook.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="webhook.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'" />
                {{ webhook.status === 'active' ? 'Aktif' : 'Nonaktif' }}
              </span>
            </div>

            <!-- URL -->
            <div class="mt-4">
              <label class="mb-1.5 block text-xs font-medium text-gray-500">URL Endpoint</label>
              <input
                v-model="webhook.url"
                type="url"
                placeholder="https://domain.com/webhook"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <!-- Status -->
            <div class="mt-4">
              <label class="mb-1.5 block text-xs font-medium text-gray-500">Status</label>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
                  :class="webhook.status === 'active'
                    ? 'border-primary-300 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'"
                  @click="webhook.status = 'active'"
                >
                  Aktif
                </button>
                <button
                  type="button"
                  class="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
                  :class="webhook.status === 'inactive'
                    ? 'border-primary-300 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'"
                  @click="webhook.status = 'inactive'"
                >
                  Nonaktif
                </button>
              </div>
            </div>

            <!-- Events -->
            <div class="mt-4">
              <label class="mb-1.5 block text-xs font-medium text-gray-500">Event</label>
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label
                  v-for="ev in AVAILABLE_EVENTS"
                  :key="ev.value"
                  class="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors"
                  :class="webhook.events.includes(ev.value)
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200 hover:bg-gray-50'"
                >
                  <input
                    type="checkbox"
                    :checked="webhook.events.includes(ev.value)"
                    class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500/20"
                    @change="toggleEvent(ev.value)"
                  />
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-gray-800">{{ ev.label }}</p>
                    <p class="font-mono text-[11px] text-gray-400">{{ ev.value }}</p>
                  </div>
                </label>
              </div>
            </div>

            <!-- Secret -->
            <div v-if="webhook.secret" class="mt-4">
              <label class="mb-1.5 block text-xs font-medium text-gray-500">Signing Secret</label>
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div class="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <code class="min-w-0 flex-1 truncate font-mono text-sm text-gray-700">
                    {{ showSecret ? webhook.secret : maskValue(webhook.secret) }}
                  </code>
                  <button
                    type="button"
                    class="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
                    :title="showSecret ? 'Sembunyikan' : 'Tampilkan'"
                    @click="showSecret = !showSecret"
                  >
                    <EyeOff v-if="showSecret" class="h-4 w-4" />
                    <Eye v-else class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="shrink-0 text-gray-400 transition-colors hover:text-primary-600"
                    title="Salin"
                    @click="copyToClipboard(webhook.secret, 'secret')"
                  >
                    <Check v-if="copiedField === 'secret'" class="h-4 w-4 text-green-500" />
                    <Copy v-else class="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  :disabled="regeneratingSecret"
                  class="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="regenerateSecret"
                >
                  <Loader2 v-if="regeneratingSecret" class="h-4 w-4 animate-spin" />
                  <RefreshCw v-else class="h-4 w-4" />
                  Buat Ulang
                </button>
              </div>
            </div>

            <!-- Actions -->
            <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                :disabled="testingWebhook || !webhook.url"
                class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                @click="testWebhook"
              >
                <Loader2 v-if="testingWebhook" class="h-4 w-4 animate-spin" />
                <Send v-else class="h-4 w-4" />
                Kirim Test
              </button>
              <button
                type="button"
                :disabled="savingWebhook"
                class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                @click="saveWebhook"
              >
                <Loader2 v-if="savingWebhook" class="h-4 w-4 animate-spin" />
                <Save v-else class="h-4 w-4" />
                Simpan
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
