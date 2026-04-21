<script setup lang="ts">
import {
  ArrowLeft, Pencil, Trash2, Plus, Loader2,
  Package, FileText, Clock, CreditCard, CheckCircle,
  Check, X, Wallet, ChevronDown,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface WalletRef {
  id: string
  name: string
}

interface Variant {
  name: string
  value: string
}

interface ReceiptItem {
  id: string
  sku_id: string
  product_id: string
  sku: string
  name: string
  variants: Variant[]
  qty: number
  price: number
  discount: number
  total: number
  qty_returned: number
}

interface ReceiptLog {
  id: string
  name: string
  action: string
  note: string
  created_at: string
}

interface PrepaymentRef {
  id: string
  no: string
  method: string
  wallet: WalletRef | null
}

interface Payment {
  id: string
  purchase_receipt_id: string
  purchase_prepayment_id: string
  wallet_id: string
  no: string
  date: string
  amount: number
  method: string
  payment_mode: string
  files: string[] | null
  note: string
  created_at: string
  wallet: WalletRef | null
  prepayment: PrepaymentRef | null
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

interface PurchaseOrderRef {
  id: string
  no: string
  customer_id: string
  status: string
  total: number
}

interface WarehouseRef {
  id: string
  name: string
}

interface PurchaseReceipt {
  id: string
  purchase_order_id: string
  warehouse_id: string
  no: string
  external_id: string
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
  items: ReceiptItem[] | null
  payments: Payment[] | null
  logs: ReceiptLog[] | null
  created_at: string
  updated_at: string
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const router = useRouter()
const route = useRoute()

const receiptId = computed(() => route.params.id as string)

const loading = ref(true)
const receipt = ref<PurchaseReceipt | null>(null)

// Payment modal
const showPaymentModal = ref(false)
const savingPayment = ref(false)
const paymentErrors = ref<Record<string, string[]>>({})
const walletOptions = ref<WalletRef[]>([])
const prepaymentOptions = ref<Prepayment[]>([])
const paymentMode = ref<'direct' | 'prepayment'>('direct')

const paymentForm = reactive({
  purchase_receipt_id: '',
  wallet_id: '',
  purchase_prepayment_id: '',
  date: new Date().toISOString().slice(0, 10),
  amount: 0,
  method: 'transfer',
  note: '',
})

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  draft: { label: 'Draft', icon: FileText, color: 'text-yellow-600 bg-yellow-50 ring-yellow-200' },
  completed: { label: 'Selesai', icon: CheckCircle, color: 'text-green-600 bg-green-50 ring-green-200' },
}

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  unpaid: { label: 'Belum Bayar', color: 'text-red-600 bg-red-50 ring-red-200' },
  partial: { label: 'Sebagian', color: 'text-orange-600 bg-orange-50 ring-orange-200' },
  paid: { label: 'Lunas', color: 'text-green-600 bg-green-50 ring-green-200' },
}

async function fetchReceipt() {
  loading.value = true
  try {
    const res = await api.get<{ data: PurchaseReceipt }>(`/purchase-receipts/${receiptId.value}`)
    receipt.value = res.data
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data')
    router.push('/purchase/receipt')
  }
  finally {
    loading.value = false
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

async function fetchPrepayments() {
  if (!receipt.value?.purchase_order_id) return
  try {
    const res = await api.get<{ data: any[] }>(`/purchases/${receipt.value.purchase_order_id}/payment/index`)
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

function formatDateTime(dateStr: string): string {
  if (!dateStr || dateStr.startsWith('0001')) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatLogAction(action: string): string {
  const map: Record<string, string> = {
    purchase_receipt_created: 'Penerimaan Dibuat',
    purchase_receipt_updated: 'Penerimaan Diperbarui',
    purchase_receipt_detail_updated: 'Detail Diperbarui',
    purchase_receipt_status_updated: 'Status Diperbarui',
    payment_created: 'Pembayaran Ditambahkan',
    payment_deleted: 'Pembayaran Dihapus',
  }
  return map[action] || action
}

// Status actions
const updatingStatus = ref(false)
const showAllItems = ref(false)
const showLogModal = ref(false)

const visibleItems = computed(() => {
  const all = receipt.value?.items || []
  return showAllItems.value ? all : all.slice(0, 3)
})

const visibleLogs = computed(() => {
  const all = receipt.value?.logs || []
  return all.slice(0, 3)
})

async function updateStatus(newStatus: 'draft' | 'completed') {
  const labels: Record<string, { action: string; title: string; confirm: string; variant: 'info' | 'warning' }> = {
    completed: { action: 'menyelesaikan', title: 'Selesaikan Penerimaan', confirm: 'Selesai', variant: 'info' },
    draft: { action: 'mengembalikan ke draft', title: 'Kembalikan ke Draft', confirm: 'Draft', variant: 'warning' },
  }
  const cfg = labels[newStatus]!
  const ok = await confirm({
    title: cfg.title,
    message: `Yakin ingin ${cfg.action} "${receipt.value?.no}"?`,
    confirmText: cfg.confirm,
    variant: cfg.variant,
  })
  if (!ok) return

  updatingStatus.value = true
  try {
    await api.put(`/purchase-receipts/${receiptId.value}/update-status`, { status: newStatus })
    toast.success('Status berhasil diperbarui')
    await fetchReceipt()
  }
  catch (err: any) {
    toast.error(err.message || `Gagal ${cfg.action}`)
  }
  finally {
    updatingStatus.value = false
  }
}

async function handleDeleteReceipt() {
  const ok = await confirm({
    title: 'Hapus Penerimaan Barang',
    message: `Hapus "${receipt.value?.no}"? Semua item dan data terkait akan ikut terhapus.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/purchase-receipts/${receiptId.value}`)
    toast.success('Penerimaan barang berhasil dihapus')
    router.push('/purchase/receipt')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus')
  }
}

// Payments
function openPaymentModal() {
  //check walletOptions, if empty then fetch wallets
  if (!walletOptions.value.length) {
    fetchWallets()
  }
  paymentForm.purchase_receipt_id = receiptId.value
  paymentForm.wallet_id = ''
  paymentForm.purchase_prepayment_id = ''
  paymentForm.date = new Date().toISOString().slice(0, 10)
  paymentForm.amount = 0
  paymentForm.method = 'transfer'
  paymentForm.note = ''
  paymentMode.value = 'direct'
  paymentErrors.value = {}
  showPaymentModal.value = true
  fetchPrepayments()
}

async function handleSavePayment() {
  savingPayment.value = true
  paymentErrors.value = {}

  try {
    const payload: Record<string, any> = {
      payment_mode: paymentMode.value,
      purchase_prepayment_id: paymentForm.purchase_prepayment_id,
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
    await fetchReceipt()
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

async function handleDeletePayment(payment: Payment) {
  const ok = await confirm({
    title: 'Hapus Pembayaran',
    message: `Hapus pembayaran "${payment.no}" sebesar Rp${formatCurrency(Number(payment.amount))}?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/purchase-receipts/payment/${payment.id}`)
    toast.success('Pembayaran berhasil dihapus')
    await fetchReceipt()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus pembayaran')
  }
}

const totalPayment = computed(() => {
  return (receipt.value?.payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
})

const remainingPayment = computed(() => {
  return Number(receipt.value?.total || 0) - totalPayment.value
})

onMounted(() => {
  fetchReceipt()
  // fetchWallets()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <!-- to history back or to receipt list -->
      <button v-if="$router.back" type="button"
        class="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
        @click="$router.back()"
      >
        <ArrowLeft class="h-5 w-5" />
      </button>
      <NuxtLink v-else to="/purchase/receipt" class="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100">
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>

      <div class="flex-1">
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
          {{ loading ? 'Memuat...' : (receipt?.no || 'Detail Penerimaan') }}
        </h1>
        <p v-if="receipt?.purchase_order" class="text-sm text-gray-500">
          PO: {{ receipt.purchase_order.no }}
        </p>
      </div>
      <!-- Action buttons -->
      <template v-if="receipt">
        <!-- Selesai: only draft -->
        <button
          v-if="receipt.status === 'draft'"
          class="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          :disabled="updatingStatus"
          @click="updateStatus('completed')"
        >
          <Loader2 v-if="updatingStatus" class="h-4 w-4 animate-spin" />
          <Check v-else class="h-4 w-4" />
          Selesai
        </button>

        <!-- Ke Draft: only completed -->
        <button
          v-if="receipt.status === 'completed'"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          :disabled="updatingStatus"
          @click="updateStatus('draft')"
        >
          <Loader2 v-if="updatingStatus" class="h-4 w-4 animate-spin" />
          <X v-else class="h-4 w-4" />
          Ke Draft
        </button>

        <!-- Bayar: belum lunas -->
        <button
          v-if="receipt.payment_status !== 'paid'"
          class="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-100"
          @click="openPaymentModal"
        >
          <Wallet class="h-4 w-4" />
          Bayar
        </button>

        <!-- Edit: unpaid only -->
        <NuxtLink
          v-if="receipt.payment_status === 'unpaid'"
          :to="`/purchase/receipt/create?edit=${receipt.id}`"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Pencil class="h-4 w-4" />
          Edit
        </NuxtLink>

        <!-- Hapus: unpaid only -->
        <button
          v-if="receipt.payment_status === 'unpaid'"
          class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          @click="handleDeleteReceipt"
        >
          <Trash2 class="h-4 w-4" />
          Hapus
        </button>
      </template>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="grid gap-5 lg:grid-cols-4">
      <!-- Left Column Skeleton -->
      <div class="lg:col-span-1 space-y-4">
        <!-- Status -->
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-3 w-12 animate-pulse rounded bg-gray-200" />
          <div class="mt-3 h-7 w-24 animate-pulse rounded-full bg-gray-200" />
        </div>
        <!-- Payment Status -->
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-3 w-20 animate-pulse rounded bg-gray-200" />
          <div class="mt-3 h-7 w-24 animate-pulse rounded-full bg-gray-200" />
        </div>
        <!-- Informasi Penerimaan -->
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-36 animate-pulse rounded bg-gray-200" />
          <div class="mt-4 space-y-4">
            <div v-for="i in 7" :key="i">
              <div class="h-3 w-20 animate-pulse rounded bg-gray-100" />
              <div class="mt-1.5 h-4 animate-pulse rounded bg-gray-200" :class="i % 2 === 0 ? 'w-28' : 'w-36'" />
            </div>
          </div>
        </div>
      </div>
      <!-- Right Column Skeleton -->
      <div class="lg:col-span-3 space-y-4">
        <!-- Items Table -->
        <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div class="border-b border-gray-100 px-5 py-4">
            <div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50">
                  <th class="px-4 py-2.5 text-left"><div class="h-3 w-12 animate-pulse rounded bg-gray-200" /></th>
                  <th class="px-4 py-2.5 text-center"><div class="mx-auto h-3 w-8 animate-pulse rounded bg-gray-200" /></th>
                  <th class="px-4 py-2.5 text-center"><div class="mx-auto h-3 w-12 animate-pulse rounded bg-gray-200" /></th>
                  <th class="px-4 py-2.5 text-right"><div class="ml-auto h-3 w-10 animate-pulse rounded bg-gray-200" /></th>
                  <th class="px-4 py-2.5 text-right"><div class="ml-auto h-3 w-10 animate-pulse rounded bg-gray-200" /></th>
                  <th class="px-4 py-2.5 text-right"><div class="ml-auto h-3 w-10 animate-pulse rounded bg-gray-200" /></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="i in 3" :key="i" class="border-b border-gray-100">
                  <td class="px-4 py-3">
                    <div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
                    <div class="mt-1 flex gap-1.5">
                      <div class="h-3 w-16 animate-pulse rounded bg-gray-100" />
                      <div class="h-3 w-10 animate-pulse rounded bg-gray-100" />
                    </div>
                  </td>
                  <td class="px-4 py-3"><div class="mx-auto h-4 w-6 animate-pulse rounded bg-gray-200" /></td>
                  <td class="px-4 py-3"><div class="mx-auto h-4 w-6 animate-pulse rounded bg-gray-200" /></td>
                  <td class="px-4 py-3"><div class="ml-auto h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
                  <td class="px-4 py-3"><div class="ml-auto h-4 w-14 animate-pulse rounded bg-gray-200" /></td>
                  <td class="px-4 py-3"><div class="ml-auto h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- Summary -->
        <div class="ml-auto max-w-sm rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-20 animate-pulse rounded bg-gray-200" />
          <div class="mt-3 space-y-2.5">
            <div v-for="i in 3" :key="i" class="flex justify-between">
              <div class="h-3.5 w-16 animate-pulse rounded bg-gray-100" />
              <div class="h-3.5 w-24 animate-pulse rounded bg-gray-200" />
            </div>
            <div class="border-t border-gray-200 pt-2 flex justify-between">
              <div class="h-4 w-12 animate-pulse rounded bg-gray-200" />
              <div class="h-4 w-28 animate-pulse rounded bg-gray-200" />
            </div>
            <div class="border-t border-gray-200 pt-2 space-y-2">
              <div class="flex justify-between">
                <div class="h-3.5 w-14 animate-pulse rounded bg-gray-100" />
                <div class="h-3.5 w-24 animate-pulse rounded bg-gray-200" />
              </div>
              <div class="flex justify-between">
                <div class="h-3.5 w-10 animate-pulse rounded bg-gray-100" />
                <div class="h-3.5 w-24 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          </div>
        </div>
        <!-- Payments -->
        <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div class="border-b border-gray-100 px-5 py-4">
            <div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
          </div>
          <div class="divide-y divide-gray-100">
            <div v-for="i in 2" :key="i" class="flex items-center gap-4 px-5 py-3">
              <div class="h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
              <div class="flex-1">
                <div class="h-4 w-24 animate-pulse rounded bg-gray-200" />
                <div class="mt-1 h-3 w-32 animate-pulse rounded bg-gray-100" />
              </div>
              <div class="h-4 w-24 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </div>
        <!-- Activity Log -->
        <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div class="border-b border-gray-100 px-5 py-3">
            <div class="h-4 w-36 animate-pulse rounded bg-gray-200" />
          </div>
          <div class="divide-y divide-gray-100">
            <div v-for="i in 3" :key="i" class="flex items-start gap-2.5 px-4 py-2.5">
              <div class="mt-0.5 h-6 w-6 animate-pulse rounded-full bg-gray-200" />
              <div class="flex-1">
                <div class="h-3 w-40 animate-pulse rounded bg-gray-200" />
                <div class="mt-1 h-3 w-24 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template v-else-if="receipt">
      <!-- 2 Column Layout -->
      <div class="grid gap-5 lg:grid-cols-4">
        <!-- LEFT COLUMN (1/4) -->
        <div class="lg:col-span-1 space-y-4">
          <!-- Status -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p class="mb-2 text-xs font-medium uppercase text-gray-400">Status</p>
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ring-1"
              :class="statusConfig[receipt.status]?.color || 'bg-gray-50 text-gray-600 ring-gray-200'"
            >
              <component :is="statusConfig[receipt.status]?.icon || FileText" class="h-4 w-4" />
              {{ statusConfig[receipt.status]?.label || receipt.status }}
            </span>
          </div>

          <!-- Payment Status -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p class="mb-2 text-xs font-medium uppercase text-gray-400">Pembayaran</p>
            <span
              class="inline-flex rounded-full px-2.5 py-1 text-sm font-medium ring-1"
              :class="paymentStatusConfig[receipt.payment_status]?.color || 'bg-gray-50 text-gray-600 ring-gray-200'"
            >
              {{ paymentStatusConfig[receipt.payment_status]?.label || receipt.payment_status }}
            </span>
          </div>

          <!-- Info -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-3 text-sm font-semibold text-gray-900">Informasi Penerimaan</h2>
            <div class="space-y-3">
              <div>
                <p class="text-xs text-gray-400">No. GRN</p>
                <p class="text-sm font-medium text-gray-900">{{ receipt.no }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">No. PO</p>
                <NuxtLink
                  v-if="receipt.purchase_order"
                  :to="`/purchase/order/${receipt.purchase_order.id}`"
                  class="text-sm font-medium text-primary-600 hover:underline"
                >
                  {{ receipt.purchase_order.no }}
                </NuxtLink>
                <p v-else class="text-sm text-gray-500">-</p>
              </div>
              <div v-if="receipt.warehouse">
                <p class="text-xs text-gray-400">Gudang</p>
                <p class="text-sm font-medium text-gray-900">{{ receipt.warehouse.name }}</p>
              </div>
              <div v-if="receipt.external_id">
                <p class="text-xs text-gray-400">External ID</p>
                <p class="text-sm font-medium text-gray-900">{{ receipt.external_id }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Tanggal Diterima</p>
                <p class="text-sm font-medium text-gray-900">{{ formatDate(receipt.date_received) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Jatuh Tempo</p>
                <p class="text-sm font-medium text-gray-900">{{ formatDate(receipt.date_due) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Tanggal Lunas</p>
                <p class="text-sm font-medium text-gray-900">{{ formatDate(receipt.date_paid) }}</p>
              </div>
              <div v-if="receipt.note">
                <p class="text-xs text-gray-400">Catatan</p>
                <p class="text-sm text-gray-700">{{ receipt.note }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN (3/4) -->
        <div class="lg:col-span-3 space-y-4">
          <!-- Items -->
          <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="border-b border-gray-100 px-5 py-4">
              <h2 class="text-sm font-semibold text-gray-900">Item Penerimaan ({{ receipt.items?.length || 0 }})</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th class="px-4 py-2.5 text-left">Produk</th>
                    <th class="px-4 py-2.5 text-center">Qty</th>
                    <th class="px-4 py-2.5 text-center">Diretur</th>
                    <th class="px-4 py-2.5 text-right">Harga</th>
                    <th class="px-4 py-2.5 text-right">Diskon</th>
                    <th class="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in visibleItems" :key="item.id" class="border-b border-gray-100 last:border-b-0">
                    <td class="px-4 py-3">
                      <p class="font-medium text-gray-900 line-clamp-2">{{ item.name }}</p>
                      <div class="flex flex-wrap items-center gap-1.5 text-xs">
                        <span class="text-gray-500">{{ item.sku }}</span>
                        <span v-for="v in item.variants" :key="v.name" class="rounded bg-gray-100 px-1 py-0.5">
                          {{ v.value }}
                        </span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center">{{ item.qty }}</td>
                    <td class="px-4 py-3 text-center">
                      <span :class="item.qty_returned > 0 ? 'text-red-600 font-medium' : 'text-gray-400'">
                        {{ item.qty_returned }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right whitespace-nowrap">Rp{{ formatCurrency(Number(item.price)) }}</td>
                    <td class="px-4 py-3 text-right whitespace-nowrap">{{ Number(item.discount) ? `Rp${formatCurrency(Number(item.discount))}` : '-' }}</td>
                    <td class="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">Rp{{ formatCurrency(Number(item.total)) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="!receipt.items?.length" class="px-4 py-8 text-center text-sm text-gray-400">
              Tidak ada item
            </div>
            <!-- Toggle show all -->
            <div v-if="(receipt.items?.length || 0) > 3" class="border-t border-gray-100 px-4 py-2.5 text-center">
              <button
                class="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                @click="showAllItems = !showAllItems"
              >
                <ChevronDown class="h-4 w-4 transition-transform" :class="showAllItems ? 'rotate-180' : ''" />
                {{ showAllItems ? 'Sembunyikan' : `Lihat selengkapnya (${(receipt.items?.length || 0) - 3} item lagi)` }}
              </button>
            </div>
          </div>

          <!-- Summary -->
          <div class="ml-auto max-w-sm rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-3 text-sm font-semibold text-gray-900">Ringkasan</h2>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Subtotal</span>
                <span class="text-gray-900">Rp{{ formatCurrency(Number(receipt.subtotal)) }}</span>
              </div>
              <div v-if="Number(receipt.discount)" class="flex justify-between">
                <span class="text-gray-500">Diskon</span>
                <span class="text-red-600">-Rp{{ formatCurrency(Number(receipt.discount)) }}</span>
              </div>
              <div v-if="Number(receipt.shipping_fee)" class="flex justify-between">
                <span class="text-gray-500">Ongkir</span>
                <span class="text-gray-900">+Rp{{ formatCurrency(Number(receipt.shipping_fee)) }}</span>
              </div>
              <div v-if="Number(receipt.tax)" class="flex justify-between">
                <span class="text-gray-500">Pajak</span>
                <span class="text-gray-900">+Rp{{ formatCurrency(Number(receipt.tax)) }}</span>
              </div>
              <div v-if="Number(receipt.adjustment)" class="flex justify-between">
                <span class="text-gray-500">Penyesuaian</span>
                <span class="text-gray-900">{{ Number(receipt.adjustment) >= 0 ? '+' : '' }}Rp{{ formatCurrency(Number(receipt.adjustment)) }}</span>
              </div>
              <div class="border-t border-gray-200 pt-2 flex justify-between">
                <span class="font-semibold text-gray-900">Total</span>
                <span class="font-bold text-gray-900">Rp{{ formatCurrency(Number(receipt.total)) }}</span>
              </div>
              <div class="border-t border-gray-200 pt-2 flex justify-between">
                <span class="text-gray-500">Dibayar</span>
                <span class="font-medium text-gray-900">Rp{{ formatCurrency(totalPayment) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Sisa</span>
                <span class="font-medium" :class="remainingPayment <= 0 ? 'text-green-600' : 'text-red-600'">Rp{{ formatCurrency(remainingPayment) }}</span>
              </div>
            </div>
          </div>

          <!-- Payments -->
          <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 class="text-sm font-semibold text-gray-900">
                Pembayaran ({{ receipt.payments?.length || 0 }})
              </h2>
              <button
                v-if="receipt.payment_status !== 'paid'"
                class="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                @click="openPaymentModal"
              >
                <Plus class="h-3.5 w-3.5" />
                Tambah Pembayaran
              </button>
            </div>

            <div v-if="receipt.payments?.length" class="divide-y divide-gray-100">
              <div v-for="payment in receipt.payments" :key="payment.id" class="flex items-center gap-4 px-5 py-3">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-lg"
                  :class="payment.prepayment ? 'bg-purple-50' : 'bg-green-50'"
                >
                  <CreditCard class="h-5 w-5" :class="payment.prepayment ? 'text-purple-600' : 'text-green-600'" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-medium text-gray-900">{{ payment.no }}</p>
                    <span v-if="payment.prepayment" class="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-600">Alokasi DP</span>
                    <span v-else class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{{ payment.method }}</span>
                  </div>
                  <p class="text-xs text-gray-500">
                    {{ formatDate(payment.date) }}
                    <span v-if="payment.wallet"> &middot; {{ payment.wallet.name }}</span>
                  </p>
                  <p v-if="payment.prepayment" class="text-xs text-purple-500">
                    Dari: {{ payment.prepayment.no }}
                    <span v-if="payment.prepayment.wallet"> &middot; {{ payment.prepayment.wallet.name }}</span>
                    <span> &middot; {{ payment.prepayment.method }}</span>
                  </p>
                  <p v-if="payment.note" class="text-xs text-gray-400">{{ payment.note }}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-semibold" :class="payment.prepayment ? 'text-purple-600' : 'text-green-600'">Rp{{ formatCurrency(Number(payment.amount)) }}</p>
                </div>
                <button
                  class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  title="Hapus"
                  @click="handleDeletePayment(payment)"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </div>
            <div v-else class="px-4 py-8 text-center text-sm text-gray-400">
              Belum ada pembayaran
            </div>

            <!-- Payment summary -->
            <div v-if="receipt.payments?.length" class="border-t border-gray-100 px-5 py-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Total Dibayar</span>
                <span class="font-medium text-gray-900">Rp{{ formatCurrency(totalPayment) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Sisa</span>
                <span class="font-medium" :class="remainingPayment <= 0 ? 'text-green-600' : 'text-red-600'">
                  Rp{{ formatCurrency(remainingPayment) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Activity Log -->
          <div v-if="receipt.logs?.length" class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h2 class="text-sm font-semibold text-gray-900">Riwayat Aktivitas ({{ receipt.logs.length }})</h2>
            </div>
            <div class="divide-y divide-gray-100">
              <div v-for="log in visibleLogs" :key="log.id" class="flex items-start gap-2.5 px-4 py-2.5">
                <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Clock class="h-3 w-3 text-gray-500" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs text-gray-900">
                    <span class="font-medium">{{ log.name }}</span>
                    <span class="text-gray-500"> — {{ formatLogAction(log.action) }}</span>
                  </p>
                  <p v-if="log.note" class="text-xs text-gray-500">{{ log.note }}</p>
                  <p class="text-xs text-gray-400">{{ formatDateTime(log.created_at) }}</p>
                </div>
              </div>
            </div>
            <div v-if="receipt.logs.length > 3" class="border-t border-gray-100 px-4 py-2.5 text-center">
              <button
                class="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                @click="showLogModal = true"
              >
                Lihat selengkapnya ({{ receipt.logs.length - 3 }} lagi)
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Activity Log Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showLogModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="showLogModal = false">
          <div class="flex w-full max-w-lg flex-col rounded-xl bg-white shadow-xl" style="max-height: 80vh;" @click.stop>
            <div class="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 class="text-lg font-semibold text-gray-900">Riwayat Aktivitas ({{ receipt?.logs?.length || 0 }})</h2>
              <button class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="showLogModal = false">
                <X class="h-5 w-5" />
              </button>
            </div>
            <div class="flex-1 overflow-y-auto divide-y divide-gray-100">
              <div v-for="log in receipt?.logs" :key="log.id" class="flex items-start gap-3 px-6 py-3">
                <div class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Clock class="h-3.5 w-3.5 text-gray-500" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-gray-900">
                    <span class="font-medium">{{ log.name }}</span>
                    <span class="text-gray-500"> — {{ formatLogAction(log.action) }}</span>
                  </p>
                  <p v-if="log.note" class="text-xs text-gray-500">{{ log.note }}</p>
                  <p class="text-xs text-gray-400">{{ formatDateTime(log.created_at) }}</p>
                </div>
              </div>
            </div>
            <div class="flex shrink-0 justify-end border-t border-gray-100 px-6 py-3">
              <button class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" @click="showLogModal = false">Tutup</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

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
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto px-6 py-5">
              <div class="space-y-4">
                <!-- Payment Info Summary -->
                <div v-if="receipt" class="grid grid-cols-3 gap-3">
                  <div class="rounded-lg bg-gray-50 p-3 text-center ring-1 ring-gray-100">
                    <p class="text-xs text-gray-400">Total</p>
                    <p class="mt-1 text-sm font-bold text-gray-900">Rp{{ formatCurrency(Number(receipt.total)) }}</p>
                  </div>
                  <div class="rounded-lg bg-emerald-50 p-3 text-center ring-1 ring-emerald-100">
                    <p class="text-xs text-emerald-500">Dibayar</p>
                    <p class="mt-1 text-sm font-bold text-emerald-700">Rp{{ formatCurrency(totalPayment) }}</p>
                  </div>
                  <div class="rounded-lg p-3 text-center ring-1" :class="remainingPayment <= 0 ? 'bg-green-50 ring-green-100' : 'bg-red-50 ring-red-100'">
                    <p class="text-xs" :class="remainingPayment <= 0 ? 'text-green-500' : 'text-red-500'">Sisa</p>
                    <p class="mt-1 text-sm font-bold" :class="remainingPayment <= 0 ? 'text-green-700' : 'text-red-700'">Rp{{ formatCurrency(remainingPayment) }}</p>
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
                  <!-- Amount -->
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

                  <!-- Method -->
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

                  <!-- Wallet -->
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
                  <!-- Prepayment Select -->
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

                  <!-- Amount -->
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
  </div>
</template>
