<script setup lang="ts">
import {
  ArrowLeft, Loader2, ChevronDown, Plus, Pencil, Check, X, Copy, Image as ImageIcon,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface CustomerCategory {
  id: string
  name: string
}

interface SkuPrice {
  id?: string
  customer_category_id: string
  price: number | null
}

interface SkuRow {
  id?: string
  sku: string
  image: string
  image_thumb: string
  variant_1: string
  variant_2: string
  weight: number | null
  is_preorder: boolean
  buffer_stock: number | null
  rewards_point: number | null
  status: string
  prices: SkuPrice[]
}

interface VariantValue {
  value: string
  original: boolean // true = from API, cannot be deleted
  editing: boolean
  editValue: string
}

interface ProductBasic {
  id: string
  name: string
  variant1: string
  variant2: string
  skus: {
    id: string
    sku: string
    variants: { name: string; value: string }[]
    weight: number
    is_preorder: boolean
    buffer_stock: number
    rewards_point: string
    status: string
    image_media: { id: string; file_url: string; size: string }[] | null
    prices: {
      id: string
      customer_category_id: string
      price: string
    }[]
  }[] | null
}

const route = useRoute()
const api = useApi()
const toast = useToast()
const router = useRouter()

const productId = route.params.id as string
const saving = ref(false)
const loadingPage = ref(true)
const formErrors = ref<Record<string, string[]>>({})

const customerCategories = ref<CustomerCategory[]>([])
const productName = ref('')
const variantName1 = ref('')
const variantName2 = ref('')

const variant1Values = ref<VariantValue[]>([])
const variant2Values = ref<VariantValue[]>([])
const newVar1 = ref('')
const newVar2 = ref('')

const skus = ref<SkuRow[]>([])

// Bulk update
const showBulk = ref(false)
const bulkFields = ref({
  weight: null as number | null,
  buffer_stock: null as number | null,
  rewards_point: null as number | null,
  status: '' as string,
  is_preorder: null as boolean | null,
  prices: {} as Record<string, number | null>,
})

// SKU image picker
const skuImagePickerIndex = ref<number | null>(null)

function openSkuImagePicker(index: number) {
  skuImagePickerIndex.value = index
}

function onSkuImageSelect(medias: any[]) {
  const idx = skuImagePickerIndex.value
  if (idx === null || !medias.length) {
    skuImagePickerIndex.value = null
    return
  }
  const m = medias[0]
  const thumb = m.files?.find((f: any) => f.size === 'thumbnail')?.file_url || m.files?.[0]?.file_url || ''
  skus.value[idx]!.image = m.id
  skus.value[idx]!.image_thumb = thumb
  skuImagePickerIndex.value = null
}

function removeSkuImage(index: number) {
  skus.value[index]!.image = ''
  skus.value[index]!.image_thumb = ''
}

function createEmptyPrices(): SkuPrice[] {
  return customerCategories.value.map(cc => ({
    customer_category_id: cc.id,
    price: null,
  }))
}

function getSkuError(index: number, field: string): string | undefined {
  const key1 = `skus[${index}].${field}`
  const key2 = `skus[${index}].${field.replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`
  return formErrors.value[key1]?.[0] || formErrors.value[key2]?.[0]
}

function getSkuPriceError(skuIndex: number, priceIndex: number, field: string): string | undefined {
  const key = `skus[${skuIndex}].prices[${priceIndex}].${field}`
  return formErrors.value[key]?.[0]
}

// --- Variant value management ---

function startEditVariant(list: VariantValue[], index: number) {
  const item = list[index]
  if (!item) return
  item.editing = true
  item.editValue = item.value
}

function confirmEditVariant(list: VariantValue[], index: number, isVariant1: boolean) {
  const item = list[index]
  if (!item) return
  const trimmed = item.editValue.trim()
  if (!trimmed) {
    item.editing = false
    return
  }
  // Check duplicate
  const isDup = list.some((v, i) => i !== index && v.value.toLowerCase() === trimmed.toLowerCase())
  if (isDup) {
    toast.error('Nilai varian sudah ada')
    return
  }
  const oldValue = item.value
  item.value = trimmed
  item.editing = false

  // Update affected SKUs
  if (oldValue !== trimmed) {
    skus.value.forEach(s => {
      if (isVariant1 && s.variant_1 === oldValue) s.variant_1 = trimmed
      if (!isVariant1 && s.variant_2 === oldValue) s.variant_2 = trimmed
    })
  }
}

function cancelEditVariant(list: VariantValue[], index: number) {
  const item = list[index]
  if (!item) return
  item.editing = false
}

function removeVariant1(index: number) {
  const v = variant1Values.value[index]
  if (!v || v.original) return
  skus.value = skus.value.filter(s => !(s.variant_1 === v.value && !s.id))
  variant1Values.value.splice(index, 1)
}

function removeVariant2(index: number) {
  const v = variant2Values.value[index]
  if (!v || v.original) return
  skus.value = skus.value.filter(s => !(s.variant_2 === v.value && !s.id))
  variant2Values.value.splice(index, 1)
}

const stickySkuLeft = computed(() => variantName2.value ? '16rem' : '8rem')
const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 640
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  loadProduct()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

function addVariant1() {
  const val = newVar1.value.trim()
  if (!val) return
  if (variant1Values.value.some(v => v.value.toLowerCase() === val.toLowerCase())) {
    toast.error('Nilai varian sudah ada')
    return
  }
  variant1Values.value.push({ value: val, original: false, editing: false, editValue: '' })
  newVar1.value = ''
  generateNewSkusForValue(val, true)
}

function addVariant2() {
  const val = newVar2.value.trim()
  if (!val) return
  if (variant2Values.value.some(v => v.value.toLowerCase() === val.toLowerCase())) {
    toast.error('Nilai varian sudah ada')
    return
  }
  variant2Values.value.push({ value: val, original: false, editing: false, editValue: '' })
  newVar2.value = ''
  generateNewSkusForValue(val, false)
}

function generateNewSkusForValue(newValue: string, isVariant1: boolean) {
  if (isVariant1) {
    // Generate SKU rows: newValue × each variant2 value (or just newValue if no variant2)
    const v2s = variant2Values.value.length ? variant2Values.value.map(v => v.value) : ['']
    v2s.forEach(v2 => {
      const exists = skus.value.some(s => s.variant_1 === newValue && s.variant_2 === v2)
      if (!exists) {
        skus.value.push({
          sku: '',
          image: '',
          image_thumb: '',
          variant_1: newValue,
          variant_2: v2,
          weight: null,
          is_preorder: false,
          buffer_stock: null,
          rewards_point: null,
          status: 'active',
          prices: createEmptyPrices(),
        })
      }
    })
  }
  else {
    // Generate SKU rows: each variant1 value × newValue
    const v1s = variant1Values.value.map(v => v.value)
    v1s.forEach(v1 => {
      const exists = skus.value.some(s => s.variant_1 === v1 && s.variant_2 === newValue)
      if (!exists) {
        skus.value.push({
          sku: '',
          image: '',
          image_thumb: '',
          variant_1: v1,
          variant_2: newValue,
          weight: null,
          is_preorder: false,
          buffer_stock: null,
          rewards_point: null,
          status: 'active',
          prices: createEmptyPrices(),
        })
      }
    })
  }
}

// --- Bulk update ---

function applyBulkUpdate() {
  let applied = 0
  skus.value.forEach(s => {
    if (bulkFields.value.weight !== null) {
      s.weight = bulkFields.value.weight
      applied++
    }
    if (bulkFields.value.buffer_stock !== null) {
      s.buffer_stock = bulkFields.value.buffer_stock
      applied++
    }
    if (bulkFields.value.rewards_point !== null) {
      s.rewards_point = bulkFields.value.rewards_point
      applied++
    }
    if (bulkFields.value.status) {
      s.status = bulkFields.value.status
      applied++
    }
    if (bulkFields.value.is_preorder !== null) {
      s.is_preorder = bulkFields.value.is_preorder
      applied++
    }
    s.prices.forEach(p => {
      const bulkPrice = bulkFields.value.prices[p.customer_category_id]
      if (bulkPrice !== null && bulkPrice !== undefined) {
        p.price = bulkPrice
        applied++
      }
    })
  })
  if (applied > 0) {
    toast.success('Update massal diterapkan')
    // Reset bulk fields
    bulkFields.value.weight = null
    bulkFields.value.buffer_stock = null
    bulkFields.value.rewards_point = null
    bulkFields.value.status = ''
    bulkFields.value.is_preorder = null
    customerCategories.value.forEach(cc => { bulkFields.value.prices[cc.id] = null })
  }
  else {
    toast.error('Isi minimal satu field untuk diterapkan')
  }
}

// --- Load data ---

async function loadProduct() {
  loadingPage.value = true
  try {
    const [ccRes, prodRes] = await Promise.all([
      api.get<{ data: CustomerCategory[] }>('/customers/categories/index'),
      api.get<{ data: ProductBasic }>(`/products/${productId}`),
    ])

    customerCategories.value = ccRes.data || []

    // Init bulk price fields
    customerCategories.value.forEach(cc => {
      bulkFields.value.prices[cc.id] = null
    })

    const p = prodRes.data
    productName.value = p.name
    variantName1.value = p.variant1 || ''
    variantName2.value = p.variant2 || ''

    if (p.skus && p.skus.length) {
      // Extract unique variant values
      const v1Set = new Set<string>()
      const v2Set = new Set<string>()
      p.skus.forEach(s => {
        if (s.variants?.[0]?.value) v1Set.add(s.variants[0].value)
        if (s.variants?.[1]?.value) v2Set.add(s.variants[1].value)
      })
      variant1Values.value = Array.from(v1Set).map(v => ({ value: v, original: true, editing: false, editValue: '' }))
      variant2Values.value = Array.from(v2Set).map(v => ({ value: v, original: true, editing: false, editValue: '' }))

      skus.value = p.skus.map(s => {
        const existingPrices = new Map(
          s.prices?.map(pr => [pr.customer_category_id, { id: pr.id, price: Number(pr.price) }]) || [],
        )
        const imageThumb = s.image_media?.find(f => f.size === 'thumbnail')?.file_url || s.image_media?.find(f => f.size === 'small')?.file_url || s.image_media?.[0]?.file_url || ''
        return {
          id: s.id,
          sku: s.sku,
          image: imageThumb ? 'existing' : '',
          image_thumb: imageThumb,
          variant_1: s.variants?.[0]?.value || '',
          variant_2: s.variants?.[1]?.value || '',
          weight: s.weight,
          is_preorder: s.is_preorder,
          buffer_stock: s.buffer_stock,
          rewards_point: Number(s.rewards_point) || null,
          status: s.status,
          prices: customerCategories.value.map(cc => ({
            id: existingPrices.get(cc.id)?.id,
            customer_category_id: cc.id,
            price: existingPrices.get(cc.id)?.price ?? null,
          })),
        }
      })
    }
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data produk')
    router.push('/product/masters')
  }
  finally {
    loadingPage.value = false
  }
}

async function handleSubmit() {
  saving.value = true
  formErrors.value = {}

  if (!skus.value.length) {
    toast.error('Tidak ada SKU untuk disimpan')
    saving.value = false
    return
  }

  try {
    console.log('Submitting SKUs:', skus.value)

    await api.put(`/products/${productId}/skus`, {
      variant_1: variantName1.value,
      variant_2: variantName2.value,
      skus: skus.value.map(s => ({
        id: s.id || undefined,
        sku: s.sku,
        image: s.image === 'existing' ? undefined : (s.image || undefined),
        variant_1: s.variant_1,
        variant_2: s.variant_2,
        weight: s.weight || 0,
        is_preorder: s.is_preorder,
        buffer_stock: s.buffer_stock || 0,
        rewards_point: s.rewards_point || 0,
        status: s.status,
        prices: s.prices
        //   .filter(p => p.price !== null && p.price > 0)
          .map(p => ({
            id: p.id || undefined,
            customer_category_id: p.customer_category_id,
            price: p.price,
          })),
      })),
    })
    toast.success('SKU berhasil diperbarui')
    router.push('/product/masters')
  }
  catch (err: any) {
    if (err.errors) {
      formErrors.value = err.errors
      toast.error('Terdapat kesalahan pada data')
    }
    else {
      toast.error(err.message || 'Gagal menyimpan SKU')
    }
  }
  finally {
    saving.value = false
  }
}

</script>

<template>
  <div class="space-y-4 sm:space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-2 sm:gap-3">
      <NuxtLink
        to="/product/masters"
        class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 sm:p-2"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <div class="min-w-0">
        <h1 class="text-lg font-bold text-gray-900 sm:text-2xl">Edit Varian & SKU</h1>
        <p class="mt-0.5 truncate text-sm text-gray-500">{{ productName }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loadingPage" class="space-y-4">
      <div v-for="i in 3" :key="i" class="animate-pulse rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div class="h-4 w-32 rounded bg-gray-200" />
        <div class="mt-4 space-y-3">
          <div class="h-10 rounded bg-gray-200" />
          <div class="h-10 rounded bg-gray-200" />
        </div>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="space-y-4 sm:space-y-6">
      <!-- Variant Section — side by side -->
      <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div class="border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
          <h2 class="text-base font-semibold text-gray-900">Varian</h2>
          <p class="mt-0.5 text-xs text-gray-500 sm:text-sm">Kelola nama dan nilai varian. Nilai yang sudah ada tidak bisa dihapus, hanya bisa diubah.</p>
        </div>
        <div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:gap-6 sm:p-6">
          <!-- Variant 1 (left) -->
          <div class="space-y-3">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Varian 1</label>
              <input
                v-model="variantName1"
                type="text"
                placeholder="Contoh: Warna"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              />
              <p v-if="formErrors['variant_1']" class="mt-1 text-xs text-red-600">{{ formErrors['variant_1'][0] }}</p>
            </div>
            <div v-if="variantName1">
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Nilai {{ variantName1 }}</label>
              <div class="flex flex-wrap items-center gap-2">
                <template v-for="(v, i) in variant1Values" :key="i">
                  <div v-if="v.editing" class="flex items-center gap-1">
                    <input
                      v-model="v.editValue"
                      type="text"
                      class="w-24 rounded border border-primary-300 bg-primary-50 px-2 py-1 text-xs focus:outline-none"
                      @keyup.enter="confirmEditVariant(variant1Values, i, true)"
                      @keyup.escape="cancelEditVariant(variant1Values, i)"
                    />
                    <button type="button" class="rounded p-0.5 text-green-600 hover:bg-green-50" @click="confirmEditVariant(variant1Values, i, true)">
                      <Check class="h-3.5 w-3.5" />
                    </button>
                    <button type="button" class="rounded p-0.5 text-gray-400 hover:bg-gray-100" @click="cancelEditVariant(variant1Values, i)">
                      <X class="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 rounded-full py-1 pl-3 text-xs font-medium transition-colors"
                    :class="v.original ? 'bg-primary-100 text-primary-700 pr-2' : 'bg-green-100 text-green-700 pr-1'"
                  >
                    {{ v.value }}
                    <button type="button" class="rounded-full p-0.5 opacity-50 hover:opacity-100" @click="startEditVariant(variant1Values, i)">
                      <Pencil class="h-3 w-3" />
                    </button>
                    <button v-if="!v.original" type="button" class="rounded-full p-0.5 text-red-500 hover:bg-red-200" @click="removeVariant1(i)">
                      <X class="h-3 w-3" />
                    </button>
                  </span>
                </template>
                <div class="flex items-center gap-1">
                  <input
                    v-model="newVar1"
                    type="text"
                    :placeholder="`Tambah ${variantName1}`"
                    class="w-28 rounded-full border border-dashed border-gray-300 bg-gray-50 px-3 py-1 text-xs placeholder:text-gray-400 focus:border-primary-400 focus:outline-none"
                    @keyup.enter="addVariant1"
                  />
                  <button
                    type="button"
                    class="rounded-full bg-gray-100 p-1 text-gray-500 transition-colors hover:bg-gray-200"
                    @click="addVariant1"
                  >
                    <Plus class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Variant 2 (right) -->
          <div class="space-y-3">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Varian 2 <span class="font-normal text-gray-400">(opsional)</span></label>
              <input
                v-model="variantName2"
                type="text"
                placeholder="Contoh: Ukuran"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              />
              <p v-if="formErrors['variant_2']" class="mt-1 text-xs text-red-600">{{ formErrors['variant_2'][0] }}</p>
            </div>
            <div v-if="variantName2">
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Nilai {{ variantName2 }}</label>
              <div class="flex flex-wrap items-center gap-2">
                <template v-for="(v, i) in variant2Values" :key="i">
                  <div v-if="v.editing" class="flex items-center gap-1">
                    <input
                      v-model="v.editValue"
                      type="text"
                      class="w-24 rounded border border-primary-300 bg-primary-50 px-2 py-1 text-xs focus:outline-none"
                      @keyup.enter="confirmEditVariant(variant2Values, i, false)"
                      @keyup.escape="cancelEditVariant(variant2Values, i)"
                    />
                    <button type="button" class="rounded p-0.5 text-green-600 hover:bg-green-50" @click="confirmEditVariant(variant2Values, i, false)">
                      <Check class="h-3.5 w-3.5" />
                    </button>
                    <button type="button" class="rounded p-0.5 text-gray-400 hover:bg-gray-100" @click="cancelEditVariant(variant2Values, i)">
                      <X class="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 rounded-full py-1 pl-3 text-xs font-medium transition-colors"
                    :class="v.original ? 'bg-primary-100 text-primary-700 pr-2' : 'bg-green-100 text-green-700 pr-1'"
                  >
                    {{ v.value }}
                    <button type="button" class="rounded-full p-0.5 opacity-50 hover:opacity-100" @click="startEditVariant(variant2Values, i)">
                      <Pencil class="h-3 w-3" />
                    </button>
                    <button v-if="!v.original" type="button" class="rounded-full p-0.5 text-red-500 hover:bg-red-200" @click="removeVariant2(i)">
                      <X class="h-3 w-3" />
                    </button>
                  </span>
                </template>
                <div class="flex items-center gap-1">
                  <input
                    v-model="newVar2"
                    type="text"
                    :placeholder="`Tambah ${variantName2}`"
                    class="w-28 rounded-full border border-dashed border-gray-300 bg-gray-50 px-3 py-1 text-xs placeholder:text-gray-400 focus:border-primary-400 focus:outline-none"
                    @keyup.enter="addVariant2"
                  />
                  <button
                    type="button"
                    class="rounded-full bg-gray-100 p-1 text-gray-500 transition-colors hover:bg-gray-200"
                    @click="addVariant2"
                  >
                    <Plus class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No customer categories warning -->
      <div
        v-if="!customerCategories.length"
        class="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800"
      >
        Belum ada kategori customer. Harga per kategori tidak bisa diisi.
      </div>

      <!-- Empty SKU -->
      <div v-if="!skus.length" class="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200 sm:p-12">
        <p class="text-sm text-gray-500">Tambahkan nilai varian di atas untuk membuat SKU.</p>
      </div>

      <!-- SKU Table -->
      <div v-else class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <!-- SKU Table header -->
        <div class="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 class="text-sm font-semibold text-gray-900">Daftar SKU</h2>
            <p class="mt-0.5 text-xs text-gray-500">{{ skus.length }} SKU — variant dikelola di bagian atas</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="showBulk"
              type="button"
              class="flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gray-900"
              @click="applyBulkUpdate"
            >
              <Copy class="h-3 w-3" />
              Terapkan
            </button>
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
              :class="{ 'bg-amber-50 border-amber-300 text-amber-700': showBulk }"
              @click="showBulk = !showBulk"
            >
              <Copy class="h-3 w-3" />
              Massal
              <ChevronDown class="h-3 w-3 transition-transform" :class="{ 'rotate-180': showBulk }" />
            </button>
          </div>
        </div>

        <div class="overflow-x-auto -mx-px">
          <table class="w-full min-w-[700px] text-left text-sm sm:min-w-[900px]">
            <thead>
              <!-- Bulk input row -->
              <tr v-if="showBulk" class="border-b border-amber-200 bg-amber-50/60">
                <td class="sticky left-0 z-10 min-w-[6rem] bg-amber-50 px-3 py-2 sm:min-w-[8rem]">
                  <span class="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Massal</span>
                </td>
                <td v-if="variantName2" :class="isMobile ? 'bg-amber-50 px-3 py-2 min-w-[6rem]' : 'sticky left-[8rem] z-10 min-w-[8rem] bg-amber-50 px-3 py-2'" />
                <td :class="isMobile ? 'bg-amber-50 px-3 py-2 min-w-[8rem]' : 'sticky z-10 min-w-[10rem] bg-amber-50 px-3 py-2 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]'" :style="!isMobile ? { left: stickySkuLeft } : {}" />
                <td class="bg-amber-50 px-3 py-2" />
                <td class="px-3 py-2">
                  <input
                    v-model.number="bulkFields.weight"
                    type="number"
                    min="0"
                    placeholder="—"
                    class="w-20 rounded border border-amber-300 bg-white px-2 py-1.5 text-xs placeholder:text-amber-300 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                  />
                </td>
                <td class="px-3 py-2">
                  <input
                    v-model.number="bulkFields.buffer_stock"
                    type="number"
                    min="0"
                    placeholder="—"
                    class="w-20 rounded border border-amber-300 bg-white px-2 py-1.5 text-xs placeholder:text-amber-300 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                  />
                </td>
                <td class="px-3 py-2">
                  <input
                    v-model.number="bulkFields.rewards_point"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="—"
                    class="w-20 rounded border border-amber-300 bg-white px-2 py-1.5 text-xs placeholder:text-amber-300 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                  />
                </td>
                <td v-for="cc in customerCategories" :key="'bulk-' + cc.id" class="px-3 py-2">
                  <div class="relative">
                    <span class="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-amber-400">Rp</span>
                    <input
                      v-model.number="bulkFields.prices[cc.id]"
                      type="number"
                      min="0"
                      placeholder="—"
                      class="w-28 rounded border border-amber-300 bg-white py-1.5 pl-7 pr-2 text-xs placeholder:text-amber-300 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                    />
                  </div>
                </td>
                <td class="px-3 py-2">
                  <select
                    v-model="bulkFields.status"
                    class="w-24 rounded border border-amber-300 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                  >
                    <option value="">—</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </td>
                <td class="px-3 py-2 text-center">
                  <select
                    v-model="bulkFields.is_preorder"
                    class="w-16 rounded border border-amber-300 bg-white px-1 py-1.5 text-xs text-gray-700 focus:border-amber-500 focus:outline-none"
                  >
                    <option :value="null">—</option>
                    <option :value="true">Ya</option>
                    <option :value="false">Tidak</option>
                  </select>
                </td>
              </tr>
              <!-- Column headers -->
              <tr class="border-b border-gray-200 bg-gray-50">
                <th class="sticky left-0 z-10 min-w-[6rem] whitespace-nowrap bg-gray-50 px-3 py-2.5 font-medium text-gray-600 sm:min-w-[8rem]">{{ variantName1 || 'Varian 1' }}</th>
                <th v-if="variantName2" :class="isMobile ? 'whitespace-nowrap bg-gray-50 px-3 py-2.5 font-medium text-gray-600 min-w-[6rem]' : 'sticky left-[8rem] z-10 min-w-[8rem] whitespace-nowrap bg-gray-50 px-3 py-2.5 font-medium text-gray-600'">{{ variantName2 }}</th>
                <th :class="isMobile ? 'whitespace-nowrap bg-gray-50 px-3 py-2.5 font-medium text-gray-600 min-w-[8rem]' : 'sticky z-10 min-w-[10rem] whitespace-nowrap bg-gray-50 px-3 py-2.5 font-medium text-gray-600 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]'" :style="!isMobile ? { left: stickySkuLeft } : {}">Kode SKU</th>
                <th class="whitespace-nowrap px-3 py-2.5 font-medium text-gray-600">Gambar</th>
                <th class="whitespace-nowrap px-3 py-2.5 font-medium text-gray-600">Berat (g)</th>
                <th class="whitespace-nowrap px-3 py-2.5 font-medium text-gray-600">Buffer</th>
                <th class="whitespace-nowrap px-3 py-2.5 font-medium text-gray-600">Reward</th>
                <th
                  v-for="cc in customerCategories"
                  :key="cc.id"
                  class="whitespace-nowrap px-3 py-2.5 font-medium text-gray-600"
                >
                  Harga {{ cc.name }}
                </th>
                <th class="whitespace-nowrap px-3 py-2.5 font-medium text-gray-600">Status</th>
                <th class="whitespace-nowrap px-3 py-2.5 font-medium text-gray-600">PO</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="(sku, si) in skus" :key="sku.id || si" class="hover:bg-gray-50/50">
                <td class="sticky left-0 z-10 min-w-[6rem] bg-white px-3 py-2 sm:min-w-[8rem]">
                  <span class="inline-block rounded-full px-2.5 py-1 text-xs font-medium" :class="sku.id ? 'bg-primary-50 text-primary-700' : 'bg-green-50 text-green-700'">
                    {{ sku.variant_1 }}
                  </span>
                </td>
                <td v-if="variantName2" :class="isMobile ? 'bg-white px-3 py-2 min-w-[6rem]' : 'sticky left-[8rem] z-10 min-w-[8rem] bg-white px-3 py-2'">
                  <span class="inline-block rounded-full px-2.5 py-1 text-xs font-medium" :class="sku.id ? 'bg-primary-50 text-primary-700' : 'bg-green-50 text-green-700'">
                    {{ sku.variant_2 }}
                  </span>
                </td>
                <td :class="isMobile ? 'bg-white px-3 py-2 min-w-[8rem]' : 'sticky z-10 min-w-[10rem] bg-white px-3 py-2 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]'" :style="!isMobile ? { left: stickySkuLeft } : {}">
                  <input
                    v-model="sku.sku"
                    type="text"
                    placeholder="SKU-CODE"
                    class="w-36 rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                  />
                  <p v-if="getSkuError(si, 'sku')" class="mt-0.5 text-xs text-red-600">{{ getSkuError(si, 'sku') }}</p>
                </td>
                <td class="px-3 py-2">
                  <div v-if="sku.image_thumb" class="group relative h-10 w-10 cursor-pointer overflow-hidden rounded bg-gray-50 ring-1 ring-gray-200" @click="openSkuImagePicker(si)">
                    <img :src="sku.image_thumb" alt="" class="h-full w-full object-cover" />
                    <button
                      type="button"
                      class="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white opacity-0 shadow group-hover:opacity-100"
                      @click.stop="removeSkuImage(si)"
                    >
                      <X class="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <button
                    v-else
                    type="button"
                    class="flex h-10 w-10 items-center justify-center rounded border border-dashed border-gray-300 text-gray-400 hover:border-primary-400 hover:text-primary-500"
                    @click="openSkuImagePicker(si)"
                  >
                    <ImageIcon class="h-4 w-4" />
                  </button>
                </td>
                <td class="px-3 py-2">
                  <input
                    v-model.number="sku.weight"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="w-20 rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                  />
                </td>
                <td class="px-3 py-2">
                  <input
                    v-model.number="sku.buffer_stock"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="w-20 rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                  />
                </td>
                <td class="px-3 py-2">
                  <input
                    v-model.number="sku.rewards_point"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    class="w-20 rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                  />
                </td>
                <td v-for="(price, pi) in sku.prices" :key="price.customer_category_id" class="px-3 py-2">
                  <div class="relative">
                    <span class="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">Rp</span>
                    <input
                      v-model.number="price.price"
                      type="number"
                      min="0"
                      placeholder="0"
                      class="w-28 rounded border border-gray-300 py-1.5 pl-7 pr-2 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                    />
                  </div>
                  <p v-if="getSkuPriceError(si, pi, 'price')" class="mt-0.5 text-xs text-red-600">
                    {{ getSkuPriceError(si, pi, 'price') }}
                  </p>
                </td>
                <td class="px-3 py-2">
                  <select
                    v-model="sku.status"
                    class="w-24 rounded border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </td>
                <td class="px-3 py-2 text-center">
                  <input
                    v-model="sku.is_preorder"
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Actions -->
      <div class="sticky bottom-0 flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50/80 px-2 py-3 backdrop-blur-sm sm:gap-3 sm:px-1 sm:py-4">
        <NuxtLink
          to="/product/masters"
          class="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 sm:px-4 sm:py-2.5"
        >
          Batal
        </NuxtLink>
        <button
          type="submit"
          :disabled="saving || !skus.length"
          class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 sm:py-2.5"
        >
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          {{ saving ? 'Menyimpan...' : 'Simpan SKU' }}
        </button>
      </div>
    </form>

    <!-- SKU Image Picker Modal -->
    <AppMediaPicker
      v-if="skuImagePickerIndex !== null"
      :selected="skus[skuImagePickerIndex]?.image && skus[skuImagePickerIndex]!.image !== 'existing' ? [skus[skuImagePickerIndex]!.image] : []"
      @select="onSkuImageSelect"
      @close="skuImagePickerIndex = null"
    />
  </div>
</template>
