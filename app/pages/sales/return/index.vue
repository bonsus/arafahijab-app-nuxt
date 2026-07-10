<script setup lang="ts">
import {
  Plus, Search, Eye, Pencil, RefreshCw, X, RotateCcw, MoreVertical, Ban, Wallet, Loader2, Download, ChevronDown,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface StoreOption { id: string; shop_id: string; shop_name: string; source: string; status: string }

interface ReturnItem {
  id: string
  order_item_id: string
  category_name: string
  sku: string
  name: string
  variants: { name: string; value: string }[] | null
  qty: number
  price: string
  discount: string
  total: string
}

interface OrderReturn {
  id: string
  order_id: string
  no: string
  date: string
  qty: number
  weight: number
  subtotal: string
  discount: string
  shipping_total: string
  total: string
  status: string
  payment_status: string
  note: string
  created_at: string
  items: ReturnItem[]
  shipment: {
    courier_code?: string
    courier_name?: string
    service_name?: string
    tracking_no?: string
  } | null
  customer: { id: string; name: string; phone: string } | null
  order: { id: string; no: string; date_created: string } | null
  store: { id: string; name: string; source: string } | null
  staff: { id: string; name: string } | null
}

interface Paginated {
  data: OrderReturn[]
  page: number
  per_page: number
  total_page: number
  total: number
}

interface ReturnPayment {
  id: string
  wallet_id: string
  date: string
  amount: string
  method: string
  note: string
  created_at: string
}

interface WalletRef { id: string; name: string; balance: string; status: string }

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(true)
const returns = ref<OrderReturn[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

const search = ref('')
const filterStores = ref<string[]>([])
const filterStatus = ref('')
const filterPaymentStatus = ref('')
const filterDate = ref({ from: '', to: '' })

const stores = ref<StoreOption[]>([])

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  completed: { label: 'Selesai', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  canceled: { label: 'Dibatalkan', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
}

const paymentStatusConfig: Record<string, { label: string; cls: string }> = {
  unpaid: { label: 'Belum Refund', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  partial: { label: 'Sebagian', cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  paid: { label: 'Lunas', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
}

const pageTabs = [
  { key: 'return', label: 'Retur', to: '/sales/return' },
  { key: 'payments', label: 'Pembayaran', to: '/sales/return/payments' },
]

const statusOptions = [
  { value: '', label: 'Semua Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Selesai' },
  { value: 'canceled', label: 'Dibatalkan' },
]

const paymentStatusOptions = [
  { value: '', label: 'Semua Bayar' },
  { value: 'unpaid', label: 'Belum Refund' },
  { value: 'partial', label: 'Sebagian' },
  { value: 'paid', label: 'Lunas' },
]

const openMenuId = ref<string | null>(null)

function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id
}

async function handleCancel(r: OrderReturn) {
  openMenuId.value = null
  const ok = await confirm({
    title: 'Batalkan Retur',
    message: `Batalkan retur "${r.no}"? Tindakan ini tidak dapat diurungkan.`,
    confirmText: 'Batalkan Retur',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.put(`/sales/order-returns/${r.id}/cancel`, {})
    toast.success('Retur berhasil dibatalkan')
    fetchReturns()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal membatalkan retur')
  }
}

const hasActiveFilters = computed(() =>
  !!(search.value || filterStores.value.length || filterStatus.value || filterPaymentStatus.value
    || filterDate.value.from || filterDate.value.to),
)

async function fetchReturns() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
      sort_by: 'created_at',
      sorting: 'desc',
    }
    if (search.value) params.search = search.value
    if (filterStores.value.length) params.store_id = filterStores.value.join(',')
    if (filterStatus.value) params.status = filterStatus.value
    if (filterPaymentStatus.value) params.payment_status = filterPaymentStatus.value
    if (filterDate.value.from && filterDate.value.to) {
      params.date_from = formatDateFromForApi(filterDate.value.from)
      params.date_to = formatDateToForApi(filterDate.value.to)
    }

    const res = await api.get<{ data: Paginated }>('/sales/order-returns/index', params)
    returns.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch {
    returns.value = []
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

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchReturns() }, 300)
}

function onStatusChange() {
  page.value = 1
  fetchReturns()
}

function onPaymentStatusChange() {
  page.value = 1
  fetchReturns()
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
  fetchReturns()
}

function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1
  fetchReturns()
}

function onPageChange(p: number) {
  page.value = p
  fetchReturns()
}

function onPerPageChange(pp: number) {
  perPage.value = pp
  page.value = 1
  fetchReturns()
}

function resetFilters() {
  search.value = ''
  filterStores.value = []
  filterStatus.value = ''
  filterPaymentStatus.value = ''
  filterDate.value = { from: '', to: '' }
  page.value = 1
  fetchReturns()
}

// ─── Export ──────────────────────────────────────────────────────────────────
const exporting = ref(false)
const showExportDropdown = ref(false)
const exportDropdownRef = ref<HTMLElement | null>(null)

async function exportData(endpoint: string) {
  if (exporting.value) return
  exporting.value = true
  showExportDropdown.value = false
  try {
    const params: Record<string, string> = {}
    if (search.value) params.search = search.value
    if (filterStores.value.length) params.store_id = filterStores.value.join(',')
    if (filterStatus.value) params.status = filterStatus.value
    if (filterPaymentStatus.value) params.payment_status = filterPaymentStatus.value
    if (filterDate.value.from && filterDate.value.to) {
      params.date_from = formatDateFromForApi(filterDate.value.from)
      params.date_to = formatDateToForApi(filterDate.value.to)
    }
    const response = await api.get<Blob>(endpoint, params, { responseType: 'blob' })
    const blob = new Blob([response as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const now = new Date()
    const date = now.toISOString().slice(0, 10).replace(/-/g, '')
    const hhmm = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    const name = (endpoint.split('/').pop() || 'return').replace(/-/g, '_')
    link.download = `${name}_${date}_${hhmm}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => window.URL.revokeObjectURL(url), 100)
    toast.success('Export berhasil diunduh')
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengekspor data')
  } finally {
    exporting.value = false
  }
}

// Refund modal
const wallets = ref<WalletRef[]>([])
const showRefundModal = ref(false)
const savingRefund = ref(false)
const refundReturn = ref<OrderReturn | null>(null)
const refundPayments = ref<ReturnPayment[]>([])
const loadingRefundPayments = ref(false)
const refundErrors = ref<Record<string, string[]>>({})
const refundForm = reactive({
  wallet_id: '',
  amount: 0,
  method: 'transfer',
  date: '',
  note: '',
})

const totalRefundedInModal = computed(() =>
  refundPayments.value.reduce((s, p) => s + Number(p.amount), 0),
)

async function fetchWallets() {
  try {
    const res = await api.get<{ data: WalletRef[] }>('/wallets/index')
    wallets.value = (res.data || []).filter((w: any) => w.status === 'active')
  }
  catch { wallets.value = [] }
}

async function openRefundModal(r: OrderReturn) {
  refundReturn.value = r
  refundErrors.value = {}
  refundForm.wallet_id = ''
  refundForm.date = new Date().toISOString().slice(0, 10)
  refundForm.method = 'transfer'
  refundForm.note = ''
  showRefundModal.value = true
  if (!wallets.value.length) await fetchWallets()
  loadingRefundPayments.value = true
  try {
    const res = await api.get<{ data: ReturnPayment[] }>(`/sales/order-returns/${r.id}/payments`)
    refundPayments.value = res.data || []
    const refunded = refundPayments.value.reduce((s, p) => s + Number(p.amount), 0)
    refundForm.amount = Math.max(0, Number(r.total) - refunded)
  }
  catch {
    refundPayments.value = []
    refundForm.amount = Number(r.total)
  }
  finally { loadingRefundPayments.value = false }
}

async function handleCreateRefund() {
  if (!refundReturn.value) return
  savingRefund.value = true
  refundErrors.value = {}
  try {
    await api.post(`/sales/order-returns/${refundReturn.value.id}/payments/create`, {
      wallet_id: refundForm.wallet_id,
      amount: String(refundForm.amount),
      method: refundForm.method,
      date: refundForm.date,
      note: refundForm.note,
    })
    toast.success('Refund berhasil dicatat')
    showRefundModal.value = false
    fetchReturns()
  }
  catch (err: any) {
    if (err.errors && Object.keys(err.errors).length) refundErrors.value = err.errors
    if (err.message) toast.error(err.message)
    else if (!err.errors || !Object.keys(err.errors).length) toast.error('Gagal mencatat refund')
  }
  finally { savingRefund.value = false }
}

onMounted(() => {
  fetchReturns()
  fetchStores()
  fetchWallets()
})
</script>

<template>
  <div class="space-y-4" @click="openMenuId = null; showExportDropdown = false">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Retur Penjualan</h1>
        <p class="text-sm text-gray-500">Kelola retur penjualan dari order pelanggan.</p>
      </div>
      <NuxtLink
        to="/sales/return/create"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
      >
        <Plus class="h-4 w-4" />
        Buat Retur
      </NuxtLink>
    </div>


    <!-- Tabs -->
    <div class="flex gap-1 border-b border-gray-200">
      <NuxtLink
        v-for="tab in pageTabs"
        :key="tab.key"
        :to="tab.to"
        class="px-4 py-2.5 text-sm font-medium transition-colors"
        :class="tab.key === 'return' 
          ? 'border-b-2 border-primary-600 text-primary-600' 
          : 'text-gray-600 hover:text-gray-900'"
      >
        {{ tab.label }}
      </NuxtLink>
    </div>

    <!-- Filter Card -->
    <div class="rounded-xl">  
      <!-- Filter body -->
      <div class="space-y-3">
        <!-- Store filter (pill list) -->
        <div v-if="stores.length" class="flex items-start gap-2">
          <span class="w-14 shrink-0 pt-1.5 text-xs text-gray-400">Toko</span>
          <div class="flex flex-wrap gap-1">
            <button
              class="rounded-md px-2.5 py-1 text-xs font-medium transition-all"
              :class="filterStores.length === 0 ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
              @click="onStoreFilter('')"
            >
              Semua
            </button>
            <button
              v-for="store in stores"
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
            </button>
          </div>
        </div>

        <!-- Search + Selects + Date + Refresh + Reset -->
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari no retur, no order, pelanggan..."
              class="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              @input="onSearch"
            />
          </div>
          <select
            v-model="filterStatus"
            class="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
            @change="onStatusChange"
          >
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <select
            v-model="filterPaymentStatus"
            class="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
            @change="onPaymentStatusChange"
          >
            <option v-for="opt in paymentStatusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <AppDateRangePicker :model-value="filterDate" @update:model-value="onDateFilter" />
          <button
            class="flex shrink-0 rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            :disabled="loading"
            title="Refresh data"
            @click="fetchReturns()"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          </button>
          <!-- Export Dropdown -->
          <div ref="exportDropdownRef" class="relative">
            <button
              class="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
              :disabled="exporting"
              @click.stop="showExportDropdown = !showExportDropdown"
            >
              <Loader2 v-if="exporting" class="h-4 w-4 animate-spin" />
              <Download v-else class="h-4 w-4" />
              <span>Export</span>
              <ChevronDown class="h-3.5 w-3.5" />
            </button>
            <div
              v-if="showExportDropdown"
              class="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            >
              <button
                class="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                @click="exportData('/sales/order-return-export/return')"
              >
                Retur
              </button>
              <button
                class="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                @click="exportData('/sales/order-return-export/return-with-items')"
              >
                Retur With Items
              </button>
            </div>
          </div>
          <button
            v-if="hasActiveFilters"
            class="flex shrink-0 rounded-lg border border-red-200 p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-700"
            title="Reset filter"
            @click="resetFilters()"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Table: Retur Tab -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-sm">
          <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500 text-nowrap">
            <tr>
              <th class="px-4 py-2.5 text-left">No Retur</th>
              <th class="px-4 py-2.5 text-left">No Order</th>
              <th class="px-4 py-2.5 text-left">Pelanggan</th>
              <th class="px-4 py-2.5 text-left">Toko</th>
              <th class="px-4 py-2.5 text-left">Tanggal</th>
              <th class="px-4 py-2.5 text-right">Qty</th>
              <th class="px-4 py-2.5 text-right">Total</th>
              <th class="px-4 py-2.5 text-center">Status</th>
              <th class="px-4 py-2.5 text-center">Status Bayar</th>
              <th class="px-4 py-2.5 text-right">Tindakan</th>
            </tr>
          </thead>

          <!-- Loading -->
          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-gray-100">
              <td v-for="j in 10" :key="j" class="px-4 py-3">
                <div class="h-4 w-20 animate-pulse rounded bg-gray-200" :class="j >= 6 ? 'ml-auto' : ''" />
              </td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="!returns.length">
            <tr>
              <td colspan="10" class="px-4 py-16 text-center">
                <RotateCcw class="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p class="text-sm text-gray-500">
                  {{ hasActiveFilters ? 'Tidak ada retur yang cocok dengan filter.' : 'Belum ada retur penjualan.' }}
                </p>
              </td>
            </tr>
          </tbody>

          <!-- Rows -->
          <tbody v-else>
            <tr
              v-for="r in returns"
              :key="r.id"
              class="border-b border-gray-100 transition-colors hover:bg-gray-50/50 last:border-b-0"
            >
              <td class="px-4 py-3">
                <NuxtLink :to="`/sales/return/${r.id}`" class="font-semibold text-primary-600 hover:underline">
                  {{ r.no }}
                </NuxtLink>
              </td>
              <td class="px-4 py-3 text-gray-700">
                <NuxtLink
                  v-if="r.order?.id"
                  :to="`/sales/order/${r.order.id}`"
                  class="text-primary-600 hover:underline"
                >
                  {{ r.order.no }}
                </NuxtLink>
                <span v-else>-</span>
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ r.customer?.name || '-' }}</td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                <span class="inline-flex items-center gap-1.5">
                  <img v-if="r.store?.source" :src="'/images/platform/' + r.store.source + '.svg'" alt="" class="h-4 w-4 object-contain" />
                  {{ r.store?.name || '-' }}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ formatDate(r.date) }}</td>
              <td class="px-4 py-3 text-right text-gray-700">{{ r.qty }}</td>
              <td class="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">Rp{{ formatCurrency(r.total) }}</td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :class="statusConfig[r.status]?.cls || 'bg-gray-100 text-gray-600'">
                  {{ statusConfig[r.status]?.label || r.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <span v-if="r.status == 'completed'" class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :class="paymentStatusConfig[r.payment_status]?.cls || 'bg-gray-100 text-gray-600'">
                  {{ paymentStatusConfig[r.payment_status]?.label || r.payment_status || '-' }}
                </span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-4 py-3">
                <div class="relative flex items-center justify-end gap-1.5">
                  <button
                    v-if="r.status !== 'canceled' && r.payment_status !== 'paid'"
                    class="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                    title="Tambah Refund"
                    @click.stop="openRefundModal(r)"
                  >
                    <Wallet class="h-3.5 w-3.5" />
                    Bayar
                  </button>
                  <NuxtLink
                    v-if="r.status === 'draft'"
                    :to="`/sales/return/create?edit=${r.id}`"
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Edit Retur"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                  </NuxtLink> 
                  <!-- More actions dropdown -->
                  <div v-if="r.status !== 'canceled'" class="relative">
                    <button
                      class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      :class="{ 'bg-gray-100 text-gray-600': openMenuId === r.id }"
                      title="Aksi lainnya"
                      @click.stop="toggleMenu(r.id)"
                    >
                      <MoreVertical class="h-4 w-4" />
                    </button>
                    <div
                      v-if="openMenuId === r.id"
                      class="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                    >
                      <button
                        class="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                        @click="handleCancel(r)"
                      >
                        <Ban class="h-4 w-4" />
                        Batalkan Retur
                      </button>
                    </div>
                  </div>
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

    <!-- Refund Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showRefundModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="showRefundModal = false">
          <div class="flex w-full max-w-md flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
            <div class="shrink-0 border-b border-gray-100 px-6 py-4">
              <h2 class="text-lg font-semibold text-gray-900">Tambah Refund</h2>
              <p class="text-sm text-gray-500">{{ refundReturn?.no }}</p>
            </div>
            <div class="flex-1 overflow-y-auto px-6 py-5">
              <div class="space-y-4">
                <div v-if="refundReturn" class="grid grid-cols-3 gap-3">
                  <div class="rounded-lg bg-gray-50 p-3 text-center ring-1 ring-gray-100">
                    <p class="text-xs text-gray-400">Total</p>
                    <p class="mt-1 text-sm font-bold text-gray-900">Rp{{ formatCurrency(refundReturn.total) }}</p>
                  </div>
                  <div class="rounded-lg bg-emerald-50 p-3 text-center ring-1 ring-emerald-100">
                    <p class="text-xs text-emerald-500">Direfund</p>
                    <div v-if="loadingRefundPayments" class="mt-1 flex justify-center">
                      <Loader2 class="h-4 w-4 animate-spin text-emerald-500" />
                    </div>
                    <p v-else class="mt-1 text-sm font-bold text-emerald-700">
                      Rp{{ formatCurrency(totalRefundedInModal) }}
                    </p>
                  </div>
                  <div class="rounded-lg bg-red-50 p-3 text-center ring-1 ring-red-100">
                    <p class="text-xs text-red-500">Sisa</p>
                    <p class="mt-1 text-sm font-bold text-red-700">Rp{{ formatCurrency(refundForm.amount) }}</p>
                  </div>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Jumlah Refund <span class="text-red-500">*</span></label>
                  <input :value="refundForm.amount" disabled type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                  <p v-if="refundErrors.amount" class="mt-1 text-xs text-red-600">{{ refundErrors.amount[0] }}</p>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Metode <span class="text-red-500">*</span></label>
                  <select v-model="refundForm.method" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                    <option value="transfer">Transfer</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Tunai</option>
                    <option value="ewallet">E-Wallet</option>
                    <option value="other">Lainnya</option>
                  </select>
                  <p v-if="refundErrors.method" class="mt-1 text-xs text-red-600">{{ refundErrors.method[0] }}</p>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Dompet <span class="text-red-500">*</span></label>
                  <select v-model="refundForm.wallet_id" class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                    <option value="">Pilih Dompet</option>
                    <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
                  </select>
                  <p v-if="refundErrors.wallet_id" class="mt-1 text-xs text-red-600">{{ refundErrors.wallet_id[0] }}</p>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Tanggal</label>
                  <input v-model="refundForm.date" type="date" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan</label>
                  <textarea v-model="refundForm.note" rows="2" placeholder="Catatan refund" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
              </div>
            </div>
            <div class="shrink-0 border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                @click="showRefundModal = false"
              >
                Batal
              </button>
              <button
                type="button"
                :disabled="savingRefund"
                class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                @click="handleCreateRefund"
              >
                <Loader2 v-if="savingRefund" class="h-4 w-4 animate-spin" />
                Simpan Refund
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
