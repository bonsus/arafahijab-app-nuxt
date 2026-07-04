<script setup lang="ts">
import {
  Search, Eye, Package, Loader2, MapPin, ListChecks, ArrowLeft, Printer, Scan,  RefreshCw, Tag
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

interface PickingList {
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
  warehouse: Warehouse
}

interface Paginated {
  data: PickingList[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const loading = ref(true)
const pickingLists = ref<PickingList[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)
const printing = ref<string | null>(null)
const printingLabel = ref<string | null>(null)

// Modal state
const showScanModal = ref(false)

// Filter state
const search = ref('')
const filterDate = ref({ from: '', to: '' })
const filterStatus = ref('')

// Static options
const statusOptions = [
  { value: '', label: 'Semua' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'Sedang Proses' },
  { value: 'completed', label: 'Selesai' },
]

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  in_progress: { label: 'Sedang Proses', cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  completed: { label: 'Selesai', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
}

// ─── Fetch data ─────────────────────────────────────────────────────────────
async function fetchPickingLists() {
  loading.value = true
  router.replace({ query: buildQuery() })
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    if (filterDate.value.from) params.date_from = filterDate.value.from
    if (filterDate.value.to) params.date_to = filterDate.value.to
    if (filterStatus.value) params.status = filterStatus.value

    const res = await api.get<{ data: Paginated }>('/sales/orders/picking-lists', params)
    pickingLists.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch (err) {
    toast.error('Terjadi kesalahan saat memuat data picking list')
    pickingLists.value = []
  }
  finally {
    loading.value = false
  }
}

// ─── Query helpers ──────────────────────────────────────────────────────────
function buildQuery() {
  const q: Record<string, string> = {}
  if (page.value > 1) q.page = String(page.value)
  if (search.value) q.search = search.value
  if (filterDate.value.from) q.date_from = filterDate.value.from
  if (filterDate.value.to) q.date_to = filterDate.value.to
  if (filterStatus.value) q.status = filterStatus.value
  return q
}

function parseQuery() {
  const q = route.query
  page.value = Number(q.page) || 1
  search.value = (q.search as string) || ''
  filterDate.value.from = (q.date_from as string) || ''
  filterDate.value.to = (q.date_to as string) || ''
  filterStatus.value = (q.status as string) || ''
}

// ─── Handlers ──────────────────────────────────────────────────────────────
function onSearch() {
  page.value = 1
  fetchPickingLists()
}

function onPageChange(newPage: number) {
  page.value = newPage
  fetchPickingLists()
}

function onPerPageChange(newPerPage: number) {
  perPage.value = newPerPage
  page.value = 1
  fetchPickingLists()
}

function onFilterChange() {
  page.value = 1
  fetchPickingLists()
}

function viewDetail(id: string) {
  router.push(`/sales/order/picking-list/${id}`)
}

async function printPickingList(id: string, no: string) {
  printing.value = id
  try {
    const response = await api.post<Blob>(`/sales/orders/picking-lists/${id}/print`, {}, {
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
    link.download = `picking-list-${no}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
    
    toast.success('Picking list berhasil dicetak')
  }
  catch (err) {
    toast.error('Gagal mencetak picking list')
  }
  finally {
    printing.value = null
  }
}

async function printLabel(id: string, no: string) {
  printingLabel.value = id
  try {
    const response = await api.post<Blob>(`/sales/orders/picking-lists/${id}/print-label`, {}, {
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
    link.download = `label-${no}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
    
    toast.success('Label berhasil dicetak')
  }
  catch (err) {
    toast.error('Gagal mencetak label')
  }
  finally {
    printingLabel.value = null
  }
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  parseQuery()
  fetchPickingLists()
})

// ─── Computed ───────────────────────────────────────────────────────────────
const hasActiveFilters = computed(() => {
  return search.value || filterDate.value.from || filterDate.value.to || filterStatus.value
})
function goBack() {
  router.push('/sales/order')
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <!-- button go back -->
        <button
          type="button"
          class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          @click="goBack"
        >
          <ArrowLeft class="h-5 w-5" />
        </button>
        <div>   
          <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Picking List Order</h1>
          <p class="text-sm text-gray-500">Kelola picking list untuk proses pengambilan barang.</p>
        </div>
      </div>
      <div>
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          @click="showScanModal = true"
        >
          <Scan class="h-4 w-4" />
          Scan Picking
        </button>
      </div>
    </div>

    <!-- Filter Card -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="space-y-3 px-4 py-3">
        <!-- Search & Date & Status -->
        <div class="flex flex-wrap items-end gap-2">
          <!-- Search -->
          <div class="flex-1 min-w-[240px]">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                v-model="search"
                type="text"
                placeholder="Cari nomor picking list..."
                class="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                @keyup.enter="onSearch"
              />
            </div>
          </div>

          <!-- Date Range -->
          <div class="w-auto">
            <AppDateRangePicker
              :model-value="filterDate"
              @update:model-value="(val) => { filterDate = val; onFilterChange() }"
            />
          </div>

          <!-- Status -->
          <div class="w-auto">
            <AppFilterSelect
              :model-value="filterStatus"
              :options="statusOptions"
              :searchable="false"
              placeholder="Status"
              @update:model-value="v => { filterStatus = v as string; onFilterChange() }"
            />
          </div>
          <!-- refresh -->
          <div class="ml-auto">
            <button
              type="button"
              :disabled="loading"
              class="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="fetchPickingLists()"
            >
              <Loader2 v-if="loading" class="h-3.5 w-3.5 animate-spin" />
              <RefreshCw v-else class="h-3.5 w-3.5" /> 
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Table Card -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500">
            <tr>
              <th class="px-4 py-2.5 text-left">Picking List</th>
              <th class="px-4 py-2.5 text-left">Tanggal</th>
              <th class="px-4 py-2.5 text-left">Status</th>
              <th class="px-4 py-2.5 text-center">Order</th>
              <th class="px-4 py-2.5 text-center">Item</th>
              <th class="px-4 py-2.5 text-center">Qty</th>
              <th class="px-4 py-2.5 text-center">Progress</th>
              <th class="px-4 py-2.5" />
            </tr>
          </thead>

          <!-- Loading -->
          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-gray-100">
              <td class="px-4 py-3">
                <div class="space-y-1.5">
                  <div class="h-4 w-28 animate-pulse rounded bg-gray-200" />
                  <div class="h-3 w-20 animate-pulse rounded bg-gray-200" />
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="h-4 w-24 animate-pulse rounded bg-gray-200" />
              </td>
              <td class="px-4 py-3">
                <div class="h-5 w-20 animate-pulse rounded-full bg-gray-200" />
              </td>
              <td class="px-4 py-3">
                <div class="mx-auto h-4 w-8 animate-pulse rounded bg-gray-200" />
              </td>
              <td class="px-4 py-3">
                <div class="mx-auto h-4 w-8 animate-pulse rounded bg-gray-200" />
              </td>
              <td class="px-4 py-3">
                <div class="mx-auto h-4 w-12 animate-pulse rounded bg-gray-200" />
              </td>
              <td class="px-4 py-3">
                <div class="space-y-1">
                  <div class="h-3 w-20 animate-pulse rounded bg-gray-200" />
                  <div class="h-2 w-24 animate-pulse rounded-full bg-gray-200" />
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="ml-auto h-8 w-16 animate-pulse rounded bg-gray-200" />
              </td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="!pickingLists.length">
            <tr>
              <td colspan="8" class="px-4 py-16 text-center">
                <ListChecks class="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p class="text-sm font-medium text-gray-500">Belum ada picking list</p>
                <p class="mt-1 text-xs text-gray-400">
                  {{ hasActiveFilters ? 'Tidak ada picking list yang cocok dengan filter.' : 'Picking list akan muncul di sini.' }}
                </p>
              </td>
            </tr>
          </tbody>

          <!-- Rows -->
          <tbody v-else>
            <tr
              v-for="item in pickingLists"
              :key="item.id"
              class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50"
            >
              <!-- Picking List -->
              <td class="px-4 py-3 align-top">
                <div class="space-y-1">
                  <div>
                    <NuxtLink
                      :to="`/sales/order/picking-list/${item.id}`"
                      class="text-sm font-semibold text-primary-600 hover:underline flex items-center gap-2"
                    >
                      <Package class="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span class="font-semibold text-primary-600">{{ item.no }}</span>
                    </NuxtLink>
                  </div>
                  <div class="flex items-start gap-1.5">
                    <MapPin class="h-3 w-3 shrink-0 text-gray-400 mt-0.5" />
                    <div>
                      <p class="text-xs font-medium text-gray-400">{{ item.warehouse.name }}</p>
                    </div>
                  </div> 
                </div>
              </td>

              <!-- Warehouse -->
              <td class="px-4 py-3 align-top">
                <div class="text-xs text-gray-600">
                  {{ formatDateTime(item.date) }}
                </div>
              </td>

              <!-- Status -->
              <td class="px-4 py-3 align-top">
                <span
                  v-if="statusConfig[item.status]"
                  :class="statusConfig[item.status]?.cls"
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                >
                  {{ statusConfig[item.status]?.label }}
                </span>
                <span
                  v-else
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-50 text-gray-700 ring-1 ring-gray-200"
                >
                  {{ item.status }}
                </span>
              </td>

              <!-- Order Count -->
              <td class="px-4 py-3 text-center align-top">
                <span class="text-sm font-semibold text-gray-900">{{ item.order_count > 0 ? item.order_count : '-' }}</span>
              </td>

              <!-- Item Count -->
              <td class="px-4 py-3 text-center align-top">
                <div class="text-xs text-gray-600">
                  <p>{{ item.product_count > 0 ? item.product_count + ' produk' : '-' }}</p>
                  <p class="text-gray-400">{{ item.sku_count > 0 ? item.sku_count + ' SKU' : '-' }}</p>
                </div>
              </td>

              <!-- Qty -->
              <td class="px-4 py-3 text-center align-top">
                <span class="text-sm font-semibold text-gray-900">{{ item.qty > 0 ? item.qty : '-' }}</span>
              </td>

              <!-- Progress -->
              <td class="px-4 py-3 align-top">
                <div class="space-y-1 min-w-[100px]" v-if="item.qty > 0">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-500">{{ item.qty_picked }} / {{ item.qty }}</span>
                    <span class="font-medium text-gray-700">{{ item.qty > 0 ? Math.round((item.qty_picked / item.qty) * 100) : 0 }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      class="h-1.5 rounded-full transition-all"
                      :class="item.qty_picked >= item.qty ? 'bg-green-500' : 'bg-blue-500'"
                      :style="{ width: `${item.qty > 0 ? (item.qty_picked / item.qty) * 100 : 0}%` }"
                    />
                  </div>
                </div>
                <div v-else class="text-xs text-gray-400">-</div>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3 align-top">
                <div v-if="item.status!=='canceled'" class="flex items-center gap-2 justify-end">
                  <button v-if="item.status != 'completed'"
                    type="button"
                    class="flex items-center gap-1.5 rounded-lg border-1 border-green-400 px-3 py-1.5 text-xs font-medium text-green-600 transition-colors hover:bg-green-50"
                    @click.stop="router.push(`/sales/order/picking-list/scan/${item.id}`)"
                  >
                    <Scan class="h-3.5 w-3.5" />
                    Scan
                  </button>
                  <button
                    type="button"
                    :disabled="printing === item.id"
                    class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs border-1 border-gray-300 font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    @click.stop="printPickingList(item.id, item.no)"
                  >
                    <Loader2 v-if="printing === item.id" class="h-3.5 w-3.5 animate-spin" />
                    <Printer v-else class="h-3.5 w-3.5" />
                    Print
                  </button>
                  <button
                    type="button"
                    :disabled="printingLabel === item.id"
                    class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs border-1 border-primary-300 font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    @click.stop="printLabel(item.id, item.no)"
                  >
                    <Loader2 v-if="printingLabel === item.id" class="h-3.5 w-3.5 animate-spin" />
                    <Printer v-else class="h-3.5 w-3.5" />
                    Label
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
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

    <!-- Scan Picking Modal -->
    <AppScanPickingModal
      v-model="showScanModal"
    />
  </div>
</template>
