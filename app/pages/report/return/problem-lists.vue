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

interface ShipmentInfo {
	courier_code: string
	courier_name: string
	service_name: string
	tracking_no: string
}

interface ProblemOrderItem {
	id: string
	no: string
	date_created: string
	date_shipped: string
	store_id: string
	store_name: string
    store_source: string
	customer_id: string
	customer_name: string
	staff_id: string
	staff_name: string
	cod: string
	source: string
	qty: number
	total: string
	grand_total: string
	status: string
	sub_status: string
	shipment: ShipmentInfo
}

const api = useApi()
const toast = useToast()

const filterDate = ref({ from: '', to: '' })
const filterStore = ref<string[]>([])
const filterCourier = ref<string[]>([])
const filterSource = ref<string[]>([])
const filterCod = ref<'' | 'yes' | 'no'>('')
const filterDateType = ref<'' | 'order_date' | 'shipped_date'>('')
const filterStatus = ref<'' | 'delayed' | 'returning'>('')
const filterSearch = ref('')

const storeOptions = ref<Array<{ value: string; label: string }>>([])
const courierOptions = ref<Array<{ value: string; label: string }>>([])
const SOURCE_OPTIONS = [
	{ value: 'shopee', label: 'Shopee' },
	{ value: 'tiktok', label: 'TikTok Shop' },
	{ value: 'lazada', label: 'Lazada' },
	{ value: 'tokopedia', label: 'Tokopedia' },
]

const items = ref<ProblemOrderItem[]>([])
const pagination = ref<PaginationMeta>({ page: 1, limit: 20, total: 0, total_page: 1 })
const loading = ref(false)

function buildParams(page: number): Record<string, string> {
	const p: Record<string, string> = { page: String(page), limit: '20' }
	if (filterDate.value.from) p.date_from = filterDate.value.from
	if (filterDate.value.to) p.date_to = filterDate.value.to
	if (filterDateType.value) p.date_type = filterDateType.value
	if (filterStore.value.length) p.store_id = filterStore.value[0]!
	if (filterCod.value) p.cod = filterCod.value
	if (filterStatus.value) p.status = filterStatus.value
	if (filterCourier.value.length) p.courier_code = filterCourier.value[0]!
	if (filterSource.value.length) p.source = filterSource.value[0]!
	if (filterSearch.value.trim()) p.search = filterSearch.value.trim()
	return p
}

async function fetchData(page = 1) {
	loading.value = true
	try {
		const res = await api.get<{ data: { pagination: PaginationMeta; items: ProblemOrderItem[] } }>(
			'/reports/returns/problem-lists',
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
	filterStatus.value = ''
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
		problem: 'Bermasalah',
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
</script>

<template>
  <div class="space-y-5">


    <!-- ── Header ── -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Order Bermasalah</h1>
        <p class="mt-0.5 text-sm text-gray-500">Order dengan status terlambat atau proses retur</p>
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
          placeholder="No order / nama customer..."
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
      <!-- Status -->
      <div class="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="filterStatus === '' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="filterStatus = ''; onFilterChange()"
        >Semua</button>
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="filterStatus === 'delayed' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="filterStatus = 'delayed'; onFilterChange()"
        >Terlambat</button>
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="filterStatus === 'returning' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="filterStatus = 'returning'; onFilterChange()"
        >Proses Retur</button>
      </div>
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
      <!-- Date type -->
      <div class="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="filterDateType === '' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="filterDateType = ''; onFilterChange()"
        >Semua Tgl</button>
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="filterDateType === 'order_date' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="filterDateType = 'order_date'; onFilterChange()"
        >Tgl Order</button>
        <button
          class="px-2.5 py-1.5 font-medium transition-colors"
          :class="filterDateType === 'shipped_date' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          @click="filterDateType = 'shipped_date'; onFilterChange()"
        >Tgl Kirim</button>
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
          <p class="font-semibold text-gray-900">Daftar Order Bermasalah</p>
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
              <th class="whitespace-nowrap px-4 py-3 text-left">Tgl Kirim</th>
              <th class="whitespace-nowrap px-4 py-3 text-left">Kurir</th>
              <th class="whitespace-nowrap px-4 py-3 text-center">COD</th>
              <th class="whitespace-nowrap px-4 py-3 text-center">Source</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Qty</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Grand Total</th>
              <th class="whitespace-nowrap px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="loading">
              <td colspan="11" class="px-5 py-6">
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
                </td>
                <td class="whitespace-nowrap px-4 py-3">
                  <p class="text-xs font-medium text-gray-800">{{ item.customer_name }}</p>
                  <p v-if="item.staff_name" class="mt-0.5 text-[10px] text-gray-400">{{ item.staff_name }}</p>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-xs text-gray-600">
                    <div class="flex items-center gap-1">
                    <img v-if="item.store_source" :src="`/images/platform/${item.store_source}.svg`" alt="Source" class="h-3 w-3" />
                    <span>{{ item.store_name }}</span>
                  </div>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{{ fmtDate(item.date_created) }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{{ fmtDate(item.date_shipped) }}</td>
                <td class="whitespace-nowrap px-4 py-3">
                  <p class="text-xs text-gray-700">{{ item.shipment?.courier_name || '-' }}</p>
                  <p v-if="item.shipment?.tracking_no" class="mt-0.5 font-mono text-[10px] text-gray-400">{{ item.shipment.tracking_no }}</p>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-center">
                  <span
                    class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    :class="item.cod === 'yes' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-600'"
                  >{{ item.cod === 'yes' ? 'COD' : 'Non COD' }}</span>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-center">
                  <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="sourceClass(item.source)">{{ sourceLabel(item.source) }}</span>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs font-medium text-gray-700">{{ item.qty }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-right text-xs font-bold text-gray-900">{{ fmtCurrency(item.grand_total) }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-center">
                  <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="subStatusClass(item.sub_status)">{{ subStatusLabel(item.sub_status) }}</span>
                </td>
              </tr>
              <tr v-if="!items.length">
                <td colspan="11" class="px-5 py-10 text-center text-sm text-gray-400">Tidak ada data</td>
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
