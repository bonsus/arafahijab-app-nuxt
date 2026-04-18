<script setup lang="ts">
import {
  ArrowLeft, Pencil, Package, Image as ImageIcon,
  ToggleLeft, ToggleRight, Loader2, ChevronDown,
  X, ChevronLeft, ChevronRight,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface MediaFile {
  id: string
  file_url: string
  size: string
  file_size: number
  width: number
  height: number
}

interface MediaItem {
  id: string
  name: string
  files: MediaFile[]
}

interface CategoryRef {
  id: string
  name: string
  slug: string
}

interface SkuItem {
  id: string
  sku: string
  variants: { name: string; value: string }[]
  weight: number
  is_preorder: boolean
  buffer_stock: number
  rewards_point: string
  status: string
  image : string | null
  image_media: MediaFile[] | null
  prices: {
    id: string
    customer_category_id: string
    customer_category_name?: string
    price: string
  }[]
}

interface ProductDetail {
  id: string
  product_category_id: string
  name: string
  slug: string
  description: string
  short_description: string
  thumbnail: string
  images: string[]
  thumbnail_media: MediaFile[] | null
  images_media: MediaItem[] | null
  variant1: string
  variant2: string
  tags: string[]
  type: string
  status: string
  sku_count: number
  price_min: number
  price_max: number
  category: CategoryRef | null
  created_at: string
  updated_at: string
}

interface CustomerCategory {
  id: string
  name: string
}

const route = useRoute()
const api = useApi()
const toast = useToast()
const router = useRouter()

const productId = route.params.id as string
const loadingPage = ref(true)
const togglingStatus = ref(false)

const product = ref<ProductDetail | null>(null)
const skus = ref<SkuItem[]>([])
const showSkus = ref(true)
const customerCategories = ref<CustomerCategory[]>([])

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Aktif', color: 'bg-green-100 text-green-700' },
  inactive: { label: 'Nonaktif', color: 'bg-gray-100 text-gray-500' },
  draft: { label: 'Draft', color: 'bg-yellow-100 text-yellow-700' },
}

// Image preview lightbox
const previewImages = ref<string[]>([])
const previewIndex = ref(0)
const showPreview = ref(false)

function openPreview(images: string[], index: number) {
  previewImages.value = images
  previewIndex.value = index
  showPreview.value = true
}

function closePreview() {
  showPreview.value = false
}

function prevImage() {
  previewIndex.value = (previewIndex.value - 1 + previewImages.value.length) % previewImages.value.length
}

function nextImage() {
  previewIndex.value = (previewIndex.value + 1) % previewImages.value.length
}

function onPreviewKeydown(e: KeyboardEvent) {
  if (!showPreview.value) return
  if (e.key === 'Escape') closePreview()
  else if (e.key === 'ArrowLeft') prevImage()
  else if (e.key === 'ArrowRight') nextImage()
}

// Description expand/collapse
const descExpanded = ref(false)
const descRef = ref<HTMLElement | null>(null)
const descNeedsExpand = ref(false)

function checkDescHeight() {
  nextTick(() => {
    if (descRef.value) {
      descNeedsExpand.value = descRef.value.scrollHeight > 200
    }
  })
}

function getThumbnailUrl(): string {
  const p = product.value
  if (!p) return ''
  return p.thumbnail_media?.find(f => f.size === 'medium')?.file_url
    || p.thumbnail_media?.find(f => f.size === 'large')?.file_url
    || p.thumbnail_media?.[0]?.file_url || ''
}

function getThumbnailOriginal(): string {
  const p = product.value
  if (!p) return ''
  return p.thumbnail_media?.find(f => f.size === 'original')?.file_url
    || p.thumbnail_media?.find(f => f.size === 'large')?.file_url
    || p.thumbnail_media?.[0]?.file_url || ''
}

function getImageUrls(): string[] {
  const p = product.value
  if (!p) return []
  if (p.images_media?.length) {
    return p.images_media.map(m =>
      m.files?.find(f => f.size === 'original')?.file_url
      || m.files?.find(f => f.size === 'large')?.file_url
      || m.files?.[0]?.file_url || '',
    ).filter(Boolean)
  }
  return p.images?.length ? [...p.images] : []
}

function getAllPreviewImages(): string[] {
  const result: string[] = []
  const thumb = getThumbnailOriginal()
  if (thumb) result.push(thumb)
  result.push(...getImageUrls())
  return result
}

function formatPrice(val: number | string): string {
  return new Intl.NumberFormat('id-ID').format(Number(val))
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function loadProduct() {
  loadingPage.value = true
  try {
    const [prodRes, ccRes, skuRes] = await Promise.all([
      api.get<{ data: ProductDetail }>(`/products/${productId}`),
      api.get<{ data: CustomerCategory[] }>('/customers/categories/index'),
      api.get<{ data: SkuItem[] | null }>(`/products/${productId}/skus`),
    ])
    product.value = prodRes.data
    customerCategories.value = ccRes.data || []
    skus.value = skuRes.data || []
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data produk')
    router.push('/product/masters')
  }
  finally {
    loadingPage.value = false
  }
}

function toggleSkuTable() {
  showSkus.value = !showSkus.value
}

async function toggleStatus() {
  if (!product.value) return
  const newStatus = product.value.status === 'active' ? 'inactive' : 'active'
  togglingStatus.value = true
  try {
    await api.put(`/products/${product.value.id}/update-status`, { status: newStatus })
    product.value.status = newStatus
    toast.success(`Status diubah ke ${statusConfig[newStatus]?.label || newStatus}`)
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status')
  }
  finally {
    togglingStatus.value = false
  }
}

function getCategoryName(catId: string): string {
  return customerCategories.value.find(c => c.id === catId)?.name || catId
}

onMounted(() => {
  loadProduct()
  document.addEventListener('keydown', onPreviewKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onPreviewKeydown)
})

watch(() => product.value?.description, () => {
  checkDescHeight()
})
</script>

<template>
  <div class="space-y-4 sm:space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-2 sm:gap-3">
        <NuxtLink
          to="/product/masters"
          class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 sm:p-2"
        >
          <ArrowLeft class="h-5 w-5" />
        </NuxtLink>
        <div class="min-w-0">
          <h1 class="text-lg font-bold text-gray-900 sm:text-2xl">Detail Produk</h1>
          <!-- <p class="mt-0.5 truncate text-sm text-gray-500">{{ product?.name }}</p> -->
        </div>
      </div>
      <div v-if="product" class="flex items-center gap-2 pl-9 sm:pl-0">
        <NuxtLink
          :to="`/product/${productId}/edit`"
          class="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:px-4 sm:py-2 sm:text-sm"
        >
          <Pencil class="h-3.5 w-3.5" />
          Edit Detail
        </NuxtLink>
        <NuxtLink
          :to="`/product/${productId}/skus`"
          class="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700 sm:px-4 sm:py-2 sm:text-sm"
        >
          <Package class="h-3.5 w-3.5" />
          Edit SKU
        </NuxtLink>
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

    <template v-else-if="product">
      <div class="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <!-- LEFT: Info (2/3) -->
        <div class="space-y-4 sm:space-y-6 lg:col-span-2">
          <!-- Informasi Produk -->
          <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
              <div class="flex items-center justify-between">
                <h2 class="text-base font-semibold text-gray-900">Informasi Produk</h2>
                <div class="flex items-center gap-2">
                  <span
                    v-if="product.type === 'slave'"
                    class="inline-flex rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700"
                  >
                    Slave
                  </span>
                  <span
                    class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                    :class="statusConfig[product.status]?.color || 'bg-gray-100 text-gray-500'"
                  >
                    {{ statusConfig[product.status]?.label || product.status }}
                  </span>
                  <button
                    :disabled="togglingStatus"
                    class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                    title="Toggle Status"
                    @click="toggleStatus"
                  >
                    <Loader2 v-if="togglingStatus" class="h-5 w-5 animate-spin" />
                    <ToggleRight v-else-if="product.status === 'active'" class="h-5 w-5 text-green-500" />
                    <ToggleLeft v-else class="h-5 w-5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
            <div class="space-y-4 p-4 sm:p-6">
              <!-- Name + Slug -->
              <div class="grid gap-4 sm:grid-cols-1">
                <div>
                  <dt class="text-xs font-medium text-gray-500">Nama Produk</dt>
                  <dd class="mt-1 text-sm font-medium text-gray-900">{{ product.name }}</dd>
                </div>
              </div>

              <!-- Category + Type + Status -->
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt class="text-xs font-medium text-gray-500">Kategori</dt>
                  <dd class="mt-1 text-sm text-gray-700">{{ product.category?.name || '-' }}</dd>
                </div> 
                <div>
                  <dt class="text-xs font-medium text-gray-500">Slug</dt>
                  <dd class="mt-1 text-sm text-gray-700">{{ product.slug || '-' }}</dd>
                </div>
                <!-- <div>
                  <dt class="text-xs font-medium text-gray-500">Harga</dt>
                  <dd class="mt-1 text-sm font-medium text-gray-900">
                    <template v-if="product.price_min || product.price_max">
                      Rp {{ formatPrice(product.price_min) }}
                      <template v-if="product.price_min !== product.price_max">
                        – {{ formatPrice(product.price_max) }}
                      </template>
                    </template>
                    <span v-else class="text-gray-400">-</span>
                  </dd>
                </div> -->
              </div>

              <!-- Variant names -->
              <div v-if="product.variant1" class="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt class="text-xs font-medium text-gray-500">Nama Varian 1</dt>
                  <dd class="mt-1 text-sm text-gray-700">{{ product.variant1 }}</dd>
                </div>
                <div v-if="product.variant2">
                  <dt class="text-xs font-medium text-gray-500">Nama Varian 2</dt>
                  <dd class="mt-1 text-sm text-gray-700">{{ product.variant2 }}</dd>
                </div>
              </div>

              <!-- Short description -->
              <div v-if="product.short_description">
                <dt class="text-xs font-medium text-gray-500">Deskripsi Singkat</dt>
                <dd class="mt-1 text-sm text-gray-700">{{ product.short_description }}</dd>
              </div>

              <!-- Tags -->
              <div v-if="product.tags?.length">
                <dt class="text-xs font-medium text-gray-500">Tags</dt>
                <dd class="mt-1.5 flex flex-wrap gap-1.5">
                  <span
                    v-for="tag in product.tags"
                    :key="tag"
                    class="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                  >
                    {{ tag }}
                  </span>
                </dd>
              </div>

              <!-- Timestamps -->
              <div class="grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
                <div>
                  <dt class="text-xs font-medium text-gray-500">Dibuat</dt>
                  <dd class="mt-1 text-xs text-gray-500">{{ formatDate(product.created_at) }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500">Terakhir diubah</dt>
                  <dd class="mt-1 text-xs text-gray-500">{{ formatDate(product.updated_at) }}</dd>
                </div>
              </div>
            </div>
          </div>

          <!-- Deskripsi -->
          <div v-if="product.description" class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
              <h2 class="text-base font-semibold text-gray-900">Deskripsi</h2>
            </div>
            <div class="p-4 sm:p-6">
              <div class="relative">
                <div
                  ref="descRef"
                  class="prose prose-sm max-w-none overflow-hidden text-gray-700 transition-all duration-300"
                  :style="{ maxHeight: descExpanded || !descNeedsExpand ? 'none' : '200px' }"
                  v-html="product.description"
                />
                <div
                  v-if="descNeedsExpand && !descExpanded"
                  class="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"
                />
              </div>
              <button
                v-if="descNeedsExpand"
                class="mt-2 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700"
                @click="descExpanded = !descExpanded"
              >
                {{ descExpanded ? 'Sembunyikan' : 'Lihat selengkapnya' }}
              </button>
            </div>
          </div>
        </div>

        <!-- RIGHT: Media (1/3) -->
        <div class="space-y-4 sm:space-y-6">
          <!-- Thumbnail -->
          <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
              <h2 class="text-base font-semibold text-gray-900">Thumbnail</h2>
            </div>
            <div class="p-4 sm:p-6">
              <div v-if="product.thumbnail_media?.length" class="group cursor-pointer overflow-hidden rounded-lg border border-gray-200" @click="openPreview(getAllPreviewImages(), 0)">
                <img
                  :src="getThumbnailUrl()"
                  :alt="product.name"
                  class="h-48 w-full object-cover transition-transform duration-200 group-hover:scale-105 sm:h-56"
                  @error="($event.target as HTMLImageElement).style.display='none'"
                />
              </div>
              <div v-else-if="product.thumbnail" class="group cursor-pointer overflow-hidden rounded-lg border border-gray-200" @click="openPreview([product.thumbnail], 0)">
                <img
                  :src="product.thumbnail"
                  :alt="product.name"
                  class="h-40 w-full object-cover transition-transform duration-200 group-hover:scale-105 sm:h-40"
                  @error="($event.target as HTMLImageElement).style.display='none'"
                />
              </div>
              <div v-else class="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                <ImageIcon class="h-8 w-8 text-gray-300" />
              </div>
            </div>
          </div>

          <!-- Images -->
          <div v-if="product.images_media?.length" class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
              <h2 class="text-base font-semibold text-gray-900">Gambar ({{ product.images_media.length }})</h2>
            </div>
            <div class="grid grid-cols-3 gap-2 p-4 sm:p-6">
              <div
                v-for="(media, idx) in product.images_media"
                :key="media.id"
                class="group cursor-pointer overflow-hidden rounded-lg border border-gray-200"
                @click="openPreview(getImageUrls(), idx)"
              >
                <img
                  :src="media.files?.find(f => f.size === 'medium')?.file_url || media.files?.find(f => f.size === 'small')?.file_url || media.files?.[0]?.file_url"
                  :alt="media.name"
                  class="h-20 w-full object-cover transition-transform duration-200 group-hover:scale-105 sm:h-24"
                  @error="($event.target as HTMLImageElement).style.display='none'"
                />
              </div>
            </div>
          </div>
          <div v-else-if="product.images?.length" class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
              <h2 class="text-base font-semibold text-gray-900">Gambar ({{ product.images.length }})</h2>
            </div>
            <div class="grid grid-cols-3 gap-2 p-4 sm:p-6">
              <div
                v-for="(img, idx) in product.images"
                :key="idx"
                class="group cursor-pointer overflow-hidden rounded-lg border border-gray-200"
                @click="openPreview([...product!.images], idx)"
              >
                <img
                  :src="img"
                  :alt="`Gambar ${idx + 1}`"
                  class="h-28 w-full object-cover transition-transform duration-200 group-hover:scale-105 sm:h-32"
                  @error="($event.target as HTMLImageElement).style.display='none'"
                />
              </div>
            </div>
          </div>
        </div> 
      </div>

      <!-- SKU Section — full width -->
      <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 mb-8">
        <button
          type="button"
          class="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50 sm:px-6 sm:py-4"
          @click="toggleSkuTable"
        >
          <div>
            <h2 class="text-base font-semibold text-gray-900">Daftar SKU</h2>
            <p class="mt-0.5 text-xs text-gray-500">{{ skus.length }} SKU terdaftar</p>
          </div>
          <ChevronDown
            class="h-5 w-5 text-gray-400 transition-transform duration-200"
            :class="showSkus ? 'rotate-180' : ''"
          />
        </button>

        <div v-if="showSkus" class="border-t border-gray-100">
          <!-- SKU Empty -->
          <div v-if="!skus.length" class="p-6 text-center">
            <p class="text-sm text-gray-500">Belum ada SKU terdaftar.</p>
          </div>

          <!-- SKU Table -->
          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[600px] text-left text-sm sm:min-w-[800px]">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50">
                  <th
                    class="sticky left-0 z-10 min-w-[120px] whitespace-nowrap bg-gray-50 px-4 py-2.5 font-medium text-gray-600"
                    :class="!product.variant1 ? 'sku-shadow' : ''"
                  >
                    SKU
                  </th>
                  <th
                    v-if="product.variant1"
                    class="sticky z-10 min-w-[100px] whitespace-nowrap bg-gray-50 px-4 py-2.5 font-medium text-gray-600"
                    :style="{ left: '120px' }"
                    :class="!product.variant2 ? 'sku-shadow' : ''"
                  >
                    {{ product.variant1 }}
                  </th>
                  <th
                    v-if="product.variant2"
                    class="sticky z-10 min-w-[100px] whitespace-nowrap bg-gray-50 px-4 py-2.5 font-medium text-gray-600 sku-shadow"
                    :style="{ left: '220px' }"
                  >
                    {{ product.variant2 }}
                  </th>
                  <th class="whitespace-nowrap px-4 py-2.5 font-medium text-gray-600">Gambar</th>
                  <th class="whitespace-nowrap px-4 py-2.5 font-medium text-gray-600">Berat</th>
                  <th class="whitespace-nowrap px-4 py-2.5 font-medium text-gray-600">Buffer</th>
                  <th class="whitespace-nowrap px-4 py-2.5 font-medium text-gray-600">Reward</th>
                  <th
                    v-for="cc in customerCategories"
                    :key="cc.id"
                    class="whitespace-nowrap px-4 py-2.5 font-medium text-gray-600"
                  >
                    {{ cc.name }}
                  </th>
                  <th class="whitespace-nowrap px-4 py-2.5 font-medium text-gray-600">Status</th>
                  <th class="whitespace-nowrap px-4 py-2.5 font-medium text-gray-600">PO</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="sku in skus" :key="sku.id" class="group/row hover:bg-gray-50/50">
                  <td
                    class="sticky left-0 z-10 min-w-[120px] whitespace-nowrap bg-white px-4 py-2.5 font-mono text-xs text-gray-900 group-hover/row:bg-gray-50/50"
                    :class="!product.variant1 ? 'sku-shadow' : ''"
                  >
                    {{ sku.sku }}
                  </td>
                  <td
                    v-if="product.variant1"
                    class="sticky z-10 min-w-[100px] bg-white px-4 py-2.5 group-hover/row:bg-gray-50/50"
                    :style="{ left: '120px' }"
                    :class="!product.variant2 ? 'sku-shadow' : ''"
                  >
                    <span class="inline-block rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                      {{ sku.variants?.[0]?.value || '-' }}
                    </span>
                  </td>
                  <td
                    v-if="product.variant2"
                    class="sticky z-10 min-w-[100px] bg-white px-4 py-2.5 group-hover/row:bg-gray-50/50 sku-shadow"
                    :style="{ left: '220px' }"
                  >
                    <span class="inline-block rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                      {{ sku.variants?.[1]?.value || '-' }}
                    </span>
                  </td>
                  <td class="px-4 py-2.5">
                    <div v-if="sku.image_media?.length" class="h-10 w-10 overflow-hidden rounded bg-gray-50 ring-1 ring-gray-200">
                      <img :src="sku.image_media.find(f => f.size === 'small')?.file_url || sku.image_media[0]?.file_url" alt="" class="h-full w-full object-cover" />
                    </div>
                    <span v-else class="text-xs text-gray-400">-</span>
                  </td>
                  <td class="whitespace-nowrap px-4 py-2.5 text-xs text-gray-600">{{ sku.weight ? `${sku.weight}g` : '-' }}</td>
                  <td class="whitespace-nowrap px-4 py-2.5 text-xs text-gray-600">{{ sku.buffer_stock || '-' }}</td>
                  <td class="whitespace-nowrap px-4 py-2.5 text-xs text-gray-600">{{ sku.rewards_point || '-' }}</td>
                  <td
                    v-for="cc in customerCategories"
                    :key="cc.id"
                    class="whitespace-nowrap px-4 py-2.5 text-xs text-gray-700"
                  >
                    <template v-if="sku.prices?.find(p => p.customer_category_id === cc.id)">
                      Rp {{ formatPrice(sku.prices.find(p => p.customer_category_id === cc.id)!.price) }}
                    </template>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="px-4 py-2.5">
                    <span
                      class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="sku.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                    >
                      {{ sku.status === 'active' ? 'Aktif' : 'Nonaktif' }}
                    </span>
                  </td>
                  <td class="whitespace-nowrap px-4 py-2.5 text-xs text-gray-600">{{ sku.is_preorder ? 'Ya' : '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Image Preview Lightbox -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showPreview"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          @click.self="closePreview"
        >
          <!-- Close -->
          <button
            class="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-white/80 transition-colors hover:bg-black/60 hover:text-white"
            @click="closePreview"
          >
            <X class="h-5 w-5" />
          </button>

          <!-- Counter -->
          <div v-if="previewImages.length > 1" class="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-sm text-white/80">
            {{ previewIndex + 1 }} / {{ previewImages.length }}
          </div>

          <!-- Prev -->
          <button
            v-if="previewImages.length > 1"
            class="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/80 transition-colors hover:bg-black/60 hover:text-white sm:left-6"
            @click="prevImage"
          >
            <ChevronLeft class="h-6 w-6" />
          </button>

          <!-- Image -->
          <img
            :src="previewImages[previewIndex]"
            alt="Preview"
            class="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          />

          <!-- Next -->
          <button
            v-if="previewImages.length > 1"
            class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/80 transition-colors hover:bg-black/60 hover:text-white sm:right-6"
            @click="nextImage"
          >
            <ChevronRight class="h-6 w-6" />
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.sku-shadow {
  box-shadow: 4px 0 8px -2px rgba(0, 0, 0, 0.06);
}
</style>
