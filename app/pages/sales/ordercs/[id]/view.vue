<script setup lang="ts">
import {
  ArrowLeft, ShoppingCart, MapPin, Truck, Package,
  CreditCard, Building2, User, Clock, Box, Hash, Weight,
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
  price: string
  discount: string
  total: string
  is_free: string
  image: string
}

interface OrderAddress {
  id: string
  name: string
  phone: string
  address: string
  province: string
  city: string
  district: string
  zipcode: string
}

interface OrderShipment {
  courier_code: string
  courier_name: string
  service_name: string
  tracking_no: string
  total: string
  aggregator: string
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
  bank_name: string
  account_number: string
  account_name: string
  wallet: { id: string; name: string } | null
}

interface OrderLog {
  id: string
  name: string
  action: string
  note: string
  created_at: string
}

interface SalesOrder {
  id: string
  no: string
  date_created: string
  date_due: string
  weight: number
  subtotal: string
  discount: string
  shipping_cost: string
  shipping_discount: string
  shipping_total: string
  total: string
  payment_total: string
  status: string
  sub_status: string
  payment_status: string
  payment_provider: string
  payment_method: string
  cod: string
  preorder: string
  note: string
  customer_note: string
  tags: string[]
  items: OrderItem[]
  address: OrderAddress | null
  shipment: OrderShipment | null
  payments: OrderPayment[]
  logs: OrderLog[]
  store: { id: string; name: string; source: string; shop_name: string } | null
  warehouse: { id: string; name: string } | null
  customer: { id: string; name: string; phone: string } | null
  customer_category: { id: string; name: string } | null
  staff: { id: string; name: string; code: string } | null
}

const api = useApi()
const route = useRoute()

const authStore = useAuthStore() 

const orderId = computed(() => route.params.id as string)
const loading = ref(true)
const order = ref<SalesOrder | null>(null)
const selectedOrderForPayment = ref<SalesOrder | null>(null)

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  processing: { label: 'Diproses', cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  shipped: { label: 'Dikirim', cls: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' },
  completed: { label: 'Selesai', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  canceled: { label: 'Dibatalkan', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
}

const paymentStatusConfig: Record<string, { label: string; cls: string }> = {
  unpaid: { label: 'Belum Bayar', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  paid: { label: 'Lunas', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  refunded: { label: 'Refund', cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
}

const canConfirmPayment = computed(() =>
  !!order.value
  && order.value.payment_status === 'unpaid'
  && order.value.payment_provider === 'internal'
  && order.value.payment_method === 'bank_transfer',
)

function isValidDate(d?: string) {
  return !!d && !d.startsWith('0001')
}

async function fetchOrder() {
  loading.value = true
  try {
    const res = await api.get<{ data: SalesOrder }>(`/sales/ordercs/${orderId.value}`)
    order.value = res.data || null
  }
  catch {
    order.value = null
  }
  finally {
    loading.value = false
  }
}

function openPaymentModal() {
  if (order.value) selectedOrderForPayment.value = order.value
}

function closePaymentModal() {
  selectedOrderForPayment.value = null
}

async function onPaymentSuccess() {
  await fetchOrder()
}

onMounted(fetchOrder)
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/sales/ordercs" class="rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50">
          <ArrowLeft class="h-4 w-4" />
        </NuxtLink>
        <div>
          <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">{{ order?.no || 'Detail Order' }}</h1>
          <p class="text-sm text-gray-500">Detail order CS.</p>
        </div>
      </div>
      <button
        v-if="canConfirmPayment"
        class="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
        @click="openPaymentModal"
      >
        <CreditCard class="h-4 w-4" />
        Konfirmasi Pembayaran
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="rounded-xl bg-white p-12 text-center shadow-xs ring-1 ring-gray-200">
      <p class="text-sm text-gray-400">Memuat detail order...</p>
    </div>

    <!-- Not found -->
    <div v-else-if="!order" class="rounded-xl bg-white p-12 text-center shadow-xs ring-1 ring-gray-200">
      <ShoppingCart class="mx-auto mb-3 h-12 w-12 text-gray-300" />
      <p class="text-sm font-medium text-gray-500">Order tidak ditemukan</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- Main -->
      <div class="space-y-4 lg:col-span-2">
        <!-- Status -->
        <div class="flex flex-wrap items-center gap-2 rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" :class="statusConfig[order.status]?.cls || 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'">
            {{ statusConfig[order.status]?.label || order.status }}
          </span>
          <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" :class="paymentStatusConfig[order.payment_status]?.cls || 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'">
            {{ paymentStatusConfig[order.payment_status]?.label || order.payment_status }}
          </span>
          <span v-if="order.cod === 'yes'" class="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-700">COD</span>
          <span v-if="order.preorder === 'yes'" class="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">PO</span>
          <span class="ml-auto text-xs text-gray-400">{{ formatDateTimeDay(order.date_created) }}</span>
        </div>

        <!-- Items -->
        <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
          <div class="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
            <Package class="h-4 w-4 text-gray-400" />
            <h2 class="text-sm font-semibold text-gray-900">Produk ({{ order.items?.length || 0 }})</h2>
          </div>
          <div class="divide-y divide-gray-100">
            <div v-for="item in order.items" :key="item.id" class="flex items-start gap-3 px-4 py-3">
              <img v-if="item.image" :src="item.image" class="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-gray-200" />
              <div v-else class="h-12 w-12 shrink-0 rounded-lg bg-gray-100" />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-800">{{ item.name }}</p>
                <p class="text-xs text-gray-500">
                  <template v-for="variant in item.variants" :key="variant.name">{{ variant.value }} </template>
                  <span v-if="item.sku">· {{ item.sku }}</span>
                </p>
                <p class="mt-0.5 text-xs text-gray-500">{{ item.qty }} × Rp{{ formatCurrency(item.price) }}</p>
              </div>
              <span class="shrink-0 text-sm font-semibold text-gray-900">Rp{{ formatCurrency(item.total) }}</span>
            </div>
          </div>
          <div class="space-y-1 border-t border-gray-100 px-4 py-3 text-sm">
            <div class="flex justify-between text-gray-600"><span>Subtotal</span><span>Rp{{ formatCurrency(order.subtotal) }}</span></div>
            <div v-if="Number(order.discount) > 0" class="flex justify-between text-gray-600"><span>Diskon</span><span>-Rp{{ formatCurrency(order.discount) }}</span></div>
            <div class="flex justify-between text-gray-600"><span>Ongkir</span><span>Rp{{ formatCurrency(order.shipping_total) }}</span></div>
            <div class="flex justify-between border-t border-gray-100 pt-1 font-semibold text-gray-900"><span>Total</span><span>Rp{{ formatCurrency(order.total) }}</span></div>
            <div v-if="order.payment_total" class="flex justify-between text-green-600"><span>Dibayar</span><span>Rp{{ formatCurrency(order.payment_total) }}</span></div>
          </div>
        </div>

        <!-- Payments -->
        <div v-if="order.payments?.length" class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
          <div class="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
            <CreditCard class="h-4 w-4 text-gray-400" />
            <h2 class="text-sm font-semibold text-gray-900">Pembayaran</h2>
          </div>
          <div class="divide-y divide-gray-100">
            <div v-for="p in order.payments" :key="p.id" class="px-4 py-3 text-sm">
              <div class="flex items-center justify-between">
                <span class="font-medium text-gray-800">{{ p.no }}</span>
                <span class="font-semibold text-green-600">Rp{{ formatCurrency(p.amount) }}</span>
              </div>
              <p class="text-xs text-gray-500">{{ formatDateTimeDay(p.date) }} · {{ p.method }} <span v-if="p.bank_name">· {{ p.bank_name }}</span></p>
              <a v-if="p.file" :href="p.file" target="_blank" rel="noopener" class="text-xs text-primary-600 hover:underline">Lihat bukti</a>
            </div>
          </div>
        </div>

        <!-- Logs -->
        <div v-if="order.logs?.length" class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
          <div class="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
            <Clock class="h-4 w-4 text-gray-400" />
            <h2 class="text-sm font-semibold text-gray-900">Riwayat</h2>
          </div>
          <div class="divide-y divide-gray-100">
            <div v-for="log in order.logs" :key="log.id" class="px-4 py-3 text-sm">
              <p class="text-gray-700">{{ log.note }}</p>
              <p class="text-xs text-gray-400">{{ log.name }} · {{ formatDateTimeDay(log.created_at) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-4">
        <!-- Customer -->
        <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
          <div class="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
            <User class="h-4 w-4 text-gray-400" />
            <h2 class="text-sm font-semibold text-gray-900">Pelanggan</h2>
          </div>
          <div class="px-4 py-3 text-sm">
            <p class="font-medium text-gray-800">{{ order.customer?.name || '-' }}</p>
            <p v-if="order.customer?.phone" class="text-xs text-gray-500">{{ order.customer.phone }}</p>
            <p v-if="order.customer_category" class="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0 text-[10px] text-gray-600">{{ order.customer_category.name }}</p>
            <p v-if="order.staff" class="mt-2 text-xs text-gray-500">CS: {{ order.staff.name }}</p>
          </div>
        </div>

        <!-- Address -->
        <div v-if="order.address" class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
          <div class="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
            <MapPin class="h-4 w-4 text-gray-400" />
            <h2 class="text-sm font-semibold text-gray-900">Alamat Pengiriman</h2>
          </div>
          <div class="px-4 py-3 text-sm">
            <p class="font-medium text-gray-800">{{ order.address.name }} <span v-if="order.address.phone" class="text-gray-500">· {{ order.address.phone }}</span></p>
            <p class="text-xs text-gray-600">{{ order.address.address }}</p>
            <p class="text-xs text-gray-500">{{ order.address.district }}, {{ order.address.city }}, {{ order.address.province }} {{ order.address.zipcode }}</p>
          </div>
        </div>

        <!-- Shipment -->
        <div v-if="order.shipment" class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
          <div class="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
            <Truck class="h-4 w-4 text-gray-400" />
            <h2 class="text-sm font-semibold text-gray-900">Pengiriman</h2>
          </div>
          <div class="px-4 py-3 text-sm">
            <p class="text-gray-800">{{ [order.shipment.courier_name, order.shipment.service_name].filter(Boolean).join(' – ') }}</p>
            <p v-if="order.shipment.tracking_no" class="font-mono text-xs text-gray-500">{{ order.shipment.tracking_no }}</p>
          </div>
        </div>

        <!-- Info -->
        <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
          <div class="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
            <Building2 class="h-4 w-4 text-gray-400" />
            <h2 class="text-sm font-semibold text-gray-900">Info Order</h2>
          </div>
          <div class="space-y-1.5 px-4 py-3 text-xs text-gray-600">
            <p class="flex items-center gap-1.5"><Hash class="h-3 w-3 text-gray-400" /> {{ order.store?.shop_name || '-' }}</p>
            <p v-if="order.warehouse" class="flex items-center gap-1.5"><Box class="h-3 w-3 text-gray-400" /> {{ order.warehouse.name }}</p>
            <p class="flex items-center gap-1.5"><Weight class="h-3 w-3 text-gray-400" /> {{ order.weight }} g</p>
            <p v-if="isValidDate(order.date_due)" class="flex items-center gap-1.5"><Clock class="h-3 w-3 text-gray-400" /> Jatuh tempo: {{ formatDateTimeDay(order.date_due) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Konfirmasi Pembayaran (satu-satunya aksi) -->
    <AppCsPaymentConfirmModal
      :order="selectedOrderForPayment"
      @close="closePaymentModal"
      @success="onPaymentSuccess"
    />
  </div>
</template>
