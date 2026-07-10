<script setup lang="ts">
import {
  Plus, Search, Eye, RefreshCw, ClipboardList, XCircle, Download, Loader2, ChevronDown,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface StockUsageReturn {
  id: string
  no: string
  date: string
  note: string
  status: string
  total: string
  stock_usage: {
    id: string
    no: string
    warehouse: { id: string; name: string } | null
  } | null
  created_at: string
}

interface Paginated {
  data: StockUsageReturn[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const route = useRoute()

const loading = ref(true)
const items = ref<StockUsageReturn[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)
const search = ref('')
const filterStatus = ref<string[]>([])
const filterDate = ref({ from: '', to: '' })

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Selesai' },
  { value: 'canceled', label: 'Dibatalkan' },
]

const statusConfig: Record<string, { label: string; bg: string }> = {
  draft: { label: 'Draft', bg: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  completed: { label: 'Selesai', bg: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  canceled: { label: 'Dibatalkan', bg: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
}

function buildParams(): Record<string, string> {
  const p: Record<string, string> = {}
  if (search.value) p.search = search.value
  if (filterStatus.value.length) p.status = filterStatus.value.join(',')
  if (filterDate.value.from) { p.date_from = formatDateFromForApi(filterDate.value.from); p.date_to = formatDateToForApi(filterDate.value.to) }
  return p
}

async function fetchItems() {
  loading.value = true
  try {
    const params = { page: String(page.value), per_page: String(perPage.value), ...buildParams() }
    const res = await api.get<{ data: Paginated }>('/inventories/stock-usage-returns/index', params)
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
  searchTimer = setTimeout(() => { page.value = 1; fetchItems() }, 300)
}

function onStatusFilter(val: string | string[]) {
  filterStatus.value = val as string[]
  page.value = 1; fetchItems()
}

function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1; fetchItems()
}

function onPageChange(p: number) { page.value = p; fetchItems() }
function onPerPageChange(pp: number) { perPage.value = pp; page.value = 1; fetchItems() }

async function handleCancel(item: StockUsageReturn) {
  const ok = await confirm({
    title: 'Batalkan Return',
    message: `Batalkan "${item.no}"? Stok yang sudah dikembalikan akan di-reset.`,
    confirmText: 'Batalkan',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.post(`/inventories/stock-usage-returns/${item.id}/cancel`, {})
    toast.success('Return berhasil dibatalkan')
    fetchItems()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal membatalkan')
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
    const response = await api.get<Blob>(endpoint, buildParams(), { responseType: 'blob' })
    const blob = new Blob([response as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const now = new Date()
    const date = now.toISOString().slice(0, 10).replace(/-/g, '')
    const hhmm = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    const name = 'stock_usage_return_' + (endpoint.split('/').pop() || 'export').replace(/-/g, '_')
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

onMounted(fetchItems)
</script>

<template>
  <div class="space-y-5" @click="showExportDropdown = false">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Retur Pemakaian Stok</h1>
        <p class="mt-0.5 text-sm text-gray-500">Kelola pengembalian stok dari pemakaian yang sudah selesai.</p>
      </div>
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

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative min-w-[220px] flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari nomor, catatan..."
          class="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
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
      <AppDateRangePicker :model-value="filterDate" @update:model-value="onDateFilter" />
      <button
        class="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 transition-colors"
        :disabled="loading"
        @click="fetchItems"
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
          class="absolute right-0 top-full z-30 mt-1 w-60 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          <button class="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50" @click="exportData('/inventories/stock-usage-returns/export')">
            Retur Pemakaian Stok
          </button>
          <button class="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50" @click="exportData('/inventories/stock-usage-returns/export-with-items')">
            Retur Pemakaian Stok With Items
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
              <th class="px-4 py-3 text-left">Nomor Return</th>
              <th class="px-4 py-3 text-left">Stock Usage</th>
              <th class="px-4 py-3 text-left">Gudang</th>
              <th class="px-4 py-3 text-left">Tanggal</th>
              <th class="px-4 py-3 text-left">Catatan</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3 text-right">Total Nilai</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr v-for="i in 6" :key="i" class="border-b border-gray-100">
              <td v-for="j in 8" :key="j" class="px-4 py-3">
                <div class="h-4 animate-pulse rounded bg-gray-200" :class="j === 5 ? 'w-40' : 'w-20'" />
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="!items.length">
            <tr>
              <td colspan="8" class="px-4 py-16 text-center">
                <ClipboardList class="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p class="text-sm text-gray-500">Belum ada data retur</p>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr
              v-for="item in items"
              :key="item.id"
              class="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors"
            >
              <td class="px-4 py-3">
                <NuxtLink :to="`/inventory/usage/return/${item.id}`" class="font-semibold text-primary-600 hover:underline">
                  {{ item.no }}
                </NuxtLink>
              </td>
              <td class="px-4 py-3">
                <NuxtLink
                  v-if="item.stock_usage"
                  :to="`/inventory/usage/${item.stock_usage.id}`"
                  class="text-sm text-gray-700 hover:text-primary-600 hover:underline"
                >
                  {{ item.stock_usage.no }}
                </NuxtLink>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ item.stock_usage?.warehouse?.name || '-' }}</td>
              <td class="px-4 py-3 whitespace-nowrap text-gray-600">{{ formatDate(item.date) }}</td>
              <td class="px-4 py-3 max-w-[160px]">
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
                    :to="`/inventory/usage/return/${item.id}`"
                    class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    title="Detail"
                  >
                    <Eye class="h-4 w-4" />
                  </NuxtLink>
                  <button
                    v-if="item.status !== 'canceled'"
                    class="rounded-lg p-1.5 text-gray-400 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    title="Batalkan"
                    @click="handleCancel(item)"
                  >
                    <XCircle class="h-4 w-4" />
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
