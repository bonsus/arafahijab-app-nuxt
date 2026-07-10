<script setup lang="ts">
import { RefreshCw, TrendingUp, TrendingDown, Minus, Download, Loader2 } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

// ── Types ──────────────────────────────────────────────────────────────────
interface TrendItem {
  date: string; label: string; revenue: string; profit: string; orders: number; aov: string; qty: number
}
interface ProductItem {
  product_id: string; product_name: string; items: TrendItem[]
}
interface MetricDef { key: string; label: string }
interface AnalysisData {
  title: string; default_metric: string
  available_metrics: MetricDef[]
  group_by: string; items: ProductItem[]
}

// ── State ──────────────────────────────────────────────────────────────────
const api = useApi()
const toast = useToast()

const analysisData = ref<AnalysisData | null>(null)
const loading = ref(false)

const filterDate = ref({ from: '', to: '' })
const filterProduct = ref<string[]>([])
const groupBy = ref<'daily' | 'weekly' | 'monthly'>('daily')
const activeMetric = ref('revenue')
const activeProducts = ref<string[]>([])
const dateType = ref<'created' | 'shipped'>('shipped')

const productOptions = ref<Array<{ value: string; label: string }>>([])

// ── Constants ──────────────────────────────────────────────────────────────
const PRODUCT_COLORS = [
  '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
]

const DEFAULT_METRICS: MetricDef[] = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'profit', label: 'Profit' },
  { key: 'orders', label: 'Orders' },
  { key: 'aov', label: 'AOV' },
  { key: 'qty', label: 'Quantity Sold' },
]

const availableMetrics = computed(() => analysisData.value?.available_metrics || DEFAULT_METRICS)

// ── Params ─────────────────────────────────────────────────────────────────
function buildParams(): Record<string, string> {
  const p: Record<string, string> = { group_by: groupBy.value, date_type: dateType.value }
  if (filterDate.value.from) p.date_from = formatDateFromForApi(filterDate.value.from)
  if (filterDate.value.to) p.date_to = formatDateToForApi(filterDate.value.to)
  if (filterProduct.value.length) p.product_id = filterProduct.value.join(',')
  return p
}

// ── Fetch ──────────────────────────────────────────────────────────────────
async function fetchData() {
  loading.value = true
  try {
    const res = await api.get<{ data: { analysis: AnalysisData } }>('/reports/sales/analysis-per-product', buildParams())
    analysisData.value = res.data.analysis
    if (analysisData.value?.default_metric) {
      activeMetric.value = analysisData.value.default_metric
    }
    activeProducts.value = (analysisData.value?.items || []).map(p => p.product_id)
  }
  catch (err: any) { toast.error(err.message || 'Gagal memuat data analisis') }
  finally { loading.value = false }
}

async function onProductSearch(q: string) {
  try {
    const res = await api.get<{ data: { data: Array<{ id: string; name: string }> } }>('/products/index', { search: q, limit: '30' })
    productOptions.value = (res.data?.data || []).map(p => ({ value: p.id, label: p.name }))
  }
  catch { /* ignore */ }
}

function onFilterChange() { fetchData() }

watch(groupBy, fetchData)

const exporting = ref(false)

async function exportData() {
  if (exporting.value) return
  exporting.value = true
  try {
    const endpoint = '/reports/sales/analysis-per-product/export'
    const response = await api.get<Blob>(endpoint, buildParams(), { responseType: 'blob' })
    const blob = new Blob([response as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const now = new Date()
    const date = now.toISOString().slice(0, 10).replace(/-/g, '')
    const hhmm = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    link.download = `analysis_per_product_${date}_${hhmm}.xlsx`
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
  await onProductSearch('')
  fetchData()
})

// ── Chart ──────────────────────────────────────────────────────────────────
function getMetricVal(item: TrendItem, metric: string): number {
  if (metric === 'revenue') return Number(item.revenue)
  if (metric === 'profit') return Number(item.profit)
  if (metric === 'orders') return item.orders
  if (metric === 'aov') return Number(item.aov)
  if (metric === 'qty') return item.qty
  return 0
}

const chartLabels = computed(() => analysisData.value?.items[0]?.items.map(d => d.label) || [])

const chartSeries = computed(() => {
  if (!analysisData.value) return []
  return analysisData.value.items
    .filter(p => activeProducts.value.includes(p.product_id))
    .map((product) => {
      const origIdx = analysisData.value!.items.findIndex(p => p.product_id === product.product_id)
      return {
        name: product.product_name,
        color: PRODUCT_COLORS[origIdx % PRODUCT_COLORS.length]!,
        axis: 'left' as const,
        data: product.items.map(d => getMetricVal(d, activeMetric.value)),
      }
    })
})

function toggleProduct(id: string) {
  const idx = activeProducts.value.indexOf(id)
  if (idx >= 0) {
    if (activeProducts.value.length > 1) activeProducts.value.splice(idx, 1)
  }
  else { activeProducts.value.push(id) }
}

function shortNum(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}M`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}jt`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}rb`
  return String(Math.round(v))
}

function chartFormatter(v: number): string {
  const m = activeMetric.value
  if (m === 'revenue' || m === 'profit' || m === 'aov') return `Rp${shortNum(v)}`
  return shortNum(v)
}

// ── Pivot Table ────────────────────────────────────────────────────────────
const pivotProducts = computed(() => analysisData.value?.items || [])
const pivotDates = computed(() => analysisData.value?.items[0]?.items || [])

function pivotVal(productIdx: number, dateIdx: number): number {
  const dateItem = pivotDates.value[dateIdx]
  const product = pivotProducts.value[productIdx]
  if (!dateItem || !product) return 0
  const found = product.items.find(d => d.date === dateItem.date)
  return found ? getMetricVal(found, activeMetric.value) : 0
}

function cellTrendDir(productIdx: number, dateIdx: number): 'up' | 'down' | 'flat' {
  if (dateIdx === 0) return 'flat'
  const curr = pivotVal(productIdx, dateIdx)
  const prev = pivotVal(productIdx, dateIdx - 1)
  if (curr > prev) return 'up'
  if (curr < prev) return 'down'
  return 'flat'
}

function cellTrendPct(productIdx: number, dateIdx: number): string {
  if (dateIdx === 0) return ''
  const curr = pivotVal(productIdx, dateIdx)
  const prev = pivotVal(productIdx, dateIdx - 1)
  if (prev === 0) return curr > 0 ? '+∞' : ''
  const pct = (curr - prev) / prev * 100
  return `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`
}

const colTotals = computed(() =>
  pivotProducts.value.map((_, productIdx) =>
    pivotDates.value.reduce((sum, _, dateIdx) => sum + pivotVal(productIdx, dateIdx), 0),
  ),
)

function fmtCell(val: number): string {
  const m = activeMetric.value
  if (m === 'revenue' || m === 'profit' || m === 'aov') return `Rp${formatCurrency(val)}`
  return formatCurrency(val)
}

const summaryTotals = computed(() => {
  const allItems = (analysisData.value?.items || []).flatMap(p => p.items)
  const revenue = allItems.reduce((s, d) => s + Number(d.revenue), 0)
  const profit = allItems.reduce((s, d) => s + Number(d.profit), 0)
  const orders = allItems.reduce((s, d) => s + d.orders, 0)
  const qty = allItems.reduce((s, d) => s + d.qty, 0)
  const aov = orders > 0 ? revenue / orders : 0
  return { revenue, profit, orders, qty, aov }
})

function fmtSummary(metric: string): string {
  const v = summaryTotals.value
  if (metric === 'revenue') return `Rp${formatCurrency(v.revenue)}`
  if (metric === 'profit') return `Rp${formatCurrency(v.profit)}`
  if (metric === 'orders') return formatCurrency(v.orders)
  if (metric === 'qty') return formatCurrency(v.qty)
  if (metric === 'aov') return `Rp${formatCurrency(v.aov)}`
  return '—'
}

const tabs = [
  { label: 'Overview', to: '/report/sales/overview' },
  { label: 'ABC Analysis', to: '/report/sales/analysis-abc' },
  { label: 'Per Produk', to: '/report/sales/analysis-per-product' },
  { label: 'Per Source', to: '/report/sales/analysis-per-source' },
  { label: 'Per Tag', to: '/report/sales/analysis-per-tag' },
  { label: 'Per Toko', to: '/report/sales/analysis-per-store' },
  { label: 'Per Kurir', to: '/report/sales/analysis-per-courier' },
]
</script>

<template>
  <div class="space-y-5">
    

    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Analisis Per Produk</h1>
        <p class="mt-0.5 text-sm text-gray-500">Bandingkan performa penjualan antar produk</p>
      </div>
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
 
    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-2">
      <AppFilterSelect
        :model-value="filterProduct"
        :options="productOptions"
        placeholder="Semua Produk"
        multiple
        searchable
        @update:model-value="filterProduct = $event as string[]; onFilterChange()"
        @search="onProductSearch"
      />
      <div class="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="dateType === 'created' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="dateType = 'created'; onFilterChange()"
        >Tgl Order</button>
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="dateType === 'shipped' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="dateType = 'shipped'; onFilterChange()"
        >Tgl Kirim</button>
      </div>
      <AppDateRangePicker
        :model-value="filterDate"
        @update:model-value="filterDate = $event; onFilterChange()"
      />
      <div class="ml-auto flex items-center gap-2">
        <button
          class="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          :disabled="exporting"
          @click="exportData()"
        >
          <Loader2 v-if="exporting" class="h-4 w-4 animate-spin" />
          <Download v-else class="h-4 w-4" />
          Export
        </button>
        <button
          class="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
          @click="fetchData"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <template v-if="loading">
        <div v-for="i in 5" :key="i" class="h-[72px] animate-pulse rounded-xl bg-gray-100" />
      </template>
      <template v-else>
        <div
          v-for="m in availableMetrics"
          :key="m.key"
          class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200"
        >
          <p class="text-xs font-medium text-gray-400">{{ m.label }}</p>
          <p class="mt-1 truncate text-lg font-bold text-gray-900">{{ fmtSummary(m.key) }}</p>
        </div>
      </template>
    </div>

    <!-- Chart Card -->
    <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
      <!-- Toolbar -->
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p class="font-semibold text-gray-900">Tren per Produk</p>
        <div class="flex flex-wrap items-center gap-2">
          <!-- Metric selector -->
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              v-for="m in availableMetrics"
              :key="m.key"
              class="rounded-full border px-2.5 py-1 text-xs font-medium transition-all"
              :class="activeMetric === m.key
                ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'"
              @click="activeMetric = m.key"
            >
              {{ m.label }}
            </button>
          </div>
          <!-- Group by -->
          <div class="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
            <button
              v-for="(gl, g) in ({ daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan' } as Record<'daily'|'weekly'|'monthly', string>)"
              :key="g"
              class="px-2.5 py-1.5 font-medium transition-colors"
              :class="groupBy === g ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
              @click="groupBy = g"
            >
              {{ gl }}
            </button>
          </div>
        </div>
      </div>

      <!-- Product toggle pills -->
      <div v-if="analysisData?.items.length" class="mb-2 flex flex-wrap items-center gap-1.5">
        <button
          v-for="(product, i) in analysisData.items"
          :key="product.product_id"
          class="rounded-full border px-2.5 py-1 text-xs font-medium transition-all"
          :class="activeProducts.includes(product.product_id) ? 'border-transparent text-white shadow-sm' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'"
          :style="activeProducts.includes(product.product_id) ? { backgroundColor: PRODUCT_COLORS[i % PRODUCT_COLORS.length] } : {}"
          @click="toggleProduct(product.product_id)"
        >
          {{ product.product_name }}
        </button>
      </div>

      <DashboardLineChart
        :labels="chartLabels"
        :series="chartSeries"
        :loading="loading"
        :left-format="chartFormatter"
        :height="220"
      />
    </div>

    <!-- Pivot Table: dates as rows, products as columns -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="border-b border-gray-100 px-4 py-3">
        <p class="font-semibold text-gray-900">Tabel Perbandingan</p>
        <p class="mt-0.5 text-xs text-gray-400">Tanggal sebagai baris · Produk sebagai kolom · Tren dibandingkan periode sebelumnya</p>
      </div>
      <div class="overflow-x-auto">
        <div v-if="loading" class="space-y-2 p-4">
          <div v-for="i in 4" :key="i" class="h-10 animate-pulse rounded bg-gray-100" />
        </div>
        <table v-else-if="pivotDates.length && pivotProducts.length" class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/70 text-xs text-gray-500">
              <th class="whitespace-nowrap px-4 py-2.5 text-left">Tanggal</th>
              <th
                v-for="(product, pIdx) in pivotProducts"
                :key="product.product_id"
                class="whitespace-nowrap px-4 py-2.5 text-right"
              >
                <div class="inline-flex items-center gap-1.5">
                  <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: PRODUCT_COLORS[pIdx % PRODUCT_COLORS.length] }" />
                  {{ product.product_name }}
                </div>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr
              v-for="(dateItem, dIdx) in pivotDates"
              :key="dateItem.date"
              class="hover:bg-gray-50/50"
            >
              <td class="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-gray-500">{{ dateItem.label }}</td>
              <td
                v-for="(_, pIdx) in pivotProducts"
                :key="pIdx"
                class="whitespace-nowrap px-4 py-2.5 text-right align-top"
              >
                <div class="text-xs font-medium text-gray-800">{{ fmtCell(pivotVal(pIdx, dIdx)) }}</div>
                <div v-if="dIdx > 0 && cellTrendPct(pIdx, dIdx)" class="mt-0.5 flex items-center justify-end gap-0.5">
                  <TrendingUp v-if="cellTrendDir(pIdx, dIdx) === 'up'" class="h-3 w-3 text-green-500" />
                  <TrendingDown v-else-if="cellTrendDir(pIdx, dIdx) === 'down'" class="h-3 w-3 text-red-400" />
                  <span
                    class="text-[10px] font-medium"
                    :class="cellTrendDir(pIdx, dIdx) === 'up' ? 'text-green-600' : 'text-red-500'"
                  >{{ cellTrendPct(pIdx, dIdx) }}</span>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-gray-200 bg-gray-50">
              <td class="whitespace-nowrap px-4 py-2.5 text-xs font-bold text-gray-700">Total</td>
              <td
                v-for="(total, pIdx) in colTotals"
                :key="pIdx"
                class="whitespace-nowrap px-4 py-2.5 text-right text-xs font-bold text-gray-900"
              >
                {{ fmtCell(total) }}
              </td>
            </tr>
          </tfoot>
        </table>
        <div v-else-if="!loading" class="flex h-28 items-center justify-center text-sm text-gray-400">
          Tidak ada data. Pilih produk dan rentang tanggal.
        </div>
      </div>
    </div>
  </div>
</template>
