<script setup lang="ts">
import {
  ArrowLeft, Pencil, Trash2, Plus, Loader2,
  Package, FileText, Clock, CreditCard, CheckCircle,
  XCircle, AlertCircle, Check, X, Wallet, ChevronDown,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Wallet {
  id: string
  name: string
}

interface Variant {
  name: string
  value: string
}

interface POItem {
  id: string
  sku_id: string
  product_id: string
  sku: string
  name: string
  variants: Variant[]
  qty: number
  qty_received: number
  price: number
  discount: number
  total: number
}

interface POLog {
  id: string
  name: string
  action: string
  note: string
  created_at: string
}

interface PrepaymentAllocation {
  id: string
  purchase_prepayment_id: string
  purchase_receipt_id: string
  date: string
  amount: number
  purchase_receipt: { id: string; no: string } | null
}

interface Prepayment {
  id: string
  purchase_order_id: string
  wallet_id: string
  no: string
  date: string
  amount: number
  method: string
  files: string[] | null
  note: string
  created_at: string
  wallet: Wallet | null
  allocations: PrepaymentAllocation[] | null
}

interface Customer {
  id: string
  name: string
  phone: string
  email: string
}

interface PurchaseOrder {
  id: string
  customer_id: string
  no: string
  external_id: string
  date_created: string
  date_approved: string
  date_released: string
  date_expected: string
  date_completed: string
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
  items: POItem[] | null
  logs: POLog[] | null
  prepayments: Prepayment[] | null
  created_at: string
  updated_at: string
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const router = useRouter()
const route = useRoute()

const poId = computed(() => route.params.id as string)

const loading = ref(true)
const po = ref<PurchaseOrder | null>(null)

// Prepayment modal
const showPrepaymentModal = ref(false)
const savingPrepayment = ref(false)
const prepaymentErrors = ref<Record<string, string[]>>({})
const walletOptions = ref<Wallet[]>([])

const prepaymentForm = reactive({
  purchase_order_id: '',
  wallet_id: '',
  date: new Date().toISOString().slice(0, 10),
  amount: 0,
  method: 'transfer',
  note: '',
})

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  draft: { label: 'Draft', icon: FileText, color: 'text-yellow-600 bg-yellow-50 ring-yellow-200' },
  waiting_approval: { label: 'Menunggu Approval', icon: Clock, color: 'text-amber-600 bg-amber-50 ring-amber-200' },
  approved: { label: 'Disetujui', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 ring-emerald-200' },
  rejected: { label: 'Ditolak', icon: XCircle, color: 'text-red-600 bg-red-50 ring-red-200' },
  completed: { label: 'Selesai', icon: CheckCircle, color: 'text-green-600 bg-green-50 ring-green-200' },
  partial: { label: 'Parsial', icon: AlertCircle, color: 'text-blue-600 bg-blue-50 ring-blue-200' },
}

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  unpaid: { label: 'Belum Bayar', color: 'text-red-600 bg-red-50 ring-red-200' },
  partial: { label: 'Sebagian', color: 'text-orange-600 bg-orange-50 ring-orange-200' },
  paid: { label: 'Lunas', color: 'text-green-600 bg-green-50 ring-green-200' },
}

async function fetchPO() {
  loading.value = true
  try {
    const res = await api.get<{ data: PurchaseOrder }>(`/purchases/${poId.value}`)
    po.value = res.data
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data PO')
    router.push('/purchase/order')
  }
  finally {
    loading.value = false
  }
}

async function fetchWallets() {
  try {
    const res = await api.get<{ data: Wallet[] }>('/wallets/index')
    walletOptions.value = (res.data || []).filter((w: any) => w.status === 'active')
  }
  catch {
    walletOptions.value = []
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
    purchase_order_created: 'PO Dibuat',
    purchase_order_updated: 'PO Diperbarui',
    purchase_order_status_updated: 'Status Diperbarui',
    purchase_order_detail_updated: 'Detail Diperbarui',
    prepayment_created: 'Pembayaran Ditambahkan',
    prepayment_deleted: 'Pembayaran Dihapus',
  }
  return map[action] || action
}

// Status actions
const updatingStatus = ref(false)
const showAllItems = ref(false)
const showLogModal = ref(false)

const visibleItems = computed(() => {
  const all = po.value?.items || []
  return showAllItems.value ? all : all.slice(0, 3)
})

const visibleLogs = computed(() => {
  const all = po.value?.logs || []
  return all.slice(0, 3)
})

async function updateStatus(newStatus: 'approved' | 'rejected' | 'waiting_approval' | 'completed') {
  const labels: Record<string, { action: string; title: string; confirm: string; variant: 'info' | 'danger' | 'warning' }> = {
    approved: { action: 'menyetujui', title: 'Setujui PO', confirm: 'Approve', variant: 'info' },
    rejected: { action: 'menolak', title: 'Tolak PO', confirm: 'Tolak', variant: 'danger' },
    waiting_approval: { action: 'membatalkan approval', title: 'Batalkan Approve', confirm: 'Batalkan', variant: 'warning' },
    completed: { action: 'menyelesaikan', title: 'Selesaikan PO', confirm: 'Selesai', variant: 'info' },
  }
  const cfg = labels[newStatus]!
  const ok = await confirm({
    title: cfg.title,
    message: `Yakin ingin ${cfg.action} PO "${po.value?.no}"?`,
    confirmText: cfg.confirm,
    variant: cfg.variant,
  })
  if (!ok) return

  updatingStatus.value = true
  try {
    await api.put(`/purchases/${poId.value}/update-status`, { status: newStatus })
    toast.success(`PO berhasil di-update`)
    await fetchPO()
  }
  catch (err: any) {
    toast.error(err.message || `Gagal ${cfg.action} PO`)
  }
  finally {
    updatingStatus.value = false
  }
}

async function handleDeletePO() {
  const ok = await confirm({
    title: 'Hapus Purchase Order',
    message: `Hapus PO "${po.value?.no}"? Semua item dan data terkait akan ikut terhapus.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/purchases/${poId.value}`)
    toast.success('Purchase order berhasil dihapus')
    router.push('/purchase/order')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus PO')
  }
}

// Prepayment
function openPrepaymentModal() {
  // check walletOptions, if empty then fetch wallets
  if (!walletOptions.value.length) {
    fetchWallets()
  }
  prepaymentForm.purchase_order_id = poId.value
  prepaymentForm.wallet_id = ''
  prepaymentForm.date = new Date().toISOString().slice(0, 10)
  prepaymentForm.amount = 0
  prepaymentForm.method = 'transfer'
  prepaymentForm.note = ''
  prepaymentErrors.value = {}
  showPrepaymentModal.value = true
}

async function handleSavePrepayment() {
  savingPrepayment.value = true
  prepaymentErrors.value = {}

  try {
    const payload: Record<string, any> = {
      purchase_order_id: prepaymentForm.purchase_order_id,
      date: prepaymentForm.date ? new Date(prepaymentForm.date).toISOString() : '',
      amount: prepaymentForm.amount,
      method: prepaymentForm.method,
      note: prepaymentForm.note,
      wallet_id: prepaymentForm.wallet_id,
    } 

    await api.post('/purchases/payment/create', payload)
    toast.success('Pembayaran berhasil ditambahkan')
    showPrepaymentModal.value = false
    await fetchPO()
  }
  catch (err: any) {
    if (err.errors) {
      prepaymentErrors.value = err.errors
    }
    else {
      toast.error(err.message || 'Gagal menyimpan pembayaran')
    }
  }
  finally {
    savingPrepayment.value = false
  }
}

async function handleDeletePrepayment(pp: Prepayment) {
  const ok = await confirm({
    title: 'Hapus Pembayaran',
    message: `Hapus pembayaran "${pp.no}" sebesar Rp${formatCurrency(pp.amount)}?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/purchases/payment/${pp.id}`)
    toast.success('Pembayaran berhasil dihapus')
    await fetchPO()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus pembayaran')
  }
}

const totalPrepayment = computed(() => {
  return (po.value?.prepayments || []).reduce((sum, p) => sum + Number(p.amount), 0)
})

const remainingPayment = computed(() => {
  return (po.value?.total || 0) - totalPrepayment.value
})

onMounted(() => {
  fetchPO()
  // fetchWallets()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/purchase/order"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <div class="flex-1">
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
          {{ loading ? 'Memuat...' : (po?.no || 'Detail PO') }}
        </h1>
        <p v-if="po?.customer" class="text-sm text-gray-500">{{ po.customer.name }}</p>
      </div>
      <!-- Action buttons matching index.vue rules -->
      <template v-if="po">
        <!-- Approve: only waiting_approval -->
        <button
          v-if="po.status === 'waiting_approval'"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          :disabled="updatingStatus"
          @click="updateStatus('approved')"
        >
          <Loader2 v-if="updatingStatus" class="h-4 w-4 animate-spin" />
          <Check v-else class="h-4 w-4" />
          Approve
        </button>

        <!-- Batalkan Approve: only approved -->
        <button
          v-if="po.status === 'approved'"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          :disabled="updatingStatus"
          @click="updateStatus('waiting_approval')"
        >
          <Loader2 v-if="updatingStatus" class="h-4 w-4 animate-spin" />
          <X v-else class="h-4 w-4" />
          Batalkan
        </button>

        <!-- Selesai: only partial -->
        <button
          v-if="po.status === 'partial'"
          class="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          :disabled="updatingStatus"
          @click="updateStatus('completed')"
        >
          <Loader2 v-if="updatingStatus" class="h-4 w-4 animate-spin" />
          <Check v-else class="h-4 w-4" />
          Selesai
        </button>

        <!-- Prepayment: approved/partial & belum lunas -->
        <button
          v-if="(po.status === 'approved' || po.status === 'partial') && po.payment_status !== 'paid'"
          class="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-100"
          @click="openPrepaymentModal"
        >
          <Wallet class="h-4 w-4" />
          Prepayment
        </button>

        <!-- Edit: draft / waiting_approval -->
        <NuxtLink
          v-if="po.status === 'draft' || po.status === 'waiting_approval'"
          :to="`/purchase/order/create?edit=${po.id}`"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Pencil class="h-4 w-4" />
          Edit
        </NuxtLink>

        <!-- Hapus: draft only -->
        <button
          v-if="po.status === 'draft'"
          class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          @click="handleDeletePO"
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
        <!-- Status PO -->
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-3 w-16 animate-pulse rounded bg-gray-200" />
          <div class="mt-3 h-7 w-28 animate-pulse rounded-full bg-gray-200" />
        </div>
        <!-- Payment Status -->
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-3 w-20 animate-pulse rounded bg-gray-200" />
          <div class="mt-3 h-7 w-24 animate-pulse rounded-full bg-gray-200" />
        </div>
        <!-- Informasi PO -->
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-24 animate-pulse rounded bg-gray-200" />
          <div class="mt-4 space-y-4">
            <div v-for="i in 5" :key="i">
              <div class="h-3 w-16 animate-pulse rounded bg-gray-100" />
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
            <div class="h-4 w-28 animate-pulse rounded bg-gray-200" />
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50">
                  <th class="px-4 py-2.5 text-left"><div class="h-3 w-12 animate-pulse rounded bg-gray-200" /></th>
                  <th class="px-4 py-2.5 text-center"><div class="mx-auto h-3 w-8 animate-pulse rounded bg-gray-200" /></th>
                  <th class="px-4 py-2.5 text-center"><div class="mx-auto h-3 w-14 animate-pulse rounded bg-gray-200" /></th>
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
          </div>
        </div>
        <!-- Prepayments -->
        <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div class="border-b border-gray-100 px-5 py-4">
            <div class="h-4 w-40 animate-pulse rounded bg-gray-200" />
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
      </div>
    </div>

    <template v-else-if="po">
      <!-- 2 Column Layout like create page -->
      <div class="grid gap-5 lg:grid-cols-4">
        <!-- LEFT COLUMN (1/4) -->
        <div class="lg:col-span-1 space-y-4">
          <!-- Status PO -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p class="mb-2 text-xs font-medium uppercase text-gray-400">Status PO</p>
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ring-1"
              :class="statusConfig[po.status]?.color || 'bg-gray-50 text-gray-600 ring-gray-200'"
            >
              <component :is="statusConfig[po.status]?.icon || FileText" class="h-4 w-4" />
              {{ statusConfig[po.status]?.label || po.status }}
            </span>
          </div>

          <!-- Payment Status -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p class="mb-2 text-xs font-medium uppercase text-gray-400">Pembayaran</p>
            <span
              class="inline-flex rounded-full px-2.5 py-1 text-sm font-medium ring-1"
              :class="paymentStatusConfig[po.payment_status]?.color || 'bg-gray-50 text-gray-600 ring-gray-200'"
            >
              {{ paymentStatusConfig[po.payment_status]?.label || po.payment_status }}
            </span>
          </div>

          <!-- Informasi PO -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-3 text-sm font-semibold text-gray-900">Informasi PO</h2>
            <div class="space-y-3">
              <div>
                <p class="text-xs text-gray-400">No. PO</p>
                <p class="text-sm font-medium text-gray-900">{{ po.no }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Supplier</p>
                <p class="text-sm font-medium text-gray-900">{{ po.customer?.name || '-' }}</p>
              </div>
              <div v-if="po.external_id">
                <p class="text-xs text-gray-400">External ID</p>
                <p class="text-sm font-medium text-gray-900">{{ po.external_id }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Tanggal Dibuat</p>
                <p class="text-sm font-medium text-gray-900">{{ formatDate(po.date_created) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Estimasi Tiba</p>
                <p class="text-sm font-medium text-gray-900">{{ formatDate(po.date_expected) }}</p>
              </div>
              <div v-if="po.note">
                <p class="text-xs text-gray-400">Catatan</p>
                <p class="text-sm text-gray-700">{{ po.note }}</p>
              </div>
            </div>
          </div>

        </div>

        <!-- RIGHT COLUMN (3/4) -->
        <div class="lg:col-span-3 space-y-4">
          <!-- Items -->
          <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="border-b border-gray-100 px-5 py-4">
              <h2 class="text-sm font-semibold text-gray-900">Item Produk ({{ po.items?.length || 0 }})</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th class="px-4 py-2.5 text-left">Produk</th>
                    <th class="px-4 py-2.5 text-center">Qty</th>
                    <th class="px-4 py-2.5 text-center">Diterima</th>
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
                      <span :class="item.qty_received >= item.qty ? 'text-green-600 font-medium' : 'text-gray-600'">
                        {{ item.qty_received }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right whitespace-nowrap">Rp{{ formatCurrency(item.price) }}</td>
                    <td class="px-4 py-3 text-right whitespace-nowrap">{{ item.discount ? `Rp${formatCurrency(item.discount)}` : '-' }}</td>
                    <td class="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">Rp{{ formatCurrency(item.total) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="!po.items?.length" class="px-4 py-8 text-center text-sm text-gray-400">
              Tidak ada item
            </div>
            <!-- Toggle show all -->
            <div v-if="(po.items?.length || 0) > 3" class="border-t border-gray-100 px-4 py-2.5 text-center">
              <button
                class="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                @click="showAllItems = !showAllItems"
              >
                <ChevronDown class="h-4 w-4 transition-transform" :class="showAllItems ? 'rotate-180' : ''" />
                {{ showAllItems ? 'Sembunyikan' : `Lihat selengkapnya (${(po.items?.length || 0) - 3} item lagi)` }}
              </button>
            </div>
          </div>

          <!-- Summary -->
          <div class="ml-auto max-w-sm rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-3 text-sm font-semibold text-gray-900">Ringkasan</h2>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Subtotal</span>
                <span class="text-gray-900">Rp{{ formatCurrency(po.subtotal) }}</span>
              </div>
              <div v-if="po.discount" class="flex justify-between">
                <span class="text-gray-500">Diskon</span>
                <span class="text-red-600">-Rp{{ formatCurrency(po.discount) }}</span>
              </div>
              <div v-if="po.shipping_fee" class="flex justify-between">
                <span class="text-gray-500">Ongkir</span>
                <span class="text-gray-900">+Rp{{ formatCurrency(po.shipping_fee) }}</span>
              </div>
              <div v-if="po.tax" class="flex justify-between">
                <span class="text-gray-500">Pajak</span>
                <span class="text-gray-900">+Rp{{ formatCurrency(po.tax) }}</span>
              </div>
              <div v-if="po.adjustment" class="flex justify-between">
                <span class="text-gray-500">Penyesuaian</span>
                <span class="text-gray-900">{{ po.adjustment >= 0 ? '+' : '' }}Rp{{ formatCurrency(po.adjustment) }}</span>
              </div>
              <div class="border-t border-gray-200 pt-2 flex justify-between">
                <span class="font-semibold text-gray-900">Total</span>
                <span class="font-bold text-gray-900">Rp{{ formatCurrency(po.total) }}</span>
              </div>
              <!-- <div class="border-t border-gray-200 pt-2 flex justify-between">
                <span class="text-gray-500">Dibayar</span>
                <span class="font-medium text-gray-900">Rp{{ formatCurrency(totalPrepayment) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Sisa</span>
                <span class="font-medium" :class="remainingPayment <= 0 ? 'text-green-600' : 'text-red-600'">Rp{{ formatCurrency(remainingPayment) }}</span>
              </div> -->
            </div>
          </div>

          <!-- Prepayments -->
          <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 class="text-sm font-semibold text-gray-900">
                Pembayaran / Prepayment ({{ po.prepayments?.length || 0 }})
              </h2>
              <button
                v-if="po.payment_status !== 'paid' && (po.status === 'approved' || po.status === 'partial' || po.status === 'completed')"
                class="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                @click="openPrepaymentModal"
              >
                <Plus class="h-3.5 w-3.5" />
                Tambah Pembayaran
              </button>
            </div>

            <div v-if="po.prepayments?.length" class="divide-y divide-gray-100">
              <div v-for="pp in po.prepayments" :key="pp.id">
                <div class="flex items-center gap-4 px-5 py-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                    <CreditCard class="h-5 w-5 text-green-600" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-medium text-gray-900">{{ pp.no }}</p>
                      <span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{{ pp.method }}</span>
                    </div>
                    <p class="text-xs text-gray-500">
                      {{ formatDate(pp.date) }}
                      <span v-if="pp.wallet"> &middot; {{ pp.wallet.name }}</span>
                    </p>
                    <p v-if="pp.note" class="text-xs text-gray-400">{{ pp.note }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-semibold text-green-600">Rp{{ formatCurrency(Number(pp.amount)) }}</p>
                    <p v-if="pp.allocations?.length" class="text-xs text-gray-400">
                      Teralokasi: Rp{{ formatCurrency(pp.allocations.reduce((s, a) => s + Number(a.amount), 0)) }}
                    </p>
                  </div>
                  <button 
                    class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Hapus"
                    @click="handleDeletePrepayment(pp)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
                <!-- Allocations -->
                <div v-if="pp.allocations?.length" class="border-t border-dashed border-gray-100 bg-gray-50/50 px-5 py-2">
                  <p class="mb-1.5 text-xs font-medium text-gray-400">Alokasi ke Penerimaan Barang</p>
                  <div class="space-y-1">
                    <div v-for="alloc in pp.allocations" :key="alloc.id" class="flex items-center justify-between text-xs">
                      <div class="flex items-center gap-1.5">
                        <span class="inline-block h-1.5 w-1.5 rounded-full bg-primary-400" />
                        <NuxtLink
                          v-if="alloc.purchase_receipt"
                          :to="`/purchase/receipt/${alloc.purchase_receipt.id}`"
                          class="font-medium text-primary-600 hover:underline"
                        >
                          {{ alloc.purchase_receipt.no }}
                        </NuxtLink>
                        <span v-else class="text-gray-500">-</span>
                        <span class="text-gray-400">{{ formatDate(alloc.date) }}</span>
                      </div>
                      <span class="font-medium text-gray-700">Rp{{ formatCurrency(Number(alloc.amount)) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="px-4 py-8 text-center text-sm text-gray-400">
              Belum ada pembayaran
            </div>

            <!-- Payment summary -->
            <div v-if="po.prepayments?.length" class="border-t border-gray-100 px-5 py-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Total Dibayar</span>
                <span class="font-medium text-gray-900">Rp{{ formatCurrency(totalPrepayment) }}</span>
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
          <div v-if="po.logs?.length" class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h2 class="text-sm font-semibold text-gray-900">Riwayat Aktivitas ({{ po.logs.length }})</h2>
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
            <div v-if="po.logs.length > 3" class="border-t border-gray-100 px-4 py-2.5 text-center">
              <button
                class="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                @click="showLogModal = true"
              >
                Lihat selengkapnya ({{ po.logs.length - 3 }} lagi)
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
              <h2 class="text-lg font-semibold text-gray-900">Riwayat Aktivitas ({{ po?.logs?.length || 0 }})</h2>
              <button class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="showLogModal = false">
                <X class="h-5 w-5" />
              </button>
            </div>
            <div class="flex-1 overflow-y-auto divide-y divide-gray-100">
              <div v-for="log in po?.logs" :key="log.id" class="flex items-start gap-3 px-6 py-3">
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

    <!-- Prepayment Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showPrepaymentModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="showPrepaymentModal = false">
          <div class="flex w-full max-w-md flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
            <!-- Header -->
            <div class="shrink-0 border-b border-gray-100 px-6 py-4">
              <h2 class="text-lg font-semibold text-gray-900">Tambah Pembayaran</h2>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto px-6 py-5">
              <div class="space-y-4">
                <!-- Payment Info Summary -->
                <div v-if="po" class="grid grid-cols-3 gap-3">
                  <div class="rounded-lg bg-gray-50 p-3 text-center ring-1 ring-gray-100">
                    <p class="text-xs text-gray-400">Total PO</p>
                    <p class="mt-1 text-sm font-bold text-gray-900">Rp{{ formatCurrency(po.total) }}</p>
                  </div>
                  <div class="rounded-lg bg-emerald-50 p-3 text-center ring-1 ring-emerald-100">
                    <p class="text-xs text-emerald-500">Dibayar</p>
                    <p class="mt-1 text-sm font-bold text-emerald-700">Rp{{ formatCurrency(totalPrepayment) }}</p>
                  </div>
                  <div class="rounded-lg p-3 text-center ring-1" :class="remainingPayment <= 0 ? 'bg-green-50 ring-green-100' : 'bg-red-50 ring-red-100'">
                    <p class="text-xs" :class="remainingPayment <= 0 ? 'text-green-500' : 'text-red-500'">Sisa</p>
                    <p class="mt-1 text-sm font-bold" :class="remainingPayment <= 0 ? 'text-green-700' : 'text-red-700'">Rp{{ formatCurrency(remainingPayment) }}</p>
                  </div>
                </div>

                <!-- Amount -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Jumlah <span class="text-red-500">*</span></label>
                  <input
                    v-model.number="prepaymentForm.amount"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="prepaymentErrors.amount" class="mt-1 text-xs text-red-600">{{ prepaymentErrors.amount[0] }}</p>
                </div>

                <!-- Method -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Metode Pembayaran <span class="text-red-500">*</span></label>
                  <select
                    v-model="prepaymentForm.method"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="transfer">Transfer Bank</option>
                    <option value="cash">Tunai</option>
                    <option value="ewallet">E-Wallet</option>
                    <option value="other">Lainnya</option>
                  </select>
                  <p v-if="prepaymentErrors.method" class="mt-1 text-xs text-red-600">{{ prepaymentErrors.method[0] }}</p>
                </div>

                <!-- Wallet -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Dompet <span class="text-red-500">*</span></label>
                  <select
                    v-model="prepaymentForm.wallet_id"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">Pilih Dompet (Opsional)</option>
                    <option v-for="w in walletOptions" :key="w.id" :value="w.id">
                      {{ w.name }}
                    </option>
                  </select>
                  <p v-if="prepaymentErrors.wallet_id" class="mt-1 text-xs text-red-600">{{ prepaymentErrors.wallet_id[0] }}</p>
                </div>

                <!-- Date -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Tanggal</label>
                  <input
                    v-model="prepaymentForm.date"
                    type="date"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <!-- Note -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan</label>
                  <textarea
                    v-model="prepaymentForm.note"
                    rows="2"
                    placeholder="Catatan pembayaran"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <p v-if="prepaymentErrors.purchase_order_id" class="text-xs text-red-600">{{ prepaymentErrors.purchase_order_id[0] }}</p>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                @click="showPrepaymentModal = false"
              >
                Batal
              </button>
              <button
                :disabled="savingPrepayment"
                class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                @click="handleSavePrepayment"
              >
                {{ savingPrepayment ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
