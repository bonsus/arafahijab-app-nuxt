<script setup lang="ts">
import { ArrowLeft, Loader2, Percent, DollarSign, Package, Box, Trash2 } from 'lucide-vue-next'
import type { PromotionProduct } from '~/components/AppPromotionProductPicker.vue'
import type { PromotionSku } from '~/components/AppPromotionSkuPicker.vue'

definePageMeta({ middleware: 'auth' })

const router = useRouter()
const api = useApi()
const toast = useToast()

const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})

// Form
const form = reactive({
  name: '',
  date_start: '',
  date_end: '',
  discount_type: 'percentage' as string,
  item_type: 'product' as string,
  status: 'draft' as string,
  internal_visibility: false,
  web_visibility: false,
  app_visibility: false,
})

// Product items
interface ProductItem {
  product_id: string
  product_name: string
  product_thumbnail: string
  prices: ProductPrice[]
}

interface ProductPrice {
  customer_category_id: string
  customer_category_name: string
  discount_value: number | null
  min_qty: number
  max_qty: number
  status: string
}

const productItems = ref<ProductItem[]>([])

function addProduct(product: PromotionProduct) {
  // Check if already added
  if (productItems.value.some(p => p.product_id === product.id)) {
    toast.warning('Produk sudah ditambahkan')
    return
  }

  // Auto-add all customer categories
  productItems.value.push({
    product_id: product.id,
    product_name: product.name,
    product_thumbnail: product.thumbnail,
    prices: product.prices.map(p => ({
      customer_category_id: p.customer_category_id,
      customer_category_name: p.customer_category_name,
      discount_value: null,
      min_qty: 0,
      max_qty: 0,
      status: 'active',
    })),
  })
}

function removeProductItem(index: number) {
  productItems.value.splice(index, 1)
}

// SKU items
interface SkuItem {
  product_id: string
  product_name: string
  sku_id: string
  sku_code: string
  sku_thumbnail: string
  sku_variants: Record<string, string>
  prices: SkuPrice[]
}

interface SkuPrice {
  customer_category_id: string
  customer_category_name: string
  discount_value: number | null
  min_qty: number
  max_qty: number
  status: string
}

const skuItems = ref<SkuItem[]>([])

function addSku(productId: string, productName: string, sku: PromotionSku) {
  // Check if already added
  if (skuItems.value.some(s => s.sku_id === sku.id)) {
    toast.warning('SKU sudah ditambahkan')
    return
  }

  // Auto-add all customer categories
  skuItems.value.push({
    product_id: productId,
    product_name: productName,
    sku_id: sku.id,
    sku_code: sku.sku,
    sku_thumbnail: sku.thumbnail,
    sku_variants: sku.variants,
    prices: sku.prices.map(p => ({
      customer_category_id: p.customer_category_id,
      customer_category_name: p.customer_category_name,
      discount_value: null,
      min_qty: 0,
      max_qty: 0,
      status: 'active',
    })),
  })
}



const addedProductIds = computed(() => productItems.value.map(p => p.product_id))
const addedSkuIds = computed(() => skuItems.value.map(s => s.sku_id))

// Bulk discount values per category
const bulkDiscountValues = ref<Record<string, number | null>>({})

function applyBulkDiscount() {
  const hasValues = Object.values(bulkDiscountValues.value).some(v => v !== null && v !== undefined)
  
  if (!hasValues) {
    toast.error('Masukkan minimal satu nilai diskon')
    return
  }
  
  // Validate values
  for (const [categoryId, value] of Object.entries(bulkDiscountValues.value)) {
    if (value === null || value === undefined) continue
    
    if (value < 0) {
      toast.error('Nilai diskon tidak boleh negatif')
      return
    }
    
    if (form.discount_type === 'percentage' && value > 100) {
      toast.error('Nilai persentase tidak boleh lebih dari 100')
      return
    }
  }
  
  let appliedCount = 0
  
  if (form.item_type === 'product') {
    productItems.value.forEach(item => {
      item.prices.forEach(price => {
        const value = bulkDiscountValues.value[price.customer_category_id]
        if (value !== null && value !== undefined) {
          price.discount_value = value
          appliedCount++
        }
      })
    })
    toast.success(`Diskon diterapkan ke ${appliedCount} item`)
  } else {
    skuItems.value.forEach(item => {
      item.prices.forEach(price => {
        const value = bulkDiscountValues.value[price.customer_category_id]
        if (value !== null && value !== undefined) {
          price.discount_value = value
          appliedCount++
        }
      })
    })
    toast.success(`Diskon diterapkan ke ${appliedCount} item`)
  }
  
  // Reset bulk values
  bulkDiscountValues.value = {}
}

function formatVariants(variants: Record<string, string>): string {
  return Object.values(variants).join(' / ')
}

function formatPrice(price: string): string {
  return new Intl.NumberFormat('id-ID').format(Number(price))
}

function getFieldError(field: string): string | undefined {
  return formErrors.value[field]?.[0]
}

async function handleSubmit() {
  saving.value = true
  formErrors.value = {}
  
  try {
    const body: Record<string, any> = {
      name: form.name,
      date_start: form.date_start,
      date_end: form.date_end,
      discount_type: form.discount_type,
      item_type: form.item_type,
      status: form.status,
      internal_visibility: form.internal_visibility,
      web_visibility: form.web_visibility,
      app_visibility: form.app_visibility,
    }

    if (form.item_type === 'product') {
      if (!productItems.value.length) {
        toast.error('Minimal harus ada 1 produk')
        return
      }
      
      body.item_products = productItems.value.map(item => ({
        product_id: item.product_id,
        prices: item.prices.map(p => ({
          customer_category_id: p.customer_category_id,
          discount_value: p.discount_value || 0,
          min_qty: p.min_qty || 0,
          max_qty: p.max_qty || 0,
          status: p.status,
        })),
      }))
    }
    else {
      if (!skuItems.value.length) {
        toast.error('Minimal harus ada 1 SKU')
        return
      }
      
      // Group by product_id
      const groupedByProduct: Record<string, typeof skuItems.value> = {}
      skuItems.value.forEach(sku => {
        if (!groupedByProduct[sku.product_id]) {
          groupedByProduct[sku.product_id] = []
        }
        groupedByProduct[sku.product_id]!.push(sku)
      })
      
      body.item_product_skus = Object.entries(groupedByProduct).map(([productId, skus]) => ({
        product_id: productId,
        skus: skus.map(sku => ({
          sku_id: sku.sku_id,
          prices: sku.prices.map(p => ({
            customer_category_id: p.customer_category_id,
            discount_value: p.discount_value || 0,
            min_qty: p.min_qty || 0,
            max_qty: p.max_qty || 0,
            status: p.status,
          })),
        })),
      }))
    }

    await api.post('/promotions/discounts/create', body)
    toast.success('Promosi diskon berhasil dibuat')
    router.push('/promotion/discount')
  }
  catch (err: any) {
    if (err.errors) {
      formErrors.value = err.errors
    }
    toast.error(err.message || 'Gagal membuat promosi diskon')
  }
  finally {
    saving.value = false
  }
}

// Get unique customer categories from items
const customerCategories = computed(() => {
  if (form.item_type === 'product' && productItems.value.length) {
    return productItems.value[0]?.prices.map(p => ({
      id: p.customer_category_id,
      name: p.customer_category_name,
    })) || []
  }
  else if (form.item_type === 'sku' && skuItems.value.length) {
    return skuItems.value[0]?.prices.map(p => ({
      id: p.customer_category_id,
      name: p.customer_category_name,
    })) || []
  }
  return []
})

// Group SKU items by product
const groupedSkuItems = computed(() => {
  const grouped: Record<string, SkuItem[]> = {}
  skuItems.value.forEach(sku => {
    if (!grouped[sku.product_id]) {
      grouped[sku.product_id] = []
    }
    grouped[sku.product_id]!.push(sku)
  })
  return grouped
})

function removeProduct(productId: string) {
  // Remove all SKUs for this product
  skuItems.value = skuItems.value.filter(sku => sku.product_id !== productId)
}

function removeSingleSku(skuId: string) {
  const index = skuItems.value.findIndex(s => s.sku_id === skuId)
  if (index !== -1) {
    skuItems.value.splice(index, 1)
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/promotion/discount"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Buat Diskon Produk</h1>
        <p class="mt-0.5 text-sm text-gray-500">Tambah promosi diskon baru untuk produk atau SKU</p>
      </div>
    </div>

    <form @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- LEFT: Main form (2/3) -->
        <div class="space-y-6 lg:col-span-2">
          <!-- Basic Info -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Informasi Dasar</h2>
            <div class="space-y-4">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">
                  Nama Promosi <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  class="form-input"
                  placeholder="Contoh: Diskon Juli 2024"
                />
                <p v-if="getFieldError('name')" class="mt-1 text-xs text-red-600">{{ getFieldError('name') }}</p>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Tanggal Mulai <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.date_start"
                    type="date"
                    class="form-input"
                  />
                  <p v-if="getFieldError('date_start')" class="mt-1 text-xs text-red-600">{{ getFieldError('date_start') }}</p>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Tanggal Berakhir <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.date_end"
                    type="date"
                    class="form-input"
                  />
                  <p v-if="getFieldError('date_end')" class="mt-1 text-xs text-red-600">{{ getFieldError('date_end') }}</p>
                </div>
              </div>

              <!-- Discount Type Radio Card -->
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700">Tipe Diskon</label>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all"
                    :class="form.discount_type === 'percentage' 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                    @click="form.discount_type = 'percentage'"
                  >
                    <Percent class="h-5 w-5" />
                    <div class="text-left">
                      <p class="text-sm font-semibold">Persentase</p>
                      <p class="text-xs opacity-70">Diskon dalam %</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all"
                    :class="form.discount_type === 'fixed' 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                    @click="form.discount_type = 'fixed'"
                  >
                    <DollarSign class="h-5 w-5" />
                    <div class="text-left">
                      <p class="text-sm font-semibold">Nominal</p>
                      <p class="text-xs opacity-70">Diskon tetap Rp</p>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Item Type Radio Card -->
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700">Target Item</label>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all"
                    :class="[
                      form.item_type === 'product' 
                        ? 'border-primary-500 bg-primary-50 text-primary-700' 
                        : 'border-gray-200 bg-white text-gray-600',
                      (productItems.length > 0 || skuItems.length > 0) 
                        ? 'cursor-not-allowed opacity-50' 
                        : 'hover:border-gray-300 hover:bg-gray-50'
                    ]"
                    :disabled="productItems.length > 0 || skuItems.length > 0"
                    @click="form.item_type = 'product'; productItems = []; skuItems = []"
                  >
                    <Package class="h-5 w-5" />
                    <div class="text-left">
                      <p class="text-sm font-semibold">Produk</p>
                      <p class="text-xs opacity-70">Level produk</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all"
                    :class="[
                      form.item_type === 'sku' 
                        ? 'border-primary-500 bg-primary-50 text-primary-700' 
                        : 'border-gray-200 bg-white text-gray-600',
                      (productItems.length > 0 || skuItems.length > 0) 
                        ? 'cursor-not-allowed opacity-50' 
                        : 'hover:border-gray-300 hover:bg-gray-50'
                    ]"
                    :disabled="productItems.length > 0 || skuItems.length > 0"
                    @click="form.item_type = 'sku'; productItems = []; skuItems = []"
                  >
                    <Box class="h-5 w-5" />
                    <div class="text-left">
                      <p class="text-sm font-semibold">SKU</p>
                      <p class="text-xs opacity-70">Level varian</p>
                    </div>
                  </button>
                </div>
                <p v-if="productItems.length > 0 || skuItems.length > 0" class="mt-1.5 text-xs text-gray-500">
                  Hapus semua item terlebih dahulu untuk mengganti tipe
                </p>
              </div>
            </div>
          </div> 
        </div>

        <!-- RIGHT: Sidebar (1/3) -->
        <div class="space-y-6">
          <!-- Status -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Status</h2>
            <select v-model="form.status" class="form-input">
              <option value="draft">Draft</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </select>
          </div>

          <!-- Visibility -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
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
                  v-model="form.web_visibility"
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
                <span class="text-sm font-medium text-gray-700">Mobile App</span>
              </label>
            </div>
          </div>

          <!-- Summary -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Ringkasan</h2>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500">Tipe Diskon</dt>
                <dd class="font-medium text-gray-900">
                  {{ form.discount_type === 'percentage' ? 'Persentase' : 'Nominal' }}
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Target</dt>
                <dd class="font-medium text-gray-900">
                  {{ form.item_type === 'product' ? 'Produk' : 'SKU' }}
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Total Item</dt>
                <dd class="font-medium text-gray-900">
                  {{ form.item_type === 'product' ? productItems.length : skuItems.length }}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Product/SKU Items -->
        <div class="space-y-6 lg:col-span-3"> 
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <div class="mb-4">
              <h2 class="mb-1 text-base font-semibold text-gray-900">
                {{ form.item_type === 'product' ? 'Produk' : 'SKU' }}
              </h2>
              <p class="text-xs text-gray-500">
                Pilih {{ form.item_type === 'product' ? 'produk' : 'SKU' }} dan atur diskon per kategori customer
              </p>
            </div>

            <!-- Product Picker -->
            <div v-if="form.item_type === 'product'" class="mb-4">
              <AppPromotionProductPicker
                :added-product-ids="addedProductIds"
                @select="addProduct"
              />
            </div>

            <!-- SKU Picker -->
            <div v-if="form.item_type === 'sku'" class="mb-4">
              <AppPromotionSkuPicker
                :added-sku-ids="addedSkuIds"
                @select="addSku"
              />
            </div>

            <!-- Product Items Table -->
            <div v-if="form.item_type === 'product'">
              <div v-if="!productItems.length" class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
                Belum ada produk dipilih
              </div>

              <div v-else class="space-y-4">
                <div class="overflow-x-auto">
                <table class="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr class="border-b-2 border-gray-200 bg-gray-50">
                      <th class="sticky left-0 z-10 min-w-[200px] bg-gray-50 px-3 py-3 font-semibold text-gray-700">Produk</th>
                      <th v-for="cat in customerCategories" :key="cat.id" class="px-3 py-3 text-center font-semibold text-gray-700">
                        <div class="flex flex-col">
                          <span>{{ cat.name }}</span>
                          <span class="text-xs font-normal text-gray-500">Diskon {{ form.discount_type === 'percentage' ? '(%)' : '(Rp)' }}</span>
                        </div>
                      </th>
                      <th class="w-16 px-3 py-3"></th>
                    </tr>
                    <!-- Bulk Edit Row -->
                    <tr class="border-b border-gray-300 bg-primary-50">
                      <td class="sticky left-0 z-10 bg-primary-50 px-3 py-3">
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-semibold text-gray-700">Edit Massal</span>
                        </div>
                      </td>
                      <td v-for="cat in customerCategories" :key="cat.id" class="px-3 py-2">
                        <div class="relative">
                          <span v-if="form.discount_type==='fixed'" class="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
                          <input
                            v-model.number="bulkDiscountValues[cat.id]"
                            type="number"
                            min="0"
                            :step="form.discount_type === 'percentage' ? '0.01' : '1'"
                            :max="form.discount_type === 'percentage' ? '100' : undefined"
                            :placeholder="form.discount_type === 'percentage' ? '10' : '50000'"
                            :class="form.discount_type == 'percentage' ? 'pl-1 pr-5 w-24' : 'pl-6 pr-1 w-28'"
                            class="rounded border border-gray-300 bg-white px-2 py-1.5 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                          />
                          <span v-if="form.discount_type==='percentage'" class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                        </div>
                      </td>
                      <td class="px-3 py-3">
                        <button
                          type="button"
                          class="rounded bg-primary-600 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
                          @click="applyBulkDiscount"
                        >
                          Terapkan
                        </button>
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(item, idx) in productItems"
                      :key="item.product_id"
                      class="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td class="sticky left-0 z-10 bg-white px-3 py-3">
                        <div class="flex items-center gap-2">
                          <img
                            v-if="item.product_thumbnail"
                            :src="item.product_thumbnail"
                            class="h-10 w-10 rounded bg-gray-100 object-cover"
                          />
                          <div class="min-w-0">
                            <p class="truncate font-medium text-gray-900">{{ item.product_name }}</p>
                          </div>
                        </div>
                      </td>
                      <td v-for="price in item.prices" :key="price.customer_category_id" class="px-3 py-2">
                        <div class="relative">
                          <span v-if="form.discount_type==='fixed'" class="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
                          <input
                            v-model.number="price.discount_value"
                            type="number"
                            min="0"
                            :step="form.discount_type === 'percentage' ? '0.01' : '1'"
                            :max="form.discount_type === 'percentage' ? '100' : undefined"
                            :placeholder="form.discount_type === 'percentage' ? '10' : '50000'"
                            :class="form.discount_type == 'percentage' ? 'pl-1 pr-5 w-24' : 'pl-6 pr-1 w-28'"
                            class="rounded border border-gray-300 bg-white px-2 py-1.5 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                          />
                          <span v-if="form.discount_type==='percentage'" class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                        </div> 
                      </td>
                      <td class="px-3 py-3">
                        <button
                          type="button"
                          class="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500"
                          @click="removeProductItem(idx)"
                        >
                          <Trash2 class="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              </div>
            </div>

            <!-- SKU Items Table -->
            <!-- @ts-expect-error Type narrowing issue -->
            <div v-if="form.item_type === 'sku'">
              <div v-if="!skuItems.length" class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
                Belum ada SKU dipilih
              </div>

              <div v-else class="space-y-4">
                <div class="overflow-x-auto">
                <table class="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr class="border-b-2 border-gray-200 bg-gray-50">
                      <th class="sticky left-0 z-10 min-w-[200px] bg-gray-50 px-3 py-3 font-semibold text-gray-700">Produk / SKU</th>
                      <th v-for="cat in customerCategories" :key="cat.id" class="px-3 py-3 text-center font-semibold text-gray-700">
                        <div class="flex flex-col">
                          <span>{{ cat.name }}</span>
                          <span class="text-xs font-normal text-gray-500">Diskon {{ form.discount_type === 'percentage' ? '(%)' : '(Rp)' }}</span>
                        </div>
                      </th>
                      <th class="w-16 px-3 py-3"></th>
                    </tr>
                    <!-- Bulk Edit Row -->
                    <tr class="border-b border-gray-300 bg-primary-50">
                      <td class="sticky left-0 z-10 bg-primary-50 px-3 py-3">
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-semibold text-gray-700">Edit Massal</span>
                        </div>
                      </td>
                      <td v-for="cat in customerCategories" :key="cat.id" class="px-3 py-2">
                        <div class="relative">
                          <span v-if="form.discount_type==='fixed'" class="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
                          <input
                            v-model.number="bulkDiscountValues[cat.id]"
                            type="number"
                            min="0"
                            :step="form.discount_type === 'percentage' ? '0.01' : '1'"
                            :max="form.discount_type === 'percentage' ? '100' : undefined"
                            :placeholder="form.discount_type === 'percentage' ? '10' : '50000'"
                            :class="form.discount_type == 'percentage' ? 'pl-1 pr-5 w-24' : 'pl-6 pr-1 w-28'"
                            class="rounded border border-gray-300 bg-white px-2 py-1.5 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                          />
                          <span v-if="form.discount_type==='percentage'" class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                        </div>
                      </td>
                      <td class="px-3 py-3">
                        <button
                          type="button"
                          class="rounded bg-primary-600 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
                          @click="applyBulkDiscount"
                        >
                          Terapkan
                        </button>
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="(skus, productId) in groupedSkuItems" :key="productId">
                      <!-- Product Parent Row -->
                      <tr class="border-b border-gray-200 bg-gray-100">
                        <td class="sticky left-0 z-10 bg-gray-100 px-3 py-2.5" colspan="100">
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                              <Package class="h-4 w-4 text-gray-600" />
                              <span class="font-semibold text-gray-900">{{ skus[0]?.product_name || 'Produk' }}</span>
                              <span class="rounded-full bg-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700">
                                {{ skus.length }} SKU
                              </span>
                            </div>
                            <button
                              type="button"
                              class="rounded p-1 text-gray-400 hover:bg-gray-300 hover:text-red-500"
                              @click="removeProduct(productId)"
                              title="Hapus semua SKU produk ini"
                            >
                              <Trash2 class="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      <!-- SKU Child Rows -->
                      <tr
                        v-for="item in skus"
                        :key="item.sku_id"
                        class="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td class="sticky left-0 z-10 bg-white px-3 py-3">
                          <div class="flex items-center gap-2 pl-6">
                            <img
                              v-if="item.sku_thumbnail"
                              :src="item.sku_thumbnail"
                              class="h-10 w-10 rounded bg-gray-100 object-cover"
                            />
                            <div class="min-w-0">
                              <p class="truncate font-medium text-gray-900">{{ item.sku_code }}</p>
                              <p class="truncate text-xs text-gray-500">{{ formatVariants(item.sku_variants) }}</p>
                            </div>
                          </div>
                        </td>
                        <td v-for="price in item.prices" :key="price.customer_category_id" class="px-3 py-2">
                          <div class="relative">
                            <span v-if="form.discount_type==='fixed'" class="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
                            <input
                              v-model.number="price.discount_value"
                              type="number"
                              min="0"
                              :step="form.discount_type === 'percentage' ? '0.01' : '1'"
                              :max="form.discount_type === 'percentage' ? '100' : undefined"
                              :placeholder="form.discount_type === 'percentage' ? '10' : '50000'"
                              :class="form.discount_type == 'percentage' ? 'pl-1 pr-5 w-24' : 'pl-6 pr-1 w-28'"
                              class="rounded border border-gray-300 bg-white px-2 py-1.5 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                            />
                            <span v-if="form.discount_type==='percentage'" class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                          </div>
                        </td>
                        <td class="px-3 py-3">
                          <button
                            type="button"
                            class="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500"
                            @click="removeSingleSku(item.sku_id)"
                            title="Hapus SKU ini"
                          >
                            <Trash2 class="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="sticky bottom-0 -mx-4 mt-6 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <div class="flex items-center justify-end gap-3">
          <NuxtLink
            to="/promotion/discount"
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
.form-input {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid rgb(209 213 219);
  background-color: white;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: rgb(17 24 39);
  transition-property: color, background-color, border-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.form-input:focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
  border-color: rgb(var(--color-primary-500) / 1);
  --tw-ring-color: rgb(var(--color-primary-500) / 0.2);
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
}

.form-input::placeholder {
  color: rgb(156 163 175);
}
</style>
