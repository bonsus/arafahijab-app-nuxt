<script setup lang="ts">
import {
  ArrowLeft, Search, Package, RefreshCw, X, User, Clock, Store, ShoppingBag, Scan
} from 'lucide-vue-next'
import { formatDateTime } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

interface PackedOrder {
  order_id: string
  order_no: string
  qty: number
  status: string
  sub_status: string
  date_created: string
  date_ready: string
  customer_id: string
  customer_name: string
  customer_phone: string
  customer_city: string
  store_id: string
  store_name: string
  store_source: string
  qty_scan: number
  scan_time: string
  staff_id: string
  staff_name: string
}

interface PaginationData {
  page: number
  per_page: number
  total_page: number
  total: number
  data: PackedOrder[]
}

const api = useApi()
const router = useRouter()

// State
const loading = ref(true)
const orders = ref<PackedOrder[]>([])
const pagination = ref({
  page: 1,
  per_page: 20,
  total_page: 1,
  total: 0
})

// Filters
const filterDate = ref({ from: '', to: '' })
const search = ref('')

// ─── Computed ───────────────────────────────────────────────────────────────
const hasActiveFilters = computed(() => {
  return filterDate.value.from || filterDate.value.to || search.value
})

// ─── Fetch orders ───────────────────────────────────────────────────────────
async function fetchOrders() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.value.page,
      per_page: pagination.value.per_page
    }

    if (filterDate.value.from) params.date_from = filterDate.value.from
    if (filterDate.value.to) params.date_to = filterDate.value.to
    if (search.value) params.search = search.value

    const res = await api.get<{ data: PaginationData }>('/sales/orders/scan-packing/index', params)
    
    orders.value = res.data.data
    pagination.value = {
      page: res.data.page,
      per_page: res.data.per_page,
      total_page: res.data.total_page,
      total: res.data.total
    }
  }
  catch (err: any) {
    console.error('Failed to fetch packed orders:', err)
  }
  finally {
    loading.value = false
  }
}

// ─── Handlers ───────────────────────────────────────────────────────────────
function onDateFilter(value: { from: string; to: string }) {
  filterDate.value = value
  onFilterChange()
}

function onFilterChange() {
  pagination.value.page = 1
  fetchOrders()
}

function onSearch() {
  pagination.value.page = 1
  fetchOrders()
}

function handlePageChange(page: number) {
  pagination.value.page = page
  fetchOrders()
}

function viewOrderDetail(orderId: string) {
  router.push(`/sales/order/${orderId}`)
}

function goBack() {
  router.push('/sales/order')
}

function resetFilters() {
  filterDate.value = { from: '', to: '' }
  search.value = ''
  pagination.value.page = 1
  fetchOrders()
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  fetchOrders()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        @click="goBack"
      >
        <ArrowLeft class="h-5 w-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
          History Scan Packing
        </h1>
        <p class="text-sm text-gray-500">Riwayat order yang sudah dipacking dan siap dikirim</p>
      </div>
      <NuxtLink
        to="/sales/order/scan-packing/scan"
        class="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      >
        <Scan class="h-4 w-4" />
        Scan Packing
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 space-y-3">
      <!-- Search + Date + Refresh + Reset -->
      <div class="flex items-center gap-2">
        <div class="relative flex-1 max-w-sm">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="search"
            type="text"
            placeholder="Cari nomor order..."
            class="w-full rounded-lg border border-gray-300 py-1.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
            @input="onSearch"
          />
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <AppDateRangePicker :model-value="filterDate" @update:model-value="onDateFilter" />
        </div>
        <button
          class="shrink-0 flex rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          title="Refresh data"
          :disabled="loading"
          @click="fetchOrders()"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        </button>
        <button
          v-if="hasActiveFilters"
          class="shrink-0 flex rounded-lg border border-red-200 p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-700"
          title="Reset semua filter"
          @click="resetFilters()"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Orders Table -->
    <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <div class="border-b border-gray-100 px-5 py-3">
        <h3 class="text-sm font-semibold text-gray-900">
          Daftar Order ({{ pagination.total }})
        </h3>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p class="mt-2 text-sm text-gray-500">Memuat data...</p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="orders.length === 0" class="flex flex-col items-center justify-center py-12">
        <Package class="h-12 w-12 text-gray-400" />
        <p class="mt-2 text-sm font-medium text-gray-900">Tidak ada data order</p>
        <p class="text-xs text-gray-500">Belum ada order yang dipacking</p>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
            <tr>
              <th class="w-10 px-4 py-3 text-left">#</th>
              <th class="px-4 py-3 text-left">No. Order</th>
              <th class="px-4 py-3 text-left">Customer</th>
              <th class="px-4 py-3 text-left">Store</th>
              <th class="px-4 py-3 center">Qty</th>
              <th class="px-4 py-3 text-center">Qty Scan</th>
              <th class="px-4 py-3 text-left">Waktu Scan</th>
              <th class="px-4 py-3 text-left">Staff</th>
              <!-- <th class="px-4 py-3 text-left">Status</th> -->
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(order, index) in orders"
              :key="order.order_id"
              class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50 cursor-pointer"
              @click="viewOrderDetail(order.order_id)"
            >
              <td class="px-4 py-3">
                <span class="text-gray-500">{{ (pagination.page - 1) * pagination.per_page + index + 1 }}</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <ShoppingBag class="h-4 w-4 text-gray-400" />
                  <span class="font-medium text-gray-900">{{ order.order_no }}</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ order.customer_name }}</p>
                  <p class="text-xs text-gray-500">{{ order.customer_phone }}</p>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5">
                  <Store class="h-3.5 w-3.5 text-gray-400" />
                  <span class="text-xs text-gray-900">{{ order.store_name }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="text-sm font-medium text-gray-900">{{ order.qty }}</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span 
                  class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="order.qty_scan >= order.qty 
                    ? 'bg-green-50 text-green-700 ring-1 ring-green-200' 
                    : 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'"
                >
                  {{ order.qty_scan }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5">
                  <Clock class="h-3.5 w-3.5 text-gray-400" />
                  <span class="text-xs text-gray-900">{{ formatDateTime(order.scan_time) }}</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5">
                  <User class="h-3.5 w-3.5 text-gray-400" />
                  <span class="text-xs text-gray-900">{{ order.staff_name }}</span>
                </div>
              </td>
              <!-- <td class="px-4 py-3">
                <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                  
                </span>
              </td> -->
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.total_page > 1" class="border-t border-gray-100 px-5 py-3">
        <AppPagination
          :page="pagination.page"
          :total-page="pagination.total_page"
          :total="pagination.total"
          :per-page="pagination.per_page"
          :loading="loading"
          :show-per-page="false"
          @update:page="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>
