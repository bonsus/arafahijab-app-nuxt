<script setup lang="ts">
import {
  Plus, Search, Pencil, Trash2, Loader2, Tag, Percent,
} from 'lucide-vue-next'

interface CustomerCategory {
  id: string
  business_id: string
  name: string
  description: string
  discount: number
  created_at: string
  updated_at: string
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

// --- List state ---
const categories = ref<CustomerCategory[]>([])
const loading = ref(true)
const searchQuery = ref('')

async function fetchCategories() {
  loading.value = true
  try {
    const res = await api.get<{ data: CustomerCategory[] }>('/customers/categories/index')
    categories.value = res.data || []
  } catch {
    categories.value = []
  } finally {
    loading.value = false
  }
}

const filteredCategories = computed(() => {
  if (!searchQuery.value) return categories.value
  const q = searchQuery.value.toLowerCase()
  return categories.value.filter(
    c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q),
  )
})

// --- Modal state ---
const showModal = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})

const form = reactive({
  name: '',
  description: '',
  discount: 0 as number,
})

function openCreate() {
  editingId.value = null
  form.name = ''
  form.description = ''
  form.discount = 0
  formErrors.value = {}
  showModal.value = true
}

function openEdit(cat: CustomerCategory) {
  editingId.value = cat.id
  form.name = cat.name
  form.description = cat.description || ''
  form.discount = cat.discount || 0
  formErrors.value = {}
  showModal.value = true
}

async function handleSave() {
  saving.value = true
  formErrors.value = {}
  try {
    const body = {
      name: form.name,
      description: form.description,
      discount: form.discount,
    }
    if (editingId.value) {
      await api.put(`/customers/categories/${editingId.value}`, body)
      toast.success('Kategori berhasil diperbarui')
    } else {
      await api.get('/customers/categories/create', body as any)
      toast.success('Kategori berhasil ditambahkan')
    }
    showModal.value = false
    fetchCategories()
  } catch (err: any) {
    if (err.errors) formErrors.value = err.errors
    toast.error(err.message || 'Gagal menyimpan kategori')
  } finally {
    saving.value = false
  }
}

// --- Delete ---
async function handleDelete(cat: CustomerCategory) {
  const ok = await confirm({
    title: 'Hapus Kategori',
    message: `Yakin ingin menghapus kategori "${cat.name}"? Kategori yang masih digunakan customer tidak bisa dihapus.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/customers/categories/${cat.id}`)
    toast.success('Kategori berhasil dihapus')
    fetchCategories()
  } catch (err: any) {
    toast.error(err.message || 'Gagal menghapus kategori')
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(() => fetchCategories())
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Kategori Pelanggan</h1>
        <p class="mt-1 text-sm text-gray-500">{{ categories.length }} kategori</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" />
        Tambah Kategori
      </button>
    </div>

    <!-- Search -->
    <!-- <div class="relative max-w-sm">
      <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Cari kategori..."
        class="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
    </div> -->

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="animate-pulse rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1 space-y-3">
            <div class="h-5 w-36 rounded bg-gray-200" />
            <div class="h-4 w-48 rounded bg-gray-100" />
          </div>
          <div class="flex items-center gap-1">
            <div class="h-8 w-8 rounded-lg bg-gray-100" />
            <div class="h-8 w-8 rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!filteredCategories.length" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <Tag class="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p class="text-gray-500">
        {{ searchQuery ? 'Tidak ada kategori yang cocok' : 'Belum ada kategori pelanggan.' }}
      </p>
    </div>

    <!-- List -->
    <div v-else class="space-y-3">
      <div
        v-for="cat in filteredCategories"
        :key="cat.id"
        class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md"
      >
        <div class="flex items-start justify-between gap-2 sm:gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-sm font-semibold text-gray-900">{{ cat.name }}</h3>
              <span
                v-if="cat.discount"
                class="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200"
              >
                <Percent class="h-3 w-3" />
                {{ cat.discount }}%
              </span>
            </div>
            <p v-if="cat.description" class="mt-1 text-xs text-gray-500">{{ cat.description }}</p>
            <!-- <p class="mt-1.5 text-xs text-gray-400">Dibuat {{ formatDate(cat.created_at) }}</p> -->
          </div>

          <div class="flex shrink-0 items-center gap-1">
            <button
              type="button"
              class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title="Edit"
              @click="openEdit(cat)"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Hapus"
              @click="handleDelete(cat)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @mousedown.self="showModal = false">
        <div class="flex w-full max-w-md flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
          <!-- Header -->
          <div class="shrink-0 border-b border-gray-100 px-6 py-4">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ editingId ? 'Edit Kategori' : 'Tambah Kategori' }}
            </h2>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <div class="space-y-4">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Kategori <span class="text-red-500">*</span></label>
                <input v-model="form.name" type="text" class="form-input" placeholder="Contoh: Reseller, Dropshipper" />
                <p v-if="formErrors.name" class="mt-1 text-xs text-red-500">{{ formErrors.name[0] }}</p>
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Deskripsi</label>
                <textarea v-model="form.description" rows="2" class="form-input resize-y" placeholder="Deskripsi kategori" />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Diskon (%)</label>
                <input v-model.number="form.discount" type="number" min="0" class="form-input" placeholder="0" />
                <p v-if="formErrors.discount" class="mt-1 text-xs text-red-500">{{ formErrors.discount[0] }}</p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              @click="showModal = false"
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="saving || !form.name"
              class="flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleSave"
            >
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
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

.form-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
