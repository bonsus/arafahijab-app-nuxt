<script setup lang="ts">
import {
  ArrowLeft, Package, Layers, BarChart3, DollarSign,
  RefreshCw, TrendingUp, TrendingDown,
  MapPin, History, ShoppingCart, Inbox,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Category { id: string; name: string }
interface LocationRef { id: string; code: string; name?: string }
interface WarehouseRef { id: string; name: string }

interface Sku {
  id: string
  sku: string
  status: string
  variants: { name: string; value: string }[]
  stock_warehouse: number
  stock_locked: number
  stock_available: number
  stock_purchase_orders: number
  stock_purchase_receipts: number
  average_price: string
  total: number
}

interface Product {
  id: string
  name: string
  short_description: string
  status: string
  thumbnail: string
  stock_warehouse: number
  stock_locked: number
  stock_available: number
  stock_purchase_orders: number
  stock_purchase_receipts: number
  average_price: string
  category: Category | null
  skus: Sku[] | null
}

interface StockFifo {
  id: string
  sku_id: string
  sku: string
  variants: { name: string; value: string }[]
  stock_in: number
  stock_out: number
  stock_balance: number
  price: string
  total: string
  created_at: string
  updated_at: string
  zone: LocationRef | null
  rack: LocationRef | null
  bin: LocationRef | null
  warehouse: WarehouseRef | null
}

interface StockMovement {
  id: string
  sku_id: string
  sku: string
  variants: { name: string; value: string }[]
  stock_change: number
  price: string
  reference_type: string
  reference_id: string
  created_at: string
  zone: LocationRef | null
  rack: LocationRef | null
  bin: LocationRef | null
  warehouse: WarehouseRef | null
}

interface Paginated<T> {
  data: T[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const route = useRoute()
const productId = computed(() => route.params.id as string)

const loadingProduct = ref(true)
const product = ref<Product | null>(null)
const filterSkuWarehouseIds = ref<string[]>([])

const activeTab = ref<'sku' | 'fifo' | 'movements'>('sku')

// ── FIFO ────────────────────────────────────────────────────────────────────
const loadingFifo = ref(false)
const fifos = ref<StockFifo[]>([])
const fifoPage = ref(1)
const fifoPerPage = ref(20)
const fifoTotalPage = ref(1)
const fifoTotal = ref(0)
const fifoFilterSkuId = ref<string[]>([])
const fifoFilterWarehouseId = ref<string[]>([])
const fifoFilterType = ref<string[]>([])

// ── Movements ────────────────────────────────────────────────────────────────
const loadingMov = ref(false)
const movements = ref<StockMovement[]>([])
const movPage = ref(1)
const movPerPage = ref(20)
const movTotalPage = ref(1)
const movTotal = ref(0)
const movFilterSkuId = ref<string[]>([])
const movFilterWarehouseId = ref<string[]>([])
const movFilterType = ref<string[]>([])
const movFilterDate = ref({ from: '', to: '' })

// ── Options ──────────────────────────────────────────────────────────────────
const warehouses = ref<{ id: string; name: string }[]>([])
const loadingWarehouses = ref(false)

const skuOptions = computed(() =>
  (product.value?.skus || []).map(s => ({
    value: s.id,
    label: s.sku + (s.variants?.map(v => ` ${v.value}`).join('') || ''),
  })),
)
const warehouseOptions = computed(() =>
  warehouses.value.map(w => ({ value: w.id, label: w.name })),
)

const fifoTypeOptions = [
  { value: 'stock_not_empty', label: 'Ada Sisa' },
  { value: 'stock_empty', label: 'Habis' },
]
const movTypeOptions = [
  { value: 'stock_in', label: 'Stok Masuk' },
  { value: 'stock_out', label: 'Stok Keluar' },
]

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchProduct() {
  loadingProduct.value = true
  try {
    const params: Record<string, string> = {}
    if (filterSkuWarehouseIds.value.length)
      params.warehouse_id = filterSkuWarehouseIds.value.join(',')
    const res = await api.get<{ data: Product }>(`/inventories/${productId.value}`, params)
    product.value = res.data
  }
  catch { product.value = null }
  finally { loadingProduct.value = false }
}

function onSkuWarehouseFilter(val: string | string[]) {
  filterSkuWarehouseIds.value = Array.isArray(val) ? val : [val]
  fetchProduct()
}

async function fetchFifos() {
  loadingFifo.value = true
  try {
    const params: Record<string, string> = { page: String(fifoPage.value), per_page: String(fifoPerPage.value) }
    if (fifoFilterSkuId.value.length) params.sku_id = fifoFilterSkuId.value.join(',')
    if (fifoFilterWarehouseId.value.length) params.warehouse_id = fifoFilterWarehouseId.value.join(',')
    if (fifoFilterType.value.length) params.type = fifoFilterType.value[0]!
    const res = await api.get<{ data: Paginated<StockFifo> }>(`/inventories/${productId.value}/stock-fifos`, params)
    fifos.value = res.data?.data || []
    fifoTotalPage.value = res.data?.total_page || 1
    fifoTotal.value = res.data?.total || 0
  }
  catch { fifos.value = [] }
  finally { loadingFifo.value = false }
}

async function fetchMovements() {
  loadingMov.value = true
  try {
    const params: Record<string, string> = { page: String(movPage.value), per_page: String(movPerPage.value) }
    if (movFilterSkuId.value.length) params.sku_id = movFilterSkuId.value.join(',')
    if (movFilterWarehouseId.value.length) params.warehouse_id = movFilterWarehouseId.value.join(',')
    if (movFilterType.value.length) params.type = movFilterType.value[0]!
    if (movFilterDate.value.from) {
      params.date_from = movFilterDate.value.from
      params.date_to = movFilterDate.value.to
    }
    const res = await api.get<{ data: Paginated<StockMovement> }>(`/inventories/${productId.value}/stock-movements`, params)
    movements.value = res.data?.data || []
    movTotalPage.value = res.data?.total_page || 1
    movTotal.value = res.data?.total || 0
  }
  catch { movements.value = [] }
  finally { loadingMov.value = false }
}

async function fetchWarehouseOptions(searchText?: string) {
  loadingWarehouses.value = true
  try {
    const params: Record<string, string> = {}
    if (searchText) params.search = searchText
    const res = await api.get<{ data: any }>('/warehouses/public/index', params)
    warehouses.value = (res.data?.data || res.data || []) as { id: string; name: string }[]
  }
  catch { warehouses.value = [] }
  finally { loadingWarehouses.value = false }
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(tab: 'sku' | 'fifo' | 'movements') {
  activeTab.value = tab
  if (tab === 'fifo' && !fifos.value.length && !loadingFifo.value) fetchFifos()
  if (tab === 'movements' && !movements.value.length && !loadingMov.value) fetchMovements()
}

// ── Filter handlers ──────────────────────────────────────────────────────────
function onFifoSkuFilter(val: string | string[]) { fifoFilterSkuId.value = val as string[]; fifoPage.value = 1; fetchFifos() }
function onFifoWarehouseFilter(val: string | string[]) { fifoFilterWarehouseId.value = val as string[]; fifoPage.value = 1; fetchFifos() }
function onFifoTypeFilter(val: string | string[]) { fifoFilterType.value = val as string[]; fifoPage.value = 1; fetchFifos() }
function onMovSkuFilter(val: string | string[]) { movFilterSkuId.value = val as string[]; movPage.value = 1; fetchMovements() }
function onMovWarehouseFilter(val: string | string[]) { movFilterWarehouseId.value = val as string[]; movPage.value = 1; fetchMovements() }
function onMovTypeFilter(val: string | string[]) { movFilterType.value = val as string[]; movPage.value = 1; fetchMovements() }
function onMovDateFilter(val: { from: string; to: string }) { movFilterDate.value = val; movPage.value = 1; fetchMovements() }

function onFifoPageChange(p: number) { fifoPage.value = p; fetchFifos() }
function onFifoPerPageChange(pp: number) { fifoPerPage.value = pp; fifoPage.value = 1; fetchFifos() }

function onMovPageChange(p: number) { movPage.value = p; fetchMovements() }
function onMovPerPageChange(pp: number) { movPerPage.value = pp; movPage.value = 1; fetchMovements() }

// ── Formatting ────────────────────────────────────────────────────────────────
function formatRefType(ref: string): string {
  const map: Record<string, string> = {
    warehouse_inbound: 'Inbound',
    sale_order: 'Order',
    stock_adjustment: 'Penyesuaian',
    stock_conversion: 'Konversi',
    stock_transfer: 'Transfer',
    purchase_order: 'Purchase Order',
  }
  return map[ref] || ref
}

const subtotal = computed(() => {
  const p = product.value
  if (!p) return null
  return {
    cogs: Number(p.average_price) * p.stock_warehouse,
  }
})

onMounted(() => {
  fetchProduct().then(() => fetchFifos())
  fetchWarehouseOptions()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/inventory/stock"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <div class="flex-1">
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
          {{ loadingProduct ? 'Memuat...' : (product?.name || 'Detail Inventori') }}
        </h1>
        <p v-if="product?.category" class="text-sm text-gray-500">{{ product.category.name }}</p>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loadingProduct" class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
          <div class="flex gap-4">
            <div class="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-gray-200" />
            <div class="flex-1 space-y-3">
              <div v-for="i in 4" :key="i" class="h-4 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div v-for="i in 6" :key="i" class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
            <div class="h-3 w-14 animate-pulse rounded bg-gray-200" />
            <div class="mt-2 h-6 w-16 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
      <div class="h-64 animate-pulse rounded-xl bg-gray-200" />
    </div>

    <template v-else-if="product">
      <div class="space-y-4">
        <!-- Top: product info (2-col) + summary cards -->
        <div class="grid gap-4 sm:grid-cols-2">
          <!-- Product info card -->
          <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
            <div class="flex gap-4">
              <!-- Thumbnail -->
              <div class="shrink-0">
                <img
                  v-if="product.thumbnail"
                  :src="product.thumbnail"
                  :alt="product.name"
                  class="h-20 w-20 rounded-xl object-cover ring-1 ring-gray-200"
                />
                <div v-else class="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100">
                  <Package class="h-8 w-8 text-gray-300" />
                </div>
              </div>
              <!-- Fields -->
              <div class="min-w-0 flex-1 space-y-2 text-sm">
                <p class="font-semibold text-gray-900 leading-tight">{{ product.name }}</p>
                <div v-if="product.short_description">
                  <p class="line-clamp-2 text-xs text-gray-500">{{ product.short_description }}</p>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <span v-if="product.category" class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{{ product.category.name }}</span>
                  <span
                    class="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                    :class="product.status === 'active' ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-gray-100 text-gray-500'"
                  >
                    {{ product.status === 'active' ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </div>
                <div class="pt-0.5">
                  <p class="text-[10px] text-gray-400">Harga Rata-Rata</p>
                  <p class="font-semibold text-gray-900">Rp{{ formatCurrency(product.average_price) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Summary cards 3x2 -->
          <div class="grid grid-cols-3 gap-3">
            <div class="rounded-xl bg-white p-3 shadow-xs ring-1 ring-gray-200">
              <p class="flex items-center gap-1 text-[10px] text-gray-500"><Package class="h-3 w-3" /> Stok</p>
              <p class="mt-1 text-xl font-bold text-gray-900">{{ formatCurrency(product.stock_warehouse) }}</p>
              <p class="text-[10px] text-gray-400">unit</p>
            </div>
            <div class="rounded-xl bg-white p-3 shadow-xs ring-1 ring-orange-100">
              <p class="flex items-center gap-1 text-[10px] text-orange-600"><Layers class="h-3 w-3" /> Terkunci</p>
              <p class="mt-1 text-xl font-bold text-orange-600">{{ formatCurrency(product.stock_locked) }}</p>
              <p class="text-[10px] text-gray-400">unit</p>
            </div>
            <div class="rounded-xl bg-white p-3 shadow-xs ring-1 ring-gray-200">
              <p class="flex items-center gap-1 text-[10px]" :class="product.stock_available <= 0 ? 'text-red-500' : 'text-green-600'"><BarChart3 class="h-3 w-3" /> Tersedia</p>
              <p class="mt-1 text-xl font-bold" :class="product.stock_available <= 0 ? 'text-red-600' : 'text-green-700'">{{ formatCurrency(product.stock_available) }}</p>
              <p class="text-[10px] text-gray-400">unit</p>
            </div>
            <div class="rounded-xl bg-white p-3 shadow-xs ring-1 ring-blue-100">
              <p class="flex items-center gap-1 text-[10px] text-blue-600"><DollarSign class="h-3 w-3" /> Nilai Stok</p>
              <p class="mt-1 truncate text-base font-bold text-blue-700">Rp{{ formatCurrency(subtotal?.cogs ?? 0) }}</p>
            </div>
            <div class="rounded-xl bg-white p-3 shadow-xs ring-1 ring-purple-100">
              <p class="flex items-center gap-1 text-[10px] text-purple-600"><ShoppingCart class="h-3 w-3" /> Dalam PO</p>
              <p class="mt-1 text-xl font-bold text-purple-600">{{ formatCurrency(product.stock_purchase_orders) }}</p>
              <p class="text-[10px] text-gray-400">unit</p>
            </div>
            <div class="rounded-xl bg-white p-3 shadow-xs ring-1 ring-cyan-100">
              <p class="flex items-center gap-1 text-[10px] text-cyan-600"><Inbox class="h-3 w-3" /> Receiving</p>
              <p class="mt-1 text-xl font-bold text-cyan-600">{{ formatCurrency(product.stock_purchase_receipts) }}</p>
              <p class="text-[10px] text-gray-400">unit</p>
            </div>
          </div>
        </div>

        <!-- Tabs: SKU / FIFO / Movement -->
        <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
          <!-- Tab headers -->
          <div class="flex border-b border-gray-200 overflow-x-auto">
            <button
              class="flex shrink-0 items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors"
              :class="activeTab === 'sku' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'"
              @click="switchTab('sku')"
            >
              <Layers class="h-4 w-4" />
              SKU
              <span class="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{{ product.skus?.length || 0 }}</span>
            </button>
            <button
              class="flex shrink-0 items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors"
              :class="activeTab === 'fifo' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'"
              @click="switchTab('fifo')"
            >
              <MapPin class="h-4 w-4" />
              FIFO Lots
              <span v-if="fifoTotal" class="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{{ fifoTotal }}</span>
            </button>
            <button
              class="flex shrink-0 items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors"
              :class="activeTab === 'movements' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'"
              @click="switchTab('movements')"
            >
              <History class="h-4 w-4" />
              Movement
              <span v-if="movTotal" class="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{{ movTotal }}</span>
            </button>
          </div>

          <!-- SKU Tab -->
          <div v-if="activeTab === 'sku'">
            <div class="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
              <AppFilterSelect
                :model-value="filterSkuWarehouseIds"
                :options="warehouseOptions"
                :loading="loadingWarehouses"
                multiple
                placeholder="Gudang"
                search-placeholder="Cari gudang..."
                @update:model-value="onSkuWarehouseFilter"
                @search="fetchWarehouseOptions"
              />
            </div>
            <div v-if="product.skus?.length" class="overflow-x-auto">
              <table class="w-full min-w-[700px] text-sm">
                <thead>
                  <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500 text-nowrap">
                    <th class="px-4 py-2.5 text-left">Kode SKU</th>
                    <th class="px-4 py-2.5 text-left">Varian</th>
                    <th class="px-4 py-2.5 text-center">Status</th>
                    <th class="px-4 py-2.5 text-right">Stok</th>
                    <th class="px-4 py-2.5 text-right">Terkunci</th>
                    <th class="px-4 py-2.5 text-right">Tersedia</th>
                    <th class="px-4 py-2.5 text-right">Harga Avg</th>
                    <th class="px-4 py-2.5 text-right">Nilai Stok</th>
                    <th class="px-4 py-2.5 text-right">Dalam PO</th>
                    <th class="px-4 py-2.5 text-right">Receiving</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="sku in product.skus"
                    :key="sku.id"
                    class="border-b border-gray-100 last:border-b-0"
                  >
                    <td class="px-4 py-3 font-mono text-sm text-gray-700">{{ sku.sku }}</td>
                    <td class="px-4 py-3">
                      <span v-if="sku.variants?.length" class="flex flex-wrap gap-1">
                        <span
                          v-for="v in sku.variants"
                          :key="v.name"
                          class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                        >{{ v.value }}</span>
                      </span>
                      <span v-else class="text-gray-400">-</span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span
                        class="rounded-full px-2 py-0.5 text-xs font-medium"
                        :class="sku.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'"
                      >
                        {{ sku.status === 'active' ? 'Aktif' : 'Nonaktif' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right text-gray-900">{{ formatCurrency(sku.stock_warehouse) }}</td>
                    <td class="px-4 py-3 text-right text-orange-600">{{ formatCurrency(sku.stock_locked) }}</td>
                    <td class="px-4 py-3 text-right">
                      <span
                        class="font-semibold"
                        :class="sku.stock_available <= 0 ? 'text-red-600' : sku.stock_available < 10 ? 'text-yellow-600' : 'text-green-700'"
                      >
                        {{ formatCurrency(sku.stock_available) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right whitespace-nowrap text-gray-700">Rp{{ formatCurrency(sku.average_price) }}</td>
                    <td class="px-4 py-3 text-right whitespace-nowrap text-gray-700">Rp{{ formatCurrency(sku.total) }}</td>
                    <td class="px-4 py-3 text-right text-purple-600">{{ formatCurrency(sku.stock_purchase_orders) }}</td>
                    <td class="px-4 py-3 text-right text-cyan-600">{{ formatCurrency(sku.stock_purchase_receipts) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="px-4 py-10 text-center text-sm text-gray-400">
              <Package class="mx-auto mb-2 h-8 w-8 text-gray-300" />
              Tidak ada SKU
            </div>
          </div>

          <!-- FIFO Tab -->
          <div v-if="activeTab === 'fifo'">
            <div class="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
              <AppFilterSelect
                :model-value="fifoFilterSkuId"
                :options="skuOptions"
                multiple
                placeholder="Filter SKU"
                @update:model-value="onFifoSkuFilter"
              />
              <AppFilterSelect
                :model-value="fifoFilterWarehouseId"
                :options="warehouseOptions"
                :loading="loadingWarehouses"
                multiple
                placeholder="Gudang"
                search-placeholder="Cari gudang..."
                @update:model-value="onFifoWarehouseFilter"
                @search="fetchWarehouseOptions"
              />
              <AppFilterSelect
                :model-value="fifoFilterType"
                :options="fifoTypeOptions"
                :searchable="false"
                multiple
                placeholder="Status Lot"
                @update:model-value="onFifoTypeFilter"
              />
              <button
                class="flex items-center gap-1 rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                :disabled="loadingFifo"
                @click="fetchFifos()"
              >
                <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': loadingFifo }" />
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[700px] text-sm">
                <thead>
                  <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500 text-nowrap">
                    <th class="px-4 py-2.5 text-left">SKU</th>
                    <th class="px-4 py-2.5 text-left">Varian</th>
                    <th class="px-4 py-2.5 text-left">Gudang</th>
                    <th class="px-4 py-2.5 text-left">Lokasi</th>
                    <th class="px-4 py-2.5 text-right">Masuk</th>
                    <th class="px-4 py-2.5 text-right">Keluar</th>
                    <th class="px-4 py-2.5 text-right">Sisa</th>
                    <th class="px-4 py-2.5 text-right">Harga</th>
                    <th class="px-4 py-2.5 text-right">Nilai Sisa</th>
                    <th class="px-4 py-2.5 text-left">Dibuat</th>
                  </tr>
                </thead>
                <tbody v-if="loadingFifo">
                  <tr v-for="i in 5" :key="i" class="border-b border-gray-100">
                    <td v-for="j in 10" :key="j" class="px-4 py-3">
                      <div class="h-4 animate-pulse rounded bg-gray-200 w-20" />
                    </td>
                  </tr>
                </tbody>
                <tbody v-else-if="!fifos.length">
                  <tr>
                    <td colspan="10" class="px-4 py-10 text-center text-sm text-gray-400">
                      Tidak ada data FIFO lot
                    </td>
                  </tr>
                </tbody>
                <tbody v-else>
                  <tr
                    v-for="fifo in fifos"
                    :key="fifo.id"
                    class="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50"
                  >
                    <td class="px-4 py-3 font-mono text-xs text-gray-700">{{ fifo.sku }}</td>
                    <td class="px-4 py-3">
                      <div v-if="fifo.variants?.length" class="flex flex-wrap gap-1">
                        <span
                          v-for="v in fifo.variants"
                          :key="v.name"
                          class="rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-600"
                        >{{ v.value }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-xs font-medium text-gray-700">{{ fifo.warehouse?.name || '-' }}</td>
                    <td class="px-4 py-3 text-[10px] text-gray-400">
                      {{ [fifo.zone?.code, fifo.rack?.code, fifo.bin?.code].filter(Boolean).join(' / ') || '-' }}
                    </td>
                    <td class="px-4 py-3 text-right text-green-700">+{{ formatCurrency(fifo.stock_in) }}</td>
                    <td class="px-4 py-3 text-right text-red-600">-{{ formatCurrency(fifo.stock_out) }}</td>
                    <td class="px-4 py-3 text-right">
                      <span class="font-semibold" :class="fifo.stock_balance <= 0 ? 'text-gray-400' : 'text-gray-900'">
                        {{ formatCurrency(fifo.stock_balance) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right whitespace-nowrap text-gray-700">Rp{{ formatCurrency(fifo.price) }}</td>
                    <td class="px-4 py-3 text-right whitespace-nowrap text-gray-700">Rp{{ formatCurrency(fifo.total) }}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{{ formatDateTime(fifo.created_at) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="!loadingFifo && fifoTotalPage > 1" class="border-t border-gray-100 px-4 py-3">
              <AppPagination
                :page="fifoPage"
                :total-page="fifoTotalPage"
                :total="fifoTotal"
                :per-page="fifoPerPage"
                :loading="loadingFifo"
                @update:page="onFifoPageChange"
                @update:per-page="onFifoPerPageChange"
              />
            </div>
          </div>

          <!-- Movements Tab -->
          <div v-if="activeTab === 'movements'">
            <div class="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
              <AppFilterSelect
                :model-value="movFilterSkuId"
                :options="skuOptions"
                multiple
                placeholder="Filter SKU"
                @update:model-value="onMovSkuFilter"
              />
              <AppFilterSelect
                :model-value="movFilterWarehouseId"
                :options="warehouseOptions"
                :loading="loadingWarehouses"
                multiple
                placeholder="Gudang"
                search-placeholder="Cari gudang..."
                @update:model-value="onMovWarehouseFilter"
                @search="fetchWarehouseOptions"
              />
              <AppFilterSelect
                :model-value="movFilterType"
                :options="movTypeOptions"
                :searchable="false"
                multiple
                placeholder="Tipe"
                @update:model-value="onMovTypeFilter"
              />
              <AppDateRangePicker :model-value="movFilterDate" @update:model-value="onMovDateFilter" />
              <button
                class="flex items-center gap-1 rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                :disabled="loadingMov"
                @click="fetchMovements()"
              >
                <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': loadingMov }" />
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[680px] text-sm">
                <thead>
                  <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500 text-nowrap">
                    <th class="px-4 py-2.5 text-left">SKU</th>
                    <th class="px-4 py-2.5 text-left">Varian</th>
                    <th class="px-4 py-2.5 text-left">Gudang</th>
                    <th class="px-4 py-2.5 text-left">Lokasi</th>
                    <th class="px-4 py-2.5 text-right">Perubahan</th>
                    <th class="px-4 py-2.5 text-right">Harga</th>
                    <th class="px-4 py-2.5 text-left">Referensi</th>
                    <th class="px-4 py-2.5 text-left">Waktu</th>
                  </tr>
                </thead>
                <tbody v-if="loadingMov">
                  <tr v-for="i in 5" :key="i" class="border-b border-gray-100">
                    <td v-for="j in 8" :key="j" class="px-4 py-3">
                      <div class="h-4 animate-pulse rounded bg-gray-200 w-20" />
                    </td>
                  </tr>
                </tbody>
                <tbody v-else-if="!movements.length">
                  <tr>
                    <td colspan="8" class="px-4 py-10 text-center text-sm text-gray-400">
                      Tidak ada riwayat movement
                    </td>
                  </tr>
                </tbody>
                <tbody v-else>
                  <tr
                    v-for="mov in movements"
                    :key="mov.id"
                    class="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50"
                  >
                    <td class="px-4 py-3 font-mono text-xs text-gray-700">{{ mov.sku }}</td>
                    <td class="px-4 py-3">
                      <div v-if="mov.variants?.length" class="flex flex-wrap gap-1">
                        <span
                          v-for="v in mov.variants"
                          :key="v.name"
                          class="rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-600"
                        >{{ v.value }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-xs font-medium text-gray-700">{{ mov.warehouse?.name || '-' }}</td>
                    <td class="px-4 py-3 text-[10px] text-gray-400">
                      {{ [mov.zone?.code, mov.rack?.code, mov.bin?.code].filter(Boolean).join(' / ') || '-' }}
                    </td>
                    <td class="px-4 py-3 text-right">
                      <span
                        class="font-semibold"
                        :class="mov.stock_change > 0 ? 'text-green-700' : 'text-red-600'"
                      >
                        {{ mov.stock_change > 0 ? '+' : '' }}{{ formatCurrency(mov.stock_change) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right whitespace-nowrap text-gray-700">Rp{{ formatCurrency(mov.price) }}</td>
                    <td class="px-4 py-3">
                      <span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{{ formatRefType(mov.reference_type) }}</span>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{{ formatDateTime(mov.created_at) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="!loadingMov && movTotalPage > 1" class="border-t border-gray-100 px-4 py-3">
              <AppPagination
                :page="movPage"
                :total-page="movTotalPage"
                :total="movTotal"
                :per-page="movPerPage"
                :loading="loadingMov"
                @update:page="onMovPageChange"
                @update:per-page="onMovPerPageChange"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Not found -->
    <div v-else class="rounded-xl bg-white p-12 text-center shadow-xs ring-1 ring-gray-200">
      <Package class="mx-auto mb-3 h-12 w-12 text-gray-300" />
      <p class="text-sm text-gray-500">Produk tidak ditemukan.</p>
      <NuxtLink to="/inventory/stock" class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
        <ArrowLeft class="h-3.5 w-3.5" /> Kembali ke daftar
      </NuxtLink>
    </div>
    <!-- space bottom -->
    <div class="h-30" />
  </div>
</template>
