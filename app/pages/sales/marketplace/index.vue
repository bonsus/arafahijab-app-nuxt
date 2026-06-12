<script setup lang="ts">
import {
  Search, Filter, RefreshCw, Loader2, X,
  Package, MapPin, User, Phone, Truck, CheckCircle2,
  ChevronDown, ChevronUp
} from 'lucide-vue-next'
import { formatCurrency } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

interface StoreOption {
  id: string
  shop_id: string
  shop_name: string
  source: string
  status: string
}

interface OrderCustomer {
  id: string
  username: string
  name: string
  phone: string
}

interface OrderAddress {
  name: string
  phone: string
  country: string
  province: string
  city: string
  district: string
  zipcode: string
  address: string
}

interface OrderShipment {
  courier_code: string
  courier_name: string
  service_code: string
  service_name: string
  tracking_no: string
  note: string
  package_id: string
}

interface OrderItemBinding {
  sku_id: string
  sku: string
  product_id: string
  product_name: string
  variant: string | null
}

interface OrderItem {
  id: string
  sku_id: string
  sku: string
  product_id: string
  product_name: string
  variant: string
  image: string
  qty: number
  price: string
  discount: string
  total: string
  binding: OrderItemBinding
}

interface OrderLink {
  id: string
  no: string
  status: string
  sub_status: string
}

interface MarketplaceOrder {
  raw: any
  id: string
  store_id: string
  package_id: string
  status: string
  warehouse_id: string
  date_created: string
  date_updated: string
  date_paid: string
  cod: boolean
  subtotal: string
  discount: string
  total: string
  customer: OrderCustomer
  address: OrderAddress
  shipment: OrderShipment
  items: OrderItem[]
  is_binding: boolean
  order: OrderLink
}

interface OrderResponse {
  next_cursor: string | null
  page_size: number
  total: number
  data: MarketplaceOrder[]
}

const api = useApi()
const toast = useToast()

// Store options
const stores = ref<StoreOption[]>([])
const storesLoading = ref(false)

// Filters
const selectedStoreId = ref('')
const search = ref('')
const status = ref('')
const dateRange = ref({ from: '', to: '' })
const orderAppFilter = ref<'all' | 'with-order' | 'without-order'>('all') // Local filter

// Orders data
const orders = ref<MarketplaceOrder[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const nextCursor = ref<string | null>(null)
const total = ref(0)

// Sentinel for infinite scroll
const sentinelEl = ref<HTMLElement | null>(null)
let sentinelObserver: IntersectionObserver | null = null

// Expanded rows
const expandedIds = ref<Set<string>>(new Set())

// Selection for bulk import
const selectedOrderIds = ref<Set<string>>(new Set())
const importing = ref(false)

// Import modal state
const showImportModal = ref(false)
interface ImportItemStatus {
  id: string
  order: MarketplaceOrder
  status: 'pending' | 'loading' | 'success' | 'error'
  message: string
}
const importItems = ref<ImportItemStatus[]>([])

// Status options
const statusOptions = [
  { value: '', label: 'Semua Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'confirmed', label: 'Belum Diproses' },
  { value: 'processing', label: 'Sedang Diproses' },
  { value: 'shipped', label: 'Dikirim' },
  { value: 'delivered', label: 'Diterima' },
  { value: 'completed', label: 'Selesai' },
  { value: 'canceled', label: 'Dibatalkan' },
  { value: 'returned', label: 'Dikembalikan' },
]

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  processing: { label: 'Sedang Diproses', cls: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' },
  shipped: { label: 'Dikirim', cls: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' },
  delivered: { label: 'Diterima', cls: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' },
  confirmed: { label: 'Diterima', cls: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' },
  completed: { label: 'Selesai', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  canceled: { label: 'Dibatalkan', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  returned: { label: 'Dikembalikan', cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
}

const selectedStore = computed(() => stores.value.find(s => s.id === selectedStoreId.value) || null)

// Filtered orders based on local filter
const filteredOrders = computed(() => {
  if (orderAppFilter.value === 'all') return orders.value
  if (orderAppFilter.value === 'with-order') {
    return orders.value.filter(order => order.order.id)
  }
  if (orderAppFilter.value === 'without-order') {
    return orders.value.filter(order => !order.order.id)
  }
  return orders.value
})

// Check if all filtered orders are selected
const allSelected = computed(() => {
  const importableOrders = filteredOrders.value.filter(order => !order.order.id && order.is_binding)
  return importableOrders.length > 0 && importableOrders.every(order => selectedOrderIds.value.has(order.id))
})

// Count selected orders
const selectedCount = computed(() => selectedOrderIds.value.size)

function formatDateTime(dateStr: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function toggleExpand(id: string) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  } else {
    expandedIds.value.add(id)
  }
}

function toggleSelectOrder(orderId: string) {
  if (selectedOrderIds.value.has(orderId)) {
    selectedOrderIds.value.delete(orderId)
  } else {
    selectedOrderIds.value.add(orderId)
  }
}

function toggleSelectAll() {
  const importableOrders = filteredOrders.value.filter(order => !order.order.id && order.is_binding)
  if (allSelected.value) {
    // Deselect all
    importableOrders.forEach(order => selectedOrderIds.value.delete(order.id))
  } else {
    // Select all
    importableOrders.forEach(order => selectedOrderIds.value.add(order.id))
  }
}

function canSelectOrder(order: MarketplaceOrder) {
  return !order.order.id && order.is_binding
}

async function importSelectedOrders() {
  if (selectedOrderIds.value.size === 0) {
    toast.error('Pilih order yang akan diimport')
    return
  }

  const selectedOrders = orders.value.filter(order => selectedOrderIds.value.has(order.id))

  // Prepare import items list
  importItems.value = selectedOrders.map(order => ({
    id: order.id,
    order,
    status: 'pending' as const,
    message: '',
  }))
  showImportModal.value = true
}

async function startImport() {
  importing.value = true

  let successCount = 0
  let errorCount = 0

  // Process orders one-by-one for per-order loading feedback
  for (const item of importItems.value) {
    if (item.status === 'success') continue // skip already imported

    item.status = 'loading'
    item.message = 'Mengimport...'

    try {
      const res = await api.post<{ data: { data: Record<string, string> } }>('/sales/order-mp/import', [item.order])
      const results = res.data?.data || {}
      const message = results[item.id] ?? 'No response'

      if (message.toLowerCase().includes('success')) {
        item.status = 'success'
        item.message = message
        successCount++
        selectedOrderIds.value.delete(item.id)
      } else {
        item.status = 'error'
        item.message = message || 'Gagal import'
        errorCount++
      }
    } catch (e: any) {
      item.status = 'error'
      item.message = e.message || 'Gagal import'
      errorCount++
    }
  }

  importing.value = false

  if (successCount > 0) {
    toast.success(`Berhasil import ${successCount} order`)
  }
  if (errorCount > 0) {
    toast.error(`Gagal import ${errorCount} order`)
  }
}

function closeImportModal() {
  if (importing.value) return
  // Refresh data if any imports were successful
  const hasSuccess = importItems.value.some(item => item.status === 'success')
  showImportModal.value = false
  importItems.value = []
  if (hasSuccess) {
    fetchOrders()
  }
}

// API calls
async function loadStores() {
  storesLoading.value = true
  try {
    const res = await api.get<{ data: StoreOption[] | null }>('/stores/public/index')
    stores.value = (res.data || []).filter(s => s.source !== 'internal')
  } catch (e) {
    console.error('Failed to load stores:', e)
  } finally {
    storesLoading.value = false
  }
}

async function fetchOrders(append = false) {
  if (!selectedStoreId.value) return

  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
    orders.value = []
  }

  try {
    const params: Record<string, string> = {
      store_id: selectedStoreId.value,
    }
    
    if (search.value) params.search = search.value
    if (status.value) params.status = status.value
    if (dateRange.value.from) params.date_from = dateRange.value.from
    if (dateRange.value.to) params.date_to = dateRange.value.to
    if (append && nextCursor.value) params.cursor = nextCursor.value

    const res = await api.get<{ data: OrderResponse }>('/sales/order-mp/index', params)
    
    const newOrders = res.data?.data || []
    
    if (append) {
      orders.value.push(...newOrders)
    } else {
      orders.value = newOrders
    }
    
    nextCursor.value = res.data?.next_cursor || null
    total.value = res.data?.total || 0
  } catch (e: any) {
    toast.error(e.message || 'Failed to load orders')
    if (!append) {
      orders.value = []
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function loadMore() {
  if (!nextCursor.value || loading.value || loadingMore.value) return
  await fetchOrders(true)
}

function setupSentinel() {
  if (sentinelObserver) sentinelObserver.disconnect()
  if (!sentinelEl.value) return
  
  sentinelObserver = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      loadMore()
    }
  }, { threshold: 0.1 })
  
  sentinelObserver.observe(sentinelEl.value)
}

function refresh() {
  nextCursor.value = null
  expandedIds.value.clear()
  fetchOrders()
}

function clearFilters() {
  search.value = ''
  status.value = ''
  dateRange.value = { from: '', to: '' }
  orderAppFilter.value = 'all'
  selectedOrderIds.value.clear()
  refresh()
}

// Watchers
watch(sentinelEl, (el) => {
  if (el) setupSentinel()
})

watch(selectedStoreId, () => {
  nextCursor.value = null
  expandedIds.value.clear()
  selectedOrderIds.value.clear()
  if (selectedStoreId.value) {
    fetchOrders()
  } else {
    orders.value = []
  }
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    nextCursor.value = null
    fetchOrders()
  }, 500)
})

watch([status, dateRange], () => {
  nextCursor.value = null
  fetchOrders()
}, { deep: true })

// Lifecycle
onMounted(() => {
  loadStores()
})

onUnmounted(() => {
  if (sentinelObserver) sentinelObserver.disconnect()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="mb-6">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Order Marketplace</h1>
        <p class="mt-0.5 text-sm text-gray-500">Kelola order dari marketplace secara live</p>
      </div>
    </div>

    <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <!-- Store selector -->
      <div class="border-b border-gray-100 px-6 py-4">
        <p class="mb-3 text-sm font-medium text-gray-700">Pilih Toko Marketplace</p>
        <div v-if="storesLoading" class="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 class="h-4 w-4 animate-spin" />
          Memuat toko...
        </div>
        <div v-else-if="!stores.length" class="text-sm text-gray-400">
          Tidak ada toko marketplace yang tersedia.
        </div>
        <div v-else class="flex flex-wrap gap-2">
          <button
            v-for="store in stores"
            :key="store.id"
            type="button"
            class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            :class="selectedStoreId === store.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            @click="selectedStoreId = store.id;search=''"
          >
            <img :src="'/images/platform/' + store.source + '.svg'" alt="" class="h-4 w-4 object-contain" />
            <span>{{ store.shop_name }}</span>
          </button>
        </div>
      </div>

      <!-- Search & Filters -->
      <div v-if="selectedStoreId" class="border-b border-gray-100 px-6 py-3 space-y-3">
        <!-- Search & Quick Filters -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Search input -->
          <div class="relative flex-1 min-w-[280px]">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari order ID"
              class="w-full rounded-lg border border-gray-300 py-1.5 pl-10 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
            />
            <button
              v-if="search"
              type="button"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
              @click="search = ''"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>
          <div class="w-auto">
            <AppDateRangePicker v-model="dateRange" />
          </div>
          <div class="w-auto">
            <AppFilterSelect
              v-model="status"
              :options="statusOptions"
              placeholder="Status"
              :searchable="false"
            />
          </div>

          <!-- Refresh button -->
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            :disabled="loading"
            @click="refresh"
          >
            <RefreshCw :class="['h-3.5 w-3.5', loading && 'animate-spin']" />
          </button>
          
          <!-- clear -->
          <button
            v-if="search || status || dateRange.from || dateRange.to || orderAppFilter !== 'all'"
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-2.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            @click="clearFilters"
          >
            <X class="h-3 w-3 text-red-500" /> 
          </button>
        </div>

        <!-- Order App Filter -->
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-gray-600">Status di Aplikasi:</span>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
              :class="orderAppFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="orderAppFilter = 'all'"
            >
              Semua
            </button>
            <button
              type="button"
              class="rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
              :class="orderAppFilter === 'with-order'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="orderAppFilter = 'with-order'"
            >
              Sudah di App
            </button>
            <button
              type="button"
              class="rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
              :class="orderAppFilter === 'without-order'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="orderAppFilter = 'without-order'"
            >
              Belum di App
            </button>
          </div>
        </div>

        <!-- Summary -->
        <div v-if="!loading && total > 0" class="text-xs text-gray-500">
          Total: <strong class="text-gray-900">{{ total }}</strong> order
          <span v-if="orderAppFilter !== 'all'" class="ml-2">
            • Ditampilkan: <strong class="text-gray-900">{{ filteredOrders.length }}</strong> order
          </span>
        </div>
      </div>

      <!-- Empty state: no store selected -->
      <div v-if="!selectedStoreId" class="flex flex-col items-center justify-center gap-3 py-16">
        <Package class="h-10 w-10 text-gray-200" />
        <p class="text-sm text-gray-400">Pilih toko untuk melihat daftar order</p>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
        <Loader2 class="h-5 w-5 animate-spin" />
        Memuat order...
      </div>

      <!-- Empty: no results -->
      <div v-else-if="!orders.length" class="py-16 text-center">
        <p class="text-sm text-gray-400">Tidak ada order ditemukan.</p>
      </div>

      <!-- Empty: filtered results -->
      <div v-else-if="!filteredOrders.length" class="py-16 text-center">
        <p class="text-sm text-gray-400">Tidak ada order yang sesuai dengan filter.</p>
      </div>

      <!-- Order list -->
      <template v-else>
        <!-- Import action bar -->
        <div
          v-if="selectedCount > 0"
          class="flex items-center justify-between gap-3 border-b border-gray-100 bg-blue-50/50 px-6 py-2.5"
        >
          <span class="text-xs font-medium text-blue-900">
            {{ selectedCount }} order dipilih
          </span>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="importing"
            @click="importSelectedOrders"
          >
            <CheckCircle2 class="h-3.5 w-3.5" />
            Import {{ selectedCount }} Order ke Aplikasi
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="border-b border-gray-200 bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-center font-medium text-gray-700">
                  <input
                    type="checkbox"
                    :checked="allSelected"
                    :indeterminate="selectedCount > 0 && !allSelected"
                    class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    @change="toggleSelectAll"
                  />
                </th>
                <th class="px-4 py-3 text-left font-medium text-gray-700">Order ID</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700">Tanggal</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700">Customer</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700">Kurir</th>
                <th class="px-4 py-3 text-center font-medium text-gray-700">Items</th>
                <th class="px-4 py-3 text-right font-medium text-gray-700">Total</th>
                <th class="px-4 py-3 text-center font-medium text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <template v-for="order in filteredOrders" :key="order.id">
                <!-- Main row -->
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-center">
                    <input
                      v-if="canSelectOrder(order)"
                      type="checkbox"
                      :checked="selectedOrderIds.has(order.id)"
                      class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      @change="toggleSelectOrder(order.id)"
                    />
                    <span v-else class="text-xs text-gray-400">-</span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex flex-col gap-1">
                      <span class="text-sm font-medium text-gray-900">{{ order.id }}</span>
                      <div class="flex flex-wrap gap-1">
                        <span
                          v-if="order.cod"
                          class="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 ring-1 ring-amber-200"
                        >
                          COD
                        </span>
                        <span
                          v-if="!order.is_binding"
                          class="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-medium text-red-700 ring-1 ring-red-200"
                        >
                          <X class="h-2 w-2" />
                          Belum Binding
                        </span>
                        <span
                          v-if="order.order.id"
                          class="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-1.5 py-0.5 text-[9px] font-medium text-green-700 ring-1 ring-green-200"
                        >
                          <CheckCircle2 class="h-2 w-2" />
                          Di App
                        </span>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex flex-col gap-0.5 text-xs text-gray-600 text-no-wrap">
                      <span class="text-nowrap">{{ formatDateTime(order.date_created) }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-block rounded-full px-2 py-1 text-[10px] font-medium capitalize"
                      :class="statusConfig[order.status]?.cls || 'bg-gray-100 text-gray-700'"
                    >
                      {{ statusConfig[order.status]?.label || order.status }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex flex-col gap-0.5">
                      <span class="text-xs font-medium text-gray-900">{{ order.customer.name }}</span>
                      <span class="text-[11px] text-gray-500">{{ order.customer.phone }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex flex-col gap-0.5 text-xs">
                      <span class="font-medium text-gray-700">{{ order.shipment.courier_name }} - {{ order.shipment.service_name }}</span>
                      <span class="text-[11px] text-gray-500">{{ order.shipment.tracking_no || '-' }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="font-medium text-gray-900">{{ order.items.length }}</span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <span class="font-semibold text-gray-900">Rp{{ formatCurrency(order.total) }}</span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                      @click="toggleExpand(order.id)"
                    >
                      <component :is="expandedIds.has(order.id) ? ChevronUp : ChevronDown" class="h-3.5 w-3.5" />
                      {{ expandedIds.has(order.id) ? 'Tutup' : 'Detail' }}
                    </button>
                  </td>
                </tr>

                <!-- Expanded detail row -->
                <tr v-if="expandedIds.has(order.id)">
                  <td colspan="9" class="bg-gray-50 px-4 py-0">
                    <div class="py-4">
                      <!-- Items Table -->
                      <div class="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <div class="border-b border-gray-200 bg-gray-50 px-3 py-2">
                          <h4 class="text-xs font-semibold text-gray-700">Detail Items</h4>
                        </div>
                        <table class="w-full text-xs">
                          <thead class="border-b border-gray-200 bg-gray-50">
                            <tr>
                              <th class="px-3 py-2 text-left font-medium text-gray-600">Produk</th>
                              <th class="px-3 py-2 text-left font-medium text-gray-600">SKU</th>
                              <th class="px-3 py-2 text-left font-medium text-gray-600">Varian</th>
                              <th class="px-3 py-2 text-left font-medium text-gray-600">Binding</th>
                              <th class="px-3 py-2 text-center font-medium text-gray-600">Qty</th>
                              <th class="px-3 py-2 text-right font-medium text-gray-600">Harga</th>
                              <th class="px-3 py-2 text-right font-medium text-gray-600">Diskon</th>
                              <th class="px-3 py-2 text-right font-medium text-gray-600">Total</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-gray-100">
                            <tr v-for="item in order.items" :key="item.id" class="hover:bg-gray-50">
                              <td class="px-3 py-2">
                                <div class="flex items-center gap-2">
                                  <img
                                    v-if="item.image"
                                    :src="item.image"
                                    :alt="item.product_name"
                                    class="h-10 w-10 rounded border border-gray-200 bg-white object-cover"
                                  />
                                  <span class="line-clamp-2 max-w-[200px] text-gray-900" :title="item.product_name">{{ item.product_name }}</span>
                                </div>
                              </td>
                              <td class="px-3 py-2">
                                <span class="font-mono text-gray-700">{{ item.sku }}</span>
                              </td>
                              <td class="px-3 py-2 text-gray-600">{{ item.variant }}</td>
                              <td class="px-3 py-2">
                                <div v-if="item.binding.sku" class="space-y-0.5">
                                  <div class="flex items-center gap-1 text-green-700">
                                    <CheckCircle2 class="h-3 w-3" />
                                    <span class="font-mono text-[11px]">{{ item.binding.sku }}</span>
                                  </div>
                                  <p class="line-clamp-1 text-gray-600" :title="item.binding.product_name">{{ item.binding.product_name }}</p>
                                  <p v-if="item.binding.variant" class="text-gray-500">{{ item.binding.variant }}</p>
                                </div>
                                <div v-else class="flex items-center gap-1 text-red-600">
                                  <X class="h-3 w-3" />
                                  <span class="text-[10px] font-medium">Belum Binding</span>
                                </div>
                              </td>
                              <td class="px-3 py-2 text-center text-gray-900">{{ item.qty }}</td>
                              <td class="px-3 py-2 text-right text-gray-700">Rp{{ formatCurrency(item.price) }}</td>
                              <td class="px-3 py-2 text-right text-gray-700">Rp{{ formatCurrency(item.discount) }}</td>
                              <td class="px-3 py-2 text-right font-medium text-gray-900">Rp{{ formatCurrency(item.total) }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <!-- Address & Summary Grid -->
                      <div class="grid gap-4 md:grid-cols-2">
                        <!-- Address -->
                        <div class="rounded-lg border border-gray-200 bg-white p-4">
                          <h4 class="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-700">
                            <MapPin class="h-3.5 w-3.5" />
                            Alamat Pengiriman
                          </h4>
                          <div class="space-y-1 text-xs">
                            <p class="font-medium text-gray-900">{{ order.address.name }}</p>
                            <p class="text-gray-600">{{ order.address.phone }}</p>
                            <p class="text-gray-600">{{ order.address.address }}</p>
                            <p class="text-gray-500">
                              {{ order.address.district }}, {{ order.address.city }}, {{ order.address.province }}
                              <span v-if="order.address.zipcode">{{ order.address.zipcode }}</span>
                            </p>
                          </div>
                        </div>

                        <!-- Summary -->
                        <div class="space-y-3">
                          <!-- Price Summary -->
                          <div class="rounded-lg border border-gray-200 bg-white p-4">
                            <h4 class="mb-2 text-xs font-semibold text-gray-700">Ringkasan Pembayaran</h4>
                            <div class="space-y-1.5 text-xs">
                              <div v-if="Number(order.discount) > 0" class="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>Rp{{ formatCurrency(order.subtotal) }}</span>
                              </div>
                              <div v-if="Number(order.discount) > 0" class="flex justify-between text-red-600">
                                <span>Diskon</span>
                                <span>-Rp{{ formatCurrency(order.discount) }}</span>
                              </div>
                              <div class="flex justify-between border-t border-gray-200 pt-1.5 font-semibold text-gray-900">
                                <span>Total</span>
                                <span>Rp{{ formatCurrency(order.total) }}</span>
                              </div>
                            </div>
                          </div>

                          <!-- Order Link -->
                          <div v-if="order.order.id" class="rounded-lg border border-green-200 bg-green-50 p-3">
                            <div class="flex items-start gap-2">
                              <CheckCircle2 class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                              <div class="flex-1 text-xs">
                                <p class="font-semibold text-green-900">Order sudah ada di aplikasi</p>
                                <p class="mt-1 text-green-700">
                                  No: <strong>{{ order.order.no }}</strong>
                                  <span v-if="order.order.status"> • Status: {{ order.order.status }}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Sentinel for infinite scroll -->
        <div ref="sentinelEl" class="flex items-center justify-center py-4">
          <template v-if="loadingMore">
            <Loader2 class="h-4 w-4 animate-spin text-gray-400" />
          </template>
          <template v-else-if="!nextCursor">
            <span class="text-xs text-gray-300">Semua order telah dimuat</span>
          </template>
        </div>
      </template>
    </div>

    <!-- Import Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showImportModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          @click.self="closeImportModal"
        >
          <div class="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            <!-- Modal header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h3 class="text-base font-semibold text-gray-900">Import Order ke Aplikasi</h3>
                <p class="mt-0.5 text-xs text-gray-500">
                  {{ importItems.length }} order akan diimport
                </p>
              </div>
              <button
                type="button"
                class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="importing"
                @click="closeImportModal"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Modal body: order list -->
            <div class="flex-1 overflow-y-auto px-5 py-3">
              <div class="divide-y divide-gray-100">
                <div
                  v-for="item in importItems"
                  :key="item.id"
                  class="flex items-start gap-3 py-3"
                >
                  <!-- Status icon -->
                  <div class="mt-0.5 flex-shrink-0">
                    <Loader2 v-if="item.status === 'loading'" class="h-5 w-5 animate-spin text-blue-600" />
                    <CheckCircle2 v-else-if="item.status === 'success'" class="h-5 w-5 text-green-600" />
                    <div v-else-if="item.status === 'error'" class="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                      <X class="h-3.5 w-3.5 text-red-600" />
                    </div>
                    <div v-else class="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                  </div>

                  <!-- Order info -->
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-gray-900">{{ item.order.id }}</span>
                      <span class="text-xs text-gray-500">{{ item.order.customer.name }}</span>
                      <span class="text-xs font-medium text-gray-700">Rp{{ formatCurrency(item.order.total) }}</span>
                    </div>
                    <p
                      v-if="item.message"
                      class="mt-1 text-xs"
                      :class="{
                        'text-blue-600': item.status === 'loading',
                        'text-green-600': item.status === 'success',
                        'text-red-600': item.status === 'error',
                        'text-gray-500': item.status === 'pending',
                      }"
                    >
                      {{ item.message }}
                    </p>
                    <p v-else-if="item.status === 'pending'" class="mt-1 text-xs text-gray-400">
                      Menunggu...
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Modal footer -->
            <div class="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-5 py-3">
              <div class="text-xs text-gray-600">
                <span class="text-green-600 font-medium">{{ importItems.filter(i => i.status === 'success').length }}</span> berhasil
                <span class="mx-1">•</span>
                <span class="text-red-600 font-medium">{{ importItems.filter(i => i.status === 'error').length }}</span> gagal
                <span class="mx-1">•</span>
                <span class="text-gray-500">{{ importItems.filter(i => i.status === 'pending' || i.status === 'loading').length }}</span> tersisa
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="importing"
                  @click="closeImportModal"
                >
                  {{ importItems.some(i => i.status === 'success' || i.status === 'error') ? 'Tutup' : 'Batal' }}
                </button>
                <button
                  v-if="importItems.some(i => i.status === 'pending' || i.status === 'error')"
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="importing"
                  @click="startImport"
                >
                  <Loader2 v-if="importing" class="h-3.5 w-3.5 animate-spin" />
                  <CheckCircle2 v-else class="h-3.5 w-3.5" />
                  {{ importing ? 'Mengimport...' : (importItems.some(i => i.status === 'error') ? 'Coba Lagi yang Gagal' : 'Mulai Import') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped> 
</style>