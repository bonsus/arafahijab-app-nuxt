<script setup lang="ts">
import {
  Search, RefreshCw, X, MoreVertical, Loader2,
  PackageX, Eye, RotateCcw, CheckCircle2, Ban, Trash2, ChevronDown,
  Copy, Check,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface FailedOrder {
  id: string
  business_id: string
  store_id: string
  source: string
  shop_id: string
  order_no: string
  mp_status: string
  reason: string
  note: string
  payload: Record<string, any>
  status: string
  attempts: number
  resolved_at: string | null
  created_at: string
  updated_at: string
}

interface Paginated {
  data: FailedOrder[]
  page: number
  per_page: number
  total_page: number
  total: number
}

interface StoreOption { id: string; shop_id: string; shop_name: string; source: string; status: string; count?: number }

interface StatusSummary {
  pending_count: number
  processing_count: number
  shipped_count: number
  all_completed_count: number
  canceled_count: number
  returned_count: number
  order_failed_count: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const route = useRoute()
const router = useRouter()

const loading = ref(true)
const orders = ref<FailedOrder[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

// ─── Filter state ─────────────────────────────────────────────────────────────
const search = ref('')
const activeTab = ref('')
const filterReason = ref('')
const filterStores = ref<string[]>([])
const filterDate = ref({ from: '', to: '' })

// ─── Data for filters ───────────────────────────────────────────────────────────
const stores = ref<StoreOption[]>([])
const statusSummary = ref<StatusSummary | null>(null)

// Only show marketplace stores in the store filter
const marketplaceStores = computed(() =>
  stores.value.filter(s => ['shopee', 'tiktok', 'lazada'].includes(s.source)),
)

// ─── Static options ─────────────────────────────────────────────────────────────
// Order-failed status filter (shown as a pill row below the tabs)
const statusFilterOptions = [
  { value: '', label: 'Semua' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Selesai' },
  { value: 'ignored', label: 'Diabaikan' },
]

// Order page tabs, mirrored here so it looks like one page — link back to /sales/order
const orderTabs = computed(() => {
  const sum = statusSummary.value
  return [
    { key: '', label: 'Semua', count: sum ? (sum.pending_count + sum.processing_count + sum.shipped_count + sum.all_completed_count + sum.canceled_count) : 0 },
    { key: 'pending', label: 'Pending', count: sum?.pending_count || 0 },
    { key: 'processing', label: 'Perlu Dikirim', count: sum?.processing_count || 0 },
    { key: 'shipped', label: 'Dikirim', count: sum?.shipped_count || 0 },
    { key: 'completed', label: 'Selesai', count: sum?.all_completed_count || 0 },
    { key: 'canceled', label: 'Dibatalkan', count: sum?.canceled_count || 0 },
  ]
})

const reasonOptions = [
  { value: 'unbound_sku', label: 'SKU Belum Binding' },
  { value: 'stock_empty', label: 'Stok Kosong' },
]

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  resolved: { label: 'Selesai', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  ignored: { label: 'Diabaikan', cls: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200' },
}

const reasonConfig: Record<string, { label: string; cls: string }> = {
  unbound_sku: { label: 'SKU Belum Binding', cls: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' },
  stock_empty: { label: 'Stok Kosong', cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' },
}

// ─── Copy to clipboard ──────────────────────────────────────────────────────────
const copiedKey = ref('')
let copiedTimer: ReturnType<typeof setTimeout> | null = null

async function copyToClipboard(text: string, key: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copiedKey.value = '' }, 1500)
    toast.success('Berhasil disalin')
  }
  catch {
    toast.error('Gagal menyalin')
  }
}

// ─── Action dropdown ────────────────────────────────────────────────────────────
const openMenuId = ref<string | null>(null)
const menuPos = ref({ top: '0px', left: '0px' })
const openMenuOrder = computed(() =>
  openMenuId.value ? orders.value.find(o => o.id === openMenuId.value) : null,
)

function toggleMenu(event: MouseEvent, orderId: string) {
  if (openMenuId.value === orderId) {
    openMenuId.value = null
    return
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const menuWidth = 200
  const left = Math.max(8, rect.right - menuWidth)
  menuPos.value = {
    top: `${rect.bottom + 4}px`,
    left: `${left}px`,
  }
  openMenuId.value = orderId
  event.stopPropagation()
}

function closeMenu() {
  openMenuId.value = null
}

// ─── Detail modal ───────────────────────────────────────────────────────────────
const detailOrder = ref<FailedOrder | null>(null)

function openDetail(order: FailedOrder) {
  detailOrder.value = order
  closeMenu()
}

function closeDetail() {
  detailOrder.value = null
}

const detailPayloadJson = computed(() =>
  detailOrder.value ? JSON.stringify(detailOrder.value.payload, null, 2) : '',
)

// ─── URL query sync ─────────────────────────────────────────────────────────────
function initFromQuery() {
  const q = route.query
  search.value = (q.q as string) || ''
  activeTab.value = (q.status as string) || ''
  filterReason.value = (q.reason as string) || ''
  filterStores.value = q.store ? (q.store as string).split(',') : []
  filterDate.value = { from: (q.date_from as string) || '', to: (q.date_to as string) || '' }
  page.value = q.page ? Number.parseInt(q.page as string, 10) : 1
  perPage.value = q.per_page ? Number.parseInt(q.per_page as string, 10) : 20
}

function buildQuery(): Record<string, string> {
  const q: Record<string, string> = {}
  if (search.value) q.q = search.value
  if (activeTab.value) q.status = activeTab.value
  if (filterReason.value) q.reason = filterReason.value
  if (filterStores.value.length) q.store = filterStores.value.join(',')
  if (filterDate.value.from) q.date_from = filterDate.value.from
  if (filterDate.value.to) q.date_to = filterDate.value.to
  if (page.value > 1) q.page = String(page.value)
  if (perPage.value !== 20) q.per_page = String(perPage.value)
  return q
}

// ─── Data fetching ──────────────────────────────────────────────────────────────
async function fetchOrders() {
  loading.value = true
  router.replace({ query: buildQuery() })
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    if (activeTab.value) params.status = activeTab.value
    if (filterReason.value) params.reason = filterReason.value
    if (filterStores.value.length) params.store_id = filterStores.value.join(',')
    if (filterDate.value.from) params.date_from = formatDateFromForApi(filterDate.value.from)
    if (filterDate.value.to) params.date_to = formatDateToForApi(filterDate.value.to)

    const res = await api.get<{ data: Paginated }>('/sales/order-failed/index', params)
    orders.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch {
    orders.value = []
  }
  finally {
    loading.value = false
  }
}

async function fetchStores() {
  try {
    const res = await api.get<{ data: StoreOption[] }>('/stores/public/index')
    stores.value = res.data || []
  }
  catch { stores.value = [] }
}

async function fetchStatusSummary() {
  try {
    const res = await api.get<{ data: StatusSummary }>('/sales/orders/status-summary')
    statusSummary.value = res.data || null
  }
  catch { statusSummary.value = null }
}

// ─── Event handlers ─────────────────────────────────────────────────────────────
let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchOrders() }, 300)
}

function onFilterChange() {
  page.value = 1
  fetchOrders()
}

function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1
  fetchOrders()
}

function onStatusFilter(value: string) {
  activeTab.value = value
  page.value = 1
  fetchOrders()
}

function onStoreFilter(id: string) {
  if (!id) {
    filterStores.value = []
  }
  else {
    const idx = filterStores.value.indexOf(id)
    if (idx >= 0) filterStores.value.splice(idx, 1)
    else filterStores.value.push(id)
  }
  page.value = 1
  fetchOrders()
}

function onPageChange(p: number) { page.value = p; fetchOrders() }
function onPerPageChange(pp: number) { perPage.value = pp; page.value = 1; fetchOrders() }

const hasActiveFilters = computed(() =>
  !!(search.value || filterReason.value || filterStores.value.length || filterDate.value.from || filterDate.value.to),
)

function resetFilters() {
  search.value = ''
  filterReason.value = ''
  filterStores.value = []
  filterDate.value = { from: '', to: '' }
  page.value = 1
  fetchOrders()
}

// ─── Actions ────────────────────────────────────────────────────────────────────
const retryingId = ref<string | null>(null)

async function retryImport(order: FailedOrder) {
  if (retryingId.value) return
  closeMenu()
  retryingId.value = order.id
  try {
    const res = await api.post<{ data: { status: string; note: string } }>(
      `/sales/order-failed/${order.id}/retry`,
    )
    const result = res.data
    if (result?.status === 'done') {
      toast.success(result.note || 'Order berhasil di-import')
    }
    else if (result?.status === 'skipped') {
      toast.error(result.note || 'Order belum bisa di-import')
    }
    else {
      toast.error(result?.note || 'Gagal memproses order')
    }
    await fetchOrders()
  }
  catch (e: any) {
    toast.error(e?.message || 'Gagal menjalankan retry')
  }
  finally {
    retryingId.value = null
  }
}

const updatingId = ref<string | null>(null)

async function updateStatus(order: FailedOrder, status: string) {
  if (updatingId.value) return
  closeMenu()
  updatingId.value = order.id
  try {
    await api.put(`/sales/order-failed/${order.id}/status`, { status })
    toast.success('Status berhasil diperbarui')
    await fetchOrders()
  }
  catch (e: any) {
    toast.error(e?.message || 'Gagal memperbarui status')
  }
  finally {
    updatingId.value = null
  }
}

async function deleteOrder(order: FailedOrder) {
  closeMenu()
  const ok = await confirm({
    title: 'Hapus Catatan Kegagalan',
    message: `Hapus catatan kegagalan order ${order.order_no}? Catatan marketplace tidak akan terpengaruh.`,
    confirmText: 'Hapus',
  })
  if (!ok) return
  try {
    await api.delete(`/sales/order-failed/${order.id}`)
    toast.success('Catatan kegagalan berhasil dihapus')
    await fetchOrders()
  }
  catch (e: any) {
    toast.error(e?.message || 'Gagal menghapus catatan')
  }
}

onMounted(() => {
  initFromQuery()
  fetchOrders()
  fetchStores()
  fetchStatusSummary()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Order Gagal Masuk</h1>
        <p class="text-sm text-gray-500">Kelola order marketplace yang gagal masuk karena stok kosong atau SKU belum di-binding.</p>
      </div> 
    </div>

    <!-- Filter Card -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">

      <!-- Status Tabs (mirror order page so it looks like one page) -->
      <div class="flex items-center gap-0 overflow-x-auto border-b border-gray-200">
        <span
          class="relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-5 py-3 text-sm font-medium text-primary-600"
        >
          <!-- <PackageX class="h-4 w-4" /> -->
          Gagal Masuk
          <span
            v-if="statusSummary && statusSummary.order_failed_count > 0"
            class="inline-flex items-center justify-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700"
          >
            {{ statusSummary.order_failed_count }}
          </span>
          <span class="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-primary-600" />
        </span>
        <span class="h-5 w-px shrink-0 self-center bg-gray-200" />
        <NuxtLink
          v-for="tab in orderTabs"
          :key="tab.key"
          :to="tab.key ? `/sales/order?tab=${tab.key}` : '/sales/order'"
          class="relative shrink-0 whitespace-nowrap px-5 py-3 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
        >
          <span class="flex items-center gap-2">
            {{ tab.label }}
            <span
              v-if="tab.count > 0"
              class="inline-flex items-center justify-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600"
            >
              {{ tab.count }}
            </span>
          </span>
        </NuxtLink>
      </div>

      <!-- Filter body -->
      <div class="space-y-3 px-4 py-3">

        <!-- Store filter (pill list) -->
        <div v-if="marketplaceStores.length" class="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
          <span class="shrink-0 pt-1 text-xs text-gray-400 sm:w-14">Toko</span>
          <div class="flex gap-1 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            <button
              class="shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-all"
              :class="filterStores.length === 0 ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
              @click="onStoreFilter('')"
            >
              Semua
            </button>
            <button
              v-for="store in marketplaceStores"
              :key="store.id"
              type="button"
              class="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              :class="filterStores.includes(store.id)
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
              @click="onStoreFilter(store.id)"
            >
              <img :src="'/images/platform/' + store.source + '.svg'" alt="" class="h-4 w-4 object-contain" />
              <span>{{ store.shop_name }}</span>
            </button>
          </div>
        </div>

        <!-- Status filter (pill list) -->
        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
          <span class="shrink-0 pt-1 text-xs text-gray-400 sm:w-14">Status</span>
          <div class="flex gap-1 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            <button
              v-for="opt in statusFilterOptions"
              :key="opt.value"
              class="shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-all"
              :class="activeTab === opt.value
                ? (opt.value === '' ? 'bg-gray-900 text-white' : 'bg-blue-100 text-blue-600')
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
              @click="onStatusFilter(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Search + filters -->
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div class="relative w-full sm:flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari no order..."
              class="w-full rounded-lg border border-gray-300 py-1.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              @keydown.enter="onSearch"
              @input="onSearch"
            />
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <AppFilterSelect
              :model-value="filterReason"
              :options="reasonOptions"
              :searchable="false"
              placeholder="Alasan"
              @update:model-value="v => { filterReason = v as string; onFilterChange() }"
            />
            <AppDateRangePicker :model-value="filterDate" @update:model-value="onDateFilter" />
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
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500">
            <tr>
              <th class="px-4 py-2.5 text-left">Order</th>
              <th class="px-4 py-2.5 text-left">Alasan</th>
              <th class="px-4 py-2.5 text-left">Catatan</th>
              <th class="px-4 py-2.5 text-left">Status</th>
              <th class="px-4 py-2.5 text-left">Percobaan</th>
              <th class="px-4 py-2.5 text-left">Tanggal</th>
              <th class="px-4 py-2.5" />
            </tr>
          </thead>

          <!-- Loading -->
          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-gray-100">
              <td class="px-4 py-3">
                <div class="space-y-1.5">
                  <div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  <div class="h-3 w-20 animate-pulse rounded bg-gray-200" />
                </div>
              </td>
              <td class="px-4 py-3"><div class="h-5 w-24 animate-pulse rounded-full bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-40 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-5 w-16 animate-pulse rounded-full bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-8 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-3 w-24 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="ml-auto h-4 w-6 animate-pulse rounded bg-gray-200" /></td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="!orders.length">
            <tr>
              <td colspan="7" class="px-4 py-16 text-center">
                <PackageX class="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p class="text-sm font-medium text-gray-500">Tidak ada order gagal</p>
                <p class="mt-1 text-xs text-gray-400">
                  {{ hasActiveFilters ? 'Tidak ada data yang cocok dengan filter.' : 'Semua order marketplace berhasil masuk.' }}
                </p>
              </td>
            </tr>
          </tbody>

          <!-- Rows -->
          <tbody v-else>
            <tr
              v-for="order in orders"
              :key="order.id"
              class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50"
            >
              <!-- Order -->
              <td class="px-4 py-3 align-top">
                <div class="space-y-1">
                  <div class="flex items-center gap-1.5">
                    <img
                      v-if="order.source"
                      :src="`/images/platform/${order.source}.svg`"
                      alt=""
                      class="h-4 w-4 object-contain"
                      @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
                    />
                    <span class="font-semibold text-gray-900">{{ order.order_no }}</span>
                    <button
                      type="button"
                      class="rounded py-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      title="Salin nomor order"
                      @click.stop="copyToClipboard(order.order_no, 'order-' + order.id)"
                    >
                      <Check v-if="copiedKey === 'order-' + order.id" class="h-3 w-3 text-green-600" />
                      <Copy v-else class="h-3 w-3" />
                    </button>
                  </div>
                  <p class="text-xs capitalize text-gray-500">{{ order.source }}</p>
                  <p v-if="order.mp_status" class="text-[10px] text-gray-400">MP: {{ order.mp_status }}</p>
                </div>
              </td>

              <!-- Alasan -->
              <td class="px-4 py-3 align-top">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs text-nowrap"
                  :class="reasonConfig[order.reason]?.cls || 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'"
                >
                  {{ reasonConfig[order.reason]?.label || order.reason }}
                </span>
              </td>

              <!-- Catatan -->
              <td class="px-4 py-3 align-top">
                <p class="max-w-[280px] text-xs leading-relaxed text-gray-600">{{ order.note || '—' }}</p>
              </td>

              <!-- Status -->
              <td class="px-4 py-3 align-top">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="statusConfig[order.status]?.cls || 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'"
                >
                  {{ statusConfig[order.status]?.label || order.status }}
                </span>
              </td>

              <!-- Percobaan -->
              <td class="px-4 py-3 align-top">
                <span class="inline-flex items-center justify-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                  {{ order.attempts }}x
                </span>
              </td>

              <!-- Tanggal -->
              <td class="px-4 py-3 align-top">
                <p class="text-xs text-gray-500 whitespace-nowrap">{{ formatDateTimeDay(order.created_at) }}</p>
                <p v-if="order.resolved_at" class="mt-0.5 text-[10px] text-green-600 whitespace-nowrap">
                  Selesai: {{ formatDateTimeDay(order.resolved_at) }}
                </p>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3 align-top">
                <div class="flex justify-end">
                  <Loader2
                    v-if="retryingId === order.id || updatingId === order.id"
                    class="h-4 w-4 animate-spin text-gray-400"
                  />
                  <button
                    v-else
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    :class="{ 'bg-gray-100 text-gray-600': openMenuId === order.id }"
                    title="Aksi"
                    @click="toggleMenu($event, order.id)"
                  >
                    <MoreVertical class="h-4 w-4" />
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
    <div class="min-h-[100px]" />

    <!-- Action dropdown -->
    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="openMenuId"
          class="fixed inset-0 z-20"
          @click="closeMenu"
        />
        <Transition
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="openMenuId && openMenuOrder"
            class="fixed z-30 w-52 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-gray-200"
            :style="{ top: menuPos.top, left: menuPos.left }"
            @click.stop
          >
            <button
              class="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50"
              @click="openDetail(openMenuOrder)"
            >
              <Eye class="h-4 w-4 text-gray-400" />
              Lihat Detail
            </button>
            <button
              v-if="openMenuOrder.status !== 'resolved'"
              class="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-blue-600 hover:bg-blue-50"
              @click="retryImport(openMenuOrder)"
            >
              <RotateCcw class="h-4 w-4" />
              Coba Import Ulang
            </button>

            <div class="my-1 border-t border-gray-100" />

            <button
              v-if="openMenuOrder.status !== 'resolved'"
              class="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-green-600 hover:bg-green-50"
              @click="updateStatus(openMenuOrder, 'resolved')"
            >
              <CheckCircle2 class="h-4 w-4" />
              Tandai Selesai
            </button>
            <button
              v-if="openMenuOrder.status !== 'ignored'"
              class="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-50"
              @click="updateStatus(openMenuOrder, 'ignored')"
            >
              <Ban class="h-4 w-4" />
              Abaikan
            </button>
            <button
              v-if="openMenuOrder.status !== 'pending'"
              class="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-yellow-600 hover:bg-yellow-50"
              @click="updateStatus(openMenuOrder, 'pending')"
            >
              <RotateCcw class="h-4 w-4" />
              Set Pending
            </button>

            <div class="my-1 border-t border-gray-100" />

            <button
              class="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50"
              @click="deleteOrder(openMenuOrder)"
            >
              <Trash2 class="h-4 w-4" />
              Hapus Catatan
            </button>
          </div>
        </Transition>
      </Teleport>
    </ClientOnly>

    <!-- Detail modal -->
    <ClientOnly>
      <Teleport to="body">
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="detailOrder"
            class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
            @click.self="closeDetail"
          >
            <div class="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <!-- Header -->
              <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                <div class="flex items-center gap-2">
                  <img
                    v-if="detailOrder.source"
                    :src="`/images/platform/${detailOrder.source}.svg`"
                    alt=""
                    class="h-5 w-5 object-contain"
                    @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
                  />
                  <div>
                    <h2 class="text-base font-semibold text-gray-900">{{ detailOrder.order_no }}</h2>
                    <p class="text-xs capitalize text-gray-500">{{ detailOrder.source }}</p>
                  </div>
                </div>
                <button
                  class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  @click="closeDetail"
                >
                  <X class="h-5 w-5" />
                </button>
              </div>

              <!-- Body -->
              <div class="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <!-- Summary grid -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Alasan</p>
                    <span
                      class="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="reasonConfig[detailOrder.reason]?.cls || 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'"
                    >
                      {{ reasonConfig[detailOrder.reason]?.label || detailOrder.reason }}
                    </span>
                  </div>
                  <div>
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Status</p>
                    <span
                      class="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="statusConfig[detailOrder.status]?.cls || 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'"
                    >
                      {{ statusConfig[detailOrder.status]?.label || detailOrder.status }}
                    </span>
                  </div>
                  <div>
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Status Marketplace</p>
                    <p class="mt-1 text-sm text-gray-700">{{ detailOrder.mp_status || '—' }}</p>
                  </div>
                  <div>
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Percobaan</p>
                    <p class="mt-1 text-sm text-gray-700">{{ detailOrder.attempts }}x</p>
                  </div>
                  <div>
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Dibuat</p>
                    <p class="mt-1 text-sm text-gray-700">{{ formatDateTimeDay(detailOrder.created_at) }}</p>
                  </div>
                  <div>
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Diperbarui</p>
                    <p class="mt-1 text-sm text-gray-700">{{ formatDateTimeDay(detailOrder.updated_at) }}</p>
                  </div>
                </div>

                <!-- Note -->
                <div v-if="detailOrder.note" class="rounded-lg bg-amber-50 px-3 py-2.5 ring-1 ring-amber-100">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Catatan</p>
                  <p class="mt-1 text-xs leading-relaxed text-amber-800">{{ detailOrder.note }}</p>
                </div>

                <!-- Payload -->
                <div>
                  <p class="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Payload Order Marketplace</p>
                  <pre class="max-h-72 overflow-auto rounded-lg bg-gray-900 p-3 text-[11px] leading-relaxed text-gray-100"><code>{{ detailPayloadJson }}</code></pre>
                </div>
              </div>

              <!-- Footer -->
              <div class="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
                <button
                  v-if="detailOrder.status !== 'resolved'"
                  class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                  :disabled="retryingId === detailOrder.id"
                  @click="retryImport(detailOrder)"
                >
                  <Loader2 v-if="retryingId === detailOrder.id" class="h-4 w-4 animate-spin" />
                  <RotateCcw v-else class="h-4 w-4" />
                  Coba Import Ulang
                </button>
                <button
                  class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  @click="closeDetail"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </ClientOnly>
  </div>
</template>
