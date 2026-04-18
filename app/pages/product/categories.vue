<script setup lang="ts">
import {
  Plus, Pencil, Trash2, ChevronRight, ChevronDown, FolderTree, Search, Loader2,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Category {
  id: string
  parent_id: string
  name: string
  slug: string
  description: string
  created_at: string
  updated_at: string
  children: Category[] | null
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(true)
const categories = ref<Category[]>([])
const search = ref('')
const expandedIds = ref<Set<string>>(new Set())

// Modal
const showModal = ref(false)
const editingCategory = ref<Category | null>(null)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})

const form = reactive({
  parent_id: '',
  name: '',
  slug: '',
  description: '',
})

async function fetchCategories() {
  loading.value = true
  try {
    const res = await api.get<{ data: Category[] }>('/products/categories/index')
    categories.value = res.data || []
  }
  catch {
    categories.value = []
  }
  finally {
    loading.value = false
  }
}

// Flatten for search
function matchesSearch(cat: Category): boolean {
  if (!search.value) return true
  const q = search.value.toLowerCase()
  if (cat.name.toLowerCase().includes(q) || cat.slug.toLowerCase().includes(q)) return true
  if (cat.children?.some(c => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))) return true
  return false
}

const filteredCategories = computed(() => {
  if (!search.value) return categories.value
  return categories.value.filter(c => matchesSearch(c))
})

// Total count
const totalCount = computed(() => {
  let count = 0
  for (const cat of categories.value) {
    count++
    if (cat.children) count += cat.children.length
  }
  return count
})

function toggleExpand(id: string) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  }
  else {
    expandedIds.value.add(id)
  }
}

// Parent options for select (exclude self & children when editing)
const parentOptions = computed(() => {
  return categories.value
    .filter(c => !editingCategory.value || c.id !== editingCategory.value.id)
    .map(c => ({ id: c.id, name: c.name }))
})

function openCreate(parentId = '') {
  editingCategory.value = null
  form.parent_id = parentId
  form.name = ''
  form.slug = ''
  form.description = ''
  formErrors.value = {}
  showModal.value = true
}

function openEdit(cat: Category) {
  editingCategory.value = cat
  form.parent_id = cat.parent_id || ''
  form.name = cat.name
  form.slug = cat.slug
  form.description = cat.description || ''
  formErrors.value = {}
  showModal.value = true
}

async function handleSave() {
  saving.value = true
  formErrors.value = {}

  try {
    const body = { ...form }
    if (editingCategory.value) {
      await api.put(`/products/categories/${editingCategory.value.id}`, body)
      toast.success('Kategori berhasil diperbarui')
    }
    else {
      await api.post('/products/categories/create', body)
      toast.success('Kategori berhasil ditambahkan')
    }
    showModal.value = false
    await fetchCategories()
  }
  catch (err: any) {
    if (err.errors) {
      formErrors.value = err.errors
    }
    else {
      toast.error(err.message || 'Gagal menyimpan data')
    }
  }
  finally {
    saving.value = false
  }
}

async function handleDelete(cat: Category) {
  const childCount = cat.children?.length || 0
  const ok = await confirm({
    title: 'Hapus Kategori',
    message: childCount > 0
      ? `Hapus "${cat.name}" beserta ${childCount} sub-kategori di dalamnya?`
      : `Hapus kategori "${cat.name}"?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/products/categories/${cat.id}`)
    toast.success('Kategori berhasil dihapus')
    await fetchCategories()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus kategori')
  }
}

onMounted(() => {
  fetchCategories()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Kategori Produk</h1>
        <p class="mt-1 text-sm text-gray-500">{{ totalCount }} kategori</p>
      </div>
      <button
        class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        @click="openCreate()"
      >
        <Plus class="h-4 w-4" />
        Tambah Kategori
      </button>
    </div>

    <!-- Search -->
    <div class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        v-model="search"
        type="text"
        placeholder="Cari kategori..."
        class="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="animate-pulse rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <div class="flex items-center gap-3">
          <div class="h-5 w-5 rounded bg-gray-200" />
          <div class="h-4 w-40 rounded bg-gray-200" />
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!filteredCategories.length" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <FolderTree class="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p class="text-gray-500">
        {{ search ? 'Tidak ada kategori yang cocok' : 'Belum ada kategori. Klik tombol di atas untuk menambahkan.' }}
      </p>
    </div>

    <!-- Category tree -->
    <div v-else class="space-y-2">
      <div
        v-for="cat in filteredCategories"
        :key="cat.id"
        class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200"
      >
        <!-- Parent row -->
        <div class="flex items-center gap-3 p-4">
          <!-- Expand toggle -->
          <button
            v-if="cat.children && cat.children.length"
            class="shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            @click="toggleExpand(cat.id)"
          >
            <ChevronDown v-if="expandedIds.has(cat.id)" class="h-4 w-4" />
            <ChevronRight v-else class="h-4 w-4" />
          </button>
          <div v-else class="w-5 shrink-0" />

          <!-- Info -->
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold text-sm text-gray-900">{{ cat.name }}</span>
              <span class="text-xs text-gray-400">/{{ cat.slug }}</span>
              <span
                v-if="cat.children && cat.children.length"
                class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
              >
                {{ cat.children.length }} sub
              </span>
            </div>
            <p v-if="cat.description" class="mt-0.5 truncate text-sm text-gray-500">{{ cat.description }}</p>
          </div>

          <!-- Actions -->
          <div class="flex shrink-0 items-center gap-0.5">
            <button
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600 sm:p-2"
              title="Tambah Sub-kategori"
              @click="openCreate(cat.id)"
            >
              <Plus class="h-4 w-4" />
            </button>
            <button
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 sm:p-2"
              title="Edit"
              @click="openEdit(cat)"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 sm:p-2"
              title="Hapus"
              @click="handleDelete(cat)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Children -->
        <div
          v-if="cat.children && cat.children.length && expandedIds.has(cat.id)"
          class="border-t border-gray-100"
        >
          <div
            v-for="child in cat.children"
            :key="child.id"
            class="flex items-center gap-3 border-b border-gray-50 px-4 py-3 pl-12 last:border-b-0"
          >
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-sm font-medium text-gray-800">{{ child.name }}</span>
                <span class="text-xs text-gray-400">/{{ child.slug }}</span>
              </div>
              <p v-if="child.description" class="mt-0.5 truncate text-sm text-gray-500">{{ child.description }}</p>
            </div>

            <div class="flex shrink-0 items-center gap-0.5">
              <button
                class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 sm:p-2"
                title="Edit"
                @click="openEdit(child)"
              >
                <Pencil class="h-4 w-4" />
              </button>
              <button
                class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 sm:p-2"
                title="Hapus"
                @click="handleDelete(child)"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="showModal = false">
          <div class="flex w-full max-w-md flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
            <!-- Header -->
            <div class="shrink-0 border-b border-gray-100 px-6 py-4">
              <h2 class="text-lg font-semibold text-gray-900">
                {{ editingCategory ? 'Edit Kategori' : 'Tambah Kategori' }}
              </h2>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto px-6 py-5">
              <div class="space-y-4">
                <!-- Parent select -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Kategori Induk</label>
                  <select
                    v-model="form.parent_id"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">Tidak ada (Kategori Utama)</option>
                    <option v-for="opt in parentOptions" :key="opt.id" :value="opt.id">
                      {{ opt.name }}
                    </option>
                  </select>
                </div>

                <!-- Name -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Kategori</label>
                  <input
                    v-model="form.name"
                    type="text"
                    placeholder="Nama kategori"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="formErrors.name" class="mt-1 text-xs text-red-600">{{ formErrors.name[0] }}</p>
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
                  <p v-if="formErrors.slug" class="mt-1 text-xs text-red-600">{{ formErrors.slug[0] }}</p>
                </div>

                <!-- Description -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Deskripsi</label>
                  <textarea
                    v-model="form.description"
                    rows="3"
                    placeholder="Deskripsi kategori (opsional)"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                @click="showModal = false"
              >
                Batal
              </button>
              <button
                :disabled="saving"
                class="flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                @click="handleSave"
              >
                <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
                {{ saving ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
