<script setup lang="ts">
import { RefreshCw, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

// ── Types ──────────────────────────────────────────────────────────────────────
interface PeriodOrderStatus {
  total_orders: number
  completed_orders: number
  completed_orders_percentage: string
  shipped_orders: number
  shipped_orders_percentage: string
  returned_orders: number
  returned_orders_percentage: string
  returned_orders_packaged: number
}

interface ReportStatus {
  period_orders: PeriodOrderStatus
  label: string
}

interface PLItem {
  label: string
  amount: string
  percentage?: string
  is_subtotal?: boolean
  is_total?: boolean
}

interface PLSection {
  type: 'header'
  label: string
  items: PLItem[]
}

interface PLData {
  applied_filters: Record<string, string | null>
  report_status: ReportStatus
  data: PLSection[]
}

type GroupedRow =
  | { type: 'group'; label: string; amount: string; percentage?: string; children: PLItem[]; key: string }
  | { type: 'item'; item: PLItem }

// ── State ──────────────────────────────────────────────────────────────────────
const api = useApi()
const toast = useToast()

const plData = ref<PLData | null>(null)
const loading = ref(false)
const collapsedSections = ref(new Set<string>())
const collapsedGroups = ref(new Set<string>())

// Filters
const filterDate = ref({ from: '', to: '' })
const filterStore = ref<string[]>([])
const filterCustomerCat = ref<string[]>([])
const dateType = ref<'created' | 'shipped' | 'paid'>('created')

// Filter options
const storeOptions = ref<Array<{ value: string; label: string }>>([])
const customerCatOptions = ref<Array<{ value: string; label: string }>>([])

// ── Tabs ───────────────────────────────────────────────────────────────────────
const tabs = [
  { label: 'Overview', to: '/report/finance/overview' },
  { label: 'Laba Rugi', to: '/report/finance/profit-loss' },
  { label: 'Dompet', to: '/wallet' },
  { label: 'History Transaksi', to: '/wallet/history' },
]

// ── Section config ─────────────────────────────────────────────────────────────
const SECTION_CONFIG: Record<string, { headerText: string; totalText: string; groupText: string; totalBg: string }> = {
  'PENDAPATAN': { headerText: 'text-blue-700', totalText: 'text-blue-700', groupText: 'text-blue-600', totalBg: 'bg-blue-50 ring-blue-200' },
  'HARGA POKOK PENJUALAN': { headerText: 'text-rose-700', totalText: 'text-rose-700', groupText: 'text-rose-600', totalBg: 'bg-rose-50 ring-rose-200' },
  'LABA KOTOR': { headerText: 'text-violet-700', totalText: 'text-violet-700', groupText: 'text-violet-600', totalBg: 'bg-violet-50 ring-violet-200' },
  'PENDAPATAN & BIAYA LAINNYA': { headerText: 'text-amber-700', totalText: 'text-amber-600', groupText: 'text-amber-600', totalBg: 'bg-amber-50 ring-amber-200' },
  'LABA BERSIH': { headerText: 'text-primary-700', totalText: 'text-primary-700', groupText: 'text-primary-600', totalBg: 'bg-primary-50 ring-primary-200' },
}

function getSectionConfig(label: string) {
  return SECTION_CONFIG[label] ?? { headerText: 'text-gray-700', totalText: 'text-gray-700', groupText: 'text-gray-600', totalBg: 'bg-gray-50 ring-gray-200' }
}

// ── Grouping ───────────────────────────────────────────────────────────────────
function groupSectionItems(items: PLItem[]): GroupedRow[] {
  const result: GroupedRow[] = []
  let buffer: PLItem[] = []
  for (const item of items) {
    if (item.is_total) {
      buffer.forEach(b => result.push({ type: 'item', item: b }))
      buffer = []
      result.push({ type: 'item', item })
    }
    else if (item.is_subtotal) {
      if (buffer.length > 0) {
        result.push({ type: 'group', label: item.label, amount: item.amount, percentage: item.percentage, children: [...buffer], key: item.label })
        buffer = []
      }
      else {
        result.push({ type: 'item', item })
      }
    }
    else {
      buffer.push(item)
    }
  }
  buffer.forEach(b => result.push({ type: 'item', item: b }))
  return result
}

function toggleSection(label: string) {
  if (collapsedSections.value.has(label)) collapsedSections.value.delete(label)
  else collapsedSections.value.add(label)
}

function toggleGroup(key: string) {
  if (collapsedGroups.value.has(key)) collapsedGroups.value.delete(key)
  else collapsedGroups.value.add(key)
}

// ── Summary cards ──────────────────────────────────────────────────────────────
const summaryCards = computed(() => {
  if (!plData.value?.data) return null
  const findTotal = (sectionLabel: string) =>
    plData.value!.data.find(s => s.label === sectionLabel)?.items.find(i => i.is_total)?.amount ?? '0'
  const penjualanBersih = findTotal('PENDAPATAN')
  const labaKotor = findTotal('LABA KOTOR')
  const labaBersih = findTotal('LABA BERSIH')
  const margin = Number(penjualanBersih) !== 0
    ? (Number(labaBersih) / Number(penjualanBersih)) * 100
    : 0
  return { penjualanBersih, labaKotor, labaBersih, margin }
})

// ── Params ─────────────────────────────────────────────────────────────────────
function buildParams(): Record<string, string> {
  const p: Record<string, string> = {}
  p.date_type = dateType.value
  if (filterDate.value.from) p.date_from = formatDateFromForApi(filterDate.value.from)
  if (filterDate.value.to) p.date_to = formatDateToForApi(filterDate.value.to)
  if (filterStore.value.length) p.store_id = filterStore.value.join(',')
  if (filterCustomerCat.value.length) p.customer_category_id = filterCustomerCat.value.join(',')
  return p
}

// ── Fetch ──────────────────────────────────────────────────────────────────────
async function fetchPL() {
  loading.value = true
  plData.value = null
  try {
    const res = await api.get<{ data: PLData }>('/reports/finances/profit-loss', buildParams())
    plData.value = res.data
  }
  catch (err: any) { toast.error(err?.message || 'Gagal memuat laporan laba rugi') }
  finally { loading.value = false }
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

function onFilterChange() { fetchPL() }

// ── Formatters ─────────────────────────────────────────────────────────────────
function fmtAmt(v: string | number) {
  const n = Number(v)
  if (n === 0) return 'Rp0'
  return `${n < 0 ? '-' : ''}Rp${formatCurrency(Math.abs(n))}`
}

function fmtAmtShort(v: string | number): string {
  const n = Number(v)
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}M`
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}jt`
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}rb`
  return fmtAmt(v)
}

function amtClass(v: string | number, bold = false) {
  const n = Number(v)
  if (n < 0) return bold ? 'font-bold text-red-600' : 'text-red-500'
  if (n > 0) return bold ? 'font-bold text-gray-900' : 'text-gray-700'
  return 'text-gray-400'
}

onMounted(async () => {
  await fetchOptions()
  fetchPL()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Laporan Keuangan</h1>
        <p class="mt-0.5 text-sm text-gray-500">Laporan Laba Rugi</p>
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
      <!-- refresh -->
      <div class="ml-auto flex items-center gap-2"> 
        <button
          class="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
          @click="fetchPL"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div v-if="summaryCards" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs text-gray-400">Total Penjualan Bersih</p>
        <p class="mt-0.5 text-xl font-bold" :class="Number(summaryCards.penjualanBersih) < 0 ? 'text-red-600' : 'text-gray-900'">{{ fmtAmtShort(summaryCards.penjualanBersih) }}</p>
        <p class="mt-0.5 text-[11px] text-gray-400">{{ fmtAmt(summaryCards.penjualanBersih) }}</p>
      </div>
      <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs text-gray-400">Laba Kotor</p>
        <p class="mt-0.5 text-xl font-bold" :class="Number(summaryCards.labaKotor) < 0 ? 'text-red-600' : 'text-gray-900'">{{ fmtAmtShort(summaryCards.labaKotor) }}</p>
        <p class="mt-0.5 text-[11px] text-gray-400">{{ fmtAmt(summaryCards.labaKotor) }}</p>
      </div>
      <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs text-gray-400">Laba Bersih</p>
        <p class="mt-0.5 text-xl font-bold" :class="Number(summaryCards.labaBersih) < 0 ? 'text-red-600' : 'text-gray-900'">{{ fmtAmtShort(summaryCards.labaBersih) }}</p>
        <p class="mt-0.5 text-[11px] text-gray-400">{{ fmtAmt(summaryCards.labaBersih) }}</p>
      </div>
      <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs text-gray-400">Margin Laba Bersih</p>
        <p class="mt-0.5 text-xl font-bold" :class="summaryCards.margin < 0 ? 'text-red-600' : 'text-gray-900'">{{ summaryCards.margin.toFixed(1) }}%</p>
        <p class="mt-0.5 text-[11px] text-gray-400">vs Penjualan Bersih</p>
      </div>
    </div>
    <div v-else-if="loading" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div v-for="i in 4" :key="i" class="h-20 animate-pulse rounded-xl bg-gray-100" />
    </div>

    <!-- Status Laporan -->
    <div v-if="plData?.report_status" class="space-y-3">
      <div class="grid grid-cols-3 gap-3 sm:grid-cols-5">
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="text-xs text-gray-400">Total Order</p>
          <p class="mt-0.5 text-xl font-bold text-gray-900">{{ plData.report_status.period_orders.total_orders }}</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="text-xs text-gray-400">Selesai</p>
          <p class="mt-0.5 text-xl font-bold text-emerald-600">{{ plData.report_status.period_orders.completed_orders }}</p>
          <p class="mt-0.5 text-[11px] text-gray-400">{{ plData.report_status.period_orders.completed_orders_percentage }}% dari total</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="text-xs text-gray-400">Dikirim</p>
          <p class="mt-0.5 text-xl font-bold text-sky-600">{{ plData.report_status.period_orders.shipped_orders }}</p>
          <p class="mt-0.5 text-[11px] text-gray-400">{{ plData.report_status.period_orders.shipped_orders_percentage }}% dari total</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="text-xs text-gray-400">Return</p>
          <p class="mt-0.5 text-xl font-bold text-red-600">{{ plData.report_status.period_orders.returned_orders }}</p>
          <p class="mt-0.5 text-[11px] text-gray-400">{{ plData.report_status.period_orders.returned_orders_percentage }}% dari total</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="text-xs text-gray-400">Paket Return</p>
          <p class="mt-0.5 text-xl font-bold text-orange-600">{{ plData.report_status.period_orders.returned_orders_packaged }}</p>
        </div>
      </div>
      <div class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <AlertTriangle class="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
        <p class="text-xs text-amber-700">{{ plData.report_status.label }}</p>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading && !plData" class="space-y-4 max-w-3xl mx-auto">
      <div v-for="i in 5" :key="i" class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="h-10 animate-pulse rounded-t-xl bg-gray-100" />
        <div class="space-y-2 p-4">
          <div v-for="j in 4" :key="j" class="h-5 animate-pulse rounded bg-gray-50" />
        </div>
      </div>
    </div>

    <!-- P&L Sections -->
    <template v-else-if="plData?.data?.length">
      <div class="mx-auto w-full max-w-3xl space-y-3">
        <div
          v-for="(section, sIdx) in plData.data"
          :key="section.label"
          class="overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-gray-200"
        >
          <!-- Section Header -->
          <button
            class="flex w-full items-center justify-between px-5 py-3 text-left"
            @click="toggleSection(section.label)"
          >
            <p class="text-sm font-semibold" :class="getSectionConfig(section.label).headerText">{{ sIdx + 1 }}. {{ section.label }}</p>
            <ChevronUp v-if="!collapsedSections.has(section.label)" class="h-4 w-4 text-gray-400" />
            <ChevronDown v-else class="h-4 w-4 text-gray-400" />
          </button>

          <!-- Items -->
          <div v-if="!collapsedSections.has(section.label)" class="border-t border-gray-100">
            <template v-for="row in groupSectionItems(section.items)" :key="row.type === 'group' ? row.key : row.item.label">
              <!-- Group (subtotal as collapsible) -->
              <template v-if="row.type === 'group'">
                <button
                  class="flex w-full items-center justify-between bg-gray-50 px-5 py-2.5 text-left hover:bg-gray-100/70"
                  @click="toggleGroup(section.label + ':' + row.key)"
                >
                  <span class="flex items-center gap-1.5 text-sm font-semibold" :class="getSectionConfig(section.label).groupText">
                    <ChevronDown v-if="collapsedGroups.has(section.label + ':' + row.key)" class="h-3.5 w-3.5" />
                    <ChevronUp v-else class="h-3.5 w-3.5" />
                    {{ row.label }}
                  </span>
                  <div class="flex items-center gap-3">
                    <span v-if="row.percentage && row.percentage !== '0'" class="text-xs text-gray-400">{{ Number(row.percentage).toFixed(2) }}%</span>
                    <span class="tabular-nums text-sm font-semibold" :class="amtClass(row.amount, true)">{{ fmtAmt(row.amount) }}</span>
                  </div>
                </button>
                <template v-if="!collapsedGroups.has(section.label + ':' + row.key)">
                  <div
                    v-for="child in row.children"
                    :key="child.label"
                    class="flex items-center justify-between border-t border-gray-50 py-2 pl-10 pr-5"
                  >
                    <span class="text-sm text-gray-500">{{ child.label }}</span>
                    <div class="flex items-center gap-3">
                      <span v-if="child.percentage && child.percentage !== '0'" class="text-xs text-gray-400">{{ Number(child.percentage).toFixed(2) }}%</span>
                      <span class="tabular-nums text-sm" :class="amtClass(child.amount)">{{ fmtAmt(child.amount) }}</span>
                    </div>
                  </div>
                </template>
              </template>

              <!-- Regular / Total item -->
              <div
                v-else
                class="flex items-center justify-between border-t border-gray-100 px-5"
                :class="row.item.is_total ? 'py-3 ' + getSectionConfig(section.label).totalBg : 'py-2.5'"
              >
                <span
                  class="text-sm"
                  :class="row.item.is_total
                    ? 'font-bold ' + getSectionConfig(section.label).totalText
                    : 'text-gray-600'"
                >{{ row.item.label }}</span>
                <div class="flex items-center gap-3">
                  <span
                    v-if="row.item.percentage && row.item.percentage !== '0' && row.item.percentage !== '100'"
                    class="text-xs"
                    :class="row.item.is_total ? getSectionConfig(section.label).groupText : 'text-gray-400'"
                  >{{ Number(row.item.percentage).toFixed(2) }}%</span>
                  <span
                    class="tabular-nums"
                    :class="row.item.is_total
                      ? 'text-base font-bold ' + (Number(row.item.amount) < 0 ? 'text-red-600' : getSectionConfig(section.label).totalText)
                      : 'text-sm ' + amtClass(row.item.amount)"
                  >{{ fmtAmt(row.item.amount) }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- Empty -->
    <div v-else-if="!loading" class="flex flex-col items-center justify-center rounded-xl bg-white py-16 shadow-xs ring-1 ring-gray-200">
      <p class="text-sm text-gray-400">Tidak ada data untuk periode ini</p>
    </div>

    <div class="min-h-[40px]" />
  </div>
</template>
