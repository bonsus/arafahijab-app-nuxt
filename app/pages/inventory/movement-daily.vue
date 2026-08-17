<script setup lang="ts">
import {
  ArrowLeft, CalendarDays, Warehouse, Package, Search,
  ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface VariantPair { name: string; value: string }

interface DayDetailItem {
  product_id: string
  product_name: string
  sku_id: string
  sku: string
  variants: VariantPair[] | null
  qty: number
}

interface DayDetailTransaction {
  reference_id: string
  reference_type: string
  reference_no: string
  date: string
  warehouse: { id: string; name: string; primary: boolean } | null
  items: DayDetailItem[]
}

interface Paginated<T> {
  data: T[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const route = useRoute()
const router = useRouter()

// date datang dari query dalam format RFC3339 + timezone (mis. 2026-07-06T00:00:00+07:00),
// sama seperti date_from/date_to. Jika ada yang membuka dengan tanggal polos, diformat ulang.
const dateParam = computed(() => (route.query.date as string) || '')
const warehouseIds = computed(() => {
  const v = route.query.warehouse_id
  return v ? (v as string).split(',').filter(Boolean) : []
})

function normalizeDateParam(v: string): string {
  return v.includes('T') ? v : formatDateFromForApi(v)
}

const search = ref('')
const loading = ref(true)
const transactions = ref<DayDetailTransaction[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

const warehouses = ref<{ id: string; name: string }[]>([])
const warehouseNames = computed(() => {
  if (!warehouseIds.value.length) return []
  return warehouses.value
    .filter(w => warehouseIds.value.includes(w.id))
    .map(w => w.name)
})

const referenceTypeLabels: Record<string, string> = {
  stock_adjustment: 'Penyesuaian Stok',
  order: 'Penjualan',
  order_return: 'Retur Penjualan',
  warehouse_inbound: 'Inbound',
  stock_usage: 'Pemakaian Stok',
  stock_usage_return: 'Retur Pemakaian Stok',
  stock_transfer: 'Transfer Stok',
  stock_conversion: 'Konversi Stok',
}

function referenceLabel(type: string): string {
  return referenceTypeLabels[type] || type
}

function variantText(item: DayDetailItem): string {
  return (item.variants || []).map(v => v.value).join(', ')
}

function buildParams(): Record<string, string> {
  const params: Record<string, string> = {}
  if (dateParam.value) params.date = normalizeDateParam(dateParam.value)
  if (warehouseIds.value.length) params.warehouse_id = warehouseIds.value.join(',')
  if (search.value) params.search = search.value
  return params
}

function buildQuery(): Record<string, string> {
  const q: Record<string, string> = {}
  if (dateParam.value) q.date = normalizeDateParam(dateParam.value)
  if (warehouseIds.value.length) q.warehouse_id = warehouseIds.value.join(',')
  if (search.value) q.search = search.value
  if (page.value > 1) q.page = String(page.value)
  if (perPage.value !== 20) q.per_page = String(perPage.value)
  return q
}

function syncQuery() {
  router.replace({ query: buildQuery() })
}

async function fetchTransactions() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
      ...buildParams(),
    }
    const res = await api.get<{ data: Paginated<DayDetailTransaction> }>(
      '/inventories/reports/stock-movement-per-day-details',
      params,
    )
    transactions.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch { transactions.value = [] }
  finally { loading.value = false }
}

async function fetchWarehouses() {
  try {
    const res = await api.get<{ data: any }>('/warehouses/public/index', {})
    warehouses.value = (res.data?.data || res.data || []) as { id: string; name: string }[]
  }
  catch { warehouses.value = [] }
}

function initFromQuery() {
  search.value = (route.query.search as string) || ''
  page.value = route.query.page ? Number.parseInt(route.query.page as string, 10) : 1
  perPage.value = route.query.per_page ? Number.parseInt(route.query.per_page as string, 10) : 20
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    syncQuery()
    fetchTransactions()
  }, 300)
}

function onPageChange(p: number) {
  page.value = p
  syncQuery()
  fetchTransactions()
}

function onPerPageChange(pp: number) {
  perPage.value = pp
  page.value = 1
  syncQuery()
  fetchTransactions()
}

onMounted(() => {
  initFromQuery()
  fetchTransactions()
  fetchWarehouses()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center gap-3">
      <NuxtLink
        to="/inventory/movement?tab=daily"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <h1 class="flex-1 text-xl font-bold text-gray-900 sm:text-2xl">
        Detail Transaksi
      </h1>
    </div>

    <!-- Info -->
    <div class="grid gap-3 sm:grid-cols-2">
      <div class="flex items-center gap-3 rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <CalendarDays class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Tanggal</p>
          <p class="truncate text-sm font-semibold text-gray-900">{{ formatDate(dateParam) }}</p>
        </div>
      </div>
      <div class="flex items-center gap-3 rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
          <Warehouse class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Gudang</p>
          <p class="truncate text-sm font-semibold text-gray-900">
            {{ warehouseNames.length ? warehouseNames.join(', ') : 'Semua Gudang' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Search -->
    <div class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        v-model="search"
        type="text"
        placeholder="Cari no referensi, produk, SKU..."
        class="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
        @input="onSearch"
      />
    </div>

    <!-- Table -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-sm">
          <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500 text-nowrap">
            <tr>
              <th class="px-4 py-2.5 text-left w-32">Tanggal</th>
              <th class="px-4 py-2.5 text-left">No Referensi</th>
              <th class="px-4 py-2.5 text-left">Tipe Referensi</th>
              <th class="px-4 py-2.5 text-left">Gudang</th>
              <th class="px-4 py-2.5 text-left">Produk</th>
              <th class="px-4 py-2.5 text-left">Sku</th>
              <th class="px-4 py-2.5 text-right w-24">Qty</th>
            </tr>
          </thead>

          <!-- Loading -->
          <tbody v-if="loading">
            <tr v-for="i in 8" :key="i" class="border-b border-gray-100">
              <td v-for="j in 3" :key="j" class="px-4 py-3">
                <div class="h-4 animate-pulse rounded bg-gray-200" :class="j === 2 ? 'w-40' : 'w-20'" />
              </td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="!transactions.length">
            <tr>
              <td colspan="7" class="px-4 py-16 text-center">
                <Package class="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p class="text-sm text-gray-500">Tidak ada transaksi pada tanggal ini.</p>
              </td>
            </tr>
          </tbody>

          <!-- Rows -->
          <tbody v-else class="divide-y divide-gray-100 text-sm text-gray-600">
            <template v-for="t in transactions" :key="t.reference_id">
              <tr v-for="(item, i) in t.items" :key="item.sku_id" class="hover:bg-gray-50/60">
                <!-- tanggal -->
                <td v-if="i === 0" :rowspan="t.items.length || 1" class="px-4 py-3 align-top">
                  <p class="text-gray-500 text-nowrap">
                    {{ formatDate(t.date) }}
                  </p>
                </td>
                <!-- Referensi (rowspan) -->
                <td v-if="i === 0" :rowspan="t.items.length || 1" class="px-4 py-3 align-top">
                  <!-- <span class="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 text-nowrap">
                    {{ t.reference_no || '-' }}
                  </span>  -->
                  <p class="text-gray-500">
                    {{ t.reference_no || '-' }}
                  </p>
                </td>

                <!-- Tipe Referensi -->
                <td v-if="i === 0" :rowspan="t.items.length || 1" class="px-4 py-3 align-top">
                  <p class="text-gray-500">
                    {{ referenceLabel(t.reference_type) }}
                  </p>
                </td>

                <!-- Gudang -->
                <td v-if="i === 0" :rowspan="t.items.length || 1" class="px-4 py-3 align-top">
                  <p v-if="t.warehouse?.name" class="flex items-center gap-1 text-gray-500">
                    {{ t.warehouse.name }}
                  </p>
                </td>

                <!-- Produk -->
                <td class="px-4 py-3"> 
                  <div class="min-w-0">
                    <p class="truncate text-gray-900">
                      {{ item.product_name }}
                      <span v-if="variantText(item)" class="text-gray-500"> - {{ variantText(item) }}</span>
                    </p>
                  </div> 
                </td>

                <!-- Sku -->
                <td class="px-4 py-3">
                  <p class="truncate text-gray-900">{{ item.sku }}</p>
                </td>

                <!-- Qty -->
                <td class="px-4 py-3 text-right">
                  <span
                    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                    :class="item.qty >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
                  >
                    <ArrowDownToLine v-if="item.qty >= 0" class="h-3 w-3" />
                    <ArrowUpFromLine v-else class="h-3 w-3" />
                    {{ item.qty >= 0 ? '+' : '' }}{{ item.qty }}
                  </span>
                </td>
              </tr>
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
