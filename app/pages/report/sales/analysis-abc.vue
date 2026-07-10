<script setup lang="ts">
import { RefreshCw, ChevronDown, ChevronRight, Download, Loader2 } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

// ── Types ──────────────────────────────────────────────────────────────────
interface Variant { name: string; value: string }
interface SkuItem {
  sku_id: string; sku: string; product_id?: string; product_name?: string; variants: Variant[]
  revenue: string; profit: string; orders: number; aov: string; qty: number
  percentage: string; percentage_of_product?: string
}
interface ProductItem {
  product_id: string; product_name: string
  revenue: string; profit: string; orders: number; aov: string; qty: number
  percentage: string; skus: SkuItem[]
}
interface MetricDef { key: string; label: string }
interface AnalysisData {
  title: string; sort_by: string
  available_metrics: MetricDef[]
  group_by: string
  products: { category_a: ProductItem[]; category_b: ProductItem[]; category_c: ProductItem[] }
  skus: { category_a: SkuItem[]; category_b: SkuItem[]; category_c: SkuItem[] }
}

// ── State ──────────────────────────────────────────────────────────────────
const api = useApi()
const toast = useToast()

const analysisData = ref<AnalysisData | null>(null)
const loading = ref(false)

const filterDate = ref({ from: '', to: '' })
const filterStore = ref<string[]>([])
const filterProductCat = ref<string[]>([])
const dateType = ref<'created' | 'shipped'>('shipped')
const groupBy = ref<'product' | 'sku'>('product')
const sortBy = ref('revenue')
const thresholdA = ref(80)
const thresholdB = ref(95)

const storeOptions = ref<Array<{ value: string; label: string }>>([])
const productCatOptions = ref<Array<{ value: string; label: string }>>([])

// expanded products in products view
const expandedProducts = ref<Set<string>>(new Set())

const tabs = [
  { label: 'Overview', to: '/report/sales/overview' },
  { label: 'ABC Analysis', to: '/report/sales/analysis-abc' },
  { label: 'Per Produk', to: '/report/sales/analysis-per-product' },
  { label: 'Per Source', to: '/report/sales/analysis-per-source' },
  { label: 'Per Tag', to: '/report/sales/analysis-per-tag' },
  { label: 'Per Toko', to: '/report/sales/analysis-per-store' },
  { label: 'Per Kurir', to: '/report/sales/analysis-per-courier' },
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
  const p: Record<string, string> = {
    group_by: groupBy.value,
    sort_by: sortBy.value,
    date_type: dateType.value,
    category_a: String(thresholdA.value),
    category_b: String(thresholdB.value),
    category_c: '100',
  }
  if (filterDate.value.from) p.date_from = formatDateFromForApi(filterDate.value.from)
  if (filterDate.value.to) p.date_to = formatDateToForApi(filterDate.value.to)
  if (filterStore.value.length) p.store_id = filterStore.value.join(',')
  if (filterProductCat.value.length) p.category_id = filterProductCat.value.join(',')
  return p
}

// ── Fetch ──────────────────────────────────────────────────────────────────
async function fetchData() {
  loading.value = true
  expandedProducts.value.clear()
  try {
    const res = await api.get<{ data: { analysis: AnalysisData } }>('/reports/sales/analysis-abc', buildParams())
    analysisData.value = res.data.analysis
    if (analysisData.value?.sort_by) sortBy.value = analysisData.value.sort_by
  }
  catch (err: any) { toast.error(err.message || 'Gagal memuat ABC analysis') }
  finally { loading.value = false }
}

async function fetchOptions() {
  try {
    const [stores, cats] = await Promise.all([
      api.get<{ data: Array<{ id: string; shop_name: string }> }>('/stores/public/index').catch(() => ({ data: [] as Array<{ id: string; shop_name: string }> })),
      api.get<{ data: Array<{ id: string; name: string }> }>('/products/categories/index', { search: '' }).catch(() => ({ data: [] as Array<{ id: string; name: string }> })),
    ])
    storeOptions.value = (stores.data || []).map(s => ({ value: s.id, label: s.shop_name }))
    productCatOptions.value = (cats.data || []).map(c => ({ value: c.id, label: c.name }))
  }
  catch { /* ignore */ }
}

const exporting = ref(false)

async function exportData() {
  if (exporting.value) return
  exporting.value = true
  try {
    const endpoint = '/reports/sales/analysis-abc/export'
    const response = await api.get<Blob>(endpoint, buildParams(), { responseType: 'blob' })
    const blob = new Blob([response as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const now = new Date()
    const date = now.toISOString().slice(0, 10).replace(/-/g, '')
    const hhmm = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    link.download = `analysis_abc_${date}_${hhmm}.xlsx`
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

onMounted(async () => { await fetchOptions(); fetchData() })

// ── Computed ───────────────────────────────────────────────────────────────
function metricVal(item: ProductItem | SkuItem): number {
  if (sortBy.value === 'revenue') return Number(item.revenue)
  if (sortBy.value === 'profit') return Number(item.profit)
  if (sortBy.value === 'orders') return item.orders
  if (sortBy.value === 'aov') return Number(item.aov)
  if (sortBy.value === 'qty') return item.qty
  return 0
}

function fmtMetric(item: ProductItem | SkuItem): string {
  const v = metricVal(item)
  if (sortBy.value === 'revenue' || sortBy.value === 'profit' || sortBy.value === 'aov') return `Rp${formatCurrency(v)}`
  return formatCurrency(v)
}

function fmtAny(val: string | number, metric: string): string {
  const v = Number(val)
  if (metric === 'revenue' || metric === 'profit' || metric === 'aov') return `Rp${formatCurrency(v)}`
  return formatCurrency(v)
}

const productsA = computed(() => analysisData.value?.products.category_a || [])
const productsB = computed(() => analysisData.value?.products.category_b || [])
const productsC = computed(() => analysisData.value?.products.category_c || [])
const skusA = computed(() => analysisData.value?.skus.category_a || [])
const skusB = computed(() => analysisData.value?.skus.category_b || [])
const skusC = computed(() => analysisData.value?.skus.category_c || [])

const currentA = computed(() => groupBy.value === 'product' ? productsA.value : skusA.value)
const currentB = computed(() => groupBy.value === 'product' ? productsB.value : skusB.value)
const currentC = computed(() => groupBy.value === 'product' ? productsC.value : skusC.value)

const totalItems = computed(() => currentA.value.length + currentB.value.length + currentC.value.length)

function catMetricTotal(items: Array<ProductItem | SkuItem>): number {
  return items.reduce((s, i) => s + metricVal(i), 0)
}
const grandTotal = computed(() => catMetricTotal([...currentA.value, ...currentB.value, ...currentC.value]))

function toggleExpand(id: string) {
  if (expandedProducts.value.has(id)) expandedProducts.value.delete(id)
  else expandedProducts.value.add(id)
}

function variantLabel(variants: Variant[]): string {
  return variants.map(v => v.value).join(' / ')
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">ABC Analysis</h1>
        <p class="mt-0.5 text-sm text-gray-500">Klasifikasi produk berdasarkan kontribusi terhadap total metrik</p>
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
        @update:model-value="filterStore = $event as string[]; fetchData()"
      />
      <AppFilterSelect
        :model-value="filterProductCat"
        :options="productCatOptions"
        placeholder="Kategori Produk"
        multiple
        searchable
        @update:model-value="filterProductCat = $event as string[]; fetchData()"
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

    <!-- Controls row -->
    <div class="flex flex-wrap items-center gap-3">
      <!-- Group by -->
      <div class="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
        <button
          class="px-3 py-1.5 font-medium transition-colors"
          :class="groupBy === 'product' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="groupBy = 'product'; fetchData()"
        >Per Produk</button>
        <button
          class="px-3 py-1.5 font-medium transition-colors"
          :class="groupBy === 'sku' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="groupBy = 'sku'; fetchData()"
        >Per SKU</button>
      </div>

      <!-- Sort by (metric) -->
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-xs text-gray-400">Sort by:</span>
        <button
          v-for="m in availableMetrics"
          :key="m.key"
          class="rounded-full border px-2.5 py-1 text-xs font-medium transition-all"
          :class="sortBy === m.key
            ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'"
          @click="sortBy = m.key; fetchData()"
        >
          {{ m.label }}
        </button>
      </div>

      <!-- Thresholds -->
      <div class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs">
        <span class="font-medium text-emerald-600">A</span>
        <span class="text-gray-400">0 –</span>
        <input
          v-model.number="thresholdA"
          type="number"
          min="1"
          max="99"
          class="w-10 rounded border border-gray-200 px-1 py-0.5 text-center text-xs outline-none focus:border-primary-400"
          @change="fetchData"
        />
        <span class="text-gray-400">%</span>
        <span class="mx-1 text-gray-200">|</span>
        <span class="font-medium text-amber-500">B</span>
        <span class="text-gray-400">–</span>
        <input
          v-model.number="thresholdB"
          type="number"
          min="1"
          max="100"
          class="w-10 rounded border border-gray-200 px-1 py-0.5 text-center text-xs outline-none focus:border-primary-400"
          @change="fetchData"
        />
        <span class="text-gray-400">%</span>
        <span class="mx-1 text-gray-200">|</span>
        <span class="font-medium text-red-400">C</span>
        <span class="text-gray-400">– 100%</span>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-3 gap-4">
      <div
        v-for="cat in [
          { key: 'A', label: 'Produk Utama', color: 'emerald', items: currentA, threshold: `0 – ${thresholdA}%` },
          { key: 'B', label: 'Produk Menengah', color: 'amber', items: currentB, threshold: `${thresholdA} – ${thresholdB}%` },
          { key: 'C', label: 'Produk Minor', color: 'red', items: currentC, threshold: `${thresholdB} – 100%` },
        ]"
        :key="cat.key"
        class="overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-gray-200"
      >
        <!-- Top accent bar -->
        <div
          class="h-1.5 w-full"
          :class="{
            'bg-emerald-500': cat.color === 'emerald',
            'bg-amber-400': cat.color === 'amber',
            'bg-red-400': cat.color === 'red',
          }"
        />

        <div class="p-4">
          <!-- Header -->
          <div class="mb-4 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full text-xl font-black text-white"
                :class="{
                  'bg-emerald-500': cat.color === 'emerald',
                  'bg-amber-400': cat.color === 'amber',
                  'bg-red-400': cat.color === 'red',
                }"
              >{{ cat.key }}</div>
              <div>
                <p class="text-sm font-bold text-gray-900">Kategori {{ cat.key }}</p>
                <p class="text-xs text-gray-400">{{ cat.label }}</p>
              </div>
            </div>
            <span class="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-400">{{ cat.threshold }}</span>
          </div>

          <!-- Item count -->
          <div class="mb-4">
            <p class="text-3xl font-extrabold text-gray-900">{{ cat.items.length }}</p>
            <p class="mt-0.5 text-xs text-gray-400">
              dari {{ totalItems }} item
              <span class="ml-1 font-semibold text-gray-600">
                ({{ totalItems > 0 ? `${((cat.items.length / totalItems) * 100).toFixed(0)}%` : '0%' }})
              </span>
            </p>
          </div>

          <!-- Metric contribution bar -->
          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <span class="text-xs text-gray-500">Kontribusi {{ availableMetrics.find(m => m.key === sortBy)?.label }}</span>
              <span
                class="text-xs font-bold"
                :class="{
                  'text-emerald-600': cat.color === 'emerald',
                  'text-amber-600': cat.color === 'amber',
                  'text-red-500': cat.color === 'red',
                }"
              >{{ grandTotal > 0 ? `${((catMetricTotal(cat.items) / grandTotal) * 100).toFixed(1)}%` : '—' }}</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                class="h-2 rounded-full transition-all duration-500"
                :class="{
                  'bg-emerald-500': cat.color === 'emerald',
                  'bg-amber-400': cat.color === 'amber',
                  'bg-red-400': cat.color === 'red',
                }"
                :style="{ width: grandTotal > 0 ? `${(catMetricTotal(cat.items) / grandTotal) * 100}%` : '0%' }"
              />
            </div>
            <p class="mt-1.5 text-xs font-semibold text-gray-700">
              {{ grandTotal > 0 ? fmtAny(catMetricTotal(cat.items).toFixed(0), sortBy) : '—' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-24 animate-pulse rounded-xl bg-gray-100" />
    </div>

    <!-- Category sections -->
    <template v-else-if="analysisData">
      <div
        v-for="(cat, catIdx) in [
          { key: 'A', label: 'Kategori A — Produk Utama', color: 'emerald', items: currentA as Array<ProductItem | SkuItem> },
          { key: 'B', label: 'Kategori B — Produk Menengah', color: 'amber', items: currentB as Array<ProductItem | SkuItem> },
          { key: 'C', label: 'Kategori C — Produk Minor', color: 'red', items: currentC as Array<ProductItem | SkuItem> },
        ]"
        :key="cat.key"
        class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200"
      >
        <!-- Section header -->
        <div
          class="flex items-center gap-3 rounded-t-xl px-4 py-3"
          :class="{
            'bg-emerald-50': cat.color === 'emerald',
            'bg-amber-50': cat.color === 'amber',
            'bg-red-50': cat.color === 'red',
          }"
        >
          <span
            class="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-black"
            :class="{
              'bg-emerald-500 text-white': cat.color === 'emerald',
              'bg-amber-400 text-white': cat.color === 'amber',
              'bg-red-400 text-white': cat.color === 'red',
            }"
          >{{ cat.key }}</span>
          <div class="flex-1">
            <p class="text-sm font-semibold text-gray-800">{{ cat.label }}</p>
            <p class="text-xs text-gray-400">{{ cat.items.length }} item · {{ grandTotal > 0 ? `${((catMetricTotal(cat.items) / grandTotal) * 100).toFixed(1)}%` : '0%' }} kontribusi</p>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="!cat.items.length" class="flex h-16 items-center justify-center text-xs text-gray-400">
          Tidak ada item dalam kategori ini
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 text-left text-xs text-gray-400">
                <th class="px-4 py-2.5">#</th>
                <th class="px-4 py-2.5">{{ groupBy === 'product' ? 'Produk' : 'SKU' }}</th>
                <th
                  v-for="m in availableMetrics"
                  :key="m.key"
                  class="whitespace-nowrap px-4 py-2.5 text-right"
                  :class="sortBy === m.key ? 'font-bold text-gray-700' : ''"
                >{{ m.label }}</th>
                <th class="px-4 py-2.5 text-right">% Kumulatif</th>
                <th v-if="groupBy === 'product'" class="px-4 py-2.5 text-center">SKU</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <template v-for="(item, idx) in cat.items" :key="groupBy === 'product' ? (item as ProductItem).product_id : (item as SkuItem).sku_id">
                <!-- Main row -->
                <tr
                  class="hover:bg-gray-50/50"
                  :class="groupBy === 'product' ? 'cursor-pointer' : ''"
                  @click="groupBy === 'product' && toggleExpand((item as ProductItem).product_id)"
                >
                  <td class="whitespace-nowrap px-4 py-2.5 text-xs text-gray-400">
                    {{ (catIdx === 0 ? 0 : catIdx === 1 ? currentA.length : currentA.length + currentB.length) + idx + 1 }}
                  </td>
                  <td class="px-4 py-2.5">
                    <div class="flex items-center gap-2">
                      <template v-if="groupBy === 'product'">
                        <ChevronDown
                          v-if="expandedProducts.has((item as ProductItem).product_id)"
                          class="h-3.5 w-3.5 shrink-0 text-gray-400"
                        />
                        <ChevronRight v-else class="h-3.5 w-3.5 shrink-0 text-gray-300" />
                        <span class="text-xs font-medium text-gray-800">{{ (item as ProductItem).product_name }}</span>
                      </template>
                      <template v-else>
                        <div>
                          <p v-if="(item as SkuItem).product_name" class="text-xs font-semibold text-gray-800">{{ (item as SkuItem).product_name }}</p>
                          <p class="text-xs font-medium" :class="(item as SkuItem).product_name ? 'text-gray-500' : 'text-gray-800'">{{ (item as SkuItem).sku }}</p>
                          <p v-if="(item as SkuItem).variants?.length" class="text-xs text-gray-400">{{ variantLabel((item as SkuItem).variants) }}</p>
                        </div>
                      </template>
                    </div>
                  </td>
                  <td
                    v-for="m in availableMetrics"
                    :key="m.key"
                    class="whitespace-nowrap px-4 py-2.5 text-right text-xs"
                    :class="sortBy === m.key ? 'font-bold text-primary-700' : 'text-gray-600'"
                  >{{ fmtAny(item[m.key as keyof typeof item] as string, m.key) }}</td>
                  <td class="whitespace-nowrap px-4 py-2.5 text-right">
                    <div class="inline-flex items-center gap-1.5">
                      <div class="h-1.5 w-16 rounded-full bg-gray-100">
                        <div
                          class="h-1.5 rounded-full"
                          :class="{
                            'bg-emerald-400': cat.color === 'emerald',
                            'bg-amber-400': cat.color === 'amber',
                            'bg-red-400': cat.color === 'red',
                          }"
                          :style="{ width: `${Math.min(Number(item.percentage), 100)}%` }"
                        />
                      </div>
                      <span class="text-xs text-gray-400">{{ Number(item.percentage).toFixed(1) }}%</span>
                    </div>
                  </td>
                  <td v-if="groupBy === 'product'" class="whitespace-nowrap px-4 py-2.5 text-center">
                    <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                      {{ (item as ProductItem).skus?.length || 0 }}
                    </span>
                  </td>
                </tr>
                <!-- Expanded SKU rows -->
                <template v-if="groupBy === 'product' && expandedProducts.has((item as ProductItem).product_id)">
                  <tr
                    v-for="sku in (item as ProductItem).skus"
                    :key="sku.sku_id"
                    class="bg-gray-50/70"
                  >
                    <td class="px-4 py-2" />
                    <td class="px-4 py-2 pl-10">
                      <div>
                        <p class="text-xs font-medium text-gray-700">{{ sku.sku }}</p>
                        <p v-if="sku.variants?.length" class="text-xs text-gray-400">{{ variantLabel(sku.variants) }}</p>
                      </div>
                    </td>
                    <td
                      v-for="m in availableMetrics"
                      :key="m.key"
                      class="whitespace-nowrap px-4 py-2 text-right text-xs"
                      :class="sortBy === m.key ? 'font-semibold text-gray-700' : 'text-gray-500'"
                    >{{ fmtAny(sku[m.key as keyof SkuItem] as string, m.key) }}</td>
                    <td class="whitespace-nowrap px-4 py-2 text-right">
                      <div class="inline-flex items-center gap-1.5">
                        <div class="h-1 w-16 rounded-full bg-gray-100">
                          <div class="h-1 rounded-full bg-gray-300" :style="{ width: `${Math.min(Number(sku.percentage_of_product), 100)}%` }" />
                        </div>
                        <span class="text-xs text-gray-400">{{ Number(sku.percentage_of_product).toFixed(1) }}%</span>
                      </div>
                    </td>
                    <td class="px-4 py-2" />
                  </tr>
                </template>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Empty -->
    <div v-else-if="!loading" class="flex h-28 items-center justify-center rounded-xl bg-white text-sm text-gray-400 ring-1 ring-gray-200">
      Tidak ada data
    </div>
  </div>
</template>
