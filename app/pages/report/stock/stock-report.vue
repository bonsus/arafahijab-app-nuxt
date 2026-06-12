<script setup lang="ts">
import { Search, ChevronDown, ChevronRight, RefreshCw } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Variant { name: string; value: string }
interface WarehouseOption { id: string; name: string }

interface SrSku {
  sku_id: string; sku: string; variants: Variant[]
  qty: number; avg_cost: string; total_cogs: string; stock_status: string
}
interface SrProduct {
  product_id: string; product_name: string
  qty: number; avg_cost: string; total_cogs: string
  skus: SrSku[]
}
interface SrSummary {
  total_products: number; total_skus: number; total_qty: number; total_cogs: string
  available_count: number; low_stock_count: number; out_of_stock_count: number
  available_qty: number; out_of_stock_qty: number
  available_cogs: string; low_stock_cogs: string; out_of_stock_cogs: string
}

const api = useApi()
const toast = useToast()

const summaryData = ref<SrSummary | null>(null)

async function fetchSummary() {
  try {
    const params: Record<string, string> = {}
    if (search.value) params.search = search.value
    if (filterWarehouse.value.length) params.warehouse_id = filterWarehouse.value.join(',')
    if (filterStatus.value.length) params.stock_status = filterStatus.value.join(',')
    const res = await api.get<{ data: SrSummary }>('/reports/stocks/stock-report/summary', params)
    summaryData.value = res.data
  }
  catch { /* ignore */ }
}

const loading = ref(false)
const data = ref<SrProduct[]>([])
const total = ref(0)
const totalPage = ref(1)
const page = ref(1)
const perPage = ref(20)
const search = ref('')
const filterWarehouse = ref<string[]>([])
const filterStatus = ref<string[]>([])
const expanded = ref<string[]>([])

const warehouses = ref<WarehouseOption[]>([])

async function fetchWarehouses() {
  try {
    const res = await api.get<{ data: WarehouseOption[] }>('/warehouses/public/index')
    warehouses.value = res.data || []
  }
  catch { /* ignore */ }
}

const warehouseOptions = computed(() =>
  warehouses.value.map(w => ({ value: w.id, label: w.name })),
)

const stockStatusOptions = [
  { value: 'available', label: 'Tersedia' },
  { value: 'low_stock', label: 'Stok Rendah' },
  { value: 'out_of_stock', label: 'Habis' },
]

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    if (filterWarehouse.value.length) params.warehouse_id = filterWarehouse.value.join(',')
    if (filterStatus.value.length) params.stock_status = filterStatus.value.join(',')
    const res = await api.get<{ data: { data: SrProduct[]; total: number; total_page: number } }>(
      '/reports/stocks/stock-report', params,
    )
    data.value = res.data.data || []
    total.value = res.data.total || 0
    totalPage.value = res.data.total_page || 1
  }
  catch (err: any) { toast.error(err.message || 'Gagal memuat laporan stock') }
  finally { loading.value = false }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchSummary(); fetchData() }, 400)
}

function onFilterChange() {
  page.value = 1
  fetchSummary()
  fetchData()
}

function toggle(id: string) {
  const idx = expanded.value.indexOf(id)
  if (idx >= 0) expanded.value.splice(idx, 1)
  else expanded.value.push(id)
}

const tabs = [
  { label: 'Laporan Stock', to: '/report/stock/stock-report' },
  { label: 'Analisis Stock', to: '/report/stock/stock-analysis' },
  { label: 'Stock Turn Over', to: '/report/stock/stock-turnover' },
]

onMounted(async () => {
  await fetchWarehouses()
  fetchSummary()
  fetchData()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div>
      <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Laporan Stock</h1>
      <p class="mt-0.5 text-sm text-gray-500">Laporan stok produk per gudang</p>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200">
      <nav class="-mb-px flex gap-1 overflow-x-auto">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
          :class="$route.path === tab.to
            ? 'border-primary-600 text-primary-600'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'"
        >
          {{ tab.label }}
        </NuxtLink>
      </nav>
    </div>

    <!-- Summary Cards -->
    <div v-if="summaryData" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs text-gray-400">Total Produk</p>
        <p class="mt-0.5 text-xl font-bold text-gray-900">{{ summaryData.total_products }}</p>
        <p class="text-xs text-gray-500">{{ summaryData.total_skus }} SKU · {{ summaryData.total_qty }} pcs</p>
      </div>
      <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs text-gray-400">Total COGS</p>
        <p class="mt-0.5 text-xl font-bold text-gray-900">Rp{{ formatCurrency(summaryData.total_cogs) }}</p>
      </div>
      <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs text-gray-400">Tersedia</p>
        <p class="mt-0.5 text-xl font-bold text-green-700">{{ summaryData.available_count }} SKU</p>
        <p class="text-xs text-gray-500">{{ summaryData.available_qty }} pcs</p>
      </div>
      <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <p class="mb-1.5 text-xs text-gray-400">Status Lainnya</p>
        <div class="space-y-1 text-xs">
          <div v-if="summaryData.low_stock_count > 0" class="flex justify-between">
            <span class="text-orange-600">Stok Rendah</span>
            <span class="font-semibold text-orange-700">{{ summaryData.low_stock_count }} SKU</span>
          </div>
          <div class="flex justify-between">
            <span class="text-red-500">Habis</span>
            <span class="font-semibold text-red-600">{{ summaryData.out_of_stock_count }} SKU</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative min-w-[200px] flex-1">
        <Search class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari produk..."
          class="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-300"
          @input="onSearch"
        />
      </div>
      <AppFilterSelect
        :model-value="filterWarehouse"
        :options="warehouseOptions"
        placeholder="Gudang"
        multiple
        :searchable="false"
        @update:model-value="filterWarehouse = $event as string[]; onFilterChange()"
      />
      <AppFilterSelect
        :model-value="filterStatus"
        :options="stockStatusOptions"
        placeholder="Status Stock"
        multiple
        :searchable="false"
        @update:model-value="filterStatus = $event as string[]; onFilterChange()"
      />
      <button
        class="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 transition-colors"
        :disabled="loading"
        @click="fetchData()"
      >
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <!-- Table -->
    <div class="overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              <th class="px-4 py-3">Produk / SKU</th>
              <th class="px-4 py-3 text-right w-24">Qty</th>
              <th class="px-4 py-3 text-right">Avg Cost</th>
              <th class="px-4 py-3 text-right">Total COGS</th> 
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <template v-if="loading">
              <tr v-for="i in 8" :key="i">
                <td class="px-4 py-3"><div class="h-4 w-48 animate-pulse rounded bg-gray-100" /></td>
                <td class="px-4 py-3 text-right"><div class="ml-auto h-4 w-12 animate-pulse rounded bg-gray-100" /></td>
                <td class="px-4 py-3 text-right"><div class="ml-auto h-4 w-20 animate-pulse rounded bg-gray-100" /></td>
                <td class="px-4 py-3 text-right"><div class="ml-auto h-4 w-24 animate-pulse rounded bg-gray-100" /></td>
                <td class="px-4 py-3"><div class="mx-auto h-4 w-16 animate-pulse rounded bg-gray-100" /></td>
              </tr>
            </template>
            <template v-else-if="data.length">
              <template v-for="product in data" :key="product.product_id">
                <tr class="cursor-pointer bg-white transition-colors hover:bg-gray-50" @click="toggle(product.product_id)">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <component :is="expanded.includes(product.product_id) ? ChevronDown : ChevronRight" class="h-4 w-4 shrink-0 text-gray-400" />
                      <span class="font-medium text-gray-900">{{ product.product_name }}</span>
                      <span class="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{{ product.skus.length }} SKU</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right font-semibold text-gray-900">{{ product.qty }}</td>
                  <td class="px-4 py-3 text-right text-gray-700">Rp{{ formatCurrency(product.avg_cost) }}</td>
                  <td class="px-4 py-3 text-right font-medium text-gray-900">Rp{{ formatCurrency(product.total_cogs) }}</td>
                </tr>
                <template v-if="expanded.includes(product.product_id)">
                  <tr v-for="sku in product.skus" :key="sku.sku_id" class="bg-gray-50/60">
                    <td class="py-2 pl-10 pr-4">
                      <div class="flex flex-wrap items-center gap-1 text-xs">
                        <span class="font-mono text-gray-500">{{ sku.sku }}</span>
                        <span v-for="v in sku.variants" :key="v.name" class="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">{{ v.value }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-2 text-right text-sm text-gray-700">{{ sku.qty }}</td>
                    <td class="px-4 py-2 text-right text-xs text-gray-600">Rp{{ formatCurrency(sku.avg_cost) }}</td>
                    <td class="px-4 py-2 text-right text-xs text-gray-700">Rp{{ formatCurrency(sku.total_cogs) }}</td>
                     
                  </tr>
                </template>
              </template>
            </template>
            <tr v-else>
              <td colspan="5" class="px-4 py-12 text-center text-sm text-gray-400">Tidak ada data</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="totalPage > 0 && !loading" class="border-t border-gray-100 px-4 py-3">
        <AppPagination
          :page="page"
          :total-page="totalPage"
          :total="total"
          :per-page="perPage"
          @update:page="page = $event; fetchData()"
          @update:per-page="perPage = $event; page = 1; fetchData()"
        />
      </div>
    </div>
  </div>
</template>
