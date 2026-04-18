<script setup lang="ts">
import {
  Upload, Search, Trash2, Pencil, X, Loader2, Image as ImageIcon,
  ChevronLeft, ChevronRight, Eye, Copy, Check,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

// --- Types ---
interface MediaFile {
  id: string
  media_id: string
  file: string
  file_url: string
  size: string
  file_size: string
  width: number
  height: number
}

interface Media {
  id: string
  name: string
  description: string
  alt: string
  type: string
  status: string
  storage: string
  created_at: string
  updated_at: string
  files: MediaFile[]
}

// --- State ---
const loading = ref(true)
const medias = ref<Media[]>([])
const page = ref(1)
const perPage = ref(24)
const totalPage = ref(1)
const total = ref(0)
const search = ref('')
const searchTimeout = ref<ReturnType<typeof setTimeout>>()

const uploading = ref(false)
const fileInput = ref<HTMLInputElement>()

// Detail / Edit modal
const selectedMedia = ref<Media | null>(null)
const showDetail = ref(false)
const editing = ref(false)
const savingEdit = ref(false)
const editForm = reactive({
  name: '',
  description: '',
  alt: '',
  status: 'public',
})

const copiedUrl = ref<string | null>(null)
const deleting = ref(false)

// --- Fetch ---
async function fetchMedias() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: page.value,
      per_page: perPage.value,
    }
    if (search.value) params.search = search.value

    const res = await api.get<{ data: { data: Media[]; page: number; per_page: number; total_page: number; total: number } }>('/users/medias/index', params)
    const d = res.data
    medias.value = d?.data || []
    page.value = d?.page || 1
    totalPage.value = d?.total_page || 1
    total.value = d?.total || 0
  }
  catch {
    medias.value = []
  }
  finally {
    loading.value = false
  }
}

function onSearch() {
  clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(() => {
    page.value = 1
    fetchMedias()
  }, 300)
}

function goPage(p: number) {
  if (p < 1 || p > totalPage.value) return
  page.value = p
  fetchMedias()
}

const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, page.value - 2)
  const end = Math.min(totalPage.value, page.value + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

// --- Upload ---
function triggerUpload() {
  fileInput.value?.click()
}

async function handleUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return

  uploading.value = true
  let successCount = 0
  let failCount = 0

  for (const file of Array.from(files)) {
    try {
      const formData = new FormData()
      formData.append('file', file)

      await $fetch('/api/users/medias/uploads', {
        method: 'POST',
        body: formData,
      })
      successCount++
    }
    catch {
      failCount++
    }
  }

  uploading.value = false
  input.value = ''

  if (successCount > 0) {
    toast.success(`${successCount} file berhasil diupload`)
    page.value = 1
    fetchMedias()
  }
  if (failCount > 0) {
    toast.error(`${failCount} file gagal diupload`)
  }
}

// --- Detail ---
function openDetail(media: Media) {
  selectedMedia.value = media
  editing.value = false
  copiedUrl.value = null
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
  selectedMedia.value = null
  editing.value = false
}

function startEdit() {
  if (!selectedMedia.value) return
  editForm.name = selectedMedia.value.name
  editForm.description = selectedMedia.value.description
  editForm.alt = selectedMedia.value.alt
  editForm.status = selectedMedia.value.status
  editing.value = true
}

async function saveEdit() {
  if (!selectedMedia.value) return
  savingEdit.value = true
  try {
    const res = await api.put<{ data: Media }>(`/users/medias/${selectedMedia.value.id}`, {
      name: editForm.name,
      description: editForm.description,
      alt: editForm.alt,
      status: editForm.status,
    })
    // Update in list
    const idx = medias.value.findIndex(m => m.id === selectedMedia.value!.id)
    if (idx !== -1) medias.value[idx] = res.data
    selectedMedia.value = res.data
    editing.value = false
    toast.success('Media berhasil diperbarui')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memperbarui media')
  }
  finally {
    savingEdit.value = false
  }
}

// --- Delete ---
async function handleDelete(media: Media) {
  const ok = await confirm({
    title: 'Hapus Media',
    message: `Yakin ingin menghapus "${media.name}"? File akan dihapus permanen.`,
    confirmText: 'Hapus',
    cancelText: 'Batal',
  })
  if (!ok) return

  deleting.value = true
  try {
    await api.delete(`/users/medias/${media.id}`)
    toast.success('Media berhasil dihapus')
    if (selectedMedia.value?.id === media.id) closeDetail()
    fetchMedias()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus media')
  }
  finally {
    deleting.value = false
  }
}

// --- Helpers ---
function getThumb(media: Media): string {
  const thumb = media.files?.find(f => f.size === 'thumbnail')
  return thumb?.file_url || media.files?.[0]?.file_url || ''
}

function getOriginal(media: Media): string {
  const orig = media.files?.find(f => f.size === 'original')
  return orig?.file_url || media.files?.[0]?.file_url || ''
}

function formatDate(d: string): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function copyUrl(fileId: string, url: string) {
  navigator.clipboard.writeText(url)
  copiedUrl.value = fileId
  setTimeout(() => { copiedUrl.value = null }, 2000)
}

function isImage(media: Media): boolean {
  return media.type?.startsWith('image/')
}

onMounted(() => fetchMedias())
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Media</h1>
        <p class="mt-0.5 text-sm text-gray-500">Kelola file media untuk produk, logo, dan lainnya</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          :disabled="uploading"
          @click="triggerUpload"
        >
          <Loader2 v-if="uploading" class="h-4 w-4 animate-spin" />
          <Upload v-else class="h-4 w-4" />
          {{ uploading ? 'Mengupload...' : 'Upload File' }}
        </button>
        <input
          ref="fileInput"
          type="file"
          multiple
          accept="image/*"
          class="hidden"
          @change="handleUpload"
        />
      </div>
    </div>

    <!-- Filters -->
    <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full sm:max-w-xs">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="search"
            type="text"
            placeholder="Cari nama, deskripsi, alt..."
            class="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            @input="onSearch"
          />
        </div>
        <p class="text-sm text-gray-500">
          Total: <span class="font-medium text-gray-700">{{ total }}</span> file
        </p>
      </div>
    </div>

    <!-- Grid -->
    <div v-if="loading" class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      <div v-for="i in 12" :key="i" class="animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div class="aspect-square rounded-t-xl bg-gray-200" />
        <div class="p-3">
          <div class="h-4 w-3/4 rounded bg-gray-200" />
          <div class="mt-1.5 h-3 w-1/2 rounded bg-gray-200" />
        </div>
      </div>
    </div>

    <div v-else-if="!medias.length" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <ImageIcon class="mx-auto h-12 w-12 text-gray-300" />
      <p class="mt-3 text-sm text-gray-500">Belum ada media.</p>
      <button
        class="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100"
        @click="triggerUpload"
      >
        <Upload class="h-4 w-4" />
        Upload File Pertama
      </button>
    </div>

    <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      <div
        v-for="media in medias"
        :key="media.id"
        class="group relative cursor-pointer rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md hover:ring-gray-300"
        @click="openDetail(media)"
      >
        <!-- Thumbnail -->
        <div class="relative aspect-square overflow-hidden rounded-t-xl bg-gray-100">
          <img
            v-if="isImage(media) && getThumb(media)"
            :src="getThumb(media)"
            :alt="media.alt || media.name"
            class="h-full w-full object-cover"
            loading="lazy"
          />
          <div v-else class="flex h-full items-center justify-center">
            <ImageIcon class="h-10 w-10 text-gray-300" />
          </div>

          <!-- Hover overlay -->
          <div class="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              class="rounded-full bg-white/90 p-2 text-gray-700 hover:bg-white"
              title="Lihat"
              @click.stop="openDetail(media)"
            >
              <Eye class="h-4 w-4" />
            </button>
            <button
              class="rounded-full bg-white/90 p-2 text-red-600 hover:bg-white"
              title="Hapus"
              @click.stop="handleDelete(media)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Info -->
        <div class="p-3">
          <p class="truncate text-sm font-medium text-gray-900">{{ media.name }}</p>
          <p class="mt-0.5 text-xs text-gray-400">{{ formatDate(media.created_at) }}</p>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPage > 1" class="flex items-center justify-between rounded-xl bg-white px-5 py-3 shadow-sm ring-1 ring-gray-200">
      <p class="text-sm text-gray-500">
        Halaman <span class="font-medium text-gray-700">{{ page }}</span> dari <span class="font-medium text-gray-700">{{ totalPage }}</span>
      </p>
      <div class="flex items-center gap-1">
        <button
          :disabled="page <= 1"
          class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-40"
          @click="goPage(page - 1)"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <button
          v-for="p in visiblePages"
          :key="p"
          class="min-w-[36px] rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="p === page ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
          @click="goPage(p)"
        >
          {{ p }}
        </button>
        <button
          :disabled="page >= totalPage"
          class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-40"
          @click="goPage(page + 1)"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Detail / Edit Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showDetail && selectedMedia" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="closeDetail">
          <div class="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <!-- Close -->
            <button class="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700" @click="closeDetail">
              <X class="h-5 w-5" />
            </button>

            <div class="flex flex-col lg:flex-row">
              <!-- Preview -->
              <div class="flex items-center justify-center bg-gray-100 p-6 lg:w-1/2 lg:rounded-l-2xl">
                <img
                  v-if="isImage(selectedMedia)"
                  :src="getOriginal(selectedMedia)"
                  :alt="selectedMedia.alt"
                  class="max-h-80 max-w-full rounded object-contain"
                />
                <div v-else class="text-center">
                  <ImageIcon class="mx-auto h-16 w-16 text-gray-300" />
                  <p class="mt-2 text-sm text-gray-400">{{ selectedMedia.type }}</p>
                </div>
              </div>

              <!-- Info -->
              <div class="flex-1 p-6">
                <div class="flex items-start justify-between gap-3">
                  <h3 class="text-lg font-semibold text-gray-900">Detail Media</h3>
                  <div v-if="!editing" class="flex gap-2">
                    <button
                      class="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                      title="Edit"
                      @click="startEdit"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                    <button
                      class="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                      title="Hapus"
                      :disabled="deleting"
                      @click="handleDelete(selectedMedia)"
                    >
                      <Loader2 v-if="deleting" class="h-4 w-4 animate-spin" />
                      <Trash2 v-else class="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <!-- View mode -->
                <div v-if="!editing" class="mt-5 space-y-4">
                  <div>
                    <p class="text-xs font-medium text-gray-400">Nama</p>
                    <p class="mt-0.5 text-sm text-gray-900">{{ selectedMedia.name }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-gray-400">Deskripsi</p>
                    <p class="mt-0.5 text-sm text-gray-900">{{ selectedMedia.description || '-' }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-gray-400">Alt Text</p>
                    <p class="mt-0.5 text-sm text-gray-900">{{ selectedMedia.alt || '-' }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-gray-400">Tipe</p>
                    <p class="mt-0.5 text-sm text-gray-900">{{ selectedMedia.type }}</p>
                  </div>

                  <!-- Files -->
                  <div v-if="selectedMedia.files?.length">
                    <p class="text-xs font-medium text-gray-400">File Variants</p>
                    <div class="mt-2 space-y-2">
                      <div v-for="f in selectedMedia.files" :key="f.id" class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <div>
                          <span class="text-xs font-medium text-gray-700">{{ f.size }}</span>
                          <span class="ml-2 text-xs text-gray-400">{{ f.width }}×{{ f.height }}</span>
                          <span class="ml-2 text-xs text-gray-400">{{ f.file_size || '-' }}</span>
                        </div>
                        <button
                          class="flex items-center gap-1 rounded px-2 py-1 text-xs text-primary-600 hover:bg-primary-50"
                          @click="copyUrl(f.id, f.file_url)"
                        >
                          <Check v-if="copiedUrl === f.id" class="h-3 w-3" />
                          <Copy v-else class="h-3 w-3" />
                          {{ copiedUrl === f.id ? 'Disalin' : 'Salin URL' }}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p class="text-xs font-medium text-gray-400">Diupload</p>
                    <p class="mt-0.5 text-sm text-gray-900">{{ formatDate(selectedMedia.created_at) }}</p>
                  </div>
                </div>

                <!-- Edit mode -->
                <div v-else class="mt-5 space-y-4">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-gray-500">Nama</label>
                    <input v-model="editForm.name" type="text" class="form-input" />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-gray-500">Deskripsi</label>
                    <textarea v-model="editForm.description" rows="2" class="form-input" />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-gray-500">Alt Text</label>
                    <input v-model="editForm.alt" type="text" class="form-input" />
                  </div>
                  <div class="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      @click="editing = false"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      :disabled="savingEdit"
                      class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                      @click="saveEdit"
                    >
                      <Loader2 v-if="savingEdit" class="h-4 w-4 animate-spin" />
                      {{ savingEdit ? 'Menyimpan...' : 'Simpan' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.form-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
