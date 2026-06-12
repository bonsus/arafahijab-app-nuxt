<script setup lang="ts">
import {
  Plus, Search, Eye, Pencil,
  RefreshCw, ShoppingCart, X, Truck,
  MoreVertical, Loader2, CheckSquare, CreditCard,
  RefreshCcw, Printer, FileText, Scan, History, ChevronDown,
  Copy, Check, Download
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface StoreOption { id: string; shop_id: string; shop_name: string; source: string; status: string; count?: number }
interface StaffOption { id: string; name: string }
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
  payment_method?: string | null
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
const toast = useToast()
const { confirm } = useConfirm()
const route = useRoute()
const router = useRouter()

const loading = ref(true)
const orders = ref<SalesOrder[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

// Modal state
const showScanModal = ref(false)
const showScanDropdown = ref(false)
const scanDropdownRef = ref<HTMLElement | null>(null)

// Filter state
const search = ref('')
const activeTab = ref('')
const filterStores = ref<string[]>([])
const filterDateType = ref('date_created')
const filterDate = ref({ from: '', to: '' })
const filtersub_status = ref<string[]>([])
const filterCouriers = ref<string[]>([])
const filterPaymentStatus = ref<string[]>([])
const filterCod = ref('')
const filterPaymentMethods = ref<string[]>([])
const filterStaff = ref<string[]>([])
const filterPreorder = ref('')
const filterSource = ref<string[]>([])
const filterTags = ref<string[]>([])

// Data for filter dropdowns
const stores = ref<StoreOption[]>([])
const staffList = ref<StaffOption[]>([])
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
  store_counts: { store_id: string; count: number }[]
}
const statusSummary = ref<StatusSummary | null>(null)

// ─── Static options ───────────────────────────────────────────────────────────
const statusTabs: { key: string; label: string; count?: number }[] = [
  { key: '', label: 'Semua' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Perlu Dikirim' },
  { key: 'shipped', label: 'Dikirim' },
  { key: 'completed', label: 'Selesai' },
  // { key: 'returned', label: 'Retur' },
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
  // Pending
  { value: 'unpaid', label: 'Belum Dibayar' },
  { value: 'waiting_approval', label: 'Menunggu Konfirmasi' },
  // { value: 'waiting_confirmation', label: 'Konfirmasi Pembayaran' },  
  // Processing
  { value: 'open', label: 'Belum Diproses' },
  { value: 'process', label: 'Sedang Diproses' },
  { value: 'packing', label: 'Sedang Dipacking' },
  { value: 'ready', label: 'Siap Dikirim' },
  // Delivery
  { value: 'in_delivery', label: 'Dalam Pengiriman' },
  { value: 'delayed', label: 'Pengiriman Bermasalah' },
  { value: 'delivered', label: 'Diterima' },
  { value: 'returning', label: 'Dikembalikan' },
  // completed
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
  if (status === 'pending' && sub_status === 'unpaid'){
    return statusConfig["pending"]
  } else if (status === 'pending' && sub_status === 'waiting_approval') {
    return statusConfig["waiting_approval"]
  } else if (status === 'processing' && sub_status === 'open') {
    return statusConfig["open"]
  } else if (status === 'processing' && sub_status === 'process') {
    return statusConfig["processing"]
  } else if (status === 'processing' && sub_status === 'packing') {
    return statusConfig["packing"]
  } else if (status === 'processing' && sub_status === 'ready') {
    return statusConfig["ready"]
  } else if (status === 'shipped' && sub_status === 'in_delivery') {
    return statusConfig["in_delivery"]
  } else if (status === 'shipped' && sub_status === 'delayed') {
    return statusConfig["delayed"]
  } else if (status === 'shipped' && sub_status === 'delivered') {
    return statusConfig["delivered"]
  } else if (status === 'shipped' && sub_status === 'returning') {
    return statusConfig["returning"]
  } else if (status === 'completed' && sub_status === 'completed') {
    return statusConfig["completed"]
  } else if (status === 'completed' && sub_status === 'returned') {
    return statusConfig["returned"]
  // } else if (status === 'returned') {
  //   return statusConfig["returned"]
  } else if (status === 'canceled') {
    return statusConfig["canceled"]
  } else {
    return { label: status, cls: 'bg-gray-50 text-gray-700 ring-1 ring-gray-200' }
  }
}

const paymentStatusConfig: Record<string, { label: string; cls: string }> = {
  unpaid: { label: 'Belum Bayar', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  paid: { label: 'Lunas', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  refunded: { label: 'Refund', cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
}

// ─── Bulk selection ───────────────────────────────────────────────────────────
const selectedIds = ref<string[]>([])

const allSelected = computed(() =>
  orders.value.length > 0 && orders.value.every(o => selectedIds.value.includes(o.id)),
)
const someSelected = computed(() =>
  selectedIds.value.length > 0 && !allSelected.value,
)

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = []
  }
  else {
    selectedIds.value = orders.value.map(o => o.id)
  }
}

function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function clearSelection() {
  selectedIds.value = []
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
  const popoverWidth = 272 // w-68
  const vw = import.meta.client ? window.innerWidth : 1280
  const left = Math.max(8, Math.min(rect.left, vw - popoverWidth - 8))
  customerPos.value = {
    top: `${rect.bottom + 4}px`,
    left: `${left}px`,
  }
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
  tooltipPos.value = {
    top: `${rect.bottom + 4}px`,
    left: `${Math.max(8, left)}px`,
  }
  openItemsId.value = orderId
}

// ─── Action dropdown ──────────────────────────────────────────────────────────
const openMenuId = ref<string | null>(null)
const menuPos = ref({ top: '0px', left: '0px' })
const openMenuOrder = computed(() => {
  const order = openMenuId.value ? orders.value.find(o => o.id === openMenuId.value) : null
  if (!order) return null
  
  // Normalize sub_status field (handle both 'sub_status' and 'sub_status' from API)
  return {
    ...order,
    sub_status: order.sub_status || (order as any).sub_status || ''
  }
})

// ─── Payment modal ─────────────────────────────────────────────────────────────
const showPaymentModal = ref(false)
const selectedOrderForPayment = ref<SalesOrder | null>(null)

function openPaymentModal(order: SalesOrder) {
  selectedOrderForPayment.value = order
  showPaymentModal.value = true
  closeMenu()
}

function closePaymentModal() {
  showPaymentModal.value = false
  selectedOrderForPayment.value = null
}

async function onPaymentSuccess() {
  await fetchOrders()
  await fetchStatusSummary()
}

// ─── Change Resi modal ────────────────────────────────────────────────────────
const selectedOrderForResi = ref<SalesOrder | null>(null)

function openChangeResiModal(order: SalesOrder) {
  selectedOrderForResi.value = order
  closeMenu()
}

function closeChangeResiModal() {
  selectedOrderForResi.value = null
}

async function onChangeResiSuccess() {
  await fetchOrders()
}

// ─── Export orders ────────────────────────────────────────────────────────────
const exporting = ref(false)

async function exportOrders() {
  if (exporting.value) return
  exporting.value = true
  try {
    const params: Record<string, string> = {
      sort_by: 'created_at',
      sorting: 'desc',
    }
    if (search.value) params.search = search.value
    if (activeTab.value) params.status = activeTab.value
    if (filterStores.value.length) params.store_id = filterStores.value.join(',')
    if (filterDateType.value) params.date_type = filterDateType.value
    if (filterDate.value.from) params.date_from = filterDate.value.from
    if (filterDate.value.to) params.date_to = filterDate.value.to
    if (filtersub_status.value.length) params.sub_status = filtersub_status.value.join(',')
    if (filterCouriers.value.length) params.courier = filterCouriers.value.join(',')
    if (filterPaymentStatus.value.length) params.payment_status = filterPaymentStatus.value.join(',')
    if (filterCod.value) params.cod = filterCod.value
    if (filterPaymentMethods.value.length) params.payment_method = filterPaymentMethods.value.join(',')
    if (filterStaff.value.length) params.staff_id = filterStaff.value.join(',')
    if (filterPreorder.value) params.preorder = filterPreorder.value
    if (filterSource.value.length) params.source = filterSource.value.join(',')
    if (filterTags.value.length) params.tag = filterTags.value.join(',')

    const response = await api.get<Blob>('/sales/order-export/order', params, { responseType: 'blob' })
    const blob = new Blob([response as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const ts = new Date().toISOString().slice(0, 10)
    link.download = `orders-${ts}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => window.URL.revokeObjectURL(url), 100)

    toast.success('Export berhasil diunduh')
  }
  catch (err: any) {
    toast.error(err?.message || 'Gagal mengekspor order')
  }
  finally {
    exporting.value = false
  }
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
    toast.success('Berhasil disalin')
  }
  catch {
    toast.error('Gagal menyalin')
  }
}

// ─── Status Update modal ───────────────────────────────────────────────────────
const statusUpdateState = ref<{ orderIds: string[]; action: string }>({ orderIds: [], action: '' })

// ─── Print Shipping Label modal ────────────────────────────────────────────────
const printLabelOrderIds = ref<string[]>([])

// ─── Print Invoice modal ───────────────────────────────────────────────────────
const printInvoiceOrderIds = ref<string[]>([])

// Helper function: Check if order can print label
function canOrderPrintLabel(order: SalesOrder): boolean {
  const normalizedsub_status = order.sub_status || (order as any).sub_status || ''
  return order.status === 'processing' && ['process', 'packing', 'ready'].includes(normalizedsub_status)
}

// Available quick actions for selected orders
const selectedOrders = computed(() => {
  return orders.value.filter(o => selectedIds.value.includes(o.id)).map(order => ({
    ...order,
    // Normalize sub_status field (handle both 'sub_status' and 'sub_status' from API)
    sub_status: order.sub_status || (order as any).sub_status || ''
  }))
})

// Determine available quick actions for current selection
const availableBulkActions = computed(() => {
  if (selectedOrders.value.length === 0) return []
  
  // Debug: Log selected orders info
  console.log('=== DEBUG BULK ACTIONS ===')
  console.log('Selected orders:', selectedOrders.value.map(o => ({
    id: o.id,
    no: o.no,
    status: o.status,
    sub_status: o.sub_status,
    cod: o.cod
  })))
  
  const actions = []
  
  // Check if all selected orders can be canceled
  const canCancel = selectedOrders.value.every(o => {
    if (o.status === 'pending') return true
    if (o.status === 'processing' && ['open', 'process', 'packing'].includes(o.sub_status)) return true
    return false
  })
  console.log('canCancel:', canCancel)
  if (canCancel) actions.push({ key: 'cancel', label: 'Batalkan', icon: 'ban', color: 'red' })
  
  // Check if all are pending with COD (can confirm COD)
  const canConfirmCod = selectedOrders.value.every(o => o.status === 'pending' && o.cod === 'yes')
  console.log('canConfirmCod:', canConfirmCod, '(requires all pending + COD)')
  if (canConfirmCod) actions.push({ key: 'confirm_cod', label: 'Konfirmasi COD', icon: 'check-circle', color: 'yellow' })
  
  // Check if all are processing/open (can start process)
  const canProcess = selectedOrders.value.every(o => o.status === 'processing' && o.sub_status === 'open')
  console.log('canProcess:', canProcess, '(requires all processing/open)')
  if (canProcess) actions.push({ key: 'start_process', label: 'Proses Order', icon: 'package', color: 'blue' })
  
  // Check if all are processing/process (can start packing)
  // const canPack = selectedOrders.value.every(o => o.status === 'processing' && o.sub_status === 'process')
  // console.log('canPack:', canPack, '(requires all processing/process)')
  // if (canPack) actions.push({ key: 'start_packing', label: 'Packing Order', icon: 'package-check', color: 'indigo' })
  
  // Check if all are processing/packing (can mark ready)
  // const canReady = selectedOrders.value.every(o => o.status === 'processing' && o.sub_status === 'packing')
  // console.log('canReady:', canReady, '(requires all processing/packing)')
  // if (canReady) actions.push({ key: 'ready_ship', label: 'Siap Dikirim', icon: 'package-check', color: 'green' })
  
  // Check if all are processing/ready (can ship)
  // const canShip = selectedOrders.value.every(o => o.status === 'processing' && o.sub_status === 'ready')
  // console.log('canShip:', canShip, '(requires all processing/ready)')
  // if (canShip) actions.push({ key: 'ship', label: 'Kirim Order', icon: 'truck', color: 'purple' })
  
  // Check if all are shipped/delivered (can complete)
  const canComplete = selectedOrders.value.every(o => o.status === 'shipped' && o.sub_status === 'delivered')
  console.log('canComplete:', canComplete, '(requires all shipped/delivered)')
  if (canComplete) actions.push({ key: 'complete', label: 'Selesaikan', icon: 'check-circle', color: 'green' })
  
  console.log('Available actions:', actions.map(a => a.key))
  console.log('======================')
  
  return actions
})

// Check if all selected orders can print label
const canPrintSelectedOrders = computed(() => {
  if (selectedOrders.value.length === 0) return false
  return selectedOrders.value.every(order => canOrderPrintLabel(order))
})

// Get available actions for single order in dropdown menu
const availableMenuActions = computed(() => {
  if (!openMenuOrder.value) return []
  
  const order = openMenuOrder.value
  const actions = []
  
  console.log('=== DEBUG MENU ACTIONS ===')
  console.log('Order:', { id: order.id, no: order.no, status: order.status, sub_status: order.sub_status, cod: order.cod })
  
  // COD Confirmation
  if (order.status === 'pending' && order.cod === 'yes') {
    actions.push({ key: 'confirm_cod', label: 'Konfirmasi COD', color: 'yellow' })
  }
  
  // Start processing
  const canStartProcess = order.status === 'processing' && order.sub_status === 'open'
  console.log('canStartProcess:', canStartProcess, '(requires processing/open)')
  if (canStartProcess) {
    actions.push({ key: 'start_process', label: 'Mulai Proses', color: 'blue' })
  }
  
  // Start packing
  if (order.status === 'processing' && order.sub_status === 'process') {
    actions.push({ key: 'start_packing', label: 'Mulai Packing', color: 'indigo' })
  }
  
  // Ready to ship
  if (order.status === 'processing' && order.sub_status === 'packing') {
    actions.push({ key: 'ready_ship', label: 'Siap Dikirim', color: 'green' })
  }
  
  // Ship order
  if (order.status === 'processing' && order.sub_status === 'ready') {
    actions.push({ key: 'ship', label: 'Kirim Order', color: 'purple' })
  }
  
  // Mark as delayed
  if (order.status === 'shipped' && order.sub_status === 'in_delivery') {
    actions.push({ key: 'mark_delayed', label: 'Tandai Bermasalah', color: 'orange' })
  }
  
  // Mark as delivered
  if (order.status === 'shipped' && ['in_delivery', 'delayed'].includes(order.sub_status)) {
    actions.push({ key: 'mark_delivered', label: 'Tandai Diterima', color: 'teal' })
  }
  
  // Mark as returning
  if (order.status === 'shipped' && ['in_delivery', 'delayed'].includes(order.sub_status)) {
    actions.push({ key: 'mark_returning', label: 'Dalam Pengembalian', color: 'red' })
  }
  
  // Complete order
  if (order.status === 'shipped' && order.sub_status === 'delivered') {
    actions.push({ key: 'complete', label: 'Selesaikan Order', color: 'green' })
  }
  
  // Cancel order
  if (order.status === 'pending' || (order.status === 'processing' && ['open', 'process', 'packing'].includes(order.sub_status))) {
    actions.push({ key: 'cancel', label: 'Batalkan Order', color: 'red' })
  }
  
  console.log('Available menu actions:', actions.map(a => a.key))
  console.log('======================')
  
  return actions
})

function openStatusUpdateModal(orderIds: string[], action: string) {
  statusUpdateState.value = { orderIds, action }
  closeMenu()
}

function closeStatusUpdateModal() {
  statusUpdateState.value = { orderIds: [], action: '' }
}

async function onStatusUpdateSuccess() {
  closeStatusUpdateModal()
  clearSelection()
  await fetchOrders()
  await fetchStatusSummary()
}

// ─── Print Label Modal handlers ────────────────────────────────────────────────
function openPrintLabelModal(orderIds: string[]) {
  printLabelOrderIds.value = orderIds
  closeMenu()
}

function closePrintLabelModal() {
  printLabelOrderIds.value = []
}

function onPrintLabelSuccess() {
  closePrintLabelModal()
}

// ─── Print Invoice Modal handlers ──────────────────────────────────────────────
function openPrintInvoiceModal(orderIds: string[]) {
  printInvoiceOrderIds.value = orderIds
  closeMenu()
}

function closePrintInvoiceModal() {
  printInvoiceOrderIds.value = []
}

function onPrintInvoiceSuccess() {
  closePrintInvoiceModal()
}

function toggleMenu(event: MouseEvent, orderId: string) {
  if (openMenuId.value === orderId) {
    openMenuId.value = null
    return
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const menuWidth = 176 // w-44
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

// ─── Computed filter options from fetched data ────────────────────────────────
const storeOptions = computed(() => stores.value.map(s => ({ value: s.id, label: s.shop_name })))
const staffOptions = computed(() => [...staffList.value.map(s => ({ value: s.id, label: s.name })), { value: 'no_staff', label: 'Tidak Ada Staff' }])  
const courierOptions = computed(() => couriers.value.map(c => ({ value: c.courier_code || c.id, label: c.courier_name })))
const paymentMethodOptions = computed(() => paymentMethods.value.map(m => ({ value: m.code, label: m.name })))
const tagOptions = computed(() => tags.value.map(t => ({ value: t, label: t })))

// Computed counts for tabs
const statusTabsWithCount = computed(() => {
  if (!statusSummary.value) return statusTabs
  const sum = statusSummary.value
  const totalCount = sum.pending_count + sum.processing_count + sum.shipped_count + sum.completed_count + sum.returned_count + sum.canceled_count
  return [
    { key: '', label: 'Semua', count: totalCount },
    { key: 'pending', label: 'Pending', count: sum.pending_count },
    { key: 'processing', label: 'Perlu Dikirim', count: sum.processing_count },
    { key: 'shipped', label: 'Dikirim', count: sum.shipped_count },
    { key: 'completed', label: 'Selesai', count: sum.all_completed_count }, 
    { key: 'canceled', label: 'Dibatalkan', count: sum.canceled_count },
  ]
})

// Computed counts for sub_status
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

// Computed counts for stores
const storesWithCount = computed(() => {
  if (!statusSummary.value?.store_counts) return stores.value
  const countMap = new Map(statusSummary.value.store_counts.map(s => [s.store_id, s.count]))
  return stores.value.map(store => ({ ...store, count: countMap.get(store.id) || 0 }))
})

const filteredsub_statusOptions = computed(() => {
  if (!activeTab.value || activeTab.value === '') {
    return []
  }
  
  const mapping: Record<string, string[]> = {
    pending: ['unpaid', 'waiting_approval','waiting_confirmation'],
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
    || filterStores.value.length
    || filterDate.value.from
    || filtersub_status.value.length
    || filterCouriers.value.length
    || filterPaymentStatus.value.length
    || filterCod.value.length
    || filterPaymentMethods.value.length
    || filterStaff.value.length
    || filterPreorder.value.length
    || filterSource.value.length
    || filterTags.value.length),
)

// ─── URL query sync ───────────────────────────────────────────────────────────
function initFromQuery() {
  const q = route.query
  search.value = (q.q as string) || ''
  activeTab.value = (q.tab as string) || ''
  filterStores.value = q.store ? (q.store as string).split(',') : []
  filterDateType.value = (q.date_type as string) || 'date_created'
  filterDate.value = { from: (q.date_from as string) || '', to: (q.date_to as string) || '' }
  filtersub_status.value = q.sub_status ? (q.sub_status as string).split(',') : []
  filterCouriers.value = q.courier ? (q.courier as string).split(',') : []
  filterPaymentStatus.value = q.pay_status ? (q.pay_status as string).split(',') : []
  filterCod.value = (q.cod as string) || ''
  filterPaymentMethods.value = q.pay_method ? (q.pay_method as string).split(',') : []
  filterStaff.value = q.staff ? (q.staff as string).split(',') : []
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
  if (filterStores.value.length) q.store = filterStores.value.join(',')
  if (filterDateType.value !== 'date_created') q.date_type = filterDateType.value
  if (filterDate.value.from) q.date_from = filterDate.value.from
  if (filterDate.value.to) q.date_to = filterDate.value.to
  if (filtersub_status.value.length) q.sub_status = filtersub_status.value.join(',')
  if (filterCouriers.value.length) q.courier = filterCouriers.value.join(',')
  if (filterPaymentStatus.value.length) q.pay_status = filterPaymentStatus.value.join(',')
  if (filterCod.value) q.cod = filterCod.value
  if (filterPaymentMethods.value.length) q.pay_method = filterPaymentMethods.value.join(',')
  if (filterStaff.value.length) q.staff = filterStaff.value.join(',')
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
    if (filterStores.value.length) params.store_id = filterStores.value.join(',')
    if (filterDateType.value) params.date_type = filterDateType.value
    if (filterDate.value.from) params.date_from = filterDate.value.from
    if (filterDate.value.to) params.date_to = filterDate.value.to
    if (filtersub_status.value.length) params.sub_status = filtersub_status.value.join(',')
    if (filterCouriers.value.length) params.courier = filterCouriers.value.join(',')
    if (filterPaymentStatus.value.length) params.payment_status = filterPaymentStatus.value.join(',')
    if (filterCod.value) params.cod = filterCod.value
    if (filterPaymentMethods.value.length) params.payment_method = filterPaymentMethods.value.join(',')
    if (filterStaff.value.length) params.staff_id = filterStaff.value.join(',')
    if (filterPreorder.value) params.preorder = filterPreorder.value
    if (filterSource.value.length) params.source = filterSource.value.join(',')
    if (filterTags.value.length) params.tag = filterTags.value.join(',')

    const res = await api.get<{ data: Paginated }>('/sales/orders/index', params)
    orders.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
    selectedIds.value = []
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

async function fetchStaff() {
  try {
    const res = await api.get<{ data: any }>('/users/public/index', { is_cs: 'true', per_page: '100' })
    staffList.value = (res.data?.data || res.data || []) as StaffOption[]
  }
  catch { staffList.value = [] }
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
    if (filterStores.value.length) params.store_id = filterStores.value.join(',')
    if (filterDate.value.from) params.date_from = filterDate.value.from
    if (filterDate.value.to) params.date_to = filterDate.value.to
    
    const res = await api.get<{ data: StatusSummary }>('/sales/orders/status-summary', params)
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
  // Clear sub_status filter when changing tabs since sub_status options are different per tab
  filtersub_status.value = []
  page.value = 1
  fetchOrders()
  fetchStatusSummary()
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
  fetchStatusSummary()
}

function onsub_statusFilter(value: string) {
  if (!value) {
    filtersub_status.value = []
  }
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
  filterStores.value = []
  filterDateType.value = 'date_created'
  filterDate.value = { from: '', to: '' }
  filtersub_status.value = []
  filterCouriers.value = []
  filterPaymentStatus.value = []
  filterCod.value = ''
  filterPaymentMethods.value = []
  filterStaff.value = []
  filterPreorder.value = ''
  filterSource.value = []
  filterTags.value = []
  page.value = 1
  fetchOrders()
}

// ─── Click outside handler for scan dropdown ───────────────────────────────
function onClickOutsideScanDropdown(e: MouseEvent) {
  if (scanDropdownRef.value && !scanDropdownRef.value.contains(e.target as Node)) {
    showScanDropdown.value = false
  }
}

onMounted(() => {
  initFromQuery()
  fetchOrders()
  fetchStores()
  fetchStaff()
  fetchCouriers()
  fetchPaymentMethods()
  fetchTags()
  fetchStatusSummary()
  document.addEventListener('mousedown', onClickOutsideScanDropdown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutsideScanDropdown)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Order Penjualan</h1>
        <p class="text-sm text-gray-500">Kelola semua order penjualan.</p>
      </div>
      <div class="flex items-center gap-2"> 
        <!-- Scan Dropdown -->
        <div ref="scanDropdownRef" class="relative">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            @click="showScanDropdown = !showScanDropdown"
          >
            <Scan class="h-4 w-4" />
            Scan
            <ChevronDown class="h-3.5 w-3.5" />
          </button>
          <Transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="transform scale-95 opacity-0"
            enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0"
          >
            <div
              v-if="showScanDropdown"
              class="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-gray-200 ring-opacity-5 z-10"
            >
              <div class="py-1">
                <NuxtLink
                  to="/sales/order/picking-list"
                  class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  @click="showScanDropdown = false"
                >
                  <Scan class="h-4 w-4 text-gray-400" />
                  Scan Picking
                </NuxtLink>
                <NuxtLink
                  to="/sales/order/scan-packing"
                  class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  @click="showScanDropdown = false"
                >
                  <Scan class="h-4 w-4 text-gray-400" />
                  Scan Packing
                </NuxtLink>
                <NuxtLink
                  to="/sales/order/scan-delivery"
                  class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  @click="showScanDropdown = false"
                >
                  <Scan class="h-4 w-4 text-gray-400" />
                  Scan Delivery
                </NuxtLink>
              </div>
            </div>
          </Transition>
        </div>
        <button
          type="button"
          :disabled="exporting"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          title="Export order ke Excel"
          @click="exportOrders"
        >
          <Loader2 v-if="exporting" class="h-4 w-4 animate-spin" />
          <Download v-else class="h-4 w-4" />
          Export
        </button>
        <NuxtLink
          to="/sales/order/create"
          class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Plus class="h-4 w-4" />
          Buat Order
        </NuxtLink>
      </div>
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
          <span
            v-if="activeTab === tab.key"
            class="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-primary-600"
          />
        </button>
      </div>

      <!-- Filter body -->
      <div class="space-y-3 px-4 py-3">

        <!-- Store filter (pill list) -->
        <div v-if="stores.length" class="flex items-start gap-2">
          <span class="w-14 shrink-0 pt-1 text-xs text-gray-400">Toko</span>
          <div class="flex flex-wrap gap-1">
            <button
              class="rounded-md px-2.5 py-1 text-xs font-medium transition-all"
              :class="filterStores.length === 0 ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
              @click="onStoreFilter('')"
            >
              Semua
            </button>
            <button
              v-for="store in storesWithCount"
              :key="store.id"
              type="button"
              class="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              :class="filterStores.includes(store.id)
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
              @click="onStoreFilter(store.id)"
            >
              <img :src="'/images/platform/' + store.source + '.svg'" alt="" class="h-4 w-4 object-contain" />
              <span>{{ store.shop_name }}</span>
              <span
                v-if="store.count !== undefined && store.count > 0"
                class="inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                :class="filterStores.includes(store.id) ? 'bg-blue-200 text-blue-700' : 'bg-gray-200 text-gray-600'"
              >
                {{ store.count }}
              </span>
            </button>
            <!-- <button
              v-for="store in stores"
              :key="store.id"
              class="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all"
              :class="filterStores.includes(store.id) ? 'bg-violet-50 text-violet-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
              @click="onStoreFilter(store.id)"
            >
              <img :src="'/images/platform/' + store.source + '.svg'" alt="" class="h-4 w-4 object-contain" />
              <span>{{ store.shop_name }}</span>
            </button> -->
          </div>
        </div>

        <!-- sub_status filter (pill list) -->
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

        <!-- Date filter -->
        <!-- <div class="flex flex-wrap items-center gap-2">
          <span class="w-14 shrink-0 text-xs text-gray-400">Tanggal</span>
          <select
            v-model="filterDateType"
            class="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
            @change="onDateTypeChange"
          >
            <option v-for="opt in dateTypeOptions" :key="opt.key" :value="opt.key">{{ opt.label }}</option>
          </select>
          <AppDateRangePicker :model-value="filterDate" @update:model-value="onDateFilter" />
        </div> -->

        <!-- Search + Refresh + Reset -->
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
            <!-- <span class="w-14 shrink-0 text-xs text-gray-400">Tanggal</span> -->
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
            :model-value="filterStaff"
            :options="staffOptions"
            multiple
            placeholder="Staff"
            @update:model-value="v => { filterStaff = v as string[]; onFilterChange() }"
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

      <!-- Bulk action bar -->
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <div
          v-if="selectedIds.length"
          class="flex items-center gap-3 border-b border-primary-100 bg-primary-50 px-4 py-2.5"
        >
          <CheckSquare class="h-4 w-4 shrink-0 text-primary-600" />
          <span class="text-sm font-medium text-primary-700">{{ selectedIds.length }} order dipilih</span>
          <div class="flex flex-1 items-center gap-2 overflow-x-auto">
            <template v-if="availableBulkActions.length">
              <button
                v-for="action in availableBulkActions"
                :key="action.key"
                class="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
                :class="{
                  'bg-red-600 text-white hover:bg-red-700': action.color === 'red',
                  'bg-blue-600 text-white hover:bg-blue-700': action.color === 'blue',
                  'bg-indigo-600 text-white hover:bg-indigo-700': action.color === 'indigo',
                  'bg-green-600 text-white hover:bg-green-700': action.color === 'green',
                  'bg-purple-600 text-white hover:bg-purple-700': action.color === 'purple',
                }"
                @click="openStatusUpdateModal(selectedIds, action.key)"
              >
                {{ action.label }}
              </button>
            </template>
            <span v-else class="text-xs text-gray-500">Tidak ada aksi tersedia untuk order yang dipilih</span>
            
            <!-- Print Label Button -->
            <button
              v-if="selectedIds.length"
              :disabled="!canPrintSelectedOrders"
              class="ml-2 flex shrink-0 items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-colors"
              :class="{
                'border-gray-600 bg-white text-gray-700 hover:bg-gray-50': canPrintSelectedOrders,
                'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed': !canPrintSelectedOrders
              }"
              :title="!canPrintSelectedOrders ? 'Label hanya dapat dicetak untuk order dengan status Processing (Sedang Diproses/Packing/Siap Dikirim)' : ''"
              @click="openPrintLabelModal(selectedIds)"
            >
              <Printer class="h-3.5 w-3.5" />
              Cetak Label
            </button>
            
            <!-- Print Invoice Button -->
            <button
              v-if="selectedIds.length"
              class="ml-2 flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-blue-600 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50"
              @click="openPrintInvoiceModal(selectedIds)"
            >
              <FileText class="h-3.5 w-3.5" />
              Cetak Invoice
            </button>
          </div>
          <button
            class="ml-auto shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Batalkan pilihan"
            @click="clearSelection"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </Transition>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500">
            <tr>
              <th class="w-10 px-4 py-2.5">
                <input
                  type="checkbox"
                  class="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  :checked="allSelected"
                  :ref="(el) => { if (el) (el as HTMLInputElement).indeterminate = someSelected }"
                  @change="toggleSelectAll"
                />
              </th>
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
              <td class="px-4 py-3"><div class="h-4 w-4 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3">
                <div class="space-y-1.5">
                  <div class="h-4 w-28 animate-pulse rounded bg-gray-200" />
                  <div class="h-3 w-20 animate-pulse rounded bg-gray-200" />
                  <div class="flex gap-1">
                    <div class="h-4 w-10 animate-pulse rounded bg-gray-200" />
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="space-y-1.5">
                  <div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  <div class="h-3 w-24 animate-pulse rounded bg-gray-200" />
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="space-y-1.5">
                  <div class="h-3 w-16 animate-pulse rounded bg-gray-200" />
                  <div class="h-3 w-20 animate-pulse rounded bg-gray-200" />
                </div>
              </td>
              <td class="px-4 py-3"><div class="h-5 w-20 animate-pulse rounded-full bg-gray-200" /></td>
              <td class="px-4 py-3">
                <div class="space-y-1.5">
                  <div class="h-4 w-20 animate-pulse rounded bg-gray-200" />
                  <div class="h-3 w-28 animate-pulse rounded bg-gray-200" />
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="space-y-1.5">
                  <div class="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
                  <div class="h-3 w-24 animate-pulse rounded bg-gray-200" />
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="space-y-1.5">
                  <div class="h-3 w-28 animate-pulse rounded bg-gray-200" />
                  <div class="h-3 w-20 animate-pulse rounded bg-gray-200" />
                </div>
              </td>
              <td class="px-4 py-3"><div class="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200" /></td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="!orders.length">
            <tr>
              <td colspan="9" class="px-4 py-16 text-center">
                <ShoppingCart class="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p class="text-sm font-medium text-gray-500">Belum ada order penjualan</p>
                <p class="mt-1 text-xs text-gray-400">
                  {{ hasActiveFilters ? 'Tidak ada order yang cocok dengan filter.' : 'Buat order pertama dengan klik "Buat Order".' }}
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
              :class="{ 'bg-primary-50/40': selectedIds.includes(order.id) }"
            >
              <!-- Checkbox -->
              <td class="px-4 py-3 align-top" @click.stop>
                <input
                  type="checkbox"
                  class="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  :checked="selectedIds.includes(order.id)"
                  @change="toggleSelect(order.id)"
                />
              </td>
              <!-- Pesanan -->
              <td class="px-4 py-3 align-top">
                <div class="space-y-1">
                  <div class="flex items-center gap-1.5">                      
                    <img v-if="order.store?.source" :src="`/images/platform/${order.store.source}.svg`" alt="" class="h-4 w-4 object-contain" />
                    <NuxtLink
                      :to="`/sales/order/${order.id}`"
                      class="font-semibold text-primary-600 hover:underline"
                    >
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
                  <p class="text-xs text-gray-500 whitespace-nowrap">
                    {{ formatDateTimeDay(order.date_created || order.created_at) }}
                  </p>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-if="order.cod === 'yes'"
                      class="rounded bg-orange-100 px-1.5 py-0 text-[10px] font-bold uppercase text-orange-700"
                    >COD</span>
                    <span
                      v-if="order.preorder === 'yes'"
                      class="rounded bg-blue-100 px-1.5 py-0 text-[10px] font-bold uppercase text-blue-700"
                    >PO</span>
                    <span
                      v-if="order.source && (order.store?.source == 'internal' || order.store?.source == 'website')"
                      :class="{
                        // shopee orange, tokopedia green, lazada blue, others gray, tiktok black
                        'bg-orange-100 text-orange-700': order.source.toLowerCase().includes('shopee'),
                        'bg-green-100 text-green-700': order.source.toLowerCase().includes('tokopedia'),
                        'bg-blue-100 text-blue-700': order.source.toLowerCase().includes('lazada'),
                        'bg-black text-white': order.source.toLowerCase().includes('tiktok'),
                        // other
                        'bg-gray-100 text-gray-500': !['shopee', 'tokopedia', 'lazada', 'tiktok'].some(s => order.source?.toLowerCase().includes(s)),
                      }"
                      class="rounded px-1.5 py-0 text-[10px] capitalize"
                    >{{ order.source }}</span>
                  </div>
                  <p v-if="order.staff?.name" class="text-xs text-gray-500">
                    CS: <span class="text-gray-600">{{ order.staff.name }}</span>
                  </p>
                </div>
              </td>

              <!-- Customer -->
              <td class="px-4 py-3 align-top">
                <div
                  class="cursor-pointer select-none"
                  @click="toggleCustomer($event, order.id)"
                >
                  <p class="font-medium text-gray-800 text-xs whitespace-nowrap hover:text-primary-600 transition-colors">{{ order.customer?.name || '-' }}</p>
                  <p v-if="order.customer?.phone" class="mt-0.5 text-xs text-gray-500">{{ order.customer.phone }}</p> 
                  <span v-if="order.customer_category" class="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0 text-[10px] text-gray-600">
                    {{ order.customer_category.name }}
                  </span>
                </div>
              </td>

              <!-- Produk -->
              <td class="px-4 py-3 align-top">
                <div
                  v-if="order.items?.length"
                  class="cursor-pointer select-none"
                  @click="toggleItems($event, order.id)"
                >
                  <div class="space-y-0.5">
                    <div
                      v-for="item in order.items.slice(0, 2)"
                      :key="item.id"
                      class="flex items-baseline gap-1 text-xs"
                    >
                      <span class="max-w-[140px] truncate font-medium text-gray-700">
                        {{ item.name }} - 
                        <template v-for="variant in item.variants" :key="variant.name">{{ variant.value }} </template>
                      </span>
                      <span class="shrink-0 text-gray-400">×{{ item.qty }}</span>
                    </div>
                    <p v-if="order.items.length > 2" class="text-xs text-primary-500 hover:text-primary-600">
                      +{{ order.items.length - 2 }} produk lainnya
                    </p>
                  </div>
                  <p class="mt-1 text-[10px] text-gray-500">
                    {{ order.items.length }} produk<template v-if="order.weight"> · {{ order.weight }} g</template>
                  </p>
                </div>
                <div v-else class="space-y-0.5 text-xs text-gray-500">
                  <p v-if="order.items_count" class="whitespace-nowrap">{{ order.items_count }} produk</p>
                  <p v-if="order.weight" class="whitespace-nowrap">{{ order.weight }} g</p>
                </div>
                <div v-if="order.tags" class="mt-1 flex flex-wrap gap-1">
                  <span class="text-[10px] text-gray-400">{{ order.tags.join(', ') }}</span>
                </div>
              </td>

              <!-- Pengiriman -->
              <td class="px-4 py-3 align-top">
                <div
                  v-if="order.shipment?.courier_name || order.shipment?.service_name || order.shipment?.tracking_no"
                  class="space-y-0.5"
                >
                  <img
                    v-if="order.shipment.aggregator"
                    :src="`/images/brands/${order.shipment.aggregator}.webp`"
                    alt=""
                    class="h-3 mb-1 shrink-0 object-contain"
                  />
                  <div class="flex items-center gap-1 text-xs text-gray-700"> 
                    <Truck class="h-3 w-3 shrink-0 text-gray-500" />
                    <span class="whitespace-nowrap max-w-[100px] truncate">
                      {{ [order.shipment.courier_name, order.shipment.service_name].filter(Boolean).join(' – ') }}
                    </span>
                  </div>
                  <p v-if="order.shipment.tracking_no" class="font-mono text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
                    {{ order.shipment.tracking_no }}
                    <button
                      type="button"
                      class="rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      title="Salin nomor resi"
                      @click.stop="copyToClipboard(order.shipment.tracking_no, 'resi-' + order.id)"
                    >
                      <Check v-if="copiedKey === 'resi-' + order.id" class="h-3 w-3 text-green-600" />
                      <Copy v-else class="h-3 w-3" />
                    </button>
                  </p>
                </div>
                <span v-else class="text-xs text-gray-300">—</span>
              </td>

              <!-- Status -->
              <td class="px-4 py-3 align-top">
                <div class="space-y-1">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="getStatusLabel(order.status, order.sub_status)?.cls || 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'"
                  >
                    {{ getStatusLabel(order.status, order.sub_status)?.label || order.status }}
                  </span>
                  <!-- <p v-if="order.sub_status" class="text-xs text-gray-400">{{ order.sub_status }}</p> -->
                </div>
              </td>

              <!-- Pembayaran -->
              <td class="px-4 py-3 align-top">
                <div class="space-y-1">
                  <p class="font-semibold text-gray-900 whitespace-nowrap">Rp{{ formatCurrency(order.total) }}</p>
                  <p v-if="order.payment_total" class="text-xs whitespace-nowrap">
                    <span class="text-gray-500">Dibayar: </span>
                    <span class="font-medium text-green-600">Rp{{ formatCurrency(order.payment_total) }}</span>
                  </p>
                </div>
              </td>

              <!-- Metode Pembayaran -->
              <td class="px-4 py-3 align-top">
                <div class="space-y-1">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="paymentStatusConfig[order.payment_status]?.cls || 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'"
                  >
                    {{ paymentStatusConfig[order.payment_status]?.label || order.payment_status }}
                  </span>
                  <p v-if="order.payment_method" class="text-xs text-gray-500 whitespace-nowrap">{{ order.payment_method }}</p>
                </div>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3 align-top">
                <div class="flex justify-end">
                  <button
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
    <div class="min-h-[100px]"/>

  <!-- Items popover tooltip -->
  <ClientOnly>
  <Teleport to="body">
    <!-- backdrop: closes both items popover and action menu -->
    <div
      v-if="openItemsId || openMenuId || openCustomerId"
      class="fixed inset-0 z-20"
      @click="openItemsId = null; openMenuId = null; openCustomerId = null"
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
          <div
            v-for="item in openItemsOrder.items"
            :key="item.id"
            class="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50"
          >
            <img
              v-if="item.image"
              :src="item.image"
              class="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-gray-200"
            />
            <div v-else class="h-10 w-10 shrink-0 rounded-lg bg-gray-100" />
            <div class="min-w-0 flex-1">
              <p class="text-xs font-medium leading-snug text-gray-800">
                {{ item.name }}
                - <template v-for="variant in item.variants" :key="variant.name">{{ variant.value }} </template>
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

    <!-- Customer / address popover -->
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
          <!-- Customer info -->
          <div>
            <p class="text-xs font-semibold text-gray-900">{{ openCustomerOrder.customer?.name || '-' }}</p>
            <p v-if="openCustomerOrder.customer?.phone" class="text-xs text-gray-500 mt-0.5">{{ openCustomerOrder.customer.phone }}</p>
            <p v-if="openCustomerOrder.customer_category" class="text-xs text-gray-400 mt-0.5">{{ openCustomerOrder.customer_category.name }}</p>
          </div>
          <!-- Shipping address -->
          <div v-if="openCustomerOrder.address" class="border-t border-gray-100 pt-2.5">
            <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Alamat Pengiriman</p>
            <div class="space-y-0.5">
              <p v-if="openCustomerOrder.address.name" class="text-xs font-medium text-gray-800">
                {{ openCustomerOrder.address.name }}
                <template v-if="openCustomerOrder.address.phone"> · {{ openCustomerOrder.address.phone }}</template>
              </p>
              <p v-if="openCustomerOrder.address.address" class="text-xs text-gray-600 leading-relaxed">
                {{ openCustomerOrder.address.address }}
              </p>
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

    <!-- Action dropdown -->
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
        <NuxtLink
          :to="`/sales/order/${openMenuOrder.id}`"
          class="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50"
          @click="closeMenu"
        >
          <Eye class="h-4 w-4 text-gray-400" />
          Lihat Detail
        </NuxtLink>
        <NuxtLink
          v-if="openMenuOrder.status === 'pending'"
          :to="`/sales/order/create?edit=${openMenuOrder.id}`"
          class="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50"
          @click="closeMenu"
        >
          <Pencil class="h-4 w-4 text-gray-400" />
          Edit Order
        </NuxtLink>
        <button
          v-if="openMenuOrder.payment_status === 'unpaid'"
          class="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-green-600 hover:bg-green-50"
          @click="openPaymentModal(openMenuOrder)"
        >
          <CreditCard class="h-4 w-4" />
          Catat Pembayaran
        </button>

        <!-- Change Resi (only if shipment exists) -->
        <button
          v-if="openMenuOrder.shipment?.courier_name || openMenuOrder.shipment?.tracking_no"
          class="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50"
          @click="openChangeResiModal(openMenuOrder)"
        >
          <Truck class="h-4 w-4 text-gray-400" />
          Ubah Nomor Resi
        </button>
        
        <!-- Print Label (only show if order can print) -->
        <button
          v-if="canOrderPrintLabel(openMenuOrder)"
          class="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50"
          @click="openPrintLabelModal([openMenuOrder.id])"
        >
          <Printer class="h-4 w-4 text-gray-400" />
          Cetak Label Pengiriman
        </button>
        
        <!-- Print Invoice -->
        <button
          class="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-blue-700 hover:bg-blue-50"
          @click="openPrintInvoiceModal([openMenuOrder.id])"
        >
          <FileText class="h-4 w-4 text-blue-400" />
          Cetak Invoice
        </button>
        
        <!-- Status Actions -->
        <template v-if="availableMenuActions.length">
          <div class="my-1 border-t border-gray-100" />
          <button
            v-for="action in availableMenuActions"
            :key="action.key"
            class="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm transition-colors"
            :class="{
              'text-yellow-600 hover:bg-yellow-50': action.color === 'yellow',
              'text-blue-600 hover:bg-blue-50': action.color === 'blue',
              'text-indigo-600 hover:bg-indigo-50': action.color === 'indigo',
              'text-green-600 hover:bg-green-50': action.color === 'green',
              'text-purple-600 hover:bg-purple-50': action.color === 'purple',
              'text-orange-600 hover:bg-orange-50': action.color === 'orange',
              'text-teal-600 hover:bg-teal-50': action.color === 'teal',
              'text-red-600 hover:bg-red-50': action.color === 'red',
            }"
            @click="openStatusUpdateModal([openMenuOrder.id], action.key)"
          >
            <RefreshCcw class="h-4 w-4" />
            {{ action.label }}
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
  </ClientOnly>

  <!-- Payment Modal -->
  <AppOrderPaymentModal
    :order="selectedOrderForPayment"
    @close="closePaymentModal"
    @success="onPaymentSuccess"
  />

  <!-- Change Resi Modal -->
  <AppOrderChangeResiModal
    :order="selectedOrderForResi"
    @close="closeChangeResiModal"
    @success="onChangeResiSuccess"
  />

  <!-- Status Update Modal -->
  <AppOrderStatusUpdateModal
    :action="statusUpdateState.action"
    :order-ids="statusUpdateState.orderIds"
    :orders="orders"
    @close="closeStatusUpdateModal"
    @success="onStatusUpdateSuccess"
  />

  <!-- Print Shipping Label Modal -->
  <AppPrintShippingLabelModal
    :order-ids="printLabelOrderIds"
    :orders="orders"
    @close="closePrintLabelModal"
    @success="onPrintLabelSuccess"
  />
  
  <!-- Print Invoice Modal -->
  <AppPrintInvoiceModal
    :order-ids="printInvoiceOrderIds"
    :orders="orders"
    @close="closePrintInvoiceModal"
    @success="onPrintInvoiceSuccess"
  />
  
  <!-- Scan Picking Modal -->
  <AppScanPickingModal
    v-model="showScanModal"
  />
  </div>
</template>
