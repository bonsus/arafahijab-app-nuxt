<script setup lang="ts">
import {
  ArrowLeft, Plus, Trash2, Loader2, X, Image as ImageIcon,
  Copy, ChevronDown,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface CategoryOption {
  id: string
  name: string
  children: { id: string; name: string }[] | null
}

interface CustomerCategory {
  id: string
  name: string
}

interface SkuPrice {
  customer_category_id: string
  price: number | null
}

interface SkuRow {
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

const api = useApi()
const toast = useToast()
const router = useRouter()

const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})

// Reference data
const categories = ref<CategoryOption[]>([])
const customerCategories = ref<CustomerCategory[]>([])
const loadingRef = ref(true)

// Product form
const form = reactive({
  category_id: '',
  name: '',
  slug: '',
  description: '',
  short_description: '',
  thumbnail: '',
  images: [] as string[],
  variant_1: '',
  variant_2: '',
  tags: '',
  type: 'master',
  status: 'active',
})

// Image URL input
interface SelectedMedia {
  id: string
  name: string
  thumb: string
}

const thumbnailMedia = ref<SelectedMedia | null>(null)
const imagesMedia = ref<SelectedMedia[]>([])
const showThumbPicker = ref(false)
const showImagesPicker = ref(false)
const skuImagePickerIndex = ref<number | null>(null)

function onThumbSelect(medias: any[]) {
  if (medias.length) {
    const m = medias[0]
    const thumb = m.files?.find((f: any) => f.size === 'thumbnail')?.file_url || m.files?.[0]?.file_url || ''
    thumbnailMedia.value = { id: m.id, name: m.name, thumb }
    form.thumbnail = m.id
  }
  showThumbPicker.value = false
}

function removeThumb() {
  thumbnailMedia.value = null
  form.thumbnail = ''
}

function onImagesSelect(medias: any[]) {
  const selected: SelectedMedia[] = medias.map(m => ({
    id: m.id,
    name: m.name,
    thumb: m.files?.find((f: any) => f.size === 'thumbnail')?.file_url || m.files?.[0]?.file_url || '',
  }))
  imagesMedia.value = selected
  form.images = selected.map(s => s.id)
  showImagesPicker.value = false
}

function removeImage(index: number) {
  imagesMedia.value.splice(index, 1)
  form.images.splice(index, 1)
}

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

// Variant values
const variant1Values = ref<string[]>([])
const variant2Values = ref<string[]>([])
const newVar1 = ref('')
const newVar2 = ref('')

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

const stickySkuLeft = computed(() => form.variant_2 ? '16rem' : '8rem')
const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 640
}

function applyBulkUpdate() {
  let applied = 0
  skus.value.forEach(s => {
    if (bulkFields.value.weight !== null) { s.weight = bulkFields.value.weight; applied++ }
    if (bulkFields.value.buffer_stock !== null) { s.buffer_stock = bulkFields.value.buffer_stock; applied++ }
    if (bulkFields.value.rewards_point !== null) { s.rewards_point = bulkFields.value.rewards_point; applied++ }
    if (bulkFields.value.status) { s.status = bulkFields.value.status; applied++ }
    if (bulkFields.value.is_preorder !== null) { s.is_preorder = bulkFields.value.is_preorder; applied++ }
    s.prices.forEach(p => {
      const bulkPrice = bulkFields.value.prices[p.customer_category_id]
      if (bulkPrice !== null && bulkPrice !== undefined) { p.price = bulkPrice; applied++ }
    })
  })
  if (applied > 0) {
    toast.success('Update massal diterapkan')
    bulkFields.value.weight = null
    bulkFields.value.buffer_stock = null
    bulkFields.value.rewards_point = null
    bulkFields.value.status = ''
    bulkFields.value.is_preorder = null
    customerCategories.value.forEach(cc => { bulkFields.value.prices[cc.id] = null })
  } else {
    toast.error('Isi minimal satu field untuk diterapkan')
  }
}

function addVariant1() {
  const v = newVar1.value.trim()
  if (v && !variant1Values.value.includes(v)) {
    variant1Values.value.push(v)
    newVar1.value = ''
    generateSkus()
  }
}

function removeVariant1(index: number) {
  variant1Values.value.splice(index, 1)
  generateSkus()
}

function addVariant2() {
  const v = newVar2.value.trim()
  if (v && !variant2Values.value.includes(v)) {
    variant2Values.value.push(v)
    newVar2.value = ''
    generateSkus()
  }
}

function removeVariant2(index: number) {
  variant2Values.value.splice(index, 1)
  generateSkus()
}

// SKU rows
const skus = ref<SkuRow[]>([])

function createSku(v1: string, v2: string): SkuRow {
  return {
    sku: '',
    image: '',
    image_thumb: '',
    variant_1: v1,
    variant_2: v2,
    weight: null,
    is_preorder: false,
    buffer_stock: null,
    rewards_point: null,
    status: 'active',
    prices: customerCategories.value.map(cc => ({
      customer_category_id: cc.id,
      price: null,
    })),
  }
}

function generateSkus() {
  // Preserve existing data by key
  const existing = new Map<string, SkuRow>()
  for (const s of skus.value) {
    existing.set(`${s.variant_1}||${s.variant_2}`, s)
  }

  const newSkus: SkuRow[] = []
  if (!variant1Values.value.length) {
    skus.value = []
    return
  }

  if (form.variant_2 && variant2Values.value.length) {
    for (const v1 of variant1Values.value) {
      for (const v2 of variant2Values.value) {
        const key = `${v1}||${v2}`
        newSkus.push(existing.get(key) || createSku(v1, v2))
      }
    }
  }
  else {
    for (const v1 of variant1Values.value) {
      const key = `${v1}||`
      newSkus.push(existing.get(key) || createSku(v1, ''))
    }
  }

  skus.value = newSkus
}

// Watch variant_2 name clear → regenerate
watch(() => form.variant_2, (val) => {
  if (!val) {
    variant2Values.value = []
  }
  generateSkus()
})

// Flatten categories for select
const categorySelectOptions = computed(() => {
  const opts: { id: string; name: string; isChild: boolean }[] = []
  for (const cat of categories.value) {
    opts.push({ id: cat.id, name: cat.name, isChild: false })
    if (cat.children) {
      for (const child of cat.children) {
        opts.push({ id: child.id, name: child.name, isChild: true })
      }
    }
  }
  return opts
})

function getCustomerCategoryName(id: string): string {
  return customerCategories.value.find(c => c.id === id)?.name || id
}

// Fetch reference data
async function fetchReferenceData() {
  loadingRef.value = true
  try {
    const [catRes, ccRes] = await Promise.all([
      api.get<{ data: CategoryOption[] }>('/products/categories/index'),
      api.get<{ data: CustomerCategory[] }>('/customers/categories/index'),
    ])
    categories.value = catRes.data || []
    customerCategories.value = ccRes.data || []
  }
  catch {
    // silent
  }
  finally {
    loadingRef.value = false
  }
}

function getFieldError(key: string): string | undefined {
  return formErrors.value[key]?.[0]
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

async function handleSubmit() {
  saving.value = true
  formErrors.value = {}

  try {
    const tags = form.tags
      ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
      : []

    const body: Record<string, unknown> = {
      category_id: form.category_id,
      name: form.name,
      slug: form.slug,
      description: form.description,
      short_description: form.short_description,
      thumbnail: form.thumbnail,
      images: form.images,
      variant_1: form.variant_1,
      variant_2: form.variant_2,
      tags,
      type: form.type,
      status: form.status,
      skus: skus.value.map(s => ({
        sku: s.sku,
        image: s.image || undefined,
        variant_1: s.variant_1,
        variant_2: s.variant_2,
        weight: s.weight || 0,
        is_preorder: s.is_preorder,
        buffer_stock: s.buffer_stock || 0,
        rewards_point: s.rewards_point || 0,
        status: s.status,
        prices: s.prices
          .filter(p => p.price !== null && p.price > 0)
          .map(p => ({
            customer_category_id: p.customer_category_id,
            price: p.price,
          })),
      })),
    }

    await api.post('/products/create', body)
    toast.success('Produk berhasil ditambahkan')
    router.push('/product/masters')
  }
  catch (err: any) {
    if (err.errors) {
      formErrors.value = err.errors
      toast.error('Terdapat kesalahan pada form')
    }
    else {
      toast.error(err.message || 'Gagal menyimpan produk')
    }
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchReferenceData()
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// Init bulk price fields when customer categories load
watch(customerCategories, (cats) => {
  cats.forEach(cc => {
    if (bulkFields.value.prices[cc.id] === undefined) bulkFields.value.prices[cc.id] = null
  })
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/product/masters"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Tambah Produk</h1>
        <p class="mt-0.5 text-sm text-gray-500">Buat produk baru dengan SKU dan harga</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loadingRef" class="space-y-4">
      <div v-for="i in 3" :key="i" class="animate-pulse rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div class="h-4 w-32 rounded bg-gray-200" />
        <div class="mt-4 space-y-3">
          <div class="h-10 rounded bg-gray-200" />
          <div class="h-10 rounded bg-gray-200" />
        </div>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit">
      <!-- TOP GRID: Info (left) + Media (right) -->
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- LEFT: Informasi Produk (2/3) -->
        <div class="space-y-6 lg:col-span-2">
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Informasi Produk</h2>

            <div class="space-y-4">
              <!-- Name -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Produk <span class="text-red-500">*</span></label>
                <input
                  v-model="form.name"
                  type="text"
                  placeholder="Nama produk"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <p v-if="getFieldError('name')" class="mt-1 text-xs text-red-600">{{ getFieldError('name') }}</p>
              </div>

              <!-- Slug -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Slug</label>
                <input
                  v-model="form.slug"
                  type="text"
                  placeholder="Auto-generate jika kosong"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <p v-if="getFieldError('slug')" class="mt-1 text-xs text-red-600">{{ getFieldError('slug') }}</p>
              </div>

              <!-- Category + Type + Status -->
              <div class="grid gap-4 sm:grid-cols-3">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Kategori <span class="text-red-500">*</span></label>
                  <select
                    v-model="form.category_id"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">Pilih Kategori</option>
                    <option v-for="opt in categorySelectOptions" :key="opt.id" :value="opt.id">
                      {{ opt.isChild ? `\u00A0\u00A0\u00A0${opt.name}` : opt.name }}
                    </option>
                  </select>
                  <p v-if="getFieldError('categoryId') || getFieldError('category_id')" class="mt-1 text-xs text-red-600">
                    {{ getFieldError('categoryId') || getFieldError('category_id') }}
                  </p>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Tipe <span class="text-red-500">*</span></label>
                  <select
                    v-model="form.type"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="master">Master</option>
                    <option value="slave">Slave</option>
                  </select>
                  <p v-if="getFieldError('type')" class="mt-1 text-xs text-red-600">{{ getFieldError('type') }}</p>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Status <span class="text-red-500">*</span></label>
                  <select
                    v-model="form.status"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                    <option value="draft">Draft</option>
                  </select>
                  <p v-if="getFieldError('status')" class="mt-1 text-xs text-red-600">{{ getFieldError('status') }}</p>
                </div>
              </div>

              <!-- Short description -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Deskripsi Singkat</label>
                <input
                  v-model="form.short_description"
                  type="text"
                  placeholder="Deskripsi singkat produk"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <!-- Description WYSIWYG -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Deskripsi</label>
                <AppEditor v-model="form.description" placeholder="Tulis deskripsi lengkap produk..." />
              </div>

              <!-- Tags -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Tags</label>
                <input
                  v-model="form.tags"
                  type="text"
                  placeholder="Pisahkan dengan koma: hijab, voal, premium"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Thumbnail & Images (1/3) -->
        <div class="space-y-6">
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Thumbnail & Gambar</h2>

            <div class="space-y-4">
              <!-- Thumbnail -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Thumbnail</label>
                <div v-if="thumbnailMedia" class="group relative overflow-hidden rounded-lg border border-gray-200">
                  <img :src="thumbnailMedia.thumb" :alt="thumbnailMedia.name" class="h-40 w-full object-cover" />
                  <div class="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      class="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white"
                      @click="showThumbPicker = true"
                    >
                      Ganti
                    </button>
                    <button
                      type="button"
                      class="rounded-full bg-white/90 p-1.5 text-red-600 hover:bg-white"
                      @click="removeThumb"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p class="truncate px-2 py-1.5 text-xs text-gray-500">{{ thumbnailMedia.name }}</p>
                </div>
                <button
                  v-else
                  type="button"
                  class="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-gray-400 transition-colors hover:border-primary-400 hover:text-primary-500"
                  @click="showThumbPicker = true"
                >
                  <ImageIcon class="h-8 w-8" />
                  <span class="mt-2 text-xs font-medium">Pilih Thumbnail</span>
                </button>
              </div>

              <!-- Images -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Gambar Produk</label>

                <div v-if="imagesMedia.length" class="space-y-2">
                  <div
                    v-for="(img, idx) in imagesMedia"
                    :key="img.id"
                    class="group flex items-center gap-2 rounded-lg border border-gray-200 p-2"
                  >
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-gray-50">
                      <img :src="img.thumb" :alt="img.name" class="h-full w-full object-cover" />
                    </div>
                    <span class="min-w-0 flex-1 truncate text-xs text-gray-500">{{ img.name }}</span>
                    <button
                      type="button"
                      class="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                      @click="removeImage(idx)"
                    >
                      <X class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-xs font-medium text-gray-500 transition-colors hover:border-primary-400 hover:text-primary-600"
                  @click="showImagesPicker = true"
                >
                  <Plus class="h-3.5 w-3.5" />
                  {{ imagesMedia.length ? 'Ubah Gambar' : 'Pilih Gambar' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- BOTTOM: Atur Variasi -->
      <div class="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
        <h2 class="mb-4 text-base font-semibold text-gray-900">Atur Variasi</h2>

        <div class="grid gap-6 sm:grid-cols-2">
          <!-- Variant 1 -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Varian 1 <span class="text-red-500">*</span></label>
            <input
              v-model="form.variant_1"
              type="text"
              placeholder='Misal: "Warna"'
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <p v-if="getFieldError('variant1') || getFieldError('variant_1')" class="mt-1 text-xs text-red-600">
              {{ getFieldError('variant1') || getFieldError('variant_1') }}
            </p>

            <!-- Values -->
            <div v-if="form.variant_1" class="mt-3">
              <label class="mb-1 block text-xs font-medium text-gray-600">Nilai {{ form.variant_1 }}</label>
              <div class="flex gap-2">
                <input
                  v-model="newVar1"
                  type="text"
                  :placeholder="`Tambah ${form.variant_1}...`"
                  class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  @keydown.enter.prevent="addVariant1"
                />
                <button
                  type="button"
                  class="shrink-0 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                  @click="addVariant1"
                >
                  <Plus class="h-4 w-4" />
                </button>
              </div>
              <div v-if="variant1Values.length" class="mt-2 flex flex-wrap gap-1.5">
                <span
                  v-for="(v, i) in variant1Values"
                  :key="v"
                  class="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary-200"
                >
                  {{ v }}
                  <button type="button" class="ml-0.5 text-primary-400 hover:text-primary-700" @click="removeVariant1(i)">
                    <X class="h-3 w-3" />
                  </button>
                </span>
              </div>
            </div>
          </div>

          <!-- Variant 2 -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Varian 2</label>
            <input
              v-model="form.variant_2"
              type="text"
              placeholder='Misal: "Ukuran"'
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />

            <!-- Values -->
            <div v-if="form.variant_2" class="mt-3">
              <label class="mb-1 block text-xs font-medium text-gray-600">Nilai {{ form.variant_2 }}</label>
              <div class="flex gap-2">
                <input
                  v-model="newVar2"
                  type="text"
                  :placeholder="`Tambah ${form.variant_2}...`"
                  class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  @keydown.enter.prevent="addVariant2"
                />
                <button
                  type="button"
                  class="shrink-0 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                  @click="addVariant2"
                >
                  <Plus class="h-4 w-4" />
                </button>
              </div>
              <div v-if="variant2Values.length" class="mt-2 flex flex-wrap gap-1.5">
                <span
                  v-for="(v, i) in variant2Values"
                  :key="v"
                  class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200"
                >
                  {{ v }}
                  <button type="button" class="ml-0.5 text-blue-400 hover:text-blue-700" @click="removeVariant2(i)">
                    <X class="h-3 w-3" />
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- BOTTOM: SKU Table (full-width scrollable) -->
      <div class="mt-6 rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div class="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 class="text-sm font-semibold text-gray-900">Daftar SKU</h2>
            <p class="mt-0.5 text-xs text-gray-500">
              {{ skus.length }} SKU dihasilkan dari variasi di atas
            </p>
          </div>
          <div v-if="skus.length" class="flex items-center gap-2">
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

        <!-- No customer categories warning -->
        <div
          v-if="!customerCategories.length"
          class="mx-4 my-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 sm:mx-6"
        >
          Belum ada kategori customer. Harga per kategori tidak bisa diisi.
        </div>

        <div v-if="!skus.length" class="rounded-lg border-0 border-dashedx border-gray-200 m-4 p-8 pt-2 text-center sm:m-6">
          <p class="text-sm text-gray-500">Tambahkan nilai variasi di atas untuk menghasilkan daftar SKU.</p>
        </div>

        <!-- Scrollable table -->
        <div v-else class="overflow-x-auto -mx-px">
          <table class="w-full min-w-[700px] text-left text-sm sm:min-w-[900px]">
            <thead>
              <!-- Bulk input row -->
              <tr v-if="showBulk" class="border-b border-amber-200 bg-amber-50/60">
                <td class="sticky left-0 z-10 min-w-[6rem] bg-amber-50 px-3 py-2 sm:min-w-[8rem]">
                  <span class="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Massal</span>
                </td>
                <td v-if="form.variant_2" :class="isMobile ? 'bg-amber-50 px-3 py-2 min-w-[6rem]' : 'sticky left-[8rem] z-10 min-w-[8rem] bg-amber-50 px-3 py-2'" />
                <td :class="isMobile ? 'bg-amber-50 px-3 py-2 min-w-[8rem]' : 'sticky z-10 min-w-[10rem] bg-amber-50 px-3 py-2 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]'" :style="!isMobile ? { left: stickySkuLeft } : {}" />
                <td class="bg-amber-50 px-3 py-2" />
                <td class="px-3 py-2">
                  <input v-model.number="bulkFields.weight" type="number" min="0" placeholder="—" class="w-20 rounded border border-amber-300 bg-white px-2 py-1.5 text-xs placeholder:text-amber-300 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20" />
                </td>
                <td class="px-3 py-2">
                  <input v-model.number="bulkFields.buffer_stock" type="number" min="0" placeholder="—" class="w-20 rounded border border-amber-300 bg-white px-2 py-1.5 text-xs placeholder:text-amber-300 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20" />
                </td>
                <td class="px-3 py-2">
                  <input v-model.number="bulkFields.rewards_point" type="number" min="0" step="0.01" placeholder="—" class="w-20 rounded border border-amber-300 bg-white px-2 py-1.5 text-xs placeholder:text-amber-300 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20" />
                </td>
                <td v-for="cc in customerCategories" :key="'bulk-' + cc.id" class="px-3 py-2">
                  <div class="relative">
                    <span class="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-amber-400">Rp</span>
                    <input v-model.number="bulkFields.prices[cc.id]" type="number" min="0" placeholder="—" class="w-28 rounded border border-amber-300 bg-white py-1.5 pl-7 pr-2 text-xs placeholder:text-amber-300 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20" />
                  </div>
                </td>
                <td class="px-3 py-2">
                  <select v-model="bulkFields.status" class="w-24 rounded border border-amber-300 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20">
                    <option value="">—</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </td>
                <td class="px-3 py-2 text-center">
                  <select v-model="bulkFields.is_preorder" class="w-16 rounded border border-amber-300 bg-white px-1 py-1.5 text-xs text-gray-700 focus:border-amber-500 focus:outline-none">
                    <option :value="null">—</option>
                    <option :value="true">Ya</option>
                    <option :value="false">Tidak</option>
                  </select>
                </td>
              </tr>
              <!-- Column headers -->
              <tr class="border-b border-gray-200 bg-gray-50">
                <th class="sticky left-0 z-10 min-w-[6rem] whitespace-nowrap bg-gray-50 px-3 py-2.5 font-medium text-gray-600 sm:min-w-[8rem]">{{ form.variant_1 || 'Varian 1' }}</th>
                <th v-if="form.variant_2" :class="isMobile ? 'whitespace-nowrap bg-gray-50 px-3 py-2.5 font-medium text-gray-600 min-w-[6rem]' : 'sticky left-[8rem] z-10 min-w-[8rem] whitespace-nowrap bg-gray-50 px-3 py-2.5 font-medium text-gray-600'">{{ form.variant_2 }}</th>
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
              <tr v-for="(sku, si) in skus" :key="si" class="hover:bg-gray-50/50">
                <td class="sticky left-0 z-10 min-w-[6rem] bg-white px-3 py-2 sm:min-w-[8rem]">
                  <span class="inline-flex rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">{{ sku.variant_1 }}</span>
                </td>
                <td v-if="form.variant_2" :class="isMobile ? 'bg-white px-3 py-2 min-w-[6rem]' : 'sticky left-[8rem] z-10 min-w-[8rem] bg-white px-3 py-2'">
                  <span class="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{{ sku.variant_2 }}</span>
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
      <div class="sticky bottom-0 mt-6 flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50/80 px-1 py-4 backdrop-blur-sm">
        <NuxtLink
          to="/product/masters"
          class="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          Batal
        </NuxtLink>
        <button
          type="submit"
          :disabled="saving"
          class="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          {{ saving ? 'Menyimpan...' : 'Simpan Produk' }}
        </button>
      </div>
    </form>

    <!-- Media Picker Modals -->
    <AppMediaPicker
      v-if="showThumbPicker"
      :selected="form.thumbnail ? [form.thumbnail] : []"
      @select="onThumbSelect"
      @close="showThumbPicker = false"
    />
    <AppMediaPicker
      v-if="showImagesPicker"
      multiple
      :selected="form.images"
      @select="onImagesSelect"
      @close="showImagesPicker = false"
    />
    <AppMediaPicker
      v-if="skuImagePickerIndex !== null"
      :selected="skus[skuImagePickerIndex]?.image ? [skus[skuImagePickerIndex]!.image] : []"
      @select="onSkuImageSelect"
      @close="skuImagePickerIndex = null"
    />
  </div>
</template>
