<script setup lang="ts">
import {
  Plus, Search, Pencil, Trash2, Package, Eye,
  Image as ImageIcon,
  ToggleLeft, ToggleRight, Loader2, EllipsisVertical, Filter,
  X,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface CategoryRef {
  id: string
  name: string
  slug: string
}

interface MediaFile {
  id: string
  file_url: string
  size: string
}

interface Product {
  id: string
  product_category_id: string
  name: string
  slug: string
  description: string
  short_description: string
  thumbnail: string
  thumbnail_media: MediaFile[] | null
  images: string[]
  variant1: string
  variant2: string
  tags: string[]
  type: string
  status: string
  sku_count: number
  stock_available: number
  price_min: number
  price_max: number
  category: CategoryRef | null
  created_at: string
  updated_at: string
}

interface SkuItem {
  id: string
  sku: string
  variants: { name: string; value: string }[]
  weight: number
  is_preorder: boolean
  buffer_stock: number
  rewards_point: string
  stock_available: number
  status: string
  prices: {
    id: string
    customer_category_id: string
    customer_category_name?: string
    price: string
  }[]
}

interface PaginatedProducts {
  data: Product[]
  page: number
  per_page: number
  total_page: number
  total: number
}

interface CategoryOption {
  id: string
  name: string
  children: { id: string; name: string }[] | null
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

// List state
const loading = ref(true)
const products = ref<Product[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)
const search = ref('')
const filterStatus = ref('')
const filterCategory = ref('')

// Categories for filter
const categories = ref<CategoryOption[]>([])

// SKU expand state
const expandedSkus = ref<Set<string>>(new Set())
const skuData = ref<Record<string, SkuItem[]>>({})
const skuLoading = ref<Set<string>>(new Set())

// SKU price expand state
const expandedSkuPrices = ref<Set<string>>(new Set())

// Product action menu state
const openMenuId = ref<string | null>(null)

// Toggling status loading
const togglingStatus = ref<Set<string>>(new Set())

// Bulk selection
const selectedIds = ref<Set<string>>(new Set())
const bulkLoading = ref(false)

const isAllSelected = computed(() =>
  products.value.length > 0 && products.value.every(p => selectedIds.value.has(p.id)),
)
const isSomeSelected = computed(() =>
  selectedIds.value.size > 0 && !isAllSelected.value,
)

function toggleSelect(id: string) {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value.clear()
  } else {
    for (const p of products.value) selectedIds.value.add(p.id)
  }
}

function clearSelection() {
  selectedIds.value = new Set()
}

function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id
}

function closeMenu() {
  openMenuId.value = null
}

const statusTabs = computed(() => [
  { key: '', label: 'Semua', count: null },
  { key: 'active', label: 'Aktif' },
  { key: 'inactive', label: 'Nonaktif' },
  { key: 'draft', label: 'Draft' },
])

const statusConfig: Record<string, { label: string; dot: string; bg: string }> = {
  active: { label: 'Aktif', dot: 'bg-green-500', bg: 'bg-green-50 text-green-700 ring-green-200' },
  inactive: { label: 'Nonaktif', dot: 'bg-gray-400', bg: 'bg-gray-50 text-gray-600 ring-gray-200' },
  draft: { label: 'Draft', dot: 'bg-yellow-500', bg: 'bg-yellow-50 text-yellow-700 ring-yellow-200' },
}

async function fetchProducts() {
  loading.value = true
  clearSelection()
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    if (filterStatus.value) params.status = filterStatus.value
    if (filterCategory.value) params.category_id = filterCategory.value

    const res = await api.get<{ data: PaginatedProducts }>('/products/index', params)
    products.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch {
    products.value = []
  }
  finally {
    loading.value = false
  }
}

async function fetchCategories() {
  try {
    const res = await api.get<{ data: CategoryOption[] }>('/products/categories/index')
    categories.value = res.data || []
  }
  catch {
    categories.value = []
  }
}

// Toggle SKU expand
async function toggleSkus(product: Product) {
  const id = product.id
  if (expandedSkus.value.has(id)) {
    expandedSkus.value.delete(id)
    return
  }

  expandedSkus.value.add(id)

  // Only fetch if not already loaded
  if (!skuData.value[id]) {
    skuLoading.value.add(id)
    try {
      const res = await api.get<{ data: SkuItem[] | null }>(`/products/${id}/skus`)
      skuData.value[id] = res.data || []
    }
    catch {
      skuData.value[id] = []
    }
    finally {
      skuLoading.value.delete(id)
    }
  }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchProducts()
  }, 300)
}

function onStatusFilter(status: string) {
  filterStatus.value = status
  page.value = 1
  fetchProducts()
}

function onCategoryFilter() {
  page.value = 1
  fetchProducts()
}

function onPageChange(p: number) {
  page.value = p
  fetchProducts()
}

function onPerPageChange(pp: number) {
  perPage.value = pp
  page.value = 1
  fetchProducts()
}

function formatPrice(val: number | string): string {
  return new Intl.NumberFormat('id-ID').format(Number(val))
}

// Delete
async function handleDelete(product: Product) {
  const ok = await confirm({
    title: 'Hapus Produk',
    message: `Hapus produk "${product.name}"? Semua SKU dan harga terkait akan ikut terhapus.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/products/${product.id}`)
    toast.success('Produk berhasil dihapus')
    await fetchProducts()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus produk')
  }
}

// Toggle status
async function toggleStatus(product: Product) {
  const newStatus = product.status === 'active' ? 'inactive' : 'active'
  togglingStatus.value.add(product.id)
  try {
    await api.put(`/products/${product.id}/update-status`, { status: newStatus })
    product.status = newStatus
    toast.success(`Status diubah ke ${statusConfig[newStatus]?.label || newStatus}`)
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status')
  }
  finally {
    togglingStatus.value.delete(product.id)
  }
}

// Toggle SKU status
async function toggleSkuStatus(productId: string, sku: SkuItem) {
  const newStatus = sku.status === 'active' ? 'inactive' : 'active'
  try {
    await api.put(`/products/${sku.id}/update-sku-status`, { status: newStatus })
    sku.status = newStatus
    toast.success(`Status SKU diubah ke ${newStatus === 'active' ? 'Aktif' : 'Nonaktif'}`)
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status SKU')
  }
}

// Bulk update status
async function handleBulkStatus(newStatus: string) {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  const label = statusConfig[newStatus]?.label || newStatus
  const ok = await confirm({
    title: 'Ubah Status Massal',
    message: `Ubah status ${ids.length} produk menjadi "${label}"?`,
    confirmText: 'Ya, Ubah',
  })
  if (!ok) return

  bulkLoading.value = true
  try {
    await api.put('/products/update-status-mass', { ids, status: newStatus })
    toast.success(`${ids.length} produk berhasil diubah ke ${label}`)
    clearSelection()
    await fetchProducts()
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status massal')
  } finally {
    bulkLoading.value = false
  }
}

// Bulk delete
async function handleBulkDelete() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  const ok = await confirm({
    title: 'Hapus Massal',
    message: `Hapus ${ids.length} produk beserta semua SKU dan harga terkait? Tindakan ini tidak bisa dibatalkan.`,
    confirmText: 'Hapus Semua',
    variant: 'danger',
  })
  if (!ok) return

  bulkLoading.value = true
  try {
    await api.post('/products/delete-mass', { ids })
    toast.success(`${ids.length} produk berhasil dihapus`)
    clearSelection()
    await fetchProducts()
  } catch (err: any) {
    toast.error(err.message || 'Gagal menghapus massal')
  } finally {
    bulkLoading.value = false
  }
}

// Flatten categories for select
const categorySelectOptions = computed(() => {
  const opts: { id: string; name: string; isChild: boolean }[] = []
  for (const cat of categories.value) {
    opts.push({ id: cat.id, name: cat.name, isChild: false })
    if (cat.children) {
      for (const child of cat.children) {
        opts.push({ id: child.id, name: child.name, isChild: true })
      }
    }
  }
  return opts
})

// Visible pages for pagination
const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, page.value - 2)
  const end = Math.min(totalPage.value, page.value + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

function getThumb(product: Product): string {
  return product.thumbnail_media?.find(f => f.size === 'small')?.file_url
    || product.thumbnail_media?.[0]?.file_url || ''
}

onMounted(() => {
  fetchProducts()
  fetchCategories()
  document.addEventListener('click', closeMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Master Produk</h1>
      </div>
      <NuxtLink
        to="/product/create"
        class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
      >
        <Plus class="h-4 w-4" />
        Tambah Produk
      </NuxtLink>
    </div>

    <!-- Main card -->
    <div class="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <!-- Status tabs (like TikTok Shop) -->
      <div class="flex items-center gap-0 overflow-x-auto border-b border-gray-200">
        <button
          v-for="tab in statusTabs"
          :key="tab.key"
          class="relative shrink-0 whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors"
          :class="filterStatus === tab.key
            ? 'text-primary-600'
            : 'text-gray-500 hover:text-gray-700'"
          @click="onStatusFilter(tab.key)"
        >
          {{ tab.label }}
          <span v-if="tab.count !== undefined" class="ml-1 text-xs text-gray-400">{{ tab.count }}</span>
          <span
            v-if="filterStatus === tab.key"
            class="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-primary-600"
          />
        </button>
      </div>

      <!-- Search + filters row -->
      <div class="flex flex-col gap-2.5 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="search"
            type="text"
            placeholder="Nama produk, ID, atau SKU"
            class="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
            @input="onSearch"
          />
        </div>
        <div class="flex items-center gap-2">
          <select
            v-model="filterCategory"
            class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20 sm:w-48"
            @change="onCategoryFilter"
          >
            <option value="">Kategori</option>
            <option v-for="opt in categorySelectOptions" :key="opt.id" :value="opt.id">
              {{ opt.isChild ? `\u00A0\u00A0\u00A0${opt.name}` : opt.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Bulk action bar -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="-translate-y-2 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="-translate-y-2 opacity-0"
      >
        <div
          v-if="selectedIds.size > 0"
          class="flex flex-wrap items-center gap-2 border-b border-primary-100 bg-primary-50/60 px-4 py-2.5"
        >
          <span class="text-sm font-medium text-primary-700">{{ selectedIds.size }} dipilih</span>
          <div class="mx-1 h-4 w-px bg-primary-200" />
          <button
            :disabled="bulkLoading"
            class="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            @click="handleBulkStatus('active')"
          >
            <ToggleRight class="h-3.5 w-3.5" />
            Aktifkan
          </button>
          <button
            :disabled="bulkLoading"
            class="inline-flex items-center gap-1.5 rounded-lg bg-gray-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
            @click="handleBulkStatus('inactive')"
          >
            <ToggleLeft class="h-3.5 w-3.5" />
            Nonaktifkan
          </button>
          <button
            :disabled="bulkLoading"
            class="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            @click="handleBulkDelete"
          >
            <Trash2 class="h-3.5 w-3.5" />
            Hapus
          </button>
          <Loader2 v-if="bulkLoading" class="h-4 w-4 animate-spin text-primary-500" />
          <button
            class="ml-auto rounded-lg p-1 text-primary-400 transition-colors hover:bg-primary-100 hover:text-primary-600"
            title="Batal pilih"
            @click="clearSelection"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </Transition>

      <!-- Table header -->
      <div class="hidden border-b border-gray-200 bg-gray-50/80 md:block">
        <div class="grid grid-cols-[40px_1fr_100px_100px_140px_110px_100px] items-center gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">
          <label class="flex cursor-pointer items-center justify-center">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500/20"
              :checked="isAllSelected"
              :indeterminate="isSomeSelected"
              @change="toggleSelectAll"
            />
          </label>
          <span>Produk</span>
          <span>SKU</span>
          <span>Stok</span>
          <span>Harga Jual</span>
          <span>Status</span>
          <span class="text-right">Tindakan</span>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading">
        <div v-for="i in 5" :key="i" class="flex animate-pulse items-center gap-4 border-b border-gray-100 px-4 py-4 last:border-b-0">
          <div class="h-14 w-14 rounded-lg bg-gray-200" />
          <div class="flex-1 space-y-2">
            <div class="h-4 w-52 rounded bg-gray-200" />
            <div class="h-3 w-36 rounded bg-gray-200" />
          </div>
          <div class="hidden h-4 w-12 rounded bg-gray-200 md:block" />
          <div class="hidden h-4 w-24 rounded bg-gray-200 md:block" />
          <div class="hidden h-6 w-16 rounded-full bg-gray-200 md:block" />
          <div class="h-8 w-20 rounded bg-gray-200" />
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="!products.length" class="px-4 py-16 text-center">
        <Package class="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <p class="text-sm text-gray-500">
          {{ search || filterStatus || filterCategory ? 'Tidak ada produk yang cocok dengan filter.' : 'Belum ada produk. Mulai tambahkan produk pertama.' }}
        </p>
        <NuxtLink
          v-if="!search && !filterStatus && !filterCategory"
          to="/product/create"
          class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <Plus class="h-3.5 w-3.5" />
          Tambah Produk
        </NuxtLink>
      </div>

      <!-- Product rows -->
      <div v-else>
        <div
          v-for="product in products"
          :key="product.id"
          class="border-b border-gray-100 last:border-b-0"
        >
          <!-- Product row — desktop table / mobile stack -->
          <div class="grid grid-cols-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50/50 md:grid-cols-[40px_1fr_100px_100px_140px_110px_100px] md:gap-2">
            <!-- Checkbox cell -->
            <label class="hidden cursor-pointer items-center justify-center md:flex">
              <input
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500/20"
                :checked="selectedIds.has(product.id)"
                @change="toggleSelect(product.id)"
              />
            </label>

            <!-- Produk cell -->
            <div class="flex items-center gap-3">
              <!-- Mobile checkbox -->
              <label class="flex cursor-pointer items-center md:hidden">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500/20"
                  :checked="selectedIds.has(product.id)"
                  @change="toggleSelect(product.id)"
                />
              </label>
              <!-- Thumbnail -->
              <NuxtLink :to="`/product/${product.id}`" class="shrink-0">
                <div class="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200/60">
                  <img
                    v-if="getThumb(product)"
                    :src="getThumb(product)"
                    :alt="product.name"
                    class="h-full w-full object-cover"
                  />
                  <ImageIcon v-else class="h-5 w-5 text-gray-300" />
                </div>
              </NuxtLink>

              <div class="min-w-0 flex-1">
                <NuxtLink
                  :to="`/product/${product.id}`"
                  class="line-clamp-2 text-sm font-medium text-gray-900 hover:text-primary-600"
                >
                  {{ product.name }}
                </NuxtLink>
                <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span v-if="product.category" class="text-xs text-gray-400">{{ product.category.name }}</span>
                  <span
                    v-if="product.type === 'slave'"
                    class="inline-flex rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700"
                  >
                    Slave
                  </span>
                </div>
              </div>
            </div>

            <!-- SKU count cell -->
            <div class="hidden md:block cursor-pointer" @click="toggleSkus(product)">
              <span class="text-sm text-gray-700">{{ product.sku_count }}</span>
            </div>

            <!-- Stok cell -->
            <div @click="toggleSkus(product)" class="hidden md:block">
              <span
                class="text-sm font-medium"
                :class="product.stock_available > 0 ? 'text-gray-900' : 'text-red-500'"
              >
                {{ product.stock_available.toLocaleString('id-ID') }}
              </span>
            </div>

            <!-- Harga cell -->
            <div @click="toggleSkus(product)" class="cursor-pointer">
              <div class="hidden text-sm font-medium text-gray-900 md:block">
                <template v-if="product.price_min || product.price_max">
                  Rp{{ formatPrice(product.price_min) }}
                  <template v-if="product.price_min !== product.price_max">
                    <span class="font-normal text-gray-400"> - </span>
                    Rp{{ formatPrice(product.price_max) }}
                  </template>
                </template>
                <span v-else class="text-gray-400">-</span>
              </div>
              <!-- Mobile: show SKU + price inline -->
              <div class="flex items-center gap-3 text-xs text-gray-500 md:hidden">
                <span>{{ product.sku_count }} SKU</span>
                <span v-if="product.price_min || product.price_max">
                  Rp{{ formatPrice(product.price_min) }}
                  <template v-if="product.price_min !== product.price_max">
                    – Rp{{ formatPrice(product.price_max) }}
                  </template>
                </span>
              </div>
            </div>

            <!-- Status cell -->
            <div class="hidden md:block">
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1"
                :class="statusConfig[product.status]?.bg || 'bg-gray-50 text-gray-500 ring-gray-200'"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="statusConfig[product.status]?.dot || 'bg-gray-400'" />
                {{ statusConfig[product.status]?.label || product.status }}
              </span>
            </div>

            <!-- Actions cell -->
            <div class="flex items-center justify-end gap-1">
              <!-- Toggle status -->
              <button
                :disabled="togglingStatus.has(product.id)"
                class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                title="Toggle Status"
                @click="toggleStatus(product)"
              >
                <Loader2 v-if="togglingStatus.has(product.id)" class="h-4 w-4 animate-spin" />
                <ToggleRight v-else-if="product.status === 'active'" class="h-4 w-4 text-green-500" />
                <ToggleLeft v-else class="h-4 w-4 text-gray-400" />
              </button> 
              <!-- More menu -->
              <div class="relative">
                <button
                  class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  @click.stop="toggleMenu(product.id)"
                >
                  <EllipsisVertical class="h-4 w-4" />
                </button>
                <Transition
                  enter-active-class="transition duration-100 ease-out"
                  enter-from-class="scale-95 opacity-0"
                  enter-to-class="scale-100 opacity-100"
                  leave-active-class="transition duration-75 ease-in"
                  leave-from-class="scale-100 opacity-100"
                  leave-to-class="scale-95 opacity-0"
                >
                  <div
                    v-if="openMenuId === product.id"
                    class="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg bg-white py-1 shadow-lg ring-1 ring-gray-200"
                  >
                    <NuxtLink
                      :to="`/product/${product.id}`"
                      class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      @click="closeMenu"
                    >
                      <Eye class="h-4 w-4 text-gray-400" />
                      Lihat Detail
                    </NuxtLink>
                    <NuxtLink
                      :to="`/product/${product.id}/edit`"
                      class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      @click="closeMenu"
                    >
                      <Pencil class="h-4 w-4 text-gray-400" />
                      Edit Detail
                    </NuxtLink>
                    <NuxtLink
                      :to="`/product/${product.id}/skus`"
                      class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      @click="closeMenu"
                    >
                      <Package class="h-4 w-4 text-gray-400" />
                      Edit SKU
                    </NuxtLink>
                    <div class="my-1 border-t border-gray-100" />
                    <button
                      class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      @click="handleDelete(product); closeMenu()"
                    >
                      <Trash2 class="h-4 w-4" />
                      Hapus
                    </button>
                  </div>
                </Transition>
              </div>
            </div>
          </div>

          <!-- SKU expand toggle bar -->
          <div @click="toggleSkus(product)"
            v-if="product.sku_count > 0"
            class="flex items-center cursor-pointer justify-between border-t border-gray-100 bg-gray-50/50 px-4 py-1.5"
          >
            <span class="text-xs text-gray-400">{{ product.sku_count }} SKU</span>
            <button
              class="inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700"
              @click="toggleSkus(product)"
            >
              {{ expandedSkus.has(product.id) ? 'Tutup' : 'Buka' }}
              <ChevronDown
                class="h-3.5 w-3.5 transition-transform duration-200"
                :class="expandedSkus.has(product.id) ? 'rotate-180' : ''"
              />
            </button>
          </div>

          <!-- SKU slide-down panel -->
          <div
            v-if="expandedSkus.has(product.id)"
            class="border-t border-gray-100 bg-gray-50/40"
          >
            <!-- Loading SKU -->
            <div v-if="skuLoading.has(product.id)" class="flex items-center justify-center gap-2 py-6">
              <Loader2 class="h-4 w-4 animate-spin text-gray-400" />
              <span class="text-sm text-gray-400">Memuat SKU...</span>
            </div>

            <!-- No SKU -->
            <div v-else-if="!skuData[product.id]?.length" class="py-6 text-center text-sm text-gray-400">
              Tidak ada data SKU.
            </div>

            <!-- SKU table -->
            <div v-else class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th class="whitespace-nowrap px-4 py-2 font-medium text-gray-500">Kode SKU</th>
                    <th class="whitespace-nowrap px-4 py-2 font-medium text-gray-500">Varian</th>
                    <th class="whitespace-nowrap px-4 py-2 font-medium text-gray-500">Berat</th>
                    <th class="whitespace-nowrap px-4 py-2 font-medium text-gray-500">Buffer</th>
                    <th class="whitespace-nowrap px-4 py-2 font-medium text-gray-500">Reward</th>
                    <th class="whitespace-nowrap px-4 py-2 font-medium text-gray-500">Stok</th>
                    <th class="whitespace-nowrap px-4 py-2 font-medium text-gray-500">Harga</th>
                    <th class="whitespace-nowrap px-4 py-2 font-medium text-gray-500">Status</th>
                    <th class="whitespace-nowrap px-4 py-2 font-medium text-gray-500" />
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 bg-white">
                  <tr v-for="sku in skuData[product.id]" :key="sku.id" class="hover:bg-gray-50/50">
                    <td class="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-gray-700">{{ sku.sku }}</td>
                    <td class="px-4 py-2.5">
                      <div class="flex flex-wrap gap-1">
                        <span
                          v-for="v in sku.variants"
                          :key="v.name"
                          class="inline-flex rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700"
                        >
                          {{ v.value }}
                        </span>
                        <span v-if="!sku.variants?.length" class="text-gray-400">-</span>
                      </div>
                    </td>
                    <td class="whitespace-nowrap px-4 py-2.5 text-gray-600">{{ sku.weight ? `${sku.weight}g` : '-' }}</td>
                    <td class="whitespace-nowrap px-4 py-2.5 text-gray-600">{{ sku.buffer_stock || '-' }}</td>
                    <td class="whitespace-nowrap px-4 py-2.5 text-gray-600">{{ sku.rewards_point || '-' }}</td>
                    <td class="whitespace-nowrap px-4 py-2.5">
                      <span
                        class="text-xs font-medium"
                        :class="sku.stock_available > 0 ? 'text-gray-900' : 'text-red-500'"
                      >
                        {{ sku.stock_available.toLocaleString('id-ID') }}
                      </span>
                    </td>
                    <td class="px-4 py-2.5">
                      <div v-if="sku.prices?.length">
                        <button
                          class="inline-flex items-center gap-1 whitespace-nowrap text-gray-700 hover:text-gray-900"
                          @click="expandedSkuPrices.has(sku.id) ? expandedSkuPrices.delete(sku.id) : expandedSkuPrices.add(sku.id)"
                        >
                          <span v-if="sku.prices[0]">Rp{{ formatPrice(sku.prices[0].price) }}</span>
                          <span v-else class="text-gray-400">-</span>
                          <ChevronDown
                            v-if="sku.prices.length > 1"
                            class="h-3 w-3 text-gray-400 transition-transform duration-150"
                            :class="expandedSkuPrices.has(sku.id) ? 'rotate-180' : ''"
                          />
                        </button>
                        <div v-if="expandedSkuPrices.has(sku.id)" class="mt-1 space-y-0.5 text-gray-600">
                          <div
                            v-for="p in sku.prices.slice(1)"
                            :key="p.id"
                            class="flex items-center gap-2 whitespace-nowrap"
                          >
                            <span>Rp{{ formatPrice(p.price) }}</span>
                            <span v-if="p.customer_category_name" class="text-[10px] text-gray-400">{{ p.customer_category_name }}</span>
                          </div>
                        </div>
                      </div>
                      <span v-else class="text-gray-400">-</span>
                    </td>
                    <td class="whitespace-nowrap px-4 py-2.5">
                      <span
                        class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        :class="sku.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'"
                      >
                        <span class="h-1 w-1 rounded-full" :class="sku.status === 'active' ? 'bg-green-500' : 'bg-gray-400'" />
                        {{ sku.status === 'active' ? 'Aktif' : 'Nonaktif' }}
                      </span>
                    </td>
                    <td class="whitespace-nowrap px-4 py-2.5">
                      <button
                        class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        title="Toggle Status SKU"
                        @click="toggleSkuStatus(product.id, sku)"
                      >
                        <ToggleRight v-if="sku.status === 'active'" class="h-3.5 w-3.5 text-green-500" />
                        <ToggleLeft v-else class="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination (inside card) -->
      <AppPagination
        :page="page"
        :total-page="totalPage"
        :total="total"
        :per-page="perPage"
        :loading="loading"
        @update:page="onPageChange"
        @update:per-page="onPerPageChange"
      />
    </div>
  </div>
</template>
