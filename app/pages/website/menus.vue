<script setup lang="ts">
import { Plus, Pencil, Trash2, Menu as MenuIcon, Store, ExternalLink, CornerDownRight, X } from 'lucide-vue-next'

definePageMeta({ layout: 'website', middleware: 'auth' })

interface WebMenu {
  id: string
  store_id: string
  parent_id: string | null
  label: string
  url: string
  target: string
  sort: number
  status: string
  children?: WebMenu[]
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const { selectedStoreId, fetchStores } = useWebsiteStore()

const tree = ref<WebMenu[]>([])
const loading = ref(false)

async function fetchMenus() {
  if (!selectedStoreId.value) return
  loading.value = true
  try {
    const res = await api.get<{ data: WebMenu[] }>('/website/menus', { store_id: selectedStoreId.value })
    tree.value = res.data || []
  }
  catch {
    tree.value = []
  }
  finally {
    loading.value = false
  }
}

// Top-level menus for the parent selector
const parentOptions = computed(() => tree.value.map(m => ({ id: m.id, label: m.label })))

// ─── Modal ───────────────────────────────────────────────────────────
const showModal = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const form = reactive({
  parent_id: '',
  label: '',
  url: '',
  target: '_self',
  sort: 0,
  status: 'active',
})

function openCreate(parentId: string | null = null) {
  editingId.value = null
  form.parent_id = parentId || ''
  form.label = ''
  form.url = ''
  form.target = '_self'
  form.sort = 0
  form.status = 'active'
  showModal.value = true
}

function openEdit(m: WebMenu) {
  editingId.value = m.id
  form.parent_id = m.parent_id || ''
  form.label = m.label
  form.url = m.url
  form.target = m.target || '_self'
  form.sort = m.sort
  form.status = m.status
  showModal.value = true
}

async function handleSave() {
  if (!form.label.trim()) {
    toast.error('Label wajib diisi')
    return
  }
  saving.value = true
  try {
    const payload = {
      store_id: selectedStoreId.value,
      parent_id: form.parent_id || null,
      label: form.label.trim(),
      url: form.url.trim(),
      target: form.target,
      sort: Number(form.sort) || 0,
      status: form.status,
    }
    if (editingId.value) {
      await api.put(`/website/menus/${editingId.value}`, payload)
      toast.success('Menu berhasil diperbarui')
    }
    else {
      await api.post('/website/menus', payload)
      toast.success('Menu berhasil ditambahkan')
    }
    showModal.value = false
    fetchMenus()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan menu')
  }
  finally {
    saving.value = false
  }
}

async function handleDelete(m: WebMenu) {
  const ok = await confirm({
    title: 'Hapus Menu',
    message: `Yakin ingin menghapus menu "${m.label}"${m.children?.length ? ' beserta sub-menunya' : ''}?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/website/menus/${m.id}`)
    toast.success('Menu berhasil dihapus')
    fetchMenus()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus menu')
  }
}

onMounted(async () => {
  await fetchStores()
  await fetchMenus()
})

watch(selectedStoreId, () => fetchMenus())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Menu Navigasi</h1>
        <p class="mt-1 text-sm text-gray-500">Susun menu navigasi website (mendukung sub-menu).</p>
      </div>
      <button
        v-if="selectedStoreId"
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        @click="openCreate(null)"
      >
        <Plus class="h-4 w-4" /> Tambah Menu
      </button>
    </div>

    <div v-if="!selectedStoreId" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <Store class="mx-auto h-12 w-12 text-gray-300" />
      <h3 class="mt-3 text-sm font-semibold text-gray-900">Belum ada store web dipilih</h3>
      <p class="mt-1 text-sm text-gray-500">Pilih store web pada menu di sebelah kiri.</p>
    </div>

    <div v-else class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <div v-if="loading" class="space-y-2 p-4">
        <div v-for="i in 4" :key="i" class="h-14 animate-pulse rounded-lg bg-gray-100" />
      </div>

      <div v-else-if="!tree.length" class="p-12 text-center">
        <MenuIcon class="mx-auto h-12 w-12 text-gray-300" />
        <h3 class="mt-3 text-sm font-semibold text-gray-900">Belum ada menu</h3>
        <p class="mt-1 text-sm text-gray-500">Tambahkan item menu navigasi.</p>
      </div>

      <ul v-else class="divide-y divide-gray-50 p-2">
        <li v-for="m in tree" :key="m.id" class="py-1">
          <!-- Parent -->
          <div class="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50">
            <MenuIcon class="h-4 w-4 shrink-0 text-gray-400" />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900">{{ m.label }}</span>
                <span v-if="m.status !== 'active'" class="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">Nonaktif</span>
              </div>
              <p v-if="m.url" class="flex items-center gap-1 text-xs text-gray-400">
                <ExternalLink class="h-3 w-3" /> {{ m.url }}
              </p>
            </div>
            <button type="button" class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-primary-50 hover:text-primary-600" title="Tambah sub-menu" @click="openCreate(m.id)">
              <Plus class="h-4 w-4" />
            </button>
            <button type="button" class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700" title="Ubah" @click="openEdit(m)">
              <Pencil class="h-4 w-4" />
            </button>
            <button type="button" class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus" @click="handleDelete(m)">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

          <!-- Children -->
          <ul v-if="m.children?.length" class="ml-6 mt-1 space-y-1 border-l border-gray-100 pl-2">
            <li v-for="child in m.children" :key="child.id">
              <div class="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50">
                <CornerDownRight class="h-4 w-4 shrink-0 text-gray-300" />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-800">{{ child.label }}</span>
                    <span v-if="child.status !== 'active'" class="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">Nonaktif</span>
                  </div>
                  <p v-if="child.url" class="flex items-center gap-1 text-xs text-gray-400">
                    <ExternalLink class="h-3 w-3" /> {{ child.url }}
                  </p>
                </div>
                <button type="button" class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700" title="Ubah" @click="openEdit(child)">
                  <Pencil class="h-4 w-4" />
                </button>
                <button type="button" class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus" @click="handleDelete(child)">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </li>
          </ul>
        </li>
      </ul>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="showModal = false" />
        <div class="relative w-full max-w-md rounded-xl bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 class="text-base font-semibold text-gray-900">{{ editingId ? 'Ubah Menu' : 'Tambah Menu' }}</h3>
            <button type="button" class="rounded-lg p-1 text-gray-400 hover:bg-gray-100" @click="showModal = false">
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="space-y-4 px-5 py-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Parent (opsional)</label>
              <select v-model="form.parent_id" class="input">
                <option value="">— Menu Utama —</option>
                <option v-for="opt in parentOptions" :key="opt.id" :value="opt.id" :disabled="opt.id === editingId">{{ opt.label }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Label</label>
              <input v-model="form.label" type="text" class="input" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">URL</label>
              <input v-model="form.url" type="text" placeholder="/products" class="input" />
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Target</label>
                <select v-model="form.target" class="input">
                  <option value="_self">Sama</option>
                  <option value="_blank">Baru</option>
                </select>
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Urutan</label>
                <input v-model="form.sort" type="number" class="input" />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
                <select v-model="form.status" class="input">
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
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
