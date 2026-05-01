<script setup lang="ts">
import {
  Plus, Search, Eye, Pencil, Trash2, Users, EllipsisVertical,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Customer {
  id: string
  store_id: string
  external_id: string
  name: string
  phone: string
  email: string
  type: string
  created_at: string
  updated_at: string
}

interface PaginatedCustomers {
  data: Customer[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(true)
const suppliers = ref<Customer[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)
const search = ref('')

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
  get: () => suppliers.value.length > 0 && suppliers.value.every(c => selectedIds.value.has(c.id)),
  set: (val: boolean) => {
    if (val) suppliers.value.forEach(c => selectedIds.value.add(c.id))
    else selectedIds.value.clear()
  },
})

async function fetchSuppliers() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
      type: 'supplier',
    }
    if (search.value) params.search = search.value

    const res = await api.get<{ data: PaginatedCustomers }>('/customers/index', params)
    suppliers.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  } catch {
    suppliers.value = []
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchSuppliers() }, 300)
}

function onPageChange(p: number) {
  page.value = p
  fetchSuppliers()
}

function onPerPageChange(pp: number) {
  perPage.value = pp
  page.value = 1
  fetchSuppliers()
}

async function handleDelete(supplier: Customer) {
  const ok = await confirm({ title: 'Hapus Supplier', message: `Yakin ingin menghapus supplier "${supplier.name}"?`, confirmText: 'Hapus', variant: 'danger' })
  if (!ok) return
  try {
    await api.delete(`/customers/${supplier.id}`)
    toast.success('Supplier berhasil dihapus')
    fetchSuppliers()
  } catch (err: any) {
    toast.error(err.message || 'Gagal menghapus supplier')
  }
}

async function bulkDelete() {
  const ids = Array.from(selectedIds.value)
  if (!ids.length) return
  const ok = await confirm({ title: 'Hapus Massal', message: `Yakin ingin menghapus ${ids.length} supplier?`, confirmText: 'Hapus', variant: 'danger' })
  if (!ok) return
  try {
    await api.post('/customers/delete-mass', { ids })
    toast.success(`${ids.length} supplier berhasil dihapus`)
    selectedIds.value.clear()
    fetchSuppliers()
  } catch (err: any) {
    toast.error(err.message || 'Gagal menghapus supplier')
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
  fetchSuppliers()
  document.addEventListener('click', closeMenu)
})
onUnmounted(() => { document.removeEventListener('click', closeMenu) })
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Supplier</h1>
        <p class="mt-1 text-sm text-gray-500">{{ total }} supplier</p>
      </div>
      <NuxtLink
        to="/contact/create?type=supplier"
        class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
      >
        <Plus class="h-4 w-4" />
        Tambah Supplier
      </NuxtLink>
    </div>

    <!-- Search -->
    <div class="flex flex-col gap-3 sm:flex-row">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari nama, email, telepon..."
          class="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          @input="onSearch"
        />
      </div>
    </div>

    <!-- Bulk actions -->
    <div v-if="selectedIds.size > 0" class="flex items-center gap-3 rounded-lg bg-primary-50 px-4 py-2.5 ring-1 ring-primary-200">
      <span class="text-sm font-medium text-primary-700">{{ selectedIds.size }} dipilih</span>
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
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!suppliers.length" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <Users class="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p class="text-gray-500">{{ search ? 'Tidak ada supplier yang cocok' : 'Belum ada supplier.' }}</p>
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
            <th class="w-[88px] py-2.5 pr-4" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="supplier in suppliers"
            :key="supplier.id"
            class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50"
          >
            <td class="py-3 pl-4 pr-2 align-middle">
              <input :checked="selectedIds.has(supplier.id)" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" @change="selectedIds.has(supplier.id) ? selectedIds.delete(supplier.id) : selectedIds.add(supplier.id)" />
            </td>

            <td class="py-3 pr-3 align-middle">
              <div class="flex flex-wrap items-center gap-1.5">
                <NuxtLink :to="`/contact/${supplier.id}`" class="text-sm font-semibold text-gray-900 hover:text-primary-600">{{ supplier.name }}</NuxtLink>
                <span v-if="supplier.external_id" class="text-xs text-gray-400">#{{ supplier.external_id }}</span>
              </div>
            </td>

            <td class="hidden py-3 pr-3 align-middle sm:table-cell">
              <p v-if="supplier.email" class="truncate text-xs text-gray-600">{{ supplier.email }}</p>
              <p v-if="supplier.phone" class="truncate text-xs text-gray-400">{{ supplier.phone }}</p>
              <span v-if="!supplier.email && !supplier.phone" class="text-xs text-gray-400">-</span>
            </td>

            <td class="py-3 pr-4 align-middle">
              <div class="flex items-center justify-end gap-0.5">
                <div class="relative">
                  <button class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" @click.stop="toggleMenu(supplier.id)">
                    <EllipsisVertical class="h-4 w-4" />
                  </button>
                  <Transition enter-active-class="transition duration-100 ease-out" enter-from-class="scale-95 opacity-0" enter-to-class="scale-100 opacity-100" leave-active-class="transition duration-75 ease-in" leave-from-class="scale-100 opacity-100" leave-to-class="scale-95 opacity-0">
                    <div v-if="openMenuId === supplier.id" class="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg bg-white py-1 shadow-lg ring-1 ring-gray-200">
                      <NuxtLink :to="`/contact/${supplier.id}`" class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="closeMenu">
                        <Eye class="h-3.5 w-3.5" /> Lihat Detail
                      </NuxtLink>
                      <NuxtLink :to="`/contact/${supplier.id}/edit`" class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="closeMenu">
                        <Pencil class="h-3.5 w-3.5" /> Edit
                      </NuxtLink>
                      <button class="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50" @click="handleDelete(supplier); closeMenu()">
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
  </div>
</template>
