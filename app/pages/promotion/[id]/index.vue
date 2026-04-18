<script setup lang="ts">
import {
  ArrowLeft, Pencil, Tag, Calendar, Ticket, Users,
  Truck, MapPin, Package, ToggleLeft, ToggleRight,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const api = useApi()
const toast = useToast()

const promoId = route.params.id as string

const typeLabels: Record<string, string> = {
  discount: 'Diskon Produk',
  checkout: 'Diskon Checkout',
  product_free: 'Produk Gratis',
  shipping: 'Diskon Ongkir',
}

const backRoutes: Record<string, string> = {
  discount: '/promotion/discount',
  checkout: '/promotion/checkout',
  product_free: '/promotion/free-product',
  shipping: '/promotion/shipping',
}

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Aktif', color: 'bg-green-100 text-green-700' },
  inactive: { label: 'Nonaktif', color: 'bg-gray-100 text-gray-500' },
  draft: { label: 'Draft', color: 'bg-yellow-100 text-yellow-700' },
}

const loading = ref(true)
const promo = ref<any>(null)

function formatPrice(val: number): string {
  return new Intl.NumberFormat('id-ID').format(val)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function isExpired(): boolean {
  return promo.value && new Date(promo.value.end_date) < new Date()
}

function isUpcoming(): boolean {
  return promo.value && new Date(promo.value.start_date) > new Date()
}

const backRoute = computed(() => backRoutes[promo.value?.type] || '/promotion/discount')

async function loadPromotion() {
  loading.value = true
  try {
    const res = await api.get<{ data: any }>(`/sales/promotions/${promoId}`)
    promo.value = res.data
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data promosi')
  }
  finally {
    loading.value = false
  }
}

async function toggleStatus() {
  if (!promo.value) return
  const newStatus = promo.value.status === 'active' ? 'inactive' : 'active'
  try {
    await api.put(`/sales/promotions/${promoId}/update-status`, { status: newStatus })
    promo.value.status = newStatus
    toast.success(`Status diubah ke ${statusConfig[newStatus]?.label || newStatus}`)
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status')
  }
}

onMounted(() => {
  loadPromotion()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink
          :to="backRoute"
          class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft class="h-5 w-5" />
        </NuxtLink>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Detail Promosi</h1>
          <p v-if="promo" class="mt-0.5 text-sm text-gray-500">{{ typeLabels[promo.type] || promo.type }}</p>
        </div>
      </div>
      <NuxtLink
        v-if="promo"
        :to="`/promotion/${promoId}/edit`"
        class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
      >
        <Pencil class="h-4 w-4" />
        Edit Promosi
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-6">
      <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div class="animate-pulse space-y-4">
          <div class="h-5 w-48 rounded bg-gray-200" />
          <div class="h-4 w-64 rounded bg-gray-200" />
          <div class="grid grid-cols-2 gap-4">
            <div class="h-4 rounded bg-gray-200" />
            <div class="h-4 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="promo">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- ═══ LEFT (2/3) ═══ -->
        <div class="space-y-6 lg:col-span-2">
          <!-- Info Card -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <div class="mb-4 flex items-start justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-900">{{ promo.name }}</h2>
                <p v-if="promo.description" class="mt-1 text-sm text-gray-500">{{ promo.description }}</p>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="statusConfig[promo.status]?.color || 'bg-gray-100 text-gray-500'"
                >
                  {{ statusConfig[promo.status]?.label || promo.status }}
                </span>
                <button
                  class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  title="Toggle Status"
                  @click="toggleStatus"
                >
                  <ToggleRight v-if="promo.status === 'active'" class="h-5 w-5 text-green-500" />
                  <ToggleLeft v-else class="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt class="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <Calendar class="h-3.5 w-3.5" />
                  Periode
                </dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">
                  {{ formatDate(promo.start_date) }}
                  <br />
                  <span class="text-gray-400">s/d</span> {{ formatDate(promo.end_date) }}
                </dd>
                <span
                  v-if="isExpired()"
                  class="mt-1 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                >
                  Expired
                </span>
                <span
                  v-else-if="isUpcoming()"
                  class="mt-1 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                >
                  Upcoming
                </span>
              </div>
              <div v-if="promo.coupon_code">
                <dt class="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <Ticket class="h-3.5 w-3.5" />
                  Kode Kupon
                </dt>
                <dd class="mt-1 font-mono text-sm font-semibold text-gray-900">{{ promo.coupon_code }}</dd>
              </div>
            </dl>
          </div>

          <!-- Discount Detail Card -->
          <div v-if="promo.type !== 'product_free'" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Diskon</h2>
            <dl class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <dt class="text-xs font-medium text-gray-500">Tipe Diskon</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">
                  {{ promo.discount_type === 'percentage' ? 'Persentase' : 'Nominal Tetap' }}
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500">Nilai Diskon</dt>
                <dd class="mt-1 text-sm font-semibold text-gray-900">
                  {{ promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `Rp ${formatPrice(promo.discount_value)}` }}
                </dd>
              </div>
              <div v-if="promo.max_discount_value">
                <dt class="text-xs font-medium text-gray-500">Maks. Potongan</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">Rp {{ formatPrice(promo.max_discount_value) }}</dd>
              </div>
            </dl>
          </div>

          <!-- Conditions Card -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Ketentuan</h2>
            <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div v-if="promo.type !== 'shipping'">
                <dt class="text-xs font-medium text-gray-500">Target Produk</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">{{ promo.item_type === 'all' ? 'Semua Produk' : 'Produk Tertentu' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500">Target Customer</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">{{ promo.customer_type === 'all' ? 'Semua Customer' : 'Customer Tertentu' }}</dd>
              </div>
              <div v-if="promo.min_spend">
                <dt class="text-xs font-medium text-gray-500">Min. Belanja</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">Rp {{ formatPrice(promo.min_spend) }}</dd>
              </div>
              <div v-if="promo.min_qty">
                <dt class="text-xs font-medium text-gray-500">Min. Qty</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">{{ promo.min_qty }}</dd>
              </div>
              <div v-if="promo.max_use">
                <dt class="text-xs font-medium text-gray-500">Maks. Penggunaan</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">{{ promo.max_use }}x total</dd>
              </div>
              <div v-if="promo.max_use_per_customer">
                <dt class="text-xs font-medium text-gray-500">Maks. Per Customer</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">{{ promo.max_use_per_customer }}x</dd>
              </div>
              <div v-if="promo.type === 'product_free'">
                <dt class="text-xs font-medium text-gray-500">Multiple Use</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">{{ promo.multiple_use ? 'Ya' : 'Tidak' }}</dd>
              </div>
              <div v-if="promo.type === 'product_free' && promo.item_operator">
                <dt class="text-xs font-medium text-gray-500">Operator Item</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">{{ promo.item_operator === 'and' ? 'Semua harus terpenuhi (AND)' : 'Salah satu cukup (OR)' }}</dd>
              </div>
            </dl>
            <div v-if="promo.terms" class="mt-4 border-t border-gray-100 pt-4">
              <dt class="mb-1 text-xs font-medium text-gray-500">Syarat & Ketentuan</dt>
              <dd class="text-sm text-gray-700">{{ promo.terms }}</dd>
            </div>
          </div>

          <!-- Items Card -->
          <div v-if="promo.items?.length" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Package class="h-4 w-4 text-gray-400" />
              Item Promo ({{ promo.items.length }})
            </h2>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th class="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">Role</th>
                    <th class="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">Product ID</th>
                    <th class="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">SKU ID</th>
                    <th class="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">Kategori ID</th>
                    <th class="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">Diskon</th>
                    <th class="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">Qty</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="item in promo.items" :key="item.id" class="hover:bg-gray-50/50">
                    <td class="whitespace-nowrap px-3 py-2">
                      <span
                        class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                        :class="item.item_role === 'reward' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'"
                      >
                        {{ item.item_role === 'reward' ? 'Hadiah' : 'Syarat' }}
                      </span>
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-600">{{ item.product_id || '-' }}</td>
                    <td class="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-600">{{ item.sku_id || '-' }}</td>
                    <td class="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-600">{{ item.product_category_id || '-' }}</td>
                    <td class="whitespace-nowrap px-3 py-2 text-gray-700">
                      <template v-if="item.discount_value">{{ item.discount_value }}</template>
                      <template v-else>-</template>
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-gray-700">
                      {{ item.min_qty || 0 }}–{{ item.max_qty || '∞' }}
                      <template v-if="item.qty"> (gratis: {{ item.qty }})</template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Customers Card -->
          <div v-if="promo.customers?.length" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Users class="h-4 w-4 text-gray-400" />
              Target Customer ({{ promo.customers.length }})
            </h2>

            <!-- Kategori Customer -->
            <div v-if="promo.customers.filter((c: any) => c.customer_category_id && !c.customer_id).length" class="mb-4">
              <h3 class="mb-2 text-sm font-semibold text-gray-700">Kategori Customer</h3>
              <div class="space-y-2">
                <div
                  v-for="cust in promo.customers.filter((c: any) => c.customer_category_id && !c.customer_id)"
                  :key="cust.customer_category_id"
                  class="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-2.5 text-sm"
                >
                  <span class="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Kategori</span>
                  <span class="font-mono text-xs text-gray-600">{{ cust.customer_category_id }}</span>
                </div>
              </div>
            </div>

            <!-- Customer Individual -->
            <div v-if="promo.customers.filter((c: any) => c.customer_id).length">
              <h3 class="mb-2 text-sm font-semibold text-gray-700">Customer Individual</h3>
              <div class="space-y-2">
                <div
                  v-for="cust in promo.customers.filter((c: any) => c.customer_id)"
                  :key="cust.customer_id"
                  class="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2.5 text-sm"
                >
                  <span class="inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">Customer</span>
                  <span class="font-mono text-xs text-gray-600">{{ cust.customer_id }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Couriers Card -->
          <div v-if="promo.couriers?.length" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Truck class="h-4 w-4 text-gray-400" />
              Kurir ({{ promo.couriers.length }})
            </h2>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="c in promo.couriers"
                :key="c.id"
                class="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-sm ring-1 ring-gray-200"
              >
                <span class="font-semibold text-gray-900">{{ c.courier_name }}</span>
                <span class="text-gray-400">{{ c.courier_service }}</span>
              </span>
            </div>
          </div>

          <!-- Areas Card -->
          <div v-if="promo.areas?.length" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
              <MapPin class="h-4 w-4 text-gray-400" />
              Area Tujuan ({{ promo.areas.length }})
            </h2>
            <div class="space-y-2">
              <div
                v-for="(area, idx) in promo.areas"
                :key="idx"
                class="flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-2.5 text-sm"
              >
                <span class="font-medium text-gray-900">{{ area.province_name }}</span>
                <span v-if="area.city_name" class="text-gray-400">→</span>
                <span v-if="area.city_name" class="text-gray-700">{{ area.city_name }}</span>
                <span v-else class="text-xs text-gray-400">(seluruh provinsi)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ RIGHT (1/3) ═══ -->
        <div class="space-y-6">
          <!-- Type Card -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                <Tag class="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900">{{ typeLabels[promo.type] || promo.type }}</p>
                <p class="text-xs text-gray-500">Tipe promosi</p>
              </div>
            </div>
          </div>

          <!-- Visibility Card -->
          <div v-if="promo.type === 'checkout'" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-3 text-sm font-semibold text-gray-900">Visibilitas</h2>
            <div class="space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-gray-500">Internal</span>
                <span :class="promo.internal_visibility ? 'text-green-600' : 'text-gray-400'">
                  {{ promo.internal_visibility ? 'Ya' : 'Tidak' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-500">Website</span>
                <span :class="promo.website_visibility ? 'text-green-600' : 'text-gray-400'">
                  {{ promo.website_visibility ? 'Ya' : 'Tidak' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-500">Aplikasi</span>
                <span :class="promo.app_visibility ? 'text-green-600' : 'text-gray-400'">
                  {{ promo.app_visibility ? 'Ya' : 'Tidak' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Timestamps Card -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-3 text-sm font-semibold text-gray-900">Informasi</h2>
            <dl class="space-y-2 text-sm">
              <div>
                <dt class="text-xs text-gray-500">Dibuat</dt>
                <dd class="text-gray-700">{{ formatDate(promo.created_at) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-gray-500">Terakhir diubah</dt>
                <dd class="text-gray-700">{{ formatDate(promo.updated_at) }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </template>

    <!-- Not found -->
    <div v-else class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <Tag class="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p class="text-gray-500">Promosi tidak ditemukan.</p>
    </div>
  </div>
</template>
