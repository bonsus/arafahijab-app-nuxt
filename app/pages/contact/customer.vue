<script setup lang="ts">
import {
  Plus, Search, Eye, Pencil, Trash2, Users, EllipsisVertical,
  ToggleLeft, ToggleRight,
  KeyRound, Tag, Loader2,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Customer {
  id: string
  store_id: string
  customer_category_id: string
  external_id: string
  name: string
  phone: string
  email: string
  username: string
  type: string
  status: string
  login_status: string
  reward_points: string
  created_at: string
  updated_at: string
  category: { id: string; name: string; discount: number } | null
}

interface PaginatedCustomers {
  data: Customer[]
  page: number
  per_page: number
  total_page: number
  total: number
}

interface CategoryOption {
  id: string
  name: string
  discount: number
  customer_count: number
}

interface StoreOption {
  id: string
  name: string
  customer_count: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(true)
const customers = ref<Customer[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)
const search = ref('')
const filterStatus = ref('')
const filterCategory = ref<Set<string>>(new Set())
const filterStore = ref<Set<string>>(new Set())
const filterDate = ref({ from: '', to: '' })
const categories = ref<CategoryOption[]>([])
const stores = ref<StoreOption[]>([])

// Action menu
const openMenuId = ref<string | null>(null)
function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id
}
function closeMenu() {
  openMenuId.value = null
}

// Bulk selection
const selectedIds = ref<Set<string>>(new Set())
const selectAll = computed({
  get: () => customers.value.length > 0 && customers.value.every(c => selectedIds.value.has(c.id)),
  set: (val: boolean) => {
    if (val) customers.value.forEach(c => selectedIds.value.add(c.id))
    else selectedIds.value.clear()
  },
})

const statusTabs = [
  { key: '', label: 'Semua' },
  { key: 'active', label: 'Aktif' },
  { key: 'inactive', label: 'Nonaktif' },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Aktif', color: 'bg-green-100 text-green-700' },
  inactive: { label: 'Nonaktif', color: 'bg-gray-100 text-gray-500' },
}

// Password modal
const showPasswordModal = ref(false)
const passwordTarget = ref<Customer | null>(null)
const newPassword = ref('')
const savingPassword = ref(false)

function openPasswordModal(c: Customer) {
  passwordTarget.value = c
  newPassword.value = ''
  showPasswordModal.value = true
}

async function handleUpdatePassword() {
  if (!passwordTarget.value) return
  savingPassword.value = true
  try {
    await api.put(`/customers/${passwordTarget.value.id}/update-password`, { password: newPassword.value })
    toast.success('Password berhasil diperbarui')
    showPasswordModal.value = false
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengubah password')
  } finally {
    savingPassword.value = false
  }
}

// Category update modal
const showCategoryModal = ref(false)
const categoryTarget = ref<Customer | null>(null)
const newCategoryId = ref('')
const savingCategory = ref(false)

function openCategoryModal(c: Customer) {
  categoryTarget.value = c
  newCategoryId.value = c.customer_category_id || ''
  showCategoryModal.value = true
}

async function handleUpdateCategory() {
  if (!categoryTarget.value) return
  savingCategory.value = true
  try {
    await api.put(`/customers/${categoryTarget.value.id}/update-category`, { customer_category_id: newCategoryId.value })
    toast.success('Kategori berhasil diperbarui')
    showCategoryModal.value = false
    fetchCustomers()
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengubah kategori')
  } finally {
    savingCategory.value = false
  }
}

async function fetchCustomers() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
      type: 'customer',
    }
    if (search.value) params.search = search.value
    if (filterStatus.value) params.status = filterStatus.value
    if (filterCategory.value.size) params.category_ids = Array.from(filterCategory.value).join(',')
    if (filterStore.value.size) params.store_ids = Array.from(filterStore.value).join(',')
    if (filterDate.value.from) params.date_from = filterDate.value.from
    if (filterDate.value.to) params.date_to = filterDate.value.to

    const res = await api.get<{ data: PaginatedCustomers }>('/customers/index', params)
    customers.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  } catch {
    customers.value = []
  } finally {
    loading.value = false
  }
}

async function fetchCategories() {
  try {
    const res = await api.get<{ data: CategoryOption[] }>('/customers/categories/index')
    categories.value = res.data || []
  } catch {
    categories.value = []
  }
}

async function fetchStores() {
  try {
    const res = await api.get<{ data: StoreOption[] }>('/customers/stores/index')
    stores.value = res.data || []
  } catch {
    stores.value = []
  }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchCustomers() }, 300)
}

function onStatusFilter(status: string) { filterStatus.value = status; page.value = 1; fetchCustomers() }
function onCategoryFilter(id: string) {
  if (!id) filterCategory.value.clear()
  else if (filterCategory.value.has(id)) filterCategory.value.delete(id)
  else filterCategory.value.add(id)
  page.value = 1; fetchCustomers()
}
function onStoreFilter(id: string) {
  if (!id) filterStore.value.clear()
  else if (filterStore.value.has(id)) filterStore.value.delete(id)
  else filterStore.value.add(id)
  page.value = 1; fetchCustomers()
}
function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1; fetchCustomers()
}

function onPageChange(p: number) {
  page.value = p
  fetchCustomers()
}

function onPerPageChange(pp: number) {
  perPage.value = pp
  page.value = 1
  fetchCustomers()
}

async function toggleStatus(customer: Customer) {
  const newStatus = customer.status === 'active' ? 'inactive' : 'active'
  try {
    await api.put(`/customers/${customer.id}/update-status`, { status: newStatus })
    customer.status = newStatus
    toast.success(`Status diubah ke ${statusConfig[newStatus]?.label || newStatus}`)
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status')
  }
}

async function bulkUpdateStatus(status: string) {
  const ids = Array.from(selectedIds.value)
  if (!ids.length) return
  try {
    await api.put(`/customers/${ids[0]}/update-status-massive`, { ids, status })
    toast.success(`${ids.length} pelanggan status diubah ke ${statusConfig[status]?.label || status}`)
    selectedIds.value.clear()
    fetchCustomers()
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status massal')
  }
}

async function handleDelete(customer: Customer) {
  const ok = await confirm({ title: 'Hapus Pelanggan', message: `Yakin ingin menghapus pelanggan "${customer.name}"?`, confirmText: 'Hapus', variant: 'danger' })
  if (!ok) return
  try {
    await api.delete(`/customers/${customer.id}`)
    toast.success('Pelanggan berhasil dihapus')
    fetchCustomers()
  } catch (err: any) {
    toast.error(err.message || 'Gagal menghapus pelanggan')
  }
}

async function bulkDelete() {
  const ids = Array.from(selectedIds.value)
  if (!ids.length) return
  const ok = await confirm({ title: 'Hapus Massal', message: `Yakin ingin menghapus ${ids.length} pelanggan?`, confirmText: 'Hapus', variant: 'danger' })
  if (!ok) return
  try {
    await api.post('/customers/delete-mass', { ids })
    toast.success(`${ids.length} pelanggan berhasil dihapus`)
    selectedIds.value.clear()
    fetchCustomers()
  } catch (err: any) {
    toast.error(err.message || 'Gagal menghapus pelanggan')
  }
}

const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, page.value - 2)
  const end = Math.min(totalPage.value, page.value + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

onMounted(() => {
  fetchCustomers()
  fetchCategories()
  fetchStores()
  document.addEventListener('click', closeMenu)
})
onUnmounted(() => { document.removeEventListener('click', closeMenu) })
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Pelanggan</h1>
        <p class="mt-1 text-sm text-gray-500">{{ total }} pelanggan</p>
      </div>
      <NuxtLink
        to="/contact/create?type=customer"
        class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
      >
        <Plus class="h-4 w-4" />
        Tambah Pelanggan
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <!-- Filter rows -->
      <div class="mb-3 space-y-2.5">
        <!-- Status -->
        <div class="flex items-center gap-2">
          <span class="w-16 shrink-0 text-xs text-gray-400">Status</span>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="tab in statusTabs"
              :key="tab.key"
              class="rounded-md px-2.5 py-1 text-xs font-medium transition-all"
              :class="filterStatus === tab.key
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
              @click="onStatusFilter(tab.key)"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- Category -->
        <div v-if="categories.length" class="flex items-start gap-2">
          <span class="w-16 shrink-0 pt-1 text-xs text-gray-400">Kategori</span>
          <div class="flex flex-wrap gap-1">
            <button
              class="rounded-md px-2.5 py-1 text-xs font-medium transition-all"
              :class="filterCategory.size === 0
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
              @click="onCategoryFilter('')"
            >
              Semua
            </button>
            <button
              v-for="cat in categories"
              :key="cat.id"
              class="rounded-md px-2.5 py-1 text-xs font-medium transition-all"
              :class="filterCategory.has(cat.id)
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
              @click="onCategoryFilter(cat.id)"
            >
              {{ cat.name }}
              <span class="ml-0.5 text-[10px] tabular-nums" :class="filterCategory.has(cat.id) ? 'text-blue-400' : 'text-gray-300'">{{ cat.customer_count }}</span>
            </button>
          </div>
        </div>

        <!-- Store -->
        <div v-if="stores.length" class="flex items-start gap-2">
          <span class="w-16 shrink-0 pt-1 text-xs text-gray-400">Toko</span>
          <div class="flex flex-wrap gap-1">
            <button
              class="rounded-md px-2.5 py-1 text-xs font-medium transition-all"
              :class="filterStore.size === 0
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
              @click="onStoreFilter('')"
            >
              Semua
            </button>
            <button
              v-for="store in stores"
              :key="store.id"
              class="rounded-md px-2.5 py-1 text-xs font-medium transition-all"
              :class="filterStore.has(store.id)
                ? 'bg-violet-50 text-violet-600'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
              @click="onStoreFilter(store.id)"
            >
              {{ store.name }}
              <span class="ml-0.5 text-[10px] tabular-nums" :class="filterStore.has(store.id) ? 'text-violet-400' : 'text-gray-300'">{{ store.customer_count }}</span>
            </button>
          </div>
        </div>

        <!-- Date Range -->
        <div class="flex items-center gap-2">
          <span class="w-16 shrink-0 text-xs text-gray-400">Tanggal</span>
          <AppDateRangePicker :model-value="filterDate" @update:model-value="onDateFilter" />
        </div>
      </div>
      <!-- Search -->
      <div class="relative">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari nama, email, telepon..."
          class="w-full rounded-lg border-0 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:bg-gray-100 focus:outline-none focus:ring-0"
          @input="onSearch"
        />
      </div>
    </div> 

    <!-- Bulk actions -->
    <div v-if="selectedIds.size > 0" class="flex items-center gap-3 rounded-lg bg-primary-50 px-4 py-2.5 ring-1 ring-primary-200">
      <span class="text-sm font-medium text-primary-700">{{ selectedIds.size }} dipilih</span>
      <button class="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700" @click="bulkUpdateStatus('active')">Aktifkan</button>
      <button class="rounded-lg bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700" @click="bulkUpdateStatus('inactive')">Nonaktifkan</button>
      <button class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700" @click="bulkDelete">Hapus</button>
      <button class="ml-auto text-xs font-medium text-gray-500 hover:text-gray-700" @click="selectedIds.clear()">Batal</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <div v-for="i in 5" :key="i" class="flex animate-pulse items-center gap-4 border-b border-gray-100 px-4 py-3.5 last:border-b-0">
        <div class="h-4 w-4 rounded bg-gray-200" />
        <div class="flex-1 space-y-2">
          <div class="h-4 w-48 rounded bg-gray-200" />
          <div class="h-3 w-32 rounded bg-gray-200" />
        </div>
        <div class="h-6 w-16 rounded-full bg-gray-200" />
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!customers.length" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <Users class="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p class="text-gray-500">{{ search || filterStatus || filterCategory || filterStore ? 'Tidak ada pelanggan yang cocok' : 'Belum ada pelanggan.' }}</p>
    </div>

    <!-- List -->
    <div v-else class="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <table class="w-full">
        <thead class="hidden sm:table-header-group">
          <tr class="border-b border-gray-200 bg-gray-50">
            <th class="w-10 py-2.5 pl-4 pr-2 text-left">
              <input v-model="selectAll" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            </th>
            <th class="py-2.5 pr-3 text-left text-xs font-medium text-gray-500">Nama</th>
            <th class="w-[200px] py-2.5 pr-3 text-left text-xs font-medium text-gray-500">Kontak</th>
            <th class="w-[120px] py-2.5 pr-3 text-left text-xs font-medium text-gray-500">Kategori</th>
            <th class="w-[100px] py-2.5 pr-3 text-right text-xs font-medium text-gray-500">Poin</th>
            <th class="w-[80px] py-2.5 pr-3 text-left text-xs font-medium text-gray-500">Status</th>
            <th class="w-[88px] py-2.5 pr-4" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="customer in customers"
            :key="customer.id"
            class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50"
          >
            <td class="py-3 pl-4 pr-2 align-middle">
              <input :checked="selectedIds.has(customer.id)" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" @change="selectedIds.has(customer.id) ? selectedIds.delete(customer.id) : selectedIds.add(customer.id)" />
            </td>

            <td class="py-3 pr-3 align-middle">
              <div class="flex flex-wrap items-center gap-1.5">
                <NuxtLink :to="`/contact/${customer.id}`" class="text-sm font-semibold text-gray-900 hover:text-primary-600">{{ customer.name }}</NuxtLink>
                <span v-if="customer.external_id" class="text-xs text-gray-400">#{{ customer.external_id }}</span>
              </div>
              <p v-if="customer.username" class="mt-0.5 text-xs text-gray-400">@{{ customer.username }}</p>
            </td>

            <td class="hidden py-3 pr-3 align-middle sm:table-cell">
              <p v-if="customer.email" class="truncate text-xs text-gray-600">{{ customer.email }}</p>
              <p v-if="customer.phone" class="truncate text-xs text-gray-400">{{ customer.phone }}</p>
              <span v-if="!customer.email && !customer.phone" class="text-xs text-gray-400">-</span>
            </td>

            <td class="hidden py-3 pr-3 align-middle sm:table-cell">
              <span v-if="customer.category" class="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{{ customer.category.name }}</span>
              <span v-else class="text-xs text-gray-400">-</span>
            </td>

            <td class="hidden py-3 pr-3 text-right align-middle sm:table-cell">
              <span class="text-sm font-medium text-gray-900">{{ Number(customer.reward_points || 0).toLocaleString('id-ID') }}</span>
            </td>

            <td class="hidden py-3 pr-3 align-middle sm:table-cell">
              <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :class="statusConfig[customer.status]?.color || 'bg-gray-100 text-gray-500'">{{ statusConfig[customer.status]?.label || customer.status }}</span>
            </td>

            <td class="py-3 pr-4 align-middle">
              <div class="flex items-center justify-end gap-0.5">
                <button class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" title="Toggle Status" @click="toggleStatus(customer)">
                  <ToggleRight v-if="customer.status === 'active'" class="h-5 w-5 text-green-500" />
                  <ToggleLeft v-else class="h-5 w-5 text-gray-400" />
                </button>
                <div class="relative">
                  <button class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" @click.stop="toggleMenu(customer.id)">
                    <EllipsisVertical class="h-4 w-4" />
                  </button>
                  <Transition enter-active-class="transition duration-100 ease-out" enter-from-class="scale-95 opacity-0" enter-to-class="scale-100 opacity-100" leave-active-class="transition duration-75 ease-in" leave-from-class="scale-100 opacity-100" leave-to-class="scale-95 opacity-0">
                    <div v-if="openMenuId === customer.id" class="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg bg-white py-1 shadow-lg ring-1 ring-gray-200">
                      <NuxtLink :to="`/contact/${customer.id}`" class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="closeMenu">
                        <Eye class="h-3.5 w-3.5" /> Lihat Detail
                      </NuxtLink>
                      <NuxtLink :to="`/contact/${customer.id}/edit`" class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="closeMenu">
                        <Pencil class="h-3.5 w-3.5" /> Edit
                      </NuxtLink>
                      <button class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="openCategoryModal(customer); closeMenu()">
                        <Tag class="h-3.5 w-3.5" /> Ubah Kategori
                      </button>
                      <button class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="openPasswordModal(customer); closeMenu()">
                        <KeyRound class="h-3.5 w-3.5" /> Ubah Password
                      </button>
                      <button class="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50" @click="handleDelete(customer); closeMenu()">
                        <Trash2 class="h-3.5 w-3.5" /> Hapus
                      </button>
                    </div>
                  </Transition>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <AppPagination
      v-if="totalPage > 1"
      :page="page"
      :total-page="totalPage"
      :total="total"
      :per-page="perPage"
      :loading="loading"
      :show-per-page="false"
      @update:page="onPageChange"
      @update:per-page="onPerPageChange"
    />

    <!-- Password Modal -->
    <Teleport to="body">
      <div v-if="showPasswordModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @mousedown.self="showPasswordModal = false">
        <div class="flex w-full max-w-sm flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
          <div class="shrink-0 border-b border-gray-100 px-6 py-4">
            <h2 class="text-lg font-semibold text-gray-900">Ubah Password</h2>
            <p class="mt-0.5 text-sm text-gray-500">{{ passwordTarget?.name }}</p>
          </div>
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Password Baru <span class="text-red-500">*</span></label>
            <input v-model="newPassword" type="password" class="form-input" placeholder="Min. 8 karakter" />
          </div>
          <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="showPasswordModal = false">Batal</button>
            <button type="button" :disabled="savingPassword || newPassword.length < 8" class="flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50" @click="handleUpdatePassword">
              <Loader2 v-if="savingPassword" class="h-4 w-4 animate-spin" />
              {{ savingPassword ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Category Modal -->
    <Teleport to="body">
      <div v-if="showCategoryModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @mousedown.self="showCategoryModal = false">
        <div class="flex w-full max-w-sm flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
          <div class="shrink-0 border-b border-gray-100 px-6 py-4">
            <h2 class="text-lg font-semibold text-gray-900">Ubah Kategori</h2>
            <p class="mt-0.5 text-sm text-gray-500">{{ categoryTarget?.name }}</p>
          </div>
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Kategori <span class="text-red-500">*</span></label>
            <select v-model="newCategoryId" class="form-input">
              <option value="" disabled>Pilih kategori</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="showCategoryModal = false">Batal</button>
            <button type="button" :disabled="savingCategory || !newCategoryId" class="flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50" @click="handleUpdateCategory">
              <Loader2 v-if="savingCategory" class="h-4 w-4 animate-spin" />
              {{ savingCategory ? 'Menyimpan...' : 'Simpan' }}
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
