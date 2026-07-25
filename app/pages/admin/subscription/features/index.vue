<script setup lang="ts">
import { Plus, Pencil, Trash2, Loader2, Search } from 'lucide-vue-next'
import type { Feature, FeatureDataType, AdminResponse, AdminPaginated } from '~/types/admin'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const api = useAdminApi()
const toast = useToast()

const features = ref<Feature[]>([])
const loading = ref(false)
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const totalPage = ref(0)
const search = ref('')

const dataTypes: FeatureDataType[] = ['boolean', 'number', 'string', 'unlimited']

async function fetchFeatures() {
  loading.value = true
  try {
    const res = await api.get<AdminResponse<AdminPaginated<Feature>>>('/admin/subscription/features', {
      page: String(page.value),
      perpage: String(perPage.value),
      search: search.value,
    })
    features.value = res.data.data || []
    total.value = res.data.total
    totalPage.value = res.data.total_page
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memuat feature')
  }
  finally {
    loading.value = false
  }
}

onMounted(fetchFeatures)
watch([page, perPage], fetchFeatures)

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchFeatures()
  }, 400)
}

const modalOpen = ref(false)
const editing = ref<Feature | null>(null)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})
const form = reactive({
  code: '',
  name: '',
  category: '',
  data_type: 'boolean' as FeatureDataType,
  description: '',
})

function openCreate() {
  editing.value = null
  Object.assign(form, { code: '', name: '', category: '', data_type: 'boolean', description: '' })
  formErrors.value = {}
  modalOpen.value = true
}

function openEdit(f: Feature) {
  editing.value = f
  Object.assign(form, {
    code: f.code,
    name: f.name,
    category: f.category || '',
    data_type: f.data_type,
    description: f.description || '',
  })
  formErrors.value = {}
  modalOpen.value = true
}

async function save() {
  saving.value = true
  formErrors.value = {}
  try {
    if (editing.value) {
      await api.put(`/admin/subscription/features/${editing.value.id}`, { ...form })
      toast.success('Feature diperbarui')
    }
    else {
      await api.post('/admin/subscription/features/create', { ...form })
      toast.success('Feature dibuat')
    }
    modalOpen.value = false
    fetchFeatures()
  }
  catch (error: any) {
    if (error?.errors) formErrors.value = error.errors
    else toast.error(error?.message || 'Gagal menyimpan feature')
  }
  finally {
    saving.value = false
  }
}

async function remove(f: Feature) {
  if (!confirm(`Hapus feature "${f.name}"?`)) return
  try {
    await api.delete(`/admin/subscription/features/${f.id}`)
    toast.success('Feature dihapus')
    fetchFeatures()
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal menghapus feature')
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Feature</h1>
        <p class="mt-1 text-sm text-gray-500">Katalog fitur untuk plan langganan.</p>
      </div>
      <button class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700" @click="openCreate">
        <Plus class="h-4 w-4" /> Tambah Feature
      </button>
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div class="border-b border-gray-100 p-3">
        <div class="relative max-w-xs">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input v-model="search" type="text" placeholder="Cari feature..." class="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" @input="onSearch" />
        </div>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-16 text-gray-400">
        <Loader2 class="h-6 w-6 animate-spin" />
      </div>
      <table v-else class="w-full text-sm">
        <thead class="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
          <tr>
            <th class="px-4 py-3">Kode</th>
            <th class="px-4 py-3">Nama</th>
            <th class="px-4 py-3">Kategori</th>
            <th class="px-4 py-3">Tipe</th>
            <th class="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-if="!features.length">
            <td colspan="5" class="px-4 py-10 text-center text-gray-400">Belum ada feature.</td>
          </tr>
          <tr v-for="f in features" :key="f.id" class="hover:bg-gray-50/50">
            <td class="px-4 py-3 font-mono text-xs text-gray-700">{{ f.code }}</td>
            <td class="px-4 py-3 font-medium text-gray-900">{{ f.name }}</td>
            <td class="px-4 py-3 text-gray-600">{{ f.category || '-' }}</td>
            <td class="px-4 py-3">
              <span class="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{{ f.data_type }}</span>
            </td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-1">
                <button class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" @click="openEdit(f)"><Pencil class="h-4 w-4" /></button>
                <button class="rounded-lg p-1.5 text-red-500 hover:bg-red-50" @click="remove(f)"><Trash2 class="h-4 w-4" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <AdminPagination v-model:page="page" v-model:per-page="perPage" :total-page="totalPage" :total="total" :per-page="perPage" :loading="loading" />
    </div>

    <AdminModal v-model="modalOpen" :title="editing ? 'Edit Feature' : 'Tambah Feature'">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Kode</label>
          <input v-model="form.code" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.code" class="mt-1 text-xs text-red-600">{{ formErrors.code.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama</label>
          <input v-model="form.name" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.name" class="mt-1 text-xs text-red-600">{{ formErrors.name.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Kategori</label>
          <input v-model="form.category" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Tipe Data</label>
          <select v-model="form.data_type" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option v-for="t in dataTypes" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Deskripsi</label>
          <textarea v-model="form.description" rows="2" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
      </div>
      <template #footer>
        <button class="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50" @click="modalOpen = false">Batal</button>
        <button :disabled="saving" class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60" @click="save">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" /> Simpan
        </button>
      </template>
    </AdminModal>
  </div>
</template>
