<script setup lang="ts">
import {
  Upload, Search, X, Loader2, Image as ImageIcon,
  ChevronLeft, ChevronRight, Check, Pencil, Trash2,
} from 'lucide-vue-next'

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

const props = withDefaults(defineProps<{
  multiple?: boolean
  selected?: string[]
}>(), {
  multiple: false,
  selected: () => [],
})

const emit = defineEmits<{
  (e: 'select', medias: Media[]): void
  (e: 'close'): void
}>()

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

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

// Selection
const selectedIds = ref<Set<string>>(new Set(props.selected))

// Detail/edit sidebar
const detailMedia = ref<Media | null>(null)
const editingDetail = ref(false)
const savingDetail = ref(false)
const deletingDetail = ref(false)
const editForm = reactive({
  name: '',
  description: '',
  alt: '',
})

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

      const res = await $fetch<{ data: Media }>('/api/users/medias/uploads', {
        method: 'POST',
        body: formData,
      })

      // Auto-select newly uploaded
      if (res?.data?.id) {
        if (!props.multiple) {
          selectedIds.value.clear()
        }
        selectedIds.value.add(res.data.id)
      }
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
    await fetchMedias()
  }
  if (failCount > 0) {
    toast.error(`${failCount} file gagal diupload`)
  }
}

// --- Selection ---
function toggleSelect(media: Media) {
  if (props.multiple) {
    if (selectedIds.value.has(media.id)) {
      selectedIds.value.delete(media.id)
    }
    else {
      selectedIds.value.add(media.id)
    }
  }
  else {
    if (selectedIds.value.has(media.id)) {
      selectedIds.value.clear()
    }
    else {
      selectedIds.value.clear()
      selectedIds.value.add(media.id)
    }
  }
}

function isSelected(id: string): boolean {
  return selectedIds.value.has(id)
}

function handleConfirm() {
  // Gather full media objects for selected IDs
  const allMediaMap = new Map<string, Media>()
  for (const m of medias.value) {
    allMediaMap.set(m.id, m)
  }
  const result = [...selectedIds.value]
    .map(id => allMediaMap.get(id))
    .filter((m): m is Media => !!m)
  emit('select', result)
}

// --- Detail sidebar ---
function openDetail(media: Media, event: Event) {
  event.stopPropagation()
  detailMedia.value = media
  editingDetail.value = false
}

function closeDetail() {
  detailMedia.value = null
  editingDetail.value = false
}

function startEditDetail() {
  if (!detailMedia.value) return
  editForm.name = detailMedia.value.name
  editForm.description = detailMedia.value.description
  editForm.alt = detailMedia.value.alt
  editingDetail.value = true
}

async function saveDetail() {
  if (!detailMedia.value) return
  savingDetail.value = true
  try {
    const res = await api.put<{ data: Media }>(`/users/medias/${detailMedia.value.id}`, {
      name: editForm.name,
      description: editForm.description,
      alt: editForm.alt,
    })
    const idx = medias.value.findIndex(m => m.id === detailMedia.value!.id)
    if (idx !== -1) medias.value[idx] = res.data
    detailMedia.value = res.data
    editingDetail.value = false
    toast.success('Media berhasil diperbarui')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memperbarui media')
  }
  finally {
    savingDetail.value = false
  }
}

async function deleteDetail() {
  if (!detailMedia.value) return
  const ok = await confirm({
    title: 'Hapus Media',
    message: `Yakin ingin menghapus "${detailMedia.value.name}"? File akan dihapus permanen.`,
    confirmText: 'Hapus',
    cancelText: 'Batal',
  })
  if (!ok) return

  deletingDetail.value = true
  try {
    await api.delete(`/users/medias/${detailMedia.value.id}`)
    selectedIds.value.delete(detailMedia.value.id)
    toast.success('Media berhasil dihapus')
    closeDetail()
    fetchMedias()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus media')
  }
  finally {
    deletingDetail.value = false
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
  })
}

function isImage(media: Media): boolean {
  return media.type?.startsWith('image/')
}

onMounted(() => fetchMedias())
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="$emit('close')">
      <div class="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">
              {{ multiple ? 'Pilih Gambar' : 'Pilih Gambar' }}
            </h2>
            <p class="mt-0.5 text-xs text-gray-500">
              {{ multiple ? 'Pilih satu atau lebih gambar' : 'Pilih satu gambar' }}
              <span v-if="selectedIds.size" class="ml-1 font-medium text-primary-600">({{ selectedIds.size }} dipilih)</span>
            </p>
          </div>
          <button class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="$emit('close')">
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Toolbar -->
        <div class="flex items-center gap-3 border-b border-gray-100 px-6 py-3">
          <button
            class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            :disabled="uploading"
            @click="triggerUpload"
          >
            <Loader2 v-if="uploading" class="h-4 w-4 animate-spin" />
            <Upload v-else class="h-4 w-4" />
            {{ uploading ? 'Mengupload...' : 'Upload' }}
          </button>
          <input
            ref="fileInput"
            type="file"
            multiple
            accept="image/*"
            class="hidden"
            @change="handleUpload"
          />
          <div class="relative flex-1">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari media..."
              class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              @input="onSearch"
            />
          </div>
          <span class="shrink-0 text-xs text-gray-400">{{ total }} file</span>
        </div>

        <!-- Body -->
        <div class="flex flex-1 overflow-hidden">
          <!-- Grid area -->
          <div class="flex-1 overflow-y-auto p-4" :class="{ 'pr-0': detailMedia }">
            <!-- Loading -->
            <div v-if="loading" class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              <div v-for="i in 18" :key="i" class="animate-pulse">
                <div class="aspect-square rounded-lg bg-gray-200" />
              </div>
            </div>

            <!-- Empty -->
            <div v-else-if="!medias.length" class="flex flex-col items-center justify-center py-16">
              <ImageIcon class="h-12 w-12 text-gray-300" />
              <p class="mt-3 text-sm text-gray-500">Belum ada media.</p>
              <button
                class="mt-3 flex items-center gap-2 rounded-lg bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100"
                @click="triggerUpload"
              >
                <Upload class="h-4 w-4" />
                Upload File
              </button>
            </div>

            <!-- Grid -->
            <div v-else>
              <div class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5" :class="detailMedia ? '' : 'lg:grid-cols-6'">
                <div
                  v-for="media in medias"
                  :key="media.id"
                  class="group relative cursor-pointer overflow-hidden rounded-lg ring-2 transition-all"
                  :class="isSelected(media.id) ? 'ring-primary-500 shadow-md' : 'ring-transparent hover:ring-gray-300'"
                  @click="toggleSelect(media)"
                >
                  <!-- Thumbnail -->
                  <div class="relative aspect-square bg-gray-100">
                    <img
                      v-if="isImage(media) && getThumb(media)"
                      :src="getThumb(media)"
                      :alt="media.alt || media.name"
                      class="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div v-else class="flex h-full items-center justify-center">
                      <ImageIcon class="h-8 w-8 text-gray-300" />
                    </div>

                    <!-- Selected check -->
                    <div
                      v-if="isSelected(media.id)"
                      class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-white shadow"
                    >
                      <Check class="h-3.5 w-3.5" />
                    </div>

                    <!-- Edit button -->
                    <button
                      class="absolute bottom-1.5 right-1.5 rounded-full bg-white/80 p-1.5 text-gray-600 opacity-0 shadow transition-opacity hover:bg-white group-hover:opacity-100"
                      title="Detail"
                      @click="openDetail(media, $event)"
                    >
                      <Pencil class="h-3 w-3" />
                    </button>
                  </div>

                  <!-- Name -->
                  <div class="bg-white px-2 py-1.5">
                    <p class="truncate text-xs text-gray-700">{{ media.name }}</p>
                  </div>
                </div>
              </div>

              <!-- Pagination -->
              <div v-if="totalPage > 1" class="mt-4 flex items-center justify-center gap-1">
                <button
                  :disabled="page <= 1"
                  class="rounded p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-40"
                  @click="goPage(page - 1)"
                >
                  <ChevronLeft class="h-4 w-4" />
                </button>
                <button
                  v-for="p in visiblePages"
                  :key="p"
                  class="min-w-[32px] rounded px-2.5 py-1 text-xs font-medium transition-colors"
                  :class="p === page ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
                  @click="goPage(p)"
                >
                  {{ p }}
                </button>
                <button
                  :disabled="page >= totalPage"
                  class="rounded p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-40"
                  @click="goPage(page + 1)"
                >
                  <ChevronRight class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Detail sidebar -->
          <Transition name="slide">
            <div v-if="detailMedia" class="w-72 shrink-0 overflow-y-auto border-l border-gray-200 bg-gray-50 p-4">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-gray-900">Detail</h3>
                <button class="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600" @click="closeDetail">
                  <X class="h-4 w-4" />
                </button>
              </div>

              <!-- Preview -->
              <div class="mt-3 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
                <img
                  v-if="isImage(detailMedia)"
                  :src="getOriginal(detailMedia)"
                  :alt="detailMedia.alt"
                  class="w-full object-contain"
                  style="max-height: 200px"
                />
                <div v-else class="flex h-32 items-center justify-center">
                  <ImageIcon class="h-10 w-10 text-gray-300" />
                </div>
              </div>

              <!-- View mode -->
              <div v-if="!editingDetail" class="mt-4 space-y-3">
                <div>
                  <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400">Nama</p>
                  <p class="mt-0.5 break-all text-xs text-gray-800">{{ detailMedia.name }}</p>
                </div>
                <div>
                  <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400">Deskripsi</p>
                  <p class="mt-0.5 text-xs text-gray-800">{{ detailMedia.description || '-' }}</p>
                </div>
                <div>
                  <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400">Alt Text</p>
                  <p class="mt-0.5 text-xs text-gray-800">{{ detailMedia.alt || '-' }}</p>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400">Tipe</p>
                    <p class="mt-0.5 text-xs text-gray-800">{{ detailMedia.type }}</p>
                  </div>
                  <div>
                    <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400">Tanggal</p>
                    <p class="mt-0.5 text-xs text-gray-800">{{ formatDate(detailMedia.created_at) }}</p>
                  </div>
                </div>

                <!-- File variants -->
                <div v-if="detailMedia.files?.length">
                  <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400">Variants</p>
                  <div class="mt-1.5 space-y-1">
                    <div v-for="f in detailMedia.files" :key="f.id" class="rounded bg-white px-2 py-1.5 text-xs ring-1 ring-gray-200">
                      <span class="font-medium text-gray-700">{{ f.size }}</span>
                      <span class="ml-1 text-gray-400">{{ f.width }}×{{ f.height }}</span>
                      <span class="ml-1 text-gray-400">{{ f.file_size || '-' }}</span>
                    </div>
                  </div>
                </div>

                <div class="flex gap-2 pt-2">
                  <button
                    class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    @click="startEditDetail"
                  >
                    <Pencil class="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    class="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    :disabled="deletingDetail"
                    @click="deleteDetail"
                  >
                    <Loader2 v-if="deletingDetail" class="h-3 w-3 animate-spin" />
                    <Trash2 v-else class="h-3 w-3" />
                  </button>
                </div>
              </div>

              <!-- Edit mode -->
              <div v-else class="mt-4 space-y-3">
                <div>
                  <label class="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-400">Nama</label>
                  <input v-model="editForm.name" type="text" class="detail-input" />
                </div>
                <div>
                  <label class="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-400">Deskripsi</label>
                  <textarea v-model="editForm.description" rows="2" class="detail-input" />
                </div>
                <div>
                  <label class="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-400">Alt Text</label>
                  <input v-model="editForm.alt" type="text" class="detail-input" />
                </div>
                <div class="flex gap-2 pt-1">
                  <button
                    class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    @click="editingDetail = false"
                  >
                    Batal
                  </button>
                  <button
                    class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                    :disabled="savingDetail"
                    @click="saveDetail"
                  >
                    <Loader2 v-if="savingDetail" class="h-3 w-3 animate-spin" />
                    {{ savingDetail ? 'Simpan...' : 'Simpan' }}
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between border-t border-gray-200 px-6 py-3">
          <p class="text-xs text-gray-500">
            <template v-if="selectedIds.size">
              {{ selectedIds.size }} media dipilih
            </template>
            <template v-else>
              Klik gambar untuk memilih
            </template>
          </p>
          <div class="flex items-center gap-3">
            <button
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="$emit('close')"
            >
              Batal
            </button>
            <button
              :disabled="!selectedIds.size"
              class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleConfirm"
            >
              Pilih Media
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.detail-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
