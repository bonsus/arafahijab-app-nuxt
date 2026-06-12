<script setup lang="ts">
import { Search, ChevronDown, ChevronRight, RefreshCw } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Variant { name: string; value: string }
interface WarehouseOption { id: string; name: string }

interface StSku {
  sku_id: string; sku: string; variants: Variant[]
  stock_awal: number; stock_akhir: number; avg_price: string
  total_sales_qty: number; total_sales: string; total_cogs: string
  opening_cogs: string; closing_cogs: string; avg_cogs: string
  ito: string; dsi: string
}
interface StProduct {
  product_id: string; product_name: string
  stock_awal: number; stock_akhir: number
  total_sales_qty: number; total_sales: string; total_cogs: string
  opening_cogs: string; closing_cogs: string; avg_cogs: string
  ito: string; dsi: string
  skus: StSku[]
}
interface StSummary {
  period_days: number; total_products: number; total_skus: number
  total_opening_stock: number; total_closing_stock: number
  total_sales_qty: number; total_sales: string; total_cogs: string
  total_opening_cogs: string; total_closing_cogs: string; total_avg_cogs: string
  avg_ito: string; avg_dsi: string
}

const api = useApi()
const toast = useToast()

const summaryData = ref<StSummary | null>(null)

async function fetchSummary() {
  try {
    const params: Record<string, string> = {}
    if (search.value) params.search = search.value
    if (filterWarehouse.value.length) params.warehouse_id = filterWarehouse.value.join(',')
    if (filterDate.value.from) params.date_from = filterDate.value.from
    if (filterDate.value.to) params.date_to = filterDate.value.to
    const res = await api.get<{ data: StSummary }>('/reports/stocks/stock-turnover/summary', params)
    summaryData.value = res.data
  }
  catch { /* ignore */ }
}

const loading = ref(false)
const data = ref<StProduct[]>([])
const periodDays = ref(0)
const search = ref('')
const filterWarehouse = ref<string[]>([])
const filterDate = ref({ from: '', to: '' })
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

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (search.value) params.search = search.value
    if (filterWarehouse.value.length) params.warehouse_id = filterWarehouse.value.join(',')
    if (filterDate.value.from) params.date_from = filterDate.value.from
    if (filterDate.value.to) params.date_to = filterDate.value.to
    const res = await api.get<{ data: { period_days: number; data: StProduct[] } }>(
      '/reports/stocks/stock-turnover', params,
    )
    data.value = res.data.data || []
    periodDays.value = res.data.period_days || 0
  }
  catch (err: any) { toast.error(err.message || 'Gagal memuat stock turnover') }
  finally { loading.value = false }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { fetchSummary(); fetchData() }, 400)
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
      <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Stock Turn Over</h1>
      <p class="mt-0.5 text-sm text-gray-500">Analisis perputaran stok (ITO & DSI)</p>
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
        <p class="text-xs text-gray-400">Periode</p>
        <p class="mt-0.5 text-xl font-bold text-gray-900">{{ summaryData.period_days }} Hari</p>
        <p class="text-xs text-gray-500">{{ summaryData.total_products }} produk · {{ summaryData.total_skus }} SKU</p>
      </div>
      <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs text-gray-400">Pergerakan Stok</p>
        <p class="mt-0.5 text-sm font-bold text-gray-900">{{ summaryData.total_opening_stock.toLocaleString() }} → {{ summaryData.total_closing_stock.toLocaleString() }}</p>
        <p class="text-xs text-gray-500">Terjual: {{ summaryData.total_sales_qty }} pcs</p>
      </div>
      <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs text-gray-400">Rata-rata ITO</p>
        <p class="mt-0.5 text-xl font-bold text-blue-700">{{ summaryData.avg_ito }}x</p>
      </div>
      <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs text-gray-400">Rata-rata DSI</p>
        <p class="mt-0.5 text-xl font-bold text-purple-700">{{ summaryData.avg_dsi }}</p>
        <p class="text-xs text-gray-500">hari</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative min-w-[180px] flex-1">
        <Search class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari produk..."
          class="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-300"
          @input="onSearch"
        />
      </div>
      <AppDateRangePicker
        v-model="filterDate"
        @update:model-value="fetchSummary(); fetchData()"
      />
      <AppFilterSelect
        :model-value="filterWarehouse"
        :options="warehouseOptions"
        placeholder="Gudang"
        multiple
        :searchable="false"
        @update:model-value="filterWarehouse = $event as string[]; fetchSummary(); fetchData()"
      />
      <button
        class="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 transition-colors"
        :disabled="loading"
        @click="fetchData(); fetchSummary()"
      >
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <!-- Table -->
    <div class="overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              <th class="px-4 py-3">Produk / SKU</th>
              <th class="px-4 py-3 text-right w-24">Qty Terjual</th>
              <th class="px-4 py-3 text-right">Total Penjualan</th>
              <th class="px-4 py-3 text-right">COGS</th>
              <th class="px-4 py-3 text-right">COGS Awal</th>
              <th class="px-4 py-3 text-right">COGS Akhir</th>
              <th class="px-4 py-3 text-right">Avg COGS</th>
              <th class="px-4 py-3 text-right w-20">ITO</th>
              <th class="px-4 py-3 text-right w-20">DSI</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <template v-if="loading">
              <tr v-for="i in 8" :key="i">
                <td class="px-4 py-3"><div class="h-4 w-48 animate-pulse rounded bg-gray-100" /></td>
                <td v-for="j in 7" :key="j" class="px-4 py-3"><div class="ml-auto h-4 w-16 animate-pulse rounded bg-gray-100" /></td>
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
                  <td class="px-4 py-3 text-right font-semibold text-gray-900">{{ product.total_sales_qty }}</td>
                  <td class="px-4 py-3 text-right text-gray-700">Rp{{ formatCurrency(product.total_sales) }}</td>
                  <td class="px-4 py-3 text-right text-gray-700">Rp{{ formatCurrency(product.total_cogs) }}</td>
                  <td class="px-4 py-3 text-right text-gray-600">Rp{{ formatCurrency(product.opening_cogs) }}</td>
                  <td class="px-4 py-3 text-right text-gray-600">Rp{{ formatCurrency(product.closing_cogs) }}</td>
                  <td class="px-4 py-3 text-right text-gray-700">Rp{{ formatCurrency(product.avg_cogs) }}</td>
                  <td class="px-4 py-3 text-right font-semibold text-blue-700">{{ product.ito }}x</td>
                  <td class="px-4 py-3 text-right font-semibold text-purple-700">{{ product.dsi }}</td>
                </tr>
                <template v-if="expanded.includes(product.product_id)">
                  <tr v-for="sku in product.skus" :key="sku.sku_id" class="bg-gray-50/60">
                    <td class="py-2 pl-10 pr-4">
                      <div class="flex flex-wrap items-center gap-1 text-xs">
                        <span class="font-mono text-gray-500">{{ sku.sku }}</span>
                        <span v-for="v in sku.variants" :key="v.name" class="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">{{ v.value }}</span>
                        <span class="text-gray-400">Awal: <span class="font-medium text-gray-700">{{ sku.stock_awal }}</span> → Akhir: <span class="font-medium text-gray-700">{{ sku.stock_akhir }}</span></span>
                      </div>
                    </td>
                    <td class="px-4 py-2 text-right text-sm text-gray-700">{{ sku.total_sales_qty }}</td>
                    <td class="px-4 py-2 text-right text-xs text-gray-600">Rp{{ formatCurrency(sku.total_sales) }}</td>
                    <td class="px-4 py-2 text-right text-xs text-gray-600">Rp{{ formatCurrency(sku.total_cogs) }}</td>
                    <td class="px-4 py-2 text-right text-xs text-gray-500">Rp{{ formatCurrency(sku.opening_cogs) }}</td>
                    <td class="px-4 py-2 text-right text-xs text-gray-500">Rp{{ formatCurrency(sku.closing_cogs) }}</td>
                    <td class="px-4 py-2 text-right text-xs text-gray-600">Rp{{ formatCurrency(sku.avg_cogs) }}</td>
                    <td class="px-4 py-2 text-right text-xs font-semibold text-blue-600">{{ sku.ito }}x</td>
                    <td class="px-4 py-2 text-right text-xs font-semibold text-purple-600">{{ sku.dsi }}</td>
                  </tr>
                </template>
              </template>
            </template>
            <tr v-else>
              <td colspan="9" class="px-4 py-12 text-center text-sm text-gray-400">Tidak ada data</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
