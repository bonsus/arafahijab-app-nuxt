<script setup lang="ts">
import {
  Search, Eye, RefreshCw, ShoppingCart, X, Truck,
  CreditCard, Copy, Check, Box, Plus,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface CourierOption { id: string; courier_code: string; courier_name: string }

interface SalesOrderItem {
  id: string
  name: string
  sku?: string
  qty: number
  price: string
  discount?: string
  total: string
  image?: string
  variants?: { name: string; value: string }[]
}

interface SalesOrder {
  id: string
  no: string
  status: string
  sub_status: string
  payment_status: string
  cod: string
  preorder: string
  source: string
  subtotal: string
  discount: string
  shipping_cost: string
  total: string
  payment_total?: string
  items_count?: number
  weight?: number
  items?: SalesOrderItem[]
  customer: { id: string; name: string; phone: string } | null
  address?: {
    name?: string
    phone?: string
    address?: string
    district?: string
    city?: string
    province?: string
    zipcode?: string
  } | null
  shipment?: {
    courier_code?: string
    courier_name?: string
    service_name?: string
    tracking_no?: string
    aggregator?: string
  } | null
  dropship?: {
    id?: string
    name?: string
    phone?: string
    type?: string
    source?: string
    file?: string
  } | null
  payment_method?: string | null
  payment_provider?: string | null
  staff?: { id: string; name: string } | null
  customer_category?: { id: string; name: string } | null
  tags: string[]
  created_at: string
  date_created: string
  date_due?: string
  store?: {
    id: string
    shop_id: string
    shop_name: string
    source: string
  }
}

interface Paginated {
  data: SalesOrder[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const route = useRoute()
const router = useRouter()

const authStore = useAuthStore() 

const loading = ref(true)
const orders = ref<SalesOrder[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

// Filter state
const search = ref('')
const activeTab = ref('')
const filterDateType = ref('date_created')
const filterDate = ref({ from: '', to: '' })
const filtersub_status = ref<string[]>([])
const filterCouriers = ref<string[]>([])
const filterPaymentStatus = ref<string[]>([])
const filterCod = ref('')
const filterPaymentMethods = ref<string[]>([])
const filterPreorder = ref('')
const filterSource = ref<string[]>([])
const filterTags = ref<string[]>([])

// Data for filter dropdowns
const couriers = ref<CourierOption[]>([])
const paymentMethods = ref<{ id: string; code: string; name: string }[]>([])
const tags = ref<string[]>([])

// Status summary counts
interface StatusSummary {
  pending_count: number
  pending_unpaid_count: number
  pending_waiting_approval_count: number
  pending_waiting_confirmation_count: number
  processing_count: number
  processing_open_count: number
  processing_process_count: number
  processing_packing_count: number
  processing_ready_count: number
  shipped_count: number
  shipped_in_delivery_count: number
  shipped_delayed_count: number
  shipped_delivered_count: number
  shipped_returning_count: number
  all_completed_count: number
  completed_count: number
  returned_count: number
  canceled_count: number
}
const statusSummary = ref<StatusSummary | null>(null)

// ─── Static options ───────────────────────────────────────────────────────────
const statusTabs: { key: string; label: string; count?: number }[] = [
  { key: '', label: 'Semua' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Sedang Diproses' },
  { key: 'shipped', label: 'Dikirim' },
  { key: 'completed', label: 'Selesai' },
  { key: 'canceled', label: 'Dibatalkan' },
]

const dateTypeOptions = [
  { key: 'date_created', label: 'Tgl Dibuat' },
  { key: 'date_due', label: 'Tgl Jatuh Tempo' },
  { key: 'date_processed', label: 'Tgl Diproses' },
  { key: 'date_packed', label: 'Tgl Dipacking' },
  { key: 'date_ready', label: 'Tgl Siap Dikirim' },
  { key: 'date_shipped', label: 'Tgl Dikirim' },
  { key: 'date_delivered', label: 'Tgl Diterima' },
  { key: 'date_completed', label: 'Tgl Selesai' },
  { key: 'date_canceled', label: 'Tgl Dibatalkan' },
  { key: 'date_paid', label: 'Tgl Dibayar' },
  { key: 'date_returned', label: 'Tgl Retur' },
]

const sub_statusOptions: { value: string; label: string; count?: number }[] = [
  { value: 'unpaid', label: 'Belum Dibayar' },
  { value: 'waiting_approval', label: 'Menunggu Konfirmasi' },
  { value: 'open', label: 'Belum Diproses' },
  { value: 'process', label: 'Sedang Diproses' },
  { value: 'packing', label: 'Sedang Dipacking' },
  { value: 'ready', label: 'Siap Dikirim' },
  { value: 'in_delivery', label: 'Dalam Pengiriman' },
  { value: 'delayed', label: 'Pengiriman Bermasalah' },
  { value: 'delivered', label: 'Diterima' },
  { value: 'returning', label: 'Dikembalikan' },
  { value: 'completed', label: 'Selesai' },
  { value: 'returned', label: 'Retur' },
]

const paymentStatusOptions = [
  { value: 'waiting_confirmation', label: 'Konfirmasi Pembayaran' },
  { value: 'unpaid', label: 'Belum Bayar' },
  { value: 'paid', label: 'Lunas' },
  { value: 'refunded', label: 'Refund' },
]

const codOptions = [
  { value: 'yes', label: 'COD' },
  { value: 'no', label: 'Non-COD' },
]

const preorderOptions = [
  { value: 'yes', label: 'Preorder' },
  { value: 'no', label: 'Ready Stok' },
]

const sourceOptions = [
  { value: 'manual', label: 'Manual' },
  { value: 'tokopedia', label: 'Tokopedia' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'tiktok', label: 'TikTok Shop' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'website', label: 'Website' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'other', label: 'Lainnya' },
]

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  waiting_approval: { label: 'Menunggu Konfirmasi', cls: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  open: { label: 'Belum Diproses', cls: 'bg-gray-50 text-gray-700 ring-1 ring-gray-200' },
  processing: { label: 'Diproses', cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  packing: { label: 'Dipacking', cls: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' },
  ready: { label: 'Siap Dikirim', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  in_delivery: { label: 'Dikirim', cls: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' },
  delayed: { label: 'Bermasalah', cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  delivered: { label: 'Diterima', cls: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' },
  returning: { label: 'Dikembalikan', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  completed: { label: 'Selesai', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  returned: { label: 'Retur', cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  canceled: { label: 'Dibatalkan', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
}
function getStatusLabel(status: string, sub_status?: string) {
  if (status === 'pending' && sub_status === 'unpaid') return statusConfig.pending
  if (status === 'pending' && sub_status === 'waiting_approval') return statusConfig.waiting_approval
  if (status === 'processing' && sub_status === 'open') return statusConfig.open
  if (status === 'processing' && sub_status === 'process') return statusConfig.processing
  if (status === 'processing' && sub_status === 'packing') return statusConfig.packing
  if (status === 'processing' && sub_status === 'ready') return statusConfig.ready
  if (status === 'shipped' && sub_status === 'in_delivery') return statusConfig.in_delivery
  if (status === 'shipped' && sub_status === 'delayed') return statusConfig.delayed
  if (status === 'shipped' && sub_status === 'delivered') return statusConfig.delivered
  if (status === 'shipped' && sub_status === 'returning') return statusConfig.returning
  if (status === 'completed' && sub_status === 'completed') return statusConfig.completed
  if (status === 'completed' && sub_status === 'returned') return statusConfig.returned
  if (status === 'canceled') return statusConfig.canceled
  return { label: status, cls: 'bg-gray-50 text-gray-700 ring-1 ring-gray-200' }
}

const paymentStatusConfig: Record<string, { label: string; cls: string }> = {
  unpaid: { label: 'Belum Bayar', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  paid: { label: 'Lunas', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  refunded: { label: 'Refund', cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
}

// ─── Customer / address popover ──────────────────────────────────────────────
const openCustomerId = ref<string | null>(null)
const customerPos = ref({ top: '0px', left: '0px' })
const openCustomerOrder = computed(() =>
  openCustomerId.value ? orders.value.find(o => o.id === openCustomerId.value) : null,
)

function toggleCustomer(event: MouseEvent, orderId: string) {
  if (openCustomerId.value === orderId) {
    openCustomerId.value = null
    return
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const popoverWidth = 272
  const vw = import.meta.client ? window.innerWidth : 1280
  const left = Math.max(8, Math.min(rect.left, vw - popoverWidth - 8))
  customerPos.value = { top: `${rect.bottom + 4}px`, left: `${left}px` }
  openCustomerId.value = orderId
}

// ─── Items tooltip ────────────────────────────────────────────────────────────
const openItemsId = ref<string | null>(null)
const tooltipPos = ref({ top: '0px', left: '0px' })
const openItemsOrder = computed(() =>
  openItemsId.value ? orders.value.find(o => o.id === openItemsId.value) : null,
)

function toggleItems(event: MouseEvent, orderId: string) {
  if (openItemsId.value === orderId) {
    openItemsId.value = null
    return
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const vw = import.meta.client ? window.innerWidth : 1280
  const left = Math.min(rect.left, vw - 336)
  tooltipPos.value = { top: `${rect.bottom + 4}px`, left: `${Math.max(8, left)}px` }
  openItemsId.value = orderId
}

// ─── Payment modal (satu-satunya aksi) ─────────────────────────────────────────
const selectedOrderForPayment = ref<SalesOrder | null>(null)

function canConfirmPayment(order: SalesOrder): boolean {
  return order.payment_status === 'unpaid'
    && order.payment_provider === 'internal'
    && order.payment_method === 'bank_transfer'
}

function openPaymentModal(order: SalesOrder) {
  selectedOrderForPayment.value = order
}

function closePaymentModal() {
  selectedOrderForPayment.value = null
}

async function onPaymentSuccess() {
  await fetchOrders()
  await fetchStatusSummary()
}

// ─── Copy to clipboard ────────────────────────────────────────────────────────
const copiedKey = ref<string>('')
let copiedTimer: ReturnType<typeof setTimeout> | null = null

async function copyToClipboard(text: string, key: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copiedKey.value = '' }, 1500)
  }
  catch { /* ignore */ }
}

// ─── Computed filter options ──────────────────────────────────────────────────
const courierOptions = computed(() => couriers.value.map(c => ({ value: c.courier_code || c.id, label: c.courier_name })))
const paymentMethodOptions = computed(() => paymentMethods.value.map(m => ({ value: m.code, label: m.name })))
const tagOptions = computed(() => tags.value.map(t => ({ value: t, label: t })))

const statusTabsWithCount = computed(() => {
  if (!statusSummary.value) return statusTabs
  const sum = statusSummary.value
  const totalCount = sum.pending_count + sum.processing_count + sum.shipped_count + sum.completed_count + sum.returned_count + sum.canceled_count
  return [
    { key: '', label: 'Semua', count: totalCount },
    { key: 'pending', label: 'Pending', count: sum.pending_count },
    { key: 'processing', label: 'Sedang Diproses', count: sum.processing_count },
    { key: 'shipped', label: 'Dikirim', count: sum.shipped_count },
    { key: 'completed', label: 'Selesai', count: sum.all_completed_count },
    { key: 'canceled', label: 'Dibatalkan', count: sum.canceled_count },
  ]
})

const sub_statusOptionsWithCount = computed(() => {
  if (!statusSummary.value) return sub_statusOptions
  const sum = statusSummary.value
  const countMap: Record<string, number> = {
    unpaid: sum.pending_unpaid_count,
    waiting_approval: sum.pending_waiting_approval_count,
    waiting_confirmation: sum.pending_waiting_confirmation_count,
    open: sum.processing_open_count,
    process: sum.processing_process_count,
    packing: sum.processing_packing_count,
    ready: sum.processing_ready_count,
    in_delivery: sum.shipped_in_delivery_count,
    delayed: sum.shipped_delayed_count,
    delivered: sum.shipped_delivered_count,
    returning: sum.shipped_returning_count,
    completed: sum.completed_count,
    returned: sum.returned_count,
  }
  return sub_statusOptions.map(opt => ({ ...opt, count: countMap[opt.value] || 0 }))
})

const filteredsub_statusOptions = computed(() => {
  if (!activeTab.value) return []
  const mapping: Record<string, string[]> = {
    pending: ['unpaid', 'waiting_approval', 'waiting_confirmation'],
    processing: ['open', 'process', 'packing', 'ready'],
    shipped: ['in_delivery', 'delayed', 'delivered', 'returning'],
    completed: ['completed', 'returned'],
  }
  const allowedValues = mapping[activeTab.value]
  if (!allowedValues) return []
  return sub_statusOptionsWithCount.value.filter(opt => allowedValues.includes(opt.value))
})

const hasActiveFilters = computed(() =>
  !!(search.value
    || filterDate.value.from
    || filtersub_status.value.length
    || filterCouriers.value.length
    || filterPaymentStatus.value.length
    || filterCod.value.length
    || filterPaymentMethods.value.length
    || filterPreorder.value.length
    || filterSource.value.length
    || filterTags.value.length),
)

// ─── URL query sync ───────────────────────────────────────────────────────────
function initFromQuery() {
  const q = route.query
  search.value = (q.q as string) || ''
  activeTab.value = (q.tab as string) || ''
  filterDateType.value = (q.date_type as string) || 'date_created'
  filterDate.value = { from: (q.date_from as string) || '', to: (q.date_to as string) || '' }
  filtersub_status.value = q.sub_status ? (q.sub_status as string).split(',') : []
  filterCouriers.value = q.courier ? (q.courier as string).split(',') : []
  filterPaymentStatus.value = q.pay_status ? (q.pay_status as string).split(',') : []
  filterCod.value = (q.cod as string) || ''
  filterPaymentMethods.value = q.pay_method ? (q.pay_method as string).split(',') : []
  filterPreorder.value = (q.preorder as string) || ''
  filterSource.value = q.source ? (q.source as string).split(',') : []
  filterTags.value = q.tags ? (q.tags as string).split(',') : []
  page.value = q.page ? Number.parseInt(q.page as string, 10) : 1
  perPage.value = q.per_page ? Number.parseInt(q.per_page as string, 10) : 20
}

function buildQuery(): Record<string, string> {
  const q: Record<string, string> = {}
  if (search.value) q.q = search.value
  if (activeTab.value) q.tab = activeTab.value
  if (filterDateType.value !== 'date_created') q.date_type = filterDateType.value
  if (filterDate.value.from) q.date_from = filterDate.value.from
  if (filterDate.value.to) q.date_to = filterDate.value.to
  if (filtersub_status.value.length) q.sub_status = filtersub_status.value.join(',')
  if (filterCouriers.value.length) q.courier = filterCouriers.value.join(',')
  if (filterPaymentStatus.value.length) q.pay_status = filterPaymentStatus.value.join(',')
  if (filterCod.value) q.cod = filterCod.value
  if (filterPaymentMethods.value.length) q.pay_method = filterPaymentMethods.value.join(',')
  if (filterPreorder.value) q.preorder = filterPreorder.value
  if (filterSource.value.length) q.source = filterSource.value.join(',')
  if (filterTags.value.length) q.tags = filterTags.value.join(',')
  if (page.value > 1) q.page = String(page.value)
  if (perPage.value !== 20) q.per_page = String(perPage.value)
  return q
}

// ─── Data fetching ────────────────────────────────────────────────────────────
async function fetchOrders() {
  loading.value = true
  router.replace({ query: buildQuery() })
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
      sort_by: 'created_at',
      sorting: 'desc',
    }
    if (search.value) params.search = search.value
    if (activeTab.value) params.status = activeTab.value
    if (filterDateType.value) params.date_type = filterDateType.value
    if (filterDate.value.from) params.date_from = formatDateFromForApi(filterDate.value.from)
    if (filterDate.value.to) params.date_to = formatDateToForApi(filterDate.value.to)
    if (filtersub_status.value.length) params.sub_status = filtersub_status.value.join(',')
    if (filterCouriers.value.length) params.courier = filterCouriers.value.join(',')
    if (filterPaymentStatus.value.length) params.payment_status = filterPaymentStatus.value.join(',')
    if (filterCod.value) params.cod = filterCod.value
    if (filterPaymentMethods.value.length) params.payment_method = filterPaymentMethods.value.join(',')
    if (filterPreorder.value) params.preorder = filterPreorder.value
    if (filterSource.value.length) params.source = filterSource.value.join(',')
    if (filterTags.value.length) params.tag = filterTags.value.join(',')

    const res = await api.get<{ data: Paginated }>('/sales/ordercs/index', params)
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

async function fetchCouriers() {
  try {
    const res = await api.get<{ data: any }>('/couriers/index', { per_page: '100' })
    couriers.value = (res.data?.data || res.data || []) as CourierOption[]
  }
  catch { couriers.value = [] }
}

async function fetchPaymentMethods() {
  try {
    const res = await api.get<{ data: any[] }>('/payment-methods/available')
    paymentMethods.value = (res.data || []).map((m: any) => ({ id: m.id, code: m.code, name: m.name }))
  }
  catch { paymentMethods.value = [] }
}

async function fetchTags() {
  try {
    const res = await api.get<{ data: string[] }>('/sales/orders/tags/index')
    tags.value = res.data || []
  }
  catch { tags.value = [] }
}

async function fetchStatusSummary() {
  try {
    const params: Record<string, string> = {}
    if (activeTab.value) params.status = activeTab.value
    if (filtersub_status.value.length) params.sub_status = filtersub_status.value.join(',')
    if (filterDate.value.from) params.date_from = formatDateFromForApi(filterDate.value.from)
    if (filterDate.value.to) params.date_to = formatDateToForApi(filterDate.value.to)
    const res = await api.get<{ data: StatusSummary }>('/sales/ordercs/status-summary', params)
    statusSummary.value = res.data || null
  }
  catch { statusSummary.value = null }
}

// ─── Event handlers ───────────────────────────────────────────────────────────
let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchOrders() }, 300)
}

function onTabChange(key: string) {
  activeTab.value = key
  filtersub_status.value = []
  page.value = 1
  fetchOrders()
  fetchStatusSummary()
}

function onsub_statusFilter(value: string) {
  if (!value) filtersub_status.value = []
  else {
    const idx = filtersub_status.value.indexOf(value)
    if (idx >= 0) filtersub_status.value.splice(idx, 1)
    else filtersub_status.value.push(value)
  }
  page.value = 1
  fetchOrders()
}

function onDateTypeChange() {
  if (filterDate.value.from || filterDate.value.to) {
    page.value = 1
    fetchOrders()
  }
  else {
    router.replace({ query: buildQuery() })
  }
}

function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1
  fetchOrders()
}

function onFilterChange() {
  page.value = 1
  fetchOrders()
}

function onPageChange(p: number) { page.value = p; fetchOrders() }
function onPerPageChange(pp: number) { perPage.value = pp; page.value = 1; fetchOrders() }

function resetFilters() {
  search.value = ''
  filterDateType.value = 'date_created'
  filterDate.value = { from: '', to: '' }
  filtersub_status.value = []
  filterCouriers.value = []
  filterPaymentStatus.value = []
  filterCod.value = ''
  filterPaymentMethods.value = []
  filterPreorder.value = ''
  filterSource.value = []
  filterTags.value = []
  page.value = 1
  fetchOrders()
}

onMounted(() => {
  initFromQuery()
  fetchOrders()
  fetchCouriers()
  fetchPaymentMethods()
  fetchTags()
  fetchStatusSummary()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Order CS</h1>
        <p class="text-sm text-gray-500">Daftar order penjualan Anda.</p>
      </div>
      <NuxtLink
        to="/sales/order/create"
        class="flex items-center gap-2 self-start rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
      >
        <Plus class="h-4 w-4" />
        Buat Order
      </NuxtLink>
    </div>

    <!-- Filter Card -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <!-- Status Tabs -->
      <div class="flex items-center gap-0 overflow-x-auto border-b border-gray-200">
        <button
          v-for="tab in statusTabsWithCount"
          :key="tab.key"
          class="relative shrink-0 whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors"
          :class="activeTab === tab.key ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'"
          @click="onTabChange(tab.key)"
        >
          <span class="flex items-center gap-2">
            {{ tab.label }}
            <span
              v-if="tab.count !== undefined && tab.count > 0"
              class="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="activeTab === tab.key ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'"
            >
              {{ tab.count }}
            </span>
          </span>
          <span v-if="activeTab === tab.key" class="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-primary-600" />
        </button>
      </div>

      <!-- Filter body -->
      <div class="space-y-3 px-4 py-3">
        <!-- sub_status filter -->
        <div v-if="filteredsub_statusOptions.length" class="flex items-start gap-2">
          <span class="w-14 shrink-0 pt-1 text-xs text-gray-400">Status</span>
          <div class="flex flex-wrap gap-1">
            <button
              class="rounded-md px-2.5 py-1 text-xs font-medium transition-all"
              :class="filtersub_status.length === 0 ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
              @click="onsub_statusFilter('')"
            >
              Semua
            </button>
            <button
              v-for="opt in filteredsub_statusOptions"
              :key="opt.value"
              class="inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-medium transition-all"
              :class="filtersub_status.includes(opt.value) ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
              @click="onsub_statusFilter(opt.value)"
            >
              <span>{{ opt.label }}</span>
              <span
                v-if="opt.count !== undefined && opt.count > 0"
                class="inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                :class="filtersub_status.includes(opt.value) ? 'bg-blue-200 text-blue-700' : 'bg-gray-200 text-gray-600'"
              >
                {{ opt.count }}
              </span>
            </button>
          </div>
        </div>

        <!-- Search + Date + Refresh + Reset -->
        <div class="flex items-center gap-2 mt-4">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari no order, pelanggan..."
              class="w-full rounded-lg border border-gray-300 py-1.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              @keydown.enter="onSearch"
            />
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <select
              v-model="filterDateType"
              class="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              @change="onDateTypeChange"
            >
              <option v-for="opt in dateTypeOptions" :key="opt.key" :value="opt.key">{{ opt.label }}</option>
            </select>
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

        <!-- Multi-select filter chips -->
        <div class="flex flex-wrap items-center gap-2">
          <AppFilterSelect
            :model-value="filterCouriers"
            :options="courierOptions"
            multiple
            placeholder="Kurir"
            @update:model-value="v => { filterCouriers = v as string[]; onFilterChange() }"
          />
          <AppFilterSelect
            :model-value="filterPaymentStatus"
            :options="paymentStatusOptions"
            multiple
            :searchable="false"
            placeholder="Status Bayar"
            @update:model-value="v => { filterPaymentStatus = v as string[]; onFilterChange() }"
          />
          <AppFilterSelect
            :model-value="filterCod"
            :options="codOptions"
            :searchable="false"
            placeholder="COD"
            @update:model-value="v => { filterCod = v as string; onFilterChange() }"
          />
          <AppFilterSelect
            :model-value="filterPaymentMethods"
            :options="paymentMethodOptions"
            multiple
            placeholder="Metode Bayar"
            @update:model-value="v => { filterPaymentMethods = v as string[]; onFilterChange() }"
          />
          <AppFilterSelect
            :model-value="filterPreorder"
            :options="preorderOptions"
            :searchable="false"
            placeholder="Preorder"
            @update:model-value="v => { filterPreorder = v as string; onFilterChange() }"
          />
          <AppFilterSelect
            :model-value="filterSource"
            :options="sourceOptions"
            multiple
            :searchable="false"
            placeholder="Sumber"
            @update:model-value="v => { filterSource = v as string[]; onFilterChange() }"
          />
          <AppFilterSelect
            :model-value="filterTags"
            :options="tagOptions"
            multiple
            placeholder="Tag"
            @update:model-value="v => { filterTags = v as string[]; onFilterChange() }"
          />
        </div>
      </div>
    </div>

    <!-- Order Table -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500">
            <tr>
              <th class="px-4 py-2.5 text-left">Pesanan</th>
              <th class="px-4 py-2.5 text-left">Customer</th>
              <th class="px-4 py-2.5 text-left">Produk</th>
              <th class="px-4 py-2.5 text-left">Pengiriman</th>
              <th class="px-4 py-2.5 text-left">Status</th>
              <th class="px-4 py-2.5 text-left">Total</th>
              <th class="px-4 py-2.5 text-left">Pembayaran</th>
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
              <td class="px-4 py-3"><div class="h-4 w-32 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-3 w-20 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-5 w-20 animate-pulse rounded-full bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-16 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-5 w-16 animate-pulse rounded-full bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200" /></td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="!orders.length">
            <tr>
              <td colspan="8" class="px-4 py-16 text-center">
                <ShoppingCart class="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p class="text-sm font-medium text-gray-500">Belum ada order</p>
                <p class="mt-1 text-xs text-gray-400">
                  {{ hasActiveFilters ? 'Tidak ada order yang cocok dengan filter.' : 'Belum ada order penjualan.' }}
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
              <!-- Pesanan -->
              <td class="px-4 py-3 align-top">
                <div class="space-y-1">
                  <div class="flex items-center gap-1.5">
                    <img v-if="order.store?.source" :src="`/images/platform/${order.store.source}.svg`" alt="" class="h-4 w-4 object-contain" />
                    <NuxtLink :to="`/sales/ordercs/${order.id}/view`" class="font-semibold text-primary-600 hover:underline">
                      {{ order.no }}
                    </NuxtLink>
                    <button
                      type="button"
                      class="rounded py-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      title="Salin nomor order"
                      @click.stop="copyToClipboard(order.no, 'order-' + order.id)"
                    >
                      <Check v-if="copiedKey === 'order-' + order.id" class="h-3 w-3 text-green-600" />
                      <Copy v-else class="h-3 w-3" />
                    </button>
                  </div>
                  <p class="text-xs text-gray-500 whitespace-nowrap">{{ formatDateTimeDay(order.date_created || order.created_at) }}</p>
                  <div class="flex flex-wrap gap-1">
                    <span v-if="order.cod === 'yes'" class="rounded bg-orange-100 px-1.5 py-0 text-[10px] font-bold uppercase text-orange-700">COD</span>
                    <span v-if="order.preorder === 'yes'" class="rounded bg-blue-100 px-1.5 py-0 text-[10px] font-bold uppercase text-blue-700">PO</span>
                  </div>
                </div>
              </td>

              <!-- Customer -->
              <td class="px-4 py-3 align-top">
                <div class="cursor-pointer select-none" @click="toggleCustomer($event, order.id)">
                  <p class="font-medium text-gray-800 text-xs whitespace-nowrap hover:text-primary-600 transition-colors">{{ order.customer?.name || '-' }}</p>
                  <p v-if="order.customer?.phone" class="mt-0.5 text-xs text-gray-500">{{ order.customer.phone }}</p>
                  <span v-if="order.customer_category" class="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0 text-[10px] text-gray-600">{{ order.customer_category.name }}</span>
                </div>
              </td>

              <!-- Produk -->
              <td class="px-4 py-3 align-top">
                <div v-if="order.items?.length" class="cursor-pointer select-none" @click="toggleItems($event, order.id)">
                  <div class="space-y-0.5">
                    <div v-for="item in order.items.slice(0, 2)" :key="item.id" class="flex items-baseline gap-1 text-xs">
                      <span class="max-w-[140px] truncate font-medium text-gray-700">
                        {{ item.name }} -
                        <template v-for="variant in item.variants" :key="variant.name">{{ variant.value }} </template>
                      </span>
                      <span class="shrink-0 text-gray-400">×{{ item.qty }}</span>
                    </div>
                    <p v-if="order.items.length > 2" class="text-xs text-primary-500 hover:text-primary-600">+{{ order.items.length - 2 }} produk lainnya</p>
                  </div>
                  <p class="mt-1 text-[10px] text-gray-500">{{ order.items.length }} produk<template v-if="order.weight"> · {{ order.weight }} g</template></p>
                </div>
                <div v-else class="space-y-0.5 text-xs text-gray-500">
                  <p v-if="order.items_count" class="whitespace-nowrap">{{ order.items_count }} produk</p>
                  <p v-if="order.weight" class="whitespace-nowrap">{{ order.weight }} g</p>
                </div>
              </td>

              <!-- Pengiriman -->
              <td class="px-4 py-3 align-top">
                <div v-if="order.shipment?.courier_name || order.shipment?.service_name || order.shipment?.tracking_no" class="space-y-0.5">
                  <div class="flex items-center gap-1 text-xs text-gray-700">
                    <Truck class="h-3 w-3 shrink-0 text-gray-500" />
                    <span class="whitespace-nowrap max-w-[100px] truncate">{{ [order.shipment.courier_name, order.shipment.service_name].filter(Boolean).join(' – ') }}</span>
                  </div>
                  <p v-if="order.shipment.tracking_no" class="font-mono text-xs text-gray-500 whitespace-nowrap">{{ order.shipment.tracking_no }}</p>
                </div>
                <div v-if="order.dropship?.id" class="mt-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase text-amber-600">
                  <Box class="h-3 w-3 shrink-0" /> Dropship
                </div>
                <span v-if="!order.shipment?.courier_name && !order.shipment?.service_name && !order.shipment?.tracking_no && !order.dropship" class="text-xs text-gray-300">—</span>
              </td>

              <!-- Status -->
              <td class="px-4 py-3 align-top">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="getStatusLabel(order.status, order.sub_status)?.cls || 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'">
                  {{ getStatusLabel(order.status, order.sub_status)?.label || order.status }}
                </span>
              </td>

              <!-- Total -->
              <td class="px-4 py-3 align-top">
                <div class="space-y-1">
                  <p class="font-semibold text-gray-900 whitespace-nowrap">Rp{{ formatCurrency(order.total) }}</p>
                  <p v-if="order.payment_total" class="text-xs whitespace-nowrap">
                    <span class="text-gray-500">Dibayar: </span>
                    <span class="font-medium text-green-600">Rp{{ formatCurrency(order.payment_total) }}</span>
                  </p>
                </div>
              </td>

              <!-- Pembayaran -->
              <td class="px-4 py-3 align-top">
                <div class="space-y-1">
                  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="paymentStatusConfig[order.payment_status]?.cls || 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'">
                    {{ paymentStatusConfig[order.payment_status]?.label || order.payment_status }}
                  </span>
                  <p v-if="order.payment_method" class="text-xs text-gray-500 whitespace-nowrap">{{ order.payment_method }}</p>
                </div>
              </td>

              <!-- Actions: hanya konfirmasi pembayaran + lihat detail -->
              <td class="px-4 py-3 align-top">
                <div class="flex justify-end gap-1">
                  <button
                    v-if="canConfirmPayment(order)"
                    class="flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700"
                    title="Konfirmasi Pembayaran"
                    @click="openPaymentModal(order)"
                  >
                    <CreditCard class="h-3.5 w-3.5" />
                    Konfirmasi
                  </button>
                  <NuxtLink
                    :to="`/sales/ordercs/${order.id}`"
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Lihat Detail"
                  >
                    <Eye class="h-4 w-4" />
                  </NuxtLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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

    <!-- Items & customer popover -->
    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="openItemsId || openCustomerId"
          class="fixed inset-0 z-20"
          @click="openItemsId = null; openCustomerId = null"
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
            v-if="openItemsId && openItemsOrder"
            class="fixed z-30 w-80 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-gray-200"
            :style="{ top: tooltipPos.top, left: tooltipPos.left }"
          >
            <div class="border-b border-gray-100 px-4 py-2.5">
              <p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Detail Produk</p>
            </div>
            <div class="max-h-72 overflow-y-auto">
              <div v-for="item in openItemsOrder.items" :key="item.id" class="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50">
                <img v-if="item.image" :src="item.image" class="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-gray-200" />
                <div v-else class="h-10 w-10 shrink-0 rounded-lg bg-gray-100" />
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium leading-snug text-gray-800">
                    {{ item.name }} -
                    <template v-for="variant in item.variants" :key="variant.name">{{ variant.value }} </template>
                  </p>
                  <p v-if="item.sku" class="text-[10px] text-gray-400">{{ item.sku }}</p>
                  <div class="mt-1 flex items-center justify-between gap-2">
                    <span class="text-xs text-gray-500">{{ item.qty }}x</span>
                    <span class="text-xs font-semibold text-gray-900 whitespace-nowrap">Rp{{ formatCurrency(item.total) }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between border-t border-gray-100 bg-gray-50/80 px-4 py-2">
              <span class="text-xs text-gray-400">{{ openItemsOrder.items?.length }} produk</span>
              <span class="text-xs font-semibold text-gray-800">Rp{{ formatCurrency(openItemsOrder.subtotal) }}</span>
            </div>
          </div>
        </Transition>

        <Transition
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="openCustomerId && openCustomerOrder"
            class="fixed z-30 w-68 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-gray-200"
            :style="{ top: customerPos.top, left: customerPos.left }"
            @click.stop
          >
            <div class="border-b border-gray-100 px-4 py-2.5">
              <p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Info Pelanggan</p>
            </div>
            <div class="px-4 py-3 space-y-2.5">
              <div>
                <p class="text-xs font-semibold text-gray-900">{{ openCustomerOrder.customer?.name || '-' }}</p>
                <p v-if="openCustomerOrder.customer?.phone" class="text-xs text-gray-500 mt-0.5">{{ openCustomerOrder.customer.phone }}</p>
              </div>
              <div v-if="openCustomerOrder.address" class="border-t border-gray-100 pt-2.5">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Alamat Pengiriman</p>
                <div class="space-y-0.5">
                  <p v-if="openCustomerOrder.address.name" class="text-xs font-medium text-gray-800">
                    {{ openCustomerOrder.address.name }}
                    <template v-if="openCustomerOrder.address.phone"> · {{ openCustomerOrder.address.phone }}</template>
                  </p>
                  <p v-if="openCustomerOrder.address.address" class="text-xs text-gray-600 leading-relaxed">{{ openCustomerOrder.address.address }}</p>
                  <p class="text-xs text-gray-500">
                    <template v-if="openCustomerOrder.address.district">{{ openCustomerOrder.address.district }}, </template>
                    <template v-if="openCustomerOrder.address.city">{{ openCustomerOrder.address.city }}</template>
                    <template v-if="openCustomerOrder.address.province">, {{ openCustomerOrder.address.province }}</template>
                    <template v-if="openCustomerOrder.address.zipcode"> &nbsp;{{ openCustomerOrder.address.zipcode }}</template>
                  </p>
                </div>
              </div>
              <div v-else class="border-t border-gray-100 pt-2.5">
                <p class="text-xs text-gray-400 italic">Tidak ada alamat pengiriman.</p>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </ClientOnly>

    <!-- Konfirmasi Pembayaran (satu-satunya aksi) -->
    <AppCsPaymentConfirmModal
      :order="selectedOrderForPayment"
      @close="closePaymentModal"
      @success="onPaymentSuccess"
    />
  </div>
</template>
