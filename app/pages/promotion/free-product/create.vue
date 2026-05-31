<script setup lang="ts">
import {
  ArrowLeft, Loader2, Package, Box, Tag, Gift,
  X, Users, Info,
} from 'lucide-vue-next'
import { convertIsoToDatetimeLocal, formatDateTimeForApi } from '~/composables/useFormatters'
import type { CustomerCategory } from '~/components/AppCustomerCategoryPicker.vue'
import type { ProductCategory } from '~/components/AppProductCategoryPicker.vue'
import type { PromotionProduct } from '~/components/AppPromotionProductPicker.vue'
import type { PromotionSku } from '~/components/AppPromotionSkuPicker.vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const editId = computed(() => route.query.edit as string | undefined)
const isEditMode = computed(() => !!editId.value)

const loading = ref(false)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})

const form = reactive({
  name: '',
  note: '',
  date_start: '',
  date_end: '',
  tags: '',
  terms: '', 
  item_type: 'all' as string, 
  is_multiple: 'inactive' as string,
  internal_visibility: 'inactive' as string,
  web_visibility: 'inactive' as string,
  app_visibility: 'inactive' as string,
})

function getFieldError(field: string): string | undefined {
  return formErrors.value[field]?.[0]
}

// ── Customer categories ────────────────────────────────────────
const selectedCustomerCategories = ref<CustomerCategory[]>([])
const addedCustomerCategoryIds = computed(() => selectedCustomerCategories.value.map(c => c.id))

function addCustomerCategory(category: CustomerCategory) {
  if (selectedCustomerCategories.value.some(c => c.id === category.id)) {
    toast.warning('Kategori sudah ditambahkan'); return
  }
  selectedCustomerCategories.value.push(category)
}
function removeCustomerCategory(id: string) {
  selectedCustomerCategories.value = selectedCustomerCategories.value.filter(c => c.id !== id)
}

// ── Product categories (with qty) ─────────────────────────────
const selectedProductCategories = ref<ProductCategory[]>([])
const addedCategoryIds = computed(() => selectedProductCategories.value.map(c => c.id))

function addProductCategory(category: ProductCategory) {
  if (selectedProductCategories.value.some(c => c.id === category.id)) {
    toast.warning('Kategori sudah ditambahkan'); return
  }
  selectedProductCategories.value.push(category)
}
function removeProductCategory(id: string) {
  selectedProductCategories.value = selectedProductCategories.value.filter(c => c.id !== id)
}

// ── Products (with qty) ───────────────────────────────────────
const selectedProducts = ref<PromotionProduct[]>([])
const addedProductIds = computed(() => selectedProducts.value.map(p => p.id))

function addProduct(product: PromotionProduct) {
  if (selectedProducts.value.some(p => p.id === product.id)) {
    toast.warning('Produk sudah ditambahkan'); return
  }
  selectedProducts.value.push(product)
}
function removeProduct(id: string) {
  selectedProducts.value = selectedProducts.value.filter(p => p.id !== id)
}

// ── SKU (multi selection for condition) ──────────────────────
interface SelectedSku extends PromotionSku {
  product_id: string
  product_name: string 
}
const selectedSkus = ref<SelectedSku[]>([])
const addedConditionSkuIds = computed(() => selectedSkus.value.map(s => s.id))

function selectSku(productId: string, productName: string, sku: PromotionSku) {
  if (selectedSkus.value.some(s => s.id === sku.id)) return
  selectedSkus.value.push({ ...sku, product_id: productId, product_name: productName })
}
function removeSku(id: string) {
  selectedSkus.value = selectedSkus.value.filter(s => s.id !== id)
}

// ── Free product SKU (multi selection) ────────────────────────
interface FreeSkuItem extends PromotionSku {
  product_id: string
  product_name: string
  max_qty?: number
}
const selectedFreeSkus = ref<FreeSkuItem[]>([])
const addedFreeSkuIds = computed(() => selectedFreeSkus.value.map(s => s.id))

function selectFreeSku(productId: string, productName: string, sku: PromotionSku) {
  if (selectedFreeSkus.value.some(s => s.id === sku.id)) return
  selectedFreeSkus.value.push({ ...sku, product_id: productId, product_name: productName })
}
function removeFreeSku(id: string) {
  selectedFreeSkus.value = selectedFreeSkus.value.filter(s => s.id !== id)
}

function formatVariants(variants: any): string {
  if (!variants) return '-'
  if (Array.isArray(variants)) {
    if (variants.length === 0) return '-'
    return variants.map((v: any) => v.value || v.name || String(v)).join(' / ')
  }
  if (typeof variants === 'object') {
    const entries = Object.entries(variants)
    if (entries.length === 0) return '-'
    return entries.map(([_, value]) => {
      if (typeof value === 'object' && value !== null) return (value as any).value || (value as any).name || String(value)
      return String(value)
    }).join(' / ')
  }
  return String(variants)
}

// ── Load for edit ─────────────────────────────────────────────
async function loadPromotion() {
  loading.value = true
  try {
    const response: any = await api.get(`/promotions/product-frees/${editId.value}`)
    const data = response.data

    form.name = data.name || ''
    form.note = data.note || ''
    form.date_start = convertIsoToDatetimeLocal(data.date_start)
    form.date_end = convertIsoToDatetimeLocal(data.date_end)
    form.tags = data.tags || ''
    form.terms = data.terms || '' 
    form.item_type = data.item_type || 'all' 
    form.is_multiple = data.is_multiple || 'inactive'
    form.internal_visibility = data.internal_visibility || 'inactive'
    form.web_visibility = data.web_visibility || 'inactive'
    form.app_visibility = data.app_visibility || 'inactive'

    if (data.customer_categories?.length) {
      selectedCustomerCategories.value = data.customer_categories.map((c: any) => ({
        id: c.id, name: c.name, description: c.description || '',
      }))
    }

    if (data.item_type === 'category' && data.product_categories?.length) {
      selectedProductCategories.value = data.product_categories.map((c: any) => ({
        id: c.id, name: c.name, qty: c.qty || 0,
      }))
    }
    else if (data.item_type === 'product' && data.products?.length) {
      selectedProducts.value = data.products.map((p: any) => ({
        id: p.id, name: p.name, thumbnail: p.thumbnail || '', stock: 0, prices: [], qty: p.qty || 0,
      }))
    }
    else if (data.item_type === 'sku' && data.products?.length) {
      selectedSkus.value = []
      for (const p of data.products) {
        for (const s of (p.skus || [])) {
          selectedSkus.value.push({
            id: s.id, sku: s.sku || '', variants: s.variants || {},
            thumbnail: s.thumbnail || p.thumbnail || '', stock: 0, prices: [],
            qty: s.qty || 1, product_id: p.id, product_name: p.name,
          })
        }
      }
    }

    if (data.product_frees?.length) {
      selectedFreeSkus.value = data.product_frees.map((s: any) => ({
        id: s.id, sku: s.sku || '', variants: s.variants || {},
        thumbnail: s.product?.thumbnail || s.thumbnail || '', stock: 0, prices: [],
        qty: s.qty || 1, product_id: s.product_id || s.product?.id || '',
        product_name: s.product?.name || '', max_qty: s.max_qty || 1,
      }))
    }

    toast.success('Data berhasil dimuat')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data promosi')
    router.push('/promotion/free-product')
  }
  finally {
    loading.value = false
  }
}

// ── Submit ────────────────────────────────────────────────────
async function handleSubmit(status: 'draft' | 'upcoming' | 'active') {
  formErrors.value = {}
  saving.value = true
  try {
    const body: any = {
      name: form.name,
      note: form.note,
      date_start: formatDateTimeForApi(form.date_start),
      date_end: formatDateTimeForApi(form.date_end),
      tags: form.tags,
      terms: form.terms,
      status,
      internal_visibility: form.internal_visibility,
      web_visibility: form.web_visibility,
      app_visibility: form.app_visibility, 
      item_type: form.item_type, 
      is_multiple: form.is_multiple,
      customer_category_ids: selectedCustomerCategories.value.map(c => c.id),
      product_categories: form.item_type === 'category'
        ? selectedProductCategories.value.map(c => ({ id: c.id, qty: c.qty || 0 }))
        : [],
      products: form.item_type === 'product'
        ? selectedProducts.value.map(p => ({ id: p.id, qty: p.qty || 0 }))
        : [],
      product_skus: form.item_type === 'sku'
        ? selectedSkus.value.map(s => ({ id: s.id, qty: s.qty || 1 }))
        : [],
      product_frees: selectedFreeSkus.value.map(s => ({ id: s.id, qty: s.qty || 1, max_qty: s.max_qty || 1 })),
    }

    if (isEditMode.value) {
      await api.put(`/promotions/product-frees/${editId.value}`, body)
      toast.success('Promosi berhasil diperbarui')
    }
    else {
      await api.post('/promotions/product-frees/create', body)
      toast.success('Promosi berhasil dibuat')
    }
    router.push('/promotion/free-product')
  }
  catch (err: any) {
    if (err.errors) {
      formErrors.value = err.errors
      const allErrors: string[] = []
      for (const messages of Object.values(err.errors)) {
        if (Array.isArray(messages)) allErrors.push(...messages)
      }
      if (allErrors.length > 0) toast.error('Ada beberapa kesalahan dalam formulir, silakan periksa kembali')
      else toast.error(err.message || 'Gagal menyimpan promosi')
    }
    else {
      toast.error(err.message || 'Gagal menyimpan promosi')
    }
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  if (isEditMode.value) loadPromotion()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/promotion/free-product"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <div v-if="!loading">
        <h1 class="text-2xl font-bold text-gray-900">
          {{ isEditMode ? 'Edit Promosi Produk Gratis' : 'Buat Promosi Produk Gratis' }}
        </h1>
        <p class="mt-0.5 text-sm text-gray-500">
          {{ isEditMode ? 'Ubah promosi beli X dapat produk gratis' : 'Tambah promosi beli X dapat produk gratis' }}
        </p>
      </div>
      <div v-else class="h-9 w-64 animate-pulse rounded-lg bg-gray-200" />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <Loader2 class="mx-auto h-8 w-8 animate-spin text-primary-600" />
        <p class="mt-2 text-sm text-gray-500">Memuat data...</p>
      </div>
    </div>

    <div v-else>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- LEFT: Main form (2/3) -->
        <div class="space-y-6 lg:col-span-2">
          <!-- Informasi Dasar -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Informasi Dasar</h2>
            <div class="space-y-4">
              <!-- Nama -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">
                  Nama Promosi <span class="text-red-500">*</span>
                </label>
                <input v-model="form.name" type="text" class="form-input" placeholder="Contoh: Beli 3 Gratis 1 Hijab">
                <p v-if="getFieldError('name')" class="mt-1 text-xs text-red-600">{{ getFieldError('name') }}</p>
              </div>

              <!-- Catatan -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan Internal</label>
                <input v-model="form.note" type="text" class="form-input" placeholder="Catatan untuk tim internal">
                <p v-if="getFieldError('note')" class="mt-1 text-xs text-red-600">{{ getFieldError('note') }}</p>
              </div>

              <!-- Periode -->
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Tanggal & Waktu Mulai <span class="text-red-500">*</span>
                  </label>
                  <input v-model="form.date_start" type="datetime-local" class="form-input">
                  <p v-if="getFieldError('date_start')" class="mt-1 text-xs text-red-600">{{ getFieldError('date_start') }}</p>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Tanggal & Waktu Berakhir <span class="text-red-500">*</span>
                  </label>
                  <input v-model="form.date_end" type="datetime-local" class="form-input">
                  <p v-if="getFieldError('date_end')" class="mt-1 text-xs text-red-600">{{ getFieldError('date_end') }}</p>
                </div>
              </div>

              <!-- Tags -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Tags</label>
                <input v-model="form.tags" type="text" class="form-input" placeholder="ramadan,gratis,promo">
                <p v-if="getFieldError('tags')" class="mt-1 text-xs text-red-600">{{ getFieldError('tags') }}</p>
                <p v-else class="mt-1 text-xs text-gray-500">Pisahkan dengan koma</p>
              </div>

              <!-- Is Multiple -->
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700">Multiple Reward</label>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all"
                    :class="form.is_multiple === 'inactive' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                    @click="form.is_multiple = 'inactive'"
                  >
                    <Gift class="h-5 w-5" />
                    <div class="text-left">
                      <p class="text-sm font-semibold">Sekali</p>
                      <p class="text-xs opacity-70">1 set gratis per transaksi</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all"
                    :class="form.is_multiple === 'active' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                    @click="form.is_multiple = 'active'"
                  >
                    <Gift class="h-5 w-5" />
                    <div class="text-left">
                      <p class="text-sm font-semibold">Multiple</p>
                      <p class="text-xs opacity-70">Berlipat sesuai qty</p>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Terms -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Syarat & Ketentuan</label>
                <textarea
                  v-model="form.terms"
                  rows="3"
                  class="form-input"
                  placeholder="Berlaku untuk pembelian minimal 3 item hijab, gratis 1 hijab basic"
                />
                <p v-if="getFieldError('terms')" class="mt-1 text-xs text-red-600">{{ getFieldError('terms') }}</p>
              </div>
            </div>
          </div>

          <!-- Kategori Customer -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <div class="mb-4">
              <h2 class="mb-1 text-base font-semibold text-gray-900">Syarat Kategori Customer</h2>
              <p class="text-xs text-gray-500">Promosi hanya berlaku untuk kategori customer terpilih</p>
            </div>
            <AppCustomerCategoryPicker :added-ids="addedCustomerCategoryIds" class="mb-3" @select="addCustomerCategory" />
            <div v-if="selectedCustomerCategories.length > 0" class="space-y-2">
              <div
                v-for="category in selectedCustomerCategories"
                :key="category.id"
                class="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
              >
                <div class="flex items-center gap-3">
                  <Users class="h-4 w-4 text-gray-400" />
                  <div>
                    <p class="text-sm font-medium text-gray-900">{{ category.name }}</p>
                    <p v-if="category.description" class="text-xs text-gray-500">{{ category.description }}</p>
                  </div>
                </div>
                <button type="button" class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" @click="removeCustomerCategory(category.id)">
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>
            <div v-else
              class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400"
              :class="getFieldError('customer_category_ids') ? 'border-red-300 bg-red-50' : ''"
            >
              Belum ada kategori customer dipilih
            </div>
            <p v-if="getFieldError('customer_category_ids')" class="mt-1.5 text-xs text-red-600">{{ getFieldError('customer_category_ids') }}</p>
          </div>

          <!-- Syarat Produk -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <div class="mb-4">
              <h2 class="mb-1 text-base font-semibold text-gray-900">Syarat Produk (Yang Harus Dibeli)</h2>
              <p class="text-xs text-gray-500">Tentukan produk apa yang harus dibeli customer untuk mendapat produk gratis</p>
            </div>
            <div class="space-y-4">
              <!-- Tipe Item -->
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700">Tipe Item</label>
                <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <button
                    type="button"
                    :disabled="selectedSkus.length > 0 || selectedProducts.length > 0 || selectedProductCategories.length > 0"
                    class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all disabled:opacity-50"
                    :class="form.item_type === 'all' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                    @click="form.item_type = 'all'"
                  >
                    <Package class="h-5 w-5" />
                    <div class="text-left">
                      <p class="text-sm font-semibold">Semua</p>
                      <p class="text-xs opacity-70">Semua produk</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    :disabled="selectedSkus.length > 0 || selectedProducts.length > 0 || selectedProductCategories.length > 0"
                    class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all disabled:opacity-50"
                    :class="form.item_type === 'category' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                    @click="form.item_type = 'category'"
                  >
                    <Tag class="h-5 w-5" />
                    <div class="text-left">
                      <p class="text-sm font-semibold">Kategori</p>
                      <p class="text-xs opacity-70">Kategori produk</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    :disabled="selectedSkus.length > 0 || selectedProducts.length > 0 || selectedProductCategories.length > 0"
                    class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all disabled:opacity-50"
                    :class="form.item_type === 'product' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                    @click="form.item_type = 'product'"
                  >
                    <Package class="h-5 w-5" />
                    <div class="text-left">
                      <p class="text-sm font-semibold">Produk</p>
                      <p class="text-xs opacity-70">Produk spesifik</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    :disabled="selectedSkus.length > 0 || selectedProducts.length > 0 || selectedProductCategories.length > 0"
                    class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all disabled:opacity-50"
                    :class="form.item_type === 'sku' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                    @click="form.item_type = 'sku'"
                  >
                    <Box class="h-5 w-5" />
                    <div class="text-left">
                      <p class="text-sm font-semibold">SKU</p>
                      <p class="text-xs opacity-70">SKU spesifik</p>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Kategori Produk -->
              <div v-if="form.item_type === 'category'" class="pt-2">
                <AppProductCategoryPicker :added-ids="addedCategoryIds" class="mb-3" @select="addProductCategory" />
                <div v-if="selectedProductCategories.length > 0" class="space-y-2">
                  <table class="w-full text-left text-xs">
                    <thead>
                      <tr class="border-b border-gray-200">
                        <th class="px-2 py-2 font-medium text-gray-500">Kategori</th>
                        <th class="px-2 py-2 w-28 text-center font-medium text-gray-500">Min Qty Beli</th>
                        <th class="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="cat in selectedProductCategories" :key="cat.id" class="border-b border-gray-100">
                        <td class="px-2 py-2 text-gray-800">{{ cat.name }}</td>
                        <td class="px-2 py-2">
                          <input v-model.number="cat.qty" type="number" min="1" placeholder="0"
                            class="w-full rounded border border-gray-300 px-2 py-1 text-center text-xs focus:border-primary-500 focus:outline-none"
                          />
                        </td>
                        <td class="px-2 py-2">
                          <button type="button" class="text-gray-400 hover:text-red-600" @click="removeProductCategory(cat.id)">
                            <X class="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400"
                  :class="getFieldError('product_categories') ? 'border-red-300 bg-red-50' : ''"
                >
                  Belum ada kategori produk dipilih
                </div>
                <p v-if="getFieldError('product_categories')" class="mt-1.5 text-xs text-red-600">{{ getFieldError('product_categories') }}</p>
              </div>

              <!-- Produk -->
              <div v-else-if="form.item_type === 'product'" class="pt-2">
                <AppPromotionProductPicker :added-product-ids="addedProductIds" class="mb-3" @select="addProduct" />
                <div v-if="selectedProducts.length > 0" class="space-y-2">
                  <table class="w-full text-left text-xs">
                    <thead>
                      <tr class="border-b border-gray-200">
                        <th class="px-2 py-2 font-medium text-gray-500">Produk</th>
                        <th class="px-2 py-2 w-28 text-center font-medium text-gray-500">Min Qty Beli</th>
                        <th class="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="product in selectedProducts" :key="product.id" class="border-b border-gray-100">
                        <td class="px-2 py-2">
                          <div class="flex items-center gap-2">
                            <img v-if="product.thumbnail" :src="product.thumbnail" class="h-6 w-6 rounded object-cover" />
                            <Package v-else class="h-4 w-4 text-gray-400" />
                            <span class="text-gray-800">{{ product.name }}</span>
                          </div>
                        </td>
                        <td class="px-2 py-2">
                          <input v-model.number="product.qty" type="number" min="1" placeholder="0"
                            class="w-full rounded border border-gray-300 px-2 py-1 text-center text-xs focus:border-primary-500 focus:outline-none"
                          />
                        </td>
                        <td class="px-2 py-2">
                          <button type="button" class="text-gray-400 hover:text-red-600" @click="removeProduct(product.id)">
                            <X class="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400"
                  :class="getFieldError('products') ? 'border-red-300 bg-red-50' : ''"
                >
                  Belum ada produk dipilih
                </div>
                <p v-if="getFieldError('products')" class="mt-1.5 text-xs text-red-600">{{ getFieldError('products') }}</p>
              </div>

              <!-- SKU (multi selection, modal picker) -->
              <div v-else-if="form.item_type === 'sku'" class="pt-2 space-y-3">
                <!-- Modal picker trigger -->
                <AppPromotionSkuPicker :added-sku-ids="addedConditionSkuIds" @select="selectSku" />

                <!-- Selected SKUs table -->
                <div v-if="selectedSkus.length > 0">
                  <table class="w-full text-left text-xs">
                    <thead>
                      <tr class="border-b border-gray-200">
                        <th class="px-2 py-2 font-medium text-gray-500">SKU</th>
                        <th class="px-2 py-2 w-28 text-center font-medium text-gray-500">Min Qty Beli</th>
                        <th class="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="sku in selectedSkus" :key="sku.id" class="border-b border-gray-100">
                        <td class="px-2 py-2">
                          <div class="flex items-center gap-2">
                            <div class="h-7 w-7 shrink-0 overflow-hidden rounded bg-gray-100 ring-1 ring-gray-200">
                              <img v-if="sku.thumbnail" :src="sku.thumbnail" class="h-full w-full object-cover" />
                              <Box v-else class="h-full w-full p-1.5 text-gray-400" />
                            </div>
                            <div>
                              <p class="text-[10px] text-gray-400">{{ sku.product_name }}</p>
                              <p class="font-mono text-xs text-gray-800">{{ sku.sku }}</p>
                              <p class="text-[11px] text-gray-500">{{ formatVariants(sku.variants) }}</p>
                            </div>
                          </div>
                        </td>
                        <td class="px-2 py-2">
                          <input v-model.number="sku.qty" type="number" min="1" placeholder="0"
                            class="w-full rounded border border-gray-300 px-2 py-1 text-center text-xs focus:border-primary-500 focus:outline-none"
                          />
                        </td>
                        <td class="px-2 py-2">
                          <button type="button" class="text-gray-400 hover:text-red-600" @click="removeSku(sku.id)">
                            <X class="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else
                  class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400"
                  :class="getFieldError('product_skus') ? 'border-red-300 bg-red-50' : ''"
                >
                  Belum ada SKU dipilih
                </div>
                <p v-if="getFieldError('product_skus')" class="text-xs text-red-600">{{ getFieldError('product_skus') }}</p>
              </div>
            </div>
          </div>

          <!-- Produk Gratis -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <div class="mb-4">
              <h2 class="mb-1 text-base font-semibold text-gray-900">Produk Gratis</h2>
              <p class="text-xs text-gray-500">Pilih 1 SKU produk yang akan diberikan secara gratis kepada customer</p>
            </div>

            <!-- Modal picker trigger -->
            <AppPromotionSkuPicker :added-sku-ids="addedFreeSkuIds" class="mb-3" @select="selectFreeSku" />

            <!-- Selected free SKUs table -->
            <div v-if="selectedFreeSkus.length > 0">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-gray-200">
                    <th class="px-2 py-2 font-medium text-gray-500">SKU</th>
                    <th class="px-2 py-2 w-28 text-center font-medium text-gray-500">Qty Gratis</th> 
                    <th class="px-2 py-2 w-28 text-center font-medium text-gray-500">Total Maks Gratis</th>
                    <th class="w-8" />
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(sku, index) in selectedFreeSkus" :key="sku.id" class="border-b border-gray-100">
                    <td class="px-2 py-2">
                      <div class="flex items-center gap-2">
                        <div class="h-7 w-7 shrink-0 overflow-hidden rounded bg-gray-100 ring-1 ring-gray-200">
                          <img v-if="sku.thumbnail" :src="sku.thumbnail" class="h-full w-full object-cover" />
                          <Box v-else class="h-full w-full p-1.5 text-gray-400" />
                        </div>
                        <div>
                          <p class="text-[10px] text-gray-400">{{ sku.product_name }}</p>
                          <p class="font-mono text-xs text-gray-800">{{ sku.sku }}</p>
                          <p class="text-[11px] text-gray-500">{{ formatVariants(sku.variants) }}</p>
                        </div>
                      </div>
                      <p v-if="getFieldError(`product_frees[${index}]`)" class="mt-1.5 text-xs text-red-600">{{ getFieldError(`product_frees[${index}]`) }}</p>
                    </td>
                    <td class="px-2 py-2">
                      <input v-model.number="sku.qty" type="number" min="1" placeholder="0"
                        class="w-full rounded border border-gray-300 px-2 py-1 text-center text-xs focus:border-primary-500 focus:outline-none"
                      />
                    </td>
                    <td class="px-2 py-2">
                      <input v-model.number="sku.max_qty" type="number" min="1" placeholder="0"
                        class="w-full rounded border border-gray-300 px-2 py-1 text-center text-xs focus:border-primary-500 focus:outline-none"
                      />
                    </td>
                    <td class="px-2 py-2">
                      <button type="button" class="text-gray-400 hover:text-red-600" @click="removeFreeSku(sku.id)">
                        <X class="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else
              class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400"
              :class="getFieldError('product_frees') ? 'border-red-300 bg-red-50' : ''"
            >
              Belum ada SKU gratis dipilih
            </div>
            <p v-if="getFieldError('product_frees')" class="mt-1.5 text-xs text-red-600">{{ getFieldError('product_frees') }}</p>
          </div>
        </div>

        <!-- RIGHT: Sidebar (1/3) -->
        <div class="space-y-6">
          <!-- Visibilitas -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Visibilitas</h2>
            <div class="space-y-3">
              <label class="flex cursor-pointer items-center gap-3">
                <input :checked="form.internal_visibility === 'active'" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" @change="form.internal_visibility = ($event.target as HTMLInputElement).checked ? 'active' : 'inactive'">
                <span class="text-sm font-medium text-gray-700">Internal</span>
              </label>
              <label class="flex cursor-pointer items-center gap-3">
                <input :checked="form.web_visibility === 'active'" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" @change="form.web_visibility = ($event.target as HTMLInputElement).checked ? 'active' : 'inactive'">
                <span class="text-sm font-medium text-gray-700">Website</span>
              </label>
              <label class="flex cursor-pointer items-center gap-3">
                <input :checked="form.app_visibility === 'active'" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" @change="form.app_visibility = ($event.target as HTMLInputElement).checked ? 'active' : 'inactive'">
                <span class="text-sm font-medium text-gray-700">Mobile App</span>
              </label>
            </div>
          </div>

          <!-- Ringkasan -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Ringkasan</h2>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500">Tipe Item</dt>
                <dd class="font-medium text-gray-900 capitalize">{{ form.item_type }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Multiple Reward</dt>
                <dd class="font-medium text-gray-900">{{ form.is_multiple === 'active' ? 'Ya' : 'Tidak' }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Kategori Customer</dt>
                <dd class="font-medium text-gray-900">{{ selectedCustomerCategories.length }}</dd>
              </div>
              <div class="flex justify-between border-t border-gray-200 pt-2">
                <dt class="font-semibold text-gray-900">Produk Gratis</dt>
                <dd class="font-semibold text-green-600">{{ selectedFreeSkus.length ? selectedFreeSkus.length + ' SKU' : '-' }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="sticky bottom-0 mt-6 flex items-center justify-end gap-3 rounded-xl bg-white/90 px-5 py-4 shadow-sm ring-1 ring-gray-200 backdrop-blur">
        <NuxtLink
          to="/promotion/free-product"
          class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          Batal
        </NuxtLink> 
        <button
          type="button"
          :disabled="saving"
          class="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          @click="handleSubmit('active')"
        >
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          {{ saving ? 'Menyimpan...' : (isEditMode ? 'Simpan Perubahan' : 'Buat Promosi') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.form-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
