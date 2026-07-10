<script setup lang="ts">
import { Plus, Pencil, Trash2, Folder, Store, X } from 'lucide-vue-next'

definePageMeta({ layout: 'website', middleware: 'auth' })

interface BlogCategory {
  id: string
  store_id: string
  name: string
  slug: string
  sort: number
  created_at: string
  updated_at: string
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const { selectedStoreId, fetchStores } = useWebsiteStore()

const categories = ref<BlogCategory[]>([])
const loading = ref(false)

async function fetchCategories() {
  if (!selectedStoreId.value) return
  loading.value = true
  try {
    const res = await api.get<{ data: { data: BlogCategory[] } }>('/website/blog/categories', { store_id: selectedStoreId.value })
    categories.value = res.data?.data || []
  }
  catch {
    categories.value = []
  }
  finally {
    loading.value = false
  }
}

function slugify(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ─── Modal ───────────────────────────────────────────────────────────
const showModal = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const slugTouched = ref(false)
const form = reactive({ name: '', slug: '', sort: 0 })

watch(() => form.name, (val) => {
  if (!slugTouched.value && !editingId.value) form.slug = slugify(val)
})

function openCreate() {
  editingId.value = null
  slugTouched.value = false
  form.name = ''
  form.slug = ''
  form.sort = 0
  showModal.value = true
}

function openEdit(c: BlogCategory) {
  editingId.value = c.id
  slugTouched.value = true
  form.name = c.name
  form.slug = c.slug
  form.sort = c.sort
  showModal.value = true
}

async function handleSave() {
  if (!form.name.trim()) {
    toast.error('Nama kategori wajib diisi')
    return
  }
  saving.value = true
  try {
    const payload = {
      store_id: selectedStoreId.value,
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      sort: Number(form.sort) || 0,
    }
    if (editingId.value) {
      await api.put(`/website/blog/categories/${editingId.value}`, payload)
      toast.success('Kategori berhasil diperbarui')
    }
    else {
      await api.post('/website/blog/categories', payload)
      toast.success('Kategori berhasil ditambahkan')
    }
    showModal.value = false
    fetchCategories()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan kategori')
  }
  finally {
    saving.value = false
  }
}

async function handleDelete(c: BlogCategory) {
  const ok = await confirm({
    title: 'Hapus Kategori',
    message: `Yakin ingin menghapus kategori "${c.name}"?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/website/blog/categories/${c.id}`)
    toast.success('Kategori berhasil dihapus')
    fetchCategories()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus kategori')
  }
}

onMounted(async () => {
  await fetchStores()
  await fetchCategories()
})

watch(selectedStoreId, () => fetchCategories())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Kategori Blog</h1>
        <p class="mt-1 text-sm text-gray-500">Kelompokkan artikel blog ke dalam kategori.</p>
      </div>
      <button
        v-if="selectedStoreId"
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" /> Tambah Kategori
      </button>
    </div>

    <div v-if="!selectedStoreId" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <Store class="mx-auto h-12 w-12 text-gray-300" />
      <h3 class="mt-3 text-sm font-semibold text-gray-900">Belum ada store web dipilih</h3>
      <p class="mt-1 text-sm text-gray-500">Pilih store web pada menu di sebelah kiri.</p>
    </div>

    <div v-else class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <div v-if="loading" class="space-y-2 p-4">
        <div v-for="i in 3" :key="i" class="h-12 animate-pulse rounded-lg bg-gray-100" />
      </div>

      <div v-else-if="!categories.length" class="p-12 text-center">
        <Folder class="mx-auto h-12 w-12 text-gray-300" />
        <h3 class="mt-3 text-sm font-semibold text-gray-900">Belum ada kategori</h3>
        <p class="mt-1 text-sm text-gray-500">Tambahkan kategori untuk artikel blog.</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
            <th class="px-4 py-3">Nama</th>
            <th class="px-4 py-3">Slug</th>
            <th class="px-4 py-3">Urutan</th>
            <th class="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in categories" :key="c.id" class="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
            <td class="px-4 py-3 font-medium text-gray-900">{{ c.name }}</td>
            <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ c.slug }}</td>
            <td class="px-4 py-3 text-gray-500">{{ c.sort }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1">
                <button type="button" class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700" title="Ubah" @click="openEdit(c)">
                  <Pencil class="h-4 w-4" />
                </button>
                <button type="button" class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus" @click="handleDelete(c)">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="showModal = false" />
        <div class="relative w-full max-w-md rounded-xl bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 class="text-base font-semibold text-gray-900">{{ editingId ? 'Ubah Kategori' : 'Tambah Kategori' }}</h3>
            <button type="button" class="rounded-lg p-1 text-gray-400 hover:bg-gray-100" @click="showModal = false">
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="space-y-4 px-5 py-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama</label>
              <input v-model="form.name" type="text" class="input" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Slug</label>
              <input v-model="form.slug" type="text" class="input" @input="slugTouched = true" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Urutan</label>
              <input v-model="form.sort" type="number" class="input" />
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
