<script setup lang="ts">
import { Plus, Search, Pencil, Trash2, Globe, Star, Store, CheckCircle2, XCircle, X } from 'lucide-vue-next'

definePageMeta({ layout: 'website', middleware: 'auth' })

interface WebDomain {
  id: string
  store_id: string
  domain: string
  is_primary: boolean
  verified: boolean
  status: string
  created_at: string
  updated_at: string
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const { selectedStoreId, fetchStores } = useWebsiteStore()

const domains = ref<WebDomain[]>([])
const loading = ref(false)
const search = ref('')
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

async function fetchDomains() {
  if (!selectedStoreId.value) return
  loading.value = true
  try {
    const params: Record<string, string> = {
      store_id: selectedStoreId.value,
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    const res = await api.get<{ data: { data: WebDomain[], total_page: number, total: number } }>('/website/domains', params)
    domains.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch {
    domains.value = []
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
    fetchDomains()
  }, 300)
}

// ─── Modal ───────────────────────────────────────────────────────────
const showModal = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const form = reactive({ domain: '', status: 'active' })

function openCreate() {
  editingId.value = null
  form.domain = ''
  form.status = 'active'
  showModal.value = true
}

function openEdit(d: WebDomain) {
  editingId.value = d.id
  form.domain = d.domain
  form.status = d.status
  showModal.value = true
}

async function handleSave() {
  if (!form.domain.trim()) {
    toast.error('Domain wajib diisi')
    return
  }
  saving.value = true
  try {
    const payload = { store_id: selectedStoreId.value, domain: form.domain.trim(), status: form.status }
    if (editingId.value) {
      await api.put(`/website/domains/${editingId.value}`, payload)
      toast.success('Domain berhasil diperbarui')
    }
    else {
      await api.post('/website/domains', payload)
      toast.success('Domain berhasil ditambahkan')
    }
    showModal.value = false
    fetchDomains()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan domain')
  }
  finally {
    saving.value = false
  }
}

const settingPrimaryId = ref<string | null>(null)
async function setPrimary(d: WebDomain) {
  if (d.is_primary) return
  settingPrimaryId.value = d.id
  try {
    await api.put(`/website/domains/${d.id}/set-primary`, {})
    toast.success('Domain utama berhasil diubah')
    fetchDomains()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengubah domain utama')
  }
  finally {
    settingPrimaryId.value = null
  }
}

async function handleDelete(d: WebDomain) {
  const ok = await confirm({
    title: 'Hapus Domain',
    message: `Yakin ingin menghapus domain "${d.domain}"?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/website/domains/${d.id}`)
    toast.success('Domain berhasil dihapus')
    fetchDomains()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus domain')
  }
}

onMounted(async () => {
  await fetchStores()
  await fetchDomains()
})

watch(selectedStoreId, () => {
  page.value = 1
  fetchDomains()
})
watch([page, perPage], () => fetchDomains())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Domain</h1>
        <p class="mt-1 text-sm text-gray-500">Kelola domain yang mengarah ke website store.</p>
      </div>
      <button
        v-if="selectedStoreId"
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" /> Tambah Domain
      </button>
    </div>

    <div v-if="!selectedStoreId" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <Store class="mx-auto h-12 w-12 text-gray-300" />
      <h3 class="mt-3 text-sm font-semibold text-gray-900">Belum ada store web dipilih</h3>
      <p class="mt-1 text-sm text-gray-500">Pilih store web pada menu di sebelah kiri.</p>
    </div>

    <div v-else class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <div class="border-b border-gray-100 p-4">
        <div class="relative w-full sm:w-72">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="search"
            type="text"
            placeholder="Cari domain..."
            class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            @input="onSearch"
          />
        </div>
      </div>

      <div v-if="loading" class="space-y-2 p-4">
        <div v-for="i in 4" :key="i" class="h-14 animate-pulse rounded-lg bg-gray-100" />
      </div>

      <div v-else-if="!domains.length" class="p-12 text-center">
        <Globe class="mx-auto h-12 w-12 text-gray-300" />
        <h3 class="mt-3 text-sm font-semibold text-gray-900">Belum ada domain</h3>
        <p class="mt-1 text-sm text-gray-500">Tambahkan domain untuk website store.</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
            <th class="px-4 py-3">Domain</th>
            <th class="px-4 py-3">Verifikasi</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in domains" :key="d.id" class="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <Globe class="h-4 w-4 text-gray-400" />
                <span class="font-medium text-gray-900">{{ d.domain }}</span>
                <span v-if="d.is_primary" class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                  <Star class="h-3 w-3" /> Utama
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <span v-if="d.verified" class="inline-flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 class="h-4 w-4" /> Terverifikasi
              </span>
              <span v-else class="inline-flex items-center gap-1 text-xs text-gray-400">
                <XCircle class="h-4 w-4" /> Belum
              </span>
            </td>
            <td class="px-4 py-3">
              <span
                class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1"
                :class="d.status === 'active' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-gray-50 text-gray-500 ring-gray-200'"
              >
                {{ d.status === 'active' ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1">
                <button
                  v-if="!d.is_primary"
                  type="button"
                  :disabled="settingPrimaryId === d.id"
                  class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50"
                  title="Jadikan utama"
                  @click="setPrimary(d)"
                >
                  <Star class="h-4 w-4" />
                </button>
                <button type="button" class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700" title="Ubah" @click="openEdit(d)">
                  <Pencil class="h-4 w-4" />
                </button>
                <button type="button" class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus" @click="handleDelete(d)">
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
        <div class="relative w-full max-w-md rounded-xl bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 class="text-base font-semibold text-gray-900">{{ editingId ? 'Ubah Domain' : 'Tambah Domain' }}</h3>
            <button type="button" class="rounded-lg p-1 text-gray-400 hover:bg-gray-100" @click="showModal = false">
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="space-y-4 px-5 py-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Domain</label>
              <input v-model="form.domain" type="text" placeholder="toko.arafahijab.co.id" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
              <select v-model="form.status" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
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
