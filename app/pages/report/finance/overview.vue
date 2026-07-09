<script setup lang="ts">
import {
  RefreshCw, TrendingUp, TrendingDown,
  ShoppingBag, Truck, Wallet,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

// ── Types ──────────────────────────────────────────────────────────────────────
interface SummaryCard {
  label: string
  description: string
  value: string
  percentage: string
  comparison_percentage: string
  comparison_direction: 'up' | 'down' | 'flat'
  comparison_label: string
}

interface ReceivableEntry {
  label: string
  orders: number
  amount: string
  percentage: string
}

interface PendingByChannelItem {
  store_id: string
  shop_name: string
  total_pending: string
  orders: number
  percentage: string
}

interface WaterfallItem {
  key: string
  label: string
  value: string
  type: 'positive' | 'negative' | 'result'
}

interface FeeBreakdownItem {
  category: string
  label: string
  amount: string
  percentage: string
  percentage_of_sales: string
}

interface ShippingInsightEntry {
  label: string
  orders?: number
  amount: string
  percentage?: string
}

interface CodVsNonCodItem {
  cod: boolean
  label: string
  gross_sales: string
  settlement: string
  cogs: string
  fees: string
  profit: string
  margin: string
}

interface ProfitByStoreItem {
  store_id: string
  shop_name: string
  gross_sales: string
  settlement: string
  cogs: string
  fees: string
  profit: string
  margin: string
  percentage_of_total_profit: string
}

interface ReturnImpact {
  title: string
  description: string
  returned_orders: number
  return_packages: number
  returned_qty: number
  returned_gross_sales: string
  returned_settlement: string
  returned_cogs: string
  return_shipping_fee: string
  other_return_fee: string
  lost_gross_profit: string
  total_return_impact: string
}

interface PeriodInfo {
  label: string
  comparison_label: string
  date_from: string
  date_to: string
}

interface OverviewData {
  period: PeriodInfo
  summary_cards: Record<string, SummaryCard>
  receivable: {
    title: string
    description: string
    marketplace_pending: ReceivableEntry
    cod_pending: ReceivableEntry
    total_pending: ReceivableEntry
  }
  pending_by_channel: { items: PendingByChannelItem[] }
  profit_waterfall: { items: WaterfallItem[] }
  fee_breakdown: { total_fees: string; items: FeeBreakdownItem[] }
  shipping_insight: {
    customer_shipping_fee: ShippingInsightEntry
    actual_shipping_fee: ShippingInsightEntry
    shipping_fee_difference: ShippingInsightEntry
  }
  cod_fee_insight: {
    customer_cod_fee: ShippingInsightEntry
    actual_cod_fee: ShippingInsightEntry
    cod_fee_difference: ShippingInsightEntry
  }
  cod_vs_non_cod: { items: CodVsNonCodItem[] }
  profit_by_store: { items: ProfitByStoreItem[] }
  return_impact: ReturnImpact
}

interface TrendItem {
  date: string
  label: string
  gross_sales: string
  settlement: string
  cogs: string
  fees: string
  profit: string
  margin: string
}

interface TrendData {
  series: Array<{ key: string; label: string; type: string }>
  items: TrendItem[]
  totals: Record<string, string>
}

// ── State ──────────────────────────────────────────────────────────────────────
const api = useApi()
const toast = useToast()

const overviewData = ref<OverviewData | null>(null)
const trendData = ref<TrendData | null>(null)
const loadingOverview = ref(false)
const loadingTrends = ref(false)

// Filters
const filterDate = ref({ from: '', to: '' })
const filterStore = ref<string[]>([])
const filterCod = ref('')
const filterCustomerCat = ref<string[]>([])
const dateType = ref<'created' | 'shipped' | 'paid'>('created')
const groupBy = ref<'daily' | 'weekly' | 'monthly'>('daily')

// Filter options
const storeOptions = ref<Array<{ value: string; label: string }>>([])
const customerCatOptions = ref<Array<{ value: string; label: string }>>([])
const codOptions = [
  { value: 'yes', label: 'COD' },
  { value: 'no', label: 'Non-COD' },
]

// Chart state
type MetricKey = 'gross_sales' | 'settlement' | 'cogs' | 'fees' | 'profit' | 'margin'
const ALL_METRICS: MetricKey[] = ['gross_sales', 'settlement', 'cogs', 'fees', 'profit', 'margin']
const activeMetrics = ref<MetricKey[]>(['gross_sales', 'settlement', 'profit'])

const METRIC_LABELS: Record<MetricKey, string> = {
  gross_sales: 'Gross Sales',
  settlement: 'Settlement',
  cogs: 'HPP/COGS',
  fees: 'Fees',
  profit: 'Net Profit',
  margin: 'Margin %',
}
const METRIC_COLORS: Record<MetricKey, string> = {
  gross_sales: '#2563eb',
  settlement: '#10b981',
  cogs: '#f59e0b',
  fees: '#ef4444',
  profit: '#8b5cf6',
  margin: '#ec4899',
}
const METRIC_AXIS: Record<MetricKey, 'left' | 'right'> = {
  gross_sales: 'left', settlement: 'left', cogs: 'left',
  fees: 'left', profit: 'left', margin: 'right',
}

const BAR_COLORS = ['bg-primary-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500']

const FEE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#94a3b8', '#f87171']

const WATERFALL_SUBLABELS: Record<string, string> = {
  gross_sales: 'Dari Order',
  total_fees: 'Semua Biaya',
  settlement: 'Uang Diterima',
  cogs: 'Modal Barang',
  profit: 'Laba Bersih',
}

const waterfallMaxValue = computed(() =>
  overviewData.value?.profit_waterfall?.items?.length
    ? Math.max(...overviewData.value.profit_waterfall.items.map(i => Math.abs(Number(i.value))), 1)
    : 1,
)

const feeDonutStyle = computed(() => {
  const items = (overviewData.value?.fee_breakdown?.items ?? []).filter(i => Number(i.amount) !== 0)
  if (!items.length) return { background: '#e5e7eb' }
  let cur = 0
  const stops = items.map((item, idx) => {
    const pct = Number(item.percentage)
    const start = cur; cur += pct
    return `${FEE_COLORS[idx % FEE_COLORS.length]} ${start}% ${cur}%`
  })
  return { background: `conic-gradient(${stops.join(', ')})` }
})

const COD_COLORS = ['#f97316', '#94a3b8']
const STORE_CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4']

const codDonutStyle = computed(() => {
  const items = overviewData.value?.cod_vs_non_cod?.items ?? []
  if (!items.length) return { background: '#e5e7eb' }
  const total = items.reduce((s, i) => s + Math.abs(Number(i.gross_sales)), 0) || 1
  let cur = 0
  const stops = items.map((item, idx) => {
    const pct = (Math.abs(Number(item.gross_sales)) / total) * 100
    const start = cur; cur += pct
    return `${COD_COLORS[idx % COD_COLORS.length]} ${start.toFixed(1)}% ${cur.toFixed(1)}%`
  })
  return { background: `conic-gradient(${stops.join(', ')})` }
})

const storeDonutStyle = computed(() => {
  const items = overviewData.value?.profit_by_store?.items ?? []
  if (!items.length) return { background: '#e5e7eb' }
  let cur = 0
  const stops = items.map((item, idx) => {
    const pct = Math.abs(Number(item.percentage_of_total_profit))
    const start = cur; cur += pct
    return `${STORE_CHART_COLORS[idx % STORE_CHART_COLORS.length]} ${start.toFixed(1)}% ${Math.min(cur, 100).toFixed(1)}%`
  })
  if (cur < 99.5) stops.push(`#e5e7eb ${cur.toFixed(1)}% 100%`)
  return { background: `conic-gradient(${stops.join(', ')})` }
})

const CARD_KEYS: (keyof OverviewData['summary_cards'])[] = [
  'total_gross_sales', 'total_settlement', 'total_cogs', 'total_fees', 'total_profit', 'profit_margin',
]

// ── Params ─────────────────────────────────────────────────────────────────────
function buildParams(): Record<string, string> {
  const p: Record<string, string> = {}
  p.date_type = dateType.value
  if (filterDate.value.from) p.date_from = filterDate.value.from
  if (filterDate.value.to) p.date_to = filterDate.value.to
  if (filterStore.value.length) p.store_id = filterStore.value.join(',')
  if (filterCod.value) p.cod = filterCod.value
  if (filterCustomerCat.value.length) p.customer_category_id = filterCustomerCat.value.join(',')
  return p
}

// ── Fetch ──────────────────────────────────────────────────────────────────────
async function fetchOverview() {
  loadingOverview.value = true
  try {
    const res = await api.get<{ data: OverviewData }>('/reports/finances/overview', buildParams())
    overviewData.value = res.data
  }
  catch (err: any) { toast.error(err?.message || 'Gagal memuat laporan keuangan') }
  finally { loadingOverview.value = false }
}

async function fetchTrends() {
  loadingTrends.value = true
  try {
    const params = { ...buildParams(), group_by: groupBy.value }
    const res = await api.get<{ data: TrendData }>('/reports/finances/trends', params)
    trendData.value = res.data
  }
  catch (err: any) { toast.error(err?.message || 'Gagal memuat tren keuangan') }
  finally { loadingTrends.value = false }
}

async function fetchOptions() {
  try {
    const res = await api.get<{ data: Array<{ id: string; shop_name: string }> }>('/stores/public/index')
    storeOptions.value = (res.data || []).map(s => ({ value: s.id, label: s.shop_name }))
  }
  catch { /* ignore */ }
  await onCustomerCatSearch('')
}

async function onCustomerCatSearch(q: string) {
  try {
    const res = await api.get<{ data: Array<{ id: string; name: string }> }>('/customers/categories/index', { search: q })
    customerCatOptions.value = (res.data || []).map(c => ({ value: c.id, label: c.name }))
  }
  catch { /* ignore */ }
}

function refresh() {
  fetchOverview()
  fetchTrends()
}

function onFilterChange() { refresh() }
watch(groupBy, fetchTrends)

// ── Chart helpers ──────────────────────────────────────────────────────────────
function toggleMetric(m: MetricKey) {
  const idx = activeMetrics.value.indexOf(m)
  if (idx >= 0) { if (activeMetrics.value.length > 1) activeMetrics.value.splice(idx, 1) }
  else activeMetrics.value.push(m)
}

const trendLabels = computed(() => trendData.value?.items.map(d => d.label) ?? [])
const trendSeries = computed(() => {
  if (!trendData.value) return []
  return activeMetrics.value.map(m => ({
    name: METRIC_LABELS[m],
    color: METRIC_COLORS[m],
    axis: METRIC_AXIS[m],
    data: trendData.value!.items.map(d => Number(d[m]) || 0),
  }))
})

function shortNum(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}M`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}jt`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}rb`
  return String(Math.round(v))
}
function leftFormatter(v: number) { return `Rp${shortNum(v)}` }
function rightFormatter(v: number) { return `${v.toFixed(1)}%` }

// ── Formatters ─────────────────────────────────────────────────────────────────
function fmtCard(key: string, value: string): string {
  if (key === 'profit_margin') return `${Number(value).toFixed(1)}%`
  const n = Number(value)
  return `${n < 0 ? '-' : ''}Rp${formatCurrency(Math.abs(n))}`
}

function isUp(dir?: string) { return dir === 'up' }
function isDown(dir?: string) { return dir === 'down' }

function fmtAmt(v: string | number) {
  const n = Number(v)
  return `${n < 0 ? '-' : ''}Rp${formatCurrency(Math.abs(n))}`
}

function fmtPct(v: string | number, suffix = '%') {
  return `${Number(v).toFixed(1)}${suffix}`
}

const tabs = [
  { label: 'Overview', to: '/report/finance/overview' },
  { label: 'Laba Rugi', to: '/report/finance/profit-loss' },
  { label: 'Dompet', to: '/wallet' },
  { label: 'History Transaksi', to: '/wallet/history' },
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
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Laporan Keuangan</h1>
        <p class="mt-0.5 text-sm text-gray-500">
          <span v-if="overviewData?.period">{{ overviewData.period.label }}</span>
          <span v-else>Analisis keuangan bisnis secara komprehensif</span>
        </p>
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
        :model-value="filterStore"
        :options="storeOptions"
        placeholder="Semua Toko"
        multiple
        @update:model-value="filterStore = $event as string[]; onFilterChange()"
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
      <AppFilterSelect
        :model-value="filterCod"
        :options="codOptions"
        :searchable="false"
        placeholder="COD / Non-COD"
        @update:model-value="filterCod = $event as string; onFilterChange()"
      />
      <div class="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
        <button
          v-for="(lbl, val) in { created: 'Tgl Order', shipped: 'Tgl Kirim', paid: 'Tgl Bayar' }"
          :key="val"
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="dateType === val ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="dateType = val as typeof dateType; onFilterChange()"
        >{{ lbl }}</button>
      </div>
      <AppDateRangePicker
        :model-value="filterDate"
        @update:model-value="filterDate = $event; onFilterChange()"
      />
      <div class="ml-auto flex items-center gap-2"> 
        <button
            class="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
            @click="refresh"
        >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loadingOverview || loadingTrends }" />
            Refresh
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <template v-if="overviewData">
        <div
          v-for="key in CARD_KEYS"
          :key="key"
          class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200"
        >
          <p class="text-xs font-medium text-gray-500">{{ overviewData.summary_cards?.[key]?.label }}</p>
          <p
            class="mt-0.5 text-lg font-bold"
            :class="Number(overviewData.summary_cards?.[key]?.value) < 0 ? 'text-red-600' : 'text-gray-900'"
          >
            {{ fmtCard(key, overviewData.summary_cards?.[key]?.value ?? '0') }}
          </p>
          <p class="mt-0.5 text-[10px] text-gray-400">{{ overviewData.summary_cards?.[key]?.percentage }}% of gross</p>
          <div class="mt-1.5 flex items-center gap-1 text-xs">
            <TrendingUp
              v-if="isUp(overviewData.summary_cards?.[key]?.comparison_direction)"
              class="h-3.5 w-3.5 shrink-0 text-green-500"
            />
            <TrendingDown
              v-else-if="isDown(overviewData.summary_cards?.[key]?.comparison_direction)"
              class="h-3.5 w-3.5 shrink-0 text-red-400"
            />
            <span
              class="font-medium"
              :class="isUp(overviewData.summary_cards?.[key]?.comparison_direction) ? 'text-green-600' : 'text-red-500'"
            >{{ overviewData.summary_cards?.[key]?.comparison_percentage }}%</span>
            <span class="truncate text-[10px] text-gray-400">{{ overviewData.summary_cards?.[key]?.comparison_label }}</span>
          </div>
        </div>
      </template>
      <template v-else>
        <div v-for="i in 6" :key="i" class="h-24 animate-pulse rounded-xl bg-gray-100" />
      </template>
    </div>

    <!-- Trend Chart -->
    <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p class="font-semibold text-gray-900">Tren Keuangan</p>
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex flex-wrap items-center gap-1">
            <button
              v-for="m in ALL_METRICS"
              :key="m"
              class="rounded-full border px-2.5 py-1 text-xs font-medium transition-all"
              :class="activeMetrics.includes(m) ? 'border-transparent text-white' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'"
              :style="activeMetrics.includes(m) ? { backgroundColor: METRIC_COLORS[m] } : {}"
              @click="toggleMetric(m)"
            >{{ METRIC_LABELS[m] }}</button>
          </div>
          <div class="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
            <button
              v-for="(gl, g) in ({ daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan' } as const)"
              :key="g"
              class="px-2.5 py-1.5 font-medium transition-colors"
              :class="groupBy === g ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
              @click="groupBy = g"
            >{{ gl }}</button>
          </div>
        </div>
      </div>
      <div class="mb-2 flex flex-wrap items-center gap-3 text-xs">
        <span
          v-for="m in activeMetrics"
          :key="m"
          class="inline-flex items-center gap-1.5 text-gray-600"
        >
          <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: METRIC_COLORS[m] }" />
          {{ METRIC_LABELS[m] }}
        </span>
      </div>
      <DashboardLineChart
        :labels="trendLabels"
        :series="trendSeries"
        :loading="loadingTrends"
        :left-format="leftFormatter"
        :right-format="rightFormatter"
        :height="220"
      />
      <!-- Trend totals -->
      <div v-if="trendData?.totals" class="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 sm:grid-cols-6">
        <div v-for="m in ALL_METRICS" :key="m" class="text-center">
          <p class="text-[10px] text-gray-400">{{ METRIC_LABELS[m] }}</p>
          <p class="text-xs font-semibold" :class="Number(trendData.totals[m]) < 0 ? 'text-red-600' : 'text-gray-800'">
            {{ m === 'margin' ? fmtPct(trendData.totals[m] ?? 0) : fmtAmt(trendData.totals[m] ?? 0) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Waterfall + Receivable -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- Profit Waterfall -->
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <div class="mb-4 flex items-center justify-between">
          <p class="font-semibold text-gray-900">Profit Breakdown</p>
          <span class="text-xs text-gray-400">Dalam Rupiah</span>
        </div>
        <div v-if="overviewData?.profit_waterfall?.items?.length">
          <div class="flex items-end justify-around gap-2" style="height: 148px">
            <div
              v-for="item in overviewData.profit_waterfall.items"
              :key="item.key"
              class="flex flex-1 flex-col items-center"
            >
              <span
                class="mb-1 text-center text-[10px] font-semibold leading-tight"
                :class="item.type === 'negative' ? 'text-red-500' : 'text-gray-700'"
              >{{ fmtAmt(item.value) }}</span>
              <div
                class="w-full rounded-t transition-all"
                :class="{
                  'bg-emerald-500': item.type === 'positive' || item.type === 'result',
                  'bg-red-400': item.type === 'negative',
                }"
                :style="{ height: `${Math.max(6, (Math.abs(Number(item.value)) / waterfallMaxValue) * 108)}px` }"
              />
            </div>
          </div>
          <div class="mt-2 flex justify-around gap-2 border-t border-gray-100 pt-3">
            <div
              v-for="item in overviewData.profit_waterfall.items"
              :key="item.key + '_lbl'"
              class="flex-1 text-center"
            >
              <p class="text-[10px] font-medium leading-tight text-gray-700">{{ item.label }}</p>
              <p class="text-[9px] text-gray-400">{{ WATERFALL_SUBLABELS[item.key] ?? '' }}</p>
            </div>
          </div>
        </div>
        <div v-else class="space-y-2">
          <div v-for="i in 5" :key="i" class="h-6 animate-pulse rounded bg-gray-100" />
        </div>
      </div>

      <!-- Receivable -->
      <div class="overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="border-b border-gray-100 px-5 py-3.5">
          <p class="font-semibold text-gray-900">{{ overviewData?.receivable?.title || 'Receivable / Belum Cair' }}</p>
          <p v-if="overviewData?.receivable?.description" class="text-xs text-gray-400">{{ overviewData.receivable.description }}</p>
        </div>
        <template v-if="overviewData?.receivable">
          <!-- 3 Summary Tiles -->
          <div class="grid grid-cols-3 divide-x divide-gray-100">
            <div class="p-4">
              <div class="mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <ShoppingBag class="h-5 w-5 text-blue-500" />
              </div>
              <p class="text-[11px] leading-tight text-gray-500">{{ overviewData.receivable.marketplace_pending.label }}</p>
              <p class="mt-1 text-base font-bold text-gray-900">{{ fmtAmt(overviewData.receivable.marketplace_pending.amount) }}</p>
              <p class="mt-0.5 text-[11px] text-gray-400">{{ overviewData.receivable.marketplace_pending.orders }} Orders</p>
            </div>
            <div class="p-4">
              <div class="mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
                <Truck class="h-5 w-5 text-orange-500" />
              </div>
              <p class="text-[11px] leading-tight text-gray-500">{{ overviewData.receivable.cod_pending.label }}</p>
              <p class="mt-1 text-base font-bold text-gray-900">{{ fmtAmt(overviewData.receivable.cod_pending.amount) }}</p>
              <p class="mt-0.5 text-[11px] text-gray-400">{{ overviewData.receivable.cod_pending.orders }} Orders</p>
            </div>
            <div class="bg-green-50 p-4">
              <div class="mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-green-100">
                <Wallet class="h-5 w-5 text-green-600" />
              </div>
              <p class="text-[11px] leading-tight text-green-700">{{ overviewData.receivable.total_pending.label }}</p>
              <p class="mt-1 text-base font-bold text-green-700">{{ fmtAmt(overviewData.receivable.total_pending.amount) }}</p>
              <p class="mt-0.5 text-[11px] text-green-600">{{ overviewData.receivable.total_pending.orders }} Orders</p>
            </div>
          </div>
          <!-- Channel Table -->
          <div v-if="overviewData.pending_by_channel?.items?.length" class="border-t border-gray-100">
            <table class="w-full text-xs">
              <thead class="bg-gray-50 text-gray-500">
                <tr>
                  <th class="px-4 py-2.5 text-left font-medium">Channel</th>
                  <th class="px-4 py-2.5 text-right font-medium">Total Pending</th>
                  <th class="px-4 py-2.5 text-right font-medium">Orders</th>
                  <th class="px-4 py-2.5 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="ch in overviewData.pending_by_channel.items"
                  :key="ch.store_id"
                  class="border-t border-gray-100 hover:bg-gray-50/50"
                >
                  <td class="px-4 py-2.5 font-medium text-gray-800">{{ ch.shop_name }}</td>
                  <td class="px-4 py-2.5 text-right font-semibold text-gray-900">{{ fmtAmt(ch.total_pending) }}</td>
                  <td class="px-4 py-2.5 text-right text-gray-500">{{ ch.orders }}</td>
                  <td class="px-4 py-2.5 text-right text-gray-400">{{ fmtPct(ch.percentage) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <div v-else class="space-y-2 p-5">
          <div v-for="i in 3" :key="i" class="h-14 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    </div>

    <!-- Fee Breakdown + Shipping Insight + COD Fee -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- Fee Breakdown -->
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <div class="mb-4 flex items-center justify-between">
          <p class="font-semibold text-gray-900">Breakdown Biaya</p>
          <span class="text-xs text-gray-400">Semua Biaya</span>
        </div>
        <template v-if="overviewData?.fee_breakdown?.items">
          <div class="flex items-center gap-4">
            <!-- Donut Chart -->
            <div class="relative h-28 w-28 shrink-0">
              <div class="h-full w-full rounded-full" :style="feeDonutStyle" />
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-white text-center">
                  <p class="text-[9px] leading-tight text-gray-400">Total Fees</p>
                  <p class="text-[11px] font-bold leading-tight text-red-600">{{ fmtAmt(overviewData.fee_breakdown.total_fees) }}</p>
                </div>
              </div>
            </div>
            <!-- Legend -->
            <div class="min-w-0 flex-1 space-y-1.5">
              <div
                v-for="(item, idx) in overviewData.fee_breakdown.items.filter(i => Number(i.amount) !== 0)"
                :key="item.category"
                class="flex items-center gap-1.5 text-xs"
              >
                <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: FEE_COLORS[idx % FEE_COLORS.length] }" />
                <span class="min-w-0 flex-1 truncate text-gray-600">{{ item.label }}</span>
                <span class="shrink-0 font-semibold text-gray-800">{{ fmtAmt(item.amount) }}</span>
                <span class="shrink-0 text-[10px] text-gray-400">{{ fmtPct(item.percentage_of_sales) }}</span>
              </div>
              <p v-if="!overviewData.fee_breakdown.items.some(i => Number(i.amount) !== 0)" class="text-xs text-gray-400">
                Tidak ada biaya
              </p>
            </div>
          </div>
        </template>
        <div v-else class="space-y-2">
          <div v-for="i in 4" :key="i" class="h-8 animate-pulse rounded bg-gray-100" />
        </div>
      </div>

      <!-- Shipping Insight -->
      <div class="overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="border-b border-gray-100 px-5 py-3.5">
          <p class="font-semibold text-gray-900">Selisih Ongkir</p>
        </div>
        <template v-if="overviewData?.shipping_insight">
          <table class="w-full text-xs">
            <tbody>
              <tr class="border-b border-gray-100">
                <td class="px-4 py-3 text-gray-600">{{ overviewData.shipping_insight.customer_shipping_fee.label }}</td>
                <td class="px-4 py-3 text-right font-semibold text-gray-900">{{ fmtAmt(overviewData.shipping_insight.customer_shipping_fee.amount) }}</td>
              </tr>
              <tr class="border-b border-gray-100">
                <td class="px-4 py-3 text-gray-600">{{ overviewData.shipping_insight.actual_shipping_fee.label }}</td>
                <td class="px-4 py-3 text-right font-semibold text-gray-900">{{ fmtAmt(overviewData.shipping_insight.actual_shipping_fee.amount) }}</td>
              </tr>
              <tr class="bg-green-50">
                <td class="px-4 py-3">
                  <p class="font-semibold text-green-800">{{ overviewData.shipping_insight.shipping_fee_difference.label }}</p>
                  <p v-if="overviewData.shipping_insight.shipping_fee_difference.percentage" class="mt-0.5 text-[10px] text-green-600">
                    +{{ fmtPct(overviewData.shipping_insight.shipping_fee_difference.percentage) }}
                  </p>
                </td>
                <td class="px-4 py-3 text-right">
                  <p class="text-base font-bold text-green-700">{{ fmtAmt(overviewData.shipping_insight.shipping_fee_difference.amount) }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </template>
        <div v-else class="space-y-2 p-5">
          <div v-for="i in 3" :key="i" class="h-14 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>

      <!-- COD Fee Insight -->
      <div class="overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="border-b border-gray-100 px-5 py-3.5">
          <p class="font-semibold text-gray-900">Selisih COD Fee</p>
        </div>
        <template v-if="overviewData?.cod_fee_insight">
          <table class="w-full text-xs">
            <tbody>
              <tr class="border-b border-gray-100">
                <td class="px-4 py-3 text-gray-600">{{ overviewData.cod_fee_insight.customer_cod_fee.label }}</td>
                <td class="px-4 py-3 text-right font-semibold text-gray-900">{{ fmtAmt(overviewData.cod_fee_insight.customer_cod_fee.amount) }}</td>
              </tr>
              <tr class="border-b border-gray-100">
                <td class="px-4 py-3 text-gray-600">{{ overviewData.cod_fee_insight.actual_cod_fee.label }}</td>
                <td class="px-4 py-3 text-right font-semibold text-gray-900">{{ fmtAmt(overviewData.cod_fee_insight.actual_cod_fee.amount) }}</td>
              </tr>
              <tr class="bg-green-50">
                <td class="px-4 py-3">
                  <p class="font-semibold text-green-800">{{ overviewData.cod_fee_insight.cod_fee_difference.label }}</p>
                  <p v-if="overviewData.cod_fee_insight.cod_fee_difference.percentage" class="mt-0.5 text-[10px] text-green-600">
                    +{{ fmtPct(overviewData.cod_fee_insight.cod_fee_difference.percentage) }}
                  </p>
                </td>
                <td class="px-4 py-3 text-right">
                  <p class="text-base font-bold text-green-700">{{ fmtAmt(overviewData.cod_fee_insight.cod_fee_difference.amount) }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </template>
        <div v-else class="space-y-2 p-5">
          <div v-for="i in 3" :key="i" class="h-14 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    </div>

    <!-- COD vs Non-COD + Profit by Store -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- COD vs Non-COD -->
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <div class="mb-4 flex items-center justify-between">
          <p class="font-semibold text-gray-900">COD vs Non-COD</p>
          <span class="text-xs text-gray-400">Berdasarkan Gross Sales</span>
        </div>
        <template v-if="overviewData?.cod_vs_non_cod?.items?.length">
          <div class="flex items-center gap-5">
            <!-- Donut -->
            <div class="relative h-28 w-28 shrink-0">
              <div class="h-full w-full rounded-full" :style="codDonutStyle" />
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-white text-center">
                  <p class="text-[9px] leading-tight text-gray-400">COD</p>
                  <p class="text-sm font-bold text-orange-500">
                    {{ ((Math.abs(Number(overviewData.cod_vs_non_cod.items.find(i => i.cod)?.gross_sales ?? 0)) / Math.max(overviewData.cod_vs_non_cod.items.reduce((s, i) => s + Math.abs(Number(i.gross_sales)), 0), 1)) * 100).toFixed(0) }}%
                  </p>
                </div>
              </div>
            </div>
            <!-- Cards -->
            <div class="min-w-0 flex-1 space-y-2">
              <div
                v-for="(row, idx) in overviewData.cod_vs_non_cod.items"
                :key="String(row.cod)"
                class="rounded-lg p-3 text-xs"
                :class="row.cod ? 'bg-orange-50 ring-1 ring-orange-100' : 'bg-gray-50 ring-1 ring-gray-100'"
              >
                <div class="mb-2 flex items-center gap-1.5">
                  <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: COD_COLORS[idx % COD_COLORS.length] }" />
                  <span class="font-semibold text-gray-800">{{ row.label }}</span>
                </div>
                <div class="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <p class="text-gray-400">Gross Sales</p>
                    <p class="font-semibold text-gray-900">{{ fmtAmt(row.gross_sales) }}</p>
                  </div>
                  <div>
                    <p class="text-gray-400">Net Profit</p>
                    <p class="font-semibold" :class="Number(row.profit) >= 0 ? 'text-emerald-600' : 'text-red-600'">{{ fmtAmt(row.profit) }}</p>
                  </div>
                  <div>
                    <p class="text-gray-400">Margin</p>
                    <p class="font-semibold text-gray-700">{{ fmtPct(row.margin) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="flex items-center gap-5">
          <div class="h-28 w-28 shrink-0 animate-pulse rounded-full bg-gray-100" />
          <div class="flex-1 space-y-2">
            <div v-for="i in 2" :key="i" class="h-16 animate-pulse rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>

      <!-- Profit by Store -->
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <div class="mb-4 flex items-center justify-between">
          <p class="font-semibold text-gray-900">Profit per Toko</p>
          <span class="text-xs text-gray-400">% dari Total Profit</span>
        </div>
        <template v-if="overviewData?.profit_by_store?.items?.length">
          <div class="flex items-center gap-5">
            <!-- Donut -->
            <div class="relative h-28 w-28 shrink-0">
              <div class="h-full w-full rounded-full" :style="storeDonutStyle" />
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-white text-center">
                  <p class="text-[9px] leading-tight text-gray-400">Net Profit</p>
                  <p class="text-[11px] font-bold leading-tight text-violet-600">
                    {{ fmtAmt(overviewData.profit_by_store.items.reduce((s, i) => s + Number(i.profit), 0)) }}
                  </p>
                </div>
              </div>
            </div>
            <!-- Legend -->
            <div class="min-w-0 flex-1 space-y-2">
              <div
                v-for="(row, idx) in overviewData.profit_by_store.items"
                :key="row.store_id"
                class="flex items-center gap-2 text-xs"
              >
                <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: STORE_CHART_COLORS[idx % STORE_CHART_COLORS.length] }" />
                <span class="min-w-0 flex-1 truncate font-medium text-gray-800">{{ row.shop_name }}</span>
                <span class="shrink-0 font-semibold" :class="Number(row.profit) >= 0 ? 'text-emerald-600' : 'text-red-600'">{{ fmtAmt(row.profit) }}</span>
                <span class="w-10 shrink-0 text-right text-gray-500">{{ fmtPct(row.margin) }}</span>
                <span class="w-9 shrink-0 text-right text-[10px] text-gray-400">{{ fmtPct(row.percentage_of_total_profit) }}</span>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="flex items-center gap-5">
          <div class="h-28 w-28 shrink-0 animate-pulse rounded-full bg-gray-100" />
          <div class="flex-1 space-y-2">
            <div v-for="i in 4" :key="i" class="h-5 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </div>

    <!-- Return Impact -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="border-b border-gray-100 px-5 py-4">
        <p class="font-semibold text-gray-900">{{ overviewData?.return_impact?.title || 'Return Impact' }}</p>
        <p class="mt-0.5 text-xs text-gray-400">{{ overviewData?.return_impact?.description }}</p>
      </div>
      <template v-if="overviewData?.return_impact">
        <div class="grid grid-cols-2 gap-0 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y divide-gray-100">
          <div class="px-5 py-4 text-center">
            <p class="text-xs text-gray-400">Order Retur</p>
            <p class="mt-1 text-xl font-bold text-gray-900">{{ overviewData.return_impact.returned_orders }}</p>
          </div>
          <div class="px-5 py-4 text-center">
            <p class="text-xs text-gray-400">Paket Retur</p>
            <p class="mt-1 text-xl font-bold text-gray-900">{{ overviewData.return_impact.return_packages }}</p>
          </div>
          <div class="px-5 py-4 text-center">
            <p class="text-xs text-gray-400">Qty Retur</p>
            <p class="mt-1 text-xl font-bold text-gray-900">{{ overviewData.return_impact.returned_qty }}</p>
          </div>
          <div class="px-5 py-4 text-center">
            <p class="text-xs text-gray-400">Gross Sales Hilang</p>
            <p class="mt-1 text-lg font-bold text-red-600">{{ fmtAmt(overviewData.return_impact.returned_gross_sales) }}</p>
          </div>
          <div class="px-5 py-4 text-center">
            <p class="text-xs text-gray-400">Gross Profit Hilang</p>
            <p class="mt-1 text-lg font-bold text-red-600">{{ fmtAmt(overviewData.return_impact.lost_gross_profit) }}</p>
          </div>
          <div class="px-5 py-4 text-center">
            <p class="text-xs text-gray-400">Total Dampak Retur</p>
            <p class="mt-1 text-lg font-bold text-red-700">{{ fmtAmt(overviewData.return_impact.total_return_impact) }}</p>
          </div>
        </div>
      </template>
      <div v-else class="grid grid-cols-3 gap-4 p-5 sm:grid-cols-6">
        <div v-for="i in 6" :key="i" class="h-16 animate-pulse rounded-lg bg-gray-100" />
      </div>
    </div>

    <div class="min-h-[40px]" />
  </div>
</template>
