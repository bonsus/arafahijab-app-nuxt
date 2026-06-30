<script setup lang="ts">
import {
  Boxes, RefreshCw, Search, X, Inbox, Hash, Package, Store as StoreIcon,
} from 'lucide-vue-next'
import { formatDateTime } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

interface VariantOption {
  name: string
  value: string
}

interface StockHistoryItem {
  id: string
  store_id: string
  source: string
  product_id: string
  product_name: string
  sku_id: string
  sku: string
  variant: VariantOption[] | null
  stock: number
  mp_product_id: string
  mp_product_name: string
  mp_sku_id: string
  mp_sku: string
  mp_variants: VariantOption[] | null
  status: string
  error: string
  created_at: string
}

interface StockHistoryList {
  data: StockHistoryItem[]
  page: number
  per_page: number
  total_page: number
  total: number
}

interface StoreOption {
  id: string
  shop_name: string
  source?: string
}

const api = useApi()
const toast = useToast()

// ---- List state ----
const items = ref<StockHistoryItem[]>([])
const listLoading = ref(true)
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

const fSource = ref('')
const fStatus = ref('')
const fStore = ref('')
const fSearch = ref('')
const fDate = ref({ from: '', to: '' })

const stores = ref<StoreOption[]>([])

const sourceOptions = [
  { value: '', label: 'Semua Source' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'lazada', label: 'Lazada' },
]

const statusOptions = [
  { value: '', label: 'Semua Status' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
]

const storeOptions = computed(() => [
  { value: '', label: 'Semua Toko' },
  ...stores.value.map(s => ({ value: s.id, label: s.shop_name })),
])

const statusConfig: Record<string, { label: string; cls: string }> = {
  success: { label: 'Success', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  failed: { label: 'Failed', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
}

async function fetchStores() {
  try {
    const res = await api.get<{ data: StoreOption[] | null }>('/stores/public/index')
    stores.value = res.data || []
  }
  catch {
    stores.value = []
  }
}

async function fetchList() {
  listLoading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (fSource.value) params.source = fSource.value
    if (fStatus.value) params.status = fStatus.value
    if (fStore.value) params.store_id = fStore.value
    if (fSearch.value) params.search = fSearch.value
    if (fDate.value.from) params.from = fDate.value.from
    if (fDate.value.to) params.to = fDate.value.to

    const res = await api.get<{ data: StockHistoryList }>('/worker/stock-histories', params)
    items.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch (e: any) {
    items.value = []
    toast.error(e?.message || 'Gagal memuat history update stock')
  }
  finally {
    listLoading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchList() }, 350)
}

function applyFilter() {
  page.value = 1
  fetchList()
}

function clearFilters() {
  fSource.value = ''
  fStatus.value = ''
  fStore.value = ''
  fSearch.value = ''
  fDate.value = { from: '', to: '' }
  applyFilter()
}

const hasActiveFilter = computed(() =>
  !!(fSource.value || fStatus.value || fStore.value || fSearch.value || fDate.value.from || fDate.value.to),
)

function onPageChange(p: number) {
  page.value = p
  fetchList()
}

function onPerPageChange(pp: number) {
  perPage.value = pp
  page.value = 1
  fetchList()
}

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr).getTime()
  if (Number.isNaN(d)) return '-'
  const diff = Math.floor((Date.now() - d) / 1000)
  if (diff < 5) return 'baru saja'
  if (diff < 60) return `${diff} dtk lalu`
  const m = Math.floor(diff / 60)
  if (m < 60) return `${m} mnt lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  const days = Math.floor(h / 24)
  return `${days} hari lalu`
}

function variantText(v: VariantOption[] | null): string {
  if (!Array.isArray(v)) return ''
  return v.map(o => o?.value).filter(Boolean).join(', ')
}

// ---- Detail modal ----
const selectedDetail = ref<StockHistoryItem | null>(null)
const showDetail = ref(false)

function openDetail(item: StockHistoryItem) {
  selectedDetail.value = item
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
  selectedDetail.value = null
}

onMounted(() => {
  fetchStores()
  fetchList()
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Boxes class="h-5 w-5 text-primary-600" />
          History Update Stok Marketplace
        </h1>
        <p class="mt-0.5 text-sm text-gray-500">Riwayat push stok internal ke marketplace (Shopee/TikTok/Lazada)</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
        :disabled="listLoading"
        @click="fetchList"
      >
        <RefreshCw :class="['h-3.5 w-3.5', listLoading && 'animate-spin']" />
        Refresh
      </button>
    </div>

    <!-- Records -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
        <div class="relative min-w-[240px] flex-1">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="fSearch"
            type="text"
            placeholder="Cari sku / nama produk / mp sku"
            class="w-full rounded-lg border border-gray-300 py-1.5 pl-10 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
            @input="onSearch"
          />
          <button
            v-if="fSearch"
            type="button"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
            @click="fSearch = ''; applyFilter()"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>

        <div class="w-auto">
          <AppFilterSelect v-model="fSource" :options="sourceOptions" placeholder="Source" :searchable="false" @update:model-value="applyFilter" />
        </div>
        <div class="w-auto">
          <AppFilterSelect v-model="fStatus" :options="statusOptions" placeholder="Status" :searchable="false" @update:model-value="applyFilter" />
        </div>
        <div class="w-auto">
          <AppFilterSelect v-model="fStore" :options="storeOptions" placeholder="Toko" @update:model-value="applyFilter" />
        </div>

        <div class="w-auto">
          <AppDateRangePicker v-model="fDate" @update:model-value="applyFilter" />
        </div>

        <button
          v-if="hasActiveFilter"
          type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          @click="clearFilters"
        >
          <X class="h-3.5 w-3.5 text-red-500" /> Reset
        </button>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1000px] text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
              <th class="px-4 py-3 text-left">Source</th>
              <th class="px-4 py-3 text-left">Produk Internal</th>
              <th class="px-4 py-3 text-center">Stok</th>
              <th class="px-4 py-3 text-left">Produk Marketplace</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3 text-left">Waktu</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody v-if="listLoading">
            <tr v-for="i in 8" :key="i" class="border-b border-gray-100">
              <td v-for="j in 7" :key="j" class="px-4 py-3">
                <div class="h-4 animate-pulse rounded bg-gray-200" :class="j === 2 || j === 4 ? 'w-40' : 'w-20'" />
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="!items.length">
            <tr>
              <td colspan="7" class="px-4 py-16 text-center">
                <Inbox class="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p class="text-sm text-gray-500">Tidak ada history update stok</p>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr
              v-for="item in items"
              :key="item.id"
              class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5">
                  <img :src="`/images/platform/${item.source}.svg`" alt="" class="h-4 w-4 object-contain" @error="($event.target as HTMLImageElement).style.display = 'none'" />
                  <span class="font-medium capitalize text-gray-800">{{ item.source }}</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <p class="max-w-[220px] truncate font-medium text-gray-800" :title="item.product_name">{{ item.product_name || '-' }}</p>
                <p class="font-mono text-xs text-gray-500">{{ item.sku || '-' }}</p>
                <p v-if="variantText(item.variant)" class="text-xs text-gray-400">{{ variantText(item.variant) }}</p>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex items-center gap-1 font-semibold text-gray-900">
                  <Package class="h-3.5 w-3.5 text-gray-400" />
                  {{ item.stock?.toLocaleString() ?? 0 }}
                </span>
              </td>
              <td class="px-4 py-3">
                <p class="max-w-[220px] truncate text-gray-700" :title="item.mp_product_name">{{ item.mp_product_name || '-' }}</p>
                <p class="font-mono text-xs text-gray-500">{{ item.mp_sku || '-' }}</p>
                <p v-if="variantText(item.mp_variants)" class="text-xs text-gray-400">{{ variantText(item.mp_variants) }}</p>
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="statusConfig[item.status]?.cls || 'bg-gray-100 text-gray-600'"
                >
                  {{ statusConfig[item.status]?.label || item.status }}
                </span>
                <p v-if="item.error" class="mt-1 max-w-[220px] truncate text-xs text-red-500" :title="item.error">
                  {{ item.error }}
                </p>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-gray-600">
                {{ formatDateTime(item.created_at) }}
                <p class="text-xs text-gray-400">{{ relativeTime(item.created_at) }}</p>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Detail"
                    @click="openDetail(item)"
                  >
                    <Search class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <AppPagination
        v-if="!listLoading && totalPage > 0"
        :page="page"
        :total-page="totalPage"
        :total="total"
        :per-page="perPage"
        :loading="listLoading"
        @update:page="onPageChange"
        @update:per-page="onPerPageChange"
      />
    </div>

    <!-- Detail modal -->
    <Teleport to="body">
      <div
        v-if="showDetail && selectedDetail"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        @click.self="closeDetail"
      >
        <div class="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Hash class="h-4 w-4 text-gray-400" /> Detail Update Stok
            </h3>
            <button class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="closeDetail">
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="max-h-[70vh] overflow-y-auto px-5 py-4">
            <dl class="grid grid-cols-3 gap-y-3 text-sm">
              <dt class="text-gray-400">ID</dt>
              <dd class="col-span-2 break-all font-mono text-xs text-gray-800">{{ selectedDetail.id }}</dd>

              <dt class="text-gray-400">Source</dt>
              <dd class="col-span-2 capitalize text-gray-800">{{ selectedDetail.source }}</dd>

              <dt class="text-gray-400">Status</dt>
              <dd class="col-span-2">
                <span
                  class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="statusConfig[selectedDetail.status]?.cls || 'bg-gray-100 text-gray-600'"
                >
                  {{ statusConfig[selectedDetail.status]?.label || selectedDetail.status }}
                </span>
              </dd>

              <dt class="text-gray-400">Stok Dikirim</dt>
              <dd class="col-span-2 font-semibold text-gray-900">{{ selectedDetail.stock?.toLocaleString() ?? 0 }}</dd>

              <dt class="col-span-3 mt-1 border-t border-gray-100 pt-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Produk Internal</dt>
              <dt class="text-gray-400">Nama</dt>
              <dd class="col-span-2 text-gray-800">{{ selectedDetail.product_name || '-' }}</dd>
              <dt class="text-gray-400">SKU</dt>
              <dd class="col-span-2 font-mono text-xs text-gray-800">{{ selectedDetail.sku || '-' }}</dd>
              <dt class="text-gray-400">Varian</dt>
              <dd class="col-span-2 text-gray-800">{{ variantText(selectedDetail.variant) || '-' }}</dd>
              <dt class="text-gray-400">Product ID</dt>
              <dd class="col-span-2 break-all font-mono text-xs text-gray-800">{{ selectedDetail.product_id || '-' }}</dd>
              <dt class="text-gray-400">SKU ID</dt>
              <dd class="col-span-2 break-all font-mono text-xs text-gray-800">{{ selectedDetail.sku_id || '-' }}</dd>

              <dt class="col-span-3 mt-1 border-t border-gray-100 pt-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Produk Marketplace</dt>
              <dt class="text-gray-400">Nama</dt>
              <dd class="col-span-2 text-gray-800">{{ selectedDetail.mp_product_name || '-' }}</dd>
              <dt class="text-gray-400">MP SKU</dt>
              <dd class="col-span-2 font-mono text-xs text-gray-800">{{ selectedDetail.mp_sku || '-' }}</dd>
              <dt class="text-gray-400">Varian</dt>
              <dd class="col-span-2 text-gray-800">{{ variantText(selectedDetail.mp_variants) || '-' }}</dd>
              <dt class="text-gray-400">MP Product ID</dt>
              <dd class="col-span-2 break-all font-mono text-xs text-gray-800">{{ selectedDetail.mp_product_id || '-' }}</dd>
              <dt class="text-gray-400">MP SKU ID</dt>
              <dd class="col-span-2 break-all font-mono text-xs text-gray-800">{{ selectedDetail.mp_sku_id || '-' }}</dd>

              <dt class="col-span-3 mt-1 border-t border-gray-100 pt-3 text-gray-400">Waktu</dt>
              <dd class="col-span-3 -mt-2 text-gray-800">{{ formatDateTime(selectedDetail.created_at) }}</dd>

              <template v-if="selectedDetail.error">
                <dt class="text-gray-400">Error</dt>
                <dd class="col-span-2 rounded-md bg-red-50 px-2 py-1 font-mono text-xs text-red-600">{{ selectedDetail.error }}</dd>
              </template>
            </dl>
          </div>

          <div class="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
            <button
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="closeDetail"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
