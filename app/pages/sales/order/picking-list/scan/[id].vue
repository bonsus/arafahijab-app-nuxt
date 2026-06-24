<script setup lang="ts">
import {
  ArrowLeft, Package, MapPin, Clock, User, Layers, ShoppingBag, CheckCircle,
  AlertCircle, Loader2, Scan, TrendingUp, ChevronDown, ChevronUp, X
} from 'lucide-vue-next'
import { formatDate } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

interface Warehouse {
  id: string
  name: string
  address: string
  city: string
  province: string
  district: string
  zipcode: string
}

interface Variant {
  name: string
  value: string
}

interface PickingItem {
  id: string
  order_picking_id: string
  order_id: string
  order_item_id: string
  product_id: string
  sku_id: string
  qty: number
  qty_picked: number
  stock_fifo_id: string
  product_name: string
  sku: string
  variants: Variant[]
  zone_id: string
  zone_code: string
  rack_id: string
  rack_code: string
  bin_id: string
  bin_code: string
}

interface PickingListDetail {
  id: string
  warehouse_id: string
  no: string
  date: string
  status: string
  created_at: string
  updated_at: string
  order_count: number
  product_count: number
  sku_count: number
  qty: number
  qty_picked: number
  items: PickingItem[]
  warehouse: Warehouse
}

interface OrderInfo {
  id: string
  no: string
  status: string
  sub_status: string
}

interface PickedHistory {
  id: string
  order_picking_id: string
  order_item_id: string
  sku_id: string
  sku: string
  product_name: string
  variants: Variant[]
  qty_picked: number
  created_at: string
  staff_name: string
}

const api = useApi()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const loading = ref(true)
const pickingList = ref<PickingListDetail | null>(null)
const orders = ref<OrderInfo[]>([])
const histories = ref<PickedHistory[]>([])
const scanning = ref(false)
const loadingHistories = ref(false)

// Error modal state
const showErrorModal = ref(false)
const errorMessage = ref('')

// Scanner state
const scanInput = ref('')
const activeTab = ref<'all' | 'incomplete' | 'complete'>('all')

// Pagination state for histories
const currentPage = ref(1)
const hasMoreHistories = ref(true)
const loadingMoreHistories = ref(false)

// Status config
const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'text-yellow-600 bg-yellow-50 ring-1 ring-yellow-200' },
  in_progress: { label: 'Sedang Proses', cls: 'text-blue-600 bg-blue-50 ring-1 ring-blue-200' },
  completed: { label: 'Selesai', cls: 'text-green-600 bg-green-50 ring-1 ring-green-200' },
}

// ─── Fetch data ─────────────────────────────────────────────────────────────
async function fetchPickingList() {
  loading.value = true
  try {
    const id = route.params.id as string
    const [pickingRes, ordersRes] = await Promise.all([
      api.get<{ data: PickingListDetail }>(`/sales/orders/picking-lists/${id}`),
      api.get<{ data: OrderInfo[] }>(`/sales/orders/picking-lists/${id}/orders`)
    ])
    
    pickingList.value = pickingRes.data
    orders.value = ordersRes.data || []
  }
  catch (err) {
    toast.error('Terjadi kesalahan saat memuat data picking list')
    pickingList.value = null
  }
  finally {
    loading.value = false
  }
}

async function fetchHistories() {
  loadingHistories.value = true
  try {
    const id = route.params.id as string
    const res = await api.get<{ data: { data: PickedHistory[]; total?: number; per_page?: number } }>(`/sales/orders/picking-lists/${id}/picked-histories`, {
      page: '1',
      per_page: '10'
    })
    histories.value = res.data?.data || []
    currentPage.value = 1
    
    // Check if there are more pages
    const total = res.data?.total || 0
    const perPage = res.data?.per_page || 10
    hasMoreHistories.value = histories.value.length < total
  }
  catch (err) {
    console.error('Failed to load histories:', err)
  }
  finally {
    loadingHistories.value = false
  }
}

async function loadMoreHistories() {
  if (loadingMoreHistories.value || !hasMoreHistories.value) return
  
  loadingMoreHistories.value = true
  try {
    const id = route.params.id as string
    const nextPage = currentPage.value + 1
    const res = await api.get<{ data: { data: PickedHistory[]; total?: number; per_page?: number } }>(`/sales/orders/picking-lists/${id}/picked-histories`, {
      page: nextPage.toString(),
      per_page: '10'
    })
    
    const newHistories = res.data?.data || []
    if (newHistories.length > 0) {
      histories.value = [...histories.value, ...newHistories]
      currentPage.value = nextPage
      
      // Check if there are more pages
      const total = res.data?.total || 0
      hasMoreHistories.value = histories.value.length < total
    } else {
      hasMoreHistories.value = false
    }
  }
  catch (err) {
    console.error('Failed to load more histories:', err)
    toast.error('Gagal memuat riwayat')
  }
  finally {
    loadingMoreHistories.value = false
  }
}

// ─── Scanner handlers ───────────────────────────────────────────────────────
async function handleScan() {
  if (!scanInput.value.trim() || !pickingList.value) return

  const sku = scanInput.value.trim()
  scanning.value = true

  try {
    const id = route.params.id as string
    const response = await api.post<{ data: any }>(`/sales/orders/picking-lists/${id}/add-picked`, {
      sku_id: sku,
      qty_picked: 1
    })

    // Update data locally (optimistic update)
    if (pickingList.value) {
      // Find the first item by SKU that is not yet fully picked
      // This ensures if LOK: A is full, it moves to LOK: B automatically
      const item = pickingList.value.items.find(i => 
        (i.sku === sku || i.sku_id === sku) && i.qty_picked < i.qty
      )
      if (item) {
        item.qty_picked += 1
        pickingList.value.qty_picked += 1
        
        // Update picking list status
        // If first scan (was 0, now 1), change to in_progress
        if (pickingList.value.qty_picked === 1 && pickingList.value.status === 'pending') {
          pickingList.value.status = 'in_progress'
        }
        
        // If all items are picked, change to completed
        if (pickingList.value.qty_picked >= pickingList.value.qty) {
          pickingList.value.status = 'completed'
        }
      }

      // Add to history (prepend)
      if (item) {
        const newHistory: PickedHistory = {
          id: `temp_${Date.now()}`,
          order_picking_id: pickingList.value.id,
          order_item_id: item.order_item_id,
          sku_id: item.sku_id,
          sku: item.sku,
          product_name: item.product_name,
          variants: item.variants,
          qty_picked: 1,
          created_at: new Date().toISOString(),
          staff_name: 'You'
        }
        histories.value.unshift(newHistory)
        // Keep only last 10 histories on current page
        if (histories.value.length > 10 * currentPage.value) {
          histories.value = histories.value.slice(0, 10 * currentPage.value)
        }
      }
    }
    
    toast.success('SKU berhasil discan')
    scanInput.value = ''
    
    // Auto-focus back to input after successful scan
    nextTick(() => {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement
      if (input) input.focus()
    })
  }
  catch (err: any) {
    // Show error modal instead of toast
    errorMessage.value = err.message || 'Gagal menyimpan scan. SKU tidak ditemukan atau sudah lengkap.'
    showErrorModal.value = true
  }
  finally {
    scanning.value = false
  }
}

function closeErrorModal() {
  showErrorModal.value = false
  errorMessage.value = ''
  scanInput.value = '' // Clear input on error
  // Focus back to input
  nextTick(() => {
    const input = document.querySelector('input[type="text"]') as HTMLInputElement
    if (input) input.focus()
  })
}

function handleKeyPress(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleScan()
  }
}

// ─── Handlers ───────────────────────────────────────────────────────────────
function goBack() {
  router.push('/sales/order/picking-list')
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  fetchPickingList()
  fetchHistories()
  
  // Auto-focus input on mount
  nextTick(() => {
    const input = document.querySelector('input[type="text"]') as HTMLInputElement
    if (input) input.focus()
  })
  
  // Listen for escape and enter key globally
  const handleKeydown = (e: KeyboardEvent) => {
    if ((e.key === 'Escape' || e.key === 'Enter') && showErrorModal.value) {
      closeErrorModal()
    }
  }
  document.addEventListener('keydown', handleKeydown)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
})

// ─── Computed ───────────────────────────────────────────────────────────────
const progress = computed(() => {
  if (!pickingList.value || pickingList.value.qty === 0) return 0
  return Math.round((pickingList.value.qty_picked / pickingList.value.qty) * 100)
})

const estimatedTime = computed(() => {
  if (!pickingList.value) return '0 menit'
  const remaining = pickingList.value.qty - pickingList.value.qty_picked
  const minutes = Math.ceil(remaining * 0.6) // Estimasi 36 detik per item
  return `${minutes} menit`
})

// Filter items
const filteredItems = computed(() => {
  if (!pickingList.value?.items) return []
  
  const items = [...pickingList.value.items].sort((a, b) => {
    const locA = `${a.zone_code}-${a.rack_code}-${a.bin_code}`
    const locB = `${b.zone_code}-${b.rack_code}-${b.bin_code}`
    return locA.localeCompare(locB)
  })

  if (activeTab.value === 'incomplete') {
    return items.filter(item => item.qty_picked < item.qty)
  }
  if (activeTab.value === 'complete') {
    return items.filter(item => item.qty_picked >= item.qty)
  }
  return items
})

// Stats
const completeCount = computed(() => {
  if (!pickingList.value?.items) return 0
  return pickingList.value.items.filter(item => item.qty_picked >= item.qty).length
})

const incompleteCount = computed(() => {
  if (!pickingList.value?.items) return 0
  return pickingList.value.items.filter(item => item.qty_picked < item.qty).length
})

const notStartedCount = computed(() => {
  if (!pickingList.value?.items) return 0
  return pickingList.value.items.filter(item => item.qty_picked === 0).length
})

// Get item progress percentage
function getItemProgress(item: PickingItem) {
  if (item.qty === 0) return 0
  return Math.round((item.qty_picked / item.qty) * 100)
}

// Get item status
function getItemStatus(item: PickingItem) {
  const remaining = item.qty - item.qty_picked
  if (remaining === 0) {
    return { label: 'Selesai', cls: 'bg-green-50 text-green-700 ring-green-200' }
  }
  if (item.qty_picked > 0) {
    return { label: 'Kurang', cls: 'bg-orange-50 text-orange-700 ring-orange-200' }
  }
  return { label: 'Belum dipicking', cls: 'bg-gray-50 text-gray-600 ring-gray-200' }
}
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
          Picking List
        </h1>
        <p class="text-sm text-gray-500">Scan barcode produk untuk proses picking</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-4">
      <div class="grid gap-4 lg:grid-cols-12">
        <div class="space-y-4 lg:col-span-8">
          <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div class="h-6 w-48 animate-pulse rounded bg-gray-200" />
            <div class="mt-4 space-y-3">
              <div v-for="i in 3" :key="i" class="h-4 w-full animate-pulse rounded bg-gray-100" />
            </div>
          </div>
        </div>
        <div class="lg:col-span-4">
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div class="h-4 w-24 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <template v-else-if="pickingList">
      <div class="grid gap-4 lg:grid-cols-12">
        <!-- LEFT MAIN CONTENT (8/12) -->
        <div class="space-y-4 lg:col-span-8">
          <!-- Picking Info Card -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <!-- Info -->
              <div class="space-y-3">
                <div>
                  <p class="text-xs text-gray-500">Picking List</p>
                  <p class="text-2xl font-bold text-gray-900">{{ pickingList.no }}</p>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                  <span
                    v-if="statusConfig[pickingList.status]"
                    :class="statusConfig[pickingList.status]?.cls"
                    class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1"
                  >
                    {{ statusConfig[pickingList.status]?.label }}
                  </span>
                </div>
                <div class="flex items-center gap-4 text-sm text-gray-600">
                  <div class="flex items-center gap-1.5">
                    <Clock class="h-4 w-4" />
                    <span>{{ formatDate(pickingList.date) }}</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <User class="h-4 w-4" />
                    <span>{{ pickingList.warehouse.name }}</span>
                  </div>
                </div>
              </div>

              <!-- Progress -->
              <div class="text-right">
                <p class="text-xs text-gray-500">PROGRESS PICKING</p>
                <p class="text-3xl font-bold text-gray-900">{{ progress }}%</p>
                <p class="mt-1 text-xs text-gray-500">
                  {{ pickingList.qty_picked }} / {{ pickingList.qty }} qty
                </p>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="mt-4">
              <div class="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                <span>{{ pickingList.sku_count }} SKU</span>
                <span>{{ pickingList.order_count }} Order</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-3">
                <div
                  class="h-3 rounded-full transition-all"
                  :class="progress >= 100 ? 'bg-green-500' : 'bg-blue-500'"
                  :style="{ width: `${progress}%` }"
                />
              </div>
            </div>

            <!-- Stats Cards -->
            <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div class="rounded-lg bg-gray-50 p-3 text-center">
                <p class="text-xs text-gray-500">Total SKU</p>
                <p class="text-xl font-bold text-gray-900">{{ pickingList.sku_count }}</p>
              </div>
              <div class="rounded-lg bg-gray-50 p-3 text-center">
                <p class="text-xs text-gray-500">Total Order</p>
                <p class="text-xl font-bold text-gray-900">{{ pickingList.order_count }}</p>
              </div>
              <div class="rounded-lg bg-gray-50 p-3 text-center">
                <p class="text-xs text-gray-500">Total Qty</p>
                <p class="text-xl font-bold text-gray-900">{{ pickingList.qty }}</p>
              </div>
              <div class="rounded-lg bg-blue-50 p-3 text-center ring-1 ring-blue-200">
                <p class="text-xs text-blue-700">Estimasi</p>
                <p class="text-xl font-bold text-blue-900">~{{ estimatedTime }}</p>
              </div>
            </div>
          </div>

          <!-- Scanner Card -->
          <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="border-b border-gray-100 px-5 py-4">
              <h3 class="text-base font-semibold text-gray-900">Scan barcode produk</h3>
              <p class="text-xs text-gray-500 mt-0.5">Arahkan scanner ke barcode atau input manual</p>
            </div>
            <div class="p-5">
              <div class="flex items-center gap-3">
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 ring-1 ring-primary-100">
                  <Scan class="h-8 w-8 text-primary-400" />
                </div>
                <div class="flex-1">
                  <div class="relative">
                    <input
                      v-model="scanInput"
                      type="text"
                      placeholder="Input SKU / Barcode"
                      class="w-full rounded-lg border-1 border-gray-300 bg-white px-4 py-3 text-base font-medium focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      :disabled="scanning || showErrorModal"
                      @keypress="handleKeyPress"
                    />
                    <!-- <p class="mt-1 text-xs text-gray-500">Contoh: 889700123456</p> -->
                  </div>
                </div>
                <!-- <button
                  type="button"
                  :disabled="!scanInput.trim() || scanning || showErrorModal"
                  class="flex h-12 items-center gap-2 rounded-lg bg-primary-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="handleScan"
                >
                  <Loader2 v-if="scanning" class="h-4 w-4 animate-spin" />
                  Enter
                </button> -->
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <!-- Tabs -->
            <div class="border-b border-gray-200 px-5">
              <div class="flex gap-1 overflow-x-auto">
                <button
                  type="button"
                  :class="activeTab === 'all' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
                  class="shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors"
                  @click="activeTab = 'all'"
                >
                  Semua SKU ({{ pickingList.sku_count }})
                </button>
                <button
                  type="button"
                  :class="activeTab === 'incomplete' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
                  class="shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors"
                  @click="activeTab = 'incomplete'"
                >
                  Belum Lengkap ({{ incompleteCount }})
                </button>
                <button
                  type="button"
                  :class="activeTab === 'complete' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
                  class="shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors"
                  @click="activeTab = 'complete'"
                >
                  Selesai ({{ completeCount }})
                </button>
              </div>
            </div>

            <!-- Table (desktop) -->
            <div class="hidden overflow-x-auto lg:block">
              <table class="w-full text-sm">
                <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th class="px-4 py-2.5 text-left">#</th>
                    <th class="px-4 py-2.5 text-left">Produk</th>
                    <th class="px-4 py-2.5 text-left">Lokasi</th>
                    <th class="px-4 py-2.5 text-center">Target Qty</th>
                    <th class="px-4 py-2.5 text-center">Picked Qty</th>
                    <th class="px-4 py-2.5 text-center">Sisa</th>
                    <th class="px-4 py-2.5 text-left">Progress</th>
                    <th class="px-4 py-2.5 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, index) in filteredItems"
                    :key="item.id"
                    class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50"
                  >
                    <!-- # -->
                    <td class="px-4 py-3 align-top">
                      <span class="text-gray-500">{{ index + 1 }}</span>
                    </td>

                    <!-- Produk -->
                    <td class="px-4 py-3 align-top">
                      <div class="min-w-[200px]">
                        <p class="text-sm font-medium text-gray-900">{{ item.product_name }}</p>
                        <p class="text-xs text-gray-500 mt-0.5">SKU: {{ item.sku }}</p>
                        <div
                          v-if="item.variants && item.variants.length > 0"
                          class="flex flex-wrap gap-1 mt-1.5"
                        >
                          <span
                            v-for="(variant, idx) in item.variants"
                            :key="idx"
                            class="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700"
                          >
                            {{ variant.name }}: {{ variant.value }}
                          </span>
                        </div>
                      </div>
                    </td>

                    <!-- Lokasi -->
                    <td class="px-4 py-3 align-top">
                      <div class="flex items-start gap-2 min-w-[100px]">
                        <MapPin class="h-3.5 w-3.5 shrink-0 text-gray-400 mt-0.5" />
                        <div>
                          <p class="text-xs font-semibold text-gray-900">
                            {{ item.zone_code }}-{{ item.rack_code }}-{{ item.bin_code }}
                          </p>
                        </div>
                      </div>
                    </td>

                    <!-- Target Qty -->
                    <td class="px-4 py-3 text-center align-top">
                      <span class="text-base font-bold text-gray-900">{{ item.qty }}</span>
                    </td>

                    <!-- Picked Qty -->
                    <td class="px-4 py-3 text-center align-top">
                      <span
                        class="text-base font-bold"
                        :class="item.qty_picked >= item.qty ? 'text-green-600' : 'text-orange-600'"
                      >
                        {{ item.qty_picked }}
                      </span>
                    </td>

                    <!-- Sisa -->
                    <td class="px-4 py-3 text-center align-top">
                      <span class="text-sm font-semibold text-gray-700">
                        {{ Math.max(0, item.qty - item.qty_picked) }}
                      </span>
                    </td>

                    <!-- Progress -->
                    <td class="px-4 py-3 align-top">
                      <div class="space-y-1 min-w-[120px]">
                        <div class="flex items-center justify-between text-xs">
                          <span
                            class="font-medium"
                            :class="item.qty_picked >= item.qty ? 'text-green-600' : 'text-gray-700'"
                          >
                            {{ getItemProgress(item) }}%
                          </span>
                          <CheckCircle
                            v-if="item.qty_picked >= item.qty"
                            class="h-3.5 w-3.5 text-green-500"
                          />
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            class="h-1.5 rounded-full transition-all"
                            :class="item.qty_picked >= item.qty ? 'bg-green-500' : 'bg-orange-500'"
                            :style="{ width: `${getItemProgress(item)}%` }"
                          />
                        </div>
                      </div>
                    </td>

                    <!-- Status -->
                    <td class="px-4 py-3 align-top">
                      <span
                        :class="getItemStatus(item).cls"
                        class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1"
                      >
                        {{ getItemStatus(item).label }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Card list (mobile / tablet) -->
            <div class="divide-y divide-gray-100 lg:hidden">
              <div
                v-for="(item, index) in filteredItems"
                :key="item.id"
                class="p-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-400">#{{ index + 1 }}</span>
                      <p class="truncate text-sm font-medium text-gray-900">{{ item.product_name }}</p>
                    </div>
                    <p class="mt-0.5 text-xs text-gray-500">SKU: {{ item.sku }}</p>
                    <div
                      v-if="item.variants && item.variants.length > 0"
                      class="mt-1.5 flex flex-wrap gap-1"
                    >
                      <span
                        v-for="(variant, idx) in item.variants"
                        :key="idx"
                        class="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700"
                      >
                        {{ variant.name }}: {{ variant.value }}
                      </span>
                    </div>
                  </div>
                  <span
                    :class="getItemStatus(item).cls"
                    class="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1"
                  >
                    {{ getItemStatus(item).label }}
                  </span>
                </div>

                <!-- Lokasi -->
                <div class="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
                  <MapPin class="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span class="font-semibold text-gray-900">{{ item.zone_code }}-{{ item.rack_code }}-{{ item.bin_code }}</span>
                </div>

                <!-- Qty -->
                <div class="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div class="rounded-lg bg-gray-50 py-2">
                    <p class="text-[10px] uppercase tracking-wide text-gray-500">Target</p>
                    <p class="text-base font-bold text-gray-900">{{ item.qty }}</p>
                  </div>
                  <div class="rounded-lg bg-gray-50 py-2">
                    <p class="text-[10px] uppercase tracking-wide text-gray-500">Picked</p>
                    <p
                      class="text-base font-bold"
                      :class="item.qty_picked >= item.qty ? 'text-green-600' : 'text-orange-600'"
                    >
                      {{ item.qty_picked }}
                    </p>
                  </div>
                  <div class="rounded-lg bg-gray-50 py-2">
                    <p class="text-[10px] uppercase tracking-wide text-gray-500">Sisa</p>
                    <p class="text-base font-bold text-gray-700">{{ Math.max(0, item.qty - item.qty_picked) }}</p>
                  </div>
                </div>

                <!-- Progress -->
                <div class="mt-3 space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span
                      class="font-medium"
                      :class="item.qty_picked >= item.qty ? 'text-green-600' : 'text-gray-700'"
                    >
                      {{ getItemProgress(item) }}%
                    </span>
                    <CheckCircle
                      v-if="item.qty_picked >= item.qty"
                      class="h-3.5 w-3.5 text-green-500"
                    />
                  </div>
                  <div class="h-1.5 w-full rounded-full bg-gray-200">
                    <div
                      class="h-1.5 rounded-full transition-all"
                      :class="item.qty_picked >= item.qty ? 'bg-green-500' : 'bg-orange-500'"
                      :style="{ width: `${getItemProgress(item)}%` }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT SIDEBAR (4/12) -->
        <div class="space-y-4 lg:col-span-4">
          <!-- Tips Scan -->
          <!-- <div class="rounded-xl bg-blue-50 p-4 ring-1 ring-blue-200">
            <h3 class="text-sm font-semibold text-blue-900 mb-3">💡 Tips Scan</h3>
            <ul class="space-y-2 text-xs text-blue-800">
              <li class="flex items-start gap-2">
                <CheckCircle class="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                <span>Pastikan barcode terbaca jelas</span>
              </li>
              <li class="flex items-start gap-2">
                <CheckCircle class="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                <span>Scan 1 per 1 item / carton</span>
              </li>
              <li class="flex items-start gap-2">
                <CheckCircle class="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                <span>Jumlah akan bertambah otomatis</span>
              </li>
            </ul>
          </div> -->

          <!-- Ringkasan Aktivitas -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h3 class="text-sm font-semibold text-gray-900 mb-4">Ringkasan Aktivitas</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="h-3 w-3 rounded-full bg-green-500" />
                  <span class="text-xs text-gray-600">Selesai</span>
                </div>
                <span class="text-sm font-bold text-gray-900">
                  {{ completeCount }} ({{ pickingList.sku_count > 0 ? Math.round((completeCount / pickingList.sku_count) * 100) : 0 }}%)
                </span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="h-3 w-3 rounded-full bg-orange-500" />
                  <span class="text-xs text-gray-600">Kurang</span>
                </div>
                <span class="text-sm font-bold text-gray-900">
                  {{ incompleteCount - notStartedCount }} ({{ pickingList.sku_count > 0 ? Math.round(((incompleteCount - notStartedCount) / pickingList.sku_count) * 100) : 0 }}%)
                </span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="h-3 w-3 rounded-full bg-gray-400" />
                  <span class="text-xs text-gray-600">Belum</span>
                </div>
                <span class="text-sm font-bold text-gray-900">
                  {{ notStartedCount }} ({{ pickingList.sku_count > 0 ? Math.round((notStartedCount / pickingList.sku_count) * 100) : 0 }}%)
                </span>
              </div>
            </div>
          </div>

          <!-- Riwayat Scan Terakhir -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-semibold text-gray-900">Riwayat Scan Terakhir</h3>
              <TrendingUp class="h-4 w-4 text-gray-400" />
            </div>
            
            <div v-if="loadingHistories" class="space-y-3">
              <div v-for="i in 3" :key="i" class="h-16 w-full animate-pulse rounded-lg bg-gray-100" />
            </div>

            <div v-else-if="histories.length === 0" class="py-8 text-center">
              <Package class="mx-auto h-8 w-8 text-gray-300" />
              <p class="mt-2 text-xs text-gray-500">Belum ada riwayat scan</p>
            </div>

            <div v-else class="space-y-2 max-h-[400px] overflow-y-auto">
              <div
                v-for="history in histories"
                :key="history.id"
                class="rounded-lg bg-green-50 p-3 ring-1 ring-green-200"
              >
                <div class="flex items-start gap-3">
                  <CheckCircle class="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                  <div class="flex-1 flex items-start justify-between">
                    <div class="min-w-0">
                      <p class="text-xs font-semibold text-green-900">{{ history.product_name }}</p>
                      <p class="text-[10px] text-green-700 mt-0.5">{{ history.sku }}</p>
                      <!-- variants -->
                      <div
                        v-if="history.variants && history.variants.length > 0"
                        class="flex flex-wrap gap-1 mt-1.5"
                      >
                        <span
                          v-for="(variant, idx) in history.variants"
                          :key="idx"
                          class="inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700"
                        >
                          {{ variant.value }}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div class="text-[12px] font-medium text-green-600 text-right">+{{ history.qty_picked }}</div>
                      <div class="text-[10px] text-green-600 text-right">{{ formatDateTime(history.created_at) }}</div>
                      <div class="text-[10px] text-green-600 text-right">by {{ history.staff_name }}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Load More Button -->
              <button
                v-if="hasMoreHistories"
                type="button"
                :disabled="loadingMoreHistories"
                class="w-full rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-xs font-medium text-gray-600 transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                @click="loadMoreHistories"
              >
                <span v-if="loadingMoreHistories" class="flex items-center justify-center gap-2">
                  <Loader2 class="h-3.5 w-3.5 animate-spin" />
                  Memuat...
                </span>
                <span v-else>Muat Lebih Banyak</span>
              </button>
            </div>
          </div>

          <!-- Informasi Picking -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h3 class="text-sm font-semibold text-gray-900 mb-4">Informasi Picking</h3>
            <div class="space-y-3 text-xs">
              <div>
                <p class="text-gray-500">Total SKU</p>
                <p class="text-lg font-bold text-gray-900">{{ pickingList.sku_count }}</p>
              </div>
              <div>
                <p class="text-gray-500">Total Qty Target</p>
                <p class="text-lg font-bold text-gray-900">{{ pickingList.qty }}</p>
              </div>
              <div>
                <p class="text-gray-500">Total Qty Picked</p>
                <p class="text-lg font-bold text-gray-900">{{ pickingList.qty_picked }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Error State -->
    <div v-else class="rounded-xl bg-white p-16 shadow-sm ring-1 ring-gray-200 text-center">
      <AlertCircle class="mx-auto h-12 w-12 text-gray-300" />
      <p class="mt-3 text-sm font-medium text-gray-500">Data tidak ditemukan</p>
      <button
        type="button"
        class="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        @click="goBack"
      >
        Kembali ke Daftar
      </button>
    </div>

    <!-- Error Modal -->
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
          v-if="showErrorModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4"
          @click.self="closeErrorModal"
        >
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="showErrorModal"
              class="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
            >
              <!-- Error Icon -->
              <div class="bg-red-50 px-6 pt-8 pb-6 text-center">
                <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 ring-4 ring-red-50">
                  <AlertCircle class="h-8 w-8 text-red-600" />
                </div>
                <h3 class="mt-4 text-lg font-bold text-gray-900">Gagal Scan</h3>
                <p class="mt-2 text-sm text-gray-600">{{ errorMessage }}</p>
                <p class="mt-3 text-xs text-gray-500">Tekan ESC / ENTER atau klik tombol di bawah untuk menutup</p>
              </div>

              <!-- Actions -->
              <div class="bg-gray-50 px-6 py-4">
                <button
                  type="button"
                  class="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  @click="closeErrorModal"
                  autofocus
                >
                  Tutup & Coba Lagi
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
