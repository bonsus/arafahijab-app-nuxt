<script setup lang="ts">
import { 
  ArrowLeft, Calendar, Edit2, Loader2, Package, Power, Tag, Trash2, 
  User, Clock, CheckCircle, AlertCircle, ShoppingCart,
  Image as ImageIcon, Percent, DollarSign, Box, ChevronDown, ChevronRight
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()
const { confirm: showConfirm } = useConfirm()

const discountId = computed(() => route.params.id as string)

const loading = ref(true)
const toggling = ref(false)
const deleting = ref(false)

interface Discount {
  id: string
  name: string
  date_start: string
  date_end: string
  tags: string
  discount_type: string
  item_type: string
  status: string
  status_label: string
  internal_visibility: string
  web_visibility: string
  app_visibility: string
  note?: string
  item_products?: ItemProduct[] 
  logs?: Log[]
  orders?: Order[]
  created_at: string
  updated_at: string
}

interface ItemProduct {
  id: string
  product_id: string
  name: string
  thumbnail: string
  price_min: string
  price_max: string
  prices: Price[]
  skus: SkuDetail[]
}

interface ItemProductSku {
  id: string
  product_id: string
  name: string
  skus: SkuDetail[]
}

interface SkuDetail {
  id: string
  sku_id: string
  sku: string
  thumbnail: string
  variants: Record<string, string>
  prices: Price[]
  price_min: string
  price_max: string
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
  note: string
  name: string
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
const expandedProducts = ref<Record<string, boolean>>({})

async function loadDiscount() {
  loading.value = true
  try {
    const res = await api.get(`/promotions/discounts/${discountId.value}`) as any
    discount.value = res.data
    if (discount.value){
      discount.value.status_label = statusLabel(discount.value.status)
    }
    
    // Initialize all products as expanded by default
    if (discount.value?.item_products) {
      discount.value.item_products.forEach(product => {
        expandedProducts.value[product.id] = true
      })
    }
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data diskon')
    router.push('/promotion/discount')
  }
  finally {
    loading.value = false
  }
}

function toggleProductExpand(productId: string) {
  expandedProducts.value[productId] = !expandedProducts.value[productId]
}

async function toggleStatus(status: string) {
  if (!discount.value) {
    toast.error('Data diskon tidak tersedia')
    return
  }
  
  toggling.value = true
  try {
    const res = await api.put(`/promotions/discounts/${discountId.value}/update-status`, 
      { status: status }
    ) as any
    
    if (discount.value) {
      discount.value.status = status
      discount.value.status_label = statusLabel(status)
    }
    
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
  const confirmed = await showConfirm({
    title: 'Hapus Diskon',
    message: 'Yakin ingin menghapus promosi diskon ini? Aksi ini tidak dapat dibatalkan.',
    confirmText: 'Hapus',
    cancelText: 'Batal',
    variant: 'danger'
  })
  
  if (!confirmed) return

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


function formatVariants(variants: any): string {
  if (!variants) return '-'
  
  // Handle array format: [{ name: "Warna", value: "Cappuccino" }]
  if (Array.isArray(variants)) {
    if (variants.length === 0) return '-'
    return variants.map(v => v.value || v.name || String(v)).join(' / ')
  }
  
  // Handle object format: { "Warna": "Cappuccino" }
  if (typeof variants === 'object') {
    const entries = Object.entries(variants)
    if (entries.length === 0) return '-'
    return entries.map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return (value as any).value || (value as any).name || String(value)
      }
      return String(value)
    }).join(' / ')
  }
  
  return String(variants)
}

function formatPrice(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('id-ID').format(num)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function statusLabel(status: string): string {
  if (!discount.value) return '-'
  if (status === 'inactive') return 'Tidak Aktif'
  else if (status === 'active') {
    if (new Date(discount.value.date_end) < new Date()) {
      return 'Berakhir'
    }
    else if (new Date(discount.value.date_start) > new Date()) {
      return 'Akan Datang'
    }
    else if (new Date(discount.value.date_start) <= new Date() && new Date(discount.value.date_end) >= new Date()) {
      return 'Berlangsung'
    }
  }
  return status || '-'
}

const statusColor = computed(() => {
  if (!discount.value) return 'gray'
  if (discount.value.status_label === 'Berlangsung') return 'green'
  if (discount.value.status_label === 'Berakhir') return 'red'
  if (discount.value.status_label === 'Akan Datang') return 'blue'
  if (discount.value.status_label === 'Tidak Aktif') return 'gray'
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
          :to="`/promotion/discount/create?edit=${discountId}`"
          class="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Edit2 class="h-4 w-4" />
          Edit
        </NuxtLink>
        <button
          :disabled="toggling"
          class="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          @click="discount && toggleStatus(discount.status === 'active' ? 'inactive' : 'active')"
        >
          <Loader2 v-if="toggling" class="h-4 w-4 animate-spin" />
          <Power v-else class="h-4 w-4" />
          {{ discount && discount.status === 'active' ? 'Nonaktifkan' : 'Aktifkan' }}
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
              <span v-if="discount.status_label" class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="{
                  'bg-green-100 text-green-700': statusColor === 'green',
                  'bg-red-100 text-red-700': statusColor === 'red',
                  'bg-gray-100 text-gray-700': statusColor === 'gray',
                  'bg-blue-100 text-blue-700': statusColor === 'blue',
                }">
                {{ discount.status_label }}
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
              <span v-if="discount.internal_visibility === 'active'" class="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                INT
              </span>
              <span v-if="discount.web_visibility === 'active'" class="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                WEB
              </span>
              <span v-if="discount.app_visibility === 'active'" class="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                APP
              </span>
              <span v-if="discount.internal_visibility !== 'active' && discount.web_visibility !== 'active' && discount.app_visibility !== 'active'" class="text-xs text-gray-400">
                Tidak ada
              </span>
            </div>
          </div>

          <div>
            <p class="mb-1.5 text-xs font-medium text-gray-500">Total Item</p>
            <p class="text-sm font-semibold text-gray-900">
              {{ discount.item_type === 'product' ? (discount.item_products?.length || 0) : (discount.item_products?.reduce((sum, p) => sum + p.skus.length, 0) || 0) }}
            </p>
          </div>

          <div v-if="discount.note">
            <p class="mb-1.5 text-xs font-medium text-gray-500">Catatan Internal</p>
            <p class="text-sm text-gray-700">{{ discount.note }}</p>
          </div>
          <div v-if="discount.tags">
            <p class="mb-1.5 text-xs font-medium text-gray-500">Tags</p>
            <p class="text-sm text-gray-700">{{ discount.tags }}</p>
          </div>
        </div>
      </div>

      <!-- Product Items -->
      <div v-if="discount.item_type === 'product' && discount.item_products?.length" class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div class="border-b border-gray-200 px-6 py-4">
          <div class="flex items-center gap-2">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 ring-1 ring-blue-200">
              <Package class="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-gray-900">Produk Diskon</h2>
              <p class="text-xs text-gray-500">{{ discount.item_products.length }} produk terdaftar</p>
            </div>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr class="border-b-2 border-gray-200 bg-gray-50">
                <th class="sticky left-0 z-10 min-w-[250px] bg-gray-50 px-4 py-3 font-semibold text-gray-700">Produk</th>
                <th v-for="price in discount.item_products[0]?.prices" :key="price.customer_category_id" class="px-4 py-3 text-center font-semibold text-gray-700">
                  <div class="flex flex-col">
                    <span>{{ price.customer_category_name }}</span>
                    <span class="text-xs font-normal text-gray-500 text-nowrap">Diskon {{ discount.discount_type === 'percentage' ? '(%)' : '(Rp)' }}</span>
                  </div>
                </th>
                <th class="px-4 py-3 text-center font-semibold text-gray-700">Min. Pembelian</th>
                <th class="px-4 py-3 text-center font-semibold text-gray-700">Max. Pembelian</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in discount.item_products"
                :key="item.id"
                class="border-b border-gray-100 hover:bg-gray-50"
              >
                <td class="sticky left-0 z-10 bg-white px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      <img
                        v-if="item.thumbnail"
                        :src="item.thumbnail"
                        class="h-full w-full object-cover"
                      />
                      <div v-else class="flex h-full w-full items-center justify-center">
                        <ImageIcon class="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                    <div class="min-w-0">
                      <p class="truncate font-medium text-gray-900">{{ item.name }}</p>
                      <p class="text-xs text-gray-500"> 
                        <span class="text-gray-700">
                          <span class="text-nowrap">Rp {{ formatPrice(item.price_min) }} - </span>
                          <span class="text-nowrap">Rp {{ formatPrice(item.price_max) }}</span>
                        </span>
                      </p>
                    </div>
                  </div>
                </td>  
                <td v-for="price in item.prices" :key="price.id" class="px-4 py-3 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <span class="text-xs">
                      {{ discount.discount_type === 'percentage' ? price.discount_value + "%" : "Rp " + formatPrice(price.discount_value) }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 text-center text-gray-700">{{ item.prices[0]?.min_qty || 0 }}</td>
                <td class="px-4 py-3 text-center text-gray-700">{{ item.prices[0]?.max_qty || '∞' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SKU Items -->
      <div v-if="discount.item_type === 'sku' && discount.item_products?.length" class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div class="border-b border-gray-200 px-6 py-4">
          <div class="flex items-center gap-2">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 ring-1 ring-purple-200">
              <Box class="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-gray-900">SKU Diskon</h2>
              <p class="text-xs text-gray-500">
                {{ discount.item_products.reduce((sum, p) => sum + p.skus.length, 0) }} SKU terdaftar
              </p>
            </div>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr class="border-b-2 border-gray-200 bg-gray-50">
                <th class="sticky left-0 z-10 min-w-[250px] bg-gray-50 px-4 py-3 font-semibold text-gray-700">Produk / SKU</th>
                <th v-for="price in discount.item_products[0]?.skus[0]?.prices" :key="price.customer_category_id" class="px-4 py-3 text-center font-semibold text-gray-700">
                  <div class="flex flex-col">
                    <span>{{ price.customer_category_name }}</span>
                    <span class="text-xs font-normal text-gray-500">Diskon {{ discount.discount_type === 'percentage' ? '(%)' : '(Rp)' }}</span>
                  </div>
                </th>
                <th class="px-4 py-3 text-center font-semibold text-gray-700">Min. Pembelian</th>
                <th class="px-4 py-3 text-center font-semibold text-gray-700">Max. Pembelian</th>
                <th class="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="productGroup in discount.item_products" :key="productGroup.id">
                <!-- Product Parent Row -->
                <tr class="border-b border-gray-200 bg-gray-100">
                  <td class="sticky left-0 z-10 bg-gray-100 px-4 py-2.5 cursor-pointer" :colspan="(productGroup.skus[0]?.prices?.length || 0) + 4" @click="toggleProductExpand(productGroup.id)">
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="rounded p-0.5 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
                      >
                        <ChevronDown v-if="expandedProducts[productGroup.id]" class="h-4 w-4" />
                        <ChevronRight v-else class="h-4 w-4" />
                      </button>
                      <Package class="h-4 w-4 text-gray-600" />
                      <span class="font-semibold text-gray-900">{{ productGroup.name }}</span>
                      <span class="rounded-full bg-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {{ productGroup.skus.length }} SKU
                      </span>
                    </div>
                  </td>
                </tr>
                <!-- SKU Child Rows -->
                <template v-if="expandedProducts[productGroup.id]">
                  <tr
                    v-for="sku in productGroup.skus"
                    :key="sku.id"
                    class="border-b border-gray-100 hover:bg-gray-50"
                  >
                  <td class="sticky left-0 z-10 bg-white px-4 py-3">
                    <div class="flex items-center gap-3 pl-6"> 
                      <div class="min-w-0">
                        <p class="truncate font-mono text-xs text-gray-900 font-medium">
                          {{ sku.sku }}
                          <span class="truncate text-xs text-gray-500">{{ formatVariants(sku.variants) }}</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td v-for="price in sku.prices" :key="price.id" class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                      <span class="text-xs text-nowrap">
                        {{ discount.discount_type === 'percentage' ? price.discount_value + '%' : 'Rp ' + formatPrice(price.discount_value) }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-center text-gray-700">{{ sku.prices[0]?.min_qty || 0 }}</td>
                  <td class="px-4 py-3 text-center text-gray-700">{{ sku.prices[0]?.max_qty || '∞' }}</td>
                  <td class="px-4 py-3 text-center">
                    <span
                      class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                      :class="{
                        'bg-green-50 text-green-700 ring-1 ring-green-200': sku.prices[0]?.status === 'active',
                        'bg-gray-50 text-gray-600 ring-1 ring-gray-200': sku.prices[0]?.status !== 'active',
                      }"
                    >
                      <component :is="sku.prices[0]?.status === 'active' ? CheckCircle : AlertCircle" class="h-3 w-3" />
                      {{ sku.prices[0]?.status === 'active' ? 'Aktif' : 'Tidak Aktif' }}
                    </span>
                  </td>
                </tr>
                </template>
              </template>
            </tbody>
          </table>
        </div>
      </div> 
      <!-- Related Orders -->
      <div v-if="discount.orders?.length" class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div class="border-b border-gray-200 px-6 py-4">
          <div class="flex items-center gap-2">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 ring-1 ring-green-200">
              <ShoppingCart class="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-gray-900">Order Terkait</h2>
              <p class="text-xs text-gray-500">{{ discount.orders.length }} order menggunakan promo ini</p>
            </div>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50">
                <th class="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">No. Order</th>
                <th class="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">Customer</th>
                <th class="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">Total</th>
                <th class="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Status</th>
                <th class="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">Tanggal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="order in discount.orders"
                :key="order.id"
                class="transition-colors hover:bg-gray-50"
              >
                <td class="px-6 py-4">
                  <span class="font-mono text-xs font-semibold text-primary-600">{{ order.order_number }}</span>
                </td>
                <td class="px-6 py-4 font-medium text-gray-900">{{ order.customer_name }}</td>
                <td class="px-6 py-4 font-semibold text-gray-900">Rp {{ formatPrice(order.total) }}</td>
                <td class="px-6 py-4 text-center">
                  <span class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                    <CheckCircle class="h-3 w-3" />
                    {{ order.status }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-1.5 text-xs text-gray-600">
                    <Calendar class="h-3.5 w-3.5 text-gray-400" />
                    {{ formatDate(order.created_at) }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Activity Logs -->
      <div v-if="discount.logs?.length" class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div class="border-b border-gray-200 px-5 py-3.5">
          <h2 class="text-sm font-semibold text-gray-900">Riwayat Aktivitas ({{ discount.logs.length }})</h2>
        </div>
        <div class="divide-y divide-gray-100">
          <div
            v-for="log in discount.logs"
            :key="log.id"
            class="flex items-start gap-3 px-5 py-3"
          >
            <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <Clock class="h-3 w-3 text-gray-400" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs text-gray-900">
                <span class="font-medium">{{ log.name }}</span>
                <span class="text-gray-500"> — {{ log.action }}</span>
              </p>
              <p v-if="log.note" class="text-xs text-gray-500">{{ log.note }}</p>
              <p class="text-xs text-gray-400">{{ formatDateTime(log.created_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
