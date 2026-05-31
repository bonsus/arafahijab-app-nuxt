<script setup lang="ts">
import { 
  ArrowLeft, Calendar, Edit2, Loader2, Package, Power, Tag, Trash2, 
  Clock, CheckCircle, AlertCircle, Ticket, Users, Info,
  Globe, Smartphone, Building2, Percent, Box, ShoppingBag,
  MapPin, Truck
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()
const { confirm: showConfirm } = useConfirm()

const promotionId = computed(() => route.params.id as string)
const promoType = computed(() => route.params.type as string)

const loading = ref(true)
const toggling = ref(false)
const deleting = ref(false)
const activeTab = ref('overview')

interface Promotion {
  id: string
  name: string
  date_start: string
  date_end: string
  tags: string
  discount_type: string
  discount_value: number
  max_discount_value: number
  min_spend: number
  min_qty: number
  terms: string
  item_type: string
  item_operator: string
  status: string
  status_label: string
  public: string
  internal_visibility: string
  web_visibility: string
  app_visibility: string
  note?: string
  coupon_count: number
  max_use: number
  used: number
  max_use_per_customer: number
  coupons?: Coupon[]
  customer_categories?: CustomerCategory[]
  product_categories?: ProductCategory[]
  products?: Product[]
  // product_skus?: ProductSku[]
  logs?: Log[]
  courier_type?: string
  area_type?: string
  couriers?: PromotionCourier[]
  areas?: PromotionArea[]
  created_at: string
  updated_at: string
}

interface PromotionArea {
  province: string
  city: string
}

interface PromotionCourierService {
  service_name: string
  service_code: string
  status: string
}

interface PromotionCourier {
  courier_name: string
  courier_code: string
  services: PromotionCourierService[]
}

interface Coupon {
  id: string
  code: string
  max_use: number
  max_use_per_customer: number
  used: number 
}

interface CustomerCategory {
  id: string
  name: string
  description: string
}

interface ProductCategory {
  id: string
  name: string
  qty: number
}

interface Product {
  id: string
  name: string
  thumbnail: string
  qty: number
  skus: ProductSku[]
}

interface ProductSku {
  id: string
  sku: string
  sku_code: string
  variants: Record<string, string>
  thumbnail: string
  qty: number
}

interface Log {
  id: string
  action: string
  note: string
  name: string
  created_at: string
}

const promotion = ref<Promotion | null>(null)
const orders = ref<any[]>([])
const ordersLoading = ref(false)
const ordersPage = ref(1)
const ordersTotal = ref(0)

async function loadPromotion() {
  loading.value = true
  try {
    const res = await api.get(`/promotions/checkouts/${promotionId.value}`) as any
    promotion.value = res.data
    if (promotion.value) {
      promotion.value.status_label = statusLabel(promotion.value.status)
    }
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data promosi')
    router.push(`/promotion/${promoType.value}`)
  }
  finally {
    loading.value = false
  }
}

async function loadOrders() {
  ordersLoading.value = true
  try {
    const res = await api.get(`/promotions/checkouts/${promotionId.value}/orders`) as any
    
    orders.value = res.data?.data || []
    ordersTotal.value = res.data?.total || 0
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data order')
  }
  finally {
    ordersLoading.value = false
  }
}

async function toggleStatus(status: string) {
  if (!promotion.value) {
    toast.error('Data promosi tidak tersedia')
    return
  }
  
  toggling.value = true
  try {
    await api.put(`/promotions/checkouts/${promotionId.value}/update-status`, { status })
    
    if (promotion.value) {
      promotion.value.status = status
      promotion.value.status_label = statusLabel(status)
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
    title: 'Hapus Promosi',
    message: 'Yakin ingin menghapus promosi ini? Aksi ini tidak dapat dibatalkan.',
    confirmText: 'Hapus',
    cancelText: 'Batal',
    variant: 'danger'
  })
  
  if (!confirmed) return

  deleting.value = true
  try {
    await api.delete(`/promotions/checkouts/${promotionId.value}`)
    toast.success('Promosi berhasil dihapus')
    router.push(`/promotion/${promoType.value}`)
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus promosi')
  }
  finally {
    deleting.value = false
  }
}

function formatVariants(variants: any): string {
  if (!variants) return '-'
  
  if (Array.isArray(variants)) {
    if (variants.length === 0) return '-'
    return variants.map(v => v.value || v.name || String(v)).join(' / ')
  }
  
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
  if (!promotion.value) return '-'
  if (status === 'inactive') return 'Tidak Aktif'
  else if (status === 'active') {
    if (new Date(promotion.value.date_end) < new Date()) {
      return 'Berakhir'
    }
    else if (new Date(promotion.value.date_start) > new Date()) {
      return 'Akan Datang'
    }
    else if (new Date(promotion.value.date_start) <= new Date() && new Date(promotion.value.date_end) >= new Date()) {
      return 'Berlangsung'
    }
  }
  return status || '-'
}

const groupedAreas = computed(() => {
  if (!promotion.value?.areas) return {}
  const groups: Record<string, { cities: string[] }> = {}
  for (const area of promotion.value.areas) {
    if (!groups[area.province]) {
      groups[area.province] = { cities: [] }
    }
    if (area.city) {
      groups[area.province]!.cities.push(area.city)
    }
  }
  return groups
})

const statusColor = computed(() => {
  if (!promotion.value) return 'gray'
  if (promotion.value.status_label === 'Berlangsung') return 'green'
  if (promotion.value.status_label === 'Berakhir') return 'red'
  if (promotion.value.status_label === 'Akan Datang') return 'blue'
  if (promotion.value.status_label === 'Tidak Aktif') return 'gray'
  return 'gray'
})

const discountTypeLabel = computed(() => {
  if (!promotion.value) return '-'
  return promotion.value.discount_type === 'percentage' ? 'Persentase (%)' : 'Nominal (Rp)'
})

const itemTypeLabel = computed(() => {
  if (!promotion.value) return '-'
  const labels: Record<string, string> = {
    all: 'Semua Produk',
    category: 'Kategori Produk',
    product: 'Produk Spesifik',
    sku: 'SKU Spesifik'
  }
  return labels[promotion.value.item_type] || promotion.value.item_type
})

const discountValueDisplay = computed(() => {
  if (!promotion.value) return '-'
  if (promotion.value.discount_type === 'percentage') {
    return `${promotion.value.discount_value}%`
  }
  return `Rp ${formatPrice(promotion.value.discount_value)}`
})

function formatLogAction(action: string): string {
  const map: Record<string, string> = {
    created: 'Dibuat',
    updated: 'Diperbarui',
    status_updated: 'Status Diperbarui',
    deleted: 'Dihapus',
    coupon_added: 'Kupon Ditambahkan',
    coupon_removed: 'Kupon Dihapus',
  }
  return map[action] || action
}

watch(activeTab, (newTab) => {
  if (newTab === 'orders' && orders.value.length === 0) {
    loadOrders()
  }
})

onMounted(() => {
  loadPromotion()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-center gap-3">
        <NuxtLink
          :to="`/promotion/${promoType}`"
          class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft class="h-5 w-5" />
        </NuxtLink>
        <div v-if="!loading && promotion">
          <h1 class="text-2xl font-bold text-gray-900">{{ promotion.name }}</h1>
          <p class="mt-0.5 text-sm text-gray-500">Detail promosi</p>
        </div>
        <div v-else class="h-9 w-64 animate-pulse rounded-lg bg-gray-200" />
      </div>

      <div v-if="!loading && promotion" class="flex items-center gap-2">
        <NuxtLink
          :to="`/promotion/${promoType}/create?edit=${promotionId}`"
          class="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Edit2 class="h-4 w-4" />
          Edit
        </NuxtLink>
        <button
          :disabled="toggling"
          class="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          @click="promotion && toggleStatus(promotion.status === 'active' ? 'inactive' : 'active')"
        >
          <Loader2 v-if="toggling" class="h-4 w-4 animate-spin" />
          <Power v-else class="h-4 w-4" />
          {{ promotion && promotion.status === 'active' ? 'Nonaktifkan' : 'Aktifkan' }}
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
    <div v-else-if="promotion" class="space-y-6">
      <!-- Overview Card -->
      <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p class="mb-1.5 text-xs font-medium text-gray-500">Status</p>
            <div class="flex items-center gap-2">
              <span 
                v-if="promotion.status_label" 
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="{
                  'bg-green-100 text-green-700': statusColor === 'green',
                  'bg-red-100 text-red-700': statusColor === 'red',
                  'bg-gray-100 text-gray-700': statusColor === 'gray',
                  'bg-blue-100 text-blue-700': statusColor === 'blue',
                }"
              >
                {{ promotion.status_label }}
              </span>
            </div>
          </div>

          <div>
            <p class="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Calendar class="h-3.5 w-3.5" />
              Periode
            </p>
            <p class="text-sm font-semibold text-gray-900">
              {{ formatDateTime(promotion.date_start) }}
            </p>
            <p class="text-xs text-gray-500">
              s/d {{ formatDateTime(promotion.date_end) }}
            </p>
          </div>

          <div>
            <p class="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Ticket class="h-3.5 w-3.5" />
              Penggunaan Kupon
            </p>
            <p class="text-sm font-semibold text-gray-900">
              {{ promotion.used }} / {{ promotion.max_use > 0 ? promotion.max_use : '∞' }}
            </p>
            <p class="text-xs text-gray-500">
              {{ promotion.coupons?.length || 0 }} kode kupon
            </p>
            <p class="text-xs text-gray-500">
              {{ promotion.max_use_per_customer > 0 ? promotion.max_use_per_customer : '∞' }} penggunaan per pelanggan
            </p>
          </div>

          <div>
            <p class="mb-1.5 text-xs font-medium text-gray-500">Visibilitas</p>
            <div class="flex flex-wrap gap-1.5">
              <span v-if="promotion.public === 'active'" class="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                PUBLIC
              </span>
              <span v-if="promotion.internal_visibility === 'active'" class="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                INT
              </span>
              <span v-if="promotion.web_visibility === 'active'" class="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                WEB
              </span>
              <span v-if="promotion.app_visibility === 'active'" class="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                APP
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200 overflow-x-auto overflow-y-hidden">
        <nav class="-mb-px flex space-x-6">
          <button
            class="border-b-2 px-1 py-3 text-sm font-medium transition-colors"
            :class="activeTab === 'overview' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'"
            @click="activeTab = 'overview'"
          >
            Ringkasan
          </button> 
          <button
            class="border-b-2 px-1 py-3 text-sm font-medium transition-colors"
            :class="activeTab === 'syarat' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'"
            @click="activeTab = 'syarat'"
          >
            Syarat
          </button>
          <button
            class="border-b-2 px-1 py-3 text-sm font-medium transition-colors"
            :class="activeTab === 'orders' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'"
            @click="activeTab = 'orders'"
          >
            Order
          </button>
          <button
            class="border-b-2 px-1 py-3 text-sm font-medium transition-colors"
            :class="activeTab === 'logs' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'"
            @click="activeTab = 'logs'"
          >
            Log
          </button>
        </nav>
      </div>

      <!-- Tab Content: Overview -->
      <div v-if="activeTab === 'overview'" class="space-y-6">
        <!-- Diskon -->
        <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h3 class="mb-4 text-lg font-semibold text-gray-900">Konfigurasi Diskon</h3>
          <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt class="text-sm font-medium text-gray-500">Tipe Diskon</dt>
              <dd class="mt-1 text-sm font-semibold text-gray-900">{{ discountTypeLabel }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Nilai Diskon</dt>
              <dd class="mt-1 text-sm font-semibold text-gray-900">{{ discountValueDisplay }}</dd>
            </div>
            <div v-if="promotion.discount_type === 'percentage' && promotion.max_discount_value">
              <dt class="text-sm font-medium text-gray-500">Maksimal Diskon</dt>
              <dd class="mt-1 text-sm font-semibold text-gray-900">Rp {{ formatPrice(promotion.max_discount_value) }}</dd>
            </div>
            <div v-if="promotion.min_spend">
              <dt class="text-sm font-medium text-gray-500">Minimum Belanja</dt>
              <dd class="mt-1 text-sm font-semibold text-gray-900">Rp {{ formatPrice(promotion.min_spend) }}</dd>
            </div>
            <div v-if="promotion.min_qty">
              <dt class="text-sm font-medium text-gray-500">Minimum Qty</dt>
              <dd class="mt-1 text-sm font-semibold text-gray-900">{{ promotion.min_qty }} item</dd>
            </div>
            <div v-if="promotion.tags">
              <dt class="text-sm font-medium text-gray-500">Tags</dt>
              <dd class="mt-1 flex flex-wrap gap-1">
                <span 
                  v-for="tag in promotion.tags.split(',')" 
                  :key="tag"
                  class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                >
                  {{ tag.trim() }}
                </span>
              </dd>
            </div>
          </dl>
          <div v-if="promotion.terms" class="mt-4">
            <dt class="text-sm font-medium text-gray-500">Syarat & Ketentuan</dt>
            <dd class="mt-1 text-sm text-gray-700">{{ promotion.terms }}</dd>
          </div>
          <div v-if="promotion.note" class="mt-4">
            <dt class="text-sm font-medium text-gray-500">Catatan Internal</dt>
            <dd class="mt-1 text-sm text-gray-700">{{ promotion.note }}</dd>
          </div>
        </div>
        <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 p-3 sm:p-6">
          <div class="pb-6">
            <h3 class="text-lg font-semibold text-gray-900">Daftar Kupon</h3>
            <p class="mt-1 text-sm text-gray-500">Kode kupon yang dapat digunakan pelanggan</p>
          </div>
          
          <div v-if="promotion.coupons && promotion.coupons.length > 0" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div
              v-for="coupon in promotion.coupons"
              :key="coupon.id"
              :class="{                
                'ring-red-500/50 hover:ring-red-500 bg-red-50 hover:bg-red-100': coupon.used >= coupon.max_use && coupon.max_use > 0, 
                'ring-yellow-500/50 hover:ring-yellow-500 bg-yellow-50 hover:bg-yellow-100': coupon.used > 0 && (coupon.max_use === 0 || coupon.used < coupon.max_use),
              }"
              class="flex items-center justify-between px-6 py-3 rounded-lg ring-1 ring-gray-200"
            >
              <div class="flex items-center gap-4">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
                  <Ticket class="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p class="font-mono text-sm font-bold text-gray-900">{{ coupon.code }}</p>
                  <p class="mt-0.5 text-xs text-gray-500">
                    Digunakan: {{ coupon.used || 0 }} / {{ coupon.max_use || '∞' }}
                  </p> 
                </div>
              </div> 
            </div>
          </div>
          <p v-else class="p-6 text-center text-sm text-gray-500">Tidak ada kupon</p>
        </div>
      </div>
 

      <!-- Tab Content: Syarat -->
      <div v-if="activeTab === 'syarat'" class="space-y-6">

        <template v-if="promoType=='shipping'">
          <!-- Courier -->  
          <div v-if="promotion.couriers && promotion.courier_type === 'specific'" class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Truck class="h-5 w-5 text-gray-400" />
              Syarat Kurir
            </h3>
            <div v-if="promotion.couriers.length > 0" class="space-y-3">
              <div
                v-for="courier in promotion.couriers"
                :key="courier.courier_code"
                class="rounded-lg border border-gray-200 p-4"
              >
                <p class="mb-2 text-sm font-semibold text-gray-900">{{ courier.courier_name }}</p>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="service in courier.services"
                    :key="service.service_code"
                    class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    :class="service.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 line-through'"
                  >
                    {{ service.service_name }}
                  </span>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500">Tidak ada kurir</p>
          </div>
          <div v-else-if="promotion.courier_type === 'all'" class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h3 class="mb-2 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Truck class="h-5 w-5 text-gray-400" />
              Syarat Kurir
            </h3>
            <p class="text-sm text-gray-500">Berlaku untuk semua kurir</p>
          </div>

          <!-- Area -->
          <div v-if="promotion.areas && promotion.area_type === 'specific'" class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <MapPin class="h-5 w-5 text-gray-400" />
              Syarat Area
            </h3>
            <div v-if="promotion.areas.length > 0" class="space-y-2">
              <template v-for="(group, province) in groupedAreas" :key="province">
                <div class="rounded-lg border border-gray-200 p-3">
                  <p class="text-sm font-semibold text-gray-900">{{ province }}</p>
                  <div v-if="group.cities.length > 0" class="mt-1.5 flex flex-wrap gap-1.5">
                    <span
                      v-for="city in group.cities"
                      :key="city"
                      class="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                    >
                      {{ city }}
                    </span>
                  </div>
                  <p v-else class="mt-1 text-xs text-gray-400">Seluruh provinsi</p>
                </div>
              </template>
            </div>
            <p v-else class="text-sm text-gray-500">Tidak ada area</p>
          </div>
          <div v-else-if="promotion.area_type === 'all'" class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h3 class="mb-2 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <MapPin class="h-5 w-5 text-gray-400" />
              Syarat Area
            </h3>
            <p class="text-sm text-gray-500">Berlaku untuk semua area</p>
          </div>
        </template>

        <!-- Customer Categories -->
        <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"> 
          <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Users class="h-5 w-5 text-gray-400" />
            Syarat Kategori Customer
          </h3>
          <div v-if="promotion.customer_categories && promotion.customer_categories.length > 0" class="space-y-2">
            <div
              v-for="category in promotion.customer_categories"
              :key="category.id"
              class="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
            >
              <Users class="h-4 w-4 text-gray-400" />
              <div>
                <p class="text-sm font-medium text-gray-900">{{ category.name }}</p>
                <p v-if="category.description" class="text-xs text-gray-500">{{ category.description }}</p>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-gray-500">Tidak ada kategori customer</p>
        </div>

        <!-- Item Configuration -->
        <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Box class="h-5 w-5 text-gray-400" />
            Syarat Produk
          </h3> 
          <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div v-if="promotion.item_type == 'all'">
              <p class="text-sm text-gray-500">Berlaku untuk semua produk</p>
            </div>
            <template v-else>
              <div>
                <dt class="text-sm font-medium text-gray-500">Tipe Produk</dt>
                <dd class="mt-1 text-sm font-semibold text-gray-900">{{ itemTypeLabel }}</dd> 
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Operator</dt>
                <dd class="mt-1">
                  <span class="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                    {{ promotion.item_operator.toUpperCase() }}
                    <span class="text-gray-500">
                      {{ promotion.item_operator === 'or' ? '(Salah satu)' : '(Semua)' }}
                    </span>
                  </span>
                </dd>
              </div>
            </template>
          </dl>
        </div>

        <!-- Item Listing -->
        <div v-if="promotion.item_type !== 'all'" class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h3 class="mb-4 text-lg font-semibold text-gray-900">Produk yang Berlaku</h3>

          <!-- All Products -->
          <div v-if="promotion.item_type === 'all'" class="rounded-lg border border-gray-200 p-4 text-center">
            <Package class="mx-auto h-12 w-12 text-gray-400" />
            <p class="mt-2 text-sm font-medium text-gray-900">Berlaku untuk Semua Produk</p>
            <p class="text-xs text-gray-500">Promosi ini dapat digunakan untuk semua produk</p>
          </div>

          <!-- Product Categories -->
          <div v-else-if="promotion.item_type === 'category' && promotion.product_categories" class="space-y-2">
            <div
              v-for="category in promotion.product_categories"
              :key="category.id"
              class="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
            >
              <Tag class="h-4 w-4 text-gray-400" />
              <p class="text-sm font-medium text-gray-900">{{ category.name }}</p>
              <span class="ml-auto text-xs text-gray-500">
                {{ category.qty ? `Min Qty: ${category.qty}` : 'Qty tidak ditentukan' }}
              </span>
            </div>
            <p v-if="!promotion.product_categories.length" class="text-center text-sm text-gray-500 py-4">
              Tidak ada kategori
            </p>
          </div>

          <!-- Products -->
          <div v-else-if="promotion.item_type === 'product' && promotion.products" class="space-y-2">
            <div v-if ="promotion.products.length > 0"
              v-for="product in promotion.products"
              :key="product.id"
              class="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
            >
              <Img 
                v-if="product.thumbnail"
                :src="product.thumbnail"
                alt="Thumbnail"
                class="h-6 w-6 rounded-md object-cover"
              />
              <Tag v-else class="h-4 w-4 text-gray-400" />
              <p class="text-sm font-medium text-gray-900">{{ product.name }}</p>
              <span class="ml-auto text-xs text-gray-500">
                {{ product.qty ? `Min Qty: ${product.qty}` : 'Qty tidak ditentukan' }}
              </span>
            </div>
            <p v-else class="text-center text-sm text-gray-500 py-4">
              Tidak ada produk
            </p>
          </div>

          <!-- SKUs -->
          <div v-else-if="promotion.item_type === 'sku' && promotion.products" class="space-y-2">
            <div v-if="promotion.products.length > 0" class="space-y-3">
              <div
                v-for="product in promotion.products"
                :key="product.id"
                class="rounded-lg border border-gray-200 p-3"
              >
                <h4 class="mb-2 text-sm font-semibold text-gray-900">
                  {{ product.name }}
                </h4>
                <!-- table -->
                <table class="w-full text-left text-xs">
                  <thead>
                    <tr class="border-b border-gray-300">
                      <th class="px-2 py-1 text-gray-500">SKU</th>
                      <th class="px-2 py-1 text-gray-500">Varian</th>
                      <th class="px-2 py-1 text-gray-500 text-center">Min Qty</th>
                      <th class="px-2 py-1 w-4" />
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="sku in product.skus" :key="sku.id" class="border-b border-gray-100">
                      <td class="px-2 py-1">
                        <div class="flex items-center gap-3">
                          <div class="h-6 w-6 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-gray-200">
                            <img
                              v-if="sku.thumbnail"
                              :src="sku.thumbnail"
                              :alt="sku.sku"
                              class="h-full w-full object-cover"
                            >
                            <Box v-else class="h-full w-full p-1 text-gray-400" />
                          </div>
                          <p class="font-mono text-gray-800">
                            {{ sku.sku }}
                          </p>
                        </div>
                      </td>
                      <td class="px-2 py-1 text-gray-500">
                        {{ formatVariants(sku.variants) }}
                      </td>
                      <td class="px-2 py-1 text-center">
                        {{ sku.qty || '-' }}
                      </td> 
                    </tr>
                  </tbody>
                </table> 
              </div>
            </div>
            <p v-else class="text-center text-sm text-gray-500 py-4">
              Tidak ada SKU
            </p>
          </div>
        </div>
      </div>

      <!-- Tab Content: Orders -->
      <div v-if="activeTab === 'orders'">
        <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div class="p-6">
            <h3 class="text-lg font-semibold text-gray-900">Order yang Menggunakan Promosi</h3>
            <p class="mt-1 text-sm text-gray-500">Daftar transaksi yang menggunakan promosi ini</p>
          </div>
          
          <div v-if="ordersLoading" class="p-6">
            <div class="flex items-center justify-center py-12">
              <Loader2 class="h-8 w-8 animate-spin text-primary-600" />
            </div>
          </div>
          
          <div v-else-if="orders.length > 0" class="divide-y divide-gray-200">
            <div
              v-for="order in orders"
              :key="order.id"
              class="flex items-center justify-between p-6 hover:bg-gray-50"
            >
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                  <ShoppingBag class="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p class="font-medium text-gray-900">{{ order.no }}</p>
                  <p class="text-sm text-gray-500">{{ order.customer_name }}</p>
                  <p class="text-xs text-gray-400">{{ formatDateTime(order.date) }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm font-semibold text-gray-900">
                  Rp {{ formatPrice(order.total) }}
                </p>
                <p class="text-xs text-green-600">
                  Diskon: Rp {{ formatPrice(order.discount_value || 0) }}
                </p>
              </div>
            </div>
          </div>
          <p v-else class="p-6 text-center text-sm text-gray-500">
            Belum ada order yang menggunakan promosi ini
          </p>
        </div>
      </div>

      <!-- Tab Content: Logs -->
      <div v-if="activeTab === 'logs'">
        <div v-if="promotion.logs && promotion.logs.length > 0" class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
          <div class="border-b border-gray-200 px-5 py-3.5">
            <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Clock class="h-4 w-4 text-gray-400" />
              Riwayat Aktivitas
            </h2>
          </div>
          <div class="divide-y divide-gray-100">
            <div
              v-for="log in promotion.logs"
              :key="log.id"
              class="flex items-start gap-3 px-5 py-3"
            >
              <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
                <Clock class="h-3 w-3 text-gray-400" />
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
        </div>
        <div v-else class="rounded-xl bg-white px-5 py-8 text-center shadow-xs ring-1 ring-gray-200">
          <p class="text-sm text-gray-500">Tidak ada log aktivitas</p>
        </div>
      </div>
    </div>
  </div>
</template>
