<script setup lang="ts">
import {
  Search, RefreshCw, X, Package, ArrowLeft, ImageOff, PackageCheck,
  Layers, Boxes, CheckCircle2, Clock, Wallet, Download, Loader2,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface VariantPair { name: string; value: string }

interface PickingItem {
  product_id: string
  product_name: string
  image: string
  sku_id: string
  sku: string
  variants: VariantPair[] | null
  variant: string
  qty: number
  qty_picked: number
  qty_to_pick: number
  price: string
  value: string
}

interface Paginated<T> {
  data: T[]
  page: number
  per_page: number
  total_page: number
  total: number
}

interface PickingSummary {
  product_count: number
  sku_count: number
  qty: number
  qty_picked: number
  qty_to_pick: number
  value: string
}

const api = useApi()
const toast = useToast()
const loading = ref(true)
const loadingSummary = ref(true)
const items = ref<PickingItem[]>([])
const summary = ref<PickingSummary | null>(null)
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

const search = ref('')
const filterWarehouseIds = ref<string[]>([])
const filterProductIds = ref<string[]>([])
const filterSkuIds = ref<string[]>([])
const filterPickedStatus = ref('')

const pickedStatusOptions = [
  { value: 'not_picked', label: 'Belum Dipick' },
  { value: 'picked', label: 'Sudah Dipick' },
]

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

const skuProductMap = ref<Record<string, string>>({})

const visibleSkuOptions = computed(() => {
  if (!filterProductIds.value.length) return skuOptions.value
  return skuOptions.value.filter(o =>
    filterProductIds.value.includes(skuProductMap.value[o.value] || ''),
  )
})

const selectedProductOptions = ref<FilterOption[]>([])
const selectedSkuOptions = ref<FilterOption[]>([])

function mergeSelected(fresh: FilterOption[], selected: FilterOption[], selectedIds: string[]): FilterOption[] {
  const kept = selected.filter(o => selectedIds.includes(o.value) && !fresh.some(f => f.value === o.value))
  return [...kept, ...fresh]
}

const hasFilter = computed(() =>
  !!search.value || filterWarehouseIds.value.length > 0
  || filterProductIds.value.length > 0 || filterSkuIds.value.length > 0
  || !!filterPickedStatus.value,
)

function buildParams(): Record<string, string> {
  const params: Record<string, string> = {}
  if (search.value) params.search = search.value
  if (filterWarehouseIds.value.length) params.warehouse_id = filterWarehouseIds.value.join(',')
  if (filterProductIds.value.length) params.product_id = filterProductIds.value.join(',')
  if (filterSkuIds.value.length) params.sku_id = filterSkuIds.value.join(',')
  if (filterPickedStatus.value) params.picked_status = filterPickedStatus.value
  return params
}

const summaryPickedPercent = computed(() => {
  const qty = summary.value?.qty ?? 0
  if (!qty) return 0
  return Math.round(((summary.value?.qty_picked ?? 0) / qty) * 100)
})

async function fetchSummary() {
  loadingSummary.value = true
  try {
    const res = await api.get<{ data: PickingSummary }>(
      '/inventories/reports/picking-area/summary',
      buildParams(),
    )
    summary.value = res.data
  }
  catch { summary.value = null }
  finally { loadingSummary.value = false }
}

async function fetchItems() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
      ...buildParams(),
    }
    const res = await api.get<{ data: Paginated<PickingItem> }>(
      '/inventories/reports/picking-area',
      params,
    )
    items.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch { items.value = [] }
  finally { loading.value = false }
}

function refreshAll() {
  fetchSummary()
  fetchItems()
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

function onPickedStatusFilter(val: string | string[]) {
  filterPickedStatus.value = val as string
  page.value = 1; refreshAll()
}

function onPageChange(p: number) {
  page.value = p
  fetchItems()
}

function onPerPageChange(pp: number) {
  perPage.value = pp
  page.value = 1
  fetchItems()
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
  filterPickedStatus.value = ''
  selectedProductOptions.value = []
  selectedSkuOptions.value = []
  page.value = 1
  refreshAll()
}

// ─── Export ───────────────────────────────────────────────────────────────────
const exporting = ref(false)

async function exportData() {
  if (exporting.value) return
  exporting.value = true
  try {
    const endpoint = '/inventories/export/picking-area'
    const response = await api.get<Blob>(endpoint, buildParams(), { responseType: 'blob' })
    const blob = new Blob([response as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const now = new Date()
    const date = now.toISOString().slice(0, 10).replace(/-/g, '')
    const hhmm = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    const name = (endpoint.split('/').pop() || 'picking_area').replace(/-/g, '_')
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

function pickedPercent(item: PickingItem): number {
  if (!item.qty) return 0
  return Math.round((item.qty_picked / item.qty) * 100)
}

onMounted(() => {
  fetchSummary()
  fetchItems()
  fetchWarehouseOptions()
  fetchProductSkuOptions()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/inventory/movement"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
        title="Kembali ke Stock Movement"
      >
        <ArrowLeft class="h-4 w-4" />
      </NuxtLink>
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Area Picking</h1>
        <p class="text-sm text-gray-500">Daftar produk yang berada di area picking.</p>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <template v-if="loadingSummary">
        <div v-for="i in 6" :key="i" class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
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
          <p class="flex items-center gap-1.5 text-xs text-blue-600"><Boxes class="h-3.5 w-3.5" /> Total Qty</p>
          <p class="mt-1.5 text-2xl font-bold text-gray-900">{{ summary?.qty ?? '-' }}</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="flex items-center gap-1.5 text-xs text-teal-600"><CheckCircle2 class="h-3.5 w-3.5" /> Dipick</p>
          <div class="mt-1.5 flex items-baseline justify-between">
            <p class="text-2xl font-bold text-gray-900">{{ summary?.qty_picked ?? 0 }}</p>
            <p class="text-xs font-semibold text-teal-600">{{ summaryPickedPercent }}%</p>
          </div>
          <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div class="h-full rounded-full bg-teal-500 transition-all" :style="{ width: summaryPickedPercent + '%' }" />
          </div>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="flex items-center gap-1.5 text-xs text-yellow-600"><Clock class="h-3.5 w-3.5" /> Belum Dipick</p>
          <p class="mt-1.5 text-2xl font-bold text-yellow-600">{{ summary?.qty_to_pick ?? '-' }}</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="flex items-center gap-1.5 text-xs text-purple-600"><Wallet class="h-3.5 w-3.5" /> Nilai</p>
          <p class="mt-1.5 text-xl font-bold text-gray-900">Rp{{ formatCurrency(summary?.value ?? 0) }}</p>
        </div>
      </template>
    </div>

    <!-- Filters -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="space-y-3 px-4 py-3">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari nama produk, SKU..."
              class="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
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
            :model-value="filterPickedStatus"
            :options="pickedStatusOptions"
            :searchable="false"
            placeholder="Status Pick"
            @update:model-value="onPickedStatusFilter"
          />
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
        <table class="w-full min-w-[800px] text-sm">
          <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500 text-nowrap">
            <tr>
              <th class="px-4 py-2.5 text-left">Produk</th>
              <th class="px-4 py-2.5 text-right w-24">Qty</th>
              <th class="px-4 py-2.5 text-left w-48">Progress Pick</th>
              <th class="px-4 py-2.5 text-right w-24">Sisa</th>
              <th class="px-4 py-2.5 text-right w-28">Harga</th>
              <th class="px-4 py-2.5 text-right w-32">Nilai</th>
            </tr>
          </thead>

          <!-- Loading -->
          <tbody v-if="loading">
            <tr v-for="i in 8" :key="i" class="border-b border-gray-100">
              <td v-for="j in 6" :key="j" class="px-4 py-3">
                <div class="h-4 animate-pulse rounded bg-gray-200" :class="j === 1 ? 'w-40' : 'w-20'" />
              </td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="!items.length">
            <tr>
              <td colspan="6" class="px-4 py-16 text-center">
                <PackageCheck class="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p class="text-sm text-gray-500">
                  {{ hasFilter ? 'Tidak ada produk yang cocok dengan filter.' : 'Tidak ada produk di area picking.' }}
                </p>
              </td>
            </tr>
          </tbody>

          <!-- Rows -->
          <tbody v-else class="divide-y divide-gray-100">
            <tr v-for="item in items" :key="item.sku_id" class="hover:bg-gray-50/60">
              <!-- Produk -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
                    <img
                      v-if="item.image"
                      :src="item.image"
                      :alt="item.product_name"
                      class="h-full w-full object-cover"
                      @error="($event.target as HTMLImageElement).style.display = 'none'"
                    />
                    <ImageOff v-else class="h-3 w-3 text-gray-300" />
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-medium text-gray-900">
                      {{ item.product_name }}{{ item.variant ? ' - ' + item.variant : '' }}
                    </p>
                    <span class="font-mono text-xs text-gray-500">{{ item.sku }}</span>
                  </div>
                </div>
              </td>

              <!-- Qty -->
              <td class="px-4 py-3 text-right font-medium text-gray-900">{{ item.qty_picked }}</td>

              <!-- Progress -->
              <td class="px-4 py-3">
                <div class="flex items-center justify-between text-[11px] text-gray-500">
                  <span>{{ item.qty_picked }} / {{ item.qty }}</span>
                  <span class="font-semibold text-teal-600">{{ pickedPercent(item) }}%</span>
                </div>
                <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div class="h-full rounded-full bg-teal-500 transition-all" :style="{ width: pickedPercent(item) + '%' }" />
                </div>
              </td>

              <!-- Sisa -->
              <td class="px-4 py-3 text-right">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="item.qty_to_pick > 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'"
                >
                  {{ item.qty_to_pick }}
                </span>
              </td>

              <!-- Harga -->
              <td class="px-4 py-3 text-right text-gray-700">Rp{{ formatCurrency(item.price) }}</td>

              <!-- Nilai -->
              <td class="px-4 py-3 text-right font-medium text-gray-900">Rp{{ formatCurrency(item.value) }}</td>
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
