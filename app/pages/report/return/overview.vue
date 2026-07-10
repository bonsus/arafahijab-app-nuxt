<script setup lang="ts">
import { h, defineComponent, computed as _c } from 'vue'
import { RefreshCw, AlertTriangle, Truck, PackageCheck, AlertCircle } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface PeriodInfo {
	date_from: string
	date_to: string
	label: string
}

interface ReturnSplit {
	revenue: string
	aov: string
	orders: number
	qty: number
	returned_amount?: string
	returned_aov?: string
	returned_qty?: number
	returned_packages?: number
	percentage_by_order?: string
}

interface SummaryCardItem {
	label: string
	description: string
	source: string
	status: string
	sub_status: string
	revenue: string
	aov: string
	orders: number
	qty: number
	returned_packages?: number
	returned_amount?: string
	returned_aov?: string
	returned_qty?: number
	cod: ReturnSplit
	non_cod: ReturnSplit
}

interface ReturnRate {
	total_orders: number
	problem_orders: number
	problem_order_rate: string
	returning_orders: number
	returning_order_rate: string
	returned_orders: number
	returned_order_rate: string
	total_affected_orders: number
	affected_order_rate: string
	return_packages: number
	return_package_rate: string
	returned_qty: number
}

interface CodVsNonCodItem {
	total_orders: number
	total_sales: string
	problem_orders: number
	problem_order_rate: string
	returning_orders: number
	returning_order_rate: string
	returned_orders: number
	returned_order_rate: string
	affected_orders: number
	affected_order_rate: string
	return_packages: number
	returned_qty: number
	returned_amount: string
	return_value_rate: string
}

interface BreakdownSplit {
	total_orders: number
	problem_orders: number
	returning_orders: number
	returned_orders: number
	affected_orders: number
	returned_amount: string
}

interface BreakdownByStoreItem {
	store_id: string
	store_name: string
	total_orders: number
	total_sales: string
	problem_orders: number
	problem_order_rate: string
	returning_orders: number
	returning_order_rate: string
	returned_orders: number
	returned_order_rate: string
	affected_orders: number
	affected_order_rate: string
	return_packages: number
	returned_qty: number
	returned_amount: string
	return_value_rate: string
	cod: BreakdownSplit
	non_cod: BreakdownSplit
}

interface TrendItem {
	date: string
	label: string
	problem_orders: number
	returning_orders: number
	returned_orders: number
	affected_orders: number
	return_packages: number
	returned_qty: number
	returned_amount: string
}

interface TrendData {
	title: string
	group_by: string
	items: TrendItem[]
}

interface BreakdownByCourierItem {
	courier_code: string
	courier_name: string
	total_orders: number
	problem_orders: number
	problem_order_rate: string
	returning_orders: number
	returning_order_rate: string
	returned_orders: number
	returned_order_rate: string
	affected_orders: number
	affected_order_rate: string
	return_packages: number
	returned_qty: number
	returned_amount: string
	return_value_rate: string
}

interface ReturnsOverviewData {
	period: PeriodInfo
	summary_cards: {
		problem_orders: SummaryCardItem
		returning_orders: SummaryCardItem
		returned_orders: SummaryCardItem
		total_affected: SummaryCardItem
	}
	return_rate: ReturnRate
	cod_vs_non_cod: {
		cod: CodVsNonCodItem
		non_cod: CodVsNonCodItem
	}
	breakdown_by_store: {
		title: string
		items: BreakdownByStoreItem[]
	}
	breakdown_by_courier: {
		title: string
		items: BreakdownByCourierItem[]
	}
}

// ── Nav tabs ──────────────────────────────────────────────────────────────
const tabs = [
	{ label: 'Overview', to: '/report/return/overview' },
	{ label: 'Order Bermasalah', to: '/report/return/problem-lists' },
	{ label: 'Retur Diterima', to: '/report/return/returned-lists' },
]

const api = useApi()
const toast = useToast()

const loading = ref(false)
const overviewData = ref<ReturnsOverviewData | null>(null)

const filterDate = ref({ from: '', to: '' })
const filterStore = ref<string[]>([])
const filterWarehouse = ref<string[]>([])
const filterCustomerCat = ref<string[]>([])
const filterCod = ref<'all' | 'cod' | 'non_cod'>('all')
const dateType = ref<'' | 'created' | 'shipped'>('')

const storeOptions = ref<Array<{ value: string; label: string }>>([])
const warehouseOptions = ref<Array<{ value: string; label: string }>>([])
const customerCatOptions = ref<Array<{ value: string; label: string }>>([])

const trendData = ref<TrendData | null>(null)
const loadingTrend = ref(false)
const trendGroupBy = ref<'daily' | 'weekly' | 'monthly'>('daily')

function buildParams(): Record<string, string> {
	const p: Record<string, string> = {}
	if (filterDate.value.from) p.date_from = formatDateFromForApi(filterDate.value.from)
	if (filterDate.value.to) p.date_to = formatDateToForApi(filterDate.value.to)
	if (filterStore.value.length) p.store_id = filterStore.value.join(',')
	if (filterWarehouse.value.length) p.warehouse_id = filterWarehouse.value.join(',')
	if (filterCustomerCat.value.length) p.customer_category_id = filterCustomerCat.value.join(',')
	if (filterCod.value !== 'all') p.cod = filterCod.value === 'cod' ? '1' : '0'
	if (dateType.value) p.date_type = dateType.value
	return p
}

async function fetchOverview() {
	loading.value = true
	try {
		const res = await api.get<{ data: ReturnsOverviewData }>('/reports/returns/overview', buildParams())
		overviewData.value = res.data
	}
	catch (err: any) {
		toast.error(err?.message || 'Gagal memuat laporan retur')
	}
	finally {
		loading.value = false
	}
}

async function fetchTrends() {
	loadingTrend.value = true
	try {
		const res = await api.get<{ data: { trend: TrendData } }>('/reports/returns/trends', { ...buildParams(), group_by: trendGroupBy.value })
		trendData.value = res.data.trend
	}
	catch { /* silent */ }
	finally { loadingTrend.value = false }
}

async function fetchOptions() {
	try {
		const [stores, warehouses] = await Promise.all([
			api.get<{ data: Array<{ id: string; shop_name: string }> }>('/stores/public/index').catch(() => ({ data: [] as Array<{ id: string; shop_name: string }> })),
			api.get<{ data: Array<{ id: string; name: string }> }>('/warehouses/public/index').catch(() => ({ data: [] as Array<{ id: string; name: string }> })),
		])
		storeOptions.value = (stores.data || []).map(s => ({ value: s.id, label: s.shop_name }))
		warehouseOptions.value = (warehouses.data || []).map(w => ({ value: w.id, label: w.name }))
		await onCustomerCategorySearch('')
	}
	catch {
		// ignore option load errors
	}
}

async function onCustomerCategorySearch(q: string) {
	try {
		const res = await api.get<{ data: Array<{ id: string; name: string }> }>('/customers/categories/index', { search: q })
		customerCatOptions.value = (res.data || []).map(c => ({ value: c.id, label: c.name }))
	}
	catch {
		// ignore
	}
}

function onFilterChange() {
	fetchOverview()
	fetchTrends()
}

function resetFilters() {
	filterDate.value = { from: '', to: '' }
	filterStore.value = []
	filterWarehouse.value = []
	filterCustomerCat.value = []
	filterCod.value = 'all'
	dateType.value = ''
	fetchOverview()
}

const CARD_CONFIG = [
	{ key: 'problem_orders' as const, rateKey: 'problem_order_rate' as const, tone: 'rose', icon: AlertTriangle, iconBg: 'bg-rose-50', iconColor: 'text-rose-500', badge: 'bg-rose-100 text-rose-700', rateBadge: 'bg-rose-50 text-rose-600' },
	{ key: 'returning_orders' as const, rateKey: 'returning_order_rate' as const, tone: 'amber', icon: Truck, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', badge: 'bg-amber-100 text-amber-700', rateBadge: 'bg-amber-50 text-amber-600' },
	{ key: 'returned_orders' as const, rateKey: 'returned_order_rate' as const, tone: 'emerald', icon: PackageCheck, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', rateBadge: 'bg-emerald-50 text-emerald-600' },
	{ key: 'total_affected' as const, rateKey: 'affected_order_rate' as const, tone: 'blue', icon: AlertCircle, iconBg: 'bg-blue-50', iconColor: 'text-blue-500', badge: 'bg-blue-100 text-blue-700', rateBadge: 'bg-blue-50 text-blue-600' },
]

const summaryCards = computed(() => {
	if (!overviewData.value) return []
	return CARD_CONFIG.map(c => ({
		...c,
		item: overviewData.value!.summary_cards[c.key],
		rate: overviewData.value!.return_rate[c.rateKey],
	}))
})

function codSplitPct(item: SummaryCardItem): number {
	const total = item.cod.orders + item.non_cod.orders
	if (total === 0) return 50
	return Math.round((item.cod.orders / total) * 100)
}

function fmtCurrency(v: string | number | undefined) {
	return `Rp${formatCurrency(Number(v || 0))}`
}

function fmtCount(v: string | number | undefined) {
	return formatCurrency(Number(v || 0))
}

function fmtPercent(v: string | number | undefined) {
	const n = Number(v || 0)
	return `${Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2)}%`
}

const returnRateRows = computed(() => {
	if (!overviewData.value) return []
	const r = overviewData.value.return_rate
	return [
		{ label: 'Total Order', value: fmtCount(r.total_orders), sub: '-' },
		{ label: 'Order Bermasalah', value: fmtCount(r.problem_orders), sub: fmtPercent(r.problem_order_rate) },
		{ label: 'Order Proses Retur', value: fmtCount(r.returning_orders), sub: fmtPercent(r.returning_order_rate) },
		{ label: 'Order Retur Diterima', value: fmtCount(r.returned_orders), sub: fmtPercent(r.returned_order_rate) },
		{ label: 'Total Order Terdampak', value: fmtCount(r.total_affected_orders), sub: fmtPercent(r.affected_order_rate) },
		{ label: 'Paket Retur', value: fmtCount(r.return_packages), sub: fmtPercent(r.return_package_rate) },
		{ label: 'Qty Retur', value: fmtCount(r.returned_qty), sub: '-' },
	]
})

watch(trendGroupBy, fetchTrends)

onMounted(async () => {
	await fetchOptions()
	fetchOverview()
	fetchTrends()
})

// ── Trend Chart ────────────────────────────────────────────────────────────
const TREND_METRICS = [
	{ key: 'problem_orders', label: 'Bermasalah', color: '#ef4444' },
	{ key: 'returning_orders', label: 'Proses Retur', color: '#f59e0b' },
	{ key: 'returned_orders', label: 'Retur Diterima', color: '#10b981' },
	{ key: 'affected_orders', label: 'Total Terdampak', color: '#3b82f6', dashed: true },
]

const activeTrendMetrics = ref<string[]>(['problem_orders', 'returning_orders', 'returned_orders', 'affected_orders'])

const trendLabels = computed(() => trendData.value?.items.map(d => d.label) || [])

const trendSeries = computed(() => {
	if (!trendData.value) return []
	return TREND_METRICS
		.filter(m => activeTrendMetrics.value.includes(m.key))
		.map(m => ({
			name: m.label,
			color: m.color,
			axis: 'left' as const,
			dashed: (m as any).dashed ?? false,
			data: trendData.value!.items.map(d => d[m.key as keyof TrendItem] as number),
		}))
})

function trendFormatter(v: number): string {
	return String(Math.round(v))
}

function toggleTrendMetric(key: string) {
	const idx = activeTrendMetrics.value.indexOf(key)
	if (idx >= 0) { if (activeTrendMetrics.value.length > 1) activeTrendMetrics.value.splice(idx, 1) }
	else { activeTrendMetrics.value.push(key) }
}

// ── Inline component for COD vs Non-COD comparison badge ──────────────────
const CodCompareBadge = defineComponent({
  props: {
    cod: { type: Number, required: true },
    nonCod: { type: Number, required: true },
    suffix: { type: String, default: '' },
  },
  setup(props) {
    const diff = computed(() => {
      if (props.cod === 0 && props.nonCod === 0) return null
      if (props.cod === 0) return null
      const pct = ((props.cod - props.nonCod) / props.cod) * 100
      return { pct, dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' }
    })
    return () => {
      if (!diff.value) return h('span', { class: 'text-[10px] text-gray-300' }, '—')
      const { pct, dir } = diff.value
      const cls = dir === 'up'
        ? 'rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600'
        : dir === 'down'
          ? 'rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600'
          : 'rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500'
      const label = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`
      return h('span', { class: cls }, label)
    }
  },
})
</script>

<template>
  <div class="space-y-6">


    <!-- ── Header ── -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Laporan Retur</h1>
        <p class="mt-0.5 text-sm text-gray-500">
          <span v-if="overviewData?.period?.label">{{ overviewData.period.label }}</span>
          <span v-else>Ringkasan problem order, proses retur, dan retur diterima</span>
        </p>
      </div>
      <!-- <button
        class="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        @click="fetchOverview"
      >
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        Refresh
      </button> -->
    </div>

    <!-- ── Page nav tabs ── -->
    <div class="flex items-center gap-1 border-b border-gray-200">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px"
        :class="$route.path === tab.to
          ? 'border-primary-600 text-primary-700'
          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'"
      >{{ tab.label }}</NuxtLink>
    </div>

    <!-- ── Filters ── -->
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
        @search="onCustomerCategorySearch"
      />
      <div class="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="filterCod === 'all' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="filterCod = 'all'; onFilterChange()"
        >Semua</button>
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="filterCod === 'cod' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="filterCod = 'cod'; onFilterChange()"
        >COD</button>
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="filterCod === 'non_cod' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="filterCod = 'non_cod'; onFilterChange()"
        >Non COD</button>
      </div>
      <div class="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="dateType === '' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="dateType = ''; onFilterChange()"
        >Semua Tgl</button>
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
      <button
        class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
        @click="resetFilters"
      >Reset</button>
    </div>

    <!-- ── Summary Cards ── -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <template v-if="loading">
        <div v-for="i in 4" :key="i" class="h-60 animate-pulse rounded-2xl bg-gray-100" />
      </template>
      <template v-else>
        <div
          v-for="card in summaryCards"
          :key="card.key"
          class="flex flex-col rounded-2xl bg-white shadow-xs ring-1 ring-gray-200"
        >
          <!-- Header: icon + title/subtitle + rate badge -->
          <div class="flex items-center gap-3 p-4">
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
              :class="card.iconBg"
            >
              <component :is="card.icon" class="h-5.5 w-5.5" :class="card.iconColor" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-gray-900">{{ card.item.label }}</p>
              <p class="truncate text-[11px] text-gray-400">{{ card.item.description }}</p>
            </div>
            <span
              class="shrink-0 rounded-full px-2 py-1 text-xs font-bold"
              :class="card.rateBadge"
            >{{ fmtPercent(card.rate) }}</span>
          </div>

          <!-- Main amount -->
          <div class="border-t border-gray-100 px-4 py-3">
            <p class="text-xl font-extrabold text-gray-900">
              {{ card.key === 'returned_orders' ? fmtCurrency(card.item.returned_amount) : fmtCurrency(card.item.revenue) }}
            </p>
            <p class="mt-0.5 text-[11px] text-gray-400">{{ card.key === 'returned_orders' ? 'Returned Amount' : 'Revenue' }}</p>
          </div>

          <!-- Stats row -->
          <div class="flex items-center gap-0 border-t border-gray-100 divide-x divide-gray-100">
            <div class="flex-1 px-4 py-2.5 text-center">
              <p class="text-sm font-bold text-gray-900">{{ fmtCount(card.item.orders) }}</p>
              <p class="text-[10px] text-gray-400">Orders</p>
            </div>
            <template v-if="card.key === 'returned_orders'">
              <div class="flex-1 px-4 py-2.5 text-center">
                <p class="text-sm font-bold text-gray-900">{{ fmtCount(card.item.returned_packages) }}</p>
                <p class="text-[10px] text-gray-400">Paket</p>
              </div>
              <div class="flex-1 px-4 py-2.5 text-center">
                <p class="text-sm font-bold text-gray-900">{{ fmtCount(card.item.returned_qty) }}</p>
                <p class="text-[10px] text-gray-400">Qty Retur</p>
              </div>
            </template>
            <template v-else>
              <div class="flex-1 px-4 py-2.5 text-center">
                <p class="text-sm font-bold text-gray-900">{{ fmtCount(card.item.qty) }}</p>
                <p class="text-[10px] text-gray-400">Qty</p>
              </div>
            </template>
          </div>

          <!-- COD / Non-COD -->
          <div class="mt-auto border-t border-gray-100 px-4 py-3 space-y-2">
            <div
              v-for="(split, sKey) in { cod: card.item.cod, non_cod: card.item.non_cod }"
              :key="sKey"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-1.5">
                <span
                  class="h-2 w-2 shrink-0 rounded-full"
                  :class="sKey === 'cod' ? 'bg-amber-400' : 'bg-blue-400'"
                />
                <div>
                  <p class="text-xs font-semibold text-gray-700">{{ sKey === 'cod' ? 'COD' : 'Non-COD' }}</p>
                  <p class="text-[10px] text-gray-400">{{ fmtCount(split.orders) }} Orders · {{ fmtPercent(split.percentage_by_order) }}</p>
                </div>
              </div>
              <p class="text-xs font-bold text-gray-900">
                {{ card.key === 'returned_orders' ? fmtCurrency(split.returned_amount) : fmtCurrency(split.revenue) }}
              </p>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ── Trend Chart ── -->
    <div class="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="font-semibold text-gray-900">Trend Retur</p>
          <p class="mt-0.5 text-xs text-gray-400">Jumlah order per periode</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <!-- metric toggles -->
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              v-for="m in TREND_METRICS"
              :key="m.key"
              class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all"
              :class="activeTrendMetrics.includes(m.key) ? 'border-transparent text-white shadow-sm' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'"
              :style="activeTrendMetrics.includes(m.key) ? { backgroundColor: m.color } : {}"
              @click="toggleTrendMetric(m.key)"
            >
              {{ m.label }}
            </button>
          </div>
          <!-- group by -->
          <div class="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
            <button
              v-for="(gl, g) in ({ daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan' } as Record<'daily'|'weekly'|'monthly', string>)"
              :key="g"
              class="px-2.5 py-1.5 font-medium transition-colors"
              :class="trendGroupBy === g ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
              @click="trendGroupBy = g"
            >{{ gl }}</button>
          </div>
        </div>
      </div>
      <DashboardLineChart
        :labels="trendLabels"
        :series="trendSeries"
        :loading="loadingTrend"
        :left-format="trendFormatter"
        :height="220"
      />
    </div>

    <!-- ── Return Rate + COD vs Non-COD ── -->
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">

      <!-- Return Rate -->
      <div class="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <p class="text-sm font-bold text-gray-900">Return Rate</p>
        <p class="mt-0.5 text-xs text-gray-400">Persentase order yang terdampak retur</p>
        <div class="mt-4 space-y-3">
          <div
            v-for="r in returnRateRows"
            :key="r.label"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">{{ r.label }}</span>
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-gray-900">{{ r.value }}</span>
                <span
                  v-if="r.sub !== '-'"
                  class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
                >{{ r.sub }}</span>
              </div>
            </div>
            <div v-if="r.sub !== '-'" class="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                class="h-full rounded-full bg-primary-500 transition-all duration-500"
                :style="{ width: r.sub }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- COD vs Non-COD -->
      <div class="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <p class="text-sm font-bold text-gray-900">COD vs Non COD</p>
        <p class="mt-0.5 text-xs text-gray-400">Perbandingan order berdasarkan metode pembayaran</p>
        <div v-if="overviewData" class="mt-4">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="pb-2 text-left font-medium text-gray-400" />
                <th class="pb-2 text-right font-medium text-gray-500">
                  <div class="inline-flex items-center gap-1.5">
                    <span class="h-2 w-2 rounded-full bg-amber-400" />
                    COD
                  </div>
                </th>
                <th class="pb-2 text-right font-medium text-gray-500">
                  <div class="inline-flex items-center gap-1.5">
                    <span class="h-2 w-2 rounded-full bg-blue-400" />
                    Non-COD
                  </div>
                </th>
                <th class="pb-2 text-right font-medium text-gray-400">Perbandingan</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr class="hover:bg-gray-50/50">
                <td class="py-2 text-gray-500">Total Orders</td>
                <td class="py-2 text-right font-semibold text-gray-800">{{ fmtCount(overviewData.cod_vs_non_cod.cod.total_orders) }}</td>
                <td class="py-2 text-right font-semibold text-gray-800">{{ fmtCount(overviewData.cod_vs_non_cod.non_cod.total_orders) }}</td>
                <td class="py-2 text-right">
                  <CodCompareBadge :cod="overviewData.cod_vs_non_cod.cod.total_orders" :non-cod="overviewData.cod_vs_non_cod.non_cod.total_orders" />
                </td>
              </tr>
              <tr class="hover:bg-gray-50/50">
                <td class="py-2 text-gray-500">Total Penjualan</td>
                <td class="py-2 text-right font-semibold text-gray-800">{{ fmtCurrency(overviewData.cod_vs_non_cod.cod.total_sales) }}</td>
                <td class="py-2 text-right font-semibold text-gray-800">{{ fmtCurrency(overviewData.cod_vs_non_cod.non_cod.total_sales) }}</td>
                <td class="py-2 text-right">
                  <CodCompareBadge :cod="Number(overviewData.cod_vs_non_cod.cod.total_sales)" :non-cod="Number(overviewData.cod_vs_non_cod.non_cod.total_sales)" />
                </td>
              </tr>
              <tr class="hover:bg-gray-50/50">
                <td class="py-2 text-gray-500">Proses Retur</td>
                <td class="py-2 text-right font-semibold text-amber-600">{{ fmtCount(overviewData.cod_vs_non_cod.cod.returning_orders) }}</td>
                <td class="py-2 text-right font-semibold text-amber-600">{{ fmtCount(overviewData.cod_vs_non_cod.non_cod.returning_orders) }}</td>
                <td class="py-2 text-right text-[10px] text-gray-400">
                  {{ fmtPercent(overviewData.cod_vs_non_cod.cod.returning_order_rate) }} · {{ fmtPercent(overviewData.cod_vs_non_cod.non_cod.returning_order_rate) }}
                </td>
              </tr>
              <tr class="hover:bg-gray-50/50">
                <td class="py-2 text-gray-500">Retur Diterima</td>
                <td class="py-2 text-right font-semibold text-emerald-600">{{ fmtCount(overviewData.cod_vs_non_cod.cod.returned_orders) }}</td>
                <td class="py-2 text-right font-semibold text-emerald-600">{{ fmtCount(overviewData.cod_vs_non_cod.non_cod.returned_orders) }}</td>
                <td class="py-2 text-right text-[10px] text-gray-400">
                  {{ fmtPercent(overviewData.cod_vs_non_cod.cod.returned_order_rate) }} · {{ fmtPercent(overviewData.cod_vs_non_cod.non_cod.returned_order_rate) }}
                </td>
              </tr>
              <tr class="hover:bg-gray-50/50">
                <td class="py-2 text-gray-500">Total Terdampak</td>
                <td class="py-2 text-right font-semibold text-gray-800">{{ fmtCount(overviewData.cod_vs_non_cod.cod.affected_orders) }}</td>
                <td class="py-2 text-right font-semibold text-gray-800">{{ fmtCount(overviewData.cod_vs_non_cod.non_cod.affected_orders) }}</td>
                <td class="py-2 text-right text-[10px] text-gray-400">
                  {{ fmtPercent(overviewData.cod_vs_non_cod.cod.affected_order_rate) }} · {{ fmtPercent(overviewData.cod_vs_non_cod.non_cod.affected_order_rate) }}
                </td>
              </tr>
              <tr class="hover:bg-gray-50/50">
                <td class="py-2 text-gray-500">Paket Retur</td>
                <td class="py-2 text-right font-semibold text-gray-800">{{ fmtCount(overviewData.cod_vs_non_cod.cod.return_packages) }}</td>
                <td class="py-2 text-right font-semibold text-gray-800">{{ fmtCount(overviewData.cod_vs_non_cod.non_cod.return_packages) }}</td>
                <td class="py-2 text-right">
                  <CodCompareBadge :cod="overviewData.cod_vs_non_cod.cod.return_packages" :non-cod="overviewData.cod_vs_non_cod.non_cod.return_packages" />
                </td>
              </tr>
              <tr class="hover:bg-gray-50/50">
                <td class="py-2 text-gray-500">Qty Retur</td>
                <td class="py-2 text-right font-semibold text-gray-800">{{ fmtCount(overviewData.cod_vs_non_cod.cod.returned_qty) }}</td>
                <td class="py-2 text-right font-semibold text-gray-800">{{ fmtCount(overviewData.cod_vs_non_cod.non_cod.returned_qty) }}</td>
                <td class="py-2 text-right">
                  <CodCompareBadge :cod="overviewData.cod_vs_non_cod.cod.returned_qty" :non-cod="overviewData.cod_vs_non_cod.non_cod.returned_qty" />
                </td>
              </tr>
              <tr class="hover:bg-gray-50/50">
                <td class="py-2 text-gray-500">Retur Diterima (Rp)</td>
                <td class="py-2 text-right font-semibold text-gray-800">{{ fmtCurrency(overviewData.cod_vs_non_cod.cod.returned_amount) }}</td>
                <td class="py-2 text-right font-semibold text-gray-800">{{ fmtCurrency(overviewData.cod_vs_non_cod.non_cod.returned_amount) }}</td>
                <td class="py-2 text-right">
                  <CodCompareBadge :cod="Number(overviewData.cod_vs_non_cod.cod.returned_amount)" :non-cod="Number(overviewData.cod_vs_non_cod.non_cod.returned_amount)" />
                </td>
              </tr>
              <tr class="hover:bg-gray-50/50">
                <td class="py-2 text-gray-500">Return Value Rate</td>
                <td class="py-2 text-right">
                  <span class="rounded-full bg-gray-100 px-1.5 py-0.5 font-semibold text-gray-700">{{ fmtPercent(overviewData.cod_vs_non_cod.cod.return_value_rate) }}</span>
                </td>
                <td class="py-2 text-right">
                  <span class="rounded-full bg-gray-100 px-1.5 py-0.5 font-semibold text-gray-700">{{ fmtPercent(overviewData.cod_vs_non_cod.non_cod.return_value_rate) }}</span>
                </td>
                <td class="py-2 text-right">
                  <CodCompareBadge :cod="Number(overviewData.cod_vs_non_cod.cod.return_value_rate)" :non-cod="Number(overviewData.cod_vs_non_cod.non_cod.return_value_rate)" suffix="%" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── Breakdown by Channel — Cards ── -->
    <div>
      <p class="mb-3 font-semibold text-gray-900">{{ overviewData?.breakdown_by_store?.title || 'Breakdown by Channel' }}</p>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <template v-if="loading">
          <div v-for="i in 3" :key="i" class="h-52 animate-pulse rounded-2xl bg-gray-100" />
        </template>
        <template v-else>
          <div
            v-for="item in (overviewData?.breakdown_by_store?.items || [])"
            :key="item.store_id"
            class="flex flex-col rounded-2xl bg-white shadow-xs ring-1 ring-gray-200"
          >
            <!-- Header: store name + return value rate badge -->
            <div class="flex items-start justify-between gap-2 p-4">
              <div>
                <p class="font-bold text-gray-900">{{ item.store_name }}</p>
                <p class="mt-0.5 text-xs text-gray-400">{{ fmtCount(item.total_orders) }} orders · {{ fmtCurrency(item.total_sales) }}</p>
              </div>
              <span
                class="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
                :class="Number(item.return_value_rate) > 30 ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-600'"
              >{{ fmtPercent(item.return_value_rate) }}</span>
            </div>

            <!-- 3 metric columns -->
            <div class="grid grid-cols-3 border-t border-gray-100 divide-x divide-gray-100">
              <div class="px-3 py-2.5 text-center">
                <p class="text-sm font-bold text-blue-600">{{ fmtCount(item.affected_orders) }}</p>
                <p class="text-[10px] text-gray-400">Terdampak</p>
                <p class="text-[10px] font-semibold text-gray-500">{{ fmtPercent(item.affected_order_rate) }}</p>
              </div>
              <div class="px-3 py-2.5 text-center">
                <p class="text-sm font-bold text-amber-600">{{ fmtCount(item.returning_orders) }}</p>
                <p class="text-[10px] text-gray-400">Proses Retur</p>
                <p class="text-[10px] font-semibold text-gray-500">{{ fmtPercent(item.returning_order_rate) }}</p>
              </div>
              <div class="px-3 py-2.5 text-center">
                <p class="text-sm font-bold text-emerald-600">{{ fmtCount(item.returned_orders) }}</p>
                <p class="text-[10px] text-gray-400">Retur Diterima</p>
                <p class="text-[10px] font-semibold text-gray-500">{{ fmtPercent(item.returned_order_rate) }}</p>
              </div>
            </div>

            <!-- Amount / packages / qty -->
            <div class="flex items-center border-t border-gray-100 divide-x divide-gray-100">
              <div class="flex-1 px-3 py-2.5 text-center">
                <p class="text-xs font-bold text-gray-900">{{ fmtCurrency(item.returned_amount) }}</p>
                <p class="text-[10px] text-gray-400">Returned Amt</p>
              </div>
              <div class="px-3 py-2.5 text-center">
                <p class="text-xs font-bold text-gray-900">{{ fmtCount(item.return_packages) }}</p>
                <p class="text-[10px] text-gray-400">Paket</p>
              </div>
              <div class="px-3 py-2.5 text-center">
                <p class="text-xs font-bold text-gray-900">{{ fmtCount(item.returned_qty) }}</p>
                <p class="text-[10px] text-gray-400">Qty Retur</p>
              </div>
            </div>

            <!-- COD / Non-COD -->
            <div class="mt-auto border-t border-gray-100 px-4 py-3 space-y-2">
              <div
                v-for="(split, sKey) in { cod: item.cod, non_cod: item.non_cod }"
                :key="sKey"
                class="flex items-center justify-between"
              >
                <div class="flex items-center gap-1.5">
                  <span class="h-2 w-2 shrink-0 rounded-full" :class="sKey === 'cod' ? 'bg-amber-400' : 'bg-blue-400'" />
                  <div>
                    <p class="text-xs font-semibold text-gray-700">{{ sKey === 'cod' ? 'COD' : 'Non-COD' }}</p>
                    <p class="text-[10px] text-gray-400">{{ fmtCount(split.total_orders) }} orders · {{ fmtCount(split.affected_orders) }} affected</p>
                  </div>
                </div>
                <p class="text-xs font-bold text-gray-900">{{ fmtCurrency(split.returned_amount) }}</p>
              </div>
            </div>
          </div>
          <div v-if="!(overviewData?.breakdown_by_store?.items || []).length" class="col-span-full py-10 text-center text-sm text-gray-400">
            Tidak ada data
          </div>
        </template>
      </div>
    </div>

    <!-- ── Breakdown by Channel — Table ── -->
    <div class="rounded-2xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="border-b border-gray-100 px-5 py-3.5">
        <p class="font-semibold text-gray-900">Detail Breakdown</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/70 text-[11px] font-medium uppercase tracking-wide text-gray-400">
              <th class="whitespace-nowrap px-5 py-3 text-left">Channel</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Total Orders</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Affected</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Returning</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Returned</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Paket Retur</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Qty Retur</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Returned Amount</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Val. Rate</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="loading">
              <td colspan="9" class="px-5 py-6">
                <div class="space-y-2">
                  <div v-for="i in 3" :key="i" class="h-8 animate-pulse rounded-lg bg-gray-100" />
                </div>
              </td>
            </tr>
            <template v-else>
              <tr
                v-for="item in (overviewData?.breakdown_by_store?.items || [])"
                :key="item.store_id"
                class="hover:bg-gray-50/60"
              >
                <td class="whitespace-nowrap px-5 py-3">
                  <p class="text-xs font-semibold text-gray-800">{{ item.store_name }}</p>
                  <p class="mt-0.5 text-[11px] text-gray-400">COD {{ fmtCount(item.cod.affected_orders) }} · Non COD {{ fmtCount(item.non_cod.affected_orders) }}</p>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs font-medium text-gray-700">{{ fmtCount(item.total_orders) }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs">
                  <span class="font-semibold text-gray-900">{{ fmtCount(item.affected_orders) }}</span>
                  <span class="ml-1 text-gray-400">({{ fmtPercent(item.affected_order_rate) }})</span>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs">
                  <span class="font-medium text-amber-600">{{ fmtCount(item.returning_orders) }}</span>
                  <span class="ml-1 text-gray-400">({{ fmtPercent(item.returning_order_rate) }})</span>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs">
                  <span class="font-medium text-emerald-600">{{ fmtCount(item.returned_orders) }}</span>
                  <span class="ml-1 text-gray-400">({{ fmtPercent(item.returned_order_rate) }})</span>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs font-medium text-gray-700">{{ fmtCount(item.return_packages) }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs font-medium text-gray-700">{{ fmtCount(item.returned_qty) }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs font-bold text-gray-900">{{ fmtCurrency(item.returned_amount) }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-right">
                  <span
                    class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    :class="Number(item.return_value_rate) > 50 ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-600'"
                  >{{ fmtPercent(item.return_value_rate) }}</span>
                </td>
              </tr>
              <tr v-if="!(overviewData?.breakdown_by_store?.items || []).length">
                <td colspan="9" class="px-5 py-10 text-center text-sm text-gray-400">Tidak ada data</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Breakdown by Courier ── -->
    <div class="rounded-2xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="border-b border-gray-100 px-5 py-3.5">
        <p class="font-semibold text-gray-900">{{ overviewData?.breakdown_by_courier?.title || 'Breakdown by Courier' }}</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/70 text-[11px] font-medium uppercase tracking-wide text-gray-400">
              <th class="whitespace-nowrap px-5 py-3 text-left">Kurir</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Total Orders</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Affected</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Returning</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Returned</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Paket Retur</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Qty Retur</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Returned Amount</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Val. Rate</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="loading">
              <td colspan="9" class="px-5 py-6">
                <div class="space-y-2">
                  <div v-for="i in 4" :key="i" class="h-8 animate-pulse rounded-lg bg-gray-100" />
                </div>
              </td>
            </tr>
            <template v-else>
              <tr
                v-for="item in (overviewData?.breakdown_by_courier?.items || [])"
                :key="item.courier_code"
                class="hover:bg-gray-50/60"
              >
                <td class="whitespace-nowrap px-5 py-3">
                  <p class="text-xs font-semibold text-gray-800">{{ item.courier_name }}</p>
                  <p class="mt-0.5 font-mono text-[10px] uppercase text-gray-400">{{ item.courier_code }}</p>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs font-medium text-gray-700">{{ fmtCount(item.total_orders) }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs">
                  <span class="font-semibold text-gray-900">{{ fmtCount(item.affected_orders) }}</span>
                  <span class="ml-1 text-gray-400">({{ fmtPercent(item.affected_order_rate) }})</span>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs">
                  <span class="font-medium text-amber-600">{{ fmtCount(item.returning_orders) }}</span>
                  <span class="ml-1 text-gray-400">({{ fmtPercent(item.returning_order_rate) }})</span>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs">
                  <span class="font-medium text-emerald-600">{{ fmtCount(item.returned_orders) }}</span>
                  <span class="ml-1 text-gray-400">({{ fmtPercent(item.returned_order_rate) }})</span>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs font-medium text-gray-700">{{ fmtCount(item.return_packages) }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs font-medium text-gray-700">{{ fmtCount(item.returned_qty) }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs font-bold text-gray-900">{{ fmtCurrency(item.returned_amount) }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-right">
                  <span
                    class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    :class="Number(item.return_value_rate) > 50 ? 'bg-rose-50 text-rose-600' : Number(item.return_value_rate) > 20 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'"
                  >{{ fmtPercent(item.return_value_rate) }}</span>
                </td>
              </tr>
              <tr v-if="!(overviewData?.breakdown_by_courier?.items || []).length">
                <td colspan="9" class="px-5 py-10 text-center text-sm text-gray-400">Tidak ada data</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>