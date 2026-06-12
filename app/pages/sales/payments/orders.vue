<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const tabs = [
	{ label: 'Pembayaran Diterima', to: '/sales/payments' },
	{ label: 'Order Pembayaran', to: '/sales/payments/orders' },
	{ label: 'Konfirmasi Pembayaran', to: '/sales/payment-confirmations' },
]

interface ShipmentInfo {
	courier_code: string
	courier_name: string
	tracking_no: string
}

interface CustomerInfo {
	id: string
	name: string
	phone: string
}

interface StoreInfo {
	id: string
	shop_name: string
	source: string
}

interface PaymentItem {
	id: string
	no: string
	date: string
	amount: string
	provider: string
	method: string
	status: string
}

interface OrderItem {
	id: string
	no: string
	date_created: string
	date_due: string
	date_paid: string
	qty: number
	total: string
	grand_total: string
	payment_total: string
	status: string
	sub_status: string
	payment_status: string
	payment_provider: string
	payment_method: string
	cod: string
	source: string
	store: StoreInfo
	customer: CustomerInfo
	shipment: ShipmentInfo
	payments?: PaymentItem[]
}

interface PaginationMeta {
	page: number
	per_page: number
	total_page: number
	total: number
}

const api = useApi()
const toast = useToast()

const items = ref<OrderItem[]>([])
const pagination = ref<PaginationMeta>({ page: 1, per_page: 20, total_page: 1, total: 0 })
const loading = ref(false)

const filterSearch = ref('')
const filterDate = ref({ from: '', to: '' })
const filterDateType = ref('')
const filterStore = ref<string[]>([])
const filterStatus = ref<string[]>([])
const filterSubStatus = ref<string[]>([])
const filterPaymentStatus = ref<string[]>([])
const filterPaymentMethod = ref<string[]>([])
const filterCod = ref<string[]>([])
const filterSource = ref<string[]>([])
const filterStaff = ref<string[]>([])
const filterTag = ref<string[]>([])
const sortBy = ref('')
const sorting = ref('')

const storeOptions = ref<Array<{ value: string; label: string }>>([])
const staffOptions = ref<Array<{ value: string; label: string }>>([])
const tagOptions = ref<Array<{ value: string; label: string }>>([])

const SOURCE_OPTIONS = [
	{ value: 'shopee', label: 'Shopee' },
	{ value: 'tiktok', label: 'TikTok Shop' },
	{ value: 'lazada', label: 'Lazada' },
	{ value: 'tokopedia', label: 'Tokopedia' },
	{ value: 'internal', label: 'Internal' },
]
const STATUS_OPTIONS = [
	{ value: 'pending', label: 'Pending' },
	{ value: 'processing', label: 'Diproses' },
	{ value: 'shipped', label: 'Dikirim' },
	{ value: 'completed', label: 'Selesai' },
	{ value: 'cancelled', label: 'Dibatal' },
]
const SUB_STATUS_OPTIONS = [
	{ value: 'unpaid', label: 'Belum Bayar' },
	{ value: 'in_delivery', label: 'Dalam Pengiriman' },
	{ value: 'delivered', label: 'Terkirim' },
	{ value: 'returned', label: 'Retur' },
]
const PAYMENT_STATUS_OPTIONS = [
	{ value: 'unpaid', label: 'Belum Bayar' },
	{ value: 'partial', label: 'Parsial' },
	{ value: 'paid', label: 'Lunas' },
]
const PAYMENT_METHOD_OPTIONS = [
	{ value: 'bank_transfer', label: 'Transfer Bank' },
	{ value: 'cod', label: 'COD' },
	{ value: 'wallet', label: 'E-Wallet' },
	{ value: 'marketplace', label: 'Marketplace' },
]
const COD_OPTIONS = [
	{ value: 'yes', label: 'COD' },
	{ value: 'no', label: 'Non COD' },
]
const DATE_TYPE_OPTIONS = [
	{ value: 'created', label: 'Tgl Order' },
	{ value: 'due', label: 'Tgl Jatuh Tempo' },
	{ value: 'paid', label: 'Tgl Dibayar' },
]
const SORT_BY_OPTIONS = [
	{ value: 'date_created', label: 'Tgl Order' },
	{ value: 'date_due', label: 'Jatuh Tempo' },
	{ value: 'grand_total', label: 'Grand Total' },
	{ value: 'payment_total', label: 'Terbayar' },
]

function buildParams(page: number): Record<string, string> {
	const p: Record<string, string> = { page: String(page), per_page: '20' }
	if (filterSearch.value.trim()) p.search = filterSearch.value.trim()
	if (filterDate.value.from) p.date_from = filterDate.value.from
	if (filterDate.value.to) p.date_to = filterDate.value.to
	if (filterDateType.value) p.date_type = filterDateType.value
	if (filterStore.value.length) p.store_id = filterStore.value.join(',')
	if (filterStatus.value.length) p.status = filterStatus.value.join(',')
	if (filterSubStatus.value.length) p.sub_status = filterSubStatus.value.join(',')
	if (filterPaymentStatus.value.length) p.payment_status = filterPaymentStatus.value.join(',')
	if (filterPaymentMethod.value.length) p.payment_method = filterPaymentMethod.value.join(',')
	if (filterCod.value.length) p.cod = filterCod.value[0]!
	if (filterSource.value.length) p.source = filterSource.value.join(',')
	if (filterStaff.value.length) p.staff_id = filterStaff.value.join(',')
	if (filterTag.value.length) p.tag = filterTag.value.join(',')
	if (sortBy.value) p.sort_by = sortBy.value
	if (sorting.value) p.sorting = sorting.value
	return p
}

async function fetchData(page = 1) {
	loading.value = true
	try {
		const res = await api.get<{ data: PaginationMeta & { data: OrderItem[] } }>(
			'/sales/order-payments/orders',
			buildParams(page),
		)
		items.value = res.data.data || []
		pagination.value = {
			page: res.data.page,
			per_page: res.data.per_page,
			total_page: res.data.total_page,
			total: res.data.total,
		}
	}
	catch (err: any) {
		toast.error(err?.message || 'Gagal memuat data')
	}
	finally {
		loading.value = false
	}
}

async function fetchOptions() {
	try {
		const [stores, staffs] = await Promise.all([
			api.get<{ data: Array<{ id: string; shop_name: string }> }>('/stores/public/index').catch(() => ({ data: [] as Array<{ id: string; shop_name: string }> })),
			api.get<{ data: Array<{ id: string; name: string }> }>('/users/public/index').catch(() => ({ data: [] as Array<{ id: string; name: string }> })),
		])
		storeOptions.value = (stores.data || []).map(s => ({ value: s.id, label: s.shop_name }))
		staffOptions.value = (staffs.data || []).map(u => ({ value: u.id, label: u.name }))
	}
	catch { /* ignore */ }
}

async function onTagSearch(q: string) {
	try {
		const res = await api.get<{ data: Array<{ id: string; name: string }> }>('/orders/tags/index', { search: q }).catch(() => ({ data: [] as Array<{ id: string; name: string }> }))
		tagOptions.value = (res.data || []).map(t => ({ value: t.name, label: t.name }))
	}
	catch { /* ignore */ }
}

function onFilterChange() { fetchData(1) }

function resetFilters() {
	filterSearch.value = ''
	filterDate.value = { from: '', to: '' }
	filterDateType.value = ''
	filterStore.value = []
	filterStatus.value = []
	filterSubStatus.value = []
	filterPaymentStatus.value = []
	filterPaymentMethod.value = []
	filterCod.value = []
	filterSource.value = []
	filterStaff.value = []
	filterTag.value = []
	sortBy.value = ''
	sorting.value = ''
	fetchData(1)
}

onMounted(async () => {
	await Promise.all([fetchOptions(), onTagSearch('')])
	fetchData(1)
})

function fmtCurrency(v: string | number | undefined) {
	return `Rp${formatCurrency(Number(v || 0))}`
}

function fmtDate(v: string | undefined) {
	if (!v || v.startsWith('0001')) return '-'
	return formatDate(v)
}

function isDuePast(due: string): boolean {
	if (!due || due.startsWith('0001')) return false
	return new Date(due) < new Date()
}

function paymentStatusLabel(s: string) {
	return s === 'paid' ? 'Lunas' : s === 'partial' ? 'Parsial' : 'Belum Bayar'
}

function paymentStatusClass(s: string) {
	return s === 'paid'
		? 'bg-emerald-50 text-emerald-700'
		: s === 'partial'
			? 'bg-amber-50 text-amber-700'
			: 'bg-red-50 text-red-600'
}

function orderStatusLabel(s: string) {
	const map: Record<string, string> = {
		pending: 'Pending',
		processing: 'Diproses',
		shipped: 'Dikirim',
		completed: 'Selesai',
		cancelled: 'Dibatal',
	}
	return map[s] || s
}

function orderStatusClass(s: string) {
	const map: Record<string, string> = {
		pending: 'bg-gray-100 text-gray-600',
		processing: 'bg-blue-50 text-blue-700',
		shipped: 'bg-sky-50 text-sky-700',
		completed: 'bg-emerald-50 text-emerald-700',
		cancelled: 'bg-red-50 text-red-600',
	}
	return map[s] || 'bg-gray-100 text-gray-500'
}

function paymentMethodLabel(m: string) {
	const map: Record<string, string> = {
		bank_transfer: 'Transfer Bank',
		cod: 'COD',
		wallet: 'E-Wallet',
		marketplace: 'Marketplace',
	}
	return map[m] || m || '-'
}

function sourceLabel(s: string) {
	const map: Record<string, string> = { shopee: 'Shopee', tiktok: 'TikTok', lazada: 'Lazada', tokopedia: 'Tokopedia', internal: 'Internal' }
	return map[s] || (s || 'Internal')
}

function sourceClass(s: string) {
	const map: Record<string, string> = {
		shopee: 'bg-orange-50 text-orange-600',
		tiktok: 'bg-gray-900 text-white',
		lazada: 'bg-blue-50 text-blue-700',
		tokopedia: 'bg-green-50 text-green-700',
		internal: 'bg-gray-100 text-gray-500',
	}
	return map[s] || 'bg-gray-100 text-gray-500'
}
</script>

<template>
  <div class="space-y-5">

    <!-- ── Tabs ── -->
    <div class="flex items-center gap-1 border-b border-gray-200">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px"
        :class="$route.path === tab.to
          ? 'border-primary-600 text-primary-700'
          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'"
      >{{ tab.label }}</NuxtLink>
    </div>

    <!-- ── Header ── -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Order Pembayaran</h1>
        <p class="mt-0.5 text-sm text-gray-500">List order yang akan & sudah dibayar</p>
      </div>
    </div>

    <!-- ── Filters ── -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Search -->
      <div class="relative">
        <component :is="'svg'" xmlns="http://www.w3.org/2000/svg" class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></component>
        <input
          v-model="filterSearch"
          type="text"
          placeholder="No order / customer..."
          class="h-9 w-56 rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
          @keyup.enter="onFilterChange"
        />
      </div>

      <AppFilterSelect
        :model-value="filterStore"
        :options="storeOptions"
        placeholder="Semua Toko"
        multiple
        @update:model-value="filterStore = $event as string[]; onFilterChange()"
      />

      <AppFilterSelect
        :model-value="filterSource"
        :options="SOURCE_OPTIONS"
        placeholder="Semua Source"
        multiple
        @update:model-value="filterSource = $event as string[]; onFilterChange()"
      />

      <AppFilterSelect
        :model-value="filterStatus"
        :options="STATUS_OPTIONS"
        placeholder="Status Order"
        multiple
        @update:model-value="filterStatus = $event as string[]; onFilterChange()"
      />

      <AppFilterSelect
        :model-value="filterSubStatus"
        :options="SUB_STATUS_OPTIONS"
        placeholder="Sub Status"
        multiple
        @update:model-value="filterSubStatus = $event as string[]; onFilterChange()"
      />

      <AppFilterSelect
        :model-value="filterPaymentStatus"
        :options="PAYMENT_STATUS_OPTIONS"
        placeholder="Status Bayar"
        multiple
        @update:model-value="filterPaymentStatus = $event as string[]; onFilterChange()"
      />

      <AppFilterSelect
        :model-value="filterPaymentMethod"
        :options="PAYMENT_METHOD_OPTIONS"
        placeholder="Metode Bayar"
        multiple
        @update:model-value="filterPaymentMethod = $event as string[]; onFilterChange()"
      />

      <AppFilterSelect
        :model-value="filterCod"
        :options="COD_OPTIONS"
        placeholder="COD / Non COD"
        @update:model-value="filterCod = $event as string[]; onFilterChange()"
      />

      <AppFilterSelect
        :model-value="filterStaff"
        :options="staffOptions"
        placeholder="Semua Staff"
        multiple
        @update:model-value="filterStaff = $event as string[]; onFilterChange()"
      />

      <AppFilterSelect
        :model-value="filterTag"
        :options="tagOptions"
        placeholder="Tag"
        multiple
        searchable
        @update:model-value="filterTag = $event as string[]; onFilterChange()"
        @search="onTagSearch"
      />

      <AppFilterSelect
        :model-value="filterDateType ? [filterDateType] : []"
        :options="DATE_TYPE_OPTIONS"
        placeholder="Tipe Tanggal"
        @update:model-value="filterDateType = ($event as string[])[0] || ''; onFilterChange()"
      />

      <AppDateRangePicker
        :model-value="filterDate"
        @update:model-value="filterDate = $event; onFilterChange()"
      />

      <AppFilterSelect
        :model-value="sortBy ? [sortBy] : []"
        :options="SORT_BY_OPTIONS"
        placeholder="Urutkan"
        @update:model-value="sortBy = ($event as string[])[0] || ''; onFilterChange()"
      />

      <div v-if="sortBy" class="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="sorting !== 'asc' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="sorting = 'desc'; onFilterChange()"
        >DESC</button>
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="sorting === 'asc' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="sorting = 'asc'; onFilterChange()"
        >ASC</button>
      </div>

      <button
        class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
        @click="resetFilters"
      >Reset</button>
    </div>

    <!-- ── Table ── -->
    <div class="rounded-2xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
        <div>
          <p class="font-semibold text-gray-900">Daftar Order</p>
          <p class="mt-0.5 text-xs text-gray-400">{{ pagination.total }} order ditemukan</p>
        </div>
        <button
          class="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
          @click="fetchData(pagination.page)"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/70 text-[11px] font-medium uppercase tracking-wide text-gray-400">
              <th class="whitespace-nowrap px-5 py-3 text-left">No Order</th>
              <th class="whitespace-nowrap px-4 py-3 text-left">Customer</th>
              <th class="whitespace-nowrap px-4 py-3 text-left">Toko</th>
              <th class="whitespace-nowrap px-4 py-3 text-left">Tgl Order</th>
              <th class="whitespace-nowrap px-4 py-3 text-left">Jatuh Tempo</th>
              <th class="whitespace-nowrap px-4 py-3 text-left">Kurir</th>
              <th class="whitespace-nowrap px-4 py-3 text-center">Source</th>
              <th class="whitespace-nowrap px-4 py-3 text-left">Metode Bayar</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Grand Total</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Terbayar</th>
              <th class="whitespace-nowrap px-4 py-3 text-center">Status Bayar</th>
              <th class="whitespace-nowrap px-4 py-3 text-center">Status Order</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="loading">
              <td colspan="12" class="px-5 py-6">
                <div class="space-y-2">
                  <div v-for="i in 8" :key="i" class="h-8 animate-pulse rounded-lg bg-gray-100" />
                </div>
              </td>
            </tr>
            <template v-else>
              <tr
                v-for="item in items"
                :key="item.id"
                class="hover:bg-gray-50/60"
              >
                <!-- No Order -->
                <td class="whitespace-nowrap px-5 py-3">
                  <p class="text-xs font-bold text-primary-700">{{ item.no }}</p>
                  <p v-if="item.cod === 'yes'" class="mt-0.5 text-[10px] font-semibold text-amber-600">COD</p>
                </td>

                <!-- Customer -->
                <td class="whitespace-nowrap px-4 py-3">
                  <p class="text-xs font-medium text-gray-800">{{ item.customer?.name }}</p>
                  <p class="mt-0.5 text-[10px] text-gray-400">{{ item.customer?.phone }}</p>
                </td>

                <!-- Toko -->
                <td class="whitespace-nowrap px-4 py-3">
                  <p class="text-xs text-gray-700">{{ item.store?.shop_name }}</p>
                </td>

                <!-- Tgl Order -->
                <td class="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{{ fmtDate(item.date_created) }}</td>

                <!-- Jatuh Tempo -->
                <td class="whitespace-nowrap px-4 py-3">
                  <span
                    class="text-xs"
                    :class="item.payment_status !== 'paid' && isDuePast(item.date_due) ? 'font-semibold text-red-500' : 'text-gray-500'"
                  >{{ fmtDate(item.date_due) }}</span>
                </td>

                <!-- Kurir -->
                <td class="whitespace-nowrap px-4 py-3">
                  <p class="text-xs text-gray-700">{{ item.shipment?.courier_name || '-' }}</p>
                  <p v-if="item.shipment?.tracking_no" class="mt-0.5 font-mono text-[10px] text-gray-400">{{ item.shipment.tracking_no }}</p>
                </td>

                <!-- Source -->
                <td class="whitespace-nowrap px-4 py-3 text-center">
                  <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="sourceClass(item.source || item.store?.source || '')">
                    {{ sourceLabel(item.source || item.store?.source || '') }}
                  </span>
                </td>

                <!-- Metode Bayar -->
                <td class="whitespace-nowrap px-4 py-3">
                  <p class="text-xs text-gray-700">{{ paymentMethodLabel(item.payment_method) }}</p>
                  <p v-if="item.payment_provider && item.payment_provider !== 'internal'" class="mt-0.5 text-[10px] capitalize text-gray-400">{{ item.payment_provider }}</p>
                </td>

                <!-- Grand Total -->
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs font-bold text-gray-900">{{ fmtCurrency(item.grand_total) }}</td>

                <!-- Terbayar -->
                <td class="whitespace-nowrap px-4 py-3 text-right">
                  <p class="text-xs font-semibold" :class="Number(item.payment_total) >= Number(item.grand_total) ? 'text-emerald-600' : 'text-gray-700'">
                    {{ fmtCurrency(item.payment_total) }}
                  </p>
                  <p v-if="item.payments?.length" class="mt-0.5 text-[10px] text-gray-400">{{ item.payments.length }} pembayaran</p>
                </td>

                <!-- Status Bayar -->
                <td class="whitespace-nowrap px-4 py-3 text-center">
                  <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="paymentStatusClass(item.payment_status)">
                    {{ paymentStatusLabel(item.payment_status) }}
                  </span>
                </td>

                <!-- Status Order -->
                <td class="whitespace-nowrap px-4 py-3 text-center">
                  <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="orderStatusClass(item.status)">
                    {{ orderStatusLabel(item.status) }}
                  </span>
                </td>
              </tr>
              <tr v-if="!items.length">
                <td colspan="12" class="px-5 py-10 text-center text-sm text-gray-400">Tidak ada data</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <div v-if="pagination.total_page > 1" class="border-t border-gray-100 px-5 py-3">
        <AppPagination
          :page="pagination.page"
          :total-page="pagination.total_page"
          :total="pagination.total"
          :per-page="pagination.per_page"
          :show-per-page="false"
          @update:page="fetchData($event)"
        />
      </div>
    </div>

  </div>
</template>
