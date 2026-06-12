<script setup lang="ts">
import { RefreshCw, TrendingUp, TrendingDown, UserPlus, Users, RotateCcw, Users2, ChevronUp, ChevronDown, Search } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

// ── Types ──────────────────────────────────────────────────────────────────
interface PeriodInfo { label: string; comparison_label: string }
interface SummaryCard {
  label: string; value: string
  comparison_percent: string; comparison_direction: 'up' | 'down' | 'flat'
  comparison_label: string
}
interface ChannelItem {
  store_id: string; shop_name: string
  percentage: string; sales: string; qty: number; orders: number
}
interface CustomerCategoryItem {
  customer_category_id: string; customer_category_name: string
  percentage: string; sales: string; qty: number; orders: number
}
interface CustomerMetric {
  label: string; value: string; comparison_percent: string; comparison_direction: string
}
interface OverviewData {
  period: PeriodInfo
  summary_cards: Record<string, SummaryCard>
  sales_by_channel: { title: string; total_sales: string; items: ChannelItem[] }
  sales_by_customer_category: { title: string; total_sales: string; items: CustomerCategoryItem[] }
  customer_overview: {
    title: string
    new_customers: CustomerMetric; repeat_customers: CustomerMetric
    repeat_rate: CustomerMetric; total_customers: CustomerMetric
  }
}
interface TrendItem {
  date: string; label: string; revenue: string; profit: string; orders: number; aov: string; qty: number
}
interface TopProduct {
  rank: number; product_id: string; product_name: string; image_url: string
  qty: number; orders: number; sales: string; profit: string; customers: number
}
interface TopSku {
  rank: number; sku_id: string; sku: string; variant: string
  product_id: string; product_name: string; image_url: string
  qty: number; orders: number; sales: string; profit: string; customers: number
}
interface DetailColumn { key: string; label: string; type: string; sortable: boolean }
interface DetailSummary {
  total_rows: number; total_qty: number; total_sales: number
  total_discount: number; total_hpp: number; total_profit: number; avg_margin: number
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DetailItem = Record<string, any>
interface DetailData {
  columns: DetailColumn[]
  summary: DetailSummary
  items: DetailItem[]
  pagination: { page: number; limit: number; total: number; total_page: number }
}

// ── State ──────────────────────────────────────────────────────────────────
const api = useApi()
const toast = useToast()

const overviewData = ref<OverviewData | null>(null)
const trendItems = ref<TrendItem[]>([])
const topProducts = ref<Record<string, TopProduct[]>>({})
const topSkus = ref<Record<string, TopSku[]>>({})
const detailData = ref<DetailData | null>(null)

const loadingOverview = ref(false)
const loadingTrends = ref(false)
const loadingTop = ref(false)
const loadingDetail = ref(false)

// Filters
const filterDate = ref({ from: '', to: '' })
const filterStore = ref<string[]>([])
const filterWarehouse = ref<string[]>([])
const filterCustomerCat = ref<string[]>([])
const filterProductCat = ref<string[]>([])

// Filter options
const storeOptions = ref<Array<{ value: string; label: string }>>([])
const warehouseOptions = ref<Array<{ value: string; label: string }>>([])
const customerCatOptions = ref<Array<{ value: string; label: string }>>([])
const productCatOptions = ref<Array<{ value: string; label: string }>>([])

// UI state
type MetricKey = 'revenue' | 'profit' | 'orders' | 'aov' | 'qty'
const METRIC_TYPES: MetricKey[] = ['revenue', 'profit', 'orders', 'aov', 'qty']
const METRIC_AXIS: Record<MetricKey, 'left' | 'right'> = { revenue: 'left', profit: 'left', aov: 'left', orders: 'right', qty: 'right' }
const activeMetrics = ref<MetricKey[]>(['revenue'])

// Detail report state
const detailViewBy = ref<'order' | 'sku' | 'product' | 'category' | 'customer' | 'channel'>('order')
const detailSearch = ref('')
const detailPage = ref(1)
const detailLimit = ref(20)
const detailSortBy = ref('')
const detailSortDir = ref<'asc' | 'desc'>('desc')
const VIEW_BY_OPTIONS = [
  { value: 'order' as const, label: 'Order' },
  { value: 'sku' as const, label: 'SKU' },
  { value: 'product' as const, label: 'Produk' },
  { value: 'category' as const, label: 'Kategori' },
  { value: 'customer' as const, label: 'Customer' },
  { value: 'channel' as const, label: 'Channel' },
]
function toggleMetric(m: MetricKey) {
  const idx = activeMetrics.value.indexOf(m)
  if (idx >= 0) { if (activeMetrics.value.length > 1) activeMetrics.value.splice(idx, 1) }
  else { activeMetrics.value.push(m) }
}
const groupBy = ref<'daily' | 'weekly' | 'monthly'>('daily')
const topMode = ref<'product' | 'sku'>('product')
const compare = ref(false)
const comparisonItems = ref<TrendItem[]>([])
const dateType = ref<'created' | 'shipped'>('shipped')

// ── Params ─────────────────────────────────────────────────────────────────
function buildParams(): Record<string, string> {
  const p: Record<string, string> = {}
  p.date_type = dateType.value
  if (filterDate.value.from) p.date_from = filterDate.value.from
  if (filterDate.value.to) p.date_to = filterDate.value.to
  if (filterStore.value.length) p.store_id = filterStore.value.join(',')
  if (filterWarehouse.value.length) p.warehouse_id = filterWarehouse.value.join(',')
  if (filterCustomerCat.value.length) p.customer_category_id = filterCustomerCat.value.join(',')
  if (filterProductCat.value.length) p.product_category_id = filterProductCat.value.join(',')
  return p
}

// ── Fetch ──────────────────────────────────────────────────────────────────
async function fetchOverview() {
  loadingOverview.value = true
  try {
    const res = await api.get<{ data: OverviewData }>('/reports/sales/overview', buildParams())
    overviewData.value = res.data
  }
  catch (err: any) { toast.error(err.message || 'Gagal memuat overview') }
  finally { loadingOverview.value = false }
}

async function fetchTrends() {
  loadingTrends.value = true
  try {
    const params: Record<string, string> = { ...buildParams(), group_by: groupBy.value }
    if (compare.value) params.compare = 'true'
    const res = await api.get<{ data: { sales_trend: { items: TrendItem[]; comparison_items?: TrendItem[] } } }>(
      '/reports/sales/trends', params,
    )
    trendItems.value = res.data.sales_trend?.items || []
    comparisonItems.value = res.data.sales_trend?.comparison_items || []
  }
  catch (err: any) { toast.error(err.message || 'Gagal memuat tren') }
  finally { loadingTrends.value = false }
}

async function fetchTop() {
  loadingTop.value = true
  try {
    const res = await api.get<{ data: { top_products: Record<string, TopProduct[]>; top_skus: Record<string, TopSku[]> } }>(
      '/reports/sales/top-products', buildParams(),
    )
    topProducts.value = res.data.top_products || {}
    topSkus.value = res.data.top_skus || {}
  }
  catch (err: any) { toast.error(err.message || 'Gagal memuat top produk') }
  finally { loadingTop.value = false }
}

async function fetchDetail() {
  loadingDetail.value = true
  try {
    const params: Record<string, string> = {
      ...buildParams(),
      view_by: detailViewBy.value,
      page: String(detailPage.value),
      limit: String(detailLimit.value),
      sort_dir: detailSortDir.value,
    }
    if (detailSearch.value) params.search = detailSearch.value
    if (detailSortBy.value) params.sort_by = detailSortBy.value
    const res = await api.get<{ data: DetailData }>('/reports/sales/details', params)
    detailData.value = res.data
  }
  catch (err: any) { toast.error(err.message || 'Gagal memuat detail') }
  finally { loadingDetail.value = false }
}

let detailSearchTimer: ReturnType<typeof setTimeout>
function onDetailSearch() {
  clearTimeout(detailSearchTimer)
  detailPage.value = 1
  detailSearchTimer = setTimeout(fetchDetail, 400)
}

function onDetailSort(col: DetailColumn) {
  if (!col.sortable) return
  if (detailSortBy.value === col.key) {
    detailSortDir.value = detailSortDir.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    detailSortBy.value = col.key
    detailSortDir.value = 'desc'
  }
  detailPage.value = 1
  fetchDetail()
}

watch(detailViewBy, () => { detailPage.value = 1; detailSortBy.value = ''; fetchDetail() })

async function fetchOptions() {
  const [stores, warehouses] = await Promise.all([
    api.get<{ data: Array<{ id: string; name: string; shop_name: string }> }>('/stores/public/index').catch(() => ({ data: [] as Array<{ id: string; name: string; shop_name: string }> })),
    api.get<{ data: Array<{ id: string; name: string }> }>('/warehouses/public/index').catch(() => ({ data: [] as Array<{ id: string; name: string }> })),
  ])
  storeOptions.value = (stores.data || []).map(s => ({ value: s.id, label: s.shop_name }))
  warehouseOptions.value = (warehouses.data || []).map(w => ({ value: w.id, label: w.name }))
  // Pre-load category options
  await Promise.all([onCustomerCatSearch(''), onProductCatSearch('')])
}

async function onCustomerCatSearch(q: string) {
  try {
    const res = await api.get<{ data: Array<{ id: string; name: string }> }>('/customers/categories/index', { search: q })
    customerCatOptions.value = (res.data || []).map(c => ({ value: c.id, label: c.name }))
  }
  catch { /* ignore */ }
}

async function onProductCatSearch(q: string) {
  try {
    const res = await api.get<{ data: Array<{ id: string; name: string }> }>('/products/categories/index', { search: q })
    productCatOptions.value = (res.data || []).map(c => ({ value: c.id, label: c.name }))
  }
  catch { /* ignore */ }
}

function refresh() {
  fetchOverview()
  fetchTrends()
  fetchTop()
  fetchDetail()
}

function onFilterChange() { refresh() }

watch(groupBy, fetchTrends)
watch(compare, fetchTrends)

// ── Chart ──────────────────────────────────────────────────────────────────
const METRIC_COLORS: Record<string, string> = {
  revenue: '#2563eb', profit: '#10b981', orders: '#f59e0b', aov: '#8b5cf6', qty: '#ef4444',
}
const METRIC_COMPARE_COLORS: Record<string, string> = {
  revenue: '#93c5fd', profit: '#6ee7b7', orders: '#fcd34d', aov: '#c4b5fd', qty: '#fca5a5',
}

function shortNum(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}M`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}jt`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}rb`
  return String(Math.round(v))
}

function leftFormatter(v: number) { return `Rp${shortNum(v)}` }
function rightFormatter(v: number) { return shortNum(v) }

const trendLabels = computed(() => trendItems.value.map(d => d.label))

function metricValOf(d: TrendItem, m: MetricKey): number {
  switch (m) {
    case 'revenue': return Number(d.revenue)
    case 'profit': return Number(d.profit)
    case 'orders': return d.orders
    case 'aov': return Number(d.aov)
    case 'qty': return d.qty
  }
}

const trendSeries = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any[] = []
  for (const m of activeMetrics.value) {
    result.push({ name: METRIC_LABELS[m], color: METRIC_COLORS[m], axis: METRIC_AXIS[m], data: trendItems.value.map(d => metricValOf(d, m)) })
    if (compare.value && comparisonItems.value.length) {
      result.push({ name: `${METRIC_LABELS[m]} (Prev)`, color: METRIC_COMPARE_COLORS[m] ?? '#93c5fd', axis: METRIC_AXIS[m], data: comparisonItems.value.map(d => metricValOf(d, m)), dashed: true })
    }
  }
  return result
})

// ── Helpers ────────────────────────────────────────────────────────────────
function formatCellValue(col: DetailColumn, val: unknown): string {
  if (val === null || val === undefined) return '-'
  if (col.type === 'currency') return `Rp${formatCurrency(val as number)}`
  if (col.type === 'percentage') return `${Number(val).toFixed(1)}%`
  if (col.type === 'date') return formatDate(val as string)
  return String(val)
}
const CARD_KEYS = ['total_sales', 'total_orders', 'total_profit', 'gross_margin', 'aov'] as const
const METRIC_LABELS: Record<string, string> = {
  revenue: 'Revenue', profit: 'Profit', orders: 'Orders', aov: 'AOV', qty: 'Qty',
}
const BAR_COLORS = ['bg-primary-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500']
const CUSTOMER_METRIC_KEYS = ['new_customers', 'repeat_customers', 'repeat_rate', 'total_customers'] as const

function formatCardValue(key: string, value: string): string {
  if (key === 'gross_margin') return `${Number(value).toFixed(1)}%`
  if (key === 'total_orders') return formatCurrency(value)
  return `Rp${formatCurrency(value)}`
}

function isUp(dir: string) { return dir === 'up' }

const topOrdersList = computed(() => topMode.value === 'product' ? (topProducts.value.by_orders || []) : (topSkus.value.by_orders || []))
const topQtyList = computed(() => topMode.value === 'product' ? (topProducts.value.by_qty || []) : (topSkus.value.by_qty || []))
const topSalesList = computed(() => topMode.value === 'product' ? (topProducts.value.by_sales || []) : (topSkus.value.by_sales || []))
const topProfitList = computed(() => topMode.value === 'product' ? (topProducts.value.by_profit || []) : (topSkus.value.by_profit || []))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function barPct(value: string | number, list: any[], key: string): string {
  const nums = list.map((i: any) => Number(i[key]))
  const max = Math.max(...nums) || 1
  return `${Math.min((Number(value) / max) * 100, 100)}%`
}

const CUSTOMER_ICONS: Record<string, any> = { new_customers: UserPlus, repeat_customers: Users, repeat_rate: RotateCcw, total_customers: Users2 }
const CUSTOMER_ICON_BG: Record<string, string> = { new_customers: 'bg-blue-50', repeat_customers: 'bg-purple-50', repeat_rate: 'bg-orange-50', total_customers: 'bg-teal-50' }
const CUSTOMER_ICON_COLOR: Record<string, string> = { new_customers: 'text-blue-500', repeat_customers: 'text-purple-500', repeat_rate: 'text-orange-500', total_customers: 'text-teal-500' }


const tabs = [
  { label: 'Overview', to: '/report/sales/overview' },
  { label: 'ABC Analysis', to: '/report/sales/analysis-abc' },
  { label: 'Per Produk', to: '/report/sales/analysis-per-product' },
  { label: 'Per Source', to: '/report/sales/analysis-per-source' },
  { label: 'Per Tag', to: '/report/sales/analysis-per-tag' },
  { label: 'Per Toko', to: '/report/sales/analysis-per-store' },
  { label: 'Per Kurir', to: '/report/sales/analysis-per-courier' },
]

onMounted(async () => {
  await fetchOptions()
  refresh()
})
</script>

<template>
  <div class="space-y-5"> 

    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Laporan Penjualan</h1>
        <p class="mt-0.5 text-sm text-gray-500">
          <span v-if="overviewData?.period">{{ overviewData.period.label }}</span>
          <span v-else>Pantau performa penjualan bisnis secara komprehensif</span>
        </p>
      </div>
      <button
        class="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        @click="refresh"
      >
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loadingOverview || loadingTrends || loadingTop }" />
        Refresh
      </button>
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
        :model-value="filterStore"
        :options="storeOptions"
        placeholder="Semua Toko"
        multiple
        @update:model-value="filterStore = $event as string[]; onFilterChange()"
      />
      <AppFilterSelect
        :model-value="filterWarehouse"
        :options="warehouseOptions"
        placeholder="Semua Warehouse"
        multiple
        @update:model-value="filterWarehouse = $event as string[]; onFilterChange()"
      />
      <AppFilterSelect
        :model-value="filterCustomerCat"
        :options="customerCatOptions"
        placeholder="Customer Category"
        multiple
        searchable
        @update:model-value="filterCustomerCat = $event as string[]; onFilterChange()"
        @search="onCustomerCatSearch"
      />
      <!-- <AppFilterSelect
        :model-value="filterProductCat"
        :options="productCatOptions"
        placeholder="Product Category"
        multiple
        searchable
        @update:model-value="filterProductCat = $event as string[]; onFilterChange()"
        @search="onProductCatSearch"
      /> -->
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
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <template v-if="overviewData">
        <div
          v-for="key in CARD_KEYS"
          :key="key"
          class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200"
        >
          <p class="text-xs text-gray-400">{{ overviewData.summary_cards[key]?.label }}</p>
          <p class="mt-0.5 text-xl font-bold text-gray-900">
            {{ formatCardValue(key, overviewData.summary_cards[key]?.value ?? '') }}
          </p>
          <div class="mt-1 flex items-center gap-1 text-xs">
            <TrendingUp
              v-if="isUp(overviewData.summary_cards[key]?.comparison_direction ?? '')"
              class="h-3.5 w-3.5 shrink-0 text-green-500"
            />
            <TrendingDown
              v-else
              class="h-3.5 w-3.5 shrink-0 text-red-400"
            />
            <span
              class="font-medium"
              :class="isUp(overviewData.summary_cards[key]?.comparison_direction ?? '') ? 'text-green-600' : 'text-red-500'"
            >{{ overviewData.summary_cards[key]?.comparison_percent }}%</span>
            <span class="truncate text-gray-400">{{ overviewData.summary_cards[key]?.comparison_label }}</span>
          </div>
        </div>
      </template>
      <template v-else>
        <div v-for="i in 5" :key="i" class="h-24 animate-pulse rounded-xl bg-gray-100" />
      </template>
    </div>

    <!-- Trend (full width) -->
    <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <p class="font-semibold text-gray-900">Tren Penjualan</p>
          <label class="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500 select-none">
            <input v-model="compare" type="checkbox" class="rounded text-primary-600 focus:ring-primary-500">
            Compare
          </label>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              v-for="m in METRIC_TYPES"
              :key="m"
              class="rounded-full border px-2.5 py-1 text-xs font-medium transition-all"
              :class="activeMetrics.includes(m) ? 'border-transparent text-white shadow-sm' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'"
              :style="activeMetrics.includes(m) ? { backgroundColor: METRIC_COLORS[m] } : {}"
              @click="toggleMetric(m)"
            >
              {{ METRIC_LABELS[m] }}
            </button>
          </div>
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
      <!-- Legend -->
      <div class="mb-2 flex flex-wrap items-center gap-3 text-xs">
        <template v-for="m in activeMetrics" :key="m">
          <span class="inline-flex items-center gap-1.5 text-gray-600">
            <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: METRIC_COLORS[m] }" />
            {{ METRIC_LABELS[m] }}
          </span>
          <span v-if="compare && comparisonItems.length" class="inline-flex items-center gap-1.5 text-gray-400">
            <span class="h-2 w-2 rounded-full opacity-60" :style="{ backgroundColor: METRIC_COMPARE_COLORS[m] }" />
            {{ METRIC_LABELS[m] }} (Prev)
          </span>
        </template>
      </div>
      <DashboardLineChart
        :labels="trendLabels"
        :series="trendSeries"
        :loading="loadingTrends"
        :left-format="leftFormatter"
        :right-format="rightFormatter"
        :height="220"
      />
    </div>

    <!-- Sales Breakdown + Customer Overview: 3 columns -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- Sales by Channel -->
      <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <p class="mb-3 text-sm font-semibold text-gray-900">Sales by Channel</p>
        <div v-if="overviewData?.sales_by_channel?.items?.length" class="space-y-3">
          <div
            v-for="(item, i) in overviewData.sales_by_channel.items"
            :key="item.store_id"
            class="text-xs"
          >
            <div class="mb-1 flex items-center justify-between gap-2">
              <div class="flex min-w-0 items-center gap-1.5">
                <span class="h-2 w-2 shrink-0 rounded-full" :class="BAR_COLORS[i % BAR_COLORS.length]" />
                <span class="truncate font-medium text-gray-700">{{ item.shop_name }}</span>
              </div>
              <span class="shrink-0 font-semibold text-gray-900">
                {{ item.percentage }}%
                <span class="font-normal text-gray-400">· Rp{{ formatCurrency(item.sales) }}</span>
              </span>
            </div>
            <div class="h-1.5 w-full rounded-full bg-gray-100">
              <div
                class="h-1.5 rounded-full transition-all"
                :class="BAR_COLORS[i % BAR_COLORS.length]"
                :style="{ width: `${Math.min(Number(item.percentage), 100)}%` }"
              />
            </div>
          </div>
        </div>
        <div v-else-if="loadingOverview" class="space-y-2">
          <div v-for="i in 3" :key="i" class="h-6 animate-pulse rounded bg-gray-100" />
        </div>
        <p v-else class="text-xs text-gray-400">Tidak ada data</p>
      </div>

      <!-- Sales by Customer Category -->
      <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <p class="mb-3 text-sm font-semibold text-gray-900">Sales by Customer Category</p>
        <div v-if="overviewData?.sales_by_customer_category?.items?.length" class="space-y-3">
          <div
            v-for="(item, i) in overviewData.sales_by_customer_category.items"
            :key="item.customer_category_id"
            class="text-xs"
          >
            <div class="mb-1 flex items-center justify-between gap-2">
              <div class="flex min-w-0 items-center gap-1.5">
                <span class="h-2 w-2 shrink-0 rounded-full" :class="BAR_COLORS[i % BAR_COLORS.length]" />
                <span class="truncate font-medium text-gray-700">{{ item.customer_category_name }}</span>
              </div>
              <span class="shrink-0 font-semibold text-gray-900">
                {{ item.percentage }}%
                <span class="font-normal text-gray-400">· Rp{{ formatCurrency(item.sales) }}</span>
              </span>
            </div>
            <div class="h-1.5 w-full rounded-full bg-gray-100">
              <div
                class="h-1.5 rounded-full transition-all"
                :class="BAR_COLORS[i % BAR_COLORS.length]"
                :style="{ width: `${Math.min(Number(item.percentage), 100)}%` }"
              />
            </div>
          </div>
        </div>
        <div v-else-if="loadingOverview" class="space-y-2">
          <div v-for="i in 3" :key="i" class="h-6 animate-pulse rounded bg-gray-100" />
        </div>
        <p v-else class="text-xs text-gray-400">Tidak ada data</p>
      </div>

      <!-- Customer Overview -->
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <p class="mb-5 font-semibold text-gray-900">Customer Overview</p>
        <div v-if="overviewData?.customer_overview" class="space-y-5">
          <div v-for="mk in CUSTOMER_METRIC_KEYS" :key="mk" class="flex items-center gap-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" :class="CUSTOMER_ICON_BG[mk]">
              <component :is="CUSTOMER_ICONS[mk]" class="h-4 w-4" :class="CUSTOMER_ICON_COLOR[mk]" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs text-gray-700">{{ overviewData.customer_overview[mk].label }}</p>
            </div>
            <div class="text-right">
              <p class="text-xl font-bold text-gray-900">
                {{ mk === 'repeat_rate'
                  ? `${Number(overviewData.customer_overview[mk].value).toFixed(1)}%`
                  : formatCurrency(overviewData.customer_overview[mk].value) }}
              </p>
              <div class="flex items-center justify-end gap-0.5 text-xs">
                <TrendingUp v-if="isUp(overviewData.customer_overview[mk].comparison_direction)" class="h-3 w-3 text-green-500" />
                <TrendingDown v-else class="h-3 w-3 text-red-400" />
                <span class="font-semibold" :class="isUp(overviewData.customer_overview[mk].comparison_direction) ? 'text-green-600' : 'text-red-500'">
                  {{ overviewData.customer_overview[mk].comparison_percent }}%
                </span>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="loadingOverview" class="space-y-4">
          <div v-for="i in 4" :key="i" class="h-12 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    </div>

    <!-- Top Products: 4 columns -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <p class="font-semibold text-gray-900">Top Produk</p>
        <div class="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
          <button
            class="px-2.5 py-1.5 font-medium transition-colors"
            :class="topMode === 'product' ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
            @click="topMode = 'product'"
          >Produk</button>
          <button
            class="px-2.5 py-1.5 font-medium transition-colors"
            :class="topMode === 'sku' ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
            @click="topMode = 'sku'"
          >SKU</button>
        </div>
      </div>
      <div v-if="loadingTop" class="grid grid-cols-4 divide-x divide-gray-100 p-4">
        <div v-for="c in 4" :key="c" class="space-y-3 px-4 first:pl-0 last:pr-0">
          <div v-for="i in 5" :key="i" class="h-8 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
      <div v-else class="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        <!-- by_orders -->
        <div class="p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">By Orders</p>
          <div v-if="topOrdersList.length" class="space-y-3">
            <div v-for="item in topOrdersList" :key="item.rank" class="flex items-center gap-2">
              <div class="flex w-8 shrink-0 items-center justify-center">
                <div v-if="item.image_url" class="relative h-8 w-8 overflow-hidden rounded-md bg-gray-100">
                  <img :src="item.image_url" class="h-full w-full object-cover" alt="" />
                  <span
                    class="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-tl-md text-[10px] font-bold leading-none"
                    :class="item.rank === 1 ? 'bg-amber-400 text-white' : item.rank === 2 ? 'bg-slate-400 text-white' : item.rank === 3 ? 'bg-amber-700 text-white' : 'bg-gray-600/70 text-white'"
                  >{{ item.rank }}</span>
                </div>
                <span v-else-if="item.rank <= 3" class="text-[32px] leading-none">{{ ['🥇', '🥈', '🥉'][item.rank - 1] }}</span>
                <span v-else class="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-500">{{ item.rank }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="mb-1 flex items-center justify-between gap-1">
                  <div class="min-w-0">
                    <p class="truncate text-xs font-medium text-gray-800">{{ item.product_name }}</p>
                    <p v-if="topMode === 'sku'" class="truncate text-xs text-gray-400">{{ (item as any).variant }}</p>
                  </div>
                  <span class="shrink-0 text-xs font-bold text-gray-700">{{ item.orders }}</span>
                </div>
                <div class="h-1 w-full rounded-full bg-gray-100">
                  <div class="h-1 rounded-full bg-violet-400" :style="{ width: barPct(item.orders, topOrdersList, 'orders') }" />
                </div>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">Tidak ada data</p>
        </div>
        <!-- by_qty -->
        <div class="p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">By Qty</p>
          <div v-if="topQtyList.length" class="space-y-3">
            <div v-for="item in topQtyList" :key="item.rank" class="flex items-center gap-2">
              <div class="flex w-8 shrink-0 items-center justify-center">
                <div v-if="item.image_url" class="relative h-8 w-8 overflow-hidden rounded-md bg-gray-100">
                  <img :src="item.image_url" class="h-full w-full object-cover" alt="" />
                  <span
                    class="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-tl-md text-[10px] font-bold leading-none"
                    :class="item.rank === 1 ? 'bg-amber-400 text-white' : item.rank === 2 ? 'bg-slate-400 text-white' : item.rank === 3 ? 'bg-amber-700 text-white' : 'bg-gray-600/70 text-white'"
                  >{{ item.rank }}</span>
                </div>
                <span v-else-if="item.rank <= 3" class="text-[32px] leading-none">{{ ['🥇', '🥈', '🥉'][item.rank - 1] }}</span>
                <span v-else class="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-500">{{ item.rank }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="mb-1 flex items-center justify-between gap-1">
                  <div class="min-w-0">
                    <p class="truncate text-xs font-medium text-gray-800">{{ item.product_name }}</p>
                    <p v-if="topMode === 'sku'" class="truncate text-xs text-gray-400">{{ (item as any).variant }}</p>
                  </div>
                  <span class="shrink-0 text-xs font-bold text-gray-700">{{ item.qty }}</span>
                </div>
                <div class="h-1 w-full rounded-full bg-gray-100">
                  <div class="h-1 rounded-full bg-primary-400" :style="{ width: barPct(item.qty, topQtyList, 'qty') }" />
                </div>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">Tidak ada data</p>
        </div>
        <!-- by_sales -->
        <div class="p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">By Sales</p>
          <div v-if="topSalesList.length" class="space-y-3">
            <div v-for="item in topSalesList" :key="item.rank" class="flex items-center gap-2">
              <div class="flex w-8 shrink-0 items-center justify-center">
                <div v-if="item.image_url" class="relative h-8 w-8 overflow-hidden rounded-md bg-gray-100">
                  <img :src="item.image_url" class="h-full w-full object-cover" alt="" />
                  <span
                    class="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-tl-md text-[10px] font-bold leading-none"
                    :class="item.rank === 1 ? 'bg-amber-400 text-white' : item.rank === 2 ? 'bg-slate-400 text-white' : item.rank === 3 ? 'bg-amber-700 text-white' : 'bg-gray-600/70 text-white'"
                  >{{ item.rank }}</span>
                </div>
                <span v-else-if="item.rank <= 3" class="text-[32px] leading-none">{{ ['🥇', '🥈', '🥉'][item.rank - 1] }}</span>
                <span v-else class="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-500">{{ item.rank }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="mb-1 flex items-center justify-between gap-1">
                  <div class="min-w-0">
                    <p class="truncate text-xs font-medium text-gray-800">{{ item.product_name }}</p>
                    <p v-if="topMode === 'sku'" class="truncate text-xs text-gray-400">{{ (item as any).variant }}</p>
                  </div>
                  <span class="shrink-0 text-xs font-bold text-gray-700">Rp{{ formatCurrency(item.sales) }}</span>
                </div>
                <div class="h-1 w-full rounded-full bg-gray-100">
                  <div class="h-1 rounded-full bg-green-400" :style="{ width: barPct(item.sales, topSalesList, 'sales') }" />
                </div>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">Tidak ada data</p>
        </div>
        <!-- by_profit -->
        <div class="p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">By Profit</p>
          <div v-if="topProfitList.length" class="space-y-3">
            <div v-for="item in topProfitList" :key="item.rank" class="flex items-center gap-2">
              <div class="flex w-8 shrink-0 items-center justify-center">
                <div v-if="item.image_url" class="relative h-8 w-8 overflow-hidden rounded-md bg-gray-100">
                  <img :src="item.image_url" class="h-full w-full object-cover" alt="" />
                  <span
                    class="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-tl-md text-[10px] font-bold leading-none"
                    :class="item.rank === 1 ? 'bg-amber-400 text-white' : item.rank === 2 ? 'bg-slate-400 text-white' : item.rank === 3 ? 'bg-amber-700 text-white' : 'bg-gray-600/70 text-white'"
                  >{{ item.rank }}</span>
                </div>
                <span v-else-if="item.rank <= 3" class="text-[32px] leading-none">{{ ['🥇', '🥈', '🥉'][item.rank - 1] }}</span>
                <span v-else class="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-500">{{ item.rank }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="mb-1 flex items-center justify-between gap-1">
                  <div class="min-w-0">
                    <p class="truncate text-xs font-medium text-gray-800">{{ item.product_name }}</p>
                    <p v-if="topMode === 'sku'" class="truncate text-xs text-gray-400">{{ (item as any).variant }}</p>
                  </div>
                  <span class="shrink-0 text-xs font-bold text-green-700">Rp{{ formatCurrency(item.profit) }}</span>
                </div>
                <div class="h-1 w-full rounded-full bg-gray-100">
                  <div class="h-1 rounded-full bg-orange-400" :style="{ width: barPct(item.profit, topProfitList, 'profit') }" />
                </div>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">Tidak ada data</p>
        </div>
      </div>
    </div>

    <!-- Detail Report -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <p class="font-semibold text-gray-900">Detail Report</p>
        <div class="flex flex-wrap items-center gap-2">
          <!-- View By -->
          <div class="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
            <button
              v-for="opt in VIEW_BY_OPTIONS"
              :key="opt.value"
              class="px-2.5 py-1.5 font-medium transition-colors"
              :class="detailViewBy === opt.value ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
              @click="detailViewBy = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
          <!-- Search -->
          <div class="relative">
            <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              v-model="detailSearch"
              type="text"
              placeholder="Cari..."
              class="w-44 rounded-lg border border-gray-200 bg-white py-1.5 pl-7 pr-3 text-xs outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-300"
              @input="onDetailSearch"
            />
          </div>
        </div>
      </div>

      <!-- Summary bar -->
      <div v-if="detailData?.summary" class="flex flex-wrap gap-x-6 gap-y-1 border-b border-gray-100 bg-gray-50/70 px-4 py-2 text-xs text-gray-500">
        <span>Rows: <strong class="text-gray-800">{{ detailData.summary.total_rows }}</strong></span>
        <span>Qty: <strong class="text-gray-800">{{ detailData.summary.total_qty }}</strong></span>
        <span>Sales: <strong class="text-gray-800">Rp{{ formatCurrency(detailData.summary.total_sales) }}</strong></span>
        <span>Discount: <strong class="text-red-600">Rp{{ formatCurrency(detailData.summary.total_discount) }}</strong></span>
        <span>HPP: <strong class="text-gray-800">Rp{{ formatCurrency(detailData.summary.total_hpp) }}</strong></span>
        <span>Profit: <strong class="text-green-700">Rp{{ formatCurrency(detailData.summary.total_profit) }}</strong></span>
        <span>Avg Margin: <strong class="text-primary-700">{{ detailData.summary.avg_margin.toFixed(1) }}%</strong></span>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <div v-if="loadingDetail" class="space-y-2 p-4">
          <div v-for="i in 5" :key="i" class="h-9 animate-pulse rounded bg-gray-100" />
        </div>
        <table v-else-if="detailData?.items?.length" class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/70 text-left text-xs text-gray-500">
              <th
                v-for="col in detailData.columns"
                :key="col.key"
                class="whitespace-nowrap px-4 py-2.5"
                :class="[
                  col.type === 'currency' || col.type === 'number' || col.type === 'percentage' ? 'text-right' : '',
                  col.sortable ? 'cursor-pointer select-none hover:text-gray-800' : '',
                ]"
                @click="onDetailSort(col)"
              >
                <span class="inline-flex items-center gap-0.5">
                  {{ col.label }}
                  <template v-if="col.sortable">
                    <ChevronUp v-if="detailSortBy === col.key && detailSortDir === 'asc'" class="h-3 w-3 text-primary-600" />
                    <ChevronDown v-else-if="detailSortBy === col.key && detailSortDir === 'desc'" class="h-3 w-3 text-primary-600" />
                    <ChevronDown v-else class="h-3 w-3 opacity-20" />
                  </template>
                </span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="(item, idx) in detailData.items" :key="idx" class="hover:bg-gray-50/60">
              <td
                v-for="col in detailData.columns"
                :key="col.key"
                class="whitespace-nowrap px-4 py-2.5 text-xs"
                :class="[
                  col.type === 'currency' || col.type === 'number' || col.type === 'percentage' ? 'text-right' : 'text-gray-700',
                  col.key === 'total_profit' ? 'font-medium text-green-700' : '',
                  col.key === 'margin' ? 'text-primary-700' : '',
                ]"
              >
                <span v-if="col.key === 'status'">
                  <span
                    class="rounded-full px-2 py-0.5 text-xs font-medium ring-1"
                    :class="['shipped', 'delivered', 'completed'].includes(item[col.key])
                      ? 'bg-green-50 text-green-700 ring-green-200'
                      : ['cancelled', 'returned'].includes(item[col.key])
                        ? 'bg-red-50 text-red-600 ring-red-200'
                        : 'bg-amber-50 text-amber-700 ring-amber-200'"
                  >{{ item[col.key] }}</span>
                </span>
                <span v-else>{{ formatCellValue(col, item[col.key]) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else-if="!loadingDetail" class="flex h-28 items-center justify-center text-sm text-gray-400">
          Tidak ada data
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="detailData?.pagination && detailData.pagination.total_page > 0" class="border-t border-gray-100 px-4 py-3">
        <AppPagination
          :page="detailData.pagination.page"
          :total-page="detailData.pagination.total_page"
          :total="detailData.pagination.total"
          :per-page="detailData.pagination.limit"
          :loading="loadingDetail"
          @update:page="detailPage = $event; fetchDetail()"
          @update:per-page="detailLimit = $event; detailPage = 1; fetchDetail()"
        />
      </div>
    </div>
  </div>
</template>
