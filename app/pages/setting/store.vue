<script setup lang="ts">
import { Plus, Search, Pencil, Trash2, Store, ExternalLink, ToggleLeft, ToggleRight, Loader2, Globe, ShoppingBag, Tag, RefreshCw } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface StoreItem {
  id: string
  source: string
  url: string
  shop_id: string
  shop_name: string
  shop_region: string
  status: string
  created_at: string
  updated_at: string
}

interface PaginatedStores {
  data: StoreItem[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

// ─── List ──────────────────────────────────────────────────────────────────────
const stores = ref<StoreItem[]>([])
const loading = ref(true)
const searchQuery = ref('')
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

async function fetchStores() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (searchQuery.value) params.search = searchQuery.value
    const res = await api.get<{ data: PaginatedStores }>('/stores/index', params)
    stores.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch {
    stores.value = []
  }
  finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchStores()
  }, 300)
}

function goPage(p: number) {
  if (p < 1 || p > totalPage.value) return
  page.value = p
  fetchStores()
}

// ─── Platform picker ──────────────────────────────────────────────────────────
const showPlatformPicker = ref(false)
const authorizingPlatform = ref<string | null>(null)

const platforms = [
  {
    value: 'internal',
    label: 'Website',
    description: 'Toko manual / website sendiri',
    bgClass: 'bg-primary-50 hover:bg-primary-100 ring-primary-200',
    textClass: 'text-primary-700',
    icon: Globe,
  },
  {
    value: 'tiktok',
    label: 'TikTok Shop',
    description: 'Hubungkan toko TikTok',
    bgClass: 'bg-gray-900 hover:bg-black ring-gray-700',
    textClass: 'text-white',
    icon: ShoppingBag,
  },
  {
    value: 'shopee',
    label: 'Shopee',
    description: 'Hubungkan toko Shopee',
    bgClass: 'bg-orange-50 hover:bg-orange-100 ring-orange-200',
    textClass: 'text-orange-700',
    icon: ShoppingBag,
  },
  {
    value: 'lazada',
    label: 'Lazada',
    description: 'Hubungkan toko Lazada',
    bgClass: 'bg-blue-50 hover:bg-blue-100 ring-blue-200',
    textClass: 'text-blue-700',
    icon: Tag,
  },
]

async function selectPlatform(platform: string) {
  if (platform === 'internal') {
    showPlatformPicker.value = false
    openCreate()
    return
  }
  authorizingPlatform.value = platform
  try {
    const res = await api.get<{ data: string }>(`/stores/${platform}/authorize-url`)
    const url = res.data
    if (!url) throw new Error('URL tidak tersedia')
    window.location.href = url
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mendapatkan link otorisasi')
    authorizingPlatform.value = null
  }
}

const showModal = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)

const form = reactive({
  source: 'website',
  shop_name: '',
  url: '',
  status: 'active',
  wallet_id: '',
})

const sourceOptions = [
  { value: 'internal', label: 'Internal' },
  { value: 'tiktok', label: 'TikTok Shop' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'website', label: 'Website' },
]

function openCreate() {
  editingId.value = null
  form.source = 'website'
  form.shop_name = ''
  form.url = ''
  form.status = 'active'
  form.wallet_id = ''
  showModal.value = true
}

function openEdit(s: StoreItem) {
  editingId.value = s.id 
  form.shop_name = s.shop_name
  form.url = s.url || ''
  form.status = s.status
  form.wallet_id = ''
  showModal.value = true
}

async function handleSave() {
  if (!form.shop_name.trim()) {
    toast.error('Nama toko wajib diisi')
    return
  }
  saving.value = true
  try {
    const payload: Record<string, string> = {
      source: form.source,
      shop_name: form.shop_name.trim(),
      url: form.url,
      status: form.status,
    }
    if (form.wallet_id.trim()) payload.wallet_id = form.wallet_id.trim()

    if (editingId.value) {
      await api.put(`/stores/${editingId.value}`, payload)
      toast.success('Toko berhasil diperbarui')
    }
    else {
      await api.post('/stores/create', payload)
      toast.success('Toko berhasil ditambahkan')
    }
    showModal.value = false
    fetchStores()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan toko')
  }
  finally {
    saving.value = false
  }
}

// ─── Toggle status ─────────────────────────────────────────────────────────────
const togglingIds = ref<Set<string>>(new Set())

async function toggleStatus(s: StoreItem) {
  togglingIds.value.add(s.id)
  const newStatus = s.status === 'active' ? 'inactive' : 'active'
  try {
    await api.put(`/stores/${s.id}/update-status`, { status: newStatus })
    s.status = newStatus
    toast.success(`Toko berhasil di${newStatus === 'active' ? 'aktifkan' : 'nonaktifkan'}`)
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status')
  }
  finally {
    togglingIds.value.delete(s.id)
  }
}

// ─── Refresh token ─────────────────────────────────────────────────────────────
const refreshingIds = ref<Set<string>>(new Set())
const oauthSources = ['shopee', 'lazada', 'tiktok']

async function refreshToken(s: StoreItem) {
  refreshingIds.value.add(s.id)
  try {
    await api.post(`/stores/${s.source}/refresh-token?store_id=${encodeURIComponent(s.id)}`, {})
    toast.success('Token berhasil diperbarui')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memperbarui token')
  }
  finally {
    refreshingIds.value.delete(s.id)
  }
}

// ─── Delete ────────────────────────────────────────────────────────────────────
async function handleDelete(s: StoreItem) {
  const ok = await confirm({
    title: 'Hapus Toko',
    message: `Yakin ingin menghapus toko "${s.shop_name}"? Tindakan ini tidak dapat dibatalkan.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/stores/${s.id}`)
    toast.success('Toko berhasil dihapus')
    fetchStores()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus toko')
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const sourceConfig: Record<string, { label: string; color: string }> = {
  internal: { label: 'Internal', color: 'bg-gray-100 text-gray-700 ring-gray-200' },
  tiktok: { label: 'TikTok', color: 'bg-pink-50 text-pink-700 ring-pink-200' },
  shopee: { label: 'Shopee', color: 'bg-orange-50 text-orange-700 ring-orange-200' },
  lazada: { label: 'Lazada', color: 'bg-blue-50 text-blue-700 ring-blue-200' },
  website: { label: 'Website', color: 'bg-violet-50 text-violet-700 ring-violet-200' },
}

onMounted(() => fetchStores())
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Toko</h1>
        <p class="mt-1 text-sm text-gray-500">Kelola toko dan kanal penjualan Anda.</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        @click="showPlatformPicker = true"
      >
        <Plus class="h-4 w-4" />
        Tambah Toko
      </button>
    </div>
 

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 3" :key="i" class="animate-pulse rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-lg bg-gray-200" />
          <div class="flex-1 space-y-2">
            <div class="h-4 w-32 rounded bg-gray-200" />
            <div class="h-3 w-20 rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!stores.length" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <Store class="mx-auto h-12 w-12 text-gray-300" />
      <h3 class="mt-3 text-sm font-semibold text-gray-900">Belum ada toko</h3>
      <p class="mt-1 text-sm text-gray-500">Tambahkan toko pertama Anda untuk mulai berjualan.</p>
      <button
        type="button"
        class="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        @click="showPlatformPicker = true"
      >
        <Plus class="h-4 w-4" />
        Tambah Toko
      </button>
    </div>

    <!-- Store cards -->
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="s in stores"
        :key="s.id"
        class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md"
      >
        <div class="p-5">
          <div class="flex items-start gap-3">
            <!-- Source logo placeholder -->
            <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50 ring-1 ring-gray-200">
              <img
                :src="`/images/platform/${s.source}.svg`"
                :alt="s.source"
                class="h-6 w-6 object-contain"
                @error="($event.target as HTMLImageElement).style.display='none'"
              />
              <Store v-if="s.source === 'internal'" class="h-5 w-5 text-gray-400" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="truncate text-sm font-semibold text-gray-900">{{ s.shop_name }}</h3>
              <div class="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1"
                  :class="sourceConfig[s.source]?.color || 'bg-gray-100 text-gray-600 ring-gray-200'"
                >
                  {{ sourceConfig[s.source]?.label || s.source }}
                </span>
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1"
                  :class="s.status === 'active' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-gray-50 text-gray-500 ring-gray-200'"
                >
                  {{ s.status === 'active' ? 'Aktif' : 'Nonaktif' }}
                </span>
              </div>
            </div>
          </div>

          <!-- URL -->
          <a
            v-if="s.url"
            :href="s.url"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-3 flex items-center gap-1 truncate text-[11px] text-gray-400 hover:text-primary-600"
          >
            <ExternalLink class="h-3 w-3 shrink-0" />
            {{ s.url }}
          </a>

          <!-- Actions -->
          <div class="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
            <button
              type="button"
              class="flex items-center gap-1.5 transition-colors disabled:opacity-50"
              :disabled="togglingIds.has(s.id)"
              @click="toggleStatus(s)"
            >
              <ToggleRight v-if="s.status === 'active'" class="h-5 w-5 text-green-600" />
              <ToggleLeft v-else class="h-5 w-5 text-gray-400" />
              <span class="text-xs" :class="s.status === 'active' ? 'text-green-600' : 'text-gray-400'">
                {{ s.status === 'active' ? 'Aktif' : 'Nonaktif' }}
              </span>
            </button>
            <div class="flex items-center gap-1">
              <button
                v-if="oauthSources.includes(s.source)"
                type="button"
                class="rounded-lg p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600 disabled:opacity-50"
                :disabled="refreshingIds.has(s.id)"
                title="Refresh token"
                @click="refreshToken(s)"
              >
                <RefreshCw class="h-4 w-4" :class="refreshingIds.has(s.id) ? 'animate-spin' : ''" />
              </button>
              <button
                type="button"
                class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                @click="openEdit(s)"
              >
                <Pencil class="h-4 w-4" />
              </button>
              <!-- <button
                type="button"
                class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                @click="handleDelete(s)"
              >
                <Trash2 class="h-4 w-4" />
              </button> -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <AppPagination
      v-if="!loading && totalPage > 1"
      :page="page"
      :total-page="totalPage"
      :total="total"
      :per-page="perPage"
      @update:page="goPage"
    />

    <!-- Summary -->
    <div v-if="!loading && stores.length > 0" class="text-xs text-gray-400">
      Total {{ total }} toko
    </div>
  </div>

  <!-- Platform Picker -->
  <Teleport to="body">
    <div v-if="showPlatformPicker" class="fixed inset-0 z-50 overflow-y-auto bg-black/50">
      <div class="flex min-h-full items-center justify-center p-4" @click.self="showPlatformPicker = false">
        <div class="w-full max-w-sm rounded-xl bg-white shadow-xl">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h3 class="text-base font-semibold text-gray-900">Pilih Platform</h3>
              <p class="mt-0.5 text-xs text-gray-500">Pilih platform toko yang ingin dihubungkan</p>
            </div>
            <button type="button" class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" @click="showPlatformPicker = false">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Platform grid -->
          <div class="grid grid-cols-2 gap-4 p-8">
            <button
              v-for="p in platforms"
              :key="p.value"
              type="button"
              :disabled="authorizingPlatform !== null"
              class="flex flex-col items-center gap-2 rounded-xl p-4 ring-1 transition-all disabled:opacity-60"
              :class="p.bgClass"
              @click="selectPlatform(p.value)"
            >
              <div v-if="authorizingPlatform === p.value" class="flex h-8 w-8 items-center justify-center">
                <Loader2 class="h-5 w-5 animate-spin" :class="p.textClass" />
              </div>
              <component :is="p.icon" v-else class="h-8 w-8" :class="p.textClass" />
              <div class="text-center">
                <p class="text-sm font-semibold" :class="p.textClass">{{ p.label }}</p>
                <p class="mt-0.5 text-[10px] leading-snug" :class="p.value === 'tiktok' ? 'text-gray-300' : 'text-gray-500'">{{ p.description }}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Modal: Create / Edit -->
  <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 z-50 overflow-y-auto bg-black/50">
      <div class="flex min-h-full items-center justify-center p-4" @click.self="showModal = false">
        <div class="w-full max-w-md rounded-xl bg-white shadow-xl">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 class="text-base font-semibold text-gray-900">
              {{ editingId ? 'Edit Toko' : 'Tambah Toko' }}
            </h3>
            <button type="button" class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" @click="showModal = false">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="space-y-4 px-5 py-4"> 

            <!-- Shop Name -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">
                Nama Toko <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.shop_name"
                type="text"
                placeholder="Masukkan nama toko"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <!-- URL -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">URL Toko</label>
              <input
                v-model="form.url"
                type="url"
                placeholder="https://..."
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <!-- Status -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
              <select
                v-model="form.status"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
              @click="showModal = false"
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="saving"
              class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              @click="handleSave"
            >
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              {{ editingId ? 'Simpan Perubahan' : 'Tambah Toko' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
