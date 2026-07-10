<script setup lang="ts">
import { Plus, Search, Trash2, Box, Store, ToggleLeft, ToggleRight, X, Check } from 'lucide-vue-next'

definePageMeta({ layout: 'website', middleware: 'auth' })

interface ProductRef {
  id: string
  name: string
  slug: string
  thumbnail: string
  status: string
  sold: number
  category?: { id: string, name: string } | null
}

interface WebProductItem {
  id: string
  store_id: string
  product_id: string
  status: string
  sort: number
  product?: ProductRef | null
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const { selectedStoreId, fetchStores } = useWebsiteStore()

const items = ref<WebProductItem[]>([])
const loading = ref(false)
const search = ref('')
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

async function fetchItems() {
  if (!selectedStoreId.value) return
  loading.value = true
  try {
    const params: Record<string, string> = {
      store_id: selectedStoreId.value,
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    const res = await api.get<{ data: { data: WebProductItem[], total_page: number, total: number } }>('/website/products', params)
    items.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch {
    items.value = []
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
    fetchItems()
  }, 300)
}

// ─── Toggle status ────────────────────────────────────────────────────
const togglingIds = ref<Set<string>>(new Set())
async function toggleStatus(item: WebProductItem) {
  togglingIds.value.add(item.id)
  const newStatus = item.status === 'active' ? 'inactive' : 'active'
  try {
    await api.put(`/website/products/${item.id}`, { status: newStatus, sort: item.sort })
    item.status = newStatus
    toast.success(`Produk berhasil di${newStatus === 'active' ? 'aktifkan' : 'nonaktifkan'}`)
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status')
  }
  finally {
    togglingIds.value.delete(item.id)
  }
}

async function handleDelete(item: WebProductItem) {
  const ok = await confirm({
    title: 'Hapus Produk',
    message: `Yakin ingin menghapus "${item.product?.name || 'produk'}" dari website?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/website/products/${item.id}`)
    toast.success('Produk berhasil dihapus dari website')
    fetchItems()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus produk')
  }
}

// ─── Add products modal ──────────────────────────────────────────────
const showAdd = ref(false)
const available = ref<ProductRef[]>([])
const availableLoading = ref(false)
const availableSearch = ref('')
const availablePage = ref(1)
const availableTotalPage = ref(1)
const selectedIds = ref<Set<string>>(new Set())
const adding = ref(false)

async function fetchAvailable() {
  availableLoading.value = true
  try {
    const params: Record<string, string> = {
      store_id: selectedStoreId.value,
      page: String(availablePage.value),
      per_page: '20',
    }
    if (availableSearch.value) params.search = availableSearch.value
    const res = await api.get<{ data: { data: ProductRef[], total_page: number } }>('/website/products/available', params)
    available.value = res.data?.data || []
    availableTotalPage.value = res.data?.total_page || 1
  }
  catch {
    available.value = []
  }
  finally {
    availableLoading.value = false
  }
}

let availableSearchTimer: ReturnType<typeof setTimeout>
function onAvailableSearch() {
  clearTimeout(availableSearchTimer)
  availableSearchTimer = setTimeout(() => {
    availablePage.value = 1
    fetchAvailable()
  }, 300)
}

function openAdd() {
  selectedIds.value = new Set()
  availableSearch.value = ''
  availablePage.value = 1
  showAdd.value = true
  fetchAvailable()
}

function toggleSelect(id: string) {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
}

async function handleAdd() {
  if (!selectedIds.value.size) {
    toast.error('Pilih minimal satu produk')
    return
  }
  adding.value = true
  try {
    await api.post('/website/products', {
      store_id: selectedStoreId.value,
      product_ids: Array.from(selectedIds.value),
      status: 'active',
    })
    toast.success('Produk berhasil ditambahkan ke website')
    showAdd.value = false
    page.value = 1
    fetchItems()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menambahkan produk')
  }
  finally {
    adding.value = false
  }
}

onMounted(async () => {
  await fetchStores()
  await fetchItems()
})

watch(selectedStoreId, () => {
  page.value = 1
  fetchItems()
})
watch([page, perPage], () => fetchItems())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Produk Website</h1>
        <p class="mt-1 text-sm text-gray-500">Produk yang ditampilkan pada storefront.</p>
      </div>
      <button
        v-if="selectedStoreId"
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        @click="openAdd"
      >
        <Plus class="h-4 w-4" /> Tambah Produk
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
            placeholder="Cari produk..."
            class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            @input="onSearch"
          />
        </div>
      </div>

      <div v-if="loading" class="space-y-2 p-4">
        <div v-for="i in 5" :key="i" class="h-16 animate-pulse rounded-lg bg-gray-100" />
      </div>

      <div v-else-if="!items.length" class="p-12 text-center">
        <Box class="mx-auto h-12 w-12 text-gray-300" />
        <h3 class="mt-3 text-sm font-semibold text-gray-900">Belum ada produk</h3>
        <p class="mt-1 text-sm text-gray-500">Tambahkan produk untuk ditampilkan di website.</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
            <th class="px-4 py-3">Produk</th>
            <th class="px-4 py-3">Kategori</th>
            <th class="px-4 py-3">Terjual</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id" class="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
                  <img v-if="item.product?.thumbnail" :src="item.product.thumbnail" :alt="item.product?.name" class="h-full w-full object-cover" />
                  <div v-else class="flex h-full w-full items-center justify-center text-gray-300">
                    <Box class="h-5 w-5" />
                  </div>
                </div>
                <span class="font-medium text-gray-900">{{ item.product?.name || '—' }}</span>
              </div>
            </td>
            <td class="px-4 py-3 text-gray-500">{{ item.product?.category?.name || '—' }}</td>
            <td class="px-4 py-3 text-gray-500">{{ item.product?.sold ?? 0 }}</td>
            <td class="px-4 py-3">
              <span
                class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1"
                :class="item.status === 'active' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-gray-50 text-gray-500 ring-gray-200'"
              >
                {{ item.status === 'active' ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1">
                <button
                  type="button"
                  :disabled="togglingIds.has(item.id)"
                  class="rounded-lg p-1.5 transition-colors disabled:opacity-50"
                  :title="item.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'"
                  @click="toggleStatus(item)"
                >
                  <ToggleRight v-if="item.status === 'active'" class="h-5 w-5 text-green-600" />
                  <ToggleLeft v-else class="h-5 w-5 text-gray-400" />
                </button>
                <button type="button" class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus" @click="handleDelete(item)">
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

    <!-- Add modal -->
    <Teleport to="body">
      <div v-if="showAdd" class="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="showAdd = false" />
        <div class="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 class="text-base font-semibold text-gray-900">Tambah Produk ke Website</h3>
            <button type="button" class="rounded-lg p-1 text-gray-400 hover:bg-gray-100" @click="showAdd = false">
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="border-b border-gray-100 p-4">
            <div class="relative">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                v-model="availableSearch"
                type="text"
                placeholder="Cari produk..."
                class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                @input="onAvailableSearch"
              />
            </div>
          </div>
          <div class="flex-1 overflow-y-auto p-4">
            <div v-if="availableLoading" class="space-y-2">
              <div v-for="i in 5" :key="i" class="h-14 animate-pulse rounded-lg bg-gray-100" />
            </div>
            <div v-else-if="!available.length" class="py-10 text-center text-sm text-gray-500">
              Tidak ada produk tersedia untuk ditambahkan.
            </div>
            <div v-else class="space-y-1.5">
              <button
                v-for="p in available"
                :key="p.id"
                type="button"
                class="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors"
                :class="selectedIds.has(p.id) ? 'border-primary-300 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'"
                @click="toggleSelect(p.id)"
              >
                <div class="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
                  <img v-if="p.thumbnail" :src="p.thumbnail" :alt="p.name" class="h-full w-full object-cover" />
                  <div v-else class="flex h-full w-full items-center justify-center text-gray-300">
                    <Box class="h-5 w-5" />
                  </div>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-gray-900">{{ p.name }}</p>
                  <p class="text-xs text-gray-400">{{ p.category?.name || '—' }}</p>
                </div>
                <div
                  class="flex h-5 w-5 shrink-0 items-center justify-center rounded border"
                  :class="selectedIds.has(p.id) ? 'border-primary-500 bg-primary-500 text-white' : 'border-gray-300'"
                >
                  <Check v-if="selectedIds.has(p.id)" class="h-3.5 w-3.5" />
                </div>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between border-t border-gray-100 px-5 py-4">
            <span class="text-xs text-gray-500">{{ selectedIds.size }} produk dipilih</span>
            <div class="flex gap-2">
              <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="showAdd = false">Batal</button>
              <button type="button" :disabled="adding || !selectedIds.size" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50" @click="handleAdd">
                {{ adding ? 'Menambahkan...' : 'Tambahkan' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
