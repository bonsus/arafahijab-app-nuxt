<script setup lang="ts">
import {
  ArrowLeft, Plus, Loader2, X, Trash2, Image as ImageIcon,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface CategoryOption {
  id: string
  name: string
  children: { id: string; name: string }[] | null
}

interface MediaFile {
  id: string
  file_url: string
  size: string
}

interface MediaItem {
  id: string
  name: string
  files: MediaFile[]
}

interface ProductDetail {
  id: string
  product_category_id: string
  name: string
  slug: string
  description: string
  short_description: string
  thumbnail: string
  thumbnail_small: string
  thumbnail_medium: string
  images: {
    small?: string[]
    medium?: string[]
    original?: string[]
  } | string[] | null
  thumbnail_media: MediaFile[] | null
  images_media: MediaItem[] | null
  variant1: string
  variant2: string
  tags: string[]
  type: string
  status: string
}

const route = useRoute()
const api = useApi()
const toast = useToast()
const router = useRouter()

const productId = route.params.id as string
const saving = ref(false)
const loadingPage = ref(true)
const formErrors = ref<Record<string, string[]>>({})

const categories = ref<CategoryOption[]>([])

const form = reactive({
  category_id: '',
  name: '',
  slug: '',
  description: '',
  short_description: '',
  thumbnail: '',
  thumbnail_small: '',
  thumbnail_medium: '',
  images: {
    small: [] as string[],
    medium: [] as string[],
    original: [] as string[],
  },
  tags: '',
  type: 'master',
  status: 'active',
})

interface SelectedMedia {
  id: string
  name: string
  thumb: string
  small: string
  medium: string
  original: string
}

function getMediaUrl(m: any, size: string): string {
  return m?.files?.find((f: any) => f.size === size)?.file_url || ''
}

function toSelectedMedia(m: any): SelectedMedia {
  const small = getMediaUrl(m, 'small')
  const medium = getMediaUrl(m, 'medium')
  const original = getMediaUrl(m, 'original') || getMediaUrl(m, 'large') || m?.files?.[0]?.file_url || ''
  const thumb = getMediaUrl(m, 'thumbnail') || small || medium || original
  return { id: m.id, name: m.name, thumb, small, medium, original }
}

const thumbnailMedia = ref<SelectedMedia | null>(null)
const imagesMedia = ref<SelectedMedia[]>([])
const showThumbPicker = ref(false)
const showImagesPicker = ref(false)

function onThumbSelect(medias: any[]) {
  if (medias.length) {
    const sel = toSelectedMedia(medias[0])
    thumbnailMedia.value = sel
    form.thumbnail = sel.original
    form.thumbnail_small = sel.small
    form.thumbnail_medium = sel.medium
  }
  showThumbPicker.value = false
}

function removeThumb() {
  thumbnailMedia.value = null
  form.thumbnail = ''
  form.thumbnail_small = ''
  form.thumbnail_medium = ''
}

function syncImagesForm() {
  form.images = {
    small: imagesMedia.value.map(s => s.small),
    medium: imagesMedia.value.map(s => s.medium),
    original: imagesMedia.value.map(s => s.original),
  }
}

function onImagesSelect(medias: any[]) {
  const incoming = medias.map(toSelectedMedia)
  // Merge with existing: keep existing in order, append new unique ones (by id or original URL)
  const existingKeys = new Set(
    imagesMedia.value.map(m => m.id || m.original).filter(Boolean),
  )
  for (const item of incoming) {
    const key = item.id || item.original
    if (key && !existingKeys.has(key)) {
      imagesMedia.value.push(item)
      existingKeys.add(key)
    }
  }
  syncImagesForm()
  showImagesPicker.value = false
}

function removeImage(index: number) {
  imagesMedia.value.splice(index, 1)
  syncImagesForm()
}

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

function getFieldError(key: string): string | undefined {
  return formErrors.value[key]?.[0]
}

async function loadProduct() {
  loadingPage.value = true
  try {
    const [catRes, prodRes] = await Promise.all([
      api.get<{ data: CategoryOption[] }>('/products/categories/index'),
      api.get<{ data: ProductDetail }>(`/products/${productId}`),
    ])

    categories.value = catRes.data || []

    const p = prodRes.data
    form.category_id = p.product_category_id || ''
    form.name = p.name
    form.slug = p.slug
    form.description = p.description || ''
    form.short_description = p.short_description || ''
    form.tags = p.tags?.join(', ') || ''
    form.type = p.type || 'master'
    form.status = p.status

    // Thumbnail
    const thumbSmall = p.thumbnail_small || p.thumbnail_media?.find(f => f.size === 'small')?.file_url || ''
    const thumbMedium = p.thumbnail_medium || p.thumbnail_media?.find(f => f.size === 'medium')?.file_url || ''
    const thumbOriginal = p.thumbnail
      || p.thumbnail_media?.find(f => f.size === 'original')?.file_url
      || p.thumbnail_media?.find(f => f.size === 'large')?.file_url
      || p.thumbnail_media?.[0]?.file_url
      || ''
    const thumbPreview = p.thumbnail_media?.find(f => f.size === 'thumbnail')?.file_url
      || thumbSmall || thumbMedium || thumbOriginal

    form.thumbnail = thumbOriginal
    form.thumbnail_small = thumbSmall
    form.thumbnail_medium = thumbMedium

    if (thumbPreview) {
      thumbnailMedia.value = {
        id: '',
        name: 'Thumbnail',
        thumb: thumbPreview,
        small: thumbSmall,
        medium: thumbMedium,
        original: thumbOriginal,
      }
    }

    // Images
    if (p.images_media?.length) {
      imagesMedia.value = p.images_media.map(toSelectedMedia)
      syncImagesForm()
    }
    else if (p.images && !Array.isArray(p.images) && (p.images.original?.length || p.images.small?.length || p.images.medium?.length)) {
      const small = p.images.small || []
      const medium = p.images.medium || []
      const original = p.images.original || []
      const len = Math.max(small.length, medium.length, original.length)
      imagesMedia.value = Array.from({ length: len }).map((_, i) => ({
        id: '',
        name: `Gambar ${i + 1}`,
        small: small[i] || '',
        medium: medium[i] || '',
        original: original[i] || '',
        thumb: small[i] || medium[i] || original[i] || '',
      }))
      syncImagesForm()
    }
    else if (Array.isArray(p.images) && p.images.length) {
      imagesMedia.value = p.images.map((url, i) => ({
        id: '',
        name: `Gambar ${i + 1}`,
        small: '',
        medium: '',
        original: url,
        thumb: url,
      }))
      syncImagesForm()
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

  try {
    const tags = form.tags
      ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
      : []

    await api.put(`/products/${productId}`, {
      category_id: form.category_id,
      name: form.name,
      slug: form.slug,
      description: form.description,
      short_description: form.short_description,
      thumbnail: form.thumbnail,
      thumbnail_small: form.thumbnail_small,
      thumbnail_medium: form.thumbnail_medium,
      images: form.images,
      tags,
      status: form.status,
    })

    toast.success('Produk berhasil diperbarui')
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
  loadProduct()
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
        <h1 class="text-2xl font-bold text-gray-900">Edit Produk</h1>
        <p class="mt-0.5 text-sm text-gray-500">Perbarui informasi detail produk</p>
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

    <form v-else @submit.prevent="handleSubmit">
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="space-y-6 lg:col-span-2">
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Informasi Produk</h2>

            <div class="space-y-4">
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
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Tipe</label>
                  <input
                    :value="form.type === 'master' ? 'Master' : 'Slave'"
                    type="text"
                    disabled
                    class="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500"
                  />
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

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Deskripsi Singkat</label>
                <input
                  v-model="form.short_description"
                  type="text"
                  placeholder="Deskripsi singkat produk"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Deskripsi</label>
                <AppEditor v-model="form.description" placeholder="Tulis deskripsi lengkap produk..." />
              </div>

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

        <div class="space-y-6">
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 text-base font-semibold text-gray-900">Thumbnail & Gambar</h2>

            <div class="space-y-4">
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

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Gambar Produk</label>

                <div v-if="imagesMedia.length" class="space-y-2">
                  <div
                    v-for="(img, idx) in imagesMedia"
                    :key="idx"
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
          {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
        </button>
      </div>
    </form>

    <AppMediaPicker
      v-if="showThumbPicker"
      :selected="[]"
      @select="onThumbSelect"
      @close="showThumbPicker = false"
    />
    <AppMediaPicker
      v-if="showImagesPicker"
      multiple
      :selected="[]"
      @select="onImagesSelect"
      @close="showImagesPicker = false"
    />
  </div>
</template>
