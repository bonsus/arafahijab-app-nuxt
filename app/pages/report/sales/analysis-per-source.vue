<script setup lang="ts">
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

// ── Types ──────────────────────────────────────────────────────────────────
interface TrendItem {
  date: string; label: string; revenue: string; profit: string; orders: number; aov: string; qty: number
}
interface SourceItem { source: string; items: TrendItem[] }
interface MetricDef { key: string; label: string }
interface AnalysisData {
  title: string; default_metric: string
  available_metrics: MetricDef[]
  group_by: string; items: SourceItem[]; total_per_group: TrendItem[]
}

// ── State ──────────────────────────────────────────────────────────────────
const api = useApi()
const toast = useToast()

const analysisData = ref<AnalysisData | null>(null)
const loading = ref(false)

const filterDate = ref({ from: '', to: '' })
const filterStore = ref<string[]>([])
const groupBy = ref<'daily' | 'weekly' | 'monthly'>('daily')
const activeMetric = ref('revenue')
const activeItems = ref<string[]>([])
const showTotal = ref(true)
const dateType = ref<'created' | 'shipped'>('shipped')

const storeOptions = ref<Array<{ value: string; label: string }>>([])

// ── Constants ──────────────────────────────────────────────────────────────
const ITEM_COLORS = [
  '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
]
const TOTAL_COLOR = '#64748b'

const DEFAULT_METRICS: MetricDef[] = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'profit', label: 'Profit' },
  { key: 'orders', label: 'Orders' },
  { key: 'aov', label: 'AOV' },
  { key: 'qty', label: 'Quantity Sold' },
]

const availableMetrics = computed(() => analysisData.value?.available_metrics || DEFAULT_METRICS)

const tabs = [
  { label: 'Overview', to: '/report/sales/overview' },
  { label: 'ABC Analysis', to: '/report/sales/analysis-abc' },
  { label: 'Per Produk', to: '/report/sales/analysis-per-product' },
  { label: 'Per Source', to: '/report/sales/analysis-per-source' },
  { label: 'Per Tag', to: '/report/sales/analysis-per-tag' },
  { label: 'Per Toko', to: '/report/sales/analysis-per-store' },
  { label: 'Per Kurir', to: '/report/sales/analysis-per-courier' },
]

// ── Params ─────────────────────────────────────────────────────────────────
function buildParams(): Record<string, string> {
  const p: Record<string, string> = { group_by: groupBy.value, date_type: dateType.value }
  if (filterDate.value.from) p.date_from = filterDate.value.from
  if (filterDate.value.to) p.date_to = filterDate.value.to
  if (filterStore.value.length) p.store_id = filterStore.value.join(',')
  return p
}

// ── Fetch ──────────────────────────────────────────────────────────────────
async function fetchData() {
  loading.value = true
  try {
    const res = await api.get<{ data: { analysis: AnalysisData } }>('/reports/sales/analysis-per-source', buildParams())
    analysisData.value = res.data.analysis
    if (analysisData.value?.default_metric) activeMetric.value = analysisData.value.default_metric
    activeItems.value = (analysisData.value?.items || []).map(s => s.source)
  }
  catch (err: any) { toast.error(err.message || 'Gagal memuat data analisis') }
  finally { loading.value = false }
}

async function fetchStores() {
  try {
    const res = await api.get<{ data: Array<{ id: string; shop_name: string }> }>('/stores/public/index')
    storeOptions.value = (res.data || []).map(s => ({ value: s.id, label: s.shop_name }))
  }
  catch { /* ignore */ }
}

watch(groupBy, fetchData)
onMounted(async () => { await fetchStores(); fetchData() })

// ── Chart ──────────────────────────────────────────────────────────────────
function getMetricVal(item: TrendItem, metric: string): number {
  if (metric === 'revenue') return Number(item.revenue)
  if (metric === 'profit') return Number(item.profit)
  if (metric === 'orders') return item.orders
  if (metric === 'aov') return Number(item.aov)
  if (metric === 'qty') return item.qty
  return 0
}

const chartLabels = computed(() => analysisData.value?.total_per_group.map(d => d.label) || [])

const chartSeries = computed(() => {
  if (!analysisData.value) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any[] = analysisData.value.items
    .filter(s => activeItems.value.includes(s.source))
    .map((item) => {
      const origIdx = analysisData.value!.items.findIndex(s => s.source === item.source)
      return {
        name: item.source,
        color: ITEM_COLORS[origIdx % ITEM_COLORS.length]!,
        axis: 'left' as const,
        data: item.items.map(d => getMetricVal(d, activeMetric.value)),
      }
    })
  if (showTotal.value && analysisData.value.total_per_group.length) {
    result.push({
      name: 'Total',
      color: TOTAL_COLOR,
      axis: 'left' as const,
      dashed: true,
      data: analysisData.value.total_per_group.map(d => getMetricVal(d, activeMetric.value)),
    })
  }
  return result
})

function toggleItem(source: string) {
  const idx = activeItems.value.indexOf(source)
  if (idx >= 0) { if (activeItems.value.length > 1) activeItems.value.splice(idx, 1) }
  else { activeItems.value.push(source) }
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
const pivotItems = computed(() => analysisData.value?.items || [])
const pivotDates = computed(() => analysisData.value?.total_per_group || [])

function pivotVal(itemIdx: number, dateIdx: number): number {
  const dateItem = pivotDates.value[dateIdx]
  const item = pivotItems.value[itemIdx]
  if (!dateItem || !item) return 0
  const found = item.items.find(d => d.date === dateItem.date)
  return found ? getMetricVal(found, activeMetric.value) : 0
}

function cellTrendDir(itemIdx: number, dateIdx: number): 'up' | 'down' | 'flat' {
  if (dateIdx === 0) return 'flat'
  const curr = pivotVal(itemIdx, dateIdx)
  const prev = pivotVal(itemIdx, dateIdx - 1)
  if (curr > prev) return 'up'
  if (curr < prev) return 'down'
  return 'flat'
}

function cellTrendPct(itemIdx: number, dateIdx: number): string {
  if (dateIdx === 0) return ''
  const curr = pivotVal(itemIdx, dateIdx)
  const prev = pivotVal(itemIdx, dateIdx - 1)
  if (prev === 0) return curr > 0 ? '+∞' : ''
  const pct = (curr - prev) / prev * 100
  return `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`
}

function totalTrendDir(dateIdx: number): 'up' | 'down' | 'flat' {
  if (dateIdx === 0 || !pivotDates.value[dateIdx] || !pivotDates.value[dateIdx - 1]) return 'flat'
  const curr = getMetricVal(pivotDates.value[dateIdx]!, activeMetric.value)
  const prev = getMetricVal(pivotDates.value[dateIdx - 1]!, activeMetric.value)
  if (curr > prev) return 'up'
  if (curr < prev) return 'down'
  return 'flat'
}

function totalTrendPct(dateIdx: number): string {
  if (dateIdx === 0 || !pivotDates.value[dateIdx] || !pivotDates.value[dateIdx - 1]) return ''
  const curr = getMetricVal(pivotDates.value[dateIdx]!, activeMetric.value)
  const prev = getMetricVal(pivotDates.value[dateIdx - 1]!, activeMetric.value)
  if (prev === 0) return curr > 0 ? '+∞' : ''
  const pct = (curr - prev) / prev * 100
  return `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`
}

const colTotals = computed(() =>
  pivotItems.value.map((_, idx) =>
    pivotDates.value.reduce((sum, _, dIdx) => sum + pivotVal(idx, dIdx), 0),
  ),
)

const grandTotal = computed(() =>
  pivotDates.value.reduce((sum, d) => sum + getMetricVal(d, activeMetric.value), 0),
)

function fmtCell(val: number): string {
  const m = activeMetric.value
  if (m === 'revenue' || m === 'profit' || m === 'aov') return `Rp${formatCurrency(val)}`
  return formatCurrency(val)
}

const summaryTotals = computed(() => {
  const data = analysisData.value?.total_per_group || []
  const revenue = data.reduce((s, d) => s + Number(d.revenue), 0)
  const profit = data.reduce((s, d) => s + Number(d.profit), 0)
  const orders = data.reduce((s, d) => s + d.orders, 0)
  const qty = data.reduce((s, d) => s + d.qty, 0)
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
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Analisis Per Source</h1>
        <p class="mt-0.5 text-sm text-gray-500">Bandingkan performa penjualan berdasarkan sumber order</p>
      </div>
      <button
        class="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        @click="fetchData"
      >
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
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
        @update:model-value="filterStore = $event as string[]; fetchData()"
      />
      <div class="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="dateType === 'created' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="dateType = 'created'; fetchData()"
        >Tgl Order</button>
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="dateType === 'shipped' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="dateType = 'shipped'; fetchData()"
        >Tgl Kirim</button>
      </div>
      <AppDateRangePicker
        :model-value="filterDate"
        @update:model-value="filterDate = $event; fetchData()"
      />
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

    <!-- Chart -->
    <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p class="font-semibold text-gray-900">Tren per Source</p>
        <div class="flex flex-wrap items-center gap-2">
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

      <!-- Source toggle pills -->
      <div v-if="analysisData?.items.length" class="mb-2 flex flex-wrap items-center gap-1.5">
        <button
          v-for="(item, i) in analysisData.items"
          :key="item.source"
          class="rounded-full border px-2.5 py-1 text-xs font-medium transition-all"
          :class="activeItems.includes(item.source) ? 'border-transparent text-white shadow-sm' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'"
          :style="activeItems.includes(item.source) ? { backgroundColor: ITEM_COLORS[i % ITEM_COLORS.length] } : {}"
          @click="toggleItem(item.source)"
        >
          {{ item.source }}
        </button>
        <button
          class="rounded-full border px-2.5 py-1 text-xs font-medium transition-all"
          :class="showTotal ? 'border-transparent text-white shadow-sm' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'"
          :style="showTotal ? { backgroundColor: TOTAL_COLOR } : {}"
          @click="showTotal = !showTotal"
        >
          Total
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

    <!-- Pivot Table -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="border-b border-gray-100 px-4 py-3">
        <p class="font-semibold text-gray-900">Tabel Perbandingan</p>
        <p class="mt-0.5 text-xs text-gray-400">Tanggal sebagai baris · Source sebagai kolom · Tren vs periode sebelumnya</p>
      </div>
      <div class="overflow-x-auto">
        <div v-if="loading" class="space-y-2 p-4">
          <div v-for="i in 4" :key="i" class="h-10 animate-pulse rounded bg-gray-100" />
        </div>
        <table v-else-if="pivotDates.length" class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/70 text-xs text-gray-500">
              <th class="whitespace-nowrap px-4 py-2.5 text-left">Tanggal</th>
              <th
                v-for="(item, pIdx) in pivotItems"
                :key="item.source"
                class="whitespace-nowrap px-4 py-2.5 text-right"
              >
                <div class="inline-flex items-center gap-1.5">
                  <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: ITEM_COLORS[pIdx % ITEM_COLORS.length] }" />
                  {{ item.source }}
                </div>
              </th>
              <th class="whitespace-nowrap px-4 py-2.5 text-right">
                <div class="inline-flex items-center gap-1.5">
                  <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: TOTAL_COLOR }" />
                  Total
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
                v-for="(_, pIdx) in pivotItems"
                :key="pIdx"
                class="whitespace-nowrap px-4 py-2.5 text-right align-top"
              >
                <div class="text-xs font-medium text-gray-800">{{ fmtCell(pivotVal(pIdx, dIdx)) }}</div>
                <div v-if="dIdx > 0 && cellTrendPct(pIdx, dIdx)" class="mt-0.5 flex items-center justify-end gap-0.5">
                  <TrendingUp v-if="cellTrendDir(pIdx, dIdx) === 'up'" class="h-3 w-3 text-green-500" />
                  <TrendingDown v-else-if="cellTrendDir(pIdx, dIdx) === 'down'" class="h-3 w-3 text-red-400" />
                  <span class="text-[10px] font-medium" :class="cellTrendDir(pIdx, dIdx) === 'up' ? 'text-green-600' : 'text-red-500'">{{ cellTrendPct(pIdx, dIdx) }}</span>
                </div>
              </td>
              <!-- Total column -->
              <td class="whitespace-nowrap bg-gray-50/60 px-4 py-2.5 text-right align-top">
                <div class="text-xs font-semibold text-gray-700">{{ fmtCell(getMetricVal(dateItem, activeMetric)) }}</div>
                <div v-if="dIdx > 0 && totalTrendPct(dIdx)" class="mt-0.5 flex items-center justify-end gap-0.5">
                  <TrendingUp v-if="totalTrendDir(dIdx) === 'up'" class="h-3 w-3 text-green-500" />
                  <TrendingDown v-else-if="totalTrendDir(dIdx) === 'down'" class="h-3 w-3 text-red-400" />
                  <span class="text-[10px] font-medium" :class="totalTrendDir(dIdx) === 'up' ? 'text-green-600' : 'text-red-500'">{{ totalTrendPct(dIdx) }}</span>
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
              >{{ fmtCell(total) }}</td>
              <td class="whitespace-nowrap px-4 py-2.5 text-right text-xs font-bold text-gray-900">{{ fmtCell(grandTotal) }}</td>
            </tr>
          </tfoot>
        </table>
        <div v-else-if="!loading" class="flex h-28 items-center justify-center text-sm text-gray-400">
          Tidak ada data
        </div>
      </div>
    </div>
  </div>
</template>
