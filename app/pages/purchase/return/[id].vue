<script setup lang="ts">
import {
  ArrowLeft, Pencil, Trash2, Loader2,
  Package, FileText, Clock, Wallet, CheckCircle, Plus, X,
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

interface ReturnItem {
  id: string
  purchase_return_id: string
  product_id: string
  sku_id: string
  sku: string
  name: string
  variants: Variant[]
  qty: number
  price: number
  discount: number
  total: number
}

interface ReturnLog {
  id: string
  name: string
  action: string
  note: string
  created_at: string
}

interface RefundPayment {
  id: string
  purchase_return_id: string
  wallet_id: string
  no: string
  date: string
  amount: number
  method: string
  note: string
  wallet: WalletRef | null
  created_at: string
}

interface CustomerRef {
  id: string
  name: string
}

interface WarehouseRef {
  id: string
  name: string
}

interface ReceiptItemRef {
  id: string
  sku_id: string
  qty: number
  qty_good: number
  qty_returned: number
  price: number
}

interface ReceiptRef {
  id: string
  no: string
  customer: CustomerRef | null
  warehouse: WarehouseRef | null
  items: ReceiptItemRef[] | null
}

interface PurchaseReturn {
  id: string
  purchase_receipt_id: string
  warehouse_id: string
  customer_id: string
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
  date_paid: string
  purchase_receipt: ReceiptRef | null
  customer: CustomerRef | null
  warehouse: WarehouseRef | null
  items: ReturnItem[] | null
  payments: RefundPayment[] | null
  logs: ReturnLog[] | null
  created_at: string
  updated_at: string
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const router = useRouter()
const route = useRoute()

const returnId = computed(() => route.params.id as string)

const loading = ref(true)
const purchaseReturn = ref<PurchaseReturn | null>(null)

const showLogModal = ref(false)
const showAllItems = ref(false)

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  draft: { label: 'Draft', icon: FileText, color: 'text-yellow-600 bg-yellow-50 ring-yellow-200' },
  completed: { label: 'Selesai', icon: CheckCircle, color: 'text-green-600 bg-green-50 ring-green-200' },
}

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  unpaid: { label: 'Belum Refund', color: 'text-red-600 bg-red-50 ring-red-200' },
  partial: { label: 'Sebagian', color: 'text-orange-600 bg-orange-50 ring-orange-200' },
  paid: { label: 'Lunas', color: 'text-green-600 bg-green-50 ring-green-200' },
}

const visibleItems = computed(() => {
  const all = purchaseReturn.value?.items || []
  return showAllItems.value ? all : all.slice(0, 3)
})

const visibleLogs = computed(() => {
  const all = purchaseReturn.value?.logs || []
  return all.slice(0, 3)
})

function formatLogAction(action: string): string {
  const map: Record<string, string> = {
    purchase_return_created: 'Return Dibuat',
    purchase_return_updated: 'Return Diperbarui',
    purchase_return_status_updated: 'Status Return Diperbarui',
    purchase_return_deleted: 'Return Dihapus',
    payment_created: 'Refund Ditambahkan',
    payment_deleted: 'Refund Dihapus',
  }
  return map[action] || action
}

function calcTotalRefunded(): number {
  return (purchaseReturn.value?.payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
}

function calcRemainingRefund(): number {
  return Math.max(0, Number(purchaseReturn.value?.total || 0) - calcTotalRefunded())
}

async function fetchReturnDetail() {
  loading.value = true
  try {
    const res = await api.get<{ data: PurchaseReturn }>(`/purchase-returns/${returnId.value}`)
    purchaseReturn.value = res.data
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat detail return')
    router.push('/purchase/return')
  }
  finally {
    loading.value = false
  }
}

async function handleDeleteReturn() {
  if (!purchaseReturn.value) return
  const ok = await confirm({
    title: 'Hapus Return Pembelian',
    message: `Hapus retur "${purchaseReturn.value.no}"? Data tidak bisa dikembalikan.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/purchase-returns/${purchaseReturn.value.id}`)
    toast.success('Retur pembelian berhasil dihapus')
    router.push('/purchase/return')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus retur pembelian')
  }
}

// Refund modal
const showRefundModal = ref(false)
const savingRefund = ref(false)
const refundErrors = ref<Record<string, string[]>>({})
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

function openRefundModal() {
  if (!purchaseReturn.value) return
  refundErrors.value = {}
  refundForm.purchase_return_id = purchaseReturn.value.id
  refundForm.wallet_id = ''
  refundForm.date = new Date().toISOString().slice(0, 10)
  refundForm.amount = calcRemainingRefund()
  refundForm.method = 'transfer'
  refundForm.note = ''
  showRefundModal.value = true
}

async function handleCreateRefund() {
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
    await fetchReturnDetail()
  }
  catch (err: any) {
    if (err.errors) refundErrors.value = err.errors
    else toast.error(err.message || 'Gagal menambahkan refund')
  }
  finally {
    savingRefund.value = false
  }
}

async function handleDeleteRefund(payment: RefundPayment) {
  const ok = await confirm({
    title: 'Hapus Refund',
    message: `Hapus refund "${payment.no}" sebesar Rp${formatCurrency(Number(payment.amount))}?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/purchase-returns/payment/${payment.id}`)
    toast.success('Refund berhasil dihapus')
    await fetchReturnDetail()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus refund')
  }
}

onMounted(() => {
  fetchReturnDetail()
  fetchWallets()
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/purchase/return"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <div class="flex-1">
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
          {{ loading ? 'Memuat...' : (purchaseReturn?.no || 'Detail Retur') }}
        </h1>
        <p v-if="purchaseReturn?.customer" class="text-sm text-gray-500">{{ purchaseReturn.customer.name }}</p>
      </div>

      <template v-if="purchaseReturn">
        <button
          v-if="purchaseReturn.payment_status !== 'paid'"
          class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
          @click="openRefundModal"
        >
          <Plus class="h-4 w-4" />
          Refund
        </button>
        <NuxtLink
          v-if="purchaseReturn.payment_status === 'unpaid'"
          :to="`/purchase/return/create?edit=${purchaseReturn.id}`"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Pencil class="h-4 w-4" />
          Edit
        </NuxtLink>
        <button
          v-if="purchaseReturn.payment_status === 'unpaid'"
          class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          @click="handleDeleteReturn"
        >
          <Trash2 class="h-4 w-4" />
          Hapus
        </button>
      </template>
    </div>

    <div v-if="loading" class="grid gap-5 lg:grid-cols-4">
      <div class="lg:col-span-1 space-y-4">
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-3 w-20 animate-pulse rounded bg-gray-200" />
          <div class="mt-3 h-7 w-28 animate-pulse rounded-full bg-gray-200" />
        </div>
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-3 w-24 animate-pulse rounded bg-gray-200" />
          <div class="mt-3 h-7 w-24 animate-pulse rounded-full bg-gray-200" />
        </div>
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-24 animate-pulse rounded bg-gray-200" />
          <div class="mt-4 space-y-4">
            <div v-for="i in 6" :key="i">
              <div class="h-3 w-16 animate-pulse rounded bg-gray-100" />
              <div class="mt-1.5 h-4 animate-pulse rounded bg-gray-200" :class="i % 2 === 0 ? 'w-28' : 'w-36'" />
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-3 space-y-4">
        <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div class="border-b border-gray-100 px-5 py-4">
            <div class="h-4 w-28 animate-pulse rounded bg-gray-200" />
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50">
                  <th class="px-4 py-2.5 text-left"><div class="h-3 w-12 animate-pulse rounded bg-gray-200" /></th>
                  <th class="px-4 py-2.5 text-right"><div class="ml-auto h-3 w-8 animate-pulse rounded bg-gray-200" /></th>
                  <th class="px-4 py-2.5 text-right"><div class="ml-auto h-3 w-10 animate-pulse rounded bg-gray-200" /></th>
                  <th class="px-4 py-2.5 text-right"><div class="ml-auto h-3 w-10 animate-pulse rounded bg-gray-200" /></th>
                  <th class="px-4 py-2.5 text-right"><div class="ml-auto h-3 w-10 animate-pulse rounded bg-gray-200" /></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="i in 3" :key="i" class="border-b border-gray-100">
                  <td class="px-4 py-3">
                    <div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
                    <div class="mt-1 h-3 w-16 animate-pulse rounded bg-gray-100" />
                  </td>
                  <td class="px-4 py-3"><div class="ml-auto h-4 w-8 animate-pulse rounded bg-gray-200" /></td>
                  <td class="px-4 py-3"><div class="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200" /></td>
                  <td class="px-4 py-3"><div class="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200" /></td>
                  <td class="px-4 py-3"><div class="ml-auto h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="ml-auto max-w-sm rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-20 animate-pulse rounded bg-gray-200" />
          <div class="mt-3 space-y-2.5">
            <div v-for="i in 4" :key="i" class="flex justify-between">
              <div class="h-3.5 w-16 animate-pulse rounded bg-gray-100" />
              <div class="h-3.5 w-24 animate-pulse rounded bg-gray-200" />
            </div>
            <div class="border-t border-gray-200 pt-2 flex justify-between">
              <div class="h-4 w-12 animate-pulse rounded bg-gray-200" />
              <div class="h-4 w-28 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <template v-else-if="purchaseReturn">
      <div class="grid gap-5 lg:grid-cols-4">
        <div class="lg:col-span-1 space-y-4">
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p class="mb-2 text-xs font-medium uppercase text-gray-400">Status Retur</p>
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ring-1"
              :class="statusConfig[purchaseReturn.status]?.color || 'bg-gray-50 text-gray-600 ring-gray-200'"
            >
              <component :is="statusConfig[purchaseReturn.status]?.icon || FileText" class="h-4 w-4" />
              {{ statusConfig[purchaseReturn.status]?.label || purchaseReturn.status }}
            </span>
          </div>

          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p class="mb-2 text-xs font-medium uppercase text-gray-400">Pembayaran</p>
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ring-1"
              :class="paymentStatusConfig[purchaseReturn.payment_status]?.color || 'bg-gray-50 text-gray-600 ring-gray-200'"
            >
              <Wallet class="h-4 w-4" />
              {{ paymentStatusConfig[purchaseReturn.payment_status]?.label || purchaseReturn.payment_status }}
            </span>
          </div>

          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-3 text-sm font-semibold text-gray-900">Informasi Retur</h2>
            <div class="space-y-3">
              <div>
                <p class="text-xs text-gray-400">No. Retur</p>
                <p class="text-sm font-medium text-gray-900">{{ purchaseReturn.no }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">No. GRN</p>
                <NuxtLink
                  v-if="purchaseReturn.purchase_receipt?.id"
                  :to="`/purchase/receipt/${purchaseReturn.purchase_receipt.id}`"
                  class="text-sm font-medium text-primary-600 hover:underline"
                >
                  {{ purchaseReturn.purchase_receipt.no }}
                </NuxtLink>
                <p v-else class="text-sm font-medium text-gray-900">-</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Supplier</p>
                <p class="text-sm font-medium text-gray-900">{{ purchaseReturn.customer?.name || '-' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Gudang</p>
                <p class="text-sm font-medium text-gray-900">{{ purchaseReturn.warehouse?.name || '-' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Tanggal Retur</p>
                <p class="text-sm font-medium text-gray-900">{{ formatDate(purchaseReturn.date_created) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Tanggal Lunas</p>
                <p class="text-sm font-medium text-gray-900">{{ formatDate(purchaseReturn.date_paid) }}</p>
              </div>
              <div v-if="purchaseReturn.external_id">
                <p class="text-xs text-gray-400">External ID</p>
                <p class="text-sm font-medium text-gray-900">{{ purchaseReturn.external_id }}</p>
              </div>
              <div v-if="purchaseReturn.note">
                <p class="text-xs text-gray-400">Catatan</p>
                <p class="text-sm text-gray-700">{{ purchaseReturn.note }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-3 space-y-4">
          <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="border-b border-gray-100 px-5 py-4">
              <h2 class="text-sm font-semibold text-gray-900">Item Retur ({{ purchaseReturn.items?.length || 0 }})</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th class="px-4 py-2.5 text-left">Produk</th>
                    <th class="px-4 py-2.5 text-right">Qty</th>
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
                    <td class="px-4 py-3 text-right">{{ item.qty }}</td>
                    <td class="px-4 py-3 text-right whitespace-nowrap">Rp{{ formatCurrency(item.price) }}</td>
                    <td class="px-4 py-3 text-right whitespace-nowrap">{{ item.discount ? `Rp${formatCurrency(item.discount)}` : '-' }}</td>
                    <td class="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">Rp{{ formatCurrency(item.total) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="!purchaseReturn.items?.length" class="px-4 py-8 text-center text-sm text-gray-400">
              Tidak ada item
            </div>
            <div v-if="(purchaseReturn.items?.length || 0) > 3" class="border-t border-gray-100 px-4 py-2.5 text-center">
              <button
                class="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                @click="showAllItems = !showAllItems"
              >
                {{ showAllItems ? 'Sembunyikan' : `Lihat selengkapnya (${(purchaseReturn.items?.length || 0) - 3} item lagi)` }}
              </button>
            </div>
          </div>

          <div class="ml-auto max-w-sm rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-3 text-sm font-semibold text-gray-900">Ringkasan</h2>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Subtotal</span>
                <span class="text-gray-900">Rp{{ formatCurrency(Number(purchaseReturn.subtotal)) }}</span>
              </div>
              <div v-if="Number(purchaseReturn.discount)" class="flex justify-between">
                <span class="text-gray-500">Diskon</span>
                <span class="text-red-600">-Rp{{ formatCurrency(Number(purchaseReturn.discount)) }}</span>
              </div>
              <div v-if="Number(purchaseReturn.shipping_fee)" class="flex justify-between">
                <span class="text-gray-500">Ongkir</span>
                <span class="text-gray-900">+Rp{{ formatCurrency(Number(purchaseReturn.shipping_fee)) }}</span>
              </div>
              <div v-if="Number(purchaseReturn.tax)" class="flex justify-between">
                <span class="text-gray-500">Pajak</span>
                <span class="text-gray-900">+Rp{{ formatCurrency(Number(purchaseReturn.tax)) }}</span>
              </div>
              <div v-if="Number(purchaseReturn.adjustment)" class="flex justify-between">
                <span class="text-gray-500">Penyesuaian</span>
                <span class="text-gray-900">{{ Number(purchaseReturn.adjustment) >= 0 ? '+' : '' }}Rp{{ formatCurrency(Number(purchaseReturn.adjustment)) }}</span>
              </div>
              <div class="border-t border-gray-200 pt-2 flex justify-between">
                <span class="font-semibold text-gray-900">Total</span>
                <span class="font-bold text-gray-900">Rp{{ formatCurrency(Number(purchaseReturn.total)) }}</span>
              </div>
              <div class="border-t border-gray-200 pt-2 flex justify-between">
                <span class="text-gray-500">Total Refund</span>
                <span class="font-medium text-gray-900">Rp{{ formatCurrency(calcTotalRefunded()) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Sisa</span>
                <span class="font-medium" :class="calcRemainingRefund() <= 0 ? 'text-green-600' : 'text-red-600'">
                  Rp{{ formatCurrency(calcRemainingRefund()) }}
                </span>
              </div>
            </div>
          </div>

          <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 class="text-sm font-semibold text-gray-900">Refund ({{ purchaseReturn.payments?.length || 0 }})</h2>
              <button
                v-if="purchaseReturn.payment_status !== 'paid'"
                class="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                @click="openRefundModal"
              >
                <Plus class="h-3.5 w-3.5" />
                Tambah Refund
              </button>
            </div>

            <div v-if="purchaseReturn.payments?.length" class="divide-y divide-gray-100">
              <div v-for="pay in purchaseReturn.payments" :key="pay.id" class="flex items-center gap-4 px-5 py-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <Wallet class="h-5 w-5 text-emerald-600" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-medium text-gray-900">{{ pay.no }}</p>
                    <span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{{ pay.method }}</span>
                  </div>
                  <p class="text-xs text-gray-500">
                    {{ formatDate(pay.date) }}
                    <span v-if="pay.wallet"> &middot; {{ pay.wallet.name }}</span>
                  </p>
                  <p v-if="pay.note" class="text-xs text-gray-400">{{ pay.note }}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-semibold text-emerald-600">Rp{{ formatCurrency(Number(pay.amount)) }}</p>
                </div>
                <button
                  v-if="purchaseReturn.payment_status !== 'paid'"
                  class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  title="Hapus"
                  @click="handleDeleteRefund(pay)"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </div>
            <div v-else class="px-4 py-8 text-center text-sm text-gray-400">
              Belum ada refund
            </div>
          </div>

          <div v-if="purchaseReturn.logs?.length" class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h2 class="text-sm font-semibold text-gray-900">Riwayat Aktivitas ({{ purchaseReturn.logs.length }})</h2>
            </div>
            <div class="divide-y divide-gray-100">
              <div v-for="log in visibleLogs" :key="log.id" class="flex items-start gap-2.5 px-4 py-2.5">
                <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Clock class="h-3 w-3 text-gray-500" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs text-gray-900">
                    <span class="font-medium">{{ log.name || 'System' }}</span>
                    <span class="text-gray-500"> — {{ formatLogAction(log.action) }}</span>
                  </p>
                  <p v-if="log.note" class="text-xs text-gray-500">{{ log.note }}</p>
                  <p class="text-xs text-gray-400">{{ formatDateTime(log.created_at) }}</p>
                </div>
              </div>
            </div>
            <div v-if="purchaseReturn.logs.length > 3" class="border-t border-gray-100 px-4 py-2.5 text-center">
              <button class="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700" @click="showLogModal = true">
                Lihat selengkapnya ({{ purchaseReturn.logs.length - 3 }} lagi)
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

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
              <h2 class="text-lg font-semibold text-gray-900">Riwayat Aktivitas ({{ purchaseReturn?.logs?.length || 0 }})</h2>
              <button class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="showLogModal = false">
                <X class="h-5 w-5" />
              </button>
            </div>
            <div class="flex-1 overflow-y-auto divide-y divide-gray-100">
              <div v-for="log in purchaseReturn?.logs" :key="log.id" class="flex items-start gap-3 px-6 py-3">
                <div class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Clock class="h-3.5 w-3.5 text-gray-500" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-gray-900">
                    <span class="font-medium">{{ log.name || 'System' }}</span>
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
              <p class="text-sm text-gray-500">{{ purchaseReturn?.no }}</p>
            </div>

            <div class="flex-1 overflow-y-auto px-6 py-5">
              <div class="space-y-4">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Jumlah Refund <span class="text-red-500">*</span></label>
                  <input v-model.number="refundForm.amount" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900" />
                  <p v-if="refundErrors.amount" class="mt-1 text-xs text-red-600">{{ refundErrors.amount[0] }}</p>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Metode <span class="text-red-500">*</span></label>
                  <select v-model="refundForm.method" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900">
                    <option value="transfer">Transfer</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Tunai</option>
                    <option value="ewallet">E-Wallet</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Dompet <span class="text-red-500">*</span></label>
                  <select v-model="refundForm.wallet_id" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900">
                    <option value="">Pilih Dompet</option>
                    <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
                  </select>
                  <p v-if="refundErrors.wallet_id" class="mt-1 text-xs text-red-600">{{ refundErrors.wallet_id[0] }}</p>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Tanggal</label>
                  <input v-model="refundForm.date" type="date" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan</label>
                  <textarea v-model="refundForm.note" rows="2" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900" />
                </div>
              </div>
            </div>

            <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100" @click="showRefundModal = false">Batal</button>
              <button :disabled="savingRefund" class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60" @click="handleCreateRefund">
                {{ savingRefund ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
