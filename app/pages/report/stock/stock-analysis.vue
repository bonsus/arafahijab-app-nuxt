<script setup lang="ts">
import { Search, ChevronDown, ChevronRight, X, RefreshCw, Download, Loader2 } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Variant { name: string; value: string }
interface WarehouseOption { id: string; name: string }

interface SaSku {
  sku_id: string; sku: string; variants: Variant[]
  qty: number; avg_cost: string; total_cogs: string
  percentage: string; percentage_product: string; stock_status: string
}
interface SaProduct {
  product_id: string; product_name: string
  qty: number; avg_cost: string; total_cogs: string; percentage: string
  skus: SaSku[]
}
interface SaSummary {
  total_products: number; total_skus: number; total_qty: number; total_cogs: string
}

const api = useApi()
const toast = useToast()

const summaryData = ref<SaSummary | null>(null)

async function fetchSummary() {
  try {
    const params: Record<string, string> = {}
    if (search.value) params.search = search.value
    if (filterWarehouse.value.length) params.warehouse_id = filterWarehouse.value.join(',')
    if (filterCategory.value.length) params.category_id = filterCategory.value.join(',')
    const res = await api.get<{ data: SaSummary }>('/reports/stocks/stock-analysis/summary', params)
    summaryData.value = res.data
  }
  catch { /* ignore */ }
}

const loading = ref(false)
const data = ref<SaProduct[]>([])
const totalHpp = ref('0')
const search = ref('')
const filterWarehouse = ref<string[]>([])
const filterCategory = ref<string[]>([])
const expanded = ref<string[]>([])

const warehouses = ref<WarehouseOption[]>([])
const categoryOptions = ref<Array<{ value: string; label: string }>>([])
const categoryLoading = ref(false)

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
    if (filterCategory.value.length) params.category_id = filterCategory.value.join(',')
    const res = await api.get<{ data: { total_cogs: string; data: SaProduct[] } }>(
      '/reports/stocks/stock-analysis', params,
    )
    data.value = res.data.data || []
    totalHpp.value = res.data.total_cogs || '0'
  }
  catch (err: any) { toast.error(err.message || 'Gagal memuat analisis stock') }
  finally { loading.value = false }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { fetchSummary(); fetchData() }, 400)
}

async function onCategorySearch(q: string) {
  categoryLoading.value = true
  try {
    const res = await api.get<{ data: Array<{ id: string; name: string }> }>('/products/categories/index', { search: q })
    categoryOptions.value = (res.data || []).map(c => ({ value: c.id, label: c.name }))
  }
  catch { categoryOptions.value = [] }
  finally { categoryLoading.value = false }
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

// ─── Export ───────────────────────────────────────────────────────────────────
const exporting = ref(false)

async function exportData() {
  if (exporting.value) return
  exporting.value = true
  try {
    const params: Record<string, string> = {}
    if (search.value) params.search = search.value
    if (filterWarehouse.value.length) params.warehouse_id = filterWarehouse.value.join(',')
    if (filterCategory.value.length) params.category_id = filterCategory.value.join(',')
    const endpoint = '/reports/stocks/stock-analysis/export'
    const response = await api.get<Blob>(endpoint, params, { responseType: 'blob' })
    const blob = new Blob([response as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const now = new Date()
    const date = now.toISOString().slice(0, 10).replace(/-/g, '')
    const hhmm = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    link.download = `stock_analysis_${date}_${hhmm}.xlsx`
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
      <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Analisis Stock</h1>
      <p class="mt-0.5 text-sm text-gray-500">Analisis nilai HPP dan persentase stok</p>
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
        :model-value="filterCategory"
        :options="categoryOptions"
        :loading="categoryLoading"
        placeholder="Kategori Produk"
        multiple
        @update:model-value="filterCategory = $event as string[]; fetchSummary(); fetchData()"
        @search="onCategorySearch"
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
        @click="fetchData()"
      >
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
      </button>
      <button
        class="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
        :disabled="exporting"
        @click="exportData()"
      >
        <Loader2 v-if="exporting" class="h-4 w-4 animate-spin" />
        <Download v-else class="h-4 w-4" />
        <span>Export</span>
      </button>
    </div>

    <!-- Category tags removed; AppFilterSelect handles display internally -->

    <!-- Table -->
    <div class="overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[700px] text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              <th class="px-4 py-3">Produk / SKU</th>
              <th class="px-4 py-3 text-right w-20">Qty</th>
              <th class="px-4 py-3 text-right">Avg Cost</th>
              <th class="px-4 py-3 text-right">Total COGS</th>
              <th class="px-4 py-3 text-right w-28">% Total</th>
              <th class="px-4 py-3 text-right w-28">% Produk</th> 
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <template v-if="loading">
              <tr v-for="i in 8" :key="i">
                <td class="px-4 py-3"><div class="h-4 w-48 animate-pulse rounded bg-gray-100" /></td>
                <td v-for="j in 5" :key="j" class="px-4 py-3"><div class="ml-auto h-4 w-16 animate-pulse rounded bg-gray-100" /></td>
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
                  <td class="px-4 py-3 text-right">
                    <span class="font-semibold text-primary-700">{{ product.percentage }}%</span>
                    <div class="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                      <div class="h-1.5 rounded-full bg-primary-400" :style="{ width: `${Math.min(Number(product.percentage), 100)}%` }" />
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right text-gray-400">—</td> 
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
                    <td class="px-4 py-2 text-right text-xs font-medium text-primary-700">{{ sku.percentage }}%</td>
                    <td class="px-4 py-2 text-right text-xs text-gray-500">{{ sku.percentage_product }}%</td> 
                  </tr>
                </template>
              </template>
            </template>
            <tr v-else>
              <td colspan="7" class="px-4 py-12 text-center text-sm text-gray-400">Tidak ada data</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
