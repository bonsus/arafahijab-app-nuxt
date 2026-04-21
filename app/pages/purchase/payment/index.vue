<script setup lang="ts">
import {
  Search, Eye, ChevronLeft, ChevronRight,
  Package, Loader2, RefreshCw, X, Wallet, CreditCard,
  ChevronDown, Pencil,
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

interface WalletRef {
  id: string
  name: string
}

interface PrepaymentAllocation {
  id: string
  purchase_prepayment_id: string
  purchase_receipt_id: string
  amount: number
}

interface Prepayment {
  id: string
  no: string
  amount: number
  remaining: number
  purchase_order_id: string
  method: string
  wallet: WalletRef | null
  allocations: PrepaymentAllocation[] | null
}

interface ReceiptPayment {
  id: string
  no: string
  date: string
  amount: number
  method: string
  payment_mode: string
  note: string
  wallet: WalletRef | null
  prepayment: { id: string; no: string } | null
}

interface PurchaseReceipt {
  id: string
  purchase_order_id: string
  no: string
  date_received: string
  date_due: string
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
  payments: ReceiptPayment[] | null
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

const loading = ref(true)
const receipts = ref<PurchaseReceipt[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)
const search = ref('')
const filterSupplierIds = ref<string[]>([])
const filterPaymentStatus = ref<string[]>([])
const filterDateType = ref('date_due')
const filterDate = ref({ from: '', to: '' })
const recapRef = ref<{ refresh: () => Promise<void> } | null>(null)

const suppliers = ref<{ id: string; name: string }[]>([])
const loadingSuppliers = ref(false)

const supplierOptions = computed(() =>
  suppliers.value.map(s => ({ value: s.id, label: s.name })),
)

const paymentStatusOptions = [
  { value: 'unpaid', label: 'Belum Bayar' },
  { value: 'partial', label: 'Sebagian' },
  { value: 'paid', label: 'Lunas' },
]

const dateTypeOptions = [
  { key: 'date_due', label: 'Tgl Jatuh Tempo' },
  { key: 'date_received', label: 'Tgl Diterima' },
  { key: 'date_paid', label: 'Tgl Lunas' },
]

const paymentStatusConfig: Record<string, { label: string; bg: string }> = {
  unpaid: { label: 'Belum Bayar', bg: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  partial: { label: 'Sebagian', bg: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  paid: { label: 'Lunas', bg: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
}

const tabs = [
  { key: 'payment', label: 'Pembayaran', to: '/purchase/payment' },
  { key: 'history', label: 'Riwayat Pembayaran', to: '/purchase/payment/history' },
  { key: 'prepayment', label: 'Prepayment', to: '/purchase/payment/prepayment' },
]

// Payment modal
const showPaymentModal = ref(false)
const savingPayment = ref(false)
const paymentErrors = ref<Record<string, string[]>>({})
const walletOptions = ref<WalletRef[]>([])
const prepaymentOptions = ref<Prepayment[]>([])
const paymentMode = ref<'direct' | 'prepayment'>('direct')
const paymentReceipt = ref<PurchaseReceipt | null>(null)

const paymentForm = reactive({
  purchase_receipt_id: '',
  wallet_id: '',
  purchase_prepayment_id: '',
  date: new Date().toISOString().slice(0, 10),
  amount: 0,
  method: 'transfer',
  note: '',
})

function calcTotalPaid(r: PurchaseReceipt): number {
  return (r.payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
}

const paymentTotalPaid = computed(() => paymentReceipt.value ? calcTotalPaid(paymentReceipt.value) : 0)
const paymentRemaining = computed(() => Number(paymentReceipt.value?.total || 0) - paymentTotalPaid.value)

async function fetchReceipts() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
      status: 'received,completed',
    }
    if (search.value) params.search = search.value
    if (filterSupplierIds.value.length) params.customer_id = filterSupplierIds.value.join(',')
    if (filterPaymentStatus.value.length) params.payment_status = filterPaymentStatus.value.join(',')
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

function onSupplierFilter(val: string | string[]) {
  filterSupplierIds.value = val as string[]
  page.value = 1
  fetchReceipts()
}

function onPaymentStatusFilter(val: string | string[]) {
  filterPaymentStatus.value = val as string[]
  page.value = 1
  fetchReceipts()
}

function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1
  fetchReceipts()
}

function goPage(p: number) {
  if (p < 1 || p > totalPage.value) return
  page.value = p
  fetchReceipts()
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

function getDueDaysInfo(dateStr: string): { label: string; color: string } | null {
  if (!dateStr || dateStr.startsWith('0001')) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  due.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff > 0) return { label: `${diff} hari lagi`, color: 'text-green-600' }
  if (diff === 0) return { label: 'Hari ini', color: 'text-yellow-600' }
  return { label: `Telat ${Math.abs(diff)} hari`, color: 'text-red-600' }
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

async function fetchWallets() {
  try {
    const res = await api.get<{ data: WalletRef[] }>('/wallets/index')
    walletOptions.value = (res.data || []).filter((w: any) => w.status === 'active')
  }
  catch {
    walletOptions.value = []
  }
}

async function fetchPrepayments(purchaseOrderId: string) {
  try {
    const res = await api.get<{ data: any[] }>(`/purchases/${purchaseOrderId}/payment/index`)
    const list = res.data || []
    prepaymentOptions.value = list.map((p: any) => {
      const allocations: PrepaymentAllocation[] = p.allocations || []
      const allocated = allocations.reduce((sum: number, a: PrepaymentAllocation) => sum + Number(a.amount), 0)
      return {
        id: p.id,
        no: p.no,
        amount: Number(p.amount),
        remaining: Number(p.amount) - allocated,
        purchase_order_id: p.purchase_order_id,
        method: p.method || '',
        wallet: p.wallet || null,
        allocations,
      }
    }).filter((p: Prepayment) => p.remaining > 0)
  }
  catch {
    prepaymentOptions.value = []
  }
}

function openPaymentModal(receipt: PurchaseReceipt) {
  paymentReceipt.value = receipt
  if (!walletOptions.value.length) fetchWallets()
  paymentForm.purchase_receipt_id = receipt.id
  paymentForm.wallet_id = ''
  paymentForm.purchase_prepayment_id = ''
  paymentForm.date = new Date().toISOString().slice(0, 10)
  paymentForm.amount = 0
  paymentForm.method = 'transfer'
  paymentForm.note = ''
  paymentMode.value = 'direct'
  paymentErrors.value = {}
  showPaymentModal.value = true
  if (receipt.purchase_order_id) {
    fetchPrepayments(receipt.purchase_order_id)
  }
}

async function handleSavePayment() {
  savingPayment.value = true
  paymentErrors.value = {}

  try {
    const payload: Record<string, any> = {
      payment_mode: paymentMode.value,
      purchase_receipt_id: paymentForm.purchase_receipt_id,
      date: paymentForm.date ? new Date(paymentForm.date).toISOString() : '',
      amount: paymentForm.amount,
      note: paymentForm.note,
    }

    if (paymentMode.value === 'prepayment') {
      payload.purchase_prepayment_id = paymentForm.purchase_prepayment_id
    }
    else {
      payload.wallet_id = paymentForm.wallet_id
      payload.method = paymentForm.method
    }

    await api.post('/purchase-receipts/payment/create', payload)
    toast.success('Pembayaran berhasil ditambahkan')
    showPaymentModal.value = false
    await fetchReceipts()
    await recapRef.value?.refresh()
  }
  catch (err: any) {
    if (err.errors) {
      paymentErrors.value = err.errors
    }
    else {
      toast.error(err.message || 'Gagal menyimpan pembayaran')
    }
  }
  finally {
    savingPayment.value = false
  }
}

// Payment list modal
const showPaymentListModal = ref(false)
const paymentListReceipt = ref<PurchaseReceipt | null>(null)

function openPaymentListModal(receipt: PurchaseReceipt) {
  paymentListReceipt.value = receipt
  showPaymentListModal.value = true
}

const methodLabel: Record<string, string> = {
  transfer: 'Transfer',
  cash: 'Tunai',
  ewallet: 'E-Wallet',
  other: 'Lainnya',
}

// Edit detail modal
const showEditModal = ref(false)
const savingEdit = ref(false)
const editErrors = ref<Record<string, string[]>>({})
const editReceipt = ref<PurchaseReceipt | null>(null)

const editForm = reactive({
  date_due: '',
  external_id: '',
  discount: 0,
  shipping_fee: 0,
  adjustment: 0,
})

const editSubtotal = computed(() => Number(editReceipt.value?.subtotal || 0))
const editTotal = computed(() => editSubtotal.value - editForm.discount + editForm.shipping_fee + editForm.adjustment)

function openEditModal(receipt: PurchaseReceipt) {
  editReceipt.value = receipt
  editForm.date_due = receipt.date_due && !receipt.date_due.startsWith('0001') ? receipt.date_due.slice(0, 10) : ''
  editForm.external_id = (receipt as any).external_id || ''
  editForm.discount = Number(receipt.discount) || 0
  editForm.shipping_fee = Number(receipt.shipping_fee) || 0
  editForm.adjustment = Number(receipt.adjustment) || 0
  editErrors.value = {}
  showEditModal.value = true
}

async function handleSaveEdit() {
  if (!editReceipt.value) return
  savingEdit.value = true
  editErrors.value = {}

  try {
    const payload: Record<string, any> = {
      date_due: editForm.date_due ? new Date(editForm.date_due).toISOString() : '',
      external_id: editForm.external_id,
      discount: editForm.discount,
      shipping_fee: editForm.shipping_fee,
      adjustment: editForm.adjustment,
    }

    await api.put(`/purchase-receipts/${editReceipt.value.id}/update-detail`, payload)
    toast.success('Detail penerimaan berhasil diperbarui')
    showEditModal.value = false
    await fetchReceipts()
    await recapRef.value?.refresh()
  }
  catch (err: any) {
    if (err.errors) {
      editErrors.value = err.errors
    }
    else {
      toast.error(err.message || 'Gagal memperbarui detail')
    }
  }
  finally {
    savingEdit.value = false
  }
}

async function resetFilters() {
  search.value = ''
  filterSupplierIds.value = []
  filterPaymentStatus.value = []
  filterDateType.value = 'date_due'
  filterDate.value = { from: '', to: '' }
  await fetchReceipts()
}

onMounted(() => {
  fetchReceipts()
  fetchSuppliers()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Pembayaran Pembelian</h1>
        <p class="text-sm text-gray-500">Kelola pembayaran penerimaan barang.</p>
      </div>
    </div>

    <!-- Tabs & Filters -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <!-- Tabs -->
      <div class="flex items-center gap-0 overflow-x-auto border-b border-gray-200">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.key"
          :to="tab.to"
          class="relative shrink-0 whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors"
          :class="tab.key === 'payment'
            ? 'text-primary-600'
            : 'text-gray-500 hover:text-gray-700'"
        >
          {{ tab.label }}
          <span
            v-if="tab.key === 'payment'"
            class="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-primary-600"
          />
        </NuxtLink>
      </div>

      <!-- Filters -->
      <div class="space-y-3 px-4 py-3">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari no GRN, no PO..."
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
            :model-value="filterPaymentStatus"
            :options="paymentStatusOptions"
            multiple
            :searchable="false"
            placeholder="Status Bayar"
            @update:model-value="onPaymentStatusFilter"
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

    <AppPaymentRecap
      ref="recapRef"
      :search="search"
      :supplier-ids="filterSupplierIds"
      :payment-status="filterPaymentStatus"
      :date-type="filterDateType"
      :date-from="filterDate.from"
      :date-to="filterDate.to"
    />

    <!-- Table -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500 text-nowrap">
            <tr>
              <th class="px-4 py-2.5 text-left">No GRN</th>
              <th class="px-4 py-2.5 text-left">No PO</th>
              <th class="px-4 py-2.5 text-left">Supplier</th>
              <th class="px-4 py-2.5 text-left">Diterima</th>
              <th class="px-4 py-2.5 text-left">Jatuh Tempo</th>
              <th class="px-4 py-2.5 text-right">Total</th>
              <th class="px-4 py-2.5 text-right">Dibayar</th>
              <th class="px-4 py-2.5 text-right">Sisa</th>
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
              <td class="px-4 py-3"><div class="ml-auto h-4 w-24 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="ml-auto h-4 w-24 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="ml-auto h-4 w-24 animate-pulse rounded bg-gray-200" /></td>
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
                  {{ search || filterSupplierIds.length || filterPaymentStatus.length ? 'Tidak ada data yang cocok dengan filter.' : 'Belum ada penerimaan untuk dibayar.' }}
                </p>
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
                {{ formatDate(r.date_received) }}
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                <div>{{ formatDate(r.date_due) }}</div>
                <div
                  v-if="getDueDaysInfo(r.date_due) && r.payment_status !== 'paid'"
                  class="text-xs mt-0.5" :class="getDueDaysInfo(r.date_due)!.color"
                >
                  {{ getDueDaysInfo(r.date_due)!.label }}
                </div>
              </td>
              <td class="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                Rp{{ formatCurrency(Number(r.total)) }}
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <button
                  class="text-green-600 hover:underline cursor-pointer"
                  @click="openPaymentListModal(r)"
                >
                  Rp{{ formatCurrency(calcTotalPaid(r)) }}
                </button>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <span :class="Number(r.total) - calcTotalPaid(r) <= 0 ? 'text-green-600' : 'text-red-600 font-medium'">
                  Rp{{ formatCurrency(Number(r.total) - calcTotalPaid(r)) }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="paymentStatusConfig[r.payment_status]?.bg || 'bg-gray-100 text-gray-600'"
                >
                  {{ paymentStatusConfig[r.payment_status]?.label || r.payment_status }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    v-if="r.payment_status !== 'paid'"
                    class="inline-flex items-center gap-1 rounded-lg bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-100"
                    @click="openPaymentModal(r)"
                  >
                    <Wallet class="h-3.5 w-3.5" />
                    Bayar
                  </button>
                  <button
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Edit Detail"
                    @click="openEditModal(r)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <NuxtLink
                    :to="`/purchase/receipt/${r.id}`"
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Detail"
                  >
                    <Eye class="h-4 w-4" />
                  </NuxtLink>
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

    <!-- Payment Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showPaymentModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="showPaymentModal = false">
          <div class="flex w-full max-w-md flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
            <!-- Header -->
            <div class="shrink-0 border-b border-gray-100 px-6 py-4">
              <h2 class="text-lg font-semibold text-gray-900">Tambah Pembayaran</h2>
              <p class="text-sm text-gray-500">{{ paymentReceipt?.no }}</p>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto px-6 py-5">
              <div class="space-y-4">
                <!-- Payment Info Summary -->
                <div v-if="paymentReceipt" class="grid grid-cols-3 gap-3">
                  <div class="rounded-lg bg-gray-50 p-3 text-center ring-1 ring-gray-100">
                    <p class="text-xs text-gray-400">Total</p>
                    <p class="mt-1 text-sm font-bold text-gray-900">Rp{{ formatCurrency(Number(paymentReceipt.total)) }}</p>
                  </div>
                  <div class="rounded-lg bg-emerald-50 p-3 text-center ring-1 ring-emerald-100">
                    <p class="text-xs text-emerald-500">Dibayar</p>
                    <p class="mt-1 text-sm font-bold text-emerald-700">Rp{{ formatCurrency(paymentTotalPaid) }}</p>
                  </div>
                  <div class="rounded-lg p-3 text-center ring-1" :class="paymentRemaining <= 0 ? 'bg-green-50 ring-green-100' : 'bg-red-50 ring-red-100'">
                    <p class="text-xs" :class="paymentRemaining <= 0 ? 'text-green-500' : 'text-red-500'">Sisa</p>
                    <p class="mt-1 text-sm font-bold" :class="paymentRemaining <= 0 ? 'text-green-700' : 'text-red-700'">Rp{{ formatCurrency(paymentRemaining) }}</p>
                  </div>
                </div>

                <!-- Payment Mode -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Tipe Pembayaran</label>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                      :class="paymentMode === 'direct' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
                      @click="paymentMode = 'direct'"
                    >
                      Pembayaran Langsung
                    </button>
                    <button
                      type="button"
                      class="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                      :class="paymentMode === 'prepayment' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
                      @click="paymentMode = 'prepayment'"
                    >
                      Alokasi Prepayment
                    </button>
                  </div>
                </div>

                <!-- Direct Payment Fields -->
                <template v-if="paymentMode === 'direct'">
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-gray-700">Jumlah <span class="text-red-500">*</span></label>
                    <input
                      v-model.number="paymentForm.amount"
                      type="number"
                      min="0"
                      placeholder="0"
                      class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                    <p v-if="paymentErrors.amount" class="mt-1 text-xs text-red-600">{{ paymentErrors.amount[0] }}</p>
                  </div>

                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-gray-700">Metode Pembayaran <span class="text-red-500">*</span></label>
                    <select
                      v-model="paymentForm.method"
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    >
                      <option value="transfer">Transfer Bank</option>
                      <option value="cash">Tunai</option>
                      <option value="ewallet">E-Wallet</option>
                      <option value="other">Lainnya</option>
                    </select>
                    <p v-if="paymentErrors.method" class="mt-1 text-xs text-red-600">{{ paymentErrors.method[0] }}</p>
                  </div>

                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-gray-700">Dompet <span class="text-red-500">*</span></label>
                    <select
                      v-model="paymentForm.wallet_id"
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    >
                      <option value="">Pilih Dompet</option>
                      <option v-for="w in walletOptions" :key="w.id" :value="w.id">
                        {{ w.name }}
                      </option>
                    </select>
                    <p v-if="paymentErrors.wallet_id" class="mt-1 text-xs text-red-600">{{ paymentErrors.wallet_id[0] }}</p>
                  </div>
                </template>

                <!-- Prepayment Allocation Fields -->
                <template v-else>
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-gray-700">Pilih Prepayment <span class="text-red-500">*</span></label>
                    <select
                      v-model="paymentForm.purchase_prepayment_id"
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    >
                      <option value="">Pilih Prepayment</option>
                      <option v-for="pp in prepaymentOptions" :key="pp.id" :value="pp.id">
                        {{ pp.no }} — Sisa: Rp{{ formatCurrency(pp.remaining) }} (dari Rp{{ formatCurrency(pp.amount) }})
                      </option>
                    </select>
                    <p v-if="paymentErrors.purchase_prepayment_id" class="mt-1 text-xs text-red-600">{{ paymentErrors.purchase_prepayment_id[0] }}</p>
                    <p v-if="!prepaymentOptions.length" class="mt-1 text-xs text-gray-400">Tidak ada prepayment tersedia di PO ini</p>
                  </div>

                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-gray-700">Jumlah Alokasi <span class="text-red-500">*</span></label>
                    <input
                      v-model.number="paymentForm.amount"
                      type="number"
                      min="0"
                      placeholder="0"
                      class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                    <p v-if="paymentErrors.amount" class="mt-1 text-xs text-red-600">{{ paymentErrors.amount[0] }}</p>
                  </div>
                </template>

                <!-- Date -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Tanggal</label>
                  <input
                    v-model="paymentForm.date"
                    type="date"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <!-- Note -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan</label>
                  <textarea
                    v-model="paymentForm.note"
                    rows="2"
                    placeholder="Catatan pembayaran"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <p v-if="paymentErrors.purchase_receipt_id" class="text-xs text-red-600">{{ paymentErrors.purchase_receipt_id[0] }}</p>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                @click="showPaymentModal = false"
              >
                Batal
              </button>
              <button
                :disabled="savingPayment"
                class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                @click="handleSavePayment"
              >
                {{ savingPayment ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Payment List Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showPaymentListModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="showPaymentListModal = false">
          <div class="flex w-full max-w-lg flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
            <!-- Header -->
            <div class="shrink-0 border-b border-gray-100 px-6 py-4">
              <h2 class="text-lg font-semibold text-gray-900">Riwayat Pembayaran</h2>
              <p class="text-sm text-gray-500">{{ paymentListReceipt?.no }}</p>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto">
              <!-- Summary -->
              <div v-if="paymentListReceipt" class="grid grid-cols-3 gap-3 px-6 pt-5 pb-3">
                <div class="rounded-lg bg-gray-50 p-2.5 text-center ring-1 ring-gray-100">
                  <p class="text-xs text-gray-400">Total</p>
                  <p class="mt-0.5 text-sm font-bold text-gray-900">Rp{{ formatCurrency(Number(paymentListReceipt.total)) }}</p>
                </div>
                <div class="rounded-lg bg-emerald-50 p-2.5 text-center ring-1 ring-emerald-100">
                  <p class="text-xs text-emerald-500">Dibayar</p>
                  <p class="mt-0.5 text-sm font-bold text-emerald-700">Rp{{ formatCurrency(calcTotalPaid(paymentListReceipt)) }}</p>
                </div>
                <div class="rounded-lg p-2.5 text-center ring-1" :class="Number(paymentListReceipt.total) - calcTotalPaid(paymentListReceipt) <= 0 ? 'bg-green-50 ring-green-100' : 'bg-red-50 ring-red-100'">
                  <p class="text-xs" :class="Number(paymentListReceipt.total) - calcTotalPaid(paymentListReceipt) <= 0 ? 'text-green-500' : 'text-red-500'">Sisa</p>
                  <p class="mt-0.5 text-sm font-bold" :class="Number(paymentListReceipt.total) - calcTotalPaid(paymentListReceipt) <= 0 ? 'text-green-700' : 'text-red-700'">Rp{{ formatCurrency(Number(paymentListReceipt.total) - calcTotalPaid(paymentListReceipt)) }}</p>
                </div>
              </div>

              <!-- Payment list -->
              <div v-if="paymentListReceipt?.payments?.length" class="px-6 pb-5">
                <div class="divide-y divide-gray-100 rounded-lg border border-gray-200">
                  <div
                    v-for="pay in paymentListReceipt.payments"
                    :key="pay.id"
                    class="flex items-center gap-3 px-4 py-3"
                  >
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" :class="pay.payment_mode === 'prepayment' ? 'bg-purple-50' : 'bg-emerald-50'">
                      <CreditCard class="h-4 w-4" :class="pay.payment_mode === 'prepayment' ? 'text-purple-500' : 'text-emerald-500'" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <p class="text-sm font-medium text-gray-900">{{ pay.no }}</p>
                        <span
                          v-if="pay.payment_mode === 'prepayment'"
                          class="inline-flex rounded-full bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 ring-1 ring-purple-200"
                        >DP</span>
                      </div>
                      <div class="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                        <span>{{ formatDate(pay.date) }}</span>
                        <span>&middot;</span>
                        <span v-if="pay.payment_mode === 'prepayment' && pay.prepayment">{{ pay.prepayment.no }}</span>
                        <span v-else>{{ methodLabel[pay.method] || pay.method }}</span>
                        <template v-if="pay.wallet">
                          <span>&middot;</span>
                          <span>{{ pay.wallet.name }}</span>
                        </template>
                      </div>
                      <p v-if="pay.note" class="mt-0.5 text-xs text-gray-400 truncate">{{ pay.note }}</p>
                    </div>
                    <p class="shrink-0 text-sm font-semibold" :class="pay.payment_mode === 'prepayment' ? 'text-purple-600' : 'text-emerald-600'">Rp{{ formatCurrency(Number(pay.amount)) }}</p>
                  </div>
                </div>
              </div>

              <!-- Empty -->
              <div v-else class="px-6 py-10 text-center">
                <CreditCard class="mx-auto mb-2 h-10 w-10 text-gray-300" />
                <p class="text-sm text-gray-500">Belum ada pembayaran.</p>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex shrink-0 justify-end border-t border-gray-100 px-6 py-4">
              <button
                class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                @click="showPaymentListModal = false"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Edit Detail Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="showEditModal = false">
          <div class="flex w-full max-w-md flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
            <!-- Header -->
            <div class="shrink-0 border-b border-gray-100 px-6 py-4">
              <h2 class="text-lg font-semibold text-gray-900">Edit Detail Penerimaan</h2>
              <p class="text-sm text-gray-500">{{ editReceipt?.no }}</p>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto px-6 py-5">
              <div class="space-y-4">
                <!-- Jatuh Tempo -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Jatuh Tempo</label>
                  <input
                    v-model="editForm.date_due"
                    type="date"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="editErrors.date_due" class="mt-1 text-xs text-red-600">{{ editErrors.date_due[0] }}</p>
                </div>

                <!-- External ID -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">External ID</label>
                  <input
                    v-model="editForm.external_id"
                    type="text"
                    placeholder="ID referensi eksternal"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="editErrors.external_id" class="mt-1 text-xs text-red-600">{{ editErrors.external_id[0] }}</p>
                </div>

                <!-- Divider -->
                <div class="border-t border-gray-100 pt-2">
                  <p class="mb-3 text-xs font-medium uppercase text-gray-400">Ringkasan Biaya</p>
                </div>

                <!-- Subtotal (readonly) -->
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-500">Subtotal</span>
                  <span class="text-sm font-medium text-gray-900">Rp{{ formatCurrency(editSubtotal) }}</span>
                </div>

                <!-- Discount -->
                <div class="flex items-center gap-3">
                  <label class="w-24 shrink-0 text-sm text-gray-500">Diskon</label>
                  <div class="relative flex-1">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 pointer-events-none">Rp</span>
                    <input
                      v-model.number="editForm.discount"
                      type="number"
                      min="0"
                      class="w-full rounded-lg border border-gray-300 py-2.5 pl-8 pr-3 text-sm text-gray-900 text-right focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>
                <p v-if="editErrors.discount" class="mt-1 text-xs text-red-600">{{ editErrors.discount[0] }}</p>

                <!-- Shipping Fee -->
                <div class="flex items-center gap-3">
                  <label class="w-24 shrink-0 text-sm text-gray-500">Ongkir</label>
                  <div class="relative flex-1">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 pointer-events-none">Rp</span>
                    <input
                      v-model.number="editForm.shipping_fee"
                      type="number"
                      min="0"
                      class="w-full rounded-lg border border-gray-300 py-2.5 pl-8 pr-3 text-sm text-gray-900 text-right focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>
                <p v-if="editErrors.shipping_fee" class="mt-1 text-xs text-red-600">{{ editErrors.shipping_fee[0] }}</p>

                <!-- Adjustment -->
                <div class="flex items-center gap-3">
                  <label class="w-24 shrink-0 text-sm text-gray-500">Penyesuaian</label>
                  <div class="relative flex-1">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 pointer-events-none">Rp</span>
                    <input
                      v-model.number="editForm.adjustment"
                      type="number"
                      class="w-full rounded-lg border border-gray-300 py-2.5 pl-8 pr-3 text-sm text-gray-900 text-right focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>
                <p v-if="editErrors.adjustment" class="mt-1 text-xs text-red-600">{{ editErrors.adjustment[0] }}</p>

                <!-- Total (calculated) -->
                <div class="flex items-center justify-between border-t border-gray-200 pt-3">
                  <span class="text-sm font-semibold text-gray-900">Total</span>
                  <span class="text-base font-bold text-primary-600">Rp{{ formatCurrency(editTotal) }}</span>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                @click="showEditModal = false"
              >
                Batal
              </button>
              <button
                :disabled="savingEdit"
                class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                @click="handleSaveEdit"
              >
                {{ savingEdit ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
