<script setup lang="ts">
import {
  Loader2, Plug, Unplug, Pencil, Trash2, Eye, EyeOff, ExternalLink, Copy, Check,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Integration {
  id: string
  provider: string
  api_url: string
  api_key: string
  api_secret: string
  api_callback: string 
  status: string
  created_at: string
  updated_at: string
}

interface ProviderDef {
  provider: string
  name: string
  description: string
  category: string
  icon: string
}

const providers: ProviderDef[] = [
  { provider: 'xendit', name: 'Xendit', description: 'Payment gateway untuk bisnis Indonesia', category: 'Pembayaran', icon: '/images/brands/xendit.webp' },
  { provider: 'midtrans', name: 'Midtrans', description: 'Payment gateway untuk bisnis Indonesia', category: 'Pembayaran', icon: '/images/brands/midtrans.webp' },
  { provider: 'everpro', name: 'Everpro', description: 'Layanan multi-kurir agregator', category: 'Pengiriman', icon: '/images/brands/everpro.webp' },
  { provider: 'mengantar', name: 'Mengantar', description: 'Layanan multi-kurir agregator', category: 'Pengiriman', icon: '/images/brands/mengantar.webp' },
  { provider: 'lincah', name: 'Lincah', description: 'Layanan multi-kurir agregator', category: 'Pengiriman', icon: '/images/brands/lincah.webp' },
  { provider: 'moota', name: 'Moota', description: 'Cek mutasi rekening bank otomatis', category: 'Pembayaran', icon: '/images/brands/moota.webp' },
  { provider: 'woowa', name: 'Woowa', description: 'WhatsApp Business API gateway', category: 'Messaging', icon: '/images/brands/woowa.webp' },
  { provider: 'whatsapp', name: 'WhatsApp', description: 'Notifikasi & chat via WhatsApp', category: 'Messaging', icon: '/images/brands/whatsapp.webp' },
  { provider: 'facebook', name: 'Facebook', description: 'Integrasi katalog & iklan Facebook', category: 'Advertising', icon: '/images/brands/facebook.webp' },
]

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(true)
const integrations = ref<Integration[]>([])

async function fetchIntegrations() {
  loading.value = true
  try {
    const res = await api.get<{ data: Integration[] }>('/integrations/index')
    integrations.value = res.data || []
  } catch {
    integrations.value = []
  } finally {
    loading.value = false
  }
}

function getIntegration(provider: string): Integration | undefined {
  return integrations.value.find(i => i.provider === provider)
}

// --- Modal ---
const showModal = ref(false)
const saving = ref(false)
const currentProvider = ref<ProviderDef | null>(null)
const currentIntegration = ref<Integration | null>(null)
const showSecret = ref(false)

const form = reactive({
  provider: '',
  api_key: '',
  api_secret: '',
  api_callback: '',
  data: '',
  status: 'active',
})

function openConfig(prov: ProviderDef) {
  currentProvider.value = prov
  const existing = getIntegration(prov.provider)
  currentIntegration.value = existing || null
  showSecret.value = false
  if (existing) {
    form.provider = existing.provider
    form.api_key = existing.api_key || ''
    form.api_secret = existing.api_secret || ''
    form.api_callback = existing.api_callback || ''
    form.status = existing.status || 'active'
  } else {
    form.provider = prov.provider
    form.api_key = ''
    form.api_secret = ''
    form.api_callback = ''
    form.status = 'active'
  }
  showModal.value = true
}

async function handleSave() {
  if (!currentProvider.value) return
  saving.value = true
  try { 
    const body = {
      provider: currentProvider.value.provider,
      api_key: form.api_key,
      api_secret: form.api_secret,
      api_callback: form.api_callback, 
      status: form.status,
    }
    if (currentIntegration.value) {
      await api.put(`/integrations/${currentIntegration.value.id}`, body)
      toast.success('Integrasi berhasil diperbarui')
    } else {
      await api.post('/integrations/create', body)
      toast.success('Integrasi berhasil dibuat')
    }
    showModal.value = false
    fetchIntegrations()
  } catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan integrasi')
  } finally {
    saving.value = false
  }
}

async function handleDisconnect(prov: ProviderDef) {
  const existing = getIntegration(prov.provider)
  if (!existing) return
  const ok = await confirm({
    title: 'Putuskan Integrasi',
    message: `Yakin ingin memutuskan integrasi "${prov.name}"?`,
    confirmText: 'Putuskan',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/integrations/${existing.id}`)
    toast.success(`Integrasi ${prov.name} berhasil diputus`)
    fetchIntegrations()
  } catch (err: any) {
    toast.error(err.message || 'Gagal memutus integrasi')
  }
}

const categoryColors: Record<string, string> = {
  // Fulfillment: 'bg-blue-50 text-blue-700 ring-blue-200',
  // Pengiriman: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  // Marketplace: 'bg-violet-50 text-violet-700 ring-violet-200',
  // Pembayaran: 'bg-amber-50 text-amber-700 ring-amber-200',
  // Komunikasi: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  // Marketing: 'bg-pink-50 text-pink-700 ring-pink-200',
}

// --- View detail modal ---
const showViewModal = ref(false)
const viewProvider = ref<ProviderDef | null>(null)
const viewIntegration = ref<Integration | null>(null)
const copiedField = ref('')

function maskValue(val: string): string {
  if (!val) return '-'
  if (val.length <= 8) return '••••••••'
  return val.slice(0, 4) + '••••••••' + val.slice(-4)
}

function getWebhookUrl(integration: Integration): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/api/integrations/webhook/${integration.provider}/${integration.id}`
}

async function copyToClipboard(text: string, field: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedField.value = field
    setTimeout(() => { copiedField.value = '' }, 2000)
  } catch {
    toast.error('Gagal menyalin')
  }
}

function openView(prov: ProviderDef) {
  const existing = getIntegration(prov.provider)
  if (!existing) return
  viewProvider.value = prov
  viewIntegration.value = existing
  copiedField.value = ''
  showViewModal.value = true
}

onMounted(() => fetchIntegrations())
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Integrasi</h1>
      <p class="mt-1 text-sm text-gray-500">Hubungkan dengan layanan pihak ketiga untuk otomatisasi bisnis.</p>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div v-for="i in 4" :key="i" class="animate-pulse rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <div class="flex items-start gap-4">
          <div class="h-12 w-12 rounded-lg bg-gray-200" />
          <div class="flex-1 space-y-2">
            <div class="h-5 w-32 rounded bg-gray-200" />
            <div class="h-4 w-48 rounded bg-gray-100" />
            <div class="h-5 w-20 rounded-full bg-gray-100" />
          </div>
          <div class="h-8 w-20 rounded-lg bg-gray-100" />
        </div>
      </div>
    </div>

    <!-- Provider list -->
    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div
        v-for="prov in providers"
        :key="prov.provider"
        class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md"
      >
        <div class="flex items-start gap-3 sm:gap-4">
          <!-- Icon -->
          <div class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50 ring-1 ring-gray-200">
            <img :src="prov.icon" :alt="prov.name" class="h-8 w-8 object-contain" />
          </div>

          <!-- Info -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-semibold text-gray-900">{{ prov.name }}</h3>
              <span
                v-if="getIntegration(prov.provider)"
                class="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200"
              >
                <Plug class="h-3 w-3" />
                Terhubung
              </span>
            </div>
            <p class="mt-0.5 text-xs text-gray-500">{{ prov.description }}</p>
            <span
              class="mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1"
              :class="categoryColors[prov.category] || 'bg-gray-50 text-gray-600 ring-gray-200'"
            >
              {{ prov.category }}
            </span>
          </div>

          <!-- Actions -->
          <div class="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <template v-if="getIntegration(prov.provider)">
              <button
                type="button"
                class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                title="Lihat Detail"
                @click="openView(prov)"
              >
                <Eye class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                title="Edit"
                @click="openConfig(prov)"
              >
                <Pencil class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                title="Putuskan"
                @click="handleDisconnect(prov)"
              >
                <Unplug class="h-4 w-4" />
              </button>
            </template>
            <button
              v-else
              type="button"
              class="rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-100"
              @click="openConfig(prov)"
            >
              Hubungkan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Config Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[5vh]" @mousedown.self="showModal = false">
        <div class="flex w-full max-w-lg flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
          <!-- Header -->
          <div class="flex shrink-0 items-center gap-3 border-b border-gray-100 px-6 py-4">
            <div v-if="currentProvider" class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 ring-1 ring-gray-200">
              <img :src="currentProvider.icon" :alt="currentProvider.name" class="h-7 w-7 object-contain" />
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900">
                {{ currentIntegration ? 'Edit' : 'Hubungkan' }} {{ currentProvider?.name }}
              </h2>
              <p class="text-sm text-gray-500">{{ currentProvider?.description }}</p>
            </div>
          </div>

          <!-- Scrollable body -->
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <div class="space-y-4">
            <!-- API Key -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">API Key <span class="text-red-500">*</span></label>
              <input v-model="form.api_key" type="text" class="form-input" placeholder="Masukkan API Key" />
            </div>

            <!-- API Secret -->
            <div v-if="form.provider=='everpro'">
              <label class="mb-1.5 block text-sm font-medium text-gray-700">API Secret</label>
              <div class="relative">
                <input
                  v-model="form.api_secret"
                  :type="showSecret ? 'text' : 'password'"
                  class="form-input pr-10"
                  placeholder="Masukkan API Secret"
                />
                <button
                  type="button"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  @click="showSecret = !showSecret"
                >
                  <EyeOff v-if="showSecret" class="h-4 w-4" />
                  <Eye v-else class="h-4 w-4" />
                </button>
              </div>
            </div>

            <!-- API Callback -->
            <div v-if="form.provider=='everpro'">
              <label class="mb-1.5 block text-sm font-medium text-gray-700">API Callback</label>
              <div class="relative">
                <input v-model="form.api_callback" type="url" class="form-input pr-10" placeholder="" />
                <ExternalLink class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
              </div>
            </div>
 

            <!-- Status -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
              <select v-model="form.status" class="form-input">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              @click="showModal = false"
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="saving || !form.api_key"
              class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleSave"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- View Detail Modal -->
    <Teleport to="body">
      <div v-if="showViewModal && viewIntegration && viewProvider" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[5vh]" @mousedown.self="showViewModal = false">
        <div class="flex w-full max-w-lg flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
          <!-- Header -->
          <div class="flex shrink-0 items-center gap-3 border-b border-gray-100 px-6 py-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 ring-1 ring-gray-200">
              <img :src="viewProvider.icon" :alt="viewProvider.name" class="h-7 w-7 object-contain" />
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Detail {{ viewProvider.name }}</h2>
              <p class="text-sm text-gray-500">{{ viewProvider.description }}</p>
            </div>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <div class="space-y-4">
              <!-- Status -->
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-500">Status:</span>
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1"
                  :class="viewIntegration.status === 'active' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-gray-50 text-gray-600 ring-gray-200'"
                >
                  {{ viewIntegration.status === 'active' ? 'Active' : 'Inactive' }}
                </span>
              </div>

              <!-- API Key -->
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-500">API Key</label>
                <div class="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 font-mono text-sm text-gray-700">
                  <span class="flex-1 truncate">{{ maskValue(viewIntegration.api_key) }}</span>
                </div>
              </div>

              <!-- API Secret -->
              <div v-if="viewIntegration.api_secret">
                <label class="mb-1 block text-xs font-medium text-gray-500">API Secret</label>
                <div class="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 font-mono text-sm text-gray-700">
                  <span class="flex-1 truncate">{{ maskValue(viewIntegration.api_secret) }}</span>
                </div>
              </div>

              <!-- API Callback -->
              <div v-if="viewIntegration.api_callback">
                <label class="mb-1 block text-xs font-medium text-gray-500">API Callback</label>
                <div class="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 font-mono text-sm text-gray-700">
                  <span class="flex-1 truncate">{{ viewIntegration.api_callback }}</span>
                  <button type="button" class="shrink-0 text-gray-400 hover:text-gray-600" @click="copyToClipboard(viewIntegration.api_callback, 'callback')">
                    <Check v-if="copiedField === 'callback'" class="h-4 w-4 text-green-500" />
                    <Copy v-else class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <!-- Webhook URL -->
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-500">Webhook URL</label>
                <div class="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5 font-mono text-sm text-blue-800 ring-1 ring-blue-200">
                  <span class="flex-1 truncate">{{ getWebhookUrl(viewIntegration) }}</span>
                  <button type="button" class="shrink-0 text-blue-400 hover:text-blue-600" @click="copyToClipboard(getWebhookUrl(viewIntegration), 'webhook')">
                    <Check v-if="copiedField === 'webhook'" class="h-4 w-4 text-green-500" />
                    <Copy v-else class="h-4 w-4" />
                  </button>
                </div>
                <p class="mt-1 text-xs text-gray-400">Gunakan URL ini untuk menerima notifikasi dari {{ viewProvider.name }}.</p>
              </div>

              <!-- Timestamps -->
              <div class="flex gap-6 border-t border-gray-100 pt-3 text-xs text-gray-400">
                <span>Dibuat: {{ new Date(viewIntegration.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }}</span>
                <span>Diperbarui: {{ new Date(viewIntegration.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }}</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex shrink-0 justify-end border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              @click="showViewModal = false"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.form-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
select.form-input {
  @apply appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%221.5%22%3E%3Cpath%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_8px_center] bg-no-repeat pr-9;
}
</style>
