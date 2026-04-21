<script setup lang="ts">
import {
  Search, RefreshCw, X, Package,
  ChevronLeft, ChevronRight, Eye, Trash2,
  Plus, Wallet,
  Pencil,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface CustomerRef {
  id: string
  name: string
}

interface WarehouseRef {
  id: string
  name: string
}

interface ReceiptRef {
  id: string
  no: string
  customer: CustomerRef | null
  warehouse: WarehouseRef | null
}

interface ReturnPaymentRef {
  id: string
  no: string
  amount: number
  date: string
  method: string
  wallet: { id: string; name: string } | null
}

interface PurchaseReturn {
  id: string
  purchase_receipt_id: string
  no: string
  external_id: string
  date_created: string
  subtotal: number
  discount: number
  shipping_fee: number
  tax: number
  adjustment: number
  total: number
  status: string
  payment_status: string
  note: string
  purchase_receipt: ReceiptRef | null
  customer: CustomerRef | null
  warehouse: WarehouseRef | null
  payments?: ReturnPaymentRef[]
  total_refunded?: number
  created_at: string
  updated_at: string
}

interface WalletRef {
  id: string
  name: string
}

interface PaginatedReturn {
  data: PurchaseReturn[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(true)
const returns = ref<PurchaseReturn[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

const search = ref('')
const filterStatus = ref<string[]>([])
const filterPaymentStatus = ref<string[]>([])
const filterSupplierIds = ref<string[]>([])
const filterWarehouseIds = ref<string[]>([])
const filterDateType = ref('date_created')
const filterDate = ref({ from: '', to: '' })

const recapRef = ref<{ refresh: () => Promise<void> } | null>(null)

const warehouses = ref<{ id: string; name: string }[]>([])
const loadingWarehouses = ref(false)
const warehouseOptions = computed(() =>
  warehouses.value.map(w => ({ value: w.id, label: w.name })),
)

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Selesai' },
]

const paymentStatusOptions = [
  { value: 'unpaid', label: 'Belum Refund' },
  { value: 'partial', label: 'Sebagian' },
  { value: 'paid', label: 'Lunas' },
]

const dateTypeOptions = [
  { key: 'date_created', label: 'Tgl Retur' },
  { key: 'created_at', label: 'Dibuat Pada' },
]

const statusConfig: Record<string, { label: string; bg: string }> = {
  draft: { label: 'Draft', bg: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  completed: { label: 'Selesai', bg: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
}

const paymentStatusConfig: Record<string, { label: string; bg: string }> = {
  unpaid: { label: 'Belum Refund', bg: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  partial: { label: 'Sebagian', bg: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  paid: { label: 'Lunas', bg: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
}

const tabs = [
  { key: 'return', label: 'Retur Pembelian', to: '/purchase/return' },
  { key: 'refund', label: 'Refund', to: '/purchase/return/refund' },
]

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('id-ID').format(Number(val) || 0)
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.startsWith('0001')) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function calcRefunded(r: PurchaseReturn): number {
  if (typeof r.total_refunded !== 'undefined') return Number(r.total_refunded) || 0
  return (r.payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
}

function calcRemaining(r: PurchaseReturn): number {
  return Math.max(0, Number(r.total) - calcRefunded(r))
}

async function fetchReturns() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    if (filterStatus.value.length) params.status = filterStatus.value.join(',')
    if (filterPaymentStatus.value.length) params.payment_status = filterPaymentStatus.value.join(',')
    if (filterSupplierIds.value.length) params.customer_id = filterSupplierIds.value.join(',')
    if (filterWarehouseIds.value.length) params.warehouse_id = filterWarehouseIds.value.join(',')
    if (filterDate.value.from) {
      params.date_type = filterDateType.value
      params.date_from = filterDate.value.from
      params.date_to = filterDate.value.to
    }

    const res = await api.get<{ data: PaginatedReturn }>('/purchase-returns/index', params)
    returns.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch {
    returns.value = []
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
    fetchReturns()
  }, 300)
}

function onStatusFilter(val: string | string[]) {
  filterStatus.value = val as string[]
  page.value = 1
  fetchReturns()
}

function onPaymentStatusFilter(val: string | string[]) {
  filterPaymentStatus.value = val as string[]
  page.value = 1
  fetchReturns()
}

function onSupplierFilter(val: string | string[]) {
  filterSupplierIds.value = val as string[]
  page.value = 1
  fetchReturns()
}

function onWarehouseFilter(val: string | string[]) {
  filterWarehouseIds.value = val as string[]
  page.value = 1
  fetchReturns()
}

function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1
  fetchReturns()
}

function goPage(p: number) {
  if (p < 1 || p > totalPage.value) return
  page.value = p
  fetchReturns()
}

const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, page.value - 2)
  const end = Math.min(totalPage.value, page.value + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

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

async function handleDelete(returnData: PurchaseReturn) {
  const ok = await confirm({
    title: 'Hapus Return Pembelian',
    message: `Hapus retur "${returnData.no}"? Data tidak bisa dikembalikan.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/purchase-returns/${returnData.id}`)
    toast.success('Retur pembelian berhasil dihapus')
    await fetchReturns()
    await recapRef.value?.refresh()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus retur pembelian')
  }
}

// Refund modal
const showRefundModal = ref(false)
const savingRefund = ref(false)
const refundErrors = ref<Record<string, string[]>>({})
const refundReturn = ref<PurchaseReturn | null>(null)

const wallets = ref<WalletRef[]>([])

const refundForm = reactive({
  purchase_return_id: '',
  wallet_id: '',
  date: new Date().toISOString().slice(0, 10),
  amount: 0,
  method: 'transfer',
  note: '',
})

async function fetchWallets() {
  try {
    const res = await api.get<{ data: WalletRef[] }>('/wallets/index')
    wallets.value = (res.data || []).filter((w: any) => w.status === 'active')
  }
  catch {
    wallets.value = []
  }
}

function openRefundModal(returnData: PurchaseReturn) {
  refundReturn.value = returnData
  refundErrors.value = {}
  showRefundModal.value = true
  refundForm.purchase_return_id = returnData.id
  refundForm.wallet_id = ''
  refundForm.date = new Date().toISOString().slice(0, 10)
  refundForm.amount = calcRemaining(returnData)
  refundForm.method = 'transfer'
  refundForm.note = ''
}

async function handleCreateRefund() {
  if (!refundReturn.value) return
  savingRefund.value = true
  refundErrors.value = {}

  try {
    const payload: Record<string, any> = {
      purchase_return_id: refundForm.purchase_return_id,
      wallet_id: refundForm.wallet_id,
      date: refundForm.date,
      amount: refundForm.amount,
      method: refundForm.method,
      note: refundForm.note,
    }

    await api.post('/purchase-returns/payment/create', payload)
    toast.success('Refund berhasil ditambahkan')
    showRefundModal.value = false
    await fetchReturns()
    await recapRef.value?.refresh()
  }
  catch (err: any) {
    if (err.errors) refundErrors.value = err.errors
    else toast.error(err.message || 'Gagal membuat refund')
  }
  finally {
    savingRefund.value = false
  }
}

async function resetFilters() {
  search.value = ''
  filterStatus.value = []
  filterPaymentStatus.value = []
  filterSupplierIds.value = []
  filterWarehouseIds.value = []
  filterDateType.value = 'date_created'
  filterDate.value = { from: '', to: '' }
  await fetchReturns()
  await recapRef.value?.refresh()
}

onMounted(() => {
  fetchReturns()
  fetchWarehouseOptions()
  fetchWallets()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Retur Pembelian</h1>
        <p class="text-sm text-gray-500">Kelola retur pembelian dan proses refund ke supplier.</p>
      </div>
      <NuxtLink
        to="/purchase/return/create"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
      >
        <Plus class="h-4 w-4" />
        Buat Return
      </NuxtLink>
    </div>

    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-0 overflow-x-auto border-b border-gray-200">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.key"
          :to="tab.to"
          class="relative shrink-0 whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors"
          :class="tab.key === 'return' ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'"
        >
          {{ tab.label }}
          <span
            v-if="tab.key === 'return'"
            class="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-primary-600"
          />
        </NuxtLink>
      </div>

      <div class="space-y-3 px-4 py-3">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari no retur, no GRN, catatan..."
              class="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              @input="onSearch"
            />
          </div>
          <button
            class="shrink-0 flex rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            :disabled="loading"
            title="Refresh data"
            @click="fetchReturns()"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          </button>
          <button
            class="shrink-0 flex rounded-lg border border-red-200 p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-700"
            :disabled="loading"
            title="Reset filters"
            @click="resetFilters()"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <AppSupplierFilter
            :model-value="filterSupplierIds"
            @update:model-value="onSupplierFilter"
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
          <AppFilterSelect
            :model-value="filterPaymentStatus"
            :options="paymentStatusOptions"
            multiple
            :searchable="false"
            placeholder="Status Refund"
            @update:model-value="onPaymentStatusFilter"
          />
          <select
            v-model="filterDateType"
            class="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
            @change="fetchReturns()"
          >
            <option v-for="opt in dateTypeOptions" :key="opt.key" :value="opt.key">{{ opt.label }}</option>
          </select>
          <AppDateRangePicker :model-value="filterDate" @update:model-value="onDateFilter" />
        </div>
      </div>
    </div>

    <AppPurchaseReturnRecap
      ref="recapRef"
      :supplier-ids="filterSupplierIds"
      :warehouse-ids="filterWarehouseIds"
      :date-from="filterDate.from"
      :date-to="filterDate.to"
    />

    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500 text-nowrap">
            <tr>
              <th class="px-4 py-2.5 text-left">No Return</th>
              <th class="px-4 py-2.5 text-left">No GRN</th>
              <th class="px-4 py-2.5 text-left">Supplier</th>
              <th class="px-4 py-2.5 text-left">Gudang</th>
              <th class="px-4 py-2.5 text-left">Tanggal</th>
              <th class="px-4 py-2.5 text-right">Total</th>
              <th class="px-4 py-2.5 text-right">Refund</th>
              <th class="px-4 py-2.5 text-right">Sisa</th>
              <th class="px-4 py-2.5 text-center">Status</th>
              <th class="px-4 py-2.5 text-center">Status Refund</th>
              <th class="px-4 py-2.5 text-right">Tindakan</th>
            </tr>
          </thead>

          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-gray-100">
              <td v-for="j in 11" :key="j" class="px-4 py-3">
                <div class="h-4 w-20 animate-pulse rounded bg-gray-200" :class="j >= 6 ? 'ml-auto' : ''" />
              </td>
            </tr>
          </tbody>

          <tbody v-else-if="!returns.length">
            <tr>
              <td colspan="11" class="px-4 py-16 text-center">
                <Package class="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p class="text-sm text-gray-500">
                  {{ search || filterSupplierIds.length || filterWarehouseIds.length ? 'Tidak ada data yang cocok dengan filter.' : 'Belum ada retur pembelian.' }}
                </p>
              </td>
            </tr>
          </tbody>

          <tbody v-else>
            <tr
              v-for="r in returns"
              :key="r.id"
              class="border-b border-gray-100 transition-colors hover:bg-gray-50/50 last:border-b-0"
            >
              <td class="px-4 py-3"> 
                <NuxtLink
                  :to="`/purchase/return/${r.id}`"
                  class="font-semibold text-primary-600 hover:underline"
                >
                  {{ r.no }}
                </NuxtLink>
              </td>
              <td class="px-4 py-3 text-gray-700">
                <NuxtLink
                  v-if="r.purchase_receipt?.id"
                  :to="`/purchase/receipt/${r.purchase_receipt.id}`"
                  class="text-primary-600 hover:underline"
                >
                  {{ r.purchase_receipt.no }}
                </NuxtLink>
                <span v-else>-</span>
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ r.customer?.name || '-' }}</td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ r.warehouse?.name || '-' }}</td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ formatDate(r.date_created) }}</td>
              <td class="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">Rp{{ formatCurrency(Number(r.total)) }}</td>
              <td class="px-4 py-3 text-right whitespace-nowrap text-emerald-600">Rp{{ formatCurrency(calcRefunded(r)) }}</td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <span :class="calcRemaining(r) <= 0 ? 'text-green-600' : 'text-red-600 font-medium'">Rp{{ formatCurrency(calcRemaining(r)) }}</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :class="statusConfig[r.status]?.bg || 'bg-gray-100 text-gray-600'">
                  {{ statusConfig[r.status]?.label || r.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :class="paymentStatusConfig[r.payment_status]?.bg || 'bg-gray-100 text-gray-600'">
                  {{ paymentStatusConfig[r.payment_status]?.label || r.payment_status }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    v-if="r.payment_status !== 'paid'"
                    class="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                    @click="openRefundModal(r)"
                  >
                    <Wallet class="h-3.5 w-3.5" />
                    Refund
                  </button>
                  <NuxtLink
                    v-if="r.payment_status === 'unpaid'" 
                    :to="`/purchase/return/create?edit=${r.id}`" 
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Edit Return">
                    <Pencil class="h-3.5 w-3.5" />
                  </NuxtLink>
                  <NuxtLink
                    :to="`/purchase/return/${r.id}`"
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Detail Return"
                  >
                    <Eye class="h-4 w-4" />
                  </NuxtLink>
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

      <div
        v-if="!loading && totalPage > 1"
        class="flex flex-col items-center gap-3 border-t border-gray-200 bg-gray-50/50 px-4 py-3 sm:flex-row sm:justify-between"
      >
        <p class="text-xs text-gray-500">Halaman {{ page }} dari {{ totalPage }} &middot; {{ total }} data</p>
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

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showRefundModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="showRefundModal = false">
          <div class="flex w-full max-w-md flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
            <div class="shrink-0 border-b border-gray-100 px-6 py-4">
              <h2 class="text-lg font-semibold text-gray-900">Tambah Refund</h2>
              <p class="text-sm text-gray-500">{{ refundReturn?.no }}</p>
            </div>

            <div class="flex-1 overflow-y-auto px-6 py-5">
              <div class="space-y-4">
                <div v-if="refundReturn" class="grid grid-cols-3 gap-3">
                  <div class="rounded-lg bg-gray-50 p-3 text-center ring-1 ring-gray-100">
                    <p class="text-xs text-gray-400">Total</p>
                    <p class="mt-1 text-sm font-bold text-gray-900">Rp{{ formatCurrency(Number(refundReturn.total)) }}</p>
                  </div>
                  <div class="rounded-lg bg-emerald-50 p-3 text-center ring-1 ring-emerald-100">
                    <p class="text-xs text-emerald-500">Refund</p>
                    <p class="mt-1 text-sm font-bold text-emerald-700">Rp{{ formatCurrency(calcRefunded(refundReturn)) }}</p>
                  </div>
                  <div class="rounded-lg bg-red-50 p-3 text-center ring-1 ring-red-100">
                    <p class="text-xs text-red-500">Sisa</p>
                    <p class="mt-1 text-sm font-bold text-red-700">Rp{{ formatCurrency(calcRemaining(refundReturn)) }}</p>
                  </div>
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Jumlah Refund <span class="text-red-500">*</span></label>
                  <input
                    v-model.number="refundForm.amount"
                    type="number"
                    min="0"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                  <p v-if="refundErrors.amount" class="mt-1 text-xs text-red-600">{{ refundErrors.amount[0] }}</p>
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Metode <span class="text-red-500">*</span></label>
                  <select
                    v-model="refundForm.method"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="transfer">Transfer</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Tunai</option>
                    <option value="ewallet">E-Wallet</option>
                    <option value="other">Lainnya</option>
                  </select>
                  <p v-if="refundErrors.method" class="mt-1 text-xs text-red-600">{{ refundErrors.method[0] }}</p>
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Dompet <span class="text-red-500">*</span></label>
                  <select
                    v-model="refundForm.wallet_id"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">Pilih Dompet</option>
                    <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
                  </select>
                  <p v-if="refundErrors.wallet_id" class="mt-1 text-xs text-red-600">{{ refundErrors.wallet_id[0] }}</p>
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Tanggal</label>
                  <input
                    v-model="refundForm.date"
                    type="date"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan</label>
                  <textarea
                    v-model="refundForm.note"
                    rows="2"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="Catatan refund"
                  />
                </div>

                <p v-if="refundErrors.purchase_return_id" class="text-xs text-red-600">{{ refundErrors.purchase_return_id[0] }}</p>
              </div>
            </div>

            <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100" @click="showRefundModal = false">
                Batal
              </button>
              <button
                :disabled="savingRefund"
                class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
                @click="handleCreateRefund"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
