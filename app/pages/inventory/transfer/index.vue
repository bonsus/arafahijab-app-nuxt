<script setup lang="ts">
import {
  Plus, Search, Eye, Trash2,
  Pencil, RefreshCw, ArrowRight, Package, Layers, Box,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface StockTransfer {
  id: string
  no: string
  date: string
  note: string
  status: string
  total: string
  created_at: string
  updated_at: string
}

interface Paginated {
  data: StockTransfer[]
  page: number
  per_page: number
  total_page: number
  total: number
}

interface TransferSummary {
  total_transfers: number
  total_draft: number
  total_completed: number
  total_value: string
  total_products: number
  total_skus: number
  total_qty: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const loadingSummary = ref(true)
const summary = ref<TransferSummary>({
  total_transfers: 0,
  total_draft: 0,
  total_completed: 0,
  total_value: '0',
  total_products: 0,
  total_skus: 0,
  total_qty: 0,
})

const loading = ref(true)
const items = ref<StockTransfer[]>([])
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
]

const statusConfig: Record<string, { label: string; bg: string }> = {
  draft: { label: 'Draft', bg: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  completed: { label: 'Selesai', bg: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
}

async function fetchSummary() {
  loadingSummary.value = true
  try {
    const params: Record<string, string> = {}
    if (filterDate.value.from) {
      params.date_from = filterDate.value.from
      params.date_to = filterDate.value.to
    }
    const res = await api.get<{ data: TransferSummary }>('/inventories/transfers/summary', params)
    summary.value = res.data || summary.value
  }
  catch {
    // Silent fail
  }
  finally {
    loadingSummary.value = false
  }
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
    const res = await api.get<{ data: Paginated }>('/inventories/transfers/index', params)
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
  searchTimer = setTimeout(() => { page.value = 1; fetchItems() }, 300)
}

function onStatusFilter(val: string | string[]) {
  filterStatus.value = val as string[]
  page.value = 1
  fetchItems()
}

function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1
  fetchItems()
  fetchSummary()
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

async function handleDelete(item: StockTransfer) {
  const isCompleted = item.status === 'completed'
  const ok = await confirm({
    title: 'Hapus Transfer Stok',
    message: isCompleted
      ? `Hapus "${item.no}"? Transfer ini sudah selesai — stok akan di-rollback otomatis.`
      : `Hapus "${item.no}"? Data ini tidak dapat dipulihkan.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/inventories/transfers/${item.id}`)
    toast.success('Transfer stok berhasil dihapus')
    fetchItems()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus')
  }
}

onMounted(() => {
  fetchSummary()
  fetchItems()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Transfer Stok</h1>
        <p class="mt-0.5 text-sm text-gray-500">Pindahkan stok antar gudang atau antar lokasi bin</p>
      </div>
      <NuxtLink
        to="/inventory/transfer/create"
        class="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
      >
        <Plus class="h-4 w-4" />
        Buat Transfer
      </NuxtLink>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      <!-- Total Transfers -->
      <div class="col-span-2 rounded-xl bg-white px-4 py-3.5 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs font-medium text-gray-500">Total Transfer</p>
        <div v-if="loadingSummary" class="mt-1.5 h-7 w-16 animate-pulse rounded bg-gray-200" />
        <p v-else class="mt-1 text-2xl font-bold text-gray-900">{{ summary.total_transfers }}</p>
        <div class="mt-1.5 flex items-center gap-2 text-xs">
          <span class="text-yellow-600">{{ summary.total_draft }} Draft</span>
          <span class="text-gray-300">·</span>
          <span class="text-green-600">{{ summary.total_completed }} Selesai</span>
        </div>
      </div>

      <!-- Total Value -->
      <div class="col-span-2 rounded-xl bg-white px-4 py-3.5 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs font-medium text-gray-500">Total Nilai</p>
        <div v-if="loadingSummary" class="mt-1.5 h-7 w-24 animate-pulse rounded bg-gray-200" />
        <p v-else class="mt-1 truncate text-xl font-bold text-gray-900">
          Rp{{ formatCurrency(summary.total_value) }}
        </p>
        <p class="mt-1.5 text-xs text-gray-400">Total nilai transfer</p>
      </div>

      <!-- Total Qty -->
      <div class="rounded-xl bg-white px-4 py-3.5 shadow-xs ring-1 ring-gray-200">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-gray-500">Qty</p>
          <Box class="h-4 w-4 text-orange-400" />
        </div>
        <div v-if="loadingSummary" class="mt-1.5 h-7 w-12 animate-pulse rounded bg-gray-200" />
        <p v-else class="mt-1 text-2xl font-bold text-gray-900">{{ summary.total_qty }}</p>
        <p class="mt-1.5 text-xs text-gray-400">Total unit</p>
      </div>

      <!-- Total Products -->
      <div class="rounded-xl bg-white px-4 py-3.5 shadow-xs ring-1 ring-gray-200">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-gray-500">Produk</p>
          <Package class="h-4 w-4 text-purple-400" />
        </div>
        <div v-if="loadingSummary" class="mt-1.5 h-7 w-12 animate-pulse rounded bg-gray-200" />
        <p v-else class="mt-1 text-2xl font-bold text-gray-900">{{ summary.total_products }}</p>
        <p class="mt-1.5 text-xs text-gray-400">Produk unik</p>
      </div>

      <!-- Total SKUs -->
      <div class="rounded-xl bg-white px-4 py-3.5 shadow-xs ring-1 ring-gray-200">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-gray-500">SKU</p>
          <Layers class="h-4 w-4 text-indigo-400" />
        </div>
        <div v-if="loadingSummary" class="mt-1.5 h-7 w-12 animate-pulse rounded bg-gray-200" />
        <p v-else class="mt-1 text-2xl font-bold text-gray-900">{{ summary.total_skus }}</p>
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
          placeholder="Cari nomor transfer..."
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
        @click="fetchItems()"
      >
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <!-- Table -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
              <th class="px-4 py-3 text-left">Nomor</th>
              <th class="px-4 py-3 text-left">Tanggal</th>
              <th class="px-4 py-3 text-left">Catatan</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3 text-right">Total Nilai</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr v-for="i in 8" :key="i" class="border-b border-gray-100">
              <td v-for="j in 6" :key="j" class="px-4 py-3">
                <div class="h-4 animate-pulse rounded bg-gray-200" :class="j === 3 ? 'w-40' : 'w-20'" />
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="!items.length">
            <tr>
              <td colspan="6" class="px-4 py-16 text-center">
                <ArrowRight class="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p class="text-sm text-gray-500">Belum ada transfer stok</p>
                <NuxtLink
                  to="/inventory/transfer/create"
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
                <NuxtLink :to="`/inventory/transfer/${item.id}`" class="font-semibold text-primary-600 hover:underline">
                  {{ item.no }}
                </NuxtLink>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-gray-600">{{ formatDate(item.date) }}</td>
              <td class="px-4 py-3 max-w-[220px]">
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
                    :to="`/inventory/transfer/${item.id}`"
                    class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    title="Detail"
                  >
                    <Eye class="h-4 w-4" />
                  </NuxtLink>
                  <NuxtLink
                    v-if="item.status === 'draft'"
                    :to="`/inventory/transfer/create?edit=${item.id}`"
                    class="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    title="Edit"
                  >
                    <Pencil class="h-4 w-4" />
                  </NuxtLink>
                  <button
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
