<script setup lang="ts">
import {
  Plus, Search, Eye, Trash2, ChevronLeft, ChevronRight,
  Package, Loader2, Check, X, Pencil, Wallet, Calendar, RefreshCw,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Customer {
  id: string
  name: string
}

interface PurchaseOrder {
  id: string
  customer_id: string
  no: string
  date_created: string
  date_expected: string
  subtotal: number
  discount: number
  shipping_fee: number
  tax: number
  adjustment: number
  total: number
  status: string
  payment_status: string
  note: string
  customer: Customer | null
  date_approved: string
  date_completed: string
  created_at: string
  updated_at: string
}

interface PaginatedPO {
  data: PurchaseOrder[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(true)
const orders = ref<PurchaseOrder[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)
const search = ref('')
const filterStatus = ref<string[]>([])
const filterDateType = ref('date_created')
const filterDate = ref({ from: '', to: '' })
const filterSupplierIds = ref<string[]>([])
const suppliers = ref<{ id: string; name: string }[]>([])
const loadingSuppliers = ref(false)

const supplierOptions = computed(() =>
  suppliers.value.map(s => ({ value: s.id, label: s.name })),
)

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'waiting_approval', label: 'Menunggu' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'completed', label: 'Selesai' },
  { value: 'partial', label: 'Parsial' },
]

const dateTypeOptions = [
  { key: 'date_created', label: 'Tgl Dibuat' },
  { key: 'date_expected', label: 'Tgl Expected' },
  { key: 'date_approved', label: 'Tgl Approve' },
  { key: 'date_completed', label: 'Tgl Selesai' },
]

const statusTabs = [
  { key: 'purchase-order', label: 'Purchase Order', to: '/purchase/order' },
  { key: 'prepayment', label: 'Prepayment', to: '/purchase/order/prepayment' },
]

const statusConfig: Record<string, { label: string; bg: string }> = {
  draft: { label: 'Draft', bg: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  waiting_approval: { label: 'Menunggu', bg: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  approved: { label: 'Disetujui', bg: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  rejected: { label: 'Ditolak', bg: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  completed: { label: 'Selesai', bg: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  partial: { label: 'Parsial', bg: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
}

const paymentStatusConfig: Record<string, { label: string; bg: string }> = {
  unpaid: { label: 'Belum Bayar', bg: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  partial: { label: 'Sebagian', bg: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  paid: { label: 'Lunas', bg: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
}

async function fetchOrders() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    if (filterStatus.value.length) params.status = filterStatus.value.join(',')
    if (filterDate.value.from) {
      params.date_type = filterDateType.value
      params.date_from = filterDate.value.from
      params.date_to = filterDate.value.to
    }
    if (filterSupplierIds.value.length) params.customer_id = filterSupplierIds.value.join(',')

    const res = await api.get<{ data: PaginatedPO }>('/purchases/index', params)
    orders.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch {
    orders.value = []
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
    fetchOrders()
  }, 300)
}

function onStatusFilter(val: string | string[]) {
  filterStatus.value = val as string[]
  page.value = 1
  fetchOrders()
}

function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1
  fetchOrders()
}

function onSupplierFilter(val: string | string[]) {
  filterSupplierIds.value = val as string[]
  page.value = 1
  fetchOrders()
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

function goPage(p: number) {
  if (p < 1 || p > totalPage.value) return
  page.value = p
  fetchOrders()
}

const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, page.value - 2)
  const end = Math.min(totalPage.value, page.value + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('id-ID').format(val)
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.startsWith('0001')) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

async function handleDelete(po: PurchaseOrder) {
  const ok = await confirm({
    title: 'Hapus Purchase Order',
    message: `Hapus PO "${po.no}"? Semua item dan data terkait akan ikut terhapus.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/purchases/${po.id}`)
    toast.success('Purchase order berhasil dihapus')
    await fetchOrders()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus purchase order')
  }
}

const updatingStatus = ref<string | null>(null)

async function updateStatus(po: PurchaseOrder, status: 'approved' | 'rejected' | 'waiting_approval' | 'completed') {
  const labels: Record<string, { action: string; title: string; confirm: string; variant: 'info' | 'danger' | 'warning' }> = {
    approved: { action: 'menyetujui', title: 'Setujui PO', confirm: 'Approve', variant: 'info' },
    rejected: { action: 'menolak', title: 'Tolak PO', confirm: 'Tolak', variant: 'danger' },
    waiting_approval: { action: 'membatalkan approval', title: 'Batalkan Approve', confirm: 'Batalkan', variant: 'warning' },
    completed: { action: 'menyelesaikan', title: 'Selesaikan PO', confirm: 'Selesai', variant: 'info' },
  }
  const cfg = labels[status]!
  const ok = await confirm({
    title: cfg.title,
    message: `Yakin ingin ${cfg.action} PO "${po.no}"?`,
    confirmText: cfg.confirm,
    variant: cfg.variant,
  })
  if (!ok) return

  updatingStatus.value = po.id
  try {
    await api.put(`/purchases/${po.id}/update-status`, { status })
    toast.success(`PO berhasil di-update`)
    await fetchOrders()
  }
  catch (err: any) {
    toast.error(err.message || `Gagal ${cfg.action} PO`)
  }
  finally {
    updatingStatus.value = null
  }
}
async function resetFilters() {
  search.value = ''
  filterStatus.value = []
  filterDateType.value = 'date_created'
  filterDate.value = { from: '', to: '' }
  filterSupplierIds.value = []
  await fetchOrders()
}

onMounted(() => {
  fetchOrders()
  fetchSuppliers()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Purchase Order</h1>
        <p class="text-sm text-gray-500">Kelola pesanan pembelian ke supplier.</p>
      </div>
      <NuxtLink
        to="/purchase/order/create"
        class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
      >
        <Plus class="h-4 w-4" />
        Buat PO Baru
      </NuxtLink>
    </div>

    <!-- Summary -->
    <AppPurchaseOrderRecap
      :search="search"
      :status="filterStatus"
      :supplier-ids="filterSupplierIds"
      :date-type="filterDateType"
      :date-from="filterDate.from"
      :date-to="filterDate.to"
    />

    <!-- Tabs & Filters -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <!-- Page tabs -->
      <!-- <div class="flex items-center gap-0 overflow-x-auto border-b border-gray-200">
        <NuxtLink
          v-for="tab in statusTabs"
          :key="tab.key"
          :to="tab.to"
          class="relative shrink-0 whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors"
          :class="tab.key === 'purchase-order'
            ? 'text-primary-600'
            : 'text-gray-500 hover:text-gray-700'"
        >
          {{ tab.label }}
          <span
            v-if="tab.key === 'purchase-order'"
            class="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-primary-600"
          />
        </NuxtLink>
      </div> -->

      <!-- Filters -->
      <div class="space-y-3 px-4 py-3">
        <!-- Search + Refresh -->
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari no PO, supplier..."
              class="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              @input="onSearch"
            />
          </div>
          <button
            class="shrink-0 flex rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            title="Refresh data"
            :disabled="loading"
            @click="fetchOrders()"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" /> 
          </button>
          <!-- reset filters -->
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
            :model-value="filterStatus"
            :options="statusOptions"
            multiple
            :searchable="false"
            placeholder="Status"
            @update:model-value="onStatusFilter"
          />
          <select
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
              <th class="px-4 py-2.5 text-left">No PO</th>
              <th class="px-4 py-2.5 text-left">Supplier</th>
              <th class="px-4 py-2.5 text-left">Tgl Dibuat</th>
              <th class="px-4 py-2.5 text-left">Tgl Expected</th>
              <th class="px-4 py-2.5 text-left">Tgl Approve</th>
              <th class="px-4 py-2.5 text-left">Tgl Selesai</th>
              <th class="px-4 py-2.5 text-right">Total</th>
              <th class="px-4 py-2.5 text-center">Status</th>
              <!-- <th class="px-4 py-2.5 text-center">Pembayaran</th> -->
              <th class="px-4 py-2.5 text-right">Tindakan</th>
            </tr>
          </thead>

          <!-- Loading -->
          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-gray-100">
              <td class="px-4 py-3"><div class="h-4 w-24 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-28 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="ml-auto h-4 w-24 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="mx-auto h-5 w-16 animate-pulse rounded-full bg-gray-200" /></td> 
              <td class="px-4 py-3"><div class="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200" /></td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="!orders.length">
            <tr>
              <td colspan="10" class="px-4 py-16 text-center">
                <Package class="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p class="text-sm text-gray-500">
                  {{ search || filterStatus.length ? 'Tidak ada PO yang cocok dengan filter.' : 'Belum ada purchase order.' }}
                </p>
                <NuxtLink
                  v-if="!search && !filterStatus.length"
                  to="/purchase/order/create"
                  class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  <Plus class="h-3.5 w-3.5" />
                  Buat PO Pertama
                </NuxtLink>
              </td>
            </tr>
          </tbody>

          <!-- Rows -->
          <tbody v-else>
            <tr
              v-for="po in orders"
              :key="po.id"
              class="border-b border-gray-100 transition-colors hover:bg-gray-50/50 last:border-b-0"
            >
              <td class="px-4 py-3">
                <NuxtLink :to="`/purchase/order/${po.id}`" class="font-semibold text-primary-600 hover:underline">
                  {{ po.no }}
                </NuxtLink>
              </td>
              <td class="px-4 py-3 text-gray-700">
                {{ po.customer?.name || '-' }}
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                {{ formatDate(po.date_created) }}
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                {{ formatDate(po.date_expected) }}
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                {{ formatDate(po.date_approved) }}
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                {{ formatDate(po.date_completed) }}
              </td>
              <td class="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                Rp{{ formatCurrency(po.total) }}
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="statusConfig[po.status]?.bg || 'bg-gray-100 text-gray-600'"
                >
                  {{ statusConfig[po.status]?.label || po.status }}
                </span>
              </td>
              <!-- <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="paymentStatusConfig[po.payment_status]?.bg || 'bg-gray-100 text-gray-600'"
                >
                  {{ paymentStatusConfig[po.payment_status]?.label || po.payment_status }}
                </span>
              </td> -->
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1.5">
                  <!-- Approve: only waiting_approval -->
                  <button
                    v-if="po.status === 'waiting_approval'"
                    class="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                    :disabled="updatingStatus === po.id"
                    @click="updateStatus(po, 'approved')"
                  >
                    <Loader2 v-if="updatingStatus === po.id" class="h-3.5 w-3.5 animate-spin" />
                    <Check v-else class="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <!-- Reject: only waiting_approval -->
                  <button
                    v-if="po.status === 'waiting_approval'"
                    class="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                    :disabled="updatingStatus === po.id"
                    @click="updateStatus(po, 'rejected')"
                  >
                    <Loader2 v-if="updatingStatus === po.id" class="h-3.5 w-3.5 animate-spin" />
                    <X v-else class="h-3.5 w-3.5" />
                    Tolak
                  </button>
                  <!-- Waiting Approval: only rejected -->
                  <!-- <button
                    v-if="po.status === 'rejected'"
                    class="inline-flex items-center gap-1 rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-yellow-700 disabled:opacity-50"
                    :disabled="updatingStatus === po.id"
                    @click="updateStatus(po, 'waiting_approval')"
                  >
                    <Loader2 v-if="updatingStatus === po.id" class="h-3.5 w-3.5 animate-spin" />
                    <Check v-else class="h-3.5 w-3.5" />
                    Ajukan Ulang
                  </button> -->

                  <!-- Batalkan Approve: only approved && payment_status unpaid -->
                  <button
                    v-if="po.status === 'approved' && po.payment_status === 'unpaid'"
                    class="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    :disabled="updatingStatus === po.id"
                    @click="updateStatus(po, 'waiting_approval')"
                  >
                    <Loader2 v-if="updatingStatus === po.id" class="h-3.5 w-3.5 animate-spin" />
                    <X v-else class="h-3.5 w-3.5" />
                    Batalkan
                  </button>

                  <!-- Selesai: only partial -->
                  <button
                    v-if="po.status === 'partial'"
                    class="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    :disabled="updatingStatus === po.id"
                    @click="updateStatus(po, 'completed')"
                  >
                    <Loader2 v-if="updatingStatus === po.id" class="h-3.5 w-3.5 animate-spin" />
                    <Check v-else class="h-3.5 w-3.5" />
                    Selesai
                  </button>

                  <!-- Edit: draft / waiting_approval -->
                  <NuxtLink
                    v-if="po.status === 'draft' || po.status === 'waiting_approval' || po.status === 'rejected'"
                    :to="`/purchase/order/create?edit=${po.id}`"
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Edit"
                  >
                    <Pencil class="h-4 w-4" />
                  </NuxtLink>

                  <!-- Detail -->
                  <NuxtLink
                    :to="`/purchase/order/${po.id}`"
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Detail"
                  >
                    <Eye class="h-4 w-4" />
                  </NuxtLink>

                  <!-- Hapus: draft only -->
                  <button
                    v-if="po.status === 'draft'"
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Hapus"
                    @click="handleDelete(po)"
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
      <div
        v-if="!loading && totalPage > 1"
        class="flex flex-col items-center gap-3 border-t border-gray-200 bg-gray-50/50 px-4 py-3 sm:flex-row sm:justify-between"
      >
        <p class="text-xs text-gray-500">
          Halaman {{ page }} dari {{ totalPage }} &middot; {{ total }} data
        </p>
        <div class="flex items-center gap-1">
          <button
            :disabled="page <= 1"
            class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-gray-600 disabled:opacity-40"
            @click="goPage(page - 1)"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <button
            v-for="p in visiblePages"
            :key="p"
            class="min-w-[32px] rounded-lg px-2.5 py-1 text-sm font-medium transition-colors"
            :class="p === page ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'"
            @click="goPage(p)"
          >
            {{ p }}
          </button>
          <button
            :disabled="page >= totalPage"
            class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-gray-600 disabled:opacity-40"
            @click="goPage(page + 1)"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
