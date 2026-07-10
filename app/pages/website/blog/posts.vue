<script setup lang="ts">
import { Plus, Search, Pencil, Trash2, Newspaper, Store, Send, Image as ImageIcon, X } from 'lucide-vue-next'

definePageMeta({ layout: 'website', middleware: 'auth' })

interface BlogCategory {
  id: string
  name: string
}

interface BlogPost {
  id: string
  store_id: string
  category_id: string | null
  title: string
  slug: string
  excerpt: string
  content: string
  thumbnail: string
  status: string
  published_at: string | null
  created_at: string
  updated_at: string
  category?: BlogCategory | null
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const { selectedStoreId, fetchStores } = useWebsiteStore()

const posts = ref<BlogPost[]>([])
const categories = ref<BlogCategory[]>([])
const loading = ref(false)
const search = ref('')
const categoryFilter = ref('')
const statusFilter = ref('')
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

async function fetchCategories() {
  if (!selectedStoreId.value) return
  try {
    const res = await api.get<{ data: { data: BlogCategory[] } }>('/website/blog/categories', { store_id: selectedStoreId.value })
    categories.value = res.data?.data || []
  }
  catch {
    categories.value = []
  }
}

async function fetchPosts() {
  if (!selectedStoreId.value) return
  loading.value = true
  try {
    const params: Record<string, string> = {
      store_id: selectedStoreId.value,
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    if (categoryFilter.value) params.category_id = categoryFilter.value
    if (statusFilter.value) params.status = statusFilter.value
    const res = await api.get<{ data: { data: BlogPost[], total_page: number, total: number } }>('/website/blog/posts', params)
    posts.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch {
    posts.value = []
  }
  finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchPosts()
  }, 300)
}

function slugify(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ─── Modal ───────────────────────────────────────────────────────────
const showModal = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const slugTouched = ref(false)
const showThumbPicker = ref(false)
const form = reactive({
  category_id: '',
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  thumbnail: '',
  status: 'draft',
})

watch(() => form.title, (val) => {
  if (!slugTouched.value && !editingId.value) form.slug = slugify(val)
})

function openCreate() {
  editingId.value = null
  slugTouched.value = false
  form.category_id = ''
  form.title = ''
  form.slug = ''
  form.excerpt = ''
  form.content = ''
  form.thumbnail = ''
  form.status = 'draft'
  showModal.value = true
}

function openEdit(p: BlogPost) {
  editingId.value = p.id
  slugTouched.value = true
  form.category_id = p.category_id || ''
  form.title = p.title
  form.slug = p.slug
  form.excerpt = p.excerpt || ''
  form.content = p.content || ''
  form.thumbnail = p.thumbnail || ''
  form.status = p.status
  showModal.value = true
}

function onThumbSelect(medias: any[]) {
  if (medias.length) {
    const m = medias[0]
    form.thumbnail = m.files?.find((f: any) => f.size === 'original')?.file_url || m.files?.[0]?.file_url || ''
  }
  showThumbPicker.value = false
}

async function handleSave() {
  if (!form.title.trim()) {
    toast.error('Judul wajib diisi')
    return
  }
  saving.value = true
  try {
    const payload = {
      store_id: selectedStoreId.value,
      category_id: form.category_id || null,
      title: form.title.trim(),
      slug: form.slug.trim() || slugify(form.title),
      excerpt: form.excerpt.trim(),
      content: form.content,
      thumbnail: form.thumbnail,
      status: form.status,
    }
    if (editingId.value) {
      await api.put(`/website/blog/posts/${editingId.value}`, payload)
      toast.success('Artikel berhasil diperbarui')
    }
    else {
      await api.post('/website/blog/posts', payload)
      toast.success('Artikel berhasil ditambahkan')
    }
    showModal.value = false
    fetchPosts()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan artikel')
  }
  finally {
    saving.value = false
  }
}

const publishingId = ref<string | null>(null)
async function publish(p: BlogPost) {
  publishingId.value = p.id
  try {
    await api.put(`/website/blog/posts/${p.id}/publish`, {})
    p.status = 'published'
    toast.success('Artikel berhasil dipublikasikan')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mempublikasikan artikel')
  }
  finally {
    publishingId.value = null
  }
}

async function handleDelete(p: BlogPost) {
  const ok = await confirm({
    title: 'Hapus Artikel',
    message: `Yakin ingin menghapus artikel "${p.title}"?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/website/blog/posts/${p.id}`)
    toast.success('Artikel berhasil dihapus')
    fetchPosts()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus artikel')
  }
}

onMounted(async () => {
  await fetchStores()
  await fetchCategories()
  await fetchPosts()
})

watch(selectedStoreId, () => {
  page.value = 1
  fetchCategories()
  fetchPosts()
})
watch([page, perPage, categoryFilter, statusFilter], () => fetchPosts())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Artikel Blog</h1>
        <p class="mt-1 text-sm text-gray-500">Tulis dan kelola artikel blog website.</p>
      </div>
      <button
        v-if="selectedStoreId"
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" /> Tulis Artikel
      </button>
    </div>

    <div v-if="!selectedStoreId" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <Store class="mx-auto h-12 w-12 text-gray-300" />
      <h3 class="mt-3 text-sm font-semibold text-gray-900">Belum ada store web dipilih</h3>
      <p class="mt-1 text-sm text-gray-500">Pilih store web pada menu di sebelah kiri.</p>
    </div>

    <div v-else class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <div class="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center">
        <div class="relative w-full sm:w-64">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="search"
            type="text"
            placeholder="Cari artikel..."
            class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            @input="onSearch"
          />
        </div>
        <select v-model="categoryFilter" class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
          <option value="">Semua kategori</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model="statusFilter" class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
          <option value="">Semua status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div v-if="loading" class="space-y-2 p-4">
        <div v-for="i in 4" :key="i" class="h-16 animate-pulse rounded-lg bg-gray-100" />
      </div>

      <div v-else-if="!posts.length" class="p-12 text-center">
        <Newspaper class="mx-auto h-12 w-12 text-gray-300" />
        <h3 class="mt-3 text-sm font-semibold text-gray-900">Belum ada artikel</h3>
        <p class="mt-1 text-sm text-gray-500">Mulai tulis artikel blog pertama.</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
            <th class="px-4 py-3">Artikel</th>
            <th class="px-4 py-3">Kategori</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in posts" :key="p.id" class="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
                  <img v-if="p.thumbnail" :src="p.thumbnail" :alt="p.title" class="h-full w-full object-cover" />
                  <div v-else class="flex h-full w-full items-center justify-center text-gray-300">
                    <Newspaper class="h-4 w-4" />
                  </div>
                </div>
                <div class="min-w-0">
                  <p class="truncate font-medium text-gray-900">{{ p.title }}</p>
                  <p class="truncate text-xs text-gray-400">{{ p.excerpt }}</p>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 text-gray-500">{{ p.category?.name || '—' }}</td>
            <td class="px-4 py-3">
              <span
                class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1"
                :class="p.status === 'published' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-amber-50 text-amber-700 ring-amber-200'"
              >
                {{ p.status === 'published' ? 'Published' : 'Draft' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1">
                <button
                  v-if="p.status !== 'published'"
                  type="button"
                  :disabled="publishingId === p.id"
                  class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-green-50 hover:text-green-600 disabled:opacity-50"
                  title="Publikasikan"
                  @click="publish(p)"
                >
                  <Send class="h-4 w-4" />
                </button>
                <button type="button" class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700" title="Ubah" @click="openEdit(p)">
                  <Pencil class="h-4 w-4" />
                </button>
                <button type="button" class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus" @click="handleDelete(p)">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <AppPagination
        :page="page"
        :total-page="totalPage"
        :total="total"
        :per-page="perPage"
        :loading="loading"
        @update:page="page = $event"
        @update:per-page="perPage = $event"
      />
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="showModal = false" />
        <div class="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 class="text-base font-semibold text-gray-900">{{ editingId ? 'Ubah Artikel' : 'Tulis Artikel' }}</h3>
            <button type="button" class="rounded-lg p-1 text-gray-400 hover:bg-gray-100" @click="showModal = false">
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Judul</label>
                <input v-model="form.title" type="text" class="input" />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Slug</label>
                <input v-model="form.slug" type="text" class="input" @input="slugTouched = true" />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Kategori</label>
                <select v-model="form.category_id" class="input">
                  <option value="">— Tanpa kategori —</option>
                  <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
                <select v-model="form.status" class="input">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Thumbnail</label>
              <div class="flex items-center gap-3">
                <div v-if="form.thumbnail" class="group relative h-20 w-28 overflow-hidden rounded-lg border border-gray-200">
                  <img :src="form.thumbnail" alt="Thumbnail" class="h-full w-full object-cover" />
                  <button type="button" class="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white shadow" @click="form.thumbnail = ''">
                    <X class="h-3 w-3" />
                  </button>
                </div>
                <button
                  v-else
                  type="button"
                  class="flex h-20 w-28 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:border-primary-400 hover:text-primary-500"
                  @click="showThumbPicker = true"
                >
                  <ImageIcon class="h-6 w-6" />
                  <span class="text-[10px] font-medium">Pilih</span>
                </button>
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Ringkasan</label>
              <textarea v-model="form.excerpt" rows="2" class="input" />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Konten</label>
              <AppEditor v-model="form.content" placeholder="Tulis isi artikel..." />
            </div>
          </div>
          <div class="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
            <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="showModal = false">Batal</button>
            <button type="button" :disabled="saving" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50" @click="handleSave">
              {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <AppMediaPicker v-if="showThumbPicker" @select="onThumbSelect" @close="showThumbPicker = false" />
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
