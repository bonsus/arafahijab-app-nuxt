<script setup lang="ts">
import {
  ArrowLeft, Search, Truck, Package, ChevronRight, RefreshCw, X, ScanLine, Printer
} from 'lucide-vue-next'
import { formatDateTime } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

interface ScanBatch {
  id: string
  created_at: string
  updated_at: string
  orders_count: number
  staff_name: string
}

interface PaginationData {
  page: number
  per_page: number
  total_page: number
  total: number
  data: ScanBatch[]
}

interface CourierOption { 
  id: string
  courier_code: string
  courier_name: string 
}

const api = useApi()
const router = useRouter()
const toast = useToast()

// State
const loading = ref(false)
const printing = ref<Set<string>>(new Set())
const batches = ref<ScanBatch[]>([])
const pagination = ref({
  page: 1,
  per_page: 20,
  total_page: 1,
  total: 0
})

// Filters
const filterDate = ref({ from: '', to: '' })
const filterCouriers = ref<string[]>([])
const search = ref('')

// Courier data
const couriers = ref<CourierOption[]>([])

// ─── Computed options ───────────────────────────────────────────────────────
const courierOptions = computed(() => 
  couriers.value.map(c => ({ value: c.courier_code || c.id, label: c.courier_name }))
)

const hasActiveFilters = computed(() => {
  return filterDate.value.from || filterDate.value.to || filterCouriers.value.length > 0 || search.value
})

// ─── Fetch couriers ─────────────────────────────────────────────────────────
async function fetchCouriers() {
  try {
    const res = await api.get<{ data: any }>('/couriers/index')
    couriers.value = (res.data?.data || res.data || []) as CourierOption[]
  }
  catch (err) {
    console.error('Failed to fetch couriers:', err)
    couriers.value = []
  }
}

// ─── Fetch batches ──────────────────────────────────────────────────────────
async function fetchBatches() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.value.page,
      per_page: pagination.value.per_page
    }

    if (filterDate.value.from) params.date_start = filterDate.value.from
    if (filterDate.value.to) params.date_end = filterDate.value.to
    if (filterCouriers.value.length > 0) params.courier_code = filterCouriers.value.join(',')
    if (search.value) params.search = search.value

    const res = await api.get<{ data: PaginationData }>('/sales/orders/scan-delivery/index', params)
    
    batches.value = res.data.data
    pagination.value = {
      page: res.data.page,
      per_page: res.data.per_page,
      total_page: res.data.total_page,
      total: res.data.total
    }
  }
  catch (err: any) {
    console.error('Failed to fetch batches:', err)
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
  fetchBatches()
}

function onSearch() {
  pagination.value.page = 1
  fetchBatches()
}

function handlePageChange(page: number) {
  pagination.value.page = page
  fetchBatches()
}

function viewDetail(batchId: string) {
  router.push(`/sales/order/scan-delivery-history/${batchId}`)
}

function goBack() {
  router.push('/sales/order')
}

function resetFilters() {
  filterDate.value = { from: '', to: '' }
  filterCouriers.value = []
  search.value = ''
  pagination.value.page = 1
  fetchBatches()
}

// ─── Print batch ────────────────────────────────────────────────────────────
async function handlePrint(batchId: string, event?: Event) {
  if (event) {
    event.stopPropagation()
  }
  
  printing.value.add(batchId)
  try {
    const response = await api.post<Blob>(`/sales/orders/scan-delivery/${batchId}/print`, {}, {
      responseType: 'blob'
    })
    
    // Create blob URL from response
    const blob = new Blob([response as BlobPart], { type: 'application/pdf' })
    const blobUrl = URL.createObjectURL(blob)
    
    // Open in new tab
    window.open(blobUrl, '_blank')
    
    // Trigger download
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `scan-delivery-${batchId}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
    
    toast.success('Dokumen berhasil dicetak')
  }
  catch (err) {
    console.error('Failed to print batch:', err)
    toast.error('Gagal mencetak dokumen')
  }
  finally {
    printing.value.delete(batchId)
  }
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  fetchCouriers()
  fetchBatches()
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
          History Scan Delivery
        </h1>
        <p class="text-sm text-gray-500">Riwayat batch scan pengiriman order</p>
      </div>
      <NuxtLink
        to="/sales/order/scan-delivery/scan"
        class="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      >
        <ScanLine class="h-4 w-4" />
        Scan Delivery
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 space-y-3"> 

      <!-- Search + Refresh + Reset -->
      <div class="flex items-center gap-2">
        <div class="relative flex-1 max-w-sm">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="search"
            type="text"
            placeholder="Cari batch..."
            class="w-full rounded-lg border border-gray-300 py-1.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
            @input="onSearch"
          />
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <AppDateRangePicker :model-value="filterDate" @update:model-value="onDateFilter" />
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <AppFilterSelect
            :model-value="filterCouriers"
            :options="courierOptions"
            multiple
            placeholder="Kurir"
            @update:model-value="v => { filterCouriers = v as string[]; onFilterChange() }"
            />
        </div>
        <button
          class="shrink-0 flex rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          title="Refresh data"
          :disabled="loading"
          @click="fetchBatches()"
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

    <!-- Batches Table -->
    <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <div class="border-b border-gray-100 px-5 py-3">
        <h3 class="text-sm font-semibold text-gray-900">
          Daftar Batch ({{ pagination.total }})
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
      <div v-else-if="batches.length === 0" class="flex flex-col items-center justify-center py-12">
        <Package class="h-12 w-12 text-gray-400" />
        <p class="mt-2 text-sm font-medium text-gray-900">Tidak ada data batch</p>
        <p class="text-xs text-gray-500">Belum ada history scan delivery</p>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
            <tr>
              <th class="w-10 px-4 py-3 text-left">#</th>
              <th class="px-4 py-3 text-left">Batch ID</th>
              <th class="px-4 py-3 text-left">Waktu Dibuat</th>
              <th class="px-4 py-3 text-left">Staff</th>
              <th class="px-4 py-3 text-center">Jumlah Order</th>
              <th class="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(batch, index) in batches"
              :key="batch.id"
              class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50 cursor-pointer"
            >
              <td class="px-4 py-3">
                <span class="text-gray-500">{{ (pagination.page - 1) * pagination.per_page + index + 1 }}</span>
              </td>
              <td class="px-4 py-3">
                <NuxtLink
                  :to="`/sales/order/scan-delivery/${batch.id}`"
                  class="text-xs text-gray-900 font-medium hover:underline"
                  @click.stop
                >
                  {{ batch.id }}
                </NuxtLink>
              </td>
              <td class="px-4 py-3">
                <span class="text-xs text-gray-900">{{ formatDateTime(batch.created_at) }}</span>
              </td>
              <td class="px-4 py-3">
                <span class="text-xs text-gray-900">{{ batch.staff_name }}</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                  {{ batch.orders_count }} order{{ batch.orders_count > 1 ? 's' : '' }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs border-1 border-gray-300 font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="printing.has(batch.id)"
                    :title="printing.has(batch.id) ? 'Memproses...' : 'Print'"
                    @click.stop="handlePrint(batch.id, $event)"
                  >
                    <Printer class="h-4 w-4" :class="{ 'animate-pulse': printing.has(batch.id) }" />
                    Print
                  </button> 
                </div>
              </td>
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
