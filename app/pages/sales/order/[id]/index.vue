<script setup lang="ts">
import {
  ArrowLeft, Pencil, Trash2,
  ShoppingCart, MapPin, Truck, Package,
  ChevronDown, UserCircle, FileText, Clock,
  CheckCircle, XCircle, AlertCircle, CreditCard,
  Printer, Building2, User, RotateCcw, Hash, Weight, Box,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Variant { name: string; value: string }

interface OrderItem {
  id: string
  product_id: string
  sku_id: string
  category_name: string
  name: string
  sku: string
  variants: Variant[]
  weight: number
  qty: number
  qty_returned: number
  price: string
  discount: string
  total: string
  cogs: string
  cogs_total: string
  is_free: string
  image: string
}

interface OrderAddress {
  id: string
  name: string
  phone: string
  address: string
  country: string
  province: string
  city: string
  district: string
  zipcode: string
}

interface OrderShipment {
  id: string
  courier_code: string
  courier_name: string
  service_name: string
  service_code: string
  tracking_no: string
  note: string
  price: string
  discount: string
  total: string
  aggregator: string
  aggregator_status: boolean
  package_id: string
}

interface OrderDropship {
  id: string
  business_id: string
  order_id: string
  name: string
  phone: string
  type: string
  source: string
  file: string
}

interface OrderLog {
  id: string
  user_id: string
  name: string
  action: string
  note: string
  created_at: string
}

interface OrderPayment {
  id: string
  no: string
  date: string
  amount: string
  provider: string
  method: string
  file: string
  note: string
  status: string
  bank_type: string
  bank_name: string
  account_number: string
  account_name: string
  wallet: { id: string; name: string } | null
}

interface OrderReturnItem {
  id: string
  order_return_id: string
  order_item_id: string
  category_name: string
  product_id: string
  sku_id: string
  sku: string
  name: string
  variants: Variant[]
  weight: number
  qty: number
  price: string
  discount: string
  total: string
  cogs: string
  cogs_total: string
}

interface OrderReturn {
  id: string
  no: string
  date: string
  qty: number
  subtotal: string
  discount: string
  shipping_cost: string
  shipping_discount: string
  shipping_total: string
  cod_cost: string
  total: string
  cogs_total: string
  payment_total: string
  status: string
  payment_status: string
  note: string
  items: OrderReturnItem[]
}

interface SalesOrder {
  id: string
  no: string
  date_created: string
  date_due: string
  date_processed: string
  date_packing: string
  date_ready: string  
  date_shipped: string
  date_delivered: string
  date_completed: string
  date_canceled: string
  date_paid: string
  external_id: string
  qty: number
  qty_returned: number
  weight: number
  subtotal: string
  discount: string
  shipping_cost: string
  shipping_discount: string
  shipping_total: string
  cod_cost: string
  unique_code: string
  adjustment: string
  tax: string
  total: string
  admin_fee: string
  affiliate_fee: string
  commission_fee: string
  shipping_fee: string
  shipping_return_fee: string
  cod_fee: string
  others_fee: string
  grand_total: string
  payment_total: string
  cogs_total: string
  status: string
  sub_status: string
  payment_status: string
  payment_provider: string
  payment_method: string
  cod: string
  preorder: string
  source: string
  note: string
  customer_note: string
  tags: string[]
  items: OrderItem[]
  address: OrderAddress | null
  shipment: OrderShipment | null
  dropship: OrderDropship | null
  logs: OrderLog[]
  payments: OrderPayment[]
  store: { id: string; name: string; source: string; shop_name: string } | null
  warehouse: { id: string; name: string } | null
  customer: { id: string; name: string; phone: string } | null
  customer_category: { id: string; name: string } | null
  staff: { id: string; name: string; code: string } | null
  returns: OrderReturn[]
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const router = useRouter()
const route = useRoute()

const orderId = computed(() => route.params.id as string)

const loading = ref(true)
const order = ref<SalesOrder | null>(null)
const showAllItems = ref(false)
const showAllLogs = ref(false)

// Modals
const showShipmentModal = ref(false)
const showAddressModal = ref(false)
const showDetailModal = ref(false)
const showStatusModal = ref(false)
const showPaymentModal = ref(false)
const showPrintLabelModal = ref(false)
const showPrintInvoiceModal = ref(false)

function closeModals() {
  showShipmentModal.value = false
  showAddressModal.value = false
  showDetailModal.value = false
  showStatusModal.value = false
  showPaymentModal.value = false
  showPrintLabelModal.value = false
  showPrintInvoiceModal.value = false
}

async function onModalSuccess() {
  await fetchOrder()
  closeModals()
}

const statusConfig: Record<string, { label: string; icon: any; cls: string }> = {
  pending: { label: 'Pending', icon: Clock, cls: 'text-yellow-700 bg-yellow-50 ring-yellow-200' },
  processing: { label: 'Diproses', icon: AlertCircle, cls: 'text-blue-700 bg-blue-50 ring-blue-200' },
  shipped: { label: 'Dikirim', icon: Truck, cls: 'text-purple-700 bg-purple-50 ring-purple-200' },
  delivered: { label: 'Diterima', icon: CheckCircle, cls: 'text-teal-700 bg-teal-50 ring-teal-200' },
  completed: { label: 'Selesai', icon: CheckCircle, cls: 'text-green-700 bg-green-50 ring-green-200' },
  cancelled: { label: 'Dibatalkan', icon: XCircle, cls: 'text-red-700 bg-red-50 ring-red-200' },
}

const paymentStatusConfig: Record<string, { label: string; cls: string }> = {
  unpaid: { label: 'Belum Bayar', cls: 'text-red-700 bg-red-50 ring-red-200' },
  paid: { label: 'Lunas', cls: 'text-green-700 bg-green-50 ring-green-200' },
  partial: { label: 'Bayar Sebagian', cls: 'text-orange-700 bg-orange-50 ring-orange-200' },
  refunded: { label: 'Refund', cls: 'text-orange-700 bg-orange-50 ring-orange-200' },
}

const paymentProviderLabel: Record<string, string> = {
  internal: 'Transfer Manual',
  midtrans: 'Midtrans',
  xendit: 'Xendit',
}

const paymentMethodLabel: Record<string, string> = {
  bank_transfer: 'Transfer Bank',
  credit_card: 'Kartu Kredit',
  ewallet: 'E-Wallet',
  cod: 'COD',
}

const logActionLabel: Record<string, string> = {
  order_created: 'Order Dibuat',
  order_updated: 'Order Diperbarui',
  order_status_updated: 'Status Diperbarui',
  update_status: 'Status Diperbarui',
  order_invoice_print: 'Invoice Dicetak',
  order_label_print: 'Label Dicetak',
  order_payment_added: 'Pembayaran Ditambahkan',
}

function isValidDate(d: string) {
  return !!d && !d.startsWith('0001')
}

const visibleItems = computed(() => {
  const all = order.value?.items || []
  return showAllItems.value ? all : all.slice(0, 5)
})

const LOGS_PREVIEW = 5
const visibleLogs = computed(() => {
  const all = order.value?.logs || []
  return showAllLogs.value ? all : all.slice(0, LOGS_PREVIEW)
})

const showingTotal = computed(() => {
  if (!order.value) return ''
  const gt = Number(order.value.grand_total)
  return gt > 0 ? order.value.grand_total : order.value.total
})

const paidAmount = computed(() => Number(order.value?.payment_total || 0))
const remainingAmount = computed(() => {
  if (!order.value) return 0
  return Number(showingTotal.value) - paidAmount.value
})

const netProfit = computed(() => {
  if (!order.value) return null
  const netCogs = Number(order.value.cogs_total) - totalReturnsCogs.value
  return Number(order.value.payment_total) - netCogs
})

const hasSettlementFees = computed(() => {
  if (!order.value) return false
  return [
    order.value.admin_fee, order.value.affiliate_fee, order.value.commission_fee,
    order.value.shipping_fee, order.value.shipping_return_fee, order.value.cod_fee, order.value.others_fee,
  ].some(v => Number(v) !== 0)
})

const totalReturns = computed(() => {
  if (!order.value?.returns?.length) return 0
  return order.value.returns.reduce((sum, r) => sum + Number(r.total), 0)
})

const totalReturnsCogs = computed(() => {
  if (!order.value?.returns?.length) return 0
  return order.value.returns.reduce((sum, r) => sum + Number(r.cogs_total), 0)
})

async function fetchOrder() {
  loading.value = true
  try {
    const res = await api.get<{ data: SalesOrder }>(`/sales/orders/${orderId.value}`)
    order.value = res.data
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data order')
    router.push('/sales/order')
  }
  finally {
    loading.value = false
  }
}

async function handleDelete() {
  const ok = await confirm({
    title: 'Hapus Order',
    message: `Hapus order "${order.value?.no}"? Tindakan ini tidak dapat dibatalkan.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/sales/orders/${orderId.value}`)
    toast.success('Order berhasil dihapus')
    router.push('/sales/order')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus order')
  }
}

onMounted(fetchOrder)
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-wrap items-start gap-3">
      <button
        class="mt-0.5 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        @click="router.back()"
      >
        <ArrowLeft class="h-5 w-5" />
      </button>
      <div class="flex-1 min-w-0">
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
          {{ loading ? 'Memuat...' : (order?.no || 'Detail Order') }}
        </h1>
        <div v-if="order" class="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1"
            :class="statusConfig[order.status]?.cls || 'bg-gray-50 text-gray-700 ring-gray-200'"
          >
            <component :is="statusConfig[order.status]?.icon || FileText" class="h-3 w-3" />
            {{ statusConfig[order.status]?.label || order.status }}
            <span v-if="order.sub_status && order.sub_status !== order.status" class="opacity-70">
              · {{ order.sub_status }}
            </span>
          </span>
          <span
            class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1"
            :class="paymentStatusConfig[order.payment_status]?.cls || 'bg-gray-50 text-gray-700 ring-gray-200'"
          >
            {{ paymentStatusConfig[order.payment_status]?.label || order.payment_status }}
          </span>
          <span v-if="order.cod === 'yes'" class="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">COD</span>
          <span v-if="order.preorder === 'yes'" class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">Preorder</span>
          <span v-if="order.source" class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">{{ order.source }}</span>
        </div>
      </div>

      <!-- Actions -->
      <template v-if="order">
        <div class="flex flex-wrap items-center gap-2">
          <!-- Print buttons — always visible when not pending -->
          <button
            v-if="order.status !== 'pending'"
            class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            title="Print Invoice"
            @click="showPrintInvoiceModal = true"
          >
            <FileText class="h-4 w-4" />
            <span class="hidden sm:inline">Invoice</span>
          </button>
          <button
            v-if="order.status === 'processing'"
            class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            title="Print Label"
            @click="showPrintLabelModal = true"
          >
            <Printer class="h-4 w-4" />
            <span class="hidden sm:inline">Label</span>
          </button>
        </div>
      </template>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="grid gap-5 lg:grid-cols-12">
      <div class="space-y-4 lg:col-span-4">
        <div v-for="i in 3" :key="i" class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
          <div class="h-4 w-24 animate-pulse rounded bg-gray-200" />
          <div class="mt-4 space-y-3">
            <div v-for="j in 3" :key="j" class="h-4 w-full animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
      <div class="space-y-4 lg:col-span-8">
        <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
          <div class="border-b border-gray-100 px-5 py-4">
            <div class="h-4 w-28 animate-pulse rounded bg-gray-200" />
          </div>
          <div class="space-y-3 p-5">
            <div v-for="i in 4" :key="i" class="h-12 w-full animate-pulse rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
    </div>

    <template v-else-if="order">
      <div class="grid gap-5 lg:grid-cols-12">

        <!-- ── LEFT column ────────────────────────────────────── -->
        <div class="space-y-4 lg:col-span-3">

          <!-- Order Info -->
          <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ShoppingCart class="h-4 w-4 text-primary-500" />
                Informasi Order
              </h2>
              <!-- <button
                v-if="order.status === 'pending'"
                class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600"
                title="Edit Detail"
                @click="showDetailModal = true"
              >
                <Pencil class="h-4 w-4" />
              </button> -->
            </div>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between gap-2">
                <dt class="shrink-0 text-xs text-gray-400">No. Order</dt>
                <dd class="text-right font-semibold text-gray-900">{{ order.no }}</dd>
              </div>
              <div v-if="order.external_id" class="flex justify-between gap-2">
                <dt class="shrink-0 text-xs text-gray-400">External ID</dt>
                <dd class="truncate text-right text-gray-700">{{ order.external_id }}</dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="shrink-0 text-xs text-gray-400">Tanggal</dt>
                <dd class="text-right text-gray-700">{{ formatDateTime(order.date_created) }}</dd>
              </div>
              <div v-if="isValidDate(order.date_due)" class="flex justify-between gap-2">
                <dt class="shrink-0 text-xs text-gray-400">Jatuh Tempo</dt>
                <dd class="text-right text-gray-700">{{ formatDateTime(order.date_due) }}</dd>
              </div>
              <div v-if="isValidDate(order.date_processed)" class="flex justify-between gap-2">
                <dt class="shrink-0 text-xs text-gray-400">Tgl Diproses</dt>
                <dd class="text-right text-gray-700">{{ formatDateTime(order.date_processed) }}</dd>
              </div>
              <div v-if="isValidDate(order.date_packing)" class="flex justify-between gap-2">
                <dt class="shrink-0 text-xs text-gray-400">Tgl Packing</dt>
                <dd class="text-right text-gray-700">{{ formatDateTime(order.date_packing) }}</dd>
              </div>
              <div v-if="isValidDate(order.date_ready)" class="flex justify-between gap-2">
                <dt class="shrink-0 text-xs text-gray-400">Tgl Siap Kirim</dt>
                <dd class="text-right text-gray-700">{{ formatDateTime(order.date_ready) }}</dd>
              </div>
              <div v-if="isValidDate(order.date_shipped)" class="flex justify-between gap-2">
                <dt class="shrink-0 text-xs text-gray-400">Tgl Dikirim</dt>
                <dd class="text-right text-gray-700">{{ formatDateTime(order.date_shipped) }}</dd>
              </div>
              <div v-if="isValidDate(order.date_delivered)" class="flex justify-between gap-2">
                <dt class="shrink-0 text-xs text-gray-400">Tgl Diterima</dt>
                <dd class="text-right text-gray-700">{{ formatDateTime(order.date_delivered) }}</dd>
              </div>
              <div v-if="isValidDate(order.date_completed)" class="flex justify-between gap-2">
                <dt class="shrink-0 text-xs text-gray-400">Tgl Selesai</dt>
                <dd class="text-right text-gray-700">{{ formatDateTime(order.date_completed) }}</dd>
              </div>
              <div v-if="isValidDate(order.date_canceled)" class="flex justify-between gap-2">
                <dt class="shrink-0 text-xs text-gray-400">Tgl Dibatalkan</dt>
                <dd class="text-right text-gray-700">{{ formatDateTime(order.date_canceled) }}</dd>
              </div>
              <div class="flex justify-between gap-2 border-t border-gray-100 pt-2">
                <dt class="shrink-0 text-xs text-gray-400">Metode Bayar</dt>
                <dd class="text-right text-gray-700">
                  {{ order.cod === 'yes' ? 'COD' : paymentMethodLabel[order.payment_method] || order.payment_method }}
                </dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="shrink-0 text-xs text-gray-400">Provider</dt>
                <dd class="text-right text-gray-700">{{ paymentProviderLabel[order.payment_provider] || order.payment_provider }}</dd>
              </div>
              <div v-if="order.store" class="flex justify-between gap-2 border-t border-gray-100 pt-2">
                <dt class="shrink-0 text-xs text-gray-400">Toko</dt>
                <dd class="text-right text-gray-700">{{ order.store.shop_name || order.store.name || '-' }}</dd>
              </div>
              <div v-if="order.warehouse" class="flex justify-between gap-2">
                <dt class="shrink-0 text-xs text-gray-400">Gudang</dt>
                <dd class="text-right text-gray-700">{{ order.warehouse.name }}</dd>
              </div>
              <div v-if="order.staff" class="flex justify-between gap-2">
                <dt class="shrink-0 text-xs text-gray-400">Staff</dt>
                <dd class="text-right text-gray-700">{{ order.staff.name }}</dd>
              </div>
              <div class="flex justify-between gap-2 border-t border-gray-100 pt-2">
                <dt class="shrink-0 text-xs text-gray-400">Total Qty</dt>
                <dd class="text-right font-medium text-gray-900">{{ order.qty }}</dd>
              </div>
              <div v-if="order.weight" class="flex justify-between gap-2">
                <dt class="shrink-0 text-xs text-gray-400">Berat</dt>
                <dd class="text-right text-gray-700">{{ order.weight }} gr</dd>
              </div>
              <div v-if="order.qty_returned > 0" class="flex justify-between gap-2">
                <dt class="shrink-0 text-xs text-gray-400">Qty Diretur</dt>
                <dd class="text-right text-orange-600 font-medium">{{ order.qty_returned }}</dd>
              </div>
              <template v-if="order.note || order.customer_note || (order.tags && order.tags.length)">
                <div v-if="order.note" class="border-t border-gray-100 pt-2">
                  <p class="text-xs text-gray-400">Catatan Internal</p>
                  <p class="mt-0.5 text-gray-700">{{ order.note }}</p>
                </div>
                <div v-if="order.customer_note">
                  <p class="text-xs text-gray-400">Catatan Pelanggan</p>
                  <p class="mt-0.5 text-gray-700">{{ order.customer_note }}</p>
                </div>
                <div v-if="order.tags && order.tags.length">
                  <p class="text-xs text-gray-400">Tags</p>
                  <div class="mt-1 flex flex-wrap gap-1">
                    <span
                      v-for="tag in order.tags"
                      :key="tag"
                      class="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </div>
              </template>
            </dl>
          </div>

          <!-- Customer -->
          <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
            <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <UserCircle class="h-4 w-4 text-primary-500" />
              Pelanggan
            </h2>
            <div class="space-y-1 text-sm">
              <p class="font-semibold text-gray-900">{{ order.customer?.name || '-' }}</p>
              <p v-if="order.customer?.phone" class="text-gray-500">{{ order.customer.phone }}</p>
              <span v-if="order.customer_category" class="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                {{ order.customer_category.name }}
              </span>
            </div>
          </div>

          <!-- Shipping Address -->
          <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <MapPin class="h-4 w-4 text-primary-500" />
                Alamat Pengiriman
              </h2>
              <!-- <button
                v-if="order.status === 'pending'"
                class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600"
                title="Edit Alamat"
                @click="showAddressModal = true"
              >
                <Pencil class="h-4 w-4" />
              </button> -->
            </div>
            <div v-if="order.address" class="space-y-0.5 text-sm text-gray-700">
              <p class="font-semibold text-gray-900">{{ order.address.name }}</p>
              <p class="text-gray-500">{{ order.address.phone }}</p>
              <p>{{ order.address.address }}</p>
              <p>{{ [order.address.district, order.address.city, order.address.province].filter(Boolean).join(', ') }}</p>
              <p v-if="order.address.zipcode" class="text-gray-500">{{ order.address.zipcode }}</p>
            </div>
            <p v-else class="text-sm text-gray-400">Tidak ada alamat</p>
          </div>

          <!-- Shipment -->
          <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Truck class="h-4 w-4 text-primary-500" />
                Pengiriman
              </h2>
              <!-- <button
                v-if="order.status === 'pending'"
                class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600"
                title="Edit Pengiriman"
                @click="showShipmentModal = true"
              >
                <Pencil class="h-4 w-4" />
              </button> -->
            </div>
            <div v-if="order.shipment" class="space-y-2 text-sm">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-gray-900">{{ order.shipment.courier_name }}</span>
                <span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{{ order.shipment.service_code }}</span>
              </div>
              <p class="text-gray-500">{{ order.shipment.service_name }}</p>
              <div class="border-t border-gray-100 pt-2 space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-400">Ongkir</span>
                  <span class="font-medium text-gray-900">Rp{{ formatCurrency(order.shipment.price) }}</span>
                </div>
                <div v-if="Number(order.shipment.discount) > 0" class="flex items-center justify-between">
                  <span class="text-xs text-gray-400">Diskon Ongkir</span>
                  <span class="text-green-600">-Rp{{ formatCurrency(order.shipment.discount) }}</span>
                </div>
                <div class="flex items-center justify-between font-medium">
                  <span class="text-xs text-gray-400">Total</span>
                  <span class="text-gray-900">Rp{{ formatCurrency(order.shipment.total) }}</span>
                </div>
              </div>
              <div v-if="order.shipment.tracking_no" class="border-t border-gray-100 pt-2">
                <p class="text-xs text-gray-400">No. Resi</p>
                <p class="mt-0.5 font-semibold text-gray-900 font-mono">{{ order.shipment.tracking_no }}</p>
              </div>
              <div v-if="order.shipment.package_id" class="border-t border-gray-100 pt-2">
                <p class="text-xs text-gray-400">Package ID</p>
                <p class="mt-0.5 text-xs font-mono text-gray-700">{{ order.shipment.package_id }}</p>
              </div>
              <div v-if="order.shipment.aggregator" class="flex items-center justify-between border-t border-gray-100 pt-2">
                <span class="text-xs text-gray-400">Aggregator</span>
                <span class="text-xs font-medium text-gray-700">{{ order.shipment.aggregator }}</span>
              </div>
            </div>
            <p v-else class="text-sm text-gray-400">Belum ada info pengiriman</p>

            <!-- Dropship -->
            <div v-if="order.dropship?.type" class="mt-3 rounded-lg bg-amber-50/60 p-3 ring-1 ring-amber-100">
              <div class="mb-1.5 flex items-center gap-1.5">
                <Box class="h-3.5 w-3.5 text-amber-600" />
                <span class="text-xs font-semibold text-amber-700">Dropship</span>
                <span class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium capitalize text-amber-700">
                  {{ order.dropship.type === 'marketplace' ? 'Marketplace' : 'Regular' }}
                </span>
              </div>
              <div class="space-y-1 text-sm">
                <div v-if="order.dropship.source" class="flex items-center gap-1.5">
                  <img :src="`/images/platform/${order.dropship.source}.svg`" alt="" class="h-4 w-4 object-contain" @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')" />
                  <span class="capitalize text-gray-700">{{ order.dropship.source }}</span>
                </div>
                <p v-if="order.dropship.name" class="font-medium text-gray-900">{{ order.dropship.name }}</p>
                <p v-if="order.dropship.phone" class="text-gray-500">{{ order.dropship.phone }}</p>
                <a
                  v-if="order.dropship.file"
                  :href="order.dropship.file"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:underline"
                >
                  <Printer class="h-3.5 w-3.5" />
                  Lihat Label Dropship
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- ── RIGHT column ───────────────────────────────────── -->
        <div class="space-y-4 lg:col-span-9">

          <!-- Items -->
          <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Package class="h-4 w-4 text-primary-500" />
                Item Produk
                <span class="ml-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{{ order.items?.length || 0 }}</span>
              </h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[500px] text-sm">
                <thead>
                  <tr class="border-b border-gray-100 bg-gray-50 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    <th class="px-4 py-2.5">Produk</th>
                    <th class="px-4 py-2.5 w-14 text-center">Qty</th>
                    <th class="px-4 py-2.5 text-right">Harga</th>
                    <th class="px-4 py-2.5 text-right">Diskon</th>
                    <th class="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="item in visibleItems" :key="item.id" class="align-middle">
                    <td class="px-4 py-3">
                      <p class="font-medium text-gray-900 line-clamp-1">{{ item.name }}</p>
                      <div class="mt-0.5 flex flex-wrap items-center gap-1 text-xs">
                        <span class="font-mono text-gray-500">{{ item.sku }}</span>
                        <span
                          v-for="v in item.variants"
                          :key="v.name"
                          class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                        >
                          {{ v.value }}
                        </span>
                        <span v-if="item.is_free === 'yes'" class="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">Gratis</span>
                        <span v-if="item.qty_returned > 0" class="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">{{ item.qty_returned }} retur</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center font-medium text-gray-900">{{ item.qty }}</td>
                    <td class="px-4 py-3 text-right text-gray-700 whitespace-nowrap">Rp{{ formatCurrency(item.price) }}</td>
                    <td class="px-4 py-3 text-right whitespace-nowrap">
                      <span v-if="Number(item.discount) > 0" class="text-green-600">-Rp{{ formatCurrency(item.discount) }}</span>
                      <span v-else class="text-gray-300">—</span>
                    </td>
                    <td class="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">Rp{{ formatCurrency(item.total) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="!order.items?.length" class="px-4 py-10 text-center text-sm text-gray-400">
              Tidak ada item
            </div>
            <div v-if="(order.items?.length || 0) > 5" class="border-t border-gray-100 px-4 py-2.5 text-center">
              <button
                class="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                @click="showAllItems = !showAllItems"
              >
                <ChevronDown class="h-4 w-4 transition-transform" :class="showAllItems ? 'rotate-180' : ''" />
                {{ showAllItems ? 'Sembunyikan' : `+${(order.items?.length || 0) - 5} item lagi` }}
              </button>
            </div>
          </div>

          <!-- Returns -->
          <div v-if="order.returns?.length" class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
            <div class="border-b border-gray-100 px-5 py-4">
              <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <RotateCcw class="h-4 w-4 text-orange-500" />
                Retur
                <span class="ml-0.5 rounded-full bg-orange-50 px-1.5 py-0.5 text-xs text-orange-600 ring-1 ring-orange-200">{{ order.returns.length }}</span>
              </h2>
            </div>
            <div class="divide-y divide-gray-100">
              <div v-for="ret in order.returns" :key="ret.id">
                <!-- Return header -->
                <div class="flex flex-wrap items-center justify-between gap-2 bg-orange-50/60 px-5 py-3">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-gray-900 text-sm">{{ ret.no }}</span>
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1"
                      :class="ret.status === 'completed' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-orange-50 text-orange-700 ring-orange-200'"
                    >
                      {{ ret.status === 'completed' ? 'Selesai' : ret.status }}
                    </span>
                  </div>
                  <div class="flex items-center gap-4 text-sm">
                    <span class="text-xs text-gray-400">{{ formatDate(ret.date) }}</span>
                    <span class="font-semibold text-orange-600">-Rp{{ formatCurrency(ret.total) }}</span>
                  </div>
                </div>
                <!-- Return items table -->
                <div class="overflow-x-auto">
                  <table class="w-full min-w-[500px] text-sm">
                    <thead>
                      <tr class="border-b border-gray-100 bg-gray-50 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        <th class="px-4 py-2">Produk</th>
                        <th class="px-4 py-2 w-14 text-center">Qty</th>
                        <th class="px-4 py-2 text-right">Harga</th>
                        <th class="px-4 py-2 text-right">Diskon</th>
                        <th class="px-4 py-2 text-right">Total</th>
                        <th class="px-4 py-2 text-right">HPP</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                      <tr v-for="item in ret.items" :key="item.id" class="align-middle">
                        <td class="px-4 py-2.5">
                          <p class="font-medium text-gray-900 line-clamp-1">{{ item.name }}</p>
                          <div class="mt-0.5 flex flex-wrap items-center gap-1 text-xs">
                            <span class="font-mono text-gray-500">{{ item.sku }}</span>
                            <span
                              v-for="v in item.variants"
                              :key="v.name"
                              class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                            >
                              {{ v.value }}
                            </span>
                          </div>
                        </td>
                        <td class="px-4 py-2.5 text-center font-medium text-gray-900">{{ item.qty }}</td>
                        <td class="px-4 py-2.5 text-right text-gray-700 whitespace-nowrap">Rp{{ formatCurrency(item.price) }}</td>
                        <td class="px-4 py-2.5 text-right whitespace-nowrap">
                          <span v-if="Number(item.discount) > 0" class="text-green-600">-Rp{{ formatCurrency(item.discount) }}</span>
                          <span v-else class="text-gray-300">—</span>
                        </td>
                        <td class="px-4 py-2.5 text-right font-semibold text-orange-600 whitespace-nowrap">Rp{{ formatCurrency(item.total) }}</td>
                        <td class="px-4 py-2.5 text-right text-gray-500 whitespace-nowrap">Rp{{ formatCurrency(item.cogs_total) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <!-- Return footer -->
                <div class="flex flex-wrap justify-end gap-x-6 gap-y-1 border-t border-gray-100 bg-gray-50/50 px-5 py-2.5 text-xs">
                  <span class="text-gray-500">Subtotal: <span class="font-medium text-gray-900">Rp{{ formatCurrency(ret.subtotal) }}</span></span>
                  <span v-if="Number(ret.shipping_total) > 0" class="text-gray-500">Ongkir: <span class="font-medium text-gray-900">Rp{{ formatCurrency(ret.shipping_total) }}</span></span>
                  <span class="text-gray-500">HPP: <span class="font-medium text-gray-900">Rp{{ formatCurrency(ret.cogs_total) }}</span></span>
                  <span class="font-semibold text-orange-600">Total: Rp{{ formatCurrency(ret.total) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Summary -->
          <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
            <h2 class="mb-3 text-sm font-semibold text-gray-900">Ringkasan</h2>
            <div class="space-y-2 text-sm">
              <!-- Penjualan -->
              <div class="flex justify-between">
                <span class="text-gray-500">Subtotal Produk</span>
                <span class="text-gray-900">Rp{{ formatCurrency(order.subtotal) }}</span>
              </div>
              <div v-if="Number(order.discount) > 0" class="flex justify-between">
                <span class="text-gray-500">Diskon Penjualan</span>
                <span class="text-green-600">-Rp{{ formatCurrency(order.discount) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Ongkir Customer</span>
                <span class="text-gray-900">Rp{{ formatCurrency(order.shipping_total) }}</span>
              </div>
              <div v-if="Number(order.cod_cost) > 0" class="flex justify-between">
                <span class="text-gray-500">COD Fee Customer</span>
                <span class="text-gray-900">Rp{{ formatCurrency(order.cod_cost) }}</span>
              </div>
              <div v-if="Number(order.unique_code) !== 0" class="flex justify-between">
                <span class="text-gray-500">Kode Unik</span>
                <span>{{ Number(order.unique_code) > 0 ? '' : '-' }}Rp{{ formatCurrency(Math.abs(Number(order.unique_code))) }}</span>
              </div>
              <div v-if="Number(order.adjustment) !== 0" class="flex justify-between">
                <span class="text-gray-500">Penyesuaian</span>
                <span>{{ Number(order.adjustment) > 0 ? '+' : '-' }}Rp{{ formatCurrency(Math.abs(Number(order.adjustment))) }}</span>
              </div>
              <div v-if="Number(order.tax) > 0" class="flex justify-between">
                <span class="text-gray-500">Pajak</span>
                <span class="text-gray-900">Rp{{ formatCurrency(order.tax) }}</span>
              </div>
              <div class="flex justify-between border-t border-gray-200 pt-2.5">
                <span class="font-semibold text-gray-900">Total</span>
                <span class="font-bold text-gray-900">Rp{{ formatCurrency(order.total) }}</span>
              </div>

              <!-- Returns summary -->
              <template v-if="order.returns?.length">
                <p class="pt-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">Retur</p>
                <div v-for="ret in order.returns" :key="ret.id" class="flex justify-between">
                  <span class="text-gray-500">{{ ret.no }}</span>
                  <span class="text-orange-600">-Rp{{ formatCurrency(ret.total) }}</span>
                </div>
                <div v-if="totalReturnsCogs > 0" class="flex justify-between">
                  <span class="text-gray-500">HPP Retur</span>
                  <span class="text-gray-500">Rp{{ formatCurrency(totalReturnsCogs) }}</span>
                </div>
              </template>

              <!-- Settlement fees -->
              <template v-if="hasSettlementFees">
                <p class="pt-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">Biaya Settlement</p>
                <div v-if="Number(order.admin_fee) !== 0" class="flex justify-between">
                  <span class="text-gray-500">Admin Fee</span>
                  <span :class="Number(order.admin_fee) < 0 ? 'text-red-500' : 'text-gray-900'">{{ Number(order.admin_fee) > 0 ? '' : '-' }}Rp{{ formatCurrency(Math.abs(Number(order.admin_fee))) }}</span>
                </div>
                <div v-if="Number(order.affiliate_fee) !== 0" class="flex justify-between">
                  <span class="text-gray-500">Affiliate Fee</span>
                  <span :class="Number(order.affiliate_fee) < 0 ? 'text-red-500' : 'text-gray-900'">{{ Number(order.affiliate_fee) > 0 ? '' : '-' }}Rp{{ formatCurrency(Math.abs(Number(order.affiliate_fee))) }}</span>
                </div>
                <div v-if="Number(order.commission_fee) !== 0" class="flex justify-between">
                  <span class="text-gray-500">Commission Fee</span>
                  <span :class="Number(order.commission_fee) < 0 ? 'text-red-500' : 'text-gray-900'">{{ Number(order.commission_fee) > 0 ? '' : '-' }}Rp{{ formatCurrency(Math.abs(Number(order.commission_fee))) }}</span>
                </div>
                <div v-if="Number(order.shipping_fee) !== 0" class="flex justify-between">
                  <span class="text-gray-500">Ongkir ke Kurir</span>
                  <span :class="Number(order.shipping_fee) < 0 ? 'text-red-500' : 'text-gray-900'">{{ Number(order.shipping_fee) > 0 ? '' : '-' }}Rp{{ formatCurrency(Math.abs(Number(order.shipping_fee))) }}</span>
                </div>
                <div v-if="Number(order.shipping_return_fee) !== 0" class="flex justify-between">
                  <span class="text-gray-500">Ongkir Retur</span>
                  <span :class="Number(order.shipping_return_fee) < 0 ? 'text-red-500' : 'text-gray-900'">{{ Number(order.shipping_return_fee) > 0 ? '' : '-' }}Rp{{ formatCurrency(Math.abs(Number(order.shipping_return_fee))) }}</span>
                </div>
                <div v-if="Number(order.cod_fee) !== 0" class="flex justify-between">
                  <span class="text-gray-500">COD Fee ke Kurir</span>
                  <span :class="Number(order.cod_fee) < 0 ? 'text-red-500' : 'text-gray-900'">{{ Number(order.cod_fee) > 0 ? '' : '-' }}Rp{{ formatCurrency(Math.abs(Number(order.cod_fee))) }}</span>
                </div>
                <div v-if="Number(order.others_fee) !== 0" class="flex justify-between">
                  <span class="text-gray-500">Biaya Lainnya</span>
                  <span :class="Number(order.others_fee) < 0 ? 'text-red-500' : 'text-gray-900'">{{ Number(order.others_fee) > 0 ? '' : '-' }}Rp{{ formatCurrency(Math.abs(Number(order.others_fee))) }}</span>
                </div>
                <div class="flex justify-between border-t border-gray-200 pt-2.5">
                  <span class="font-semibold text-gray-900">Grand Total</span>
                  <span class="font-bold text-gray-900">Rp{{ formatCurrency(order.grand_total) }}</span>
                </div>
              </template>

              <!-- Pembayaran -->
              <p class="pt-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">Pembayaran</p>
              <div class="flex justify-between">
                <span class="text-gray-500">Sudah Dibayar</span>
                <span class="font-medium" :class="paidAmount > 0 ? 'text-green-600' : 'text-gray-400'">Rp{{ formatCurrency(order.payment_total) }}</span>
              </div>
              <div
                v-if="order.payment_status !== 'paid'"
                class="flex justify-between rounded-lg bg-red-50 px-3 py-2"
              >
                <span class="font-semibold text-red-700">Sisa Tagihan</span>
                <span class="font-bold text-red-700">Rp{{ formatCurrency(remainingAmount) }}</span>
              </div>

              <!-- Profitabilitas -->
              <template v-if="Number(order.cogs_total) > 0 || netProfit !== null">
                <p class="pt-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">Profitabilitas</p>
                <div class="flex justify-between">
                  <span class="text-gray-500">HPP Total</span>
                  <span class="text-red-500">-Rp{{ formatCurrency(order.cogs_total) }}</span>
                </div>
                <div v-if="totalReturnsCogs > 0" class="flex justify-between">
                  <span class="text-gray-500">HPP Retur</span>
                  <span class="text-green-600">+Rp{{ formatCurrency(totalReturnsCogs) }}</span>
                </div>
                <div class="flex justify-between rounded-lg px-3 py-2" :class="(netProfit ?? 0) >= 0 ? 'bg-green-50' : 'bg-red-50'">
                  <span class="font-semibold" :class="(netProfit ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'">Net Profit</span>
                  <span class="font-bold" :class="(netProfit ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'">
                    {{ (netProfit ?? 0) < 0 ? '-' : '' }}Rp{{ formatCurrency(Math.abs(netProfit ?? 0)) }}
                  </span>
                </div>
              </template>
            </div>
          </div>

          <!-- Payments -->
          <div v-if="order.payments?.length" class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
            <div class="border-b border-gray-100 px-5 py-4">
              <h2 class="text-sm font-semibold text-gray-900">
                Data Pembayaran
                <span class="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{{ order.payments.length }}</span>
              </h2>
            </div>
            <div class="divide-y divide-gray-100">
              <div v-for="pay in order.payments" :key="pay.id" class="flex gap-4 px-5 py-4">
                <!-- Proof image -->
                <div v-if="pay.file" class="shrink-0">
                  <a :href="pay.file" target="_blank" rel="noopener">
                    <img :src="pay.file" alt="Bukti Bayar" class="h-14 w-14 rounded-lg object-cover ring-1 ring-gray-200 hover:opacity-80" />
                  </a>
                </div>
                <div class="min-w-0 flex-1 space-y-1 text-sm">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="font-semibold text-gray-900">{{ pay.no }}</span>
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1"
                      :class="pay.status === 'done' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-yellow-50 text-yellow-700 ring-yellow-200'"
                    >
                      {{ pay.status === 'done' ? 'Lunas' : pay.status }}
                    </span>
                  </div>
                  <div class="flex flex-wrap items-center justify-between gap-1 text-xs text-gray-500">
                    <span>{{ formatDate(pay.date) }}</span>
                    <span class="font-semibold text-gray-900 text-sm">Rp{{ formatCurrency(pay.amount) }}</span>
                  </div>
                  <div class="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                    <span v-if="pay.bank_name">{{ pay.bank_type === 'bank' ? 'Bank' : 'Dompet' }}: <span class="font-medium text-gray-700">{{ pay.bank_name }}</span></span>
                    <span v-else-if="pay.wallet">Wallet: <span class="font-medium text-gray-700">{{ pay.wallet.name }}</span></span>
                    <span v-if="pay.account_number">{{ pay.account_number }} a/n {{ pay.account_name }}</span>
                  </div>
                  <p v-if="pay.note" class="text-xs text-gray-400">{{ pay.note }}</p>
                </div>
              </div>
            </div>
          </div>


          <AppStockMovements v-if="order.id" :reference-id="order.id" />
          <!-- Activity Log -->
          <div v-if="order.logs?.length" class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
            <div class="border-b border-gray-100 px-5 py-4">
              <h2 class="text-sm font-semibold text-gray-900">
                Riwayat Aktivitas
                <span class="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{{ order.logs.length }}</span>
              </h2>
            </div>
            <ul class="divide-y divide-gray-100">
              <li v-for="log in visibleLogs" :key="log.id" class="flex items-start gap-3 px-5 py-3">
                <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <FileText class="h-3 w-3 text-gray-500" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-sm font-medium text-gray-900">{{ logActionLabel[log.action] || log.action }}</p>
                    <p class="shrink-0 text-xs text-gray-400">{{ formatDateTime(log.created_at) }}</p>
                  </div>
                  <p v-if="log.note" class="text-xs text-gray-500">{{ log.note }}</p>
                  <p class="text-xs text-gray-400">{{ log.name }}</p>
                </div>
              </li>
            </ul>
            <div v-if="order.logs.length > LOGS_PREVIEW" class="border-t border-gray-100 px-5 py-2.5">
              <button
                class="text-xs font-medium text-primary-600 hover:underline"
                @click="showAllLogs = !showAllLogs"
              >
                {{ showAllLogs ? 'Sembunyikan' : `Tampilkan semua (${order.logs.length})` }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Modals -->
    <AppOrderShipmentModal
      v-if="showShipmentModal"
      :order-id="orderId"
      :order="(order as any)"
      @close="closeModals"
      @success="onModalSuccess"
    />
    <AppOrderAddressModal
      v-if="showAddressModal"
      :order-id="orderId"
      :address="(order?.address as any) ?? null"
      @close="closeModals"
      @success="onModalSuccess"
    />
    <AppOrderDetailModal
      v-if="showDetailModal"
      :order-id="orderId"
      :detail="(order as any)"
      @close="closeModals"
      @success="onModalSuccess"
    />
    <AppOrderStatusUpdateModal
      v-if="showStatusModal && order"
      action="process"
      :order-ids="[orderId]"
      :orders="order ? [(order as any)] : []"
      @close="closeModals"
      @success="onModalSuccess"
    />
    <AppOrderPaymentModal
      v-if="showPaymentModal && order"
      :order="(order as any)"
      @close="closeModals"
      @success="onModalSuccess"
    />
    <AppPrintShippingLabelModal
      v-if="showPrintLabelModal && order"
      :order-ids="[orderId]"
      :orders="[(order as any)]"
      @close="closeModals"
      @success="onModalSuccess"
    />
    <AppPrintInvoiceModal
      v-if="showPrintInvoiceModal && order"
      :order-ids="[orderId]"
      :orders="[(order as any)]"
      @close="closeModals"
      @success="onModalSuccess"
    />
  </div>
</template>