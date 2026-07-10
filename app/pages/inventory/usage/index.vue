<script setup lang="ts">
import {
  Plus, Search, Eye, Trash2,
  Pencil, RefreshCw, ClipboardList, TrendingDown,TrendingUp, Download, Loader2, ChevronDown,
  PackageCheck, Layers, XCircle, RotateCcw, Printer, Tag,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface StockUsage {
  id: string
  no: string
  date: string
  type: string
  note: string
  status: string
  total: string
  warehouse: { id: string; name: string } | null
  created_at: string
}

interface Paginated {
  data: StockUsage[]
  page: number
  per_page: number
  total_page: number
  total: number
}

interface Summary {
  total_count: number
  draft_count: number
  completed_count: number
  cancelled_count: number
  total_value: string
  total_stock_in: number
  total_stock_out: number
  total_products: number
  total_skus: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const route = useRoute()

const summary = ref<Summary | null>(null)
const loadingSummary = ref(false)

const loading = ref(true)
const items = ref<StockUsage[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)
const search = ref('')
const filterStatus = ref<string[]>([])
const filterDate = ref({ from: '', to: '' })
const filterWarehouseIds = ref<string[]>([])
const warehouses = ref<{ id: string; name: string }[]>([])
const loadingWarehouses = ref(false)

const warehouseOptions = computed(() =>
  warehouses.value.map(w => ({ value: w.id, label: w.name })),
)

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
]

const statusConfig: Record<string, { label: string; bg: string }> = {
  draft: { label: 'Draft', bg: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  completed: { label: 'Selesai', bg: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  cancelled: { label: 'Dibatalkan', bg: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
}

const typeLabel: Record<string, string> = {
  usage: 'Pemakaian',
  damage: 'Kerusakan',
  sample: 'Sampel',
  other: 'Lainnya',
}

function buildFilterParams(): Record<string, string> {
  const p: Record<string, string> = {}
  if (search.value) p.search = search.value
  if (filterStatus.value.length) p.status = filterStatus.value.join(',')
  if (filterDate.value.from) { p.date_from = formatDateFromForApi(filterDate.value.from); p.date_to = formatDateToForApi(filterDate.value.to) }
  if (filterWarehouseIds.value.length) p.warehouse_id = filterWarehouseIds.value.join(',')
  return p
}

async function fetchSummary() {
  loadingSummary.value = true
  try {
    const res = await api.get<{ data: Summary }>('/inventories/stock-usages/summary', buildFilterParams())
    summary.value = res.data || null
  }
  catch { summary.value = null }
  finally { loadingSummary.value = false }
}

async function fetchItems() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
      ...buildFilterParams(),
    }
    const res = await api.get<{ data: Paginated }>('/inventories/stock-usages/index', params)
    items.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch { items.value = [] }
  finally { loading.value = false }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchItems(); fetchSummary() }, 300)
}

// ─── Selection & Print ─────────────────────────────────────────────────────────
const selectedIds = ref<string[]>([])
const printingId = ref<string | null>(null)
const massPrinting = ref(false)
const printingLabelId = ref<string | null>(null)
const massPrintingLabel = ref(false)

const allSelected = computed(() =>
  items.value.length > 0 && items.value.every(i => selectedIds.value.includes(i.id)),
)

function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx === -1) selectedIds.value.push(id)
  else selectedIds.value.splice(idx, 1)
}

function toggleSelectAll() {
  if (allSelected.value) selectedIds.value = []
  else selectedIds.value = items.value.map(i => i.id)
}

async function printUsages(ids: string[]) {
  const response = await api.post<Blob>('/inventories/stock-usages/print-mass', { ids }, { responseType: 'blob' })
  const blob = new Blob([response as BlobPart], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}

async function printSingle(item: StockUsage) {
  if (printingId.value) return
  printingId.value = item.id
  try {
    await printUsages([item.id])
    toast.success('Dokumen pemakaian berhasil dicetak')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mencetak dokumen')
  }
  finally {
    printingId.value = null
  }
}

async function printMass() {
  if (massPrinting.value || !selectedIds.value.length) return
  massPrinting.value = true
  try {
    await printUsages([...selectedIds.value])
    toast.success(`${selectedIds.value.length} dokumen pemakaian berhasil dicetak`)
    selectedIds.value = []
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mencetak dokumen')
  }
  finally {
    massPrinting.value = false
  }
}

async function printLabels(ids: string[]) {
  const response = await api.post<Blob>('/inventories/stock-usages/print-label-mass', { ids }, { responseType: 'blob' })
  const blob = new Blob([response as BlobPart], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}

async function printLabelSingle(item: StockUsage) {
  if (printingLabelId.value) return
  printingLabelId.value = item.id
  try {
    await printLabels([item.id])
    toast.success('Label pemakaian berhasil dicetak')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mencetak label')
  }
  finally {
    printingLabelId.value = null
  }
}

async function printLabelMass() {
  if (massPrintingLabel.value || !selectedIds.value.length) return
  massPrintingLabel.value = true
  try {
    await printLabels([...selectedIds.value])
    toast.success(`${selectedIds.value.length} label pemakaian berhasil dicetak`)
    selectedIds.value = []
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mencetak label')
  }
  finally {
    massPrintingLabel.value = false
  }
}

function onStatusFilter(val: string | string[]) {
  filterStatus.value = val as string[]
  page.value = 1; fetchItems(); fetchSummary()
}

function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1; fetchItems(); fetchSummary()
}

function onWarehouseFilter(val: string | string[]) {
  filterWarehouseIds.value = val as string[]
  page.value = 1; fetchItems(); fetchSummary()
}

function onPageChange(p: number) { page.value = p; fetchItems() }
function onPerPageChange(pp: number) { perPage.value = pp; page.value = 1; fetchItems() }

async function fetchWarehouseOptions(q?: string) {
  loadingWarehouses.value = true
  try {
    const params: Record<string, string> = {}
    if (q) params.search = q
    const res = await api.get<{ data: any }>('/warehouses/public/index', params)
    warehouses.value = (res.data || []) as { id: string; name: string }[]
  }
  catch { warehouses.value = [] }
  finally { loadingWarehouses.value = false }
}

async function handleCancel(item: StockUsage) {
  const ok = await confirm({
    title: 'Batalkan Pemakaian Stok',
    message: `Batalkan "${item.no}"? Stok yang sudah dikurangi akan dikembalikan.`,
    confirmText: 'Batalkan',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.post(`/inventories/stock-usages/${item.id}/cancel`, {})
    toast.success('Pemakaian stok berhasil dibatalkan')
    fetchItems(); fetchSummary()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal membatalkan')
  }
}

async function handleDelete(item: StockUsage) {
  const ok = await confirm({
    title: 'Hapus Pemakaian Stok',
    message: `Hapus "${item.no}"? Data ini tidak dapat dipulihkan.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/inventories/stock-usages/${item.id}`)
    toast.success('Pemakaian stok berhasil dihapus')
    fetchItems(); fetchSummary()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus')
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────
const exporting = ref(false)
const showExportDropdown = ref(false)

async function exportData(endpoint: string) {
  if (exporting.value) return
  exporting.value = true
  showExportDropdown.value = false
  try {
    const params: Record<string, string> = {}
    if (search.value) params.search = search.value
    if (filterStatus.value.length) params.status = filterStatus.value.join(',')
    if (filterDate.value.from) {
      params.date_from = formatDateFromForApi(filterDate.value.from)
      params.date_to = formatDateToForApi(filterDate.value.to)
    }
    if (filterWarehouseIds.value.length) params.warehouse_id = filterWarehouseIds.value.join(',')
    const response = await api.get<Blob>(endpoint, params, { responseType: 'blob' })
    const blob = new Blob([response as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const now = new Date()
    const date = now.toISOString().slice(0, 10).replace(/-/g, '')
    const hhmm = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    const name = 'stock_usage_' + (endpoint.split('/').pop() || 'export').replace(/-/g, '_')
    link.download = `${name}_${date}_${hhmm}.xlsx`
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

onMounted(() => {
  fetchItems()
  fetchWarehouseOptions()
  fetchSummary()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Pemakaian Stok</h1>
        <p class="mt-0.5 text-sm text-gray-500">Kelola pengeluaran stok untuk pemakaian internal, sampel, dll.</p>
      </div>
      <NuxtLink
        to="/inventory/usage/create"
        class="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
      >
        <Plus class="h-4 w-4" />
        Buat Pemakaian
      </NuxtLink>
    </div>

    <!-- Tabs -->
    <div class="mb-4 flex border-b border-gray-200">
      <NuxtLink
        to="/inventory/usage"
        class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
        :class="!route.path.startsWith('/inventory/usage/return')
          ? 'border-primary-600 text-primary-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'"
      >
        Pemakaian Stok
      </NuxtLink>
      <NuxtLink
        to="/inventory/usage/return"
        class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
        :class="route.path.startsWith('/inventory/usage/return')
          ? 'border-primary-600 text-primary-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'"
      >
        Retur
      </NuxtLink>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <div class="col-span-2 sm:col-span-1 rounded-xl bg-white px-4 py-3.5 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs font-medium text-gray-500">Total</p>
        <div v-if="loadingSummary" class="mt-1.5 h-7 w-16 animate-pulse rounded bg-gray-200" />
        <p v-else class="mt-1 text-2xl font-bold text-gray-900">{{ summary?.total_count ?? '-' }}</p>
        <div class="mt-1.5 flex items-center gap-2 text-xs">
          <span class="text-yellow-600">{{ summary?.draft_count ?? 0 }} Draft</span>
          <span class="text-gray-300">·</span>
          <span class="text-green-600">{{ summary?.completed_count ?? 0 }} Selesai</span>
        </div>
      </div>
      <div class="col-span-2 sm:col-span-1 rounded-xl bg-white px-4 py-3.5 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs font-medium text-gray-500">Total Nilai</p>
        <div v-if="loadingSummary" class="mt-1.5 h-7 w-24 animate-pulse rounded bg-gray-200" />
        <p v-else class="mt-1 truncate text-xl font-bold text-gray-900">
          Rp{{ formatCurrency(summary?.total_value ?? '0') }}
        </p>
        <p class="mt-1.5 text-xs text-gray-400">Nilai stok terpakai</p>
      </div>
      <div class="rounded-xl bg-white px-4 py-3.5 shadow-xs ring-1 ring-gray-200">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-gray-500">Stok Keluar</p>
          <TrendingDown class="h-4 w-4 text-red-400" />
        </div>
        <div v-if="loadingSummary" class="mt-1.5 h-7 w-12 animate-pulse rounded bg-gray-200" />
        <p v-else class="mt-1 text-2xl font-bold text-red-500">{{ summary?.total_stock_out ?? '-' }}</p>
        <p class="mt-1.5 text-xs text-gray-400">Unit dipakai</p>
      </div>
      <div class="rounded-xl bg-white px-4 py-3.5 shadow-xs ring-1 ring-gray-200">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-gray-500">Stok Masuk</p>
          <TrendingUp class="h-4 w-4 text-green-400" />
        </div>
        <div v-if="loadingSummary" class="mt-1.5 h-7 w-12 animate-pulse rounded bg-gray-200" />
        <p v-else class="mt-1 text-2xl font-bold text-green-500">{{ summary?.total_stock_in ?? '-' }}</p>
        <p class="mt-1.5 text-xs text-gray-400">Unit masuk</p>
      </div>
      <div class="rounded-xl bg-white px-4 py-3.5 shadow-xs ring-1 ring-gray-200">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-gray-500">Produk</p>
          <PackageCheck class="h-4 w-4 text-primary-400" />
        </div>
        <div v-if="loadingSummary" class="mt-1.5 h-7 w-12 animate-pulse rounded bg-gray-200" />
        <p v-else class="mt-1 text-2xl font-bold text-gray-900">{{ summary?.total_products ?? '-' }}</p>
        <p class="mt-1.5 text-xs text-gray-400">Produk unik</p>
      </div>
      <div class="rounded-xl bg-white px-4 py-3.5 shadow-xs ring-1 ring-gray-200">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-gray-500">SKU</p>
          <Layers class="h-4 w-4 text-purple-400" />
        </div>
        <div v-if="loadingSummary" class="mt-1.5 h-7 w-12 animate-pulse rounded bg-gray-200" />
        <p v-else class="mt-1 text-2xl font-bold text-gray-900">{{ summary?.total_skus ?? '-' }}</p>
        <p class="mt-1.5 text-xs text-gray-400">Varian unik</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative min-w-[220px] flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari nomor, catatan..."
          class="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          @input="onSearch"
        />
      </div>
      <AppFilterSelect
        :model-value="filterStatus"
        :options="statusOptions"
        :searchable="false"
        multiple
        placeholder="Status"
        @update:model-value="onStatusFilter"
      />
      <AppFilterSelect
        :model-value="filterWarehouseIds"
        :options="warehouseOptions"
        :loading="loadingWarehouses"
        multiple
        placeholder="Gudang"
        search-placeholder="Cari gudang..."
        @update:model-value="onWarehouseFilter"
        @search="fetchWarehouseOptions"
      />
      <AppDateRangePicker :model-value="filterDate" @update:model-value="onDateFilter" />
      <button
        v-if="selectedIds.length"
        class="flex items-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 disabled:opacity-50"
        :disabled="massPrinting"
        @click="printMass"
      >
        <Loader2 v-if="massPrinting" class="h-4 w-4 animate-spin" />
        <Printer v-else class="h-4 w-4" />
        <span>Print ({{ selectedIds.length }})</span>
      </button>
      <button
        v-if="selectedIds.length"
        class="flex items-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 disabled:opacity-50"
        :disabled="massPrintingLabel"
        @click="printLabelMass"
      >
        <Loader2 v-if="massPrintingLabel" class="h-4 w-4 animate-spin" />
        <Tag v-else class="h-4 w-4" />
        <span>Print Label ({{ selectedIds.length }})</span>
      </button>
      <button
        class="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 transition-colors"
        :disabled="loading"
        @click="fetchItems(); fetchSummary()"
      >
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
      </button>
      <!-- Export Dropdown -->
      <div class="relative" @click.stop>
        <button
          class="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
          :disabled="exporting"
          @click="showExportDropdown = !showExportDropdown"
        >
          <Loader2 v-if="exporting" class="h-4 w-4 animate-spin" />
          <Download v-else class="h-4 w-4" />
          <span>Export</span>
          <ChevronDown class="h-3.5 w-3.5" />
        </button>
        <div
          v-if="showExportDropdown"
          class="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          <button class="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50" @click="exportData('/inventories/stock-usages/export')">
            Pemakaian Stok
          </button>
          <button class="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50" @click="exportData('/inventories/stock-usages/export-with-items')">
            Pemakaian Stok With Items
          </button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[700px] text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
              <th class="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  :checked="allSelected"
                  @change="toggleSelectAll"
                />
              </th>
              <th class="px-4 py-3 text-left">Nomor</th>
              <th class="px-4 py-3 text-left">Tanggal</th>
              <th class="px-4 py-3 text-left">Gudang</th>
              <th class="px-4 py-3 text-left">Tipe</th>
              <th class="px-4 py-3 text-left">Catatan</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3 text-right">Total Nilai</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr v-for="i in 8" :key="i" class="border-b border-gray-100">
              <td v-for="j in 9" :key="j" class="px-4 py-3">
                <div class="h-4 animate-pulse rounded bg-gray-200" :class="j === 6 ? 'w-40' : 'w-20'" />
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="!items.length">
            <tr>
              <td colspan="9" class="px-4 py-16 text-center">
                <ClipboardList class="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p class="text-sm text-gray-500">Belum ada pemakaian stok</p>
                <NuxtLink
                  to="/inventory/usage/create"
                  class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                >
                  <Plus class="h-3.5 w-3.5" />
                  Buat Pertama
                </NuxtLink>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr
              v-for="item in items"
              :key="item.id"
              class="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors"
            >
              <td class="px-4 py-3 text-center">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  :checked="selectedIds.includes(item.id)"
                  @change="toggleSelect(item.id)"
                />
              </td>
              <td class="px-4 py-3">
                <NuxtLink :to="`/inventory/usage/${item.id}`" class="font-semibold text-primary-600 hover:underline">
                  {{ item.no }}
                </NuxtLink>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-gray-600">{{ formatDate(item.date) }}</td>
              <td class="px-4 py-3 text-gray-700">{{ item.warehouse?.name || '-' }}</td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ typeLabel[item.type] || item.type || '-' }}</td>
              <td class="px-4 py-3 max-w-[180px]">
                <p class="line-clamp-1 text-gray-500">{{ item.note || '-' }}</p>
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="statusConfig[item.status]?.bg || 'bg-gray-100 text-gray-600'"
                >
                  {{ statusConfig[item.status]?.label || item.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap font-medium text-gray-900">
                Rp{{ formatCurrency(item.total) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <NuxtLink
                    :to="`/inventory/usage/${item.id}`"
                    class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    title="Detail"
                  >
                    <Eye class="h-4 w-4" />
                  </NuxtLink>
                  <button
                    class="rounded-lg p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600 transition-colors disabled:opacity-50"
                    title="Print"
                    :disabled="printingId === item.id"
                    @click="printSingle(item)"
                  >
                    <Loader2 v-if="printingId === item.id" class="h-4 w-4 animate-spin" />
                    <Printer v-else class="h-4 w-4" />
                  </button>
                  <button
                    class="rounded-lg p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600 transition-colors disabled:opacity-50"
                    title="Print Label"
                    :disabled="printingLabelId === item.id"
                    @click="printLabelSingle(item)"
                  >
                    <Loader2 v-if="printingLabelId === item.id" class="h-4 w-4 animate-spin" />
                    <Tag v-else class="h-4 w-4" />
                  </button>     
                  <NuxtLink
                    v-if="item.status === 'draft'"
                    :to="`/inventory/usage/create?edit=${item.id}`"
                    class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    title="Edit"
                  >
                    <Pencil class="h-4 w-4" />
                  </NuxtLink>
                  <button
                    v-if="item.status === 'completed'"
                    class="rounded-lg p-1.5 text-gray-400 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    title="Batalkan"
                    @click="handleCancel(item)"
                  >
                    <XCircle class="h-4 w-4" />
                  </button>
                  <NuxtLink
                    v-if="item.status === 'completed'"
                    :to="`/inventory/usage/return/create?usage_id=${item.id}`"
                    class="rounded-lg p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors"
                    title="Buat Return"
                  >
                    <RotateCcw class="h-4 w-4" />
                  </NuxtLink>
                  <button
                    v-if="item.status === 'draft'"
                    class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Hapus"
                    @click="handleDelete(item)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppPagination
        :page="page"
        :total-page="totalPage"
        :total="total"
        :per-page="perPage"
        :loading="loading"
        @update:page="onPageChange"
        @update:per-page="onPerPageChange"
      />
    </div>
  </div>
</template>
