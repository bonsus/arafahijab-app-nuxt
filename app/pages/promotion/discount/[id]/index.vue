<script setup lang="ts">
import { ArrowLeft, Calendar, Edit2, Loader2, Package, Power, Tag, Trash2, User } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const discountId = computed(() => route.params.id as string)

const loading = ref(true)
const toggling = ref(false)
const deleting = ref(false)

interface Discount {
  id: string
  name: string
  date_start: string
  date_end: string
  discount_type: string
  item_type: string
  status: string
  internal_visibility: boolean
  web_visibility: boolean
  app_visibility: boolean
  item_products?: ItemProduct[]
  item_product_skus?: ItemProductSku[]
  logs?: Log[]
  orders?: Order[]
  created_at: string
  updated_at: string
}

interface ItemProduct {
  id: string
  product_id: string
  product_name: string
  product_thumbnail: string
  prices: Price[]
}

interface ItemProductSku {
  id: string
  product_id: string
  product_name: string
  skus: SkuDetail[]
}

interface SkuDetail {
  id: string
  sku_id: string
  sku_code: string
  sku_thumbnail: string
  sku_variants: Record<string, string>
  prices: Price[]
}

interface Price {
  id: string
  customer_category_id: string
  customer_category_name: string
  discount_value: string
  min_qty: number
  max_qty: number
  status: string
}

interface Log {
  id: string
  action: string
  description: string
  user_name: string
  created_at: string
}

interface Order {
  id: string
  order_number: string
  customer_name: string
  total: string
  status: string
  created_at: string
}

const discount = ref<Discount | null>(null)

async function loadDiscount() {
  loading.value = true
  try {
    const res = await api.get(`/promotions/discounts/${discountId.value}`) as any
    discount.value = res.data
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data diskon')
    router.push('/promotion/discount')
  }
  finally {
    loading.value = false
  }
}

async function toggleStatus() {
  if (!discount.value) return
  
  toggling.value = true
  try {
    const res = await api.put(`/promotions/discounts/${discountId.value}/update-status`) as any
    discount.value.status = res.data.status
    toast.success('Status berhasil diubah')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status')
  }
  finally {
    toggling.value = false
  }
}

async function handleDelete() {
  if (!confirm('Yakin ingin menghapus promosi diskon ini? Aksi ini tidak dapat dibatalkan.')) {
    return
  }

  deleting.value = true
  try {
    await api.delete(`/promotions/discounts/${discountId.value}`)
    toast.success('Promosi diskon berhasil dihapus')
    router.push('/promotion/discount')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus promosi diskon')
  }
  finally {
    deleting.value = false
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatPrice(price: string): string {
  return new Intl.NumberFormat('id-ID').format(Number(price))
}

function formatVariants(variants: Record<string, string>): string {
  return Object.values(variants).join(' / ')
}

function isExpired(): boolean {
  if (!discount.value) return false
  return new Date(discount.value.date_end) < new Date()
}

function isUpcoming(): boolean {
  if (!discount.value) return false
  return new Date(discount.value.date_start) > new Date()
}

const statusColor = computed(() => {
  if (!discount.value) return 'gray'
  if (discount.value.status === 'active') return 'green'
  if (discount.value.status === 'inactive') return 'red'
  return 'gray'
})

const discountTypeLabel = computed(() => {
  if (!discount.value) return '-'
  return discount.value.discount_type === 'percentage' ? 'Persentase (%)' : 'Nominal (Rp)'
})

const itemTypeLabel = computed(() => {
  if (!discount.value) return '-'
  return discount.value.item_type === 'product' ? 'Produk' : 'SKU'
})

onMounted(() => {
  loadDiscount()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/promotion/discount"
          class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft class="h-5 w-5" />
        </NuxtLink>
        <div v-if="!loading && discount">
          <h1 class="text-2xl font-bold text-gray-900">{{ discount.name }}</h1>
          <p class="mt-0.5 text-sm text-gray-500">Detail promosi diskon</p>
        </div>
        <div v-else class="h-9 w-64 animate-pulse rounded-lg bg-gray-200" />
      </div>

      <div v-if="!loading && discount" class="flex items-center gap-2">
        <NuxtLink
          :to="`/promotion/discount/${discountId}/edit`"
          class="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Edit2 class="h-4 w-4" />
          Edit
        </NuxtLink>
        <button
          :disabled="toggling"
          class="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          @click="toggleStatus"
        >
          <Loader2 v-if="toggling" class="h-4 w-4 animate-spin" />
          <Power v-else class="h-4 w-4" />
          {{ discount.status === 'active' ? 'Nonaktifkan' : 'Aktifkan' }}
        </button>
        <button
          :disabled="deleting"
          class="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          @click="handleDelete"
        >
          <Loader2 v-if="deleting" class="h-4 w-4 animate-spin" />
          <Trash2 v-else class="h-4 w-4" />
          Hapus
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-4">
      <div class="h-32 animate-pulse rounded-xl bg-gray-100" />
      <div class="h-96 animate-pulse rounded-xl bg-gray-100" />
    </div>

    <!-- Content -->
    <div v-else-if="discount" class="space-y-6">
      <!-- Overview Card -->
      <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p class="mb-1.5 text-xs font-medium text-gray-500">Status</p>
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="{
                  'bg-green-100 text-green-700': statusColor === 'green',
                  'bg-red-100 text-red-700': statusColor === 'red',
                  'bg-gray-100 text-gray-700': statusColor === 'gray',
                }"
              >
                {{ discount.status.toUpperCase() }}
              </span>
              <span v-if="isExpired()" class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                Kadaluarsa
              </span>
              <span v-else-if="isUpcoming()" class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-600">
                Mendatang
              </span>
            </div>
          </div>

          <div>
            <p class="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Calendar class="h-3.5 w-3.5" />
              Periode
            </p>
            <p class="text-sm font-semibold text-gray-900">
              {{ formatDate(discount.date_start) }} - {{ formatDate(discount.date_end) }}
            </p>
          </div>

          <div>
            <p class="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Tag class="h-3.5 w-3.5" />
              Tipe Diskon
            </p>
            <p class="text-sm font-semibold text-gray-900">{{ discountTypeLabel }}</p>
          </div>

          <div>
            <p class="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Package class="h-3.5 w-3.5" />
              Target Item
            </p>
            <p class="text-sm font-semibold text-gray-900">{{ itemTypeLabel }}</p>
          </div>

          <div>
            <p class="mb-1.5 text-xs font-medium text-gray-500">Visibilitas</p>
            <div class="flex flex-wrap gap-1.5">
              <span v-if="discount.internal_visibility" class="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                INT
              </span>
              <span v-if="discount.web_visibility" class="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                WEB
              </span>
              <span v-if="discount.app_visibility" class="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                APP
              </span>
              <span v-if="!discount.internal_visibility && !discount.web_visibility && !discount.app_visibility" class="text-xs text-gray-400">
                Tidak ada
              </span>
            </div>
          </div>

          <div>
            <p class="mb-1.5 text-xs font-medium text-gray-500">Total Item</p>
            <p class="text-sm font-semibold text-gray-900">
              {{ discount.item_type === 'product' ? (discount.item_products?.length || 0) : (discount.item_product_skus?.reduce((sum, p) => sum + p.skus.length, 0) || 0) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Product Items -->
      <div v-if="discount.item_type === 'product' && discount.item_products?.length" class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 class="mb-4 text-base font-semibold text-gray-900">Produk Diskon</h2>
        <div class="space-y-4">
          <div
            v-for="item in discount.item_products"
            :key="item.id"
            class="rounded-lg border border-gray-200 p-4"
          >
            <!-- Product Header -->
            <div class="mb-3 flex items-center gap-3">
              <img
                v-if="item.product_thumbnail"
                :src="item.product_thumbnail"
                class="h-14 w-14 rounded bg-gray-100 object-cover"
              />
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-gray-900">{{ item.product_name }}</p>
                <p class="text-xs text-gray-500">{{ item.prices.length }} harga diskon</p>
              </div>
            </div>

            <!-- Prices Table -->
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead>
                  <tr class="border-b border-gray-200 text-xs text-gray-500">
                    <th class="pb-2 pr-3 font-medium">Kategori Customer</th>
                    <th class="pb-2 pr-3 font-medium">Diskon</th>
                    <th class="pb-2 pr-3 font-medium">Min Qty</th>
                    <th class="pb-2 pr-3 font-medium">Max Qty</th>
                    <th class="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="price in item.prices"
                    :key="price.id"
                    class="border-b border-gray-100 last:border-0"
                  >
                    <td class="py-2 pr-3 font-medium text-gray-900">{{ price.customer_category_name }}</td>
                    <td class="py-2 pr-3 font-semibold text-primary-600">
                      {{ discount.discount_type === 'percentage' ? `${price.discount_value}%` : `Rp ${formatPrice(price.discount_value)}` }}
                    </td>
                    <td class="py-2 pr-3 text-gray-600">{{ price.min_qty }}</td>
                    <td class="py-2 pr-3 text-gray-600">{{ price.max_qty || 'Unlimited' }}</td>
                    <td class="py-2">
                      <span
                        class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                        :class="{
                          'bg-green-100 text-green-700': price.status === 'active',
                          'bg-gray-100 text-gray-600': price.status === 'inactive',
                        }"
                      >
                        {{ price.status === 'active' ? 'Aktif' : 'Tidak Aktif' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- SKU Items -->
      <div v-if="discount.item_type === 'sku' && discount.item_product_skus?.length" class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 class="mb-4 text-base font-semibold text-gray-900">SKU Diskon</h2>
        <div class="space-y-6">
          <div
            v-for="productGroup in discount.item_product_skus"
            :key="productGroup.id"
          >
            <!-- Product Group Header -->
            <h3 class="mb-3 text-sm font-semibold text-gray-700">{{ productGroup.product_name }}</h3>
            
            <div class="space-y-4">
              <div
                v-for="sku in productGroup.skus"
                :key="sku.id"
                class="rounded-lg border border-gray-200 p-4"
              >
                <!-- SKU Header -->
                <div class="mb-3 flex items-center gap-3">
                  <img
                    v-if="sku.sku_thumbnail"
                    :src="sku.sku_thumbnail"
                    class="h-14 w-14 rounded bg-gray-100 object-cover"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="font-semibold text-gray-900">{{ sku.sku_code }}</p>
                    <p class="text-xs text-gray-500">
                      {{ formatVariants(sku.sku_variants) }} &middot; {{ sku.prices.length }} harga diskon
                    </p>
                  </div>
                </div>

                <!-- Prices Table -->
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-sm">
                    <thead>
                      <tr class="border-b border-gray-200 text-xs text-gray-500">
                        <th class="pb-2 pr-3 font-medium">Kategori Customer</th>
                        <th class="pb-2 pr-3 font-medium">Diskon</th>
                        <th class="pb-2 pr-3 font-medium">Min Qty</th>
                        <th class="pb-2 pr-3 font-medium">Max Qty</th>
                        <th class="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="price in sku.prices"
                        :key="price.id"
                        class="border-b border-gray-100 last:border-0"
                      >
                        <td class="py-2 pr-3 font-medium text-gray-900">{{ price.customer_category_name }}</td>
                        <td class="py-2 pr-3 font-semibold text-primary-600">
                          {{ discount.discount_type === 'percentage' ? `${price.discount_value}%` : `Rp ${formatPrice(price.discount_value)}` }}
                        </td>
                        <td class="py-2 pr-3 text-gray-600">{{ price.min_qty }}</td>
                        <td class="py-2 pr-3 text-gray-600">{{ price.max_qty || 'Unlimited' }}</td>
                        <td class="py-2">
                          <span
                            class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                            :class="{
                              'bg-green-100 text-green-700': price.status === 'active',
                              'bg-gray-100 text-gray-600': price.status === 'inactive',
                            }"
                          >
                            {{ price.status === 'active' ? 'Aktif' : 'Tidak Aktif' }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Activity Logs -->
      <div v-if="discount.logs?.length" class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 class="mb-4 text-base font-semibold text-gray-900">Riwayat Aktivitas</h2>
        <div class="space-y-3">
          <div
            v-for="log in discount.logs"
            :key="log.id"
            class="flex items-start gap-3 rounded-lg border border-gray-100 p-3"
          >
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <User class="h-4 w-4 text-gray-600" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900">{{ log.action }}</p>
              <p class="mt-0.5 text-xs text-gray-600">{{ log.description }}</p>
              <p class="mt-1 text-xs text-gray-400">
                {{ log.user_name }} &middot; {{ formatDateTime(log.created_at) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Related Orders -->
      <div v-if="discount.orders?.length" class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 class="mb-4 text-base font-semibold text-gray-900">Order Terkait</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-gray-200 text-xs text-gray-500">
                <th class="pb-3 pr-3 font-medium">No. Order</th>
                <th class="pb-3 pr-3 font-medium">Customer</th>
                <th class="pb-3 pr-3 font-medium">Total</th>
                <th class="pb-3 pr-3 font-medium">Status</th>
                <th class="pb-3 font-medium">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="order in discount.orders"
                :key="order.id"
                class="border-b border-gray-100 last:border-0"
              >
                <td class="py-3 pr-3 font-mono text-xs font-semibold text-gray-900">{{ order.order_number }}</td>
                <td class="py-3 pr-3 text-gray-900">{{ order.customer_name }}</td>
                <td class="py-3 pr-3 font-semibold text-gray-900">Rp {{ formatPrice(order.total) }}</td>
                <td class="py-3 pr-3">
                  <span class="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {{ order.status }}
                  </span>
                </td>
                <td class="py-3 text-xs text-gray-600">{{ formatDate(order.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
