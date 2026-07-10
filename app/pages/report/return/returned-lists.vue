<script setup lang="ts">
import { RefreshCw, Search } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const tabs = [
	{ label: 'Overview', to: '/report/return/overview' },
	{ label: 'Order Bermasalah', to: '/report/return/problem-lists' },
	{ label: 'Retur Diterima', to: '/report/return/returned-lists' },
]

interface PaginationMeta {
	page: number
	limit: number
	total: number
	total_page: number
}

interface ReturnOrderRef {
	id: string
	no: string
	date_created: string
	date_shipped: string
	total: string
	grand_total: string
  payment_total: string
	qty: number
	status: string
	sub_status: string
	cod: string
	source: string
}

interface ReturnListItem {
	id: string
	no: string
	date: string
	store_id: string
	store_name: string
    store_source: string
	customer_id: string
	customer_name: string
	qty: number
	total: string
	status: string
	order: ReturnOrderRef
}

const api = useApi()
const toast = useToast()

const filterDate = ref({ from: '', to: '' })
const filterStore = ref<string[]>([])
const filterCourier = ref<string[]>([])
const filterSource = ref<string[]>([])
const filterCod = ref<'' | 'yes' | 'no'>('')
const filterDateType = ref<'' | 'order_date' | 'shipped_date' | 'returned'>('')
const filterSearch = ref('')

const storeOptions = ref<Array<{ value: string; label: string }>>([])
const courierOptions = ref<Array<{ value: string; label: string }>>([])
const SOURCE_OPTIONS = [
	{ value: 'shopee', label: 'Shopee' },
	{ value: 'tiktok', label: 'TikTok Shop' },
	{ value: 'lazada', label: 'Lazada' },
	{ value: 'tokopedia', label: 'Tokopedia' },
]

const items = ref<ReturnListItem[]>([])
const pagination = ref<PaginationMeta>({ page: 1, limit: 20, total: 0, total_page: 1 })
const loading = ref(false)

function buildParams(page: number): Record<string, string> {
	const p: Record<string, string> = { page: String(page), limit: '20' }
	if (filterDate.value.from) p.date_from = formatDateFromForApi(filterDate.value.from)
	if (filterDate.value.to) p.date_to = formatDateToForApi(filterDate.value.to)
	if (filterDateType.value) p.date_type = filterDateType.value
	if (filterStore.value.length) p.store_id = filterStore.value[0]!
	if (filterCod.value) p.cod = filterCod.value
	if (filterCourier.value.length) p.courier_code = filterCourier.value[0]!
	if (filterSource.value.length) p.source = filterSource.value[0]!
	if (filterSearch.value.trim()) p.search = filterSearch.value.trim()
	return p
}

async function fetchData(page = 1) {
	loading.value = true
	try {
		const res = await api.get<{ data: { pagination: PaginationMeta; items: ReturnListItem[] } }>(
			'/reports/returns/returned-lists',
			buildParams(page),
		)
		items.value = res.data.items || []
		pagination.value = res.data.pagination
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
		const [stores, couriers] = await Promise.all([
			api.get<{ data: Array<{ id: string; shop_name: string }> }>('/stores/public/index').catch(() => ({ data: [] as Array<{ id: string; shop_name: string }> })),
			api.get<{ data: Array<{ code: string; name: string }> }>('/couriers/public/index').catch(() => ({ data: [] as Array<{ code: string; name: string }> })),
		])
		storeOptions.value = (stores.data || []).map(s => ({ value: s.id, label: s.shop_name }))
		courierOptions.value = (couriers.data || []).map(c => ({ value: c.code, label: c.name }))
	}
	catch { /* ignore */ }
}

function onFilterChange() { fetchData(1) }

function resetFilters() {
	filterDate.value = { from: '', to: '' }
	filterStore.value = []
	filterCourier.value = []
	filterSource.value = []
	filterCod.value = ''
	filterDateType.value = ''
	filterSearch.value = ''
	fetchData(1)
}

onMounted(async () => {
	await fetchOptions()
	fetchData(1)
})

function fmtCurrency(v: string | number | undefined) {
	return `Rp${formatCurrency(Number(v || 0))}`
}

function fmtDate(v: string | undefined) {
	if (!v) return '-'
	return formatDate(v)
}

function sourceLabel(s: string) {
	const map: Record<string, string> = { shopee: 'Shopee', tiktok: 'TikTok', lazada: 'Lazada', tokopedia: 'Tokopedia' }
	return map[s] || (s || 'Internal')
}

function sourceClass(s: string) {
	const map: Record<string, string> = {
		shopee: 'bg-orange-50 text-orange-600',
		tiktok: 'bg-gray-900 text-white',
		lazada: 'bg-blue-50 text-blue-700',
		tokopedia: 'bg-green-50 text-green-700',
	}
	return map[s] || 'bg-gray-100 text-gray-500'
}

function subStatusLabel(s: string) {
	const map: Record<string, string> = {
		returning: 'Proses Retur',
		delayed: 'Terlambat',
		returned: 'Retur Diterima',
		in_delivery: 'Dalam Pengiriman',
		delivered: 'Terkirim',
	}
	return map[s] || s
}

function subStatusClass(s: string) {
	const map: Record<string, string> = {
		returning: 'bg-amber-50 text-amber-700',
		delayed: 'bg-orange-50 text-orange-700',
		returned: 'bg-emerald-50 text-emerald-700',
		in_delivery: 'bg-blue-50 text-blue-700',
		delivered: 'bg-emerald-50 text-emerald-700',
	}
	return map[s] || 'bg-gray-100 text-gray-600'
}

function returnStatusLabel(s: string) {
	const map: Record<string, string> = { draft: 'Draft', completed: 'Selesai', canceled: 'Dibatalkan' }
	return map[s] || s
}

function returnStatusClass(s: string) {
	const map: Record<string, string> = {
		draft: 'bg-gray-100 text-gray-600',
		completed: 'bg-emerald-50 text-emerald-700',
		canceled: 'bg-red-50 text-red-600',
	}
	return map[s] || 'bg-gray-100 text-gray-600'
}

const DATE_TYPE_OPTIONS: Array<{ value: '' | 'order_date' | 'shipped_date' | 'returned'; label: string }> = [
	{ value: '', label: 'Semua Tgl' },
	{ value: 'order_date', label: 'Tgl Order' },
	{ value: 'shipped_date', label: 'Tgl Kirim' },
	{ value: 'returned', label: 'Tgl Retur' },
]
</script>

<template>
  <div class="space-y-5">

    <!-- ── Header ── -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Retur Diterima</h1>
        <p class="mt-0.5 text-sm text-gray-500">Dokumen retur yang telah diproses</p>
      </div>
    </div>

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

    <!-- ── Filters ── -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative">
        <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          v-model="filterSearch"
          type="text"
          placeholder="No retur / nama customer..."
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
        :model-value="filterCourier"
        :options="courierOptions"
        placeholder="Semua Kurir"
        multiple
        @update:model-value="filterCourier = $event as string[]; onFilterChange()"
      />
      <!-- COD -->
      <div class="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="filterCod === '' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="filterCod = ''; onFilterChange()"
        >Semua</button>
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="filterCod === 'yes' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="filterCod = 'yes'; onFilterChange()"
        >COD</button>
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="filterCod === 'no' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="filterCod = 'no'; onFilterChange()"
        >Non COD</button>
      </div>
      <!-- Date type — includes Tgl Retur -->
      <div class="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
        <button
          v-for="opt in DATE_TYPE_OPTIONS"
          :key="opt.value"
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="filterDateType === opt.value ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="filterDateType = opt.value; onFilterChange()"
        >{{ opt.label }}</button>
      </div>
      <AppDateRangePicker
        :model-value="filterDate"
        @update:model-value="filterDate = $event; onFilterChange()"
      />
      <button
        class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
        @click="resetFilters"
      >Reset</button>
    </div>

    <!-- ── Table ── -->
    <div class="rounded-2xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
        <div>
          <p class="font-semibold text-gray-900">Daftar Retur Diterima</p>
          <p class="mt-0.5 text-xs text-gray-400">{{ pagination.total }} retur ditemukan</p>
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
              <th class="whitespace-nowrap px-5 py-3 text-left">No Retur</th>
              <th class="whitespace-nowrap px-4 py-3 text-left">Customer</th>
              <th class="whitespace-nowrap px-4 py-3 text-left">Toko</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Qty</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Total Retur</th>
              <th class="whitespace-nowrap px-4 py-3 text-center">Status Retur</th>
              <th class="whitespace-nowrap px-4 py-3 text-left">Order Asal</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Total Order</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Total Payment</th>
              <th class="whitespace-nowrap px-4 py-3 text-center">COD</th>
              <th class="whitespace-nowrap px-4 py-3 text-center">Source</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="loading">
              <td colspan="10" class="px-5 py-6">
                <div class="space-y-2">
                  <div v-for="i in 7" :key="i" class="h-8 animate-pulse rounded-lg bg-gray-100" />
                </div>
              </td>
            </tr>
            <template v-else>
              <tr
                v-for="item in items"
                :key="item.id"
                class="hover:bg-gray-50/60"
              >
                <td class="whitespace-nowrap px-5 py-3">
                  <p class="text-xs font-bold text-primary-700">{{ item.no }}</p>
                  <p class="mt-0.5 text-[10px] text-gray-400">{{ formatDateTime(item.date) }}</p>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-xs font-medium text-gray-800">{{ item.customer_name }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-xs text-gray-600">
                  <div class="flex items-center gap-1">
                    <img v-if="item.store_source" :src="`/images/platform/${item.store_source}.svg`" alt="Source" class="h-3 w-3" />
                    <span>{{ item.store_name }}</span>
                  </div>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs font-medium text-gray-700">{{ item.qty }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs font-bold text-gray-900">{{ fmtCurrency(item.total) }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-center">
                  <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="returnStatusClass(item.status)">{{ returnStatusLabel(item.status) }}</span>
                </td>
                <td class="whitespace-nowrap px-4 py-3">
                  <p class="text-xs font-semibold text-gray-800">{{ item.order?.no || '-' }}</p>
                  <p v-if="item.order" class="mt-0.5 text-[10px] text-gray-400">
                    {{ fmtDate(item.order.date_created) }}
                    <template v-if="item.order.sub_status">
                      ·
                      <span class="rounded px-1" :class="subStatusClass(item.order.sub_status)">{{ subStatusLabel(item.order.sub_status) }}</span>
                    </template>
                  </p>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs font-medium text-gray-700">{{ fmtCurrency(item.order?.total) }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs font-medium text-gray-700">{{ fmtCurrency(item.order?.payment_total) }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-center">
                  <span
                    class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    :class="item.order?.cod === 'yes' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-600'"
                  >{{ item.order?.cod === 'yes' ? 'COD' : 'Non COD' }}</span>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-center">
                  <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="sourceClass(item.order?.source || '')">{{ sourceLabel(item.order?.source || '') }}</span>
                </td>
              </tr>
              <tr v-if="!items.length">
                <td colspan="10" class="px-5 py-10 text-center text-sm text-gray-400">Tidak ada data</td>
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
          :per-page="20"
          :show-per-page="false"
          @update:page="fetchData($event)"
        />
      </div>
    </div>

  </div>
</template>
