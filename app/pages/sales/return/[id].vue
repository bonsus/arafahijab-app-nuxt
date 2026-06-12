<script setup lang="ts">
import {
  ArrowLeft, Pencil, Loader2, FileText, CheckCircle, Wallet,
  User, Truck, ShoppingCart, Store, RotateCcw, Clock, Ban, Plus,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface VariantPair { name: string; value: string }

interface ReturnLog {
  id: string
  user_id: string
  name: string
  action: string
  note: string
  created_at: string
}

interface ReturnPayment {
  id: string
  wallet_id: string
  date: string
  amount: string
  method: string
  note: string
  created_at: string
}

interface WalletRef { id: string; name: string; balance: string; status: string }

interface ReturnItem {
  id: string
  order_item_id: string
  category_id: string
  category_name: string
  product_id: string
  sku_id: string
  sku: string
  name: string
  variants: VariantPair[] | null
  weight: number
  qty: number
  price: string
  discount: string
  total: string
}

interface OrderReturn {
  id: string
  order_id: string
  no: string
  date: string
  qty: number
  weight: number
  subtotal: string
  discount: string
  shipping_cost: string
  shipping_discount: string
  shipping_total: string
  adjustment: string
  tax: string
  total: string
  status: string
  payment_status: string
  external_id: string
  note: string
  created_at: string
  updated_at: string
  items: ReturnItem[] | null
  shipment: {
    courier_code?: string
    courier_name?: string
    service_code?: string
    service_name?: string
    tracking_no?: string
    note?: string
  } | null
  customer: { id: string; name: string; phone: string } | null
  order: { id: string; no: string; date_created: string } | null
  store: { id: string; name: string; source: string } | null
  staff: { id: string; name: string } | null
  logs: ReturnLog[] | null
}

const api = useApi()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const returnId = computed(() => route.params.id as string)

const loading = ref(true)
const orderReturn = ref<OrderReturn | null>(null)
const showAllItems = ref(false)
const showAllLogs = ref(false)

// Payments
const loadingPayments = ref(false)
const payments = ref<ReturnPayment[]>([])
const totalRefunded = computed(() => payments.value.reduce((s, p) => s + Number(p.amount), 0))
const remainingPayment = computed(() => Math.max(0, Number(orderReturn.value?.total ?? 0) - totalRefunded.value))

async function fetchPayments() {
  loadingPayments.value = true
  try {
    const res = await api.get<{ data: ReturnPayment[] }>(`/sales/order-returns/${returnId.value}/payments`)
    payments.value = res.data || []
  }
  catch { payments.value = [] }
  finally { loadingPayments.value = false }
}

// Refund modal
const wallets = ref<WalletRef[]>([])
const showRefundModal = ref(false)
const savingRefund = ref(false)
const refundErrors = ref<Record<string, string[]>>({})
const refundForm = reactive({
  wallet_id: '',
  amount: 0,
  method: 'transfer',
  date: '',
  note: '',
})

async function fetchWallets() {
  try {
    const res = await api.get<{ data: WalletRef[] }>('/wallets/index')
    wallets.value = (res.data || []).filter((w: any) => w.status === 'active')
  }
  catch { wallets.value = [] }
}

function openRefundModal() {
  refundErrors.value = {}
  refundForm.wallet_id = ''
  refundForm.date = new Date().toISOString().slice(0, 10)
  refundForm.method = 'transfer'
  refundForm.note = ''
  refundForm.amount = remainingPayment.value
  showRefundModal.value = true
  if (!wallets.value.length) fetchWallets()
}

async function handleCreateRefund() {
  savingRefund.value = true
  refundErrors.value = {}
  try {
    await api.post(`/sales/order-returns/${returnId.value}/payments/create`, {
      wallet_id: refundForm.wallet_id,
      amount: String(refundForm.amount),
      method: refundForm.method,
      date: refundForm.date,
      note: refundForm.note,
    })
    toast.success('Refund berhasil dicatat')
    showRefundModal.value = false
    await fetchPayments()
    await fetchDetail()
  }
  catch (err: any) {
    if (err.errors && Object.keys(err.errors).length) refundErrors.value = err.errors
    if (err.message) toast.error(err.message)
    else if (!err.errors || !Object.keys(err.errors).length) toast.error('Gagal mencatat refund')
  }
  finally {
    savingRefund.value = false
  }
}

function formatLogAction(action: string): string {
  const map: Record<string, string> = {
    order_return_created: 'Retur Dibuat',
    order_return_updated: 'Retur Diperbarui',
    order_return_completed: 'Retur Diselesaikan',
    order_return_canceled: 'Retur Dibatalkan',
    order_return_payment_updated: 'Pembayaran Diperbarui',
  }
  return map[action] || action
}

const visibleLogs = computed(() => {
  const all = orderReturn.value?.logs || []
  return showAllLogs.value ? all : all.slice(0, 3)
})

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  draft: { label: 'Draft', icon: FileText, color: 'text-yellow-600 bg-yellow-50 ring-yellow-200' },
  completed: { label: 'Selesai', icon: CheckCircle, color: 'text-green-600 bg-green-50 ring-green-200' },
  canceled: { label: 'Dibatalkan', icon: Ban, color: 'text-red-600 bg-red-50 ring-red-200' },
}

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  unpaid: { label: 'Belum Refund', color: 'text-red-600 bg-red-50 ring-red-200' },
  partial: { label: 'Sebagian', color: 'text-orange-600 bg-orange-50 ring-orange-200' },
  paid: { label: 'Lunas', color: 'text-green-600 bg-green-50 ring-green-200' },
  refunded: { label: 'Refund', color: 'text-green-600 bg-green-50 ring-green-200' },
}

const visibleItems = computed(() => {
  const all = orderReturn.value?.items || []
  return showAllItems.value ? all : all.slice(0, 5)
})

async function fetchDetail() {
  loading.value = true
  try {
    const res = await api.get<{ data: OrderReturn }>(`/sales/order-returns/${returnId.value}`)
    orderReturn.value = res.data
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat detail retur')
    router.push('/sales/return')
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDetail()
  fetchPayments()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-wrap items-center gap-3">
      <NuxtLink
        :to="'/sales/return'"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        title="Kembali ke daftar retur penjualan"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <div class="mr-auto">
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">{{ orderReturn?.no || 'Detail Retur' }}</h1>
        <p v-if="orderReturn?.customer" class="text-sm text-gray-500">{{ orderReturn.customer.name }}</p>
      </div>

      <NuxtLink
        v-if="orderReturn && orderReturn.status === 'draft'"
        :to="`/sales/return/create?edit=${orderReturn.id}`"
        class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <Pencil class="h-4 w-4" />
        Edit
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid gap-5 lg:grid-cols-4">
      <div class="space-y-4 lg:col-span-1">
        <div v-for="i in 3" :key="i" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-3 w-20 animate-pulse rounded bg-gray-200" />
          <div class="mt-3 h-7 w-28 animate-pulse rounded-full bg-gray-200" />
        </div>
      </div>
      <div class="space-y-4 lg:col-span-3">
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-28 animate-pulse rounded bg-gray-200" />
          <div class="mt-4 space-y-3">
            <div v-for="i in 3" :key="i" class="h-10 w-full animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="orderReturn">
      <div class="grid gap-5 lg:grid-cols-4">
        <!-- LEFT -->
        <div class="space-y-4 lg:col-span-1">
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p class="mb-2 text-xs font-medium uppercase text-gray-400">Status Retur</p>
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1"
              :class="statusConfig[orderReturn.status]?.color || 'bg-gray-50 text-gray-600 ring-gray-200'"
            >
              <component :is="statusConfig[orderReturn.status]?.icon || FileText" class="h-4 w-4" />
              {{ statusConfig[orderReturn.status]?.label || orderReturn.status }}
            </span> 

            <p class="mb-2 mt-3 text-xs font-medium uppercase text-gray-400">Pembayaran</p>
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1"
              :class="paymentStatusConfig[orderReturn.payment_status]?.color || 'bg-gray-50 text-gray-600 ring-gray-200'"
            >
              <Wallet class="h-4 w-4" />
              {{ paymentStatusConfig[orderReturn.payment_status]?.label || orderReturn.payment_status }}
            </span>
          </div>

          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-3 text-sm font-semibold text-gray-900">Informasi Retur</h2>
            <div class="space-y-3">
              <!-- store -->
              <div>
                <p class="text-xs text-gray-400">Toko</p>
                <p class="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                  <img v-if="orderReturn.store?.source" :src="'/images/platform/' + orderReturn.store.source + '.svg'" alt="" class="h-4 w-4 object-contain" />
                  {{ orderReturn.store?.name || '-' }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-400">No. Retur</p>
                <p class="text-sm font-medium text-gray-900">{{ orderReturn.no }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">No. Order</p>
                <NuxtLink
                  v-if="orderReturn.order?.id"
                  :to="`/sales/order/${orderReturn.order.id}`"
                  class="text-sm font-medium text-primary-600 hover:underline"
                >
                  {{ orderReturn.order.no }}
                </NuxtLink>
                <p v-else class="text-sm font-medium text-gray-900">-</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Pelanggan</p>
                <p class="text-sm font-medium text-gray-900">{{ orderReturn.customer?.name || '-' }}</p> 
                <p class="text-xs text-gray-500">{{ orderReturn.customer?.phone || '-' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Tanggal Retur</p>
                <p class="text-sm font-medium text-gray-900">{{ formatDate(orderReturn.date) }}</p>
              </div>
              <div v-if="orderReturn.external_id">
                <p class="text-xs text-gray-400">External ID</p>
                <p class="text-sm font-medium text-gray-900">{{ orderReturn.external_id }}</p>
              </div>
              <div v-if="orderReturn.note">
                <p class="text-xs text-gray-400">Catatan</p>
                <p class="text-sm text-gray-700">{{ orderReturn.note }}</p>
              </div> 
              <div>
                <p class="text-xs text-gray-400">Pengiriman</p>
                <p v-if="orderReturn.shipment?.courier_name" class="text-sm font-medium text-gray-900">
                  {{ orderReturn.shipment.courier_name }}
                  <span v-if="orderReturn.shipment.service_name" class="font-normal text-gray-500"> · {{ orderReturn.shipment.service_name }}</span>
                </p>
                <p v-else class="text-sm font-medium text-gray-900">-</p>
                <p v-if="orderReturn.shipment?.tracking_no" class="text-xs text-gray-500">
                  Resi: <span class="font-mono">{{ orderReturn.shipment.tracking_no }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT -->
        <div class="space-y-4 lg:col-span-3">
          <!-- Items -->
          <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="border-b border-gray-100 px-5 py-4">
              <h2 class="text-sm font-semibold text-gray-900">Item Retur ({{ orderReturn.items?.length || 0 }})</h2>
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
                      <p class="line-clamp-2 font-medium text-gray-900">{{ item.name }}</p>
                      <div class="flex flex-wrap items-center gap-1.5 text-xs">
                        <span class="text-gray-500">{{ item.sku }}</span>
                        <span v-for="v in (item.variants || [])" :key="v.name" class="rounded bg-gray-100 px-1 py-0.5">
                          {{ v.value }}
                        </span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-right">{{ item.qty }}</td>
                    <td class="whitespace-nowrap px-4 py-3 text-right">Rp{{ formatCurrency(item.price) }}</td>
                    <td class="whitespace-nowrap px-4 py-3 text-right">{{ Number(item.discount) ? `Rp${formatCurrency(item.discount)}` : '-' }}</td>
                    <td class="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900">Rp{{ formatCurrency(item.total) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="!orderReturn.items?.length" class="px-4 py-8 text-center text-sm text-gray-400">
              <RotateCcw class="mx-auto mb-2 h-8 w-8 text-gray-300" />
              Tidak ada item
            </div>
            <div v-if="(orderReturn.items?.length || 0) > 5" class="border-t border-gray-100 px-4 py-2.5 text-center">
              <button
                class="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                @click="showAllItems = !showAllItems"
              >
                {{ showAllItems ? 'Sembunyikan' : `Lihat selengkapnya (${(orderReturn.items?.length || 0) - 5} item lagi)` }}
              </button>
            </div>
          </div>

          <!-- Summary -->
          <div class="ml-auto max-w-sm rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-3 text-sm font-semibold text-gray-900">Ringkasan</h2>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Subtotal ({{ orderReturn.qty }} qty)</span>
                <span class="text-gray-900">Rp{{ formatCurrency(orderReturn.subtotal) }}</span>
              </div>
              <div v-if="Number(orderReturn.discount)" class="flex justify-between">
                <span class="text-gray-500">Diskon</span>
                <span class="text-red-600">-Rp{{ formatCurrency(orderReturn.discount) }}</span>
              </div>
              <div v-if="Number(orderReturn.shipping_total)" class="flex justify-between">
                <span class="text-gray-500">Ongkir Retur</span>
                <span class="text-gray-900">+Rp{{ formatCurrency(orderReturn.shipping_total) }}</span>
              </div>
              <div v-if="Number(orderReturn.tax)" class="flex justify-between">
                <span class="text-gray-500">Pajak</span>
                <span class="text-gray-900">+Rp{{ formatCurrency(orderReturn.tax) }}</span>
              </div>
              <div v-if="Number(orderReturn.adjustment)" class="flex justify-between">
                <span class="text-gray-500">Penyesuaian</span>
                <span class="text-gray-900">{{ Number(orderReturn.adjustment) >= 0 ? '+' : '' }}Rp{{ formatCurrency(orderReturn.adjustment) }}</span>
              </div>
              <div class="flex justify-between border-t border-gray-200 pt-2">
                <span class="font-semibold text-gray-900">Total</span>
                <span class="font-bold text-gray-900">Rp{{ formatCurrency(orderReturn.total) }}</span>
              </div>
            </div>
          </div>


          <!-- Payments / Refund -->
          <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h2 class="text-sm font-semibold text-gray-900">Pembayaran / Refund</h2>
              <button
                v-if="orderReturn.status !== 'canceled' && orderReturn.payment_status !== 'paid'"
                class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                @click="openRefundModal"
              >
                <Plus class="h-3.5 w-3.5" />
                Tambah Refund
              </button>
            </div>
            <!-- Summary row -->
            <div class="grid grid-cols-3 gap-3 border-b border-gray-100 px-4 py-3">
              <div class="rounded-lg bg-gray-50 p-3 text-center ring-1 ring-gray-100">
                <p class="text-xs text-gray-400">Total</p>
                <p class="mt-1 text-sm font-bold text-gray-900">Rp{{ formatCurrency(orderReturn.total) }}</p>
              </div>
              <div class="rounded-lg bg-emerald-50 p-3 text-center ring-1 ring-emerald-100">
                <p class="text-xs text-emerald-500">Direfund</p>
                <p class="mt-1 text-sm font-bold text-emerald-700">Rp{{ formatCurrency(totalRefunded) }}</p>
              </div>
              <div class="rounded-lg bg-red-50 p-3 text-center ring-1 ring-red-100">
                <p class="text-xs text-red-500">Sisa</p>
                <p class="mt-1 text-sm font-bold text-red-700">Rp{{ formatCurrency(remainingPayment) }}</p>
              </div>
            </div>
            <!-- List -->
            <div v-if="loadingPayments" class="flex justify-center py-6">
              <Loader2 class="h-5 w-5 animate-spin text-gray-400" />
            </div>
            <div v-else-if="!payments.length" class="px-4 py-6 text-center text-sm text-gray-400">
              Belum ada catatan refund
            </div>
            <div v-else class="divide-y divide-gray-100">
              <div v-for="p in payments" :key="p.id" class="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p class="font-medium text-gray-900">Rp{{ formatCurrency(p.amount) }}</p>
                  <p class="text-xs capitalize text-gray-500">{{ p.method }} · {{ formatDate(p.date) }}</p>
                  <p v-if="p.note" class="text-xs text-gray-400">{{ p.note }}</p>
                </div>
                <span class="text-xs text-gray-400">{{ formatDateTime(p.created_at) }}</span>
              </div>
            </div>
          </div>

          <!-- Stock Movements -->
          <AppStockMovements :reference-id="orderReturn.id" />

          <!-- Activity Log -->
          <div v-if="orderReturn.logs?.length" class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h2 class="text-sm font-semibold text-gray-900">Riwayat Aktivitas ({{ orderReturn.logs.length }})</h2>
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
            <div v-if="orderReturn.logs.length > 3" class="border-t border-gray-100 px-4 py-2.5 text-center">
              <button
                class="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                @click="showAllLogs = !showAllLogs"
              >
                {{ showAllLogs ? 'Sembunyikan' : `Lihat selengkapnya (${orderReturn.logs.length - 3} lagi)` }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- Refund Modal -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showRefundModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="showRefundModal = false">
        <div class="flex w-full max-w-md flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
          <div class="shrink-0 border-b border-gray-100 px-6 py-4">
            <h2 class="text-lg font-semibold text-gray-900">Tambah Refund</h2>
            <p class="text-sm text-gray-500">{{ orderReturn?.no }}</p>
          </div>
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <div class="space-y-4">
              <div class="grid grid-cols-3 gap-3">
                <div class="rounded-lg bg-gray-50 p-3 text-center ring-1 ring-gray-100">
                  <p class="text-xs text-gray-400">Total</p>
                  <p class="mt-1 text-sm font-bold text-gray-900">Rp{{ formatCurrency(orderReturn?.total ?? 0) }}</p>
                </div>
                <div class="rounded-lg bg-emerald-50 p-3 text-center ring-1 ring-emerald-100">
                  <p class="text-xs text-emerald-500">Direfund</p>
                  <p class="mt-1 text-sm font-bold text-emerald-700">Rp{{ formatCurrency(totalRefunded) }}</p>
                </div>
                <div class="rounded-lg bg-red-50 p-3 text-center ring-1 ring-red-100">
                  <p class="text-xs text-red-500">Sisa</p>
                  <p class="mt-1 text-sm font-bold text-red-700">Rp{{ formatCurrency(remainingPayment) }}</p>
                </div>
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Jumlah Refund <span class="text-red-500">*</span></label>
                <input v-model.number="refundForm.amount" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                <p v-if="refundErrors.amount" class="mt-1 text-xs text-red-600">{{ refundErrors.amount[0] }}</p>
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Metode <span class="text-red-500">*</span></label>
                <select v-model="refundForm.method" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
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
                <select v-model="refundForm.wallet_id" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                  <option value="">Pilih Dompet</option>
                  <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
                </select>
                <p v-if="refundErrors.wallet_id" class="mt-1 text-xs text-red-600">{{ refundErrors.wallet_id[0] }}</p>
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Tanggal</label>
                <input v-model="refundForm.date" type="date" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan</label>
                <textarea v-model="refundForm.note" rows="2" placeholder="Catatan refund" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
              </div>
            </div>
          </div>
          <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100" @click="showRefundModal = false">Batal</button>
            <button
              :disabled="savingRefund"
              class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
              @click="handleCreateRefund"
            >
              <Loader2 v-if="savingRefund" class="h-4 w-4 animate-spin" />
              Simpan Refund
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
