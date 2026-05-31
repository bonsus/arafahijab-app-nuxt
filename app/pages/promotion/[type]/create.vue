<script setup lang="ts">
import {
  ArrowLeft, Loader2, Percent, Package, Box, Tag, Trash2,
  Plus, X, Ticket, Users, Info, Wand2, ListPlus, Truck, MapPin,
} from 'lucide-vue-next'
import { convertIsoToDatetimeLocal, formatDateTimeForApi } from '~/composables/useFormatters'
import type { CustomerCategory } from '~/components/AppCustomerCategoryPicker.vue'
import type { ProductCategory } from '~/components/AppProductCategoryPicker.vue'
import type { PromotionProduct } from '~/components/AppPromotionProductPicker.vue'
import type { PromotionSku } from '~/components/AppPromotionSkuPicker.vue'
import type { Courier } from '~/components/AppCourierPicker.vue'
import type { SelectedArea } from '~/components/AppAreaPicker.vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const editId = computed(() => route.query.edit as string | undefined)
const isEditMode = computed(() => !!editId.value)
const promoType = computed(() => route.params.type as string)

const loading = ref(false)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})

const form = reactive({
  name: '',
  date_start: '',
  date_end: '',
  tags: '',
  discount_type: 'percentage' as string,
  discount_value: null as number | null,
  max_discount_value: null as number | null,
  min_spend: null as number | null,
  min_qty: null as number | null,
  terms: '',
  item_type: 'all' as string,
  item_operator: 'or' as string,
  status: 'draft' as string,
  note: '',
  public: 'active' as string,
  internal_visibility: 'inactive' as string,
  web_visibility: 'inactive' as string,
  app_visibility: 'inactive' as string,
  courier_type: 'all' as 'all' | 'specific',
  area_type: 'all' as 'all' | 'specific',
  max_use_per_customer: null as number | null,
})

interface Coupon {
  code: string
  max_use: number | null 
}

const coupons = ref<Coupon[]>([
  { code: '', max_use: null },
])

function addCoupon() {
  coupons.value.push({ code: '', max_use: null })
}

function removeCoupon(index: number) {
  if (coupons.value.length > 1) coupons.value.splice(index, 1)
  else toast.warning('Minimal 1 kupon harus ada')
}

// Bulk coupon editing
const bulkMaxUse = ref<number | null>(null)
const bulkMaxUsePerCustomer = ref<number | null>(null)

function applyBulkCoupon() {
  if (bulkMaxUse.value === null && bulkMaxUsePerCustomer.value === null) return
  coupons.value.forEach((c) => {
    if (bulkMaxUse.value !== null) c.max_use = bulkMaxUse.value
  })
  toast.success('Edit massal berhasil diterapkan')
}

// Tambah massal modal
const showAddMassalModal = ref(false)
const massalCodesText = ref('')

function applyAddMassal() {
  const lines = massalCodesText.value
    .split('\n')
    .map(l => l.trim().toUpperCase())
    .filter(l => l.length > 0)
  let added = 0
  for (const code of lines) {
    if (!coupons.value.some(c => c.code === code)) {
      coupons.value.push({ code, max_use: null })
      added++
    }
  }
  if (added > 0) toast.success(`${added} kode berhasil ditambahkan`)
  else toast.warning('Tidak ada kode baru yang ditambahkan')
  showAddMassalModal.value = false
  massalCodesText.value = ''
}

// Generate kode modal
const showGenerateModal = ref(false)
const generateForm = reactive({
  prefix: '',
  length: 8,
  count: 10,
  mode: 'random' as 'random' | 'sequential',
  start_number: 1,
})

function generateRandomCode(prefix: string, length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const prefixUpper = prefix.toUpperCase()
  const randomLength = Math.max(1, length - prefixUpper.length)
  const randomPart = Array.from({ length: randomLength }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('')
  return prefixUpper + randomPart
}

function applyGenerate() {
  const prefixUpper = generateForm.prefix.toUpperCase()
  if (generateForm.mode === 'sequential') {
    let added = 0
    for (let i = generateForm.start_number; added < generateForm.count; i++) {
      const numStr = String(i).padStart(Math.max(1, generateForm.length - prefixUpper.length), '0')
      const code = prefixUpper + numStr
      if (!coupons.value.some(c => c.code === code)) {
        coupons.value.push({ code, max_use: null })
        added++
      }
    }
    toast.success(`${added} kode berhasil digenerate`)
  }
  else {
    const maxAttempts = generateForm.count * 20
    let added = 0
    let attempts = 0
    while (added < generateForm.count && attempts < maxAttempts) {
      attempts++
      const code = generateRandomCode(generateForm.prefix, generateForm.length)
      if (!coupons.value.some(c => c.code === code)) {
        coupons.value.push({ code, max_use: null})
        added++
      }
    }
    if (added > 0) toast.success(`${added} kode berhasil digenerate`)
    else toast.warning('Gagal generate kode, coba ubah parameter')
  }
  showGenerateModal.value = false
}

const selectedCustomerCategories = ref<CustomerCategory[]>([])

function addCustomerCategory(category: CustomerCategory) {
  if (selectedCustomerCategories.value.some(c => c.id === category.id)) {
    toast.warning('Kategori sudah ditambahkan')
    return
  }
  selectedCustomerCategories.value.push(category)
}

function removeCustomerCategory(id: string) {
  selectedCustomerCategories.value = selectedCustomerCategories.value.filter(c => c.id !== id)
}

const selectedProductCategories = ref<ProductCategory[]>([])

function addProductCategory(category: ProductCategory) {
  if (selectedProductCategories.value.some(c => c.id === category.id)) {
    toast.warning('Kategori sudah ditambahkan')
    return
  }
  selectedProductCategories.value.push(category)
}

function removeProductCategory(id: string) {
  selectedProductCategories.value = selectedProductCategories.value.filter(c => c.id !== id)
}

const selectedProducts = ref<PromotionProduct[]>([])

function addProduct(product: PromotionProduct) {
  if (selectedProducts.value.some(p => p.id === product.id)) {
    toast.warning('Produk sudah ditambahkan')
    return
  }
  selectedProducts.value.push(product)
}

function removeProduct(id: string) {
  selectedProducts.value = selectedProducts.value.filter(p => p.id !== id)
}

interface SelectedSku extends PromotionSku {
  product_id: string
  product_name: string
}

const selectedSkus = ref<SelectedSku[]>([])

function addSku(productId: string, productName: string, sku: PromotionSku) {
  if (selectedSkus.value.some(s => s.id === sku.id)) {
    toast.warning('SKU sudah ditambahkan')
    return
  }
  selectedSkus.value.push({ ...sku, product_id: productId, product_name: productName })
}

function removeSku(id: string) {
  selectedSkus.value = selectedSkus.value.filter(s => s.id !== id)
}

// Couriers
interface SelectedCourier extends Courier {
  services: Array<Courier['services'][number] & { selected_status: 'active' | 'inactive' }>
}

const selectedCouriers = ref<SelectedCourier[]>([])

function addCourierFromPicker(courier: Courier) {
  if (selectedCouriers.value.some(c => c.courier_code === courier.courier_code)) {
    toast.warning('Kurir sudah ditambahkan')
    return
  }
  selectedCouriers.value.push({
    ...courier,
    services: courier.services.map(s => ({ ...s, selected_status: 'active' as const })),
  })
}

function removeCourierEntry(courierCode: string) {
  selectedCouriers.value = selectedCouriers.value.filter(c => c.courier_code !== courierCode)
}

function toggleServiceStatus(courierCode: string, serviceCode: string) {
  const courier = selectedCouriers.value.find(c => c.courier_code === courierCode)
  if (!courier) return
  const service = courier.services.find(s => s.service_code === serviceCode)
  if (!service) return
  service.selected_status = service.selected_status === 'active' ? 'inactive' : 'active'
}

const addedCourierCodes = computed(() => selectedCouriers.value.map(c => c.courier_code))

// Areas
const selectedAreas = ref<SelectedArea[]>([])

function addAreaFromPicker(area: SelectedArea) {
  const isDupe = selectedAreas.value.some(
    a => a.province === area.province && a.city === area.city,
  )
  if (isDupe) {
    toast.warning('Area sudah ditambahkan')
    return
  }
  selectedAreas.value.push(area)
}

function removeArea(index: number) {
  selectedAreas.value.splice(index, 1)
}

const addedAreasList = computed(() => selectedAreas.value)

const addedProductIds = computed(() => selectedProducts.value.map(p => p.id))
const addedSkuIds = computed(() => selectedSkus.value.map(s => s.id))
const addedCategoryIds = computed(() => selectedProductCategories.value.map(c => c.id))
const addedCustomerCategoryIds = computed(() => selectedCustomerCategories.value.map(c => c.id))

const groupedSkus = computed(() => {
  const grouped: Record<string, SelectedSku[]> = {}
  selectedSkus.value.forEach((sku) => {
    if (!grouped[sku.product_id]) grouped[sku.product_id] = []
    grouped[sku.product_id]!.push(sku)
  })
  return grouped
})

function formatVariants(variants: any): string {
  if (!variants) return '-'
  if (Array.isArray(variants)) {
    if (variants.length === 0) return '-'
    return variants.map(v => v.value || v.name || String(v)).join(' / ')
  }
  if (typeof variants === 'object') {
    const entries = Object.entries(variants)
    if (entries.length === 0) return '-'
    return entries.map(([_, value]) => {
      if (typeof value === 'object' && value !== null) {
        return (value as any).value || (value as any).name || String(value)
      }
      return String(value)
    }).join(' / ')
  }
  return String(variants)
}

function getFieldError(field: string): string | undefined {
  return formErrors.value[field]?.[0]
}

async function loadPromotion() {
  loading.value = true
  try {
    const response: any = await api.get(`/promotions/checkouts/${editId.value}`)
    const data = response.data

    form.name = data.name || ''
    form.date_start = convertIsoToDatetimeLocal(data.date_start)
    form.date_end = convertIsoToDatetimeLocal(data.date_end)
    form.tags = data.tags || ''
    form.discount_type = data.discount_type || 'percentage'
    form.discount_value = data.discount_value || null
    form.max_discount_value = data.max_discount_value || null
    form.min_spend = data.min_spend || null
    form.min_qty = data.min_qty || null
    form.terms = data.terms || ''
    form.item_type = data.item_type || 'all'
    form.item_operator = data.item_operator || 'or'
    form.status = data.status || 'draft'
    form.note = data.note || ''
    form.public = data.public || 'active'
    form.internal_visibility = data.internal_visibility || 'inactive'
    form.web_visibility = data.web_visibility || 'inactive'
    form.app_visibility = data.app_visibility || 'inactive'
    form.courier_type = data.courier_type || 'all'
    form.area_type = data.area_type || 'all'
    form.max_use_per_customer = data.max_use_per_customer || null

    if (data.couriers && data.couriers.length > 0) {
      // Fetch full courier list to get complete service details
      try {
        const courierRes: any = await api.get('/couriers/index')
        const allCouriers: Courier[] = courierRes.data || []
        selectedCouriers.value = data.couriers.reduce((acc: SelectedCourier[], c: any) => {
          const full = allCouriers.find(fc => fc.courier_code === c.courier_code)
          if (!full) return acc
          // Build service status map from nested services array
          const serviceStatusMap: Record<string, 'active' | 'inactive'> = {}
          if (Array.isArray(c.services)) {
            for (const svc of c.services) {
              serviceStatusMap[svc.service_code] = svc.status || 'active'
            }
          }
          acc.push({
            ...full,
            services: full.services.map(s => ({
              ...s,
              selected_status: serviceStatusMap[s.service_code] ?? 'inactive',
            })),
          })
          return acc
        }, [])
      } catch { /* ignore */ }
    }

    if (data.areas && data.areas.length > 0) {
      selectedAreas.value = data.areas.map((a: any) => ({
        province: a.province || '',
        city: a.city || '',
      }))
    }

    if (data.coupons && data.coupons.length > 0) {
      coupons.value = data.coupons.map((c: any) => ({
        code: c.code || '',
        max_use: c.max_use || null,
        max_use_per_customer: c.max_use_per_customer || 1,
      }))
    }

    if (data.customer_categories && data.customer_categories.length > 0) {
      selectedCustomerCategories.value = data.customer_categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
      }))
    }

    if (data.item_type === 'category' && data.product_categories) {
      selectedProductCategories.value = data.product_categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        qty: c.qty || 0,
      }))
    }
    else if (data.item_type === 'product' && data.products) {
      selectedProducts.value = data.products.map((p: any) => ({
        id: p.id,
        name: p.name,
        thumbnail: p.thumbnail || '',
        stock: 0,
        prices: [],
        qty: p.qty || 0,
      }))
    }
    else if (data.item_type === 'sku' && data.products) {
      selectedSkus.value = data.products.flatMap((p: any) =>
        (p.skus || []).map((s: any) => ({
          id: s.id,
          sku: s.sku || s.sku_code || '',
          variants: s.variants || {},
          thumbnail: s.thumbnail || p.thumbnail || '',
          stock: 0,
          prices: [],
          product_id: p.id,
          product_name: p.name,
          qty:s.qty || 0,
        })),
      )
    }

    toast.success('Data berhasil dimuat')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data promosi')
    router.push('/promotion/checkout')
  }
  finally {
    loading.value = false
  }
}

async function handleSubmit(status: 'draft' | 'upcoming' | 'active') {
  formErrors.value = {}
  saving.value = true

  try {
    const body: any = {
      type: promoType.value,
      name: form.name,
      note: form.note,
      date_start: formatDateTimeForApi(form.date_start),
      date_end: formatDateTimeForApi(form.date_end),
      tags: form.tags,
      status,
      public: form.public,
      internal_visibility: form.internal_visibility,
      web_visibility: form.web_visibility,
      app_visibility: form.app_visibility,
      discount_type: form.discount_type,
      discount_value: form.discount_value || 0,
      max_discount_value: form.max_discount_value || 0,
      min_spend: form.min_spend || 0,
      min_qty: form.min_qty || 0,
      terms: form.terms,
      item_type: form.item_type,
      item_operator: form.item_operator,
      customer_category_ids: selectedCustomerCategories.value.map(c => c.id),
      coupons: coupons.value.map(c => ({
        code: c.code,
        max_use: c.max_use || 0, 
      })), 
      product_categories: form.item_type === 'category' ? selectedProductCategories.value.map(c => ({ id: c.id, qty: c.qty || 0 })) : [],
      products: form.item_type === 'product' ? selectedProducts.value.map(p => ({ id: p.id, qty: p.qty || 0 })) : [],
      product_skus: form.item_type === 'sku' ? selectedSkus.value.map(s => ({ id: s.id, qty: s.qty || 0 })) : [],
      courier_type: form.courier_type,
      area_type: form.area_type,
      couriers: form.courier_type === 'specific'
        ? selectedCouriers.value.flatMap(c =>
            c.services.map(s => ({
              courier_name: c.courier_name,
              courier_code: c.courier_code,
              service_code: s.service_code,
              service_name: s.service_name,
              status: s.selected_status,
            })),
          )
        : [],
      areas: form.area_type === 'specific' ? selectedAreas.value : [],
      max_use_per_customer: form.max_use_per_customer || null,
    }

    if (isEditMode.value) {
      await api.put(`/promotions/checkouts/${editId.value}`, body)
      toast.success('Promosi berhasil diperbarui')
    }
    else {
      await api.post(`/promotions/checkouts/create`, body)
      toast.success('Promosi berhasil dibuat')
    }
    router.push(`/promotion/${promoType.value}`)
  }
  catch (err: any) {
    if (err.errors) {
      formErrors.value = err.errors
      const allErrors: string[] = []
      for (const messages of Object.values(err.errors)) {
        if (Array.isArray(messages)) allErrors.push(...messages)
      }
      if (allErrors.length > 0) toast.error("ada beberapa kesalahan dalam formulir, silakan periksa kembali")
      else toast.error(err.message || 'Gagal menyimpan promosi checkout')
    }
    else {
      toast.error(err.message || 'Gagal menyimpan promosi checkout')
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
        :to="`/promotion/${promoType}`"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <div v-if="!loading">
        <template v-if="promoType == 'checkout'">
          <h1 class="text-2xl font-bold text-gray-900">
            {{ isEditMode ? 'Edit Promosi Checkout' : 'Buat Promosi Checkout' }}
          </h1>
          <p class="mt-0.5 text-sm text-gray-500">
            {{ isEditMode ? 'Ubah promosi diskon checkout/keranjang' : 'Tambah promosi diskon untuk keranjang belanja' }}
          </p>
        </template>
        <template v-else-if="promoType == 'shipping'">
          <h1 class="text-2xl font-bold text-gray-900">
            {{ isEditMode ? 'Edit Promosi Ongkir' : 'Buat Promosi Ongkir' }}
          </h1>
          <p class="mt-0.5 text-sm text-gray-500">
            {{ isEditMode ? 'Ubah promosi diskon ongkir' : 'Tambah promosi diskon untuk ongkos kirim' }}
          </p>
        </template>
      </div>
      <div v-else class="h-9 w-64 animate-pulse rounded-lg bg-gray-200" />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <Loader2 class="mx-auto h-8 w-8 animate-spin text-primary-600" />
        <p class="mt-2 text-sm text-gray-500">
          Memuat data...
        </p>
      </div>
    </div>

    <div v-else>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- LEFT: Main form (2/3) -->
        <div class="space-y-6 lg:col-span-2">
          <!-- Informasi Dasar -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 text-base font-semibold text-gray-900">
              Informasi Dasar
            </h2>
            <div class="space-y-4">
              <!-- Nama Promosi -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">
                  Nama Promosi <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  class="form-input"
                  placeholder="Contoh: Promo Ramadan 2026"
                >
                <p v-if="getFieldError('name')" class="mt-1 text-xs text-red-600">
                  {{ getFieldError('name') }}
                </p>
              </div>
              <!-- Catatan Internal -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">
                  Catatan Internal
                </label>
                <input
                  v-model="form.note"
                  type="text"
                  class="form-input"
                  placeholder="Catatan untuk tim internal (opsional)"
                >
              </div>
              <!-- Periode -->
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Tanggal & Waktu Mulai <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.date_start"
                    type="datetime-local"
                    class="form-input"
                  >
                  <p v-if="getFieldError('date_start')" class="mt-1 text-xs text-red-600">
                    {{ getFieldError('date_start') }}
                  </p>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Tanggal & Waktu Berakhir <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.date_end"
                    type="datetime-local"
                    class="form-input"
                  >
                  <p v-if="getFieldError('date_end')" class="mt-1 text-xs text-red-600">
                    {{ getFieldError('date_end') }}
                  </p>
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

              <!-- Tipe Diskon -->
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700">Tipe Diskon</label>
                <div class="grid gap-3" :class="promoType == 'checkout' ? 'grid-cols-2' : 'grid-cols-3'">
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
                      <p class="text-sm font-semibold">
                        Persentase
                      </p>
                      <p class="text-xs opacity-70">
                        Diskon dalam %
                      </p>
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
                      <p class="text-sm font-semibold">
                        Nominal
                      </p>
                      <p class="text-xs opacity-70">
                        Diskon tetap Rp
                      </p>
                    </div>
                  </button>
                  <!-- harga tetap -->
                  <button v-if="promoType === 'shipping'"
                    type="button"
                    class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all"
                    :class="form.discount_type === 'fixed_price'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                    @click="form.discount_type = 'fixed_price'"
                  >
                    <Ticket class="h-5 w-5" />
                    <div class="text-left">
                      <p class="text-sm font-semibold">
                        Harga Tetap
                      </p>
                      <p class="text-xs opacity-70">
                        Set harga ongkir menjadi Rp
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Nilai & Max Diskon -->
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    <template v-if="form.discount_type === 'fixed_price'">
                      Harga Ongkir
                    </template>
                    <template v-else>
                      Nilai Diskon 
                    </template>
                    <span class="text-red-500">*</span>
                  </label> 
                  <div class="relative">
                    <span v-if="form.discount_type==='fixed' || form.discount_type==='fixed_price'" class="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
                    <input
                      v-model.number="form.discount_value"
                      type="number"
                      min="0"
                      :step="form.discount_type === 'percentage' ? '0.1' : '1000'"
                      :max="form.discount_type === 'percentage' ? '100' : undefined"
                      :placeholder="form.discount_type === 'percentage' ? '0' : '0'"
                      :class="form.discount_type == 'percentage' ? 'pl-1 pr-5 text-center' : 'pl-7 pr-1'"
                      class="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                    />
                    <span v-if="form.discount_type==='percentage'" class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                  </div>
                  <p v-if="getFieldError('discount_value')" class="mt-1 text-xs text-red-600">
                    {{ getFieldError('discount_value') }}
                  </p>
                </div>
                <div v-if="form.discount_type === 'percentage'">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Maksimal Diskon
                  </label>
                  <div class="relative">
                    <span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
                    <input v-model.number="form.max_discount_value" type="number" min="0" step="1000" placeholder="0"
                      class="w-full pl-7 pr-2 rounded-md border border-gray-300 bg-white px-2 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                    />
                  </div>
                  <p v-if="getFieldError('max_discount_value')" class="mt-1 text-xs text-red-600">
                    {{ getFieldError('max_discount_value') }}
                  </p>
                </div>
              </div>

              <!-- Min Spend & Min Qty -->
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Maks. Per Customer
                  </label>
                  <input v-model.number="form.max_use_per_customer" type="number" min="0" placeholder="0"
                      class="w-full text-center rounded-md border border-gray-300 bg-white px-2 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                    />
                  <p v-if="getFieldError('max_use_per_customer')" class="mt-1 text-xs text-red-600">
                    {{ getFieldError('max_use_per_customer') }}
                  </p>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Minimum Qty Item
                  </label>
                  <input v-model.number="form.min_qty" type="number" min="0" placeholder="0"
                      class="w-full text-center rounded-md border border-gray-300 bg-white px-2 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                    />
                  <p v-if="getFieldError('min_qty')" class="mt-1 text-xs text-red-600">
                    {{ getFieldError('min_qty') }}
                  </p>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Minimum Belanja
                  </label>
                  <div class="relative">
                    <span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
                    <input v-model.number="form.min_spend" type="number" min="0" step="1000" placeholder="0"
                      class="w-full pl-7 pr-2 rounded-md border border-gray-300 bg-white px-2 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                    />
                  </div>
                  <p v-if="getFieldError('min_spend')" class="mt-1 text-xs text-red-600">
                    {{ getFieldError('min_spend') }}
                  </p>
                </div>
              </div>

              <!-- Terms -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">
                  Syarat & Ketentuan
                </label>
                <textarea
                  v-model="form.terms"
                  rows="3"
                  class="form-input"
                  placeholder="Berlaku untuk pembelian minimal 2 item dengan total Rp 500.000"
                />
                <p v-if="getFieldError('terms')" class="mt-1 text-xs text-red-600">
                  {{ getFieldError('terms') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Kategori Customer -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <div class="mb-4">
              <h2 class="mb-1 text-base font-semibold text-gray-900">
                Syarat Kategori Customer
              </h2>
              <p class="text-xs text-gray-500">
                Promosi hanya berlaku untuk kategori customer terpilih
              </p>
            </div>

            <AppCustomerCategoryPicker
              :added-ids="addedCustomerCategoryIds"
              class="mb-3"
              @select="addCustomerCategory"
            />

            <div v-if="selectedCustomerCategories.length > 0" class="space-y-2">
              <div
                v-for="category in selectedCustomerCategories"
                :key="category.id"
                class="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
              >
                <div class="flex items-center gap-3">
                  <Users class="h-4 w-4 text-gray-400" />
                  <div>
                    <p class="text-sm font-medium text-gray-900">
                      {{ category.name }}
                    </p>
                    <p v-if="category.description" class="text-xs text-gray-500">
                      {{ category.description }}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  @click="removeCustomerCategory(category.id)"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>
            <div v-else class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400"
              :class="getFieldError('customer_category_ids') ? 'border-red-300 bg-red-50' : ''"
            >
              Belum ada kategori customer dipilih
            </div>
            <p v-if="getFieldError('customer_category_ids')" class="mt-1.5 text-xs text-red-600">
              {{ getFieldError('customer_category_ids') }}
            </p>
          </div>

          <!-- Syarat Produk -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <div class="mb-4">
              <h2 class="mb-1 text-base font-semibold text-gray-900">
                Syarat Produk
              </h2>
              <p class="text-xs text-gray-500">
                Tentukan produk apa saja yang dapat menggunakan promosi ini
              </p>
            </div>

            <div class="space-y-4">
              <!-- Tipe Item -->
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700">Tipe Item</label>
                <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <!-- all -->
                  <button
                    type="button"
                    :disabled="selectedSkus.length > 0 || selectedProducts.length > 0 || selectedProductCategories.length > 0"
                    class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all"
                    :class="form.item_type === 'all'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                    @click="form.item_type = 'all'"
                  >
                    <Package class="h-5 w-5" />
                    <div class="text-left">
                      <p class="text-sm font-semibold">
                        Semua
                      </p>
                      <p class="text-xs opacity-70">
                        Semua produk
                      </p>
                    </div>
                  </button>
                  <!-- category -->
                  <button
                    type="button"
                    :disabled="selectedSkus.length > 0 || selectedProducts.length > 0 || selectedProductCategories.length > 0"
                    class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all"
                    :class="form.item_type === 'category'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                    @click="form.item_type = 'category'"
                  >
                    <Tag class="h-5 w-5" />
                    <div class="text-left">
                      <p class="text-sm font-semibold">
                        Kategori
                      </p>
                      <p class="text-xs opacity-70">
                        Per kategori
                      </p>
                    </div>
                  </button>
                  <!-- product -->
                  <button
                    type="button"
                    :disabled="selectedSkus.length > 0 || selectedProducts.length > 0 || selectedProductCategories.length > 0"
                    class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all"
                    :class="form.item_type === 'product'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                    @click="form.item_type = 'product'"
                  >
                    <Package class="h-5 w-5" />
                    <div class="text-left">
                      <p class="text-sm font-semibold">
                        Produk
                      </p>
                      <p class="text-xs opacity-70">
                        Spesifik
                      </p>
                    </div>
                  </button>
                  <!-- sku -->
                  <button
                    type="button"
                    :disabled="selectedSkus.length > 0 || selectedProducts.length > 0 || selectedProductCategories.length > 0"
                    class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all"
                    :class="form.item_type === 'sku'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                    @click="form.item_type = 'sku'"
                  >
                    <Box class="h-5 w-5" />
                    <div class="text-left">
                      <p class="text-sm font-semibold">
                        SKU
                      </p>
                      <p class="text-xs opacity-70">
                        Level varian
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Operator -->
              <div v-if="form.item_type !== 'all'">
                <label class="mb-2 block text-sm font-medium text-gray-700">Operator Item</label>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all"
                    :class="form.item_operator === 'or'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                    @click="form.item_operator = 'or'"
                  >
                    <Info class="h-5 w-5" />
                    <div class="text-left">
                      <p class="text-sm font-semibold">
                        OR (Salah Satu)
                      </p>
                      <p class="text-xs opacity-70">
                        Salah satu item memenuhi
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all"
                    :class="form.item_operator === 'and'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                    @click="form.item_operator = 'and'"
                  >
                    <Info class="h-5 w-5" />
                    <div class="text-left">
                      <p class="text-sm font-semibold">
                        AND (Semua)
                      </p>
                      <p class="text-xs opacity-70">
                        Semua item harus ada
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Kategori Produk -->
              <div v-if="form.item_type === 'category'" class="pt-2">
                <AppProductCategoryPicker
                  :added-ids="addedCategoryIds"
                  class="mb-3"
                  @select="addProductCategory"
                /> 
                <div v-if="selectedProductCategories.length > 0" class="space-y-2">
                  <table class="w-full text-left text-xs">
                    <thead>
                      <tr class="border-b border-gray-300">
                        <th class="px-2 py-1 text-gray-500">Kategori Produk</th>
                        <th class="px-2 py-1 text-gray-500 text-center">Min Qty</th>
                        <th class="px-2 py-1 w-4" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(category, index) in selectedProductCategories" :key="category.id" class="border-b border-gray-100">
                        <td class="px-2 py-1">
                          <div class="flex items-center gap-3">
                            <Tag class="h-6 w-6 shrink-0 rounded-lg bg-white p-1 text-gray-400" />
                            <p class="text-gray-800">
                              {{ category.name }}
                            </p>
                          </div> 
                        </td>
                        <td class="px-2 py-1 text-center">
                          <input
                            v-model.number="category.qty"
                            type="number"
                            min="1"
                            placeholder=""
                            :class="getFieldError(`product_categories[${index}].qty`) ? 'border-red-300 bg-red-50' : ''"
                            class="w-16 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                          />
                          <p v-if="getFieldError(`product_categories[${index}].qty`)" class="mt-1 text-xs text-red-600">
                            {{ getFieldError(`product_categories[${index}].qty`) }}
                          </p>
                        </td>
                        <td class="px-2 py-1 text-right">
                          <button 
                            type="button"
                            class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            @click="removeProductCategory(category.id)"
                          >
                            <X class="h-4 w-4" />
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
                <p v-if="getFieldError('product_categories')" class="mt-1.5 text-xs text-red-600">
                  {{ getFieldError('product_categories') }}
                </p>
              </div>

              <!-- Produk -->
              <div v-else-if="form.item_type === 'product'" class="pt-2">
                <AppPromotionProductPicker
                  :added-product-ids="addedProductIds"
                  class="mb-3"
                  @select="addProduct"
                /> 
                <div v-if="selectedProducts.length > 0" class="space-y-2">
                  <table class="w-full text-left text-xs">
                    <thead>
                      <tr class="border-b border-gray-300">
                        <th class="px-2 py-1 text-gray-500">Produk</th>
                        <th class="px-2 py-1 text-gray-500 text-center">Min Qty</th>
                        <th class="px-2 py-1 w-4" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(product, index) in selectedProducts" :key="product.id" class="border-b border-gray-100">
                        <td class="px-2 py-1">
                          <div class="flex items-center gap-3">
                            <div class="h-6 w-6 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-gray-200">
                              <img
                                v-if="product.thumbnail"
                                :src="product.thumbnail"
                                :alt="product.name"
                                class="h-full w-full object-cover"
                              >
                              <Package v-else class="h-full w-full p-1 text-gray-400" />
                            </div>
                            <p class="text-gray-800">
                              {{ product.name }}
                            </p>
                          </div>
                        </td>
                        <td class="px-2 py-1 text-center">
                          <input
                            v-model.number="product.qty"
                            type="number"
                            min="1"
                            placeholder=""
                            :class="getFieldError(`products[${index}].qty`) ? 'border-red-300 bg-red-50' : ''"
                            class="w-16 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                          /> 
                          <p v-if="getFieldError(`products[${index}].qty`)" class="mt-1 text-xs text-red-600">
                            {{ getFieldError(`products[${index}].qty`) }}
                          </p>
                        </td>
                        <td class="px-2 py-1 text-right">
                          <button
                            type="button"
                            class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            @click="removeProduct(product.id)"
                          >
                            <X class="h-4 w-4" />
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
                <p v-if="getFieldError('products')" class="mt-1.5 text-xs text-red-600">
                  {{ getFieldError('products') }}
                </p>
              </div>

              <!-- SKU -->
              <div v-else-if="form.item_type === 'sku'" class="pt-2">
                <AppPromotionSkuPicker
                  :added-sku-ids="addedSkuIds"
                  class="mb-3"
                  @select="(productId, productName, sku) => addSku(productId, productName, sku)"
                />
                <div v-if="selectedSkus.length > 0" class="space-y-3">
                  <div
                    v-for="[productId, skus] in Object.entries(groupedSkus)"
                    :key="productId"
                    class="rounded-lg border border-gray-200 p-3"
                  >
                    <h4 class="mb-2 text-sm font-semibold text-gray-900">
                      {{ skus[0]?.product_name }}
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
                        <tr v-for="sku in skus" :key="sku.id" class="border-b border-gray-100">
                          <td class="px-2 py-1">
                            <div class="flex items-center gap-3">
                              <div class="h-6 w-6 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-gray-200">
                                <Box class="h-full w-full p-1 text-gray-400" />
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
                            <input
                              v-model.number="sku.qty"
                              type="number"
                              min="1"
                              placeholder=""
                              class="w-16 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                              :class="getFieldError(`product_skus[${sku.id}].qty`) ? 'border-red-300 bg-red-50' : ''"
                            />
                            <p v-if="getFieldError(`product_skus[${sku.id}].qty`)" class="mt-1 text-xs text-red-600">
                              {{ getFieldError(`product_skus[${sku.id}].qty`) }}
                            </p>
                          </td>
                          <td class="px-2 py-1 text-right">
                            <button
                              type="button"
                              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              @click="removeSku(sku.id)"
                            >
                              <X class="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table> 
                  </div>
                </div>
                <div v-else class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400"
                  :class="getFieldError('product_skus') ? 'border-red-300 bg-red-50' : ''"
                >
                  Belum ada SKU dipilih
                </div>
                <p v-if="getFieldError('product_skus')" class="mt-1.5 text-xs text-red-600">
                  {{ getFieldError('product_skus') }}
                </p>
              </div>
            </div>
          </div>


          <!-- Syarat Kurir -->
          <div v-if="promoType=='shipping'" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <div class="mb-4">
              <h2 class="mb-1 text-base font-semibold text-gray-900">
                Syarat Kurir
              </h2>
              <p class="text-xs text-gray-500">
                Tentukan kurir apa saja yang dapat menggunakan promosi ini
              </p>
            </div>

            <!-- Tipe Kurir -->
            <div class="mb-4">
              <label class="mb-2 block text-sm font-medium text-gray-700">Tipe Kurir</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all"
                  :class="form.courier_type === 'all'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                  @click="form.courier_type = 'all'"
                >
                  <Truck class="h-5 w-5" />
                  <div class="text-left">
                    <p class="text-sm font-semibold">Semua Kurir</p>
                    <p class="text-xs opacity-70">Berlaku semua</p>
                  </div>
                </button>
                <button
                  type="button"
                  class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all"
                  :class="form.courier_type === 'specific'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                  @click="form.courier_type = 'specific'"
                >
                  <Truck class="h-5 w-5" />
                  <div class="text-left">
                    <p class="text-sm font-semibold">Kurir Tertentu</p>
                    <p class="text-xs opacity-70">Pilih spesifik</p>
                  </div>
                </button>
              </div>
            </div>

            <!-- Picker & List -->
            <div v-if="form.courier_type === 'specific'">
              <AppCourierPicker
                :added-courier-codes="addedCourierCodes"
                class="mb-3"
                @select="addCourierFromPicker"
              />

              <div v-if="selectedCouriers.length > 0" class="space-y-3">
                <div
                  v-for="courier in selectedCouriers"
                  :key="courier.courier_code"
                  class="rounded-lg border border-gray-200 p-3"
                >
                  <div class="mb-2 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <Truck class="h-4 w-4 text-orange-500" />
                      <p class="text-sm font-semibold text-gray-900">{{ courier.courier_name }}</p>
                      <span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{{ courier.type }}</span>
                    </div>
                    <button
                      type="button"
                      class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      @click="removeCourierEntry(courier.courier_code)"
                    >
                      <X class="h-4 w-4" />
                    </button>
                  </div>
                  <div class="space-y-1.5 pl-6">
                    <div
                      v-for="service in courier.services"
                      :key="service.service_code"
                      class="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      <div>
                        <p class="text-xs font-medium text-gray-800">{{ service.service_name }}</p>
                        <p class="text-[10px] text-gray-400">{{ service.service_code }}</p>
                      </div>
                      <button
                        type="button"
                        class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none"
                        :class="service.selected_status === 'active' ? 'bg-primary-600' : 'bg-gray-300'"
                        @click="toggleServiceStatus(courier.courier_code, service.service_code)"
                      >
                        <span
                          class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                          :class="service.selected_status === 'active' ? 'translate-x-4' : 'translate-x-0'"
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else
                class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400"
                :class="getFieldError('couriers') ? 'border-red-300 bg-red-50' : ''"
              >
                Belum ada kurir dipilih
              </div>
              <p v-if="getFieldError('couriers')" class="mt-1.5 text-xs text-red-600">
                {{ getFieldError('couriers') }}
              </p>
            </div>
          </div>

          <!-- Syarat Area -->
          <div v-if="promoType=='shipping'" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <div class="mb-4">
              <h2 class="mb-1 text-base font-semibold text-gray-900">
                Syarat Area Pengiriman
              </h2>
              <p class="text-xs text-gray-500">
                Tentukan wilayah pengiriman yang berlaku untuk promosi ini
              </p>
            </div>

            <!-- Tipe Area -->
            <div class="mb-4">
              <label class="mb-2 block text-sm font-medium text-gray-700">Tipe Area</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all"
                  :class="form.area_type === 'all'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                  @click="form.area_type = 'all'"
                >
                  <MapPin class="h-5 w-5" />
                  <div class="text-left">
                    <p class="text-sm font-semibold">Semua Area</p>
                    <p class="text-xs opacity-70">Berlaku semua wilayah</p>
                  </div>
                </button>
                <button
                  type="button"
                  class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all"
                  :class="form.area_type === 'specific'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                  @click="form.area_type = 'specific'"
                >
                  <MapPin class="h-5 w-5" />
                  <div class="text-left">
                    <p class="text-sm font-semibold">Area Tertentu</p>
                    <p class="text-xs opacity-70">Pilih provinsi atau kota</p>
                  </div>
                </button>
              </div>
            </div>

            <!-- Picker & List -->
            <div v-if="form.area_type === 'specific'">
              <AppAreaPicker
                :added-areas="addedAreasList"
                class="mb-3"
                @select="addAreaFromPicker"
              />

              <div v-if="selectedAreas.length > 0" class="space-y-2">
                <div
                  v-for="(area, index) in selectedAreas"
                  :key="index"
                  class="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
                >
                  <div class="flex items-center gap-3">
                    <MapPin class="h-4 w-4 text-blue-500" />
                    <div>
                      <p class="text-sm font-medium text-gray-900">
                        {{ area.city || area.province }}
                      </p>
                      <p v-if="area.city" class="text-xs text-gray-500">{{ area.province }}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    @click="removeArea(index)"
                  >
                    <X class="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div v-else
                class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400"
                :class="getFieldError('areas') ? 'border-red-300 bg-red-50' : ''"
              >
                Belum ada area dipilih
              </div>
              <p v-if="getFieldError('areas')" class="mt-1.5 text-xs text-red-600">
                {{ getFieldError('areas') }}
              </p>
            </div>
          </div>

          <!-- Kode Kupon -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-base font-semibold text-gray-900">
                Kode Kupon
              </h2>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  @click="showAddMassalModal = true"
                >
                  <ListPlus class="h-3.5 w-3.5" />
                  Tambah Massal
                </button>
                <button
                  type="button"
                  class="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  @click="showGenerateModal = true"
                >
                  <Wand2 class="h-3.5 w-3.5" />
                  Generate
                </button>
                <button
                  type="button"
                  class="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
                  @click="addCoupon"
                >
                  <Plus class="h-3.5 w-3.5" />
                  Tambah
                </button>
                <button
                  v-if="coupons.length > 0"
                  type="button"
                  class="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                  @click="coupons = [{ code: '', max_use: null, max_use_per_customer: 1 }]"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                  Hapus Semua
                </button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <!-- Bulk Edit Row -->
                  <tr class="border-b border-gray-300 bg-primary-50">
                    <td class="px-3 py-2">
                      <span class="text-xs font-semibold text-gray-700">Edit Massal</span>
                    </td>
                    <td class="px-3 py-2">
                      <input
                        v-model.number="bulkMaxUse"
                        type="number"
                        placeholder="Maks. Penggunaan"
                        class="input-sm w-full text-center text-sm"
                        min="1"
                      >
                    </td> 
                    <td class="px-3 py-2">
                      <button
                        type="button"
                        class="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
                        @click="applyBulkCoupon"
                      >
                        Terapkan
                      </button>
                    </td>
                  </tr>
                  <!-- Column Headers -->
                  <tr class="border-b-2 border-gray-200 text-left text-xs font-medium text-gray-500">
                    <th class="px-3 py-2">Kode Kupon</th>
                    <th class="w-30 text-nowrap px-3 py-2 text-center">Maks. Penggunaan</th> 
                    <th class="w-10 px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(coupon, index) in coupons"
                    :key="index"
                    class="border-b border-gray-100 last:border-0"
                  >
                    <td class="px-3 py-2">
                      <input
                        v-model="coupon.code"
                        type="text"
                        placeholder="KODE2026"
                        class="input-sm w-full uppercase"
                        :class="getFieldError(`coupons[${index}].code`) ? 'border-red-400 ring-1 ring-red-400' : ''"
                      >
                      <p v-if="getFieldError(`coupons[${index}].code`)" class="mt-0.5 text-xs text-red-600">
                        {{ getFieldError(`coupons[${index}].code`) }}
                      </p>
                    </td>
                    <td class="px-3 py-2">
                      <input
                        v-model.number="coupon.max_use"
                        type="number"
                        placeholder="∞"
                        class="input-sm w-full text-center text-sm"
                        :class="getFieldError(`coupons[${index}].max_use`) ? 'border-red-400 ring-1 ring-red-400' : ''"
                        min="1"
                      >
                      <p v-if="getFieldError(`coupons[${index}].max_use`)" class="mt-0.5 text-xs text-red-600">
                        {{ getFieldError(`coupons[${index}].max_use`) }}
                      </p>
                    </td> 
                    <td class="px-3 py-2">
                      <button
                        v-if="coupons.length > 1"
                        type="button"
                        class="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        @click="removeCoupon(index)"
                      >
                        <X class="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- RIGHT: Sidebar (1/3) -->
        <div class="space-y-6"> 
          <!-- Visibilitas -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-base font-semibold text-gray-900">
              Visibilitas
            </h2>
            <div class="space-y-3">
              <label class="flex cursor-pointer items-center gap-3">
                <input
                  :checked="form.public === 'active'"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  @change="form.public = ($event.target as HTMLInputElement).checked ? 'active' : 'inactive'"
                >
                <span class="text-sm font-medium text-gray-700">Promosi Publik</span>
              </label>
              <label class="flex cursor-pointer items-center gap-3">
                <input
                  :checked="form.internal_visibility === 'active'"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  @change="form.internal_visibility = ($event.target as HTMLInputElement).checked ? 'active' : 'inactive'"
                >
                <span class="text-sm font-medium text-gray-700">Internal</span>
              </label>
              <label class="flex cursor-pointer items-center gap-3">
                <input
                  :checked="form.web_visibility === 'active'"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  @change="form.web_visibility = ($event.target as HTMLInputElement).checked ? 'active' : 'inactive'"
                >
                <span class="text-sm font-medium text-gray-700">Website</span>
              </label>
              <label class="flex cursor-pointer items-center gap-3">
                <input
                  :checked="form.app_visibility === 'active'"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  @change="form.app_visibility = ($event.target as HTMLInputElement).checked ? 'active' : 'inactive'"
                >
                <span class="text-sm font-medium text-gray-700">Mobile App</span>
              </label>
            </div>
          </div>

          <!-- Ringkasan -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-base font-semibold text-gray-900">
              Ringkasan
            </h2>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500">
                  Tipe Diskon
                </dt>
                <dd class="font-medium text-gray-900">
                  {{ form.discount_type === 'percentage' ? 'Persentase' : 'Nominal' }}
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">
                  Nilai Diskon
                </dt>
                <dd class="font-medium text-gray-900">
                  {{ form.discount_value || 0 }}{{ form.discount_type === 'percentage' ? '%' : '' }}
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">
                  Total Kupon
                </dt>
                <dd class="font-medium text-gray-900">
                  {{ coupons.length }}
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">
                  Kategori Customer
                </dt>
                <dd class="font-medium text-gray-900">
                  {{ selectedCustomerCategories.length }}
                </dd>
              </div>
              <div class="flex justify-between border-t border-gray-200 pt-2">
                <dt class="font-semibold text-gray-900">
                  Total Item
                </dt>
                <dd class="font-semibold text-primary-600">
                  {{ form.item_type === 'all' ? 'Semua' :
                    form.item_type === 'category' ? `${selectedProductCategories.length} kategori` :
                    form.item_type === 'product' ? `${selectedProducts.length} produk` :
                    `${selectedSkus.length} SKU` }}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="sticky bottom-0 mt-6 flex items-center justify-end gap-3 rounded-xl bg-white/90 px-5 py-4 shadow-sm ring-1 ring-gray-200 backdrop-blur">
        <NuxtLink
          to="/promotion/checkout"
          class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          Batal
        </NuxtLink>
        <button
          type="button"
          :disabled="saving"
          class="flex items-center gap-2 rounded-lg bg-gray-500 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          @click="handleSubmit('draft')"
        >
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          {{ saving ? 'Menyimpan...' : 'Simpan Draft' }}
        </button>
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

    <!-- Modal: Tambah Massal -->
    <Teleport to="body">
      <div
        v-if="showAddMassalModal"
        class="fixed inset-0 z-50 overflow-y-auto bg-black/50"
      >
        <div
          class="flex min-h-full items-center justify-center p-4"
          @click.self="showAddMassalModal = false"
        >
          <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-base font-semibold text-gray-900">
              Tambah Massal Kode Kupon
            </h3>
            <button
              type="button"
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              @click="showAddMassalModal = false"
            >
              <X class="h-5 w-5" />
            </button>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">
              Kode Kupon (satu per baris)
            </label>
            <textarea
              v-model="massalCodesText"
              rows="10"
              class="form-input font-mono text-xs uppercase"
              placeholder="KODE001&#10;KODE002&#10;KODE003"
            />
            <p class="mt-1 text-xs text-gray-500">
              {{ massalCodesText.split('\n').filter(l => l.trim()).length }} kode
            </p>
          </div>
          <div class="mt-4 flex justify-end gap-3">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              @click="showAddMassalModal = false"
            >
              Batal
            </button>
            <button
              type="button"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
              @click="applyAddMassal"
            >
              Tambahkan
            </button>
          </div>
        </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal: Generate Kode -->
    <Teleport to="body">
      <div
        v-if="showGenerateModal"
        class="fixed inset-0 z-50 overflow-y-auto bg-black/50"
      >
        <div
          class="flex min-h-full items-center justify-center p-4"
          @click.self="showGenerateModal = false"
        >
          <div class="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-base font-semibold text-gray-900">
              Generate Kode Kupon
            </h3>
            <button
              type="button"
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              @click="showGenerateModal = false"
            >
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="space-y-4">
            <!-- Mode -->
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">Tipe Kode</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  class="flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-left transition-all"
                  :class="generateForm.mode === 'random'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                  @click="generateForm.mode = 'random'"
                >
                  <Wand2 class="h-4 w-4 shrink-0" />
                  <div>
                    <p class="text-xs font-semibold">Acak</p>
                    <p class="text-xs opacity-70">Karakter A-Z, 0-9</p>
                  </div>
                </button>
                <button
                  type="button"
                  class="flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-left transition-all"
                  :class="generateForm.mode === 'sequential'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                  @click="generateForm.mode = 'sequential'"
                >
                  <ListPlus class="h-4 w-4 shrink-0" />
                  <div>
                    <p class="text-xs font-semibold">Berurutan</p>
                    <p class="text-xs opacity-70">PREFIX001, 002...</p>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">
                Prefix
              </label>
              <input
                v-model="generateForm.prefix"
                type="text"
                class="form-input uppercase"
                placeholder="PROMO"
                maxlength="8"
              >
              <p class="mt-1 text-xs text-gray-500">
                Opsional, contoh: RAMADAN
              </p>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">
                Panjang Kode
              </label>
              <input
                v-model.number="generateForm.length"
                type="number"
                class="form-input"
                min="4"
                max="20"
              >
              <p class="mt-1 text-xs text-gray-500">
                Termasuk prefix (min 4, maks 20)
              </p>
            </div>

            <div v-if="generateForm.mode === 'sequential'">
              <label class="mb-1.5 block text-sm font-medium text-gray-700">
                Nomor Awal
              </label>
              <input
                v-model.number="generateForm.start_number"
                type="number"
                class="form-input"
                min="1"
              >
              <p class="mt-1 text-xs text-gray-500">
                Contoh: prefix=PROMO, mulai=1 → PROMO001, PROMO002...
              </p>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">
                Jumlah Kode
              </label>
              <input
                v-model.number="generateForm.count"
                type="number"
                class="form-input"
                min="1"
                max="1000"
              >
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              @click="showGenerateModal = false"
            >
              Batal
            </button>
            <button
              type="button"
              class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
              @click="applyGenerate"
            >
              <Wand2 class="h-4 w-4" />
              Generate
            </button>
          </div>
        </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.form-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}

.input-sm {
  @apply w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20;
}

.input-prefix {
  @apply pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400;
}

.input-suffix {
  @apply pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400;
}
</style>
