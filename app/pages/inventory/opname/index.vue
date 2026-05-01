<script setup lang="ts">
import {
  Plus, Search, Eye, Trash2,
  Pencil, RefreshCw, ClipboardList, Link2,
  TrendingUp, TrendingDown, PackageCheck, Layers,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface StockOpname {
  id: string
  no: string
  date: string
  note: string
  status: string
  total: string
  stock_adjustment_id: string | null
  warehouse: { id: string; name: string } | null
  created_at: string
  updated_at: string
}

interface Paginated {
  data: StockOpname[]
  page: number
  per_page: number
  total_page: number
  total: number
}

interface Summary {
  total_count: number
  draft_count: number
  completed_count: number
  total_value: string
  total_stock_in: number
  total_stock_out: number
  total_products: number
  total_skus: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const summary = ref<Summary | null>(null)
const loadingSummary = ref(false)

async function fetchSummary() {
  loadingSummary.value = true
  try {
    const params: Record<string, string> = {}
    if (search.value) params.search = search.value
    if (filterStatus.value.length) params.status = filterStatus.value.join(',')
    if (filterDate.value.from) {
      params.date_from = filterDate.value.from
      params.date_to = filterDate.value.to
    }
    if (filterWarehouseIds.value.length) params.warehouse_id = filterWarehouseIds.value.join(',')
    const res = await api.get<{ data: Summary }>('/inventories/stock-opnames/summary', params)
    summary.value = res.data || null
  }
  catch { summary.value = null }
  finally { loadingSummary.value = false }
}

const loading = ref(true)
const items = ref<StockOpname[]>([])
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

async function fetchItems() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    if (filterStatus.value.length) params.status = filterStatus.value.join(',')
    if (filterDate.value.from) {
      params.date_from = filterDate.value.from
      params.date_to = filterDate.value.to
    }
    if (filterWarehouseIds.value.length) params.warehouse_id = filterWarehouseIds.value.join(',')

    const res = await api.get<{ data: Paginated }>('/inventories/stock-opnames/index', params)
    items.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch {
    items.value = []
  }
  finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchItems(); fetchSummary() }, 300)
}

function onStatusFilter(val: string | string[]) {
  filterStatus.value = val as string[]
  page.value = 1
  fetchItems()
  fetchSummary()
}

function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1
  fetchItems()
  fetchSummary()
}

function onWarehouseFilter(val: string | string[]) {
  filterWarehouseIds.value = val as string[]
  page.value = 1
  fetchItems()
  fetchSummary()
}

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

function onPageChange(p: number) {
  page.value = p
  fetchItems()
}

function onPerPageChange(pp: number) {
  perPage.value = pp
  page.value = 1
  fetchItems()
}

async function handleDelete(item: StockOpname) {
  const ok = await confirm({
    title: 'Hapus Stock Opname',
    message: `Hapus "${item.no}"? Data ini tidak dapat dipulihkan.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/inventories/stock-opnames/${item.id}`)
    toast.success('Stock opname berhasil dihapus')
    fetchItems()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus')
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
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Stock Opname</h1>
        <p class="mt-0.5 text-sm text-gray-500">Hitung stok fisik dan sesuaikan dengan sistem</p>
      </div>
      <NuxtLink
        to="/inventory/opname/create"
        class="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
      >
        <Plus class="h-4 w-4" />
        Buat Opname
      </NuxtLink>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      <!-- Total -->
      <div class="col-span-2 rounded-xl bg-white px-4 py-3.5 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs font-medium text-gray-500">Total Opname</p>
        <div v-if="loadingSummary" class="mt-1.5 h-7 w-16 animate-pulse rounded bg-gray-200" />
        <p v-else class="mt-1 text-2xl font-bold text-gray-900">{{ summary?.total_count ?? '-' }}</p>
        <div class="mt-1.5 flex items-center gap-2 text-xs">
          <span class="text-yellow-600">{{ summary?.draft_count ?? 0 }} Draft</span>
          <span class="text-gray-300">·</span>
          <span class="text-green-600">{{ summary?.completed_count ?? 0 }} Selesai</span>
        </div>
      </div>
      <!-- Total Nilai -->
      <div class="col-span-2 rounded-xl bg-white px-4 py-3.5 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs font-medium text-gray-500">Total Nilai Selisih</p>
        <div v-if="loadingSummary" class="mt-1.5 h-7 w-24 animate-pulse rounded bg-gray-200" />
        <p v-else class="mt-1 truncate text-xl font-bold text-gray-900">
          Rp{{ formatCurrency(summary?.total_value ?? '0') }}
        </p>
        <p class="mt-1.5 text-xs text-gray-400">Nilai perbedaan stok</p>
      </div>
      <!-- Stok Lebih -->
      <div class="rounded-xl bg-white px-4 py-3.5 shadow-xs ring-1 ring-gray-200">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-gray-500">Lebih</p>
          <TrendingUp class="h-4 w-4 text-green-500" />
        </div>
        <div v-if="loadingSummary" class="mt-1.5 h-7 w-12 animate-pulse rounded bg-gray-200" />
        <p v-else class="mt-1 text-2xl font-bold text-green-600">{{ summary?.total_stock_in ?? '-' }}</p>
        <p class="mt-1.5 text-xs text-gray-400">Unit lebih</p>
      </div>
      <!-- Stok Kurang -->
      <div class="rounded-xl bg-white px-4 py-3.5 shadow-xs ring-1 ring-gray-200">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-gray-500">Kurang</p>
          <TrendingDown class="h-4 w-4 text-red-400" />
        </div>
        <div v-if="loadingSummary" class="mt-1.5 h-7 w-12 animate-pulse rounded bg-gray-200" />
        <p v-else class="mt-1 text-2xl font-bold text-red-500">{{ summary?.total_stock_out ?? '-' }}</p>
        <p class="mt-1.5 text-xs text-gray-400">Unit kurang</p>
      </div>
      <!-- Produk -->
      <div class="rounded-xl bg-white px-4 py-3.5 shadow-xs ring-1 ring-gray-200">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-gray-500">Produk</p>
          <PackageCheck class="h-4 w-4 text-primary-400" />
        </div>
        <div v-if="loadingSummary" class="mt-1.5 h-7 w-12 animate-pulse rounded bg-gray-200" />
        <p v-else class="mt-1 text-2xl font-bold text-gray-900">{{ summary?.total_products ?? '-' }}</p>
        <p class="mt-1.5 text-xs text-gray-400">Produk unik</p>
      </div>
      <!-- SKU -->
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
          placeholder="Cari nomor opname..."
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
        class="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 transition-colors"
        :disabled="loading"
        @click="fetchItems(); fetchSummary()"
      >
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <!-- Table -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
              <th class="px-4 py-3 text-left">Nomor</th>
              <th class="px-4 py-3 text-left">Tanggal</th>
              <th class="px-4 py-3 text-left">Gudang</th>
              <th class="px-4 py-3 text-left">Catatan</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3 text-center">Penyesuaian</th>
              <th class="px-4 py-3 text-right">Total Selisih</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr v-for="i in 8" :key="i" class="border-b border-gray-100">
              <td v-for="j in 8" :key="j" class="px-4 py-3">
                <div class="h-4 animate-pulse rounded bg-gray-200" :class="j === 4 ? 'w-40' : 'w-20'" />
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="!items.length">
            <tr>
              <td colspan="8" class="px-4 py-16 text-center">
                <ClipboardList class="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p class="text-sm text-gray-500">Belum ada stock opname</p>
                <NuxtLink
                  to="/inventory/opname/create"
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
              <td class="px-4 py-3">
                <NuxtLink :to="`/inventory/opname/${item.id}`" class="font-semibold text-primary-600 hover:underline">
                  {{ item.no }}
                </NuxtLink>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-gray-600">{{ formatDate(item.date) }}</td>
              <td class="px-4 py-3 text-gray-700">{{ item.warehouse?.name || '-' }}</td>
              <td class="px-4 py-3 max-w-[200px]">
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
              <td class="px-4 py-3 text-center">
                <NuxtLink
                  v-if="item.stock_adjustment_id"
                  :to="`/inventory/adjustment/${item.stock_adjustment_id}`"
                  class="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <Link2 class="h-3 w-3" />
                  Lihat
                </NuxtLink>
                <span v-else class="text-xs text-gray-400">-</span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap font-medium text-gray-900">
                Rp{{ formatCurrency(item.total) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <NuxtLink
                    :to="`/inventory/opname/${item.id}`"
                    class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    title="Detail"
                  >
                    <Eye class="h-4 w-4" />
                  </NuxtLink>
                  <NuxtLink
                    v-if="item.status === 'draft'"
                    :to="`/inventory/opname/create?edit=${item.id}`"
                    class="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    title="Edit"
                  >
                    <Pencil class="h-4 w-4" />
                  </NuxtLink>
                  <button
                    v-if="item.status !== 'completed'"
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

      <!-- Pagination -->
      <AppPagination
        v-if="!loading && totalPage > 1"
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
