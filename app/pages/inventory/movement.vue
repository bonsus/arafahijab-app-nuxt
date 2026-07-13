<script setup lang="ts">
import {
  Search, RefreshCw, X, Package, Layers, ArrowDownToLine, Download, Loader2,
  ArrowUpFromLine, Boxes, Lock, PackageCheck, Inbox, ImageOff, ArrowUpRight,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface VariantPair { name: string; value: string }

interface MovementFifo {
  id: string
  stock_in: number
  stock_out: number
  stock_balance: number
  stock_locked: number
  price: string
}

interface MovementRef {
  id: string
  name?: string
  code?: string
  primary?: boolean
}

interface Movement {
  id: string
  product_id: string
  image: string
  product_name: string
  sku_id: string
  sku: string
  variants: VariantPair[] | null
  variant: string
  stock_change: number
  price: string
  total: string
  reference_type: string
  reference_id: string
  reference_no: string
  created_at: string
  fifo: MovementFifo | null
  zone: MovementRef | null
  rack: MovementRef | null
  bin: MovementRef | null
  warehouse: MovementRef | null
}

interface MovementMetric { qty: number; value: string }

interface MovementSummary {
  product_count: number
  sku_count: number
  stock_in: MovementMetric
  stock_out: MovementMetric
  stock_available: MovementMetric
  stock_locked: MovementMetric
  picking_area: MovementMetric
  picked_area: MovementMetric
  receiving_area: MovementMetric
}

interface Paginated<T> {
  data: T[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()

const loading = ref(true)
const loadingSummary = ref(true)
const movements = ref<Movement[]>([])
const summary = ref<MovementSummary | null>(null)
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

const search = ref('')
const filterWarehouseIds = ref<string[]>([])
const filterProductIds = ref<string[]>([])
const filterSkuIds = ref<string[]>([])
const filterType = ref('')
const filterDate = ref({ from: '', to: '' })

const warehouses = ref<{ id: string; name: string }[]>([])
const loadingWarehouses = ref(false)

const warehouseOptions = computed(() =>
  warehouses.value.map(w => ({ value: w.id, label: w.name })),
)

interface FilterOption { value: string; label: string; description?: string }

const productOptions = ref<FilterOption[]>([])
const skuOptions = ref<FilterOption[]>([])
const loadingProducts = ref(false)
const loadingSkus = ref(false)

// Maps each sku_id to its parent product_id so SKU options can be scoped.
const skuProductMap = ref<Record<string, string>>({})

// When products are selected, only show SKUs that belong to them.
const visibleSkuOptions = computed(() => {
  if (!filterProductIds.value.length) return skuOptions.value
  return skuOptions.value.filter(o =>
    filterProductIds.value.includes(skuProductMap.value[o.value] || ''),
  )
})

// Keep labels of currently-selected options so they persist across remote searches.
const selectedProductOptions = ref<FilterOption[]>([])
const selectedSkuOptions = ref<FilterOption[]>([])

function mergeSelected(fresh: FilterOption[], selected: FilterOption[], selectedIds: string[]): FilterOption[] {
  const kept = selected.filter(o => selectedIds.includes(o.value) && !fresh.some(f => f.value === o.value))
  return [...kept, ...fresh]
}

const typeOptions = [
  { value: 'stock_in', label: 'Stok Masuk' },
  { value: 'stock_out', label: 'Stok Keluar' },
]

const referenceTypeLabels: Record<string, string> = {
  stock_adjustment: 'Penyesuaian Stok',
  order: 'Penjualan', 
  order_return: 'Retur Penjualan', 
  warehouse_inbound: 'Inbound',
  stock_usage: 'Pemakaian Stok',
  stock_usage_return: 'Retur Pemakaian Stok',
  stock_transfer: 'Transfer Stok',
  stock_conversion: 'Konversi Stok',
}

const hasFilter = computed(() =>
  !!search.value || filterWarehouseIds.value.length > 0
  || filterProductIds.value.length > 0 || filterSkuIds.value.length > 0
  || !!filterType.value || !!filterDate.value.from || !!filterDate.value.to,
)

function referenceLabel(type: string): string {
  return referenceTypeLabels[type] || type
}

const pickingTotalQty = computed(() =>
  (summary.value?.picking_area.qty ?? 0) + (summary.value?.picked_area.qty ?? 0),
)
const pickedPercent = computed(() => {
  const total = pickingTotalQty.value
  if (!total) return 0
  return Math.round(((summary.value?.picked_area.qty ?? 0) / total) * 100)
})

function buildParams(): Record<string, string> {
  const params: Record<string, string> = {}
  if (search.value) params.search = search.value
  if (filterWarehouseIds.value.length) params.warehouse_id = filterWarehouseIds.value.join(',')
  if (filterProductIds.value.length) params.product_id = filterProductIds.value.join(',')
  if (filterSkuIds.value.length) params.sku_id = filterSkuIds.value.join(',')
  if (filterType.value) params.type = filterType.value
  if (filterDate.value.from) params.date_from = formatDateFromForApi(filterDate.value.from)
  if (filterDate.value.to) params.date_to = formatDateToForApi(filterDate.value.to)
  return params
}

async function fetchSummary() {
  loadingSummary.value = true
  try {
    const res = await api.get<{ data: MovementSummary }>(
      '/inventories/reports/stock-movements/summary',
      buildParams(),
    )
    summary.value = res.data
  }
  catch { summary.value = null }
  finally { loadingSummary.value = false }
}

async function fetchMovements() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
      ...buildParams(),
    }
    const res = await api.get<{ data: Paginated<Movement> }>(
      '/inventories/reports/stock-movements',
      params,
    )
    movements.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch { movements.value = [] }
  finally { loading.value = false }
}

function refreshAll() {
  fetchSummary()
  fetchMovements()
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; refreshAll() }, 300)
}

function onWarehouseFilter(val: string | string[]) {
  filterWarehouseIds.value = val as string[]
  page.value = 1; refreshAll()
}

function onProductFilter(val: string | string[]) {
  filterProductIds.value = val as string[]
  selectedProductOptions.value = productOptions.value.filter(o => filterProductIds.value.includes(o.value))
  // Drop selected SKUs that no longer belong to any selected product.
  if (filterProductIds.value.length) {
    filterSkuIds.value = filterSkuIds.value.filter(id =>
      filterProductIds.value.includes(skuProductMap.value[id] || ''),
    )
    selectedSkuOptions.value = selectedSkuOptions.value.filter(o => filterSkuIds.value.includes(o.value))
  }
  page.value = 1; refreshAll()
}

function onSkuFilter(val: string | string[]) {
  filterSkuIds.value = val as string[]
  selectedSkuOptions.value = skuOptions.value.filter(o => filterSkuIds.value.includes(o.value))
  page.value = 1; refreshAll()
}

function onTypeFilter(val: string | string[]) {
  filterType.value = val as string
  page.value = 1; refreshAll()
}

function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1; refreshAll()
}

function onPageChange(p: number) {
  page.value = p
  fetchMovements()
}

function onPerPageChange(pp: number) {
  perPage.value = pp
  page.value = 1
  fetchMovements()
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

async function fetchProductSkuOptions(searchText?: string) {
  loadingProducts.value = true
  loadingSkus.value = true
  try {
    const params: Record<string, string> = {}
    if (searchText) params.search = searchText
    const res = await api.get<{ data: any }>('/products/public/index', params)
    const list = (res.data?.data || res.data || []) as any[]
    const prodOpts: FilterOption[] = list.map(p => ({ value: p.id, label: p.name }))
    const skuOpts: FilterOption[] = []
    const map: Record<string, string> = {}
    for (const p of list) {
      for (const s of (p.skus || [])) {
        const variant = (s.variants || []).map((v: any) => v.value).join(', ')
        skuOpts.push({
          value: s.sku_id,
          label: variant ? `${s.sku} · ${variant}` : s.sku,
          description: p.name,
        })
        map[s.sku_id] = p.id
      }
    }
    skuProductMap.value = { ...skuProductMap.value, ...map }
    productOptions.value = mergeSelected(prodOpts, selectedProductOptions.value, filterProductIds.value)
    skuOptions.value = mergeSelected(skuOpts, selectedSkuOptions.value, filterSkuIds.value)
  }
  catch {
    productOptions.value = selectedProductOptions.value
    skuOptions.value = selectedSkuOptions.value
  }
  finally {
    loadingProducts.value = false
    loadingSkus.value = false
  }
}

function resetFilters() {
  search.value = ''
  filterWarehouseIds.value = []
  filterProductIds.value = []
  filterSkuIds.value = []
  selectedProductOptions.value = []
  selectedSkuOptions.value = []
  filterType.value = ''
  filterDate.value = { from: '', to: '' }
  page.value = 1
  refreshAll()
}

// ─── Export ───────────────────────────────────────────────────────────────────
const exporting = ref(false)

async function exportData() {
  if (exporting.value) return
  exporting.value = true
  try {
    const params: Record<string, string> = {}
    if (search.value) params.search = search.value
    if (filterWarehouseIds.value.length) params.warehouse_id = filterWarehouseIds.value.join(',')
    if (filterProductIds.value.length) params.product_id = filterProductIds.value.join(',')
    if (filterSkuIds.value.length) params.sku_id = filterSkuIds.value.join(',')
    if (filterType.value) params.type = filterType.value
    if (filterDate.value.from) params.date_from = formatDateFromForApi(filterDate.value.from)
    if (filterDate.value.to) params.date_to = formatDateToForApi(filterDate.value.to)
    const endpoint = '/inventories/export/stock-movements'
    const response = await api.get<Blob>(endpoint, params, { responseType: 'blob' })
    const blob = new Blob([response as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const now = new Date()
    const date = now.toISOString().slice(0, 10).replace(/-/g, '')
    const hhmm = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    const name = (endpoint.split('/').pop() || 'stock_movements').replace(/-/g, '_')
    link.download = `${name}_${date}_${hhmm}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => window.URL.revokeObjectURL(url), 100)
    toast.success('Export berhasil diunduh')
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengekspor data')
  } finally {
    exporting.value = false
  }
}

function locationText(m: Movement): string {
  return [m.zone?.code, m.rack?.code, m.bin?.code].filter(Boolean).join(' / ') || '-'
}

onMounted(() => {
  fetchSummary()
  fetchMovements()
  fetchWarehouseOptions()
  fetchProductSkuOptions()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div>
      <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Riwayat Stock Movement</h1>
      <p class="text-sm text-gray-500">Pergerakan stok masuk dan keluar di seluruh gudang.</p>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <template v-if="loadingSummary">
        <div v-for="i in 8" :key="i" class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <div class="h-3 w-16 animate-pulse rounded bg-gray-200" />
          <div class="mt-2 h-7 w-20 animate-pulse rounded bg-gray-100" />
        </div>
      </template>
      <template v-else>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="flex items-center gap-1.5 text-xs text-gray-500"><Package class="h-3.5 w-3.5" /> Produk</p>
          <p class="mt-1.5 text-2xl font-bold text-gray-900">{{ summary?.product_count ?? '-' }}</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="flex items-center gap-1.5 text-xs text-gray-500"><Layers class="h-3.5 w-3.5" /> SKU</p>
          <p class="mt-1.5 text-2xl font-bold text-gray-900">{{ summary?.sku_count ?? '-' }}</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="flex items-center gap-1.5 text-xs text-green-600"><ArrowDownToLine class="h-3.5 w-3.5" /> Stok Masuk</p>
          <p class="mt-1.5 text-2xl font-bold text-green-600">{{ summary?.stock_in.qty ?? '-' }}</p>
          <p class="text-[10px] text-gray-400">Rp{{ formatCurrency(summary?.stock_in.value ?? 0) }}</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="flex items-center gap-1.5 text-xs text-red-600"><ArrowUpFromLine class="h-3.5 w-3.5" /> Stok Keluar</p>
          <p class="mt-1.5 text-2xl font-bold text-red-600">{{ summary?.stock_out.qty ?? '-' }}</p>
          <p class="text-[10px] text-gray-400">Rp{{ formatCurrency(summary?.stock_out.value ?? 0) }}</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="flex items-center gap-1.5 text-xs text-blue-600"><Boxes class="h-3.5 w-3.5" /> Stok Tersedia</p>
          <p class="mt-1.5 text-2xl font-bold text-gray-900">{{ summary?.stock_available.qty ?? '-' }}</p>
          <p class="text-[10px] text-gray-400">Rp{{ formatCurrency(summary?.stock_available.value ?? 0) }}</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="flex items-center gap-1.5 text-xs text-yellow-600"><Lock class="h-3.5 w-3.5" /> Stok Terkunci</p>
          <p class="mt-1.5 text-2xl font-bold text-yellow-600">{{ summary?.stock_locked.qty ?? '-' }}</p>
          <p class="text-[10px] text-gray-400">Rp{{ formatCurrency(summary?.stock_locked.value ?? 0) }}</p>
        </div>
        <NuxtLink
          to="/inventory/picking-area"
          class="group rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200 transition-colors hover:ring-purple-300"
        >
          <p class="flex items-center gap-1.5 text-xs text-purple-600">
            <PackageCheck class="h-3.5 w-3.5" /> Area Picking
            <ArrowUpRight class="ml-auto h-3.5 w-3.5 text-gray-300 transition-colors group-hover:text-purple-500" />
          </p>
          <div class="mt-1.5 flex items-baseline justify-between">
            <p class="text-2xl font-bold text-gray-900">
              {{ summary?.picked_area.qty ?? 0 }}<span class="text-sm font-medium text-gray-400"> / {{ pickingTotalQty }}</span>
            </p>
            <p class="text-xs font-semibold text-teal-600">{{ pickedPercent }}%</p>
          </div>
          <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div class="h-full rounded-full bg-teal-500 transition-all" :style="{ width: pickedPercent + '%' }" />
          </div>
          <div class="mt-2 flex items-center justify-between text-[10px] text-gray-400">
            <span>Dipick: Rp{{ formatCurrency(summary?.picked_area.value ?? 0) }}</span>
            <span>Sisa: {{ summary?.picking_area.qty ?? 0 }}</span>
          </div>
        </NuxtLink>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="flex items-center gap-1.5 text-xs text-gray-500"><Inbox class="h-3.5 w-3.5" /> Area Receiving</p>
          <p class="mt-1.5 text-2xl font-bold text-gray-900">{{ summary?.receiving_area.qty ?? '-' }}</p>
          <p class="text-[10px] text-gray-400">Rp{{ formatCurrency(summary?.receiving_area.value ?? 0) }}</p>
        </div>
      </template>
    </div>

    <!-- Filters -->
    <div class="rounded-xl">
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari nama produk, SKU..."
              class="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              @input="onSearch"
            />
          </div>

          <AppFilterSelect
            :model-value="filterWarehouseIds"
            :options="warehouseOptions"
            :loading="loadingWarehouses"
            multiple
            placeholder="Gudang"
            search-placeholder="Cari gudang..."
            @update:model-value="onWarehouseFilter"
            @search="fetchWarehouseOptions"
          />
          <AppFilterSelect
            :model-value="filterProductIds"
            :options="productOptions"
            :loading="loadingProducts"
            multiple
            placeholder="Produk"
            search-placeholder="Cari produk..."
            @update:model-value="onProductFilter"
            @search="fetchProductSkuOptions"
          />
          <AppFilterSelect
            :model-value="filterSkuIds"
            :options="visibleSkuOptions"
            :loading="loadingSkus"
            multiple
            placeholder="SKU"
            search-placeholder="Cari SKU..."
            @update:model-value="onSkuFilter"
            @search="fetchProductSkuOptions"
          />
          <AppFilterSelect
            :model-value="filterType"
            :options="typeOptions"
            :searchable="false"
            placeholder="Tipe"
            @update:model-value="onTypeFilter"
          />
          <AppDateRangePicker :model-value="filterDate" @update:model-value="onDateFilter" />
          <button
            class="flex shrink-0 rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            :disabled="loading"
            title="Refresh"
            @click="refreshAll()"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          </button>
          <button
            class="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
            title="Export Excel"
            :disabled="exporting"
            @click="exportData()"
          >
            <Loader2 v-if="exporting" class="h-4 w-4 animate-spin" />
            <Download v-else class="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            class="flex shrink-0 rounded-lg border border-red-200 p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-700"
            title="Reset filter"
            @click="resetFilters()"
          >
            <X class="h-4 w-4" />
          </button>
        </div> 
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-sm">
          <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500 text-nowrap">
            <tr>
              <th class="px-4 py-2.5 text-left">Produk</th>
              <th class="px-4 py-2.5 text-left w-40">Referensi</th>
              <th class="px-4 py-2.5 text-left w-32">Lokasi</th>
              <th class="px-4 py-2.5 text-right w-24">Perubahan</th>
              <th class="px-4 py-2.5 text-right w-28">Harga</th>
              <th class="px-4 py-2.5 text-right w-32">Total</th>
              <th class="px-4 py-2.5 text-right w-24">Saldo FIFO</th>
              <th class="px-4 py-2.5 text-left w-40">Waktu</th>
            </tr>
          </thead>

          <!-- Loading -->
          <tbody v-if="loading">
            <tr v-for="i in 8" :key="i" class="border-b border-gray-100">
              <td v-for="j in 8" :key="j" class="px-4 py-3">
                <div class="h-4 animate-pulse rounded bg-gray-200" :class="j === 1 ? 'w-40' : 'w-20'" />
              </td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="!movements.length">
            <tr>
              <td colspan="8" class="px-4 py-16 text-center">
                <Package class="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p class="text-sm text-gray-500">
                  {{ hasFilter ? 'Tidak ada pergerakan stok yang cocok dengan filter.' : 'Belum ada riwayat pergerakan stok.' }}
                </p>
              </td>
            </tr>
          </tbody>

          <!-- Rows -->
          <tbody v-else class="divide-y divide-gray-100">
            <tr v-for="m in movements" :key="m.id" class="hover:bg-gray-50/60">
              <!-- Produk -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
                    <img
                      v-if="m.image"
                      :src="m.image"
                      :alt="m.product_name"
                      class="h-full w-full object-cover"
                      @error="($event.target as HTMLImageElement).style.display = 'none'"
                    />
                    <ImageOff v-else class="h-3 w-3 text-gray-300" />
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-medium text-gray-900">{{ m.product_name }} {{ m.variant ? " - " + m.variant : "" }}</p>
                    <div class="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span class="font-mono text-xs text-gray-500">{{ m.sku }}</span> 
                    </div>
                  </div>
                </div>
              </td>

              <!-- Referensi -->
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 text-nowrap">
                  {{ m.reference_no || '-' }}
                </span>
                <p class="mt-1 truncate font-mono text-[10px] text-gray-400" :title="m.reference_id">
                  {{ referenceLabel(m.reference_type) }}
                </p>
              </td>

              <!-- Lokasi -->
              <td class="px-4 py-3">
                <p class="text-xs font-medium text-gray-700">{{ m.warehouse?.name || '-' }}</p>
                <p class="mt-0.5 font-mono text-[10px] text-gray-400">{{ locationText(m) }}</p>
              </td>

              <!-- Perubahan -->
              <td class="px-4 py-3 text-right">
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="m.stock_change >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
                >
                  <ArrowDownToLine v-if="m.stock_change >= 0" class="h-3 w-3" />
                  <ArrowUpFromLine v-else class="h-3 w-3" />
                  {{ m.stock_change >= 0 ? '+' : '' }}{{ m.stock_change }}
                </span>
              </td>

              <!-- Harga -->
              <td class="px-4 py-3 text-right text-gray-700">Rp{{ formatCurrency(m.price) }}</td>

              <!-- Total -->
              <td
                class="px-4 py-3 text-right font-medium"
                :class="Number(m.total) >= 0 ? 'text-gray-900' : 'text-red-600'"
              >
                Rp{{ formatCurrency(m.total) }}
              </td>

              <!-- Saldo FIFO -->
              <td class="px-4 py-3 text-right">
                <span class="font-medium text-gray-900">{{ m.fifo?.stock_balance ?? '-' }}</span>
                <p v-if="m.fifo" class="mt-0.5 text-[10px] text-gray-400">
                  kunci {{ m.fifo.stock_locked }}
                </p>
              </td>

              <!-- Waktu -->
              <td class="px-4 py-3 text-xs text-gray-500">{{ formatDateTime(m.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <AppPagination
        v-if="!loading && totalPage > 1"
        :page="page"
        :total-page="totalPage"
        :total="total"
        :per-page="perPage"
        :loading="loading"
        @update:page="onPageChange"
        @update:per-page="onPerPageChange"
      />
    </div>
  </div>
</template>
