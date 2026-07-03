<script setup lang="ts">
import { ArrowLeft, Loader2, Percent, Package, Box, Trash2, ToggleRight, ToggleLeft, ChevronDown, Eye, EyeOff } from 'lucide-vue-next'
import { convertIsoToDatetimeLocal, formatDateTimeForApi } from '~/composables/useFormatters'
import type { PromotionProduct } from '~/components/AppPromotionProductPicker.vue'
import type { PromotionSku } from '~/components/AppPromotionSkuPicker.vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

// Edit mode detection
const editId = computed(() => route.query.edit as string | undefined)
const isEditMode = computed(() => !!editId.value)

const loading = ref(false)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})

// Form
const form = reactive({
  name: '',
  note: '',
  date_start: '',
  date_end: '',
  tags: '',
  discount_type: 'percentage' as string,
  item_type: 'product' as string,
  status: 'draft' as string,
  internal_visibility: 'inactive' as string,
  web_visibility: 'inactive' as string,
  app_visibility: 'inactive' as string,
})

// Product items
interface ProductItem {
  product_id: string
  product_name: string
  product_thumbnail: string
  min_qty: number
  max_qty: number
  status: string
  prices: ProductPrice[]
}

interface ProductPrice {
  customer_category_id: string
  customer_category_name: string
  price_min: string
  price_max: string
  discount_value: number | null
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
    min_qty: 0,
    max_qty: 0,
    status: 'active',
    prices: product.prices.map(p => ({
      customer_category_id: p.customer_category_id,
      customer_category_name: p.customer_category_name,
      price_min: p.price_min,
      price_max: p.price_max,
      discount_value: null,
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
  min_qty: number
  max_qty: number
  status: string
  prices: SkuPrice[]
}

interface SkuPrice {
  customer_category_id: string
  customer_category_name: string
  price: string
  discount_value: number | null
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
    min_qty: 0,
    max_qty: 0,
    status: 'active',
    prices: sku.prices.map(p => ({
      customer_category_id: p.customer_category_id,
      customer_category_name: p.customer_category_name,
      price: p.price,
      discount_value: null,
    })),
  })
}



const addedProductIds = computed(() => productItems.value.map(p => p.product_id))
const addedSkuIds = computed(() => skuItems.value.map(s => s.sku_id))

// Bulk discount values per category
const bulkDiscountValues = ref<Record<string, number | null>>({})
const bulkMinQty = ref<number | null>(null)
const bulkMaxQty = ref<number | null>(null)

// Selection for scoped bulk edit — when items are checked, bulk edit only
// applies to them; otherwise it applies to all items.
const selectedProductIds = ref<string[]>([])
const selectedSkuIds = ref<string[]>([])

// Show only checked items (hide unchecked)
const showOnlySelected = ref(false)

function toggleProductSelection(id: string) {
  const i = selectedProductIds.value.indexOf(id)
  if (i >= 0) selectedProductIds.value.splice(i, 1)
  else selectedProductIds.value.push(id)
}

function toggleSkuSelection(id: string) {
  const i = selectedSkuIds.value.indexOf(id)
  if (i >= 0) selectedSkuIds.value.splice(i, 1)
  else selectedSkuIds.value.push(id)
}

const allProductsSelected = computed(() =>
  productItems.value.length > 0 && selectedProductIds.value.length === productItems.value.length,
)

function toggleAllProducts() {
  selectedProductIds.value = allProductsSelected.value ? [] : productItems.value.map(p => p.product_id)
}

const allSkusSelected = computed(() =>
  skuItems.value.length > 0 && selectedSkuIds.value.length === skuItems.value.length,
)

function toggleAllSkus() {
  selectedSkuIds.value = allSkusSelected.value ? [] : skuItems.value.map(s => s.sku_id)
}

function isSkuGroupSelected(skus: SkuItem[]): boolean {
  return skus.length > 0 && skus.every(s => selectedSkuIds.value.includes(s.sku_id))
}

function toggleSkuGroup(skus: SkuItem[]) {
  const ids = skus.map(s => s.sku_id)
  if (isSkuGroupSelected(skus)) {
    selectedSkuIds.value = selectedSkuIds.value.filter(id => !ids.includes(id))
  } else {
    const set = new Set(selectedSkuIds.value)
    ids.forEach(id => set.add(id))
    selectedSkuIds.value = Array.from(set)
  }
}

// ─── Variant-based selection (SKU only) ─────────────────────────────────────
// Build variant groups (e.g. Warna, Ukuran) from the added SKUs, then let the
// user check a variant value to auto-select every SKU that has it.
const openVariantDropdown = ref<string | null>(null)

function getVariantPairs(variants: any): { name: string; value: string }[] {
  if (!variants) return []
  if (Array.isArray(variants)) {
    return variants
      .map(v => ({ name: String(v?.name ?? ''), value: String(v?.value ?? v?.name ?? v) }))
      .filter(v => v.name && v.value)
  }
  if (typeof variants === 'object') {
    return Object.entries(variants).map(([name, value]) => ({
      name,
      value: typeof value === 'object' && value !== null
        ? String((value as any).value || (value as any).name || value)
        : String(value),
    })).filter(v => v.name && v.value)
  }
  return []
}

const variantGroups = computed(() => {
  const groups: Record<string, string[]> = {}
  skuItems.value.forEach(item => {
    getVariantPairs(item.sku_variants).forEach(({ name, value }) => {
      if (!groups[name]) groups[name] = []
      if (!groups[name]!.includes(value)) groups[name]!.push(value)
    })
  })
  return Object.entries(groups).map(([name, values]) => ({ name, values }))
})

function skuIdsWithVariant(name: string, value: string): string[] {
  return skuItems.value
    .filter(item => getVariantPairs(item.sku_variants).some(v => v.name === name && v.value === value))
    .map(item => item.sku_id)
}

function isVariantValueSelected(name: string, value: string): boolean {
  const ids = skuIdsWithVariant(name, value)
  return ids.length > 0 && ids.every(id => selectedSkuIds.value.includes(id))
}

function toggleVariantValue(name: string, value: string) {
  const ids = skuIdsWithVariant(name, value)
  if (isVariantValueSelected(name, value)) {
    selectedSkuIds.value = selectedSkuIds.value.filter(id => !ids.includes(id))
  } else {
    const set = new Set(selectedSkuIds.value)
    ids.forEach(id => set.add(id))
    selectedSkuIds.value = Array.from(set)
  }
}

function isVariantGroupSelected(name: string): boolean {
  const group = variantGroups.value.find(g => g.name === name)
  return !!group && group.values.length > 0 && group.values.every(v => isVariantValueSelected(name, v))
}

function toggleVariantGroup(name: string) {
  const group = variantGroups.value.find(g => g.name === name)
  if (!group) return
  const ids = new Set<string>()
  group.values.forEach(v => skuIdsWithVariant(name, v).forEach(id => ids.add(id)))
  if (isVariantGroupSelected(name)) {
    selectedSkuIds.value = selectedSkuIds.value.filter(id => !ids.has(id))
  } else {
    const set = new Set(selectedSkuIds.value)
    ids.forEach(id => set.add(id))
    selectedSkuIds.value = Array.from(set)
  }
}

function applyBulkDiscount() {
  const hasValues = Object.values(bulkDiscountValues.value).some(v => v !== null && v !== undefined)
  
  // if (!hasValues) {
  //   toast.error('Masukkan minimal satu nilai diskon')
  //   return
  // }
  
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
    const targets = selectedProductIds.value.length
      ? productItems.value.filter(i => selectedProductIds.value.includes(i.product_id))
      : productItems.value
    targets.forEach(item => {
      item.prices.forEach(price => {
        const value = bulkDiscountValues.value[price.customer_category_id]
        if (value !== null && value !== undefined) {
          price.discount_value = value
          appliedCount++
        }
      })
      // Apply min/max qty if set
      if (bulkMinQty.value !== null && bulkMinQty.value !== undefined) {
        item.min_qty = bulkMinQty.value
      }
      if (bulkMaxQty.value !== null && bulkMaxQty.value !== undefined) {
        item.max_qty = bulkMaxQty.value
      }
    })
    toast.success(`Diskon diterapkan`)
  } else {
    const targets = selectedSkuIds.value.length
      ? skuItems.value.filter(i => selectedSkuIds.value.includes(i.sku_id))
      : skuItems.value
    targets.forEach(item => {
      item.prices.forEach(price => {
        const value = bulkDiscountValues.value[price.customer_category_id]
        if (value !== null && value !== undefined) {
          price.discount_value = value
          appliedCount++
        }
      })
      // Apply min/max qty if set
      if (bulkMinQty.value !== null && bulkMinQty.value !== undefined) {
        item.min_qty = bulkMinQty.value
      }
      if (bulkMaxQty.value !== null && bulkMaxQty.value !== undefined) {
        item.max_qty = bulkMaxQty.value
      }
    })
    toast.success(`Diskon diterapkan`)
  }
  
  // Reset bulk values
  bulkDiscountValues.value = {}
  bulkMinQty.value = null
  bulkMaxQty.value = null
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

function formatPrice(price: string): string {
  return new Intl.NumberFormat('id-ID').format(Number(price))
}

function getFieldError(field: string): string | undefined {
  return formErrors.value[field]?.[0]
}

function parseItemErrors(errors: Record<string, string[]>): string[] {
  const messages: string[] = []
  
  for (const [key, value] of Object.entries(errors)) {
    // Match patterns like "items[0].prices[6].discount_value"
    const itemMatch = key.match(/items\[(\d+)\]/)
    const priceMatch = key.match(/prices\[(\d+)\]/)
    const fieldMatch = key.match(/\.([^.]+)$/)
    
    if (itemMatch && itemMatch[1] && value.length > 0) {
      const itemIndex = parseInt(itemMatch[1])
      const errorMsg = value[0]
      
      if (form.item_type === 'product') {
        const item = productItems.value[itemIndex]
        if (item) {
          if (priceMatch && priceMatch[1]) {
            const priceIndex = parseInt(priceMatch[1])
            const price = item.prices[priceIndex]
            messages.push(`${item.product_name} - ${price?.customer_category_name || 'Kategori'}: ${errorMsg}`)
          } else {
            messages.push(`${item.product_name}: ${errorMsg}`)
          }
        } else {
          messages.push(`Item ${itemIndex + 1}: ${errorMsg}`)
        }
      } else {
        const item = skuItems.value[itemIndex]
        if (item) {
          if (priceMatch && priceMatch[1]) {
            const priceIndex = parseInt(priceMatch[1])
            const price = item.prices[priceIndex]
            messages.push(`${item.sku_code} - ${price?.customer_category_name || 'Kategori'}: ${errorMsg}`)
          } else {
            messages.push(`${item.sku_code}: ${errorMsg}`)
          }
        } else {
          messages.push(`Item ${itemIndex + 1}: ${errorMsg}`)
        }
      }
    } else if (value.length > 0 && value[0]) {
      // General field errors
      messages.push(value[0])
    }
  }
  
  return messages
}

async function loadDiscount() {
  loading.value = true
  
  try {
    const response: any = await api.get(`/promotions/discounts/${editId.value}`)
    const data = response.data
    
    // Populate form
    form.name = data.name || ''
    form.note = data.note || ''
    form.date_start = convertIsoToDatetimeLocal(data.date_start)
    form.date_end = convertIsoToDatetimeLocal(data.date_end)
    form.tags = data.tags
    form.discount_type = data.discount_type || 'percentage'
    form.item_type = data.item_type || 'product'
    form.status = data.status || 'draft'
    form.internal_visibility = data.internal_visibility || 'inactive'
    form.web_visibility = data.web_visibility || 'inactive'
    form.app_visibility = data.app_visibility || 'inactive'
    
    // Populate items based on type
    if (data.item_type === 'product' && data.item_products) {
      productItems.value = data.item_products.map((item: any) => ({
        product_id: item.product_id,
        product_name: item.name || item.product_name || '',
        product_thumbnail: item.thumbnail || '',
        min_qty: item.prices?.[0]?.min_qty || 0,
        max_qty: item.prices?.[0]?.max_qty || 0,
        status: item.prices?.[0]?.status || 'active',
        price_min: item.price_min || '0',
        price_max: item.price_max || '0',
        prices: (item.prices || []).map((p: any) => ({
          customer_category_id: p.customer_category_id,
          customer_category_name: p.customer_category_name || p.name || '',
          price_min: item.price_min || '0',
          price_max: item.price_max || '0',
          discount_value: p.discount_value || null,
        })),
      }))
    }
    else if (data.item_type === 'sku' && data.item_products) {
      // Flatten SKU items from grouped structure
      const allSkus: SkuItem[] = []
      data.item_products.forEach((productGroup: any) => {
        const productId = productGroup.product_id
        const productName = productGroup.product_name || productGroup.name || ''
        
        if (productGroup.skus) {
          productGroup.skus.forEach((sku: any) => {
            allSkus.push({
              product_id: productId,
              product_name: productName,
              sku_id: sku.sku_id || sku.id,
              sku_code: sku.sku_code || sku.sku || sku.code || '',
              sku_thumbnail: sku.thumbnail || '',
              sku_variants: sku.variants || {},
              min_qty: sku.prices?.[0]?.min_qty || 0,
              max_qty: sku.prices?.[0]?.max_qty || 0,
              status: sku.prices?.[0]?.status || 'active',
              prices: (sku.prices || []).map((p: any) => ({
                customer_category_id: p.customer_category_id,
                customer_category_name: p.customer_category_name || p.name || '',
                price: p.price || '0',
                discount_value: p.discount_value || null,
              })),
            })
          })
        }
      })
      skuItems.value = allSkus
    }
    
    toast.success('Data diskon berhasil dimuat')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data diskon')
    router.push('/promotion/discount')
  }
  finally {
    loading.value = false
  }
}

async function handleSubmit(status: 'draft' | 'upcoming' | 'active') {
  saving.value = true
  formErrors.value = {}
  
  try {
    const body: Record<string, any> = {
      name: form.name,
      note: form.note,
      date_start: formatDateTimeForApi(form.date_start),
      date_end: formatDateTimeForApi(form.date_end),
      tags: form.tags,
      discount_type: form.discount_type,
      item_type: form.item_type,
      status: status,
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
          min_qty: item.min_qty || 0,
          max_qty: item.max_qty || 0,
          status: item.status,
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
            min_qty: sku.min_qty || 0,
            max_qty: sku.max_qty || 0,
            status: sku.status,
          })),
        })),
      }))
    }

    if (isEditMode.value) {
      await api.put(`/promotions/discounts/${editId.value}`, body)
      toast.success('Promosi diskon berhasil diperbarui')
    } else {
      await api.post('/promotions/discounts/create', body)
      toast.success('Promosi diskon berhasil dibuat')
    }
    router.push('/promotion/discount')
  }
  catch (err: any) {
    if (err.errors) {
      formErrors.value = err.errors
      
      // Parse and display item-specific errors
      const itemErrors = parseItemErrors(err.errors)
      if (itemErrors.length > 0) {
        itemErrors.forEach(msg => toast.error(msg))
      } else {
        toast.error(err.message || 'Gagal membuat promosi diskon')
      }
    } else {
      toast.error(err.message || 'Gagal membuat promosi diskon')
    }
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

// Product items to display (respects "show only checked" toggle)
const displayedProductItems = computed(() =>
  showOnlySelected.value && selectedProductIds.value.length
    ? productItems.value.filter(i => selectedProductIds.value.includes(i.product_id))
    : productItems.value,
)

// Grouped SKU items to display (respects "show only checked" toggle)
const displayedGroupedSkuItems = computed(() => {
  const source = showOnlySelected.value && selectedSkuIds.value.length
    ? skuItems.value.filter(i => selectedSkuIds.value.includes(i.sku_id))
    : skuItems.value
  const grouped: Record<string, SkuItem[]> = {}
  source.forEach(sku => {
    if (!grouped[sku.product_id]) {
      grouped[sku.product_id] = []
    }
    grouped[sku.product_id]!.push(sku)
  })
  return grouped
})

// Parse errors to check if specific item/price has error
function hasItemError(itemIndex: number, priceIndex?: number): boolean {
  const prefix = `items[${itemIndex}]`
  
  for (const key of Object.keys(formErrors.value)) {
    if (priceIndex !== undefined) {
      if (key.startsWith(`${prefix}.prices[${priceIndex}]`)) {
        return true
      }
    } else {
      if (key.startsWith(prefix)) {
        return true
      }
    }
  }
  
  return false
}

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

// Load discount on mount if in edit mode
onMounted(() => {
  if (isEditMode.value) {
    loadDiscount()
  }
})
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
      <div v-if="!loading">
        <h1 class="text-2xl font-bold text-gray-900">{{ isEditMode ? 'Edit Diskon Produk' : 'Buat Diskon Produk' }}</h1>
        <p class="mt-0.5 text-sm text-gray-500">{{ isEditMode ? 'Ubah promosi diskon untuk produk atau SKU' : 'Tambah promosi diskon baru untuk produk atau SKU' }}</p>
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

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan Internal</label>
                <input
                  v-model="form.note"
                  type="text"
                  class="form-input"
                  placeholder="Catatan untuk tim internal"
                />
                <p v-if="getFieldError('note')" class="mt-1 text-xs text-red-600">{{ getFieldError('note') }}</p>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Tanggal & Waktu Mulai <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.date_start"
                    type="datetime-local"
                    class="form-input"
                  />
                  <p v-if="getFieldError('date_start')" class="mt-1 text-xs text-red-600">{{ getFieldError('date_start') }}</p>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Tanggal & Waktu Berakhir <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.date_end"
                    type="datetime-local"
                    class="form-input"
                  />
                  <p v-if="getFieldError('date_end')" class="mt-1 text-xs text-red-600">{{ getFieldError('date_end') }}</p>
                </div>
              </div>

              <!-- tags -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">
                  Tags
                </label>
                <input
                  v-model="form.tags"
                  type="text"
                  class="form-input"
                  placeholder="ramadan,flash-sale,promo"
                >
                <p v-if="getFieldError('tags')" class="mt-1 text-xs text-red-600">
                  {{ getFieldError('tags') }}
                </p>
                <p v-else class="mt-1 text-xs text-gray-500">
                  Pisahkan dengan koma
                </p>
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
                    <span class="text-lg font-bold">Rp</span>
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
                      (isEditMode || productItems.length > 0 || skuItems.length > 0) 
                        ? 'cursor-not-allowed opacity-50' 
                        : 'hover:border-gray-300 hover:bg-gray-50'
                    ]"
                    :disabled="isEditMode || productItems.length > 0 || skuItems.length > 0"
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
                      (isEditMode || productItems.length > 0 || skuItems.length > 0) 
                        ? 'cursor-not-allowed opacity-50' 
                        : 'hover:border-gray-300 hover:bg-gray-50'
                    ]"
                    :disabled="isEditMode || productItems.length > 0 || skuItems.length > 0"
                    @click="form.item_type = 'sku'; productItems = []; skuItems = []"
                  >
                    <Box class="h-5 w-5" />
                    <div class="text-left">
                      <p class="text-sm font-semibold">SKU</p>
                      <p class="text-xs opacity-70">Level varian</p>
                    </div>
                  </button>
                </div>
                <p v-if="isEditMode" class="mt-1.5 text-xs text-gray-500">
                  Tipe item tidak dapat diubah saat edit
                </p>
                <p v-else-if="productItems.length > 0 || skuItems.length > 0" class="mt-1.5 text-xs text-gray-500">
                  Hapus semua item terlebih dahulu untuk mengganti tipe
                </p>
              </div>
            </div>
          </div> 
        </div>

        <!-- RIGHT: Sidebar (1/3) -->
        <div class="space-y-6"> 

          <!-- Visibility -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Visibilitas</h2>
            <div class="space-y-3">
              <label class="flex cursor-pointer items-center gap-3">
                <input
                  :checked="form.internal_visibility === 'active'"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  @change="form.internal_visibility = ($event.target as HTMLInputElement).checked ? 'active' : 'inactive'"
                />
                <span class="text-sm font-medium text-gray-700">Internal</span>
              </label>
              <label class="flex cursor-pointer items-center gap-3">
                <input
                  :checked="form.web_visibility === 'active'"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  @change="form.web_visibility = ($event.target as HTMLInputElement).checked ? 'active' : 'inactive'"
                />
                <span class="text-sm font-medium text-gray-700">Website</span>
              </label>
              <label class="flex cursor-pointer items-center gap-3">
                <input
                  :checked="form.app_visibility === 'active'"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  @change="form.app_visibility = ($event.target as HTMLInputElement).checked ? 'active' : 'inactive'"
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
                <!-- Show only checked toggle -->
                <div v-if="selectedProductIds.length" class="flex justify-end">
                  <button
                    type="button"
                    class="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
                    :class="showOnlySelected ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'"
                    @click="showOnlySelected = !showOnlySelected"
                  >
                    <component :is="showOnlySelected ? EyeOff : Eye" class="h-4 w-4" />
                    <span>{{ showOnlySelected ? 'Tampilkan Semua' : 'Tampilkan yang Diceklis Saja' }}</span>
                  </button>
                </div>
                <div class="overflow-x-auto">
                <table class="w-full min-w-[1200px] text-left text-sm">
                  <thead>
                    <tr class="border-b-2 border-gray-200 bg-gray-50">
                      <th class="sticky left-0 z-10 min-w-[200px] bg-gray-50 px-3 py-3 font-semibold text-gray-700">
                        <div class="flex items-center gap-2">
                          <input
                            type="checkbox"
                            :checked="allProductsSelected"
                            class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            @change="toggleAllProducts"
                          />
                          <span>Produk</span>
                        </div>
                      </th>
                      <th class="px-3 py-3 text-center font-semibold text-gray-700 text-nowrap">Range Harga</th>
                      <th v-for="cat in customerCategories" :key="cat.id" class="px-3 py-3 text-center font-semibold text-gray-700">
                        <div class="flex flex-col">
                          <span>{{ cat.name }}</span>
                          <span class="text-xs font-normal text-gray-500">Diskon {{ form.discount_type === 'percentage' ? '(%)' : '(Rp)' }}</span>
                        </div>
                      </th>
                      <th class="px-3 py-3 text-center font-semibold text-gray-700">Min. Pembelian</th>
                      <th class="px-3 py-3 text-center font-semibold text-gray-700">Max. Pembelian</th> 
                      <th class="w-16 px-3 py-3"></th>
                    </tr>
                    <!-- Bulk Edit Row -->
                    <tr class="border-b border-gray-300 bg-primary-50">
                      <td class="sticky left-0 z-10 bg-primary-50 px-3 py-3">
                        <div class="flex flex-col gap-0.5">
                          <span class="text-xs font-semibold text-gray-700">Edit Massal</span>
                          <span v-if="selectedProductIds.length" class="text-[10px] text-primary-600">{{ selectedProductIds.length }} produk dipilih</span>
                          <span v-else class="text-[10px] text-gray-400">Semua produk</span>
                        </div>
                      </td>
                      <td class="px-3 py-3"></td>
                      <td v-for="cat in customerCategories" :key="cat.id" class="px-3 py-2">
                        <div class="relative">
                          <span v-if="form.discount_type==='fixed'" class="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
                          <input
                            v-model.number="bulkDiscountValues[cat.id]"
                            type="number"
                            min="0"
                            :step="form.discount_type === 'percentage' ? '0.01' : '1'"
                            :max="form.discount_type === 'percentage' ? '100' : undefined"
                            :placeholder="form.discount_type === 'percentage' ? '0' : '0'"
                            :class="form.discount_type == 'percentage' ? 'pl-1 pr-5 w-24' : 'pl-6 pr-1 w-28'"
                            class="rounded border border-gray-300 bg-white px-2 py-1.5 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                          />
                          <span v-if="form.discount_type==='percentage'" class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                        </div>
                      </td>
                      <!-- Bulk Min Qty -->
                      <td class="px-3 py-2">
                        <input
                          v-model.number="bulkMinQty"
                          type="number"
                          min="0"
                          placeholder="0"
                          class="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                        />
                      </td>
                      <!-- Bulk Max Qty -->
                      <td class="px-3 py-2">
                        <input
                          v-model.number="bulkMaxQty"
                          type="number"
                          min="0"
                          placeholder="0"
                          class="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                        />
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
                      v-for="(item, idx) in displayedProductItems"
                      :key="item.product_id"
                      class="border-b border-gray-100"
                      :class="selectedProductIds.includes(item.product_id) ? 'bg-primary-50/60' : 'hover:bg-gray-50'"
                    >
                      <td
                        class="sticky left-0 z-10 px-3 py-3"
                        :class="selectedProductIds.includes(item.product_id) ? 'bg-primary-50' : 'bg-white'"
                      >
                        <div class="flex items-center gap-2">
                          <input
                            type="checkbox"
                            :checked="selectedProductIds.includes(item.product_id)"
                            class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            @change="toggleProductSelection(item.product_id)"
                          />
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
                      <td class="px-3 py-3">
                        <p class="text-xs text-gray-600">
                          Rp {{ formatPrice(Math.min(...item.prices.map(p => Number(p.price_min))).toString()) }} - <br/>
                          Rp {{ formatPrice(Math.max(...item.prices.map(p => Number(p.price_max))).toString()) }}
                        </p>
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
                            :placeholder="form.discount_type === 'percentage' ? '0' : '0'"
                            :class="[
                              form.discount_type == 'percentage' ? 'pl-1 pr-5 w-24' : 'pl-6 pr-1 w-28',
                              hasItemError(idx, item.prices.indexOf(price)) ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                            ]"
                            class="rounded border border-gray-300 bg-white px-2 py-1.5 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                          />
                          <span v-if="form.discount_type==='percentage'" class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                        </div>
                      </td>
                      <!-- Min Qty -->
                      <td class="px-3 py-2">
                        <input
                          v-model.number="item.min_qty"
                          type="number"
                          min="0"
                          placeholder="0"
                          class="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                        />
                      </td>
                      <!-- Max Qty -->
                      <td class="px-3 py-2">
                        <input
                          v-model.number="item.max_qty"
                          type="number"
                          min="0"
                          placeholder="0"
                          class="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                        />
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
                <!-- Variant-based selection + show/hide toggle -->
                <div v-if="variantGroups.length || selectedSkuIds.length" class="flex flex-wrap items-center gap-3">
                  <template v-if="variantGroups.length">
                    <span class="text-xs font-medium text-gray-500">Ceklist berdasarkan variant:</span>
                    <div v-for="group in variantGroups" :key="group.name" class="relative">
                      <button
                        type="button"
                        class="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        @click="openVariantDropdown = openVariantDropdown === group.name ? null : group.name"
                      >
                        <span>Semua {{ group.name }}</span>
                        <ChevronDown class="h-4 w-4 text-gray-400 transition-transform" :class="openVariantDropdown === group.name ? 'rotate-180' : ''" />
                      </button>
                      <div
                        v-if="openVariantDropdown === group.name"
                        class="absolute left-0 top-full z-30 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1.5 shadow-lg"
                      >
                        <label class="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            :checked="isVariantGroupSelected(group.name)"
                            class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            @change="toggleVariantGroup(group.name)"
                          />
                          <span class="text-sm font-medium text-gray-700">Semua {{ group.name }}</span>
                        </label>
                        <div class="my-1 border-t border-gray-100"></div>
                        <label
                          v-for="value in group.values"
                          :key="value"
                          class="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            :checked="isVariantValueSelected(group.name, value)"
                            class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            @change="toggleVariantValue(group.name, value)"
                          />
                          <span class="text-sm text-gray-700">{{ value }}</span>
                        </label>
                      </div>
                    </div>
                  </template>
                  <!-- Show only checked toggle -->
                  <button
                    v-if="selectedSkuIds.length"
                    type="button"
                    class="ml-auto flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                    :class="showOnlySelected ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'"
                    @click="showOnlySelected = !showOnlySelected"
                  >
                    <component :is="showOnlySelected ? EyeOff : Eye" class="h-4 w-4" />
                    <span>{{ showOnlySelected ? 'Tampilkan Semua' : 'Tampilkan yang Diceklis Saja' }}</span>
                  </button>
                  <!-- Click-outside overlay -->
                  <div v-if="openVariantDropdown" class="fixed inset-0 z-20" @click="openVariantDropdown = null" />
                </div>

                <div class="overflow-x-auto">
                <table class="w-full min-w-[1200px] text-left text-sm">
                  <thead>
                    <tr class="border-b-2 border-gray-200 bg-gray-50">
                      <th class="sticky left-0 z-10 min-w-[200px] bg-gray-50 px-3 py-3 font-semibold text-gray-700">
                        <div class="flex items-center gap-2">
                          <input
                            type="checkbox"
                            :checked="allSkusSelected"
                            class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            @change="toggleAllSkus"
                          />
                          <span>Produk / SKU</span>
                        </div>
                      </th>
                      <th class="px-3 py-3 text-center font-semibold text-gray-700 text-nowrap">Range Harga</th>
                      <th v-for="cat in customerCategories" :key="cat.id" class="px-3 py-3 text-center font-semibold text-gray-700">
                        <div class="flex flex-col">
                          <span>{{ cat.name }}</span>
                          <span class="text-xs font-normal text-gray-500">Diskon {{ form.discount_type === 'percentage' ? '(%)' : '(Rp)' }}</span>
                        </div>
                      </th>
                      <th class="px-3 py-3 text-center font-semibold text-gray-700">Min. Pembelian</th>
                      <th class="px-3 py-3 text-center font-semibold text-gray-700">Max. Pembelian</th>
                      <th class="px-3 py-3 text-center font-semibold text-gray-700">Status</th> 
                    </tr>
                    <!-- Bulk Edit Row -->
                    <tr class="border-b border-gray-300 bg-primary-50">
                      <td class="sticky left-0 z-10 bg-primary-50 px-3 py-3" colspan="2">
                        <div class="flex flex-col gap-0.5">
                          <span class="text-xs font-semibold text-gray-700">Edit Massal</span>
                          <span v-if="selectedSkuIds.length" class="text-[10px] text-primary-600">{{ selectedSkuIds.length }} SKU dipilih</span>
                          <span v-else class="text-[10px] text-gray-400">Semua SKU</span>
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
                            :placeholder="form.discount_type === 'percentage' ? '0' : '0'"
                            :class="form.discount_type == 'percentage' ? 'pl-1 pr-5 w-24' : 'pl-6 pr-1 w-28'"
                            class="rounded border border-gray-300 bg-white px-2 py-1.5 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                          />
                          <span v-if="form.discount_type==='percentage'" class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                        </div>
                      </td>
                      <!-- Bulk Min Qty -->
                      <td class="px-3 py-2">
                        <input
                          v-model.number="bulkMinQty"
                          type="number"
                          min="0"
                          placeholder="0"
                          class="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                        />
                      </td>
                      <!-- Bulk Max Qty -->
                      <td class="px-3 py-2">
                        <input
                          v-model.number="bulkMaxQty"
                          type="number"
                          min="0"
                          placeholder="0"
                          class="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                        />
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
                    <template v-for="(skus, productId) in displayedGroupedSkuItems" :key="productId">
                      <!-- Product Parent Row -->
                      <tr class="border-b border-gray-200 bg-gray-100">
                        <td class="sticky left-0 z-10 bg-gray-100 px-3 py-2.5" colspan="2">
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                              <input
                                type="checkbox"
                                :checked="isSkuGroupSelected(skus)"
                                class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                @change="toggleSkuGroup(skus)"
                              />
                              <Package class="h-4 w-4 text-gray-600" />
                              <span class="font-semibold text-gray-900">{{ skus[0]?.product_name || 'Produk' }}</span>
                              <span class="rounded-full bg-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700 text-nowrap">
                                {{ skus.length }} SKU
                              </span>
                            </div>
                          </div>
                        </td>
                        <td :colspan="customerCategories.length + 3" class="text-right pr-5">
                          <button
                            type="button"
                            class="rounded p-1 text-gray-400 hover:bg-gray-300 hover:text-red-500"
                            @click="removeProduct(productId)"
                            title="Hapus semua SKU produk ini"
                          >
                            <Trash2 class="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                      <!-- SKU Child Rows -->
                      <tr
                        v-for="item in skus"
                        :key="item.sku_id"
                        class="border-b border-gray-100"
                        :class="selectedSkuIds.includes(item.sku_id) ? 'bg-primary-50/60' : 'hover:bg-gray-50'"
                      >
                        <td
                          class="sticky left-0 z-10 px-3 py-3"
                          :class="selectedSkuIds.includes(item.sku_id) ? 'bg-primary-50' : 'bg-white'"
                        >
                          <div class="flex items-center gap-2 pl-6">
                            <input
                              type="checkbox"
                              :checked="selectedSkuIds.includes(item.sku_id)"
                              class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              @change="toggleSkuSelection(item.sku_id)"
                            />
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
                        <td class="px-3 py-3">
                          <p class="text-xs text-gray-600">
                            Rp {{ formatPrice(Math.min(...item.prices.map(p => Number(p.price))).toString()) }} - <br/>
                            Rp {{ formatPrice(Math.max(...item.prices.map(p => Number(p.price))).toString()) }}
                          </p>
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
                              :class="[
                                form.discount_type == 'percentage' ? 'pl-1 pr-5 w-24' : 'pl-6 pr-1 w-28',
                                hasItemError(skuItems.indexOf(item), item.prices.indexOf(price)) ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                              ]"
                              class="rounded border border-gray-300 bg-white px-2 py-1.5 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                            />
                            <span v-if="form.discount_type==='percentage'" class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                          </div>
                        </td>
                        <!-- Min Qty -->
                        <td class="px-3 py-2">
                          <input
                            v-model.number="item.min_qty"
                            type="number"
                            min="0"
                            placeholder="0"
                            class="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                          />
                        </td>
                        <!-- Max Qty -->
                        <td class="px-3 py-2">
                          <input
                            v-model.number="item.max_qty"
                            type="number"
                            min="0"
                            placeholder="0"
                            class="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                          />
                        </td>
                        <!-- Status Toggle -->
                        <td class="px-3 py-2">
                          <div class="flex justify-center">
                            <button
                              type="button"
                              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                              @click="item.status = item.status === 'active' ? 'inactive' : 'active'"
                            >
                              <ToggleRight v-if="item.status === 'active'" class="h-5 w-5 text-green-500" />
                              <ToggleLeft v-else class="h-5 w-5 text-gray-400" />
                            </button>
                          </div>
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
      <div class="sticky z-10 bottom-0 -mx-4 mt-6 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <div class="flex items-center justify-end gap-3">
          <NuxtLink
            to="/promotion/discount"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Batal
          </NuxtLink>
          <button
            type="button"
            :disabled="saving"
            @click="handleSubmit('draft')"
            class="flex items-center gap-2 rounded-lg bg-gray-500 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            {{ saving ? 'Menyimpan...' : 'Simpan Draft' }}
          </button>
          <button
            type="submit"
            :disabled="saving"
            @click="handleSubmit('active')"
            class="flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            {{ saving ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </div> 
    </div>
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
