<script setup lang="ts">
import {
  Plus, Search, Eye, Trash2,
  Package, RefreshCw, X, Check,
  Pencil,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface ReceiptRef {
  id: string
  no: string
  status: string
}
interface CustomerRef {
  id: string,
  name: string,
}

interface WarehouseRef {
  id: string
  name: string
}

interface UserRef {
  id: string
  name: string
}

interface Inbound {
  id: string
  no: string
  date: string
  note: string
  condition: string
  status: string
  external_id: string
  purchase_receipt_id: string
  warehouse_id: string
  user_id: string
  purchase_receipt: ReceiptRef | null
  customer: CustomerRef | null
  warehouse: WarehouseRef | null
  user: UserRef | null
  created_at: string
  updated_at: string
}

interface PaginatedInbound {
  data: Inbound[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(true)
const inbounds = ref<Inbound[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

const search = ref('')
const filterStatus = ref<string[]>([])
const filterWarehouseIds = ref<string[]>([])
const filterDate = ref({ from: '', to: '' })

const warehouses = ref<{ id: string; name: string }[]>([])
const loadingWarehouses = ref(false)

const warehouseOptions = computed(() =>
  warehouses.value.map(w => ({ value: w.id, label: w.name })),
)

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Selesai' },
]

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  completed: { label: 'Selesai', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
}

const conditionConfig: Record<string, string> = {
  good: 'Baik',
  damaged: 'Rusak',
}

async function fetchInbounds() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    if (filterStatus.value.length) params.status = filterStatus.value.join(',')
    if (filterWarehouseIds.value.length) params.warehouse_id = filterWarehouseIds.value.join(',')
    if (filterDate.value.from) {
      params.date_from = filterDate.value.from
      params.date_to = filterDate.value.to
    }

    const res = await api.get<{ data: PaginatedInbound }>('/warehouses/inbounds/index', params)
    inbounds.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch {
    inbounds.value = []
  }
  finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchInbounds() }, 300)
}

function onStatusFilter(val: string | string[]) {
  filterStatus.value = val as string[]
  page.value = 1
  fetchInbounds()
}

function onWarehouseFilter(val: string | string[]) {
  filterWarehouseIds.value = val as string[]
  page.value = 1
  fetchInbounds()
}

function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1
  fetchInbounds()
}

function onPageChange(p: number) {
  page.value = p
  fetchInbounds()
}

function onPerPageChange(pp: number) {
  perPage.value = pp
  page.value = 1
  fetchInbounds()
}

async function fetchWarehouseOptions(searchText?: string) {
  loadingWarehouses.value = true
  try {
    const params: Record<string, string> = {}
    if (searchText) params.search = searchText
    const res = await api.get<{ data: any }>('/warehouses/public/index', params)
    warehouses.value = (res.data?.data || res.data || []) as { id: string; name: string }[]
  }
  catch {
    warehouses.value = []
  }
  finally {
    loadingWarehouses.value = false
  }
}

async function handleDelete(inbound: Inbound) {
  const ok = await confirm({
    title: 'Hapus Inbound',
    message: `Hapus inbound "${inbound.no}"? Data tidak bisa dikembalikan.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/warehouses/inbounds/${inbound.id}`)
    toast.success('Inbound berhasil dihapus')
    await fetchInbounds()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus inbound')
  }
}

async function resetFilters() {
  search.value = ''
  filterStatus.value = []
  filterWarehouseIds.value = []
  filterDate.value = { from: '', to: '' }
  page.value = 1
  await fetchInbounds()
}

onMounted(() => {
  fetchInbounds()
  fetchWarehouseOptions()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">WMS Inbound</h1>
        <p class="text-sm text-gray-500">Proses penerimaan barang dari Purchase Receipt ke stok gudang.</p>
      </div>
      <NuxtLink
        to="/wms/inbound/create"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
      >
        <Plus class="h-4 w-4" />
        Buat Inbound
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="space-y-3 px-4 py-3">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari no inbound, catatan..."
              class="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              @input="onSearch"
            />
          </div>
          <button
            class="shrink-0 flex rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            :disabled="loading"
            title="Refresh"
            @click="fetchInbounds()"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          </button>
          <button
            class="shrink-0 flex rounded-lg border border-red-200 p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-700"
            :disabled="loading"
            title="Reset filter"
            @click="resetFilters()"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
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
          <AppFilterSelect
            :model-value="filterStatus"
            :options="statusOptions"
            multiple
            :searchable="false"
            placeholder="Status"
            @update:model-value="onStatusFilter"
          />
          <AppDateRangePicker :model-value="filterDate" @update:model-value="onDateFilter" />
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500">
            <tr>
              <th class="px-4 py-2.5 text-left">No Inbound</th>
              <th class="px-4 py-2.5 text-left">No GRN</th>
              <th class="px-4 py-2.5 text-left">Supplier</th>
              <th class="px-4 py-2.5 text-left">Gudang</th>
              <th class="px-4 py-2.5 text-left">Tanggal</th> 
              <th class="px-4 py-2.5 text-left">Petugas</th>
              <th class="px-4 py-2.5 text-center">Status</th>
              <th class="px-4 py-2.5 text-right">Tindakan</th>
            </tr>
          </thead>

          <!-- Loading -->
          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-gray-100">
              <td v-for="j in 8" :key="j" class="px-4 py-3">
                <div class="h-4 animate-pulse rounded bg-gray-200" :class="j === 7 ? 'mx-auto w-16' : 'w-24'" />
              </td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="!inbounds.length">
            <tr>
              <td colspan="8" class="px-4 py-16 text-center">
                <Package class="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p class="text-sm text-gray-500">
                  {{ search || filterStatus.length || filterWarehouseIds.length ? 'Tidak ada data yang cocok dengan filter.' : 'Belum ada data inbound.' }}
                </p>
                <NuxtLink
                  v-if="!search && !filterStatus.length && !filterWarehouseIds.length"
                  to="/wms/inbound/create"
                  class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  <Plus class="h-3.5 w-3.5" />
                  Buat Inbound Pertama
                </NuxtLink>
              </td>
            </tr>
          </tbody>

          <!-- Rows -->
          <tbody v-else>
            <tr
              v-for="inbound in inbounds"
              :key="inbound.id"
              class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50"
            >
              <td class="px-4 py-3">
                <NuxtLink :to="`/wms/inbound/${inbound.id}`" class="font-semibold text-primary-600 hover:underline">
                  {{ inbound.no }}
                </NuxtLink>
              </td>
              <td class="px-4 py-3 text-gray-700">
                <NuxtLink
                  v-if="inbound.purchase_receipt"
                  :to="`/purchase/receipt/${inbound.purchase_receipt.id}`"
                  class="text-primary-600 hover:underline"
                >
                  {{ inbound.purchase_receipt.no }}
                </NuxtLink>
                <span v-else>-</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-gray-600">{{ inbound.customer?.name || '-' }}</td>
              <td class="px-4 py-3 whitespace-nowrap text-gray-600">{{ inbound.warehouse?.name || '-' }}</td>
              <td class="px-4 py-3 whitespace-nowrap text-gray-600">{{ formatDate(inbound.date) }}</td>
              <td class="px-4 py-3 whitespace-nowrap text-gray-600">{{ inbound.user?.name || '-' }}</td>
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="statusConfig[inbound.status]?.cls || 'bg-gray-100 text-gray-600'"
                >
                  {{ statusConfig[inbound.status]?.label || inbound.status }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1.5">
                  <NuxtLink
                    :to="`/wms/inbound/${inbound.id}`"
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Detail"
                  >
                    <Eye class="h-4 w-4" />
                  </NuxtLink>
                  <!-- edit -->
                  <NuxtLink 
                    :to="`/wms/inbound/create/?edit=${inbound.id}`"
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    title="Edit"
                  >
                    <Pencil class="h-4 w-4" />
                  </NuxtLink>
                  <button 
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Hapus"
                    @click="handleDelete(inbound)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                  <!-- <span
                    v-if="inbound.status === 'completed'"
                    class="rounded-lg p-1.5 text-green-500"
                    title="Selesai"
                  >
                    <Check class="h-4 w-4" />
                  </span> -->
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
