<script setup lang="ts">
import {
  Search, RefreshCw, X, Eye, Package,
  ChevronDown, ChevronRight as ChevronRightIcon, TrendingDown, AlertCircle,
  BarChart3, Layers, DollarSign,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Category { id: string; name: string }

interface Sku {
  id: string
  sku: string
  status: string
  variants: { name: string; value: string }[]
  stock_warehouse: number
  stock_locked: number
  stock_available: number
  average_price: string
  total: string
}

interface Product {
  id: string
  name: string
  short_description: string
  status: string
  thumbnail: string
  stock_warehouse: number
  stock_locked: number
  stock_available: number
  average_price: string
  total: string
  category: Category | null
  skus: Sku[] | null
}

interface StockSummary {
  product_count: number
  sku_count: number
  sku_low_stock_count: number
  sku_out_of_stock_count: number
  stock_warehouse: number
  stock_locked: number
  stock_available: number
  average_price: string
  cogs_total: string
}

interface Paginated<T> {
  data: T[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()

const loading = ref(true)
const loadingSummary = ref(true)
const products = ref<Product[]>([])
const summary = ref<StockSummary | null>(null)
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

const search = ref('')
const filterWarehouseIds = ref<string[]>([])
const filterCategoryIds = ref<string[]>([])
// const filterStockType = ref<string[]>([])
const filterStockType = ref('')

const expandedIds = ref<string[]>([])

const warehouses = ref<{ id: string; name: string }[]>([])
const loadingWarehouses = ref(false)
const categories = ref<{ id: string; name: string }[]>([])

const warehouseOptions = computed(() =>
  warehouses.value.map(w => ({ value: w.id, label: w.name })),
)
const categoryOptions = computed(() =>
  categories.value.map(c => ({ value: c.id, label: c.name })),
)

const stockTypeOptions = [
  { value: 'available_ready', label: 'Stok Tersedia' },
  { value: 'available_low_out', label: 'Stok Tersedia Rendah & Habis' },
  { value: 'available_low', label: 'Stok Tersedia Rendah' },
  { value: 'available_out', label: 'Stok Tersedia Habis' },
  { value: 'warehouse_ready', label: 'Stok Gudang Tersedia' },
  { value: 'warehouse_low_out', label: 'Stok Gudang Rendah & Habis' },
  { value: 'warehouse_low', label: 'Stok Gudang Rendah' },
  { value: 'warehouse_out', label: 'Stok Gudang Habis' },
]
const stockTypeWarehouseOptions = [
  
]

const hasFilter = computed(() =>
  !!search.value || filterWarehouseIds.value.length > 0
  || filterCategoryIds.value.length > 0 || filterStockType.value.length > 0,
)

async function fetchSummary() {
  loadingSummary.value = true
  try {
    const res = await api.get<{ data: StockSummary }>('/inventories/stock-summary')
    summary.value = res.data
  }
  catch { summary.value = null }
  finally { loadingSummary.value = false }
}

async function fetchProducts() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    if (filterWarehouseIds.value.length) params.warehouse_id = filterWarehouseIds.value.join(',')
    if (filterCategoryIds.value.length) params.category_id = filterCategoryIds.value.join(',')
    // params.stock_available = filterStockType.value.filter(t => t === 'available_low' || t === 'available_out').map(t => t === 'available_low' ? 'available_low' : 'available_out').join(',')
    // params.stock_warehouse = filterStockType.value.filter(t => t === 'warehouse_low' || t === 'warehouse_out').map(t => t === 'warehouse_low' ? 'warehouse_low' : 'warehouse_out').join(',')
    params.stock_available = filterStockType.value
    const res = await api.get<{ data: Paginated<Product> }>('/inventories/index', params)
    products.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch { products.value = [] }
  finally { loading.value = false }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchProducts() }, 300)
}

function onWarehouseFilter(val: string | string[]) {
  filterWarehouseIds.value = val as string[]
  page.value = 1; fetchProducts()
}

function onCategoryFilter(val: string | string[]) {
  filterCategoryIds.value = val as string[]
  page.value = 1; fetchProducts()
}

function onStockTypeFilter(val: string | string[]) {
  filterStockType.value = val as string
  page.value = 1; fetchProducts()
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

function toggleExpand(id: string) {
  const idx = expandedIds.value.indexOf(id)
  if (idx >= 0) expandedIds.value.splice(idx, 1)
  else expandedIds.value.push(id)
}

async function fetchWarehouseOptions(searchText?: string) {
  loadingWarehouses.value = true
  try {
    const params: Record<string, string> = {}
    if (searchText) params.search = searchText
    const res = await api.get<{ data: any }>('/warehouses/public/index', params)
    warehouses.value = (res.data?.data || res.data || []) as { id: string; name: string }[]
  }
  catch { warehouses.value = [] }
  finally { loadingWarehouses.value = false }
}

async function fetchCategoryOptions() {
  try {
    const res = await api.get<{ data: Category[] }>('/products/categories/index')
    categories.value = res.data || []
  }
  catch { categories.value = [] }
}

async function resetFilters() {
  search.value = ''
  filterWarehouseIds.value = []
  filterCategoryIds.value = []
  filterStockType.value = ''
  page.value = 1
  fetchSummary()
  fetchProducts()
}

onMounted(() => {
  fetchSummary()
  fetchProducts()
  fetchWarehouseOptions()
  fetchCategoryOptions()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div>
      <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Inventori Stock</h1>
      <p class="text-sm text-gray-500">Ringkasan dan daftar stok produk di seluruh gudang.</p>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <template v-if="loadingSummary">
        <div v-for="i in 6" :key="i" class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <div class="h-3 w-16 animate-pulse rounded bg-gray-200" />
          <div class="mt-2 h-7 w-20 animate-pulse rounded bg-gray-100" />
        </div>
      </template>
      <template v-else>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="flex items-center gap-1.5 text-xs text-gray-500"><Package class="h-3.5 w-3.5" /> Produk</p>
          <p class="mt-1.5 text-2xl font-bold text-gray-900">{{ summary?.product_count ?? '-' }}</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="flex items-center gap-1.5 text-xs text-gray-500"><Layers class="h-3.5 w-3.5" /> SKU</p>
          <p class="mt-1.5 text-2xl font-bold text-gray-900">{{ summary?.sku_count ?? '-' }}</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="flex items-center gap-1.5 text-xs text-yellow-600"><TrendingDown class="h-3.5 w-3.5" /> Stok Rendah</p>
          <p class="mt-1.5 text-2xl font-bold text-yellow-600">{{ summary?.sku_low_stock_count ?? '-' }}</p>
          <p class="text-[10px] text-gray-400">SKU</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="flex items-center gap-1.5 text-xs text-red-600"><AlertCircle class="h-3.5 w-3.5" /> Stok Habis</p>
          <p class="mt-1.5 text-2xl font-bold text-red-600">{{ summary?.sku_out_of_stock_count ?? '-' }}</p>
          <p class="text-[10px] text-gray-400">SKU</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="flex items-center gap-1.5 text-xs text-green-600"><BarChart3 class="h-3.5 w-3.5" /> Stok Tersedia</p>
          <p class="mt-1.5 text-2xl font-bold text-gray-900">{{ formatCurrency(summary?.stock_available ?? 0) }}</p>
          <p class="text-[10px] text-gray-400">unit</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="flex items-center gap-1.5 text-xs text-blue-600"><DollarSign class="h-3.5 w-3.5" /> Total COGS</p>
          <p class="mt-1.5 truncate text-lg font-bold text-gray-900">Rp{{ formatCurrency(summary?.cogs_total ?? 0) }}</p>
        </div>
      </template>
    </div>

    <!-- Filters -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="space-y-3 px-4 py-3">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari nama produk, SKU..."
              class="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              @input="onSearch"
            />
          </div>
          <button
            class="flex shrink-0 rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            :disabled="loading"
            title="Refresh"
            @click="fetchProducts(); fetchSummary()"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          </button>
          <button 
            class="flex shrink-0 rounded-lg border border-red-200 p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-700"
            title="Reset filter"
            @click="resetFilters()"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <AppFilterSelect
            :model-value="filterWarehouseIds"
            :options="warehouseOptions"
            :loading="loadingWarehouses"
            multiple
            placeholder="Gudang"
            search-placeholder="Cari gudang..."
            @update:model-value="onWarehouseFilter"
            @search="fetchWarehouseOptions"
          />
          <AppFilterSelect
            :model-value="filterCategoryIds"
            :options="categoryOptions"
            multiple
            placeholder="Kategori"
            @update:model-value="onCategoryFilter"
          />
          <AppFilterSelect
            :model-value="filterStockType"
            :options="stockTypeOptions"
            :searchable="false" 
            placeholder="Filter Stok"
            @update:model-value="onStockTypeFilter"
          />
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[700px] text-sm">
          <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500 text-nowrap">
            <tr>
              <th class="px-4 py-2.5 text-left">Produk</th>
              <th class="w-8 px-3 py-2.5" />
              <th class="px-4 py-2.5 text-center w-24">SKU</th>
              <th class="px-4 py-2.5 text-right w-24">Stok</th>
              <th class="px-4 py-2.5 text-right w-24">Terkunci</th>
              <th class="px-4 py-2.5 text-right w-24">Tersedia</th>
              <th class="px-4 py-2.5 text-right w-34">Harga Avg</th> 
              <th class="px-4 py-2.5 text-right w-34">Total</th> 
            </tr>
          </thead>

          <!-- Loading -->
          <tbody v-if="loading">
            <tr v-for="i in 6" :key="i" class="border-b border-gray-100">
              <td v-for="j in 8" :key="j" class="px-4 py-3">
                <div class="h-4 animate-pulse rounded bg-gray-200" :class="j === 1 ? 'w-4' : j === 7 || j === 8 ? 'w-34' : 'w-24'" />
              </td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="!products.length">
            <tr>
              <td colspan="8" class="px-4 py-16 text-center">
                <Package class="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p class="text-sm text-gray-500">
                  {{ hasFilter ? 'Tidak ada produk yang cocok dengan filter.' : 'Belum ada data inventori.' }}
                </p>
              </td>
            </tr>
          </tbody>

          <!-- Rows -->
          <tbody v-else>
            <template v-for="product in products" :key="product.id">
              <!-- Product row -->
              <tr class="border-b border-gray-100 transition-colors hover:bg-gray-50/50">
                <!-- Name + category -->
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <img
                      v-if="product.thumbnail"
                      :src="product.thumbnail"
                      :alt="product.name"
                      class="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-gray-200"
                    />
                    <div v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <Package class="h-4 w-4 text-gray-400" />
                    </div>
                    <div>
                      <NuxtLink
                        :to="`/inventory/stock/${product.id}`"
                        class="line-clamp-2 font-medium text-gray-900 hover:text-primary-600"
                      >
                        {{ product.name }}
                      </NuxtLink>
                      <div class="mt-0.5 flex flex-wrap items-center gap-1">
                        <span v-if="product.category" class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{{ product.category.name }}</span>
                        <span
                          class="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                          :class="product.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'"
                        >
                          {{ product.status === 'active' ? 'Aktif' : 'Nonaktif' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <!-- Expand toggle -->
                <td @click="toggleExpand(product.id)" class="px-3 py-3 cursor-pointer text-center">
                  <button
                    v-if="product.skus?.length"
                    class="rounded p-0.5 text-gray-400 transition-colors hover:text-gray-700"
                  >
                    <ChevronDown v-if="expandedIds.includes(product.id)" class="h-4 w-4" />
                    <ChevronRightIcon v-else class="h-4 w-4" />
                  </button>
                </td>
                <td @click="toggleExpand(product.id)" class="cursor-pointer px-4 py-3 text-center text-gray-600">{{ product.skus?.length || 0 }}</td>
                <td @click="toggleExpand(product.id)" class="cursor-pointer px-4 py-3 text-right font-medium text-gray-900">{{ formatCurrency(product.stock_warehouse) }}</td>
                <td @click="toggleExpand(product.id)" class="cursor-pointer px-4 py-3 text-right text-orange-600">{{ formatCurrency(product.stock_locked) }}</td>
                <td @click="toggleExpand(product.id)" class="cursor-pointer px-4 py-3 text-right">
                  <span
                    class="font-semibold"
                    :class="product.stock_available <= 0 ? 'text-red-600' : product.stock_available < 10 ? 'text-yellow-600' : 'text-green-700'"
                  >
                    {{ formatCurrency(product.stock_available) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap text-gray-700">Rp{{ formatCurrency(product.average_price) }}</td>
                <td class="px-4 py-3 text-right whitespace-nowrap text-gray-700">Rp{{ formatCurrency(product.total) }}</td>
              </tr>

              <!-- Expanded SKU rows — sejajar dengan kolom parent -->
              <template v-if="expandedIds.includes(product.id)">
                <tr
                  v-for="sku in product.skus"
                  :key="sku.id"
                  class="border-b border-gray-100 bg-primary-50/30 text-xs last:border-b-0"
                >
                  <!-- col 2: Produk — tampilkan kode SKU + varian -->
                  <td class="px-4 py-2">
                    <div class="flex items-center gap-2 pl-7">
                      <div class="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                      <span class="font-mono text-gray-700">{{ sku.sku }}</span>
                      <span v-if="sku.variants?.length" class="flex flex-wrap gap-1">
                        <span
                          v-for="v in sku.variants"
                          :key="v.name"
                          class="rounded bg-white px-1.5 py-0.5 ring-1 ring-gray-200 text-gray-600"
                        >{{ v.value }}</span>
                      </span>
                    </div>
                  </td>
                  <!-- col 1: indent (expand toggle col) -->
                  <td class="px-3 py-2" />
                  <!-- col 3: SKU count — kosong -->
                  <td class="px-4 py-2" />
                  <!-- col 4: Stok -->
                  <td class="px-4 py-2 text-right text-gray-700">{{ formatCurrency(sku.stock_warehouse) }}</td>
                  <!-- col 5: Terkunci -->
                  <td class="px-4 py-2 text-right text-orange-600">{{ formatCurrency(sku.stock_locked) }}</td>
                  <!-- col 6: Tersedia -->
                  <td class="px-4 py-2 text-right">
                    <span :class="sku.stock_available <= 0 ? 'font-semibold text-red-600' : sku.stock_available < 10 ? 'text-yellow-600' : 'text-green-700'">
                      {{ formatCurrency(sku.stock_available) }}
                    </span>
                  </td>
                  <!-- col 7: Harga Avg -->
                  <td class="px-4 py-2 text-right whitespace-nowrap text-gray-700">Rp{{ formatCurrency(sku.average_price) }}</td>
                  <td class="px-4 py-2 text-right whitespace-nowrap text-gray-700">Rp{{ formatCurrency(sku.total) }}</td>
                  
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <AppPagination
        v-if="!loading && totalPage > 1"
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
