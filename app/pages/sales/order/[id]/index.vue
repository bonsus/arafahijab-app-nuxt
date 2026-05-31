<script setup lang="ts">
import {
  ArrowLeft, Pencil, Trash2, Loader2,
  ShoppingCart, MapPin, Truck, Package,
  ChevronDown, UserCircle, FileText, Clock,
  CheckCircle, XCircle, AlertCircle,
} from 'lucide-vue-next'
import type { SalesOrder } from '~/types'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const router = useRouter()
const route = useRoute()

const orderId = computed(() => route.params.id as string)

const loading = ref(true)
const order = ref<SalesOrder | null>(null)
const showAllItems = ref(false)

// Modals
const showShipmentModal = ref(false)
const showAddressModal = ref(false)
const showDetailModal = ref(false)

function openShipmentModal() {
  showShipmentModal.value = true
}

function openAddressModal() {
  showAddressModal.value = true
}

function openDetailModal() {
  showDetailModal.value = true
}

function closeModals() {
  showShipmentModal.value = false
  showAddressModal.value = false
  showDetailModal.value = false
}

async function onModalSuccess() {
  await fetchOrder()
  closeModals()
}

const statusConfig: Record<string, { label: string; icon: any; cls: string }> = {
  pending: { label: 'Pending', icon: Clock, cls: 'text-yellow-600 bg-yellow-50 ring-yellow-200' },
  processing: { label: 'Diproses', icon: AlertCircle, cls: 'text-blue-600 bg-blue-50 ring-blue-200' },
  shipped: { label: 'Dikirim', icon: Truck, cls: 'text-purple-600 bg-purple-50 ring-purple-200' },
  delivered: { label: 'Diterima', icon: CheckCircle, cls: 'text-teal-600 bg-teal-50 ring-teal-200' },
  completed: { label: 'Selesai', icon: CheckCircle, cls: 'text-green-600 bg-green-50 ring-green-200' },
  cancelled: { label: 'Dibatalkan', icon: XCircle, cls: 'text-red-600 bg-red-50 ring-red-200' },
}

const paymentStatusConfig: Record<string, { label: string; cls: string }> = {
  unpaid: { label: 'Belum Bayar', cls: 'text-red-600 bg-red-50 ring-red-200' },
  paid: { label: 'Lunas', cls: 'text-green-600 bg-green-50 ring-green-200' },
  refunded: { label: 'Refund', cls: 'text-orange-600 bg-orange-50 ring-orange-200' },
}

const codLabel = (cod: string) => cod === 'yes' ? 'COD' : 'Non-COD'

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
}

const visibleItems = computed(() => {
  const all = order.value?.items || []
  return showAllItems.value ? all : all.slice(0, 5)
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
    message: `Hapus order "${order.value?.no}"? Stok yang terkait akan di-unlock otomatis.`,
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

function getVariantText(variants: Record<string, string> | string[]): string {
  if (!variants) return ''
  if (Array.isArray(variants)) return variants.join(', ')
  if (typeof variants === 'object') return Object.values(variants).join(', ')
  return ''
}

onMounted(fetchOrder)
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-wrap items-center gap-3">
      <NuxtLink
        to="/sales/order"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <div class="flex-1">
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
          {{ loading ? 'Memuat...' : (order?.no || 'Detail Order') }}
        </h1>
        <p v-if="order?.customer" class="text-sm text-gray-500">{{ order.customer.name }}</p>
      </div>

      <template v-if="order">
        <NuxtLink
          v-if="order.status === 'pending'"
          :to="`/sales/order/create?edit=${order.id}`"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Pencil class="h-4 w-4" />
          Edit
        </NuxtLink>
        <button
          v-if="order.status === 'pending'"
          class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          @click="handleDelete"
        >
          <Trash2 class="h-4 w-4" />
          Hapus
        </button>
      </template>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="grid gap-5 lg:grid-cols-12">
      <div class="space-y-4 lg:col-span-4">
        <div v-for="i in 3" :key="i" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-24 animate-pulse rounded bg-gray-200" />
          <div class="mt-4 space-y-3">
            <div v-for="j in 4" :key="j" class="h-4 w-full animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
      <div class="space-y-4 lg:col-span-8">
        <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div class="border-b border-gray-100 px-5 py-4">
            <div class="h-4 w-28 animate-pulse rounded bg-gray-200" />
          </div>
          <div class="p-5 space-y-3">
            <div v-for="i in 4" :key="i" class="h-12 w-full animate-pulse rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
    </div>

    <template v-else-if="order">
      <div class="grid gap-5 lg:grid-cols-12">
        <!-- LEFT (4/12) -->
        <div class="space-y-4 lg:col-span-4">

          <!-- Status badges -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div class="flex flex-wrap gap-2">
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1"
                :class="statusConfig[order.status]?.cls || 'bg-gray-50 text-gray-600 ring-gray-200'"
              >
                <component :is="statusConfig[order.status]?.icon || FileText" class="h-4 w-4" />
                {{ statusConfig[order.status]?.label || order.status }}
              </span>
              <span
                class="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ring-1"
                :class="paymentStatusConfig[order.payment_status]?.cls || 'bg-gray-50 text-gray-600 ring-gray-200'"
              >
                {{ paymentStatusConfig[order.payment_status]?.label || order.payment_status }}
              </span>
              <span v-if="order.cod === 'yes'" class="inline-flex items-center rounded-full bg-orange-100 px-3 py-1.5 text-sm font-medium text-orange-700 ring-1 ring-orange-200">
                COD
              </span>
              <span v-if="order.preorder === 'yes'" class="inline-flex items-center rounded-full bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-blue-200">
                Preorder
              </span>
              <span v-if="order.source" class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200">
                {{ order.source }}
              </span>
            </div>
          </div>

          <!-- Order Info -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ShoppingCart class="h-4 w-4 text-primary-500" />
                Informasi Order
              </h2>
              <button
                v-if="order.status === 'pending'"
                class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600"
                title="Edit Detail"
                @click="openDetailModal"
              >
                <Pencil class="h-4 w-4" />
              </button>
            </div>
            <div class="space-y-2.5 text-sm">
              <div>
                <p class="text-xs text-gray-400">No. Order</p>
                <p class="font-medium text-gray-900">{{ order.no }}</p>
              </div>
              <div v-if="order.external_id">
                <p class="text-xs text-gray-400">External ID</p>
                <p class="text-gray-700">{{ order.external_id }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Tanggal Order</p>
                <p class="text-gray-700">{{ formatDate(order.date_created) }}</p>
              </div>
              <div v-if="order.date_due && !order.date_due.startsWith('0001')">
                <p class="text-xs text-gray-400">Jatuh Tempo</p>
                <p class="text-gray-700">{{ formatDate(order.date_due) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Pembayaran</p>
                <p class="text-gray-700">{{ codLabel(order.cod) }} · {{ paymentProviderLabel[order.payment_provider] || order.payment_provider }} · {{ paymentMethodLabel[order.payment_method] || order.payment_method }}</p>
              </div>
              <div v-if="order.note">
                <p class="text-xs text-gray-400">Catatan Internal</p>
                <p class="text-gray-700">{{ order.note }}</p>
              </div>
              <div v-if="order.customer_note">
                <p class="text-xs text-gray-400">Catatan Pelanggan</p>
                <p class="text-gray-700">{{ order.customer_note }}</p>
              </div>
              <div v-if="order.tags">
                <p class="text-xs text-gray-400">Tags</p>
                <div class="mt-1 flex flex-wrap gap-1">
                  <span
                    v-for="tag in order.tags"
                    :key="tag"
                    class="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                  >
                    {{ tag.trim() }}
                  </span>
                </div>
              </div>
              <div v-if="order.store">
                <p class="text-xs text-gray-400">Toko</p>
                <p class="text-gray-700">{{ order.store.name }}</p>
              </div>
              <div v-if="order.warehouse">
                <p class="text-xs text-gray-400">Gudang</p>
                <p class="text-gray-700">{{ order.warehouse.name }}</p>
              </div>
            </div>
          </div>

          <!-- Customer -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <UserCircle class="h-4 w-4 text-primary-500" />
              Pelanggan
            </h2>
            <div class="space-y-1.5 text-sm">
              <p class="font-medium text-gray-900">{{ order.customer?.name || '-' }}</p>
              <p v-if="order.customer?.phone" class="text-gray-500">{{ order.customer.phone }}</p>
              <p v-if="order.customer_category" class="text-xs text-blue-600">{{ order.customer_category.name }}</p>
            </div>
          </div>

          <!-- Shipping Address -->
          <div v-if="order.address" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <MapPin class="h-4 w-4 text-primary-500" />
                Alamat Pengiriman
              </h2>
              <button
                v-if="order.status === 'pending'"
                class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600"
                title="Edit Alamat"
                @click="openAddressModal"
              >
                <Pencil class="h-4 w-4" />
              </button>
            </div>
            <div class="space-y-1 text-sm text-gray-700">
              <p class="font-medium text-gray-900">{{ order.address.name }}</p>
              <p>{{ order.address.phone }}</p>
              <p>{{ order.address.address }}</p>
              <p>{{ [order.address.district, order.address.city, order.address.province].filter(Boolean).join(', ') }}</p>
              <p v-if="order.address.zipcode">{{ order.address.zipcode }}</p>
            </div>
          </div>

          <!-- Shipment -->
          <div v-if="order.shipment" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Truck class="h-4 w-4 text-primary-500" />
                Pengiriman
              </h2>
              <button
                v-if="order.status === 'pending'"
                class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600"
                title="Edit Pengiriman"
                @click="openShipmentModal"
              >
                <Pencil class="h-4 w-4" />
              </button>
            </div>
            <div class="space-y-1.5 text-sm">
              <p class="font-medium text-gray-900">{{ order.shipment.courier_name }} – {{ order.shipment.service_name }}</p>
              <p class="text-gray-500">{{ order.shipment.service_code }}</p>
              <div class="flex items-center justify-between border-t border-gray-100 pt-2">
                <span class="text-gray-400 text-xs">Ongkir</span>
                <span class="font-medium text-gray-900">Rp{{ formatCurrency(order.shipment.price) }}</span>
              </div>
              <div v-if="Number(order.shipment.discount) > 0" class="flex items-center justify-between">
                <span class="text-gray-400 text-xs">Diskon Ongkir</span>
                <span class="text-green-600">-Rp{{ formatCurrency(order.shipment.discount) }}</span>
              </div>
              <div v-if="order.shipment.tracking_no" class="pt-1">
                <p class="text-xs text-gray-400">No. Resi</p>
                <p class="font-medium text-gray-900">{{ order.shipment.tracking_no }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT (8/12) -->
        <div class="space-y-4 lg:col-span-8">

          <!-- Items -->
          <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="border-b border-gray-100 px-5 py-4">
              <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Package class="h-4 w-4 text-primary-500" />
                Item Produk ({{ order.items?.length || 0 }})
              </h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th class="px-4 py-2.5 text-left">Produk</th>
                    <th class="px-4 py-2.5 text-center">Qty</th>
                    <th class="px-4 py-2.5 text-right">Harga</th>
                    <th class="px-4 py-2.5 text-right">Diskon</th>
                    <th class="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in visibleItems"
                    :key="item.id"
                    class="border-b border-gray-100 last:border-b-0"
                  >
                    <td class="px-4 py-3">
                      <p class="font-medium text-gray-900 line-clamp-2">{{ item.name }}</p>
                      <div class="flex flex-wrap items-center gap-1.5 text-xs">
                        <span class="text-gray-500">{{ item.sku }}</span>
                        <span class="rounded bg-gray-100 px-1 py-0.5 text-[10px]">
                          {{ getVariantText(item.variants) }}
                        </span>
                        <span v-if="item.is_free === 'yes'" class="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                          Gratis
                        </span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center">{{ item.qty }}</td>
                    <td class="px-4 py-3 text-right whitespace-nowrap">Rp{{ formatCurrency(item.price) }}</td>
                    <td class="px-4 py-3 text-right whitespace-nowrap">
                      {{ Number(item.discount) > 0 ? `-Rp${formatCurrency(item.discount)}` : '-' }}
                    </td>
                    <td class="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                      Rp{{ formatCurrency(item.total) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="!order.items?.length" class="px-4 py-8 text-center text-sm text-gray-400">
              Tidak ada item
            </div>

            <div v-if="(order.items?.length || 0) > 5" class="border-t border-gray-100 px-4 py-2.5 text-center">
              <button
                class="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                @click="showAllItems = !showAllItems"
              >
                <ChevronDown class="h-4 w-4 transition-transform" :class="showAllItems ? 'rotate-180' : ''" />
                {{ showAllItems ? 'Sembunyikan' : `Lihat selengkapnya (${(order.items?.length || 0) - 5} item lagi)` }}
              </button>
            </div>
          </div>

          <!-- Summary -->
          <div class="ml-auto max-w-sm rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-3 text-sm font-semibold text-gray-900">Ringkasan</h2>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Subtotal</span>
                <span class="text-gray-900">Rp{{ formatCurrency(order.subtotal) }}</span>
              </div>
              <div v-if="Number(order.discount) > 0" class="flex justify-between">
                <span class="text-gray-500">Diskon</span>
                <span class="text-green-600">-Rp{{ formatCurrency(order.discount) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Ongkir</span>
                <span class="text-gray-900">Rp{{ formatCurrency(order.shipping_cost) }}</span>
              </div>
              <div v-if="Number(order.tax) > 0" class="flex justify-between">
                <span class="text-gray-500">Pajak</span>
                <span class="text-gray-900">Rp{{ formatCurrency(order.tax) }}</span>
              </div>
              <div v-if="Number(order.adjustment) !== 0" class="flex justify-between">
                <span class="text-gray-500">Penyesuaian</span>
                <span>{{ Number(order.adjustment) >= 0 ? '+' : '' }}Rp{{ formatCurrency(order.adjustment) }}</span>
              </div>
              <div class="flex justify-between border-t border-gray-200 pt-2">
                <span class="font-semibold text-gray-900">Total</span>
                <span class="font-bold text-gray-900">Rp{{ formatCurrency(order.total) }}</span>
              </div>
              <div v-if="Number(order.grand_total) !== Number(order.total)" class="flex justify-between">
                <span class="text-gray-500">Grand Total</span>
                <span class="font-bold text-primary-600">Rp{{ formatCurrency(order.grand_total) }}</span>
              </div>
            </div>
          </div>

          <!-- Activity Log -->
          <div v-if="order.logs?.length" class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="border-b border-gray-100 px-5 py-4">
              <h2 class="text-sm font-semibold text-gray-900">Aktivitas</h2>
            </div>
            <div class="divide-y divide-gray-100">
              <div
                v-for="log in order.logs"
                :key="log.id"
                class="flex items-start gap-3 px-5 py-3"
              >
                <div class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <FileText class="h-3.5 w-3.5 text-gray-500" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-sm font-medium text-gray-900">{{ logActionLabel[log.action] || log.action }}</p>
                    <p class="text-xs text-gray-400 whitespace-nowrap">{{ formatDateTime(log.created_at) }}</p>
                  </div>
                  <p class="text-xs text-gray-500">{{ log.note }}</p>
                  <p class="text-xs text-gray-400">oleh {{ log.name }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Modals -->
    <AppOrderShipmentModal
      v-if="showShipmentModal"
      :order-id="orderId"
      :order="order"
      @close="closeModals"
      @success="onModalSuccess"
    />
    <AppOrderAddressModal
      v-if="showAddressModal"
      :order-id="orderId"
      :address="order?.address ?? null"
      @close="closeModals"
      @success="onModalSuccess"
    />
    <AppOrderDetailModal
      v-if="showDetailModal"
      :order-id="orderId"
      :detail="order"
      @close="closeModals"
      @success="onModalSuccess"
    />
  </div>
</template>
