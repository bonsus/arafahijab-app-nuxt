<script setup lang="ts">
import {
  ArrowLeft, Loader2, Plus, Trash2, X,
} from 'lucide-vue-next'
import type { ProductResult, ProductSku } from '~/components/AppProductSkuPicker.vue'
import type { Customer } from '~/components/AppCustomerPicker.vue'
import type { CustomerCategory } from '~/components/AppCustomerCategoryPicker.vue'
import type { ProductCategory } from '~/components/AppProductCategoryPicker.vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const promoType = (route.query.type as string) || 'discount'

const typeLabels: Record<string, string> = {
  discount: 'Diskon Produk',
  checkout: 'Diskon Checkout',
  product_free: 'Produk Gratis',
  shipping: 'Diskon Ongkir',
}

const backRoute: Record<string, string> = {
  discount: '/promotion/discount',
  checkout: '/promotion/checkout',
  product_free: '/promotion/free-product',
  shipping: '/promotion/shipping',
}

const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})

// Form
const form = reactive({
  type: promoType,
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  status: 'draft' as string,
  coupon_code: '',
  discount_type: 'percentage' as string,
  discount_value: null as number | null,
  max_discount_value: null as number | null,
  item_type: 'all' as string,
  item_operator: 'and' as string,
  customer_type: 'all' as string,
  terms: '',
  min_spend: null as number | null,
  min_qty: null as number | null,
  multiple_use: false,
  max_use: null as number | null,
  max_use_per_customer: null as number | null,
  internal_visibility: false,
  website_visibility: false,
  app_visibility: false,
})

// Items
interface PromoItem {
  item_role: string
  product_id: string
  sku_id: string
  product_category_id: string
  discount_value: number | null
  max_discount_value: number | null
  min_qty: number | null
  max_qty: number | null
  qty: number | null
  // Display data
  product_name?: string
  sku?: string
  category_name?: string
}

const items = ref<PromoItem[]>([])

function addItemProduct(role: string, product: ProductResult, sku: ProductSku) {
  items.value.push({
    item_role: role,
    product_id: product.id,
    sku_id: sku.sku_id,
    product_category_id: '',
    discount_value: null,
    max_discount_value: null,
    min_qty: null,
    max_qty: null,
    qty: null,
    product_name: product.name,
    sku: sku.sku,
  })
}

function addItemCategory(role: string, category: ProductCategory) {
  items.value.push({
    item_role: role,
    product_id: '',
    sku_id: '',
    product_category_id: category.id,
    discount_value: null,
    max_discount_value: null,
    min_qty: null,
    max_qty: null,
    qty: null,
    category_name: category.name,
  })
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

const addedProductSkuIds = computed(() => items.value.map(i => i.sku_id).filter(Boolean))
const addedCategoryIds = computed(() => items.value.map(i => i.product_category_id).filter(Boolean))

// Customer Categories
interface CustomerCategoryItem {
  customer_category_id: string
  name?: string
}

const customerCategories = ref<CustomerCategoryItem[]>([])

function addCustomerCategory(category: CustomerCategory) {
  if (customerCategories.value.some(c => c.customer_category_id === category.id)) return
  customerCategories.value.push({ 
    customer_category_id: category.id,
    name: category.name 
  })
}

function removeCustomerCategory(index: number) {
  customerCategories.value.splice(index, 1)
}

const addedCustomerCategoryIds = computed(() => customerCategories.value.map(c => c.customer_category_id))

// Individual Customers
interface CustomerIndividualItem {
  customer_id: string
  name?: string
  email?: string
}

const customerIndividuals = ref<CustomerIndividualItem[]>([])

function addCustomerIndividual(customer: Customer) {
  if (customerIndividuals.value.some(c => c.customer_id === customer.id)) return
  customerIndividuals.value.push({ 
    customer_id: customer.id,
    name: customer.name,
    email: customer.email 
  })
}

function removeCustomerIndividual(index: number) {
  customerIndividuals.value.splice(index, 1)
}

const addedCustomerIds = computed(() => customerIndividuals.value.map(c => c.customer_id))

// Couriers (shipping only)
interface PromoCourier {
  courier_code: string
  courier_name: string
  courier_service: string
}

const couriers = ref<PromoCourier[]>([])

function addCourier() {
  couriers.value.push({ courier_code: '', courier_name: '', courier_service: '' })
}

function removeCourier(index: number) {
  couriers.value.splice(index, 1)
}

// Areas (shipping only)
interface PromoArea {
  province_id: string
  province_name: string
  city_id: string
  city_name: string
}

const areas = ref<PromoArea[]>([])

function addArea() {
  areas.value.push({ province_id: '', province_name: '', city_id: '', city_name: '' })
}

function removeArea(index: number) {
  areas.value.splice(index, 1)
}

function getFieldError(field: string): string | undefined {
  return formErrors.value[field]?.[0]
}

function toRFC3339(localDatetime: string): string {
  if (!localDatetime) return ''
  return new Date(localDatetime).toISOString()
}

async function handleSubmit() {
  saving.value = true
  formErrors.value = {}
  try {
    const body: Record<string, any> = {
      type: form.type,
      name: form.name,
      description: form.description,
      start_date: toRFC3339(form.start_date),
      end_date: toRFC3339(form.end_date),
      status: form.status,
      coupon_code: form.coupon_code,
      discount_type: form.discount_type,
      discount_value: form.discount_value || 0,
      max_discount_value: form.max_discount_value || 0,
      item_type: form.item_type,
      item_operator: form.item_operator,
      customer_type: form.customer_type,
      terms: form.terms,
      min_spend: form.min_spend || 0,
      min_qty: form.min_qty || 0,
      multiple_use: form.multiple_use,
      max_use: form.max_use || 0,
      max_use_per_customer: form.max_use_per_customer || 0,
      internal_visibility: form.internal_visibility,
      website_visibility: form.website_visibility,
      app_visibility: form.app_visibility,
    }

    if (items.value.length) body.items = items.value
    if (form.customer_type === 'specific') {
      const merged = [
        ...customerCategories.value.filter(c => c.customer_category_id).map(c => ({ customer_id: '', customer_category_id: c.customer_category_id })),
        ...customerIndividuals.value.filter(c => c.customer_id).map(c => ({ customer_id: c.customer_id, customer_category_id: '' })),
      ]
      if (merged.length) body.customers = merged
    }
    if (promoType === 'shipping' && couriers.value.length) body.couriers = couriers.value
    if (promoType === 'shipping' && areas.value.length) body.areas = areas.value

    await api.post('/sales/promotions/create', body)
    toast.success('Promosi berhasil dibuat')
    router.push(backRoute[promoType] || '/promotion/discount')
  }
  catch (err: any) {
    if (err.errors) {
      formErrors.value = err.errors
    }
    toast.error(err.message || 'Gagal membuat promosi')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        :to="backRoute[promoType] || '/promotion/discount'"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Tambah {{ typeLabels[promoType] || 'Promosi' }}</h1>
        <p class="mt-0.5 text-sm text-gray-500">Buat promosi {{ (typeLabels[promoType] || '').toLowerCase() }} baru</p>
      </div>
    </div>

    <form @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- ═══ LEFT: Main info (2/3) ═══ -->
        <div class="space-y-6 lg:col-span-2">
          <!-- Basic Info Card -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Informasi Dasar</h2>
            <div class="space-y-4">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Promosi <span class="text-red-500">*</span></label>
                <input v-model="form.name" type="text" class="form-input" placeholder="Contoh: Promo Lebaran 2026" />
                <p v-if="getFieldError('name')" class="mt-1 text-xs text-red-600">{{ getFieldError('name') }}</p>
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Deskripsi</label>
                <textarea v-model="form.description" rows="3" class="form-input" placeholder="Deskripsi promosi" />
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Tanggal Mulai <span class="text-red-500">*</span></label>
                  <input v-model="form.start_date" type="datetime-local" class="form-input" />
                  <p v-if="getFieldError('start_date')" class="mt-1 text-xs text-red-600">{{ getFieldError('start_date') }}</p>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Tanggal Berakhir <span class="text-red-500">*</span></label>
                  <input v-model="form.end_date" type="datetime-local" class="form-input" />
                  <p v-if="getFieldError('end_date')" class="mt-1 text-xs text-red-600">{{ getFieldError('end_date') }}</p>
                </div>
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Kode Kupon</label>
                <input v-model="form.coupon_code" type="text" class="form-input uppercase" placeholder="Contoh: LEBARAN2026" />
                <p v-if="getFieldError('coupon_code')" class="mt-1 text-xs text-red-600">{{ getFieldError('coupon_code') }}</p>
              </div>
            </div>
          </div>

          <!-- Discount Settings Card (not for product_free) -->
          <div v-if="promoType !== 'product_free'" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Pengaturan Diskon</h2>
            <div class="space-y-4">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Tipe Diskon</label>
                  <select v-model="form.discount_type" class="form-input">
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal Tetap (Rp)</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Nilai Diskon</label>
                  <input v-model.number="form.discount_value" type="number" class="form-input" :placeholder="form.discount_type === 'percentage' ? 'Contoh: 15' : 'Contoh: 50000'" />
                </div>
              </div>
              <div v-if="form.discount_type === 'percentage'">
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Maks. Potongan (Rp)</label>
                <input v-model.number="form.max_discount_value" type="number" class="form-input" placeholder="Contoh: 50000" />
              </div>
            </div>
          </div>

          <!-- Conditions Card -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Ketentuan</h2>
            <div class="space-y-4">
              <div v-if="promoType !== 'shipping'" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Target Produk</label>
                  <select v-model="form.item_type" class="form-input">
                    <option value="all">Semua Produk</option>
                    <option value="specific">Produk Tertentu</option>
                  </select>
                </div>
                <div v-if="promoType === 'product_free'">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Operator Item</label>
                  <select v-model="form.item_operator" class="form-input">
                    <option value="and">Semua harus terpenuhi (AND)</option>
                    <option value="or">Salah satu cukup (OR)</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Target Customer</label>
                <select v-model="form.customer_type" class="form-input sm:max-w-xs">
                  <option value="all">Semua Customer</option>
                  <option value="specific">Customer Tertentu</option>
                </select>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div v-if="promoType !== 'discount'">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Min. Belanja (Rp)</label>
                  <input v-model.number="form.min_spend" type="number" class="form-input" placeholder="Contoh: 100000" />
                </div>
                <div v-if="promoType === 'product_free'">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Min. Qty</label>
                  <input v-model.number="form.min_qty" type="number" class="form-input" placeholder="Contoh: 2" />
                </div>
              </div>

              <div v-if="promoType === 'checkout'" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Maks. Penggunaan Total</label>
                  <input v-model.number="form.max_use" type="number" class="form-input" placeholder="Contoh: 1000" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Maks. Per Customer</label>
                  <input v-model.number="form.max_use_per_customer" type="number" class="form-input" placeholder="Contoh: 1" />
                </div>
              </div>

              <div v-if="promoType !== 'checkout'" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Maks. Penggunaan Total</label>
                  <input v-model.number="form.max_use" type="number" class="form-input" placeholder="Contoh: 1000" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Maks. Per Customer</label>
                  <input v-model.number="form.max_use_per_customer" type="number" class="form-input" placeholder="Contoh: 1" />
                </div>
              </div>

              <div v-if="promoType === 'checkout'">
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Syarat & Ketentuan</label>
                <textarea v-model="form.terms" rows="3" class="form-input" placeholder="Syarat dan ketentuan berlaku" />
              </div>

              <div v-if="promoType === 'product_free'">
                <label class="flex cursor-pointer items-center gap-3">
                  <input
                    v-model="form.multiple_use"
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span class="text-sm font-medium text-gray-700">Bisa digunakan berkali-kali dalam 1 transaksi</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Items Card (when item_type = specific OR product_free) -->
          <div
            v-if="form.item_type === 'specific' || promoType === 'product_free'"
            class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6"
          >
            <div class="mb-4">
              <h2 class="mb-1 text-base font-semibold text-gray-900">
                {{ promoType === 'product_free' ? 'Item Syarat & Hadiah' : 'Item Promo' }}
              </h2>
              <p class="text-xs text-gray-500">Pilih produk/SKU atau kategori produk yang akan diikutsertakan</p>
            </div>

            <!-- Picker dropdowns -->
            <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-xs font-medium text-gray-700">
                  {{ promoType === 'product_free' ? 'Produk/SKU Syarat' : 'Pilih Produk/SKU' }}
                </label>
                <AppProductSkuPicker 
                  :added-sku-ids="addedProductSkuIds"
                  @add-sku="(product, sku) => addItemProduct('condition', product, sku)"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium text-gray-700">
                  {{ promoType === 'product_free' ? 'Kategori Syarat' : 'Pilih Kategori' }}
                </label>
                <AppProductCategoryPicker 
                  :added-ids="addedCategoryIds"
                  @select="addItemCategory('condition', $event)"
                />
              </div>
            </div>
            
            <div v-if="promoType === 'product_free'" class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-xs font-medium text-gray-700">Produk/SKU Hadiah</label>
                <AppProductSkuPicker 
                  :added-sku-ids="addedProductSkuIds"
                  @add-sku="(product, sku) => addItemProduct('reward', product, sku)"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium text-gray-700">Kategori Hadiah</label>
                <AppProductCategoryPicker 
                  :added-ids="addedCategoryIds"
                  @select="addItemCategory('reward', $event)"
                />
              </div>
            </div>

            <div v-if="!items.length" class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
              Belum ada item. Pilih produk/SKU atau kategori di atas.
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="(item, idx) in items"
                :key="idx"
                class="rounded-lg border p-3"
                :class="item.item_role === 'reward' ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-gray-50/30'"
              >
                <div class="flex items-start gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="mb-2 flex items-center gap-2">
                      <span 
                        class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        :class="item.item_role === 'reward' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'"
                      >
                        {{ item.item_role === 'reward' ? 'Hadiah' : 'Syarat' }}
                      </span>
                      <span class="text-xs font-medium text-gray-900">
                        {{ item.product_name || item.category_name }}
                      </span>
                      <span v-if="item.sku" class="text-xs text-gray-500">SKU: {{ item.sku }}</span>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div v-if="promoType === 'discount' && item.item_role === 'condition'">
                        <label class="mb-0.5 block text-[10px] font-medium text-gray-500">Diskon/Item</label>
                        <input v-model.number="item.discount_value" type="number" class="form-input text-xs" placeholder="0" />
                      </div>
                      <div v-if="promoType === 'discount' && item.item_role === 'condition'">
                        <label class="mb-0.5 block text-[10px] font-medium text-gray-500">Maks Diskon</label>
                        <input v-model.number="item.max_discount_value" type="number" class="form-input text-xs" placeholder="0" />
                      </div>
                      <div>
                        <label class="mb-0.5 block text-[10px] font-medium text-gray-500">Min Qty</label>
                        <input v-model.number="item.min_qty" type="number" class="form-input text-xs" placeholder="0" />
                      </div>
                      <div>
                        <label class="mb-0.5 block text-[10px] font-medium text-gray-500">Maks Qty</label>
                        <input v-model.number="item.max_qty" type="number" class="form-input text-xs" placeholder="0" />
                      </div>
                      <div v-if="item.item_role === 'reward'">
                        <label class="mb-0.5 block text-[10px] font-medium text-gray-500">Qty Gratis</label>
                        <input v-model.number="item.qty" type="number" class="form-input text-xs" placeholder="1" />
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    type="button" 
                    class="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-500" 
                    @click="removeItem(idx)"
                  >
                    <X class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Customers Card (when customer_type = specific) -->
          <div
            v-if="form.customer_type === 'specific'"
            class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6"
          >
            <h2 class="mb-4 text-base font-semibold text-gray-900">Target Customer</h2>

            <!-- Kategori Customer -->
            <div class="mb-5">
              <div class="mb-3">
                <h3 class="mb-1 text-sm font-semibold text-gray-700">Kategori Customer</h3>
                <p class="text-xs text-gray-500">Pilih kategori customer yang bisa menggunakan promosi</p>
              </div>
              
              <div class="mb-3">
                <AppCustomerCategoryPicker
                  :added-ids="addedCustomerCategoryIds"
                  @select="addCustomerCategory"
                />
              </div>

              <div v-if="!customerCategories.length" class="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-400">
                Belum ada kategori customer dipilih.
              </div>

              <div v-else class="space-y-2">
                <div 
                  v-for="(cat, idx) in customerCategories" 
                  :key="idx" 
                  class="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-2"
                >
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    <span class="text-xs font-semibold text-blue-600">K</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-gray-900">{{ cat.name }}</p>
                    <p class="text-xs text-gray-500">ID: {{ cat.customer_category_id.slice(0, 8) }}...</p>
                  </div>
                  <button 
                    type="button" 
                    class="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-500" 
                    @click="removeCustomerCategory(idx)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Customer Individual -->
            <div>
              <div class="mb-3">
                <h3 class="mb-1 text-sm font-semibold text-gray-700">Customer Individual</h3>
                <p class="text-xs text-gray-500">Pilih customer spesifik yang bisa menggunakan promosi</p>
              </div>
              
              <div class="mb-3">
                <AppCustomerPicker
                  :added-ids="addedCustomerIds"
                  @select="addCustomerIndividual"
                />
              </div>

              <div v-if="!customerIndividuals.length" class="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-400">
                Belum ada customer individual dipilih.
              </div>

              <div v-else class="space-y-2">
                <div 
                  v-for="(cust, idx) in customerIndividuals" 
                  :key="idx" 
                  class="flex items-center gap-3 rounded-lg border border-primary-200 bg-primary-50/30 px-3 py-2"
                >
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100">
                    <span class="text-xs font-semibold text-primary-600">{{ cust.name?.[0]?.toUpperCase() || 'C' }}</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-gray-900">{{ cust.name }}</p>
                    <p class="truncate text-xs text-gray-500">{{ cust.email }}</p>
                  </div>
                  <button 
                    type="button" 
                    class="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-500" 
                    @click="removeCustomerIndividual(idx)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Couriers Card (shipping only) -->
          <div
            v-if="promoType === 'shipping'"
            class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6"
          >
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-base font-semibold text-gray-900">Kurir</h2>
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
                @click="addCourier"
              >
                <Plus class="h-3.5 w-3.5" />
                Kurir
              </button>
            </div>

            <div v-if="!couriers.length" class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
              Belum ada kurir.
            </div>

            <div v-else class="space-y-3">
              <div v-for="(c, idx) in couriers" :key="idx" class="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                <div class="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-gray-600">Kode Kurir</label>
                    <input v-model="c.courier_code" type="text" class="form-input text-sm" placeholder="jne" />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-gray-600">Nama Kurir</label>
                    <input v-model="c.courier_name" type="text" class="form-input text-sm" placeholder="JNE" />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-gray-600">Layanan</label>
                    <input v-model="c.courier_service" type="text" class="form-input text-sm" placeholder="REG" />
                  </div>
                </div>
                <button type="button" class="mt-5 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500" @click="removeCourier(idx)">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Areas Card (shipping only) -->
          <div
            v-if="promoType === 'shipping'"
            class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6"
          >
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-base font-semibold text-gray-900">Area Tujuan</h2>
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
                @click="addArea"
              >
                <Plus class="h-3.5 w-3.5" />
                Area
              </button>
            </div>

            <div v-if="!areas.length" class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
              Belum ada area. Jika kosong, berlaku untuk semua area.
            </div>

            <div v-else class="space-y-3">
              <div v-for="(a, idx) in areas" :key="idx" class="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                <div class="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-gray-600">ID Provinsi</label>
                    <input v-model="a.province_id" type="text" class="form-input text-sm" placeholder="ID provinsi" />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-gray-600">Nama Provinsi</label>
                    <input v-model="a.province_name" type="text" class="form-input text-sm" placeholder="DKI Jakarta" />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-gray-600">ID Kota</label>
                    <input v-model="a.city_id" type="text" class="form-input text-sm" placeholder="Kosongkan jika seluruh provinsi" />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-gray-600">Nama Kota</label>
                    <input v-model="a.city_name" type="text" class="form-input text-sm" placeholder="Kota Bandung" />
                  </div>
                </div>
                <button type="button" class="mt-5 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500" @click="removeArea(idx)">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ RIGHT: Sidebar (1/3) ═══ -->
        <div class="space-y-6">
          <!-- Status Card -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Status</h2>
            <select v-model="form.status" class="form-input">
              <option value="draft">Draft</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>

          <!-- Visibility Card (checkout only) -->
          <div v-if="promoType === 'checkout'" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Visibilitas</h2>
            <div class="space-y-3">
              <label class="flex cursor-pointer items-center gap-3">
                <input
                  v-model="form.internal_visibility"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span class="text-sm font-medium text-gray-700">Internal</span>
              </label>
              <label class="flex cursor-pointer items-center gap-3">
                <input
                  v-model="form.website_visibility"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span class="text-sm font-medium text-gray-700">Website</span>
              </label>
              <label class="flex cursor-pointer items-center gap-3">
                <input
                  v-model="form.app_visibility"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span class="text-sm font-medium text-gray-700">Aplikasi</span>
              </label>
            </div>
          </div>

          <!-- Summary Card -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Ringkasan</h2>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500">Tipe</dt>
                <dd class="font-medium text-gray-900">{{ typeLabels[promoType] }}</dd>
              </div>
              <div v-if="form.discount_value && promoType !== 'product_free'" class="flex justify-between">
                <dt class="text-gray-500">Diskon</dt>
                <dd class="font-medium text-gray-900">
                  {{ form.discount_type === 'percentage' ? `${form.discount_value}%` : `Rp ${new Intl.NumberFormat('id-ID').format(form.discount_value)}` }}
                </dd>
              </div>
              <div v-if="form.coupon_code" class="flex justify-between">
                <dt class="text-gray-500">Kupon</dt>
                <dd class="font-mono text-xs font-medium text-gray-900">{{ form.coupon_code }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Target Produk</dt>
                <dd class="font-medium text-gray-900">{{ form.item_type === 'all' ? 'Semua' : 'Tertentu' }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Target Customer</dt>
                <dd class="font-medium text-gray-900">{{ form.customer_type === 'all' ? 'Semua' : 'Tertentu' }}</dd>
              </div>
              <div v-if="form.customer_type === 'specific' && customerCategories.length" class="flex justify-between">
                <dt class="text-gray-500">Kat. Customer</dt>
                <dd class="font-medium text-gray-900">{{ customerCategories.length }} kategori</dd>
              </div>
              <div v-if="form.customer_type === 'specific' && customerIndividuals.length" class="flex justify-between">
                <dt class="text-gray-500">Customer</dt>
                <dd class="font-medium text-gray-900">{{ customerIndividuals.length }} customer</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <!-- Sticky bottom actions -->
      <div class="sticky bottom-0 -mx-4 mt-6 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <div class="flex items-center justify-end gap-3">
          <NuxtLink
            :to="backRoute[promoType] || '/promotion/discount'"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Batal
          </NuxtLink>
          <button
            type="submit"
            :disabled="saving"
            class="flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            {{ saving ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.form-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
