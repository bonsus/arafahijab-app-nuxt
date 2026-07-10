<script setup lang="ts">
import { Plus, Search, Pencil, Trash2, FileText, Store, Send, X } from 'lucide-vue-next'

definePageMeta({ layout: 'website', middleware: 'auth' })

interface WebPage {
  id: string
  store_id: string
  type: string
  title: string
  slug: string
  content: any
  status: string
  sort: number
  created_at: string
  updated_at: string
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const { selectedStoreId, fetchStores } = useWebsiteStore()

const pages = ref<WebPage[]>([])
const loading = ref(false)
const search = ref('')
const typeFilter = ref('')
const statusFilter = ref('')
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

async function fetchPages() {
  if (!selectedStoreId.value) return
  loading.value = true
  try {
    const params: Record<string, string> = {
      store_id: selectedStoreId.value,
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    if (typeFilter.value) params.type = typeFilter.value
    if (statusFilter.value) params.status = statusFilter.value
    const res = await api.get<{ data: { data: WebPage[], total_page: number, total: number } }>('/website/pages', params)
    pages.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch {
    pages.value = []
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
    fetchPages()
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
const form = reactive({
  type: 'custom',
  title: '',
  slug: '',
  html: '',
  status: 'draft',
  sort: 0,
})

watch(() => form.title, (val) => {
  if (!slugTouched.value && !editingId.value) form.slug = slugify(val)
})

function openCreate() {
  editingId.value = null
  slugTouched.value = false
  form.type = 'custom'
  form.title = ''
  form.slug = ''
  form.html = ''
  form.status = 'draft'
  form.sort = 0
  showModal.value = true
}

function extractHtml(content: any): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  const block = content.blocks?.find((b: any) => b.type === 'richtext')
  return block?.html || ''
}

function openEdit(p: WebPage) {
  editingId.value = p.id
  slugTouched.value = true
  form.type = p.type
  form.title = p.title
  form.slug = p.slug
  form.html = extractHtml(p.content)
  form.status = p.status
  form.sort = p.sort
  showModal.value = true
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
      type: form.type,
      title: form.title.trim(),
      slug: form.slug.trim() || slugify(form.title),
      content: { blocks: [{ type: 'richtext', html: form.html }] },
      status: form.status,
      sort: Number(form.sort) || 0,
    }
    if (editingId.value) {
      await api.put(`/website/pages/${editingId.value}`, payload)
      toast.success('Halaman berhasil diperbarui')
    }
    else {
      await api.post('/website/pages', payload)
      toast.success('Halaman berhasil ditambahkan')
    }
    showModal.value = false
    fetchPages()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan halaman')
  }
  finally {
    saving.value = false
  }
}

const publishingId = ref<string | null>(null)
async function publish(p: WebPage) {
  publishingId.value = p.id
  try {
    await api.put(`/website/pages/${p.id}/publish`, {})
    p.status = 'published'
    toast.success('Halaman berhasil dipublikasikan')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mempublikasikan halaman')
  }
  finally {
    publishingId.value = null
  }
}

async function handleDelete(p: WebPage) {
  const ok = await confirm({
    title: 'Hapus Halaman',
    message: `Yakin ingin menghapus halaman "${p.title}"?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/website/pages/${p.id}`)
    toast.success('Halaman berhasil dihapus')
    fetchPages()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus halaman')
  }
}

onMounted(async () => {
  await fetchStores()
  await fetchPages()
})

watch(selectedStoreId, () => {
  page.value = 1
  fetchPages()
})
watch([page, perPage, typeFilter, statusFilter], () => fetchPages())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Halaman</h1>
        <p class="mt-1 text-sm text-gray-500">Kelola halaman beranda dan halaman kustom.</p>
      </div>
      <button
        v-if="selectedStoreId"
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" /> Tambah Halaman
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
            placeholder="Cari halaman..."
            class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            @input="onSearch"
          />
        </div>
        <select v-model="typeFilter" class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
          <option value="">Semua tipe</option>
          <option value="home">Home</option>
          <option value="custom">Custom</option>
        </select>
        <select v-model="statusFilter" class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
          <option value="">Semua status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div v-if="loading" class="space-y-2 p-4">
        <div v-for="i in 4" :key="i" class="h-14 animate-pulse rounded-lg bg-gray-100" />
      </div>

      <div v-else-if="!pages.length" class="p-12 text-center">
        <FileText class="mx-auto h-12 w-12 text-gray-300" />
        <h3 class="mt-3 text-sm font-semibold text-gray-900">Belum ada halaman</h3>
        <p class="mt-1 text-sm text-gray-500">Tambahkan halaman untuk website.</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
            <th class="px-4 py-3">Judul</th>
            <th class="px-4 py-3">Slug</th>
            <th class="px-4 py-3">Tipe</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in pages" :key="p.id" class="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
            <td class="px-4 py-3 font-medium text-gray-900">{{ p.title }}</td>
            <td class="px-4 py-3 font-mono text-xs text-gray-500">/{{ p.slug }}</td>
            <td class="px-4 py-3">
              <span class="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-600">{{ p.type }}</span>
            </td>
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
            <h3 class="text-base font-semibold text-gray-900">{{ editingId ? 'Ubah Halaman' : 'Tambah Halaman' }}</h3>
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
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Tipe</label>
                <select v-model="form.type" class="input">
                  <option value="home">Home</option>
                  <option value="custom">Custom</option>
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
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Konten</label>
              <AppEditor v-model="form.html" placeholder="Tulis konten halaman..." />
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
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
