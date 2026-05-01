<script setup lang="ts">
import {
  Plus, Search, Eye, Trash2,
  Package, Loader2, Check, X, Pencil, RefreshCw,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface PurchaseOrderRef {
  id: string
  no: string
  status: string
}

interface WarehouseRef {
  id: string
  name: string
}
interface CustomerRef {
  id: string
  name: string
}

interface PurchaseReceipt {
  id: string
  purchase_order_id: string
  no: string
  date_received: string
  date_due: string
  date_completed: string
  date_paid: string
  subtotal: number
  discount: number
  shipping_fee: number
  tax: number
  adjustment: number
  total: number
  status: string
  payment_status: string
  note: string
  purchase_order: PurchaseOrderRef | null
  warehouse: WarehouseRef | null
  customer: CustomerRef | null
  created_at: string
  updated_at: string
}

interface PaginatedReceipt {
  data: PurchaseReceipt[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const recapRef = ref<{ refresh: () => Promise<void> } | null>(null)
const loading = ref(true)
const receipts = ref<PurchaseReceipt[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)
const search = ref('')
const filterStatus = ref<string[]>([])
const filterSupplierIds = ref<string[]>([])
const filterWarehouseIds = ref<string[]>([])
const filterDateType = ref('date_received')
const filterDate = ref({ from: '', to: '' })

const suppliers = ref<{ id: string; name: string }[]>([])
const loadingSuppliers = ref(false)
const warehouses = ref<{ id: string; name: string }[]>([])
const loadingWarehouses = ref(false)

const supplierOptions = computed(() =>
  suppliers.value.map(s => ({ value: s.id, label: s.name })),
)
const warehouseOptions = computed(() =>
  warehouses.value.map(w => ({ value: w.id, label: w.name })),
)

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'received', label: 'Diterima' },
  { value: 'completed', label: 'Selesai' },
]

const paymentStatusOptions = [
  { value: 'unpaid', label: 'Belum Bayar' },
  { value: 'partial', label: 'Sebagian' },
  { value: 'paid', label: 'Lunas' },
]
const dateTypeOptions = [
  { key: 'date_received', label: 'Tgl Diterima' },
  { key: 'date_completed', label: 'Tgl Selesai' }, 
]

const statusConfig: Record<string, { label: string; bg: string }> = {
  draft: { label: 'Draft', bg: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  received: { label: 'Diterima', bg: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  completed: { label: 'Selesai', bg: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
}

const paymentStatusConfig: Record<string, { label: string; bg: string }> = {
  unpaid: { label: 'Belum Bayar', bg: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  partial: { label: 'Sebagian', bg: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  paid: { label: 'Lunas', bg: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
}

async function fetchReceipts() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    if (filterStatus.value.length) params.status = filterStatus.value.join(',')
    if (filterSupplierIds.value.length) params.customer_id = filterSupplierIds.value.join(',')
    if (filterWarehouseIds.value.length) params.warehouse_id = filterWarehouseIds.value.join(',')
    if (filterDate.value.from) {
      params.date_type = filterDateType.value
      params.date_from = filterDate.value.from
      params.date_to = filterDate.value.to
    }

    const res = await api.get<{ data: PaginatedReceipt }>('/purchase-receipts/index', params)
    receipts.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch {
    receipts.value = []
  }
  finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchReceipts()
  }, 300)
}

function onStatusFilter(val: string | string[]) {
  filterStatus.value = val as string[]
  page.value = 1
  fetchReceipts()
}

function onSupplierFilter(val: string | string[]) {
  filterSupplierIds.value = val as string[]
  page.value = 1
  fetchReceipts()
}

function onWarehouseFilter(val: string | string[]) {
  filterWarehouseIds.value = val as string[]
  page.value = 1
  fetchReceipts()
}

function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1
  fetchReceipts()
}

function onPageChange(p: number) {
  page.value = p
  fetchReceipts()
}

function onPerPageChange(pp: number) {
  perPage.value = pp
  page.value = 1
  fetchReceipts()
}

async function handleDelete(receipt: PurchaseReceipt) {
  const ok = await confirm({
    title: 'Hapus Penerimaan Barang',
    message: `Hapus "${receipt.no}"? Semua item dan data terkait akan ikut terhapus.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/purchase-receipts/${receipt.id}`)
    toast.success('Penerimaan barang berhasil dihapus')
    await fetchReceipts()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus penerimaan barang')
  }
}

const updatingStatus = ref<string | null>(null)

async function updateStatus(receipt: PurchaseReceipt, status: 'draft' | 'completed') {
  const labels: Record<string, { action: string; title: string; confirm: string; variant: 'info' | 'danger' | 'warning' }> = {
    completed: { action: 'menyelesaikan', title: 'Selesaikan Penerimaan', confirm: 'Selesai', variant: 'info' },
    draft: { action: 'mengembalikan ke draft', title: 'Kembalikan ke Draft', confirm: 'Draft', variant: 'warning' },
  }
  const cfg = labels[status]!
  const ok = await confirm({
    title: cfg.title,
    message: `Yakin ingin ${cfg.action} "${receipt.no}"?`,
    confirmText: cfg.confirm,
    variant: cfg.variant,
  })
  if (!ok) return

  updatingStatus.value = receipt.id
  try {
    await api.put(`/purchase-receipts/${receipt.id}/update-status`, { status })
    toast.success('Status berhasil diperbarui')
    await fetchReceipts()
  }
  catch (err: any) {
    toast.error(err.message || `Gagal ${cfg.action}`)
  }
  finally {
    updatingStatus.value = null
  }
}

async function fetchSuppliers(search?: string) {
  loadingSuppliers.value = true
  try {
    const params: Record<string, string> = { type: 'supplier' }
    if (search) params.search = search
    const res = await api.get<{ data: any }>('/customers/public/index', params)
    suppliers.value = (res.data?.data || res.data || []) as { id: string; name: string }[]
  }
  catch {
    suppliers.value = []
  }
  finally {
    loadingSuppliers.value = false
  }
}

async function fetchWarehouseOptions(search?: string) {
  loadingWarehouses.value = true
  try {
    const params: Record<string, string> = {}
    if (search) params.search = search
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

async function resetFilters() {
  search.value = ''
  filterStatus.value = []
  filterSupplierIds.value = []
  filterWarehouseIds.value = []
  filterDateType.value = 'date_received'
  filterDate.value = { from: '', to: '' }
  await fetchReceipts()
}

onMounted(() => {
  fetchReceipts()
  fetchSuppliers()
  fetchWarehouseOptions()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Penerimaan Barang</h1>
        <p class="text-sm text-gray-500">Kelola penerimaan barang dari purchase order.</p>
      </div>
      <NuxtLink
        to="/purchase/receipt/create"
        class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
      >
        <Plus class="h-4 w-4" />
        Buat Penerimaan
      </NuxtLink>
    </div>

    <!-- Summary Cards -->
    <AppReceiptRecap
      ref="recapRef"
      :search="search"
      :status="filterStatus"
      :supplier-ids="filterSupplierIds"
      :warehouse-ids="filterWarehouseIds"
      :date-type="filterDateType"
      :date-from="filterDate.from"
      :date-to="filterDate.to"
    />

    <!-- Filters -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="space-y-3 px-4 py-3">
        <!-- Search + Refresh -->
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari no GRN, catatan..."
              class="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              @input="onSearch"
            />
          </div>
          <button
            class="shrink-0 flex rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            title="Refresh data"
            :disabled="loading"
            @click="fetchReceipts()"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          </button>
          <button
            class="shrink-0 flex rounded-lg border border-red-200 p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-700"
            title="Reset filters"
            :disabled="loading"
            @click="resetFilters()"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <!-- Filter controls -->
        <div class="flex flex-wrap items-center gap-2">
          <AppFilterSelect
            :model-value="filterSupplierIds"
            :options="supplierOptions"
            :loading="loadingSuppliers"
            multiple
            placeholder="Supplier"
            search-placeholder="Cari supplier..."
            @update:model-value="onSupplierFilter"
            @search="fetchSuppliers"
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
          <AppFilterSelect
            :model-value="filterStatus"
            :options="statusOptions"
            multiple
            :searchable="false"
            placeholder="Status"
            @update:model-value="onStatusFilter"
          />
          <select @change="fetchReceipts()"
            v-model="filterDateType"
            class="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
          >
            <option v-for="opt in dateTypeOptions" :key="opt.key" :value="opt.key">{{ opt.label }}</option>
          </select>
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
              <th class="px-4 py-2.5 text-left">No GRN</th>
              <th class="px-4 py-2.5 text-left">No PO</th>
              <th class="px-4 py-2.5 text-left">Supplier</th>
              <th class="px-4 py-2.5 text-left">Gudang</th>
              <th class="px-4 py-2.5 text-left">Tgl Diterima</th>
              <th class="px-4 py-2.5 text-left">Tgl Selesai</th>
              <th class="px-4 py-2.5 text-right">Total</th>
              <th class="px-4 py-2.5 text-center">Status</th> 
              <th class="px-4 py-2.5 text-right">Tindakan</th>
            </tr>
          </thead>

          <!-- Loading -->
          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-gray-100">
              <td class="px-4 py-3"><div class="h-4 w-24 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-24 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="ml-auto h-4 w-24 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="mx-auto h-5 w-16 animate-pulse rounded-full bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="mx-auto h-5 w-16 animate-pulse rounded-full bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200" /></td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="!receipts.length">
            <tr>
              <td colspan="9" class="px-4 py-16 text-center">
                <Package class="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p class="text-sm text-gray-500">
                  {{ search || filterStatus.length ? 'Tidak ada data yang cocok dengan filter.' : 'Belum ada penerimaan barang.' }}
                </p>
                <NuxtLink
                  v-if="!search && !filterStatus.length"
                  to="/purchase/receipt/create"
                  class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  <Plus class="h-3.5 w-3.5" />
                  Buat Penerimaan Pertama
                </NuxtLink>
              </td>
            </tr>
          </tbody>

          <!-- Rows -->
          <tbody v-else>
            <tr
              v-for="r in receipts"
              :key="r.id"
              class="border-b border-gray-100 transition-colors hover:bg-gray-50/50 last:border-b-0"
            >
              <td class="px-4 py-3">
                <NuxtLink :to="`/purchase/receipt/${r.id}`" class="font-semibold text-primary-600 hover:underline">
                  {{ r.no }}
                </NuxtLink>
              </td>
              <td class="px-4 py-3 text-gray-700">
                <NuxtLink v-if="r.purchase_order" :to="`/purchase/order/${r.purchase_order.id}`" class="text-primary-600 hover:underline">
                  {{ r.purchase_order.no }}
                </NuxtLink>
                <span v-else>-</span>
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                {{ r.customer?.name || '-' }}
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                {{ r.warehouse?.name || '-' }}
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                {{ formatDate(r.date_received) }}
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                {{ formatDate(r.date_completed) }}
              </td>
              <td class="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                Rp{{ formatCurrency(Number(r.total)) }}
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="statusConfig[r.status]?.bg || 'bg-gray-100 text-gray-600'"
                >
                  {{ statusConfig[r.status]?.label || r.status }}
                </span>
              </td> 
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1.5"> 

                  <!-- Edit: payment_status unpaid only -->
                  <NuxtLink
                    v-if="r.payment_status === 'unpaid'"
                    :to="`/purchase/receipt/create?edit=${r.id}`"
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Edit"
                  >
                    <Pencil class="h-4 w-4" />
                  </NuxtLink>

                  <!-- Detail -->
                  <NuxtLink
                    :to="`/purchase/receipt/${r.id}`"
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Detail"
                  >
                    <Eye class="h-4 w-4" />
                  </NuxtLink>

                  <!-- Hapus: payment_status unpaid only -->
                  <button
                    v-if="r.payment_status === 'unpaid'"
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Hapus"
                    @click="handleDelete(r)"
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
