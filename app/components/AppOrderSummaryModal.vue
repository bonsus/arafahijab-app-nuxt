<script setup lang="ts">
import { X, Loader2, Package, User, MapPin } from 'lucide-vue-next'
import { formatCurrency, formatDateTime } from '~/composables/useFormatters'

interface Props {
  orderId: string | null
}

const props = defineProps<Props>()
const emit = defineEmits(['close'])

const api = useApi()
const toast = useToast()

const loading = ref(false)
const order = ref<any>(null)

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-gray-50 text-gray-700 ring-gray-200' },
  processing: { label: 'Diproses', cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  shipped: { label: 'Dikirim', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  delivered: { label: 'Terkirim', cls: 'bg-teal-50 text-teal-700 ring-teal-200' },
  completed: { label: 'Selesai', cls: 'bg-green-50 text-green-700 ring-green-200' },
  cancelled: { label: 'Dibatalkan', cls: 'bg-red-50 text-red-700 ring-red-200' },
}

const paymentStatusConfig: Record<string, { label: string; cls: string }> = {
  unpaid: { label: 'Belum Bayar', cls: 'bg-red-50 text-red-700 ring-red-200' },
  paid: { label: 'Lunas', cls: 'bg-green-50 text-green-700 ring-green-200' },
  refunded: { label: 'Refund', cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
}

const remainingAmount = computed(() => {
  if (!order.value) return 0
  return Math.max(0, Number(order.value.grand_total || order.value.total) - Number(order.value.payment_total))
})

const fullAddress = computed(() => {
  const a = order.value?.address
  if (!a) return ''
  return [a.address, a.district, a.city, a.province, a.zipcode].filter(Boolean).join(', ')
})

function variantLabel(item: any): string {
  const v = item?.variants
  if (!v) return ''
  if (Array.isArray(v)) {
    return v
      .map((x: any) => (typeof x === 'string' ? x : x?.value))
      .filter(Boolean)
      .join(' / ')
  }
  if (typeof v === 'object') return Object.values(v).filter(Boolean).join(' / ')
  return ''
}

async function fetchOrder(id: string) {
  loading.value = true
  order.value = null
  try {
    const res = await api.get<{ data: any }>(`/sales/orders/${id}`)
    order.value = res.data
  } catch (err: any) {
    toast.error(err.message || 'Gagal memuat detail order')
    emit('close')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.orderId,
  (id) => {
    if (id) fetchOrder(id)
    else order.value = null
  },
  { immediate: true },
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="orderId"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="emit('close')"
    >
      <div class="flex w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl max-h-[90vh]" @click.stop>
        <!-- Header -->
        <div class="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Ringkasan Order</h3>
            <p v-if="order" class="font-mono text-xs text-primary-600">{{ order.no }}</p>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            @click="emit('close')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-20">
          <Loader2 class="h-8 w-8 animate-spin text-gray-400" />
        </div>

        <!-- Content -->
        <div v-else-if="order" class="space-y-4 overflow-y-auto p-6">
          <!-- Status badges -->
          <div class="flex flex-wrap items-center gap-1.5">
            <span
              class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1"
              :class="statusConfig[order.status]?.cls || 'bg-gray-50 text-gray-700 ring-gray-200'"
            >
              {{ statusConfig[order.status]?.label || order.status }}
            </span>
            <span
              class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1"
              :class="paymentStatusConfig[order.payment_status]?.cls || 'bg-gray-50 text-gray-700 ring-gray-200'"
            >
              {{ paymentStatusConfig[order.payment_status]?.label || order.payment_status }}
            </span>
            <span v-if="order.cod === 'yes'" class="inline-flex rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">COD</span>
            <span class="ml-auto text-xs text-gray-400">{{ formatDateTime(order.date_created) }}</span>
          </div>

          <!-- Customer & Address -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="rounded-lg bg-gray-50 p-3 ring-1 ring-gray-100">
              <div class="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <User class="h-3.5 w-3.5" /> Pelanggan
              </div>
              <p class="text-sm font-medium text-gray-900">{{ order.customer?.name || '-' }}</p>
              <p class="text-xs text-gray-500">{{ order.customer?.phone || '-' }}</p>
            </div>
            <div class="rounded-lg bg-gray-50 p-3 ring-1 ring-gray-100">
              <div class="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <MapPin class="h-3.5 w-3.5" /> Alamat Kirim
              </div>
              <template v-if="order.address">
                <p class="text-sm font-medium text-gray-900">{{ order.address.name }}</p>
                <p class="text-xs text-gray-500">{{ order.address.phone }}</p>
                <p class="mt-0.5 text-xs text-gray-600">{{ fullAddress }}</p>
              </template>
              <p v-else class="text-xs text-gray-400">Tidak ada alamat</p>
            </div>
          </div>

          <!-- Items -->
          <div class="rounded-lg ring-1 ring-gray-200">
            <div class="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-700">
              <Package class="h-4 w-4 text-primary-500" />
              Item
              <span class="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{{ order.items?.length || 0 }}</span>
            </div>
            <div class="divide-y divide-gray-100">
              <div v-for="item in order.items" :key="item.id" class="flex items-start justify-between gap-3 px-4 py-2.5">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-gray-900">{{ item.name }}</p>
                  <p class="text-xs text-gray-500">
                    <span v-if="variantLabel(item)">{{ variantLabel(item) }} · </span>{{ item.qty }} × Rp{{ formatCurrency(item.price) }}
                    <span v-if="item.is_free === 'yes'" class="ml-1 rounded bg-green-100 px-1 text-[10px] font-semibold text-green-700">Gratis</span>
                  </p>
                </div>
                <span class="shrink-0 text-sm font-semibold text-gray-900">Rp{{ formatCurrency(item.total) }}</span>
              </div>
              <div v-if="!order.items?.length" class="px-4 py-6 text-center text-xs text-gray-400">Tidak ada item</div>
            </div>
          </div>

          <!-- Summary -->
          <div class="space-y-1.5 rounded-lg bg-gray-50 p-4 text-sm ring-1 ring-gray-100">
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
              <span class="text-gray-900">Rp{{ formatCurrency(order.shipping_total ?? order.shipping_cost) }}</span>
            </div>
            <div v-if="Number(order.adjustment) !== 0" class="flex justify-between">
              <span class="text-gray-500">Penyesuaian</span>
              <span>{{ Number(order.adjustment) > 0 ? '+' : '-' }}Rp{{ formatCurrency(Math.abs(Number(order.adjustment))) }}</span>
            </div>
            <div v-if="Number(order.tax) > 0" class="flex justify-between">
              <span class="text-gray-500">Pajak</span>
              <span class="text-gray-900">Rp{{ formatCurrency(order.tax) }}</span>
            </div>
            <div class="flex justify-between border-t border-gray-200 pt-2">
              <span class="font-semibold text-gray-900">Total</span>
              <span class="font-bold text-gray-900">Rp{{ formatCurrency(order.grand_total ?? order.total) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Sudah Dibayar</span>
              <span class="font-medium" :class="Number(order.payment_total) > 0 ? 'text-green-600' : 'text-gray-400'">Rp{{ formatCurrency(order.payment_total) }}</span>
            </div>
            <div
              v-if="order.payment_status !== 'paid' && remainingAmount > 0"
              class="flex justify-between rounded-lg bg-red-50 px-3 py-2"
            >
              <span class="font-semibold text-red-700">Sisa Tagihan</span>
              <span class="font-bold text-red-700">Rp{{ formatCurrency(remainingAmount) }}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="shrink-0 border-t border-gray-200 px-6 py-3 text-right">
          <NuxtLink
            v-if="order"
            :to="`/sales/order/${order.id}`"
            class="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Lihat detail lengkap →
          </NuxtLink>
        </div>
      </div>
    </div>
  </Teleport>
</template>
