<script setup lang="ts">
import { formatCurrency } from '~/composables/useFormatters'
import type { OrdersRevenueChart } from '~/types/dashboard'

const props = defineProps<{
  storeId?: string
  dateFrom: string
  dateTo: string
}>()

const api = useApi()
const toast = useToast()

const mode = ref<'hourly' | 'daily'>('hourly')
const compare = ref(false)
const loading = ref(false)
const data = ref<OrdersRevenueChart | null>(null)

// Auto-switch to daily when range > 1 day
watch(() => [props.dateFrom, props.dateTo], () => {
  if (props.dateFrom && props.dateTo && props.dateFrom !== props.dateTo) {
    mode.value = 'daily'
  }
  else {
    mode.value = 'hourly'
  }
})

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (props.storeId) params.store_id = props.storeId
    if (compare.value) params.compare = 'true'

    let url = ''
    if (mode.value === 'hourly') {
      url = '/sales/dashboard/charts/orders-revenue-hourly'
      if (props.dateFrom) params.date = props.dateFrom
    }
    else {
      url = '/sales/dashboard/charts/orders-revenue-daily'
      if (props.dateFrom) params.date_from = formatDateFromForApi(props.dateFrom)
      if (props.dateTo) params.date_to = formatDateToForApi(props.dateTo)
    }
    const res = await api.get<{ data: OrdersRevenueChart }>(url, params)
    data.value = res.data
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat chart')
    data.value = null
  }
  finally {
    loading.value = false
  }
}

defineExpose({ refresh: fetchData })

watch(
  () => [props.storeId, props.dateFrom, props.dateTo, mode.value, compare.value],
  fetchData,
  { immediate: true },
)

const series = computed(() => {
  if (!data.value) return []
  const s = [
    { name: 'Orders', color: '#3b82f6', data: data.value.orders, axis: 'left' as const },
    { name: 'Revenue (Rp)', color: '#10b981', data: data.value.revenue, axis: 'right' as const },
  ]
  if (compare.value && data.value.compare_orders) {
    s.push({ name: 'Orders (prev)', color: '#93c5fd', data: data.value.compare_orders, axis: 'left' as const, dashed: true } as any)
  }
  if (compare.value && data.value.compare_revenue) {
    s.push({ name: 'Revenue (prev)', color: '#6ee7b7', data: data.value.compare_revenue, axis: 'right' as const, dashed: true } as any)
  }
  return s
})

function shortNum(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return String(Math.round(v))
}
function formatRevenue(v: number) {
  return `Rp ${shortNum(v)}`
}
function formatOrders(v: number) {
  return shortNum(v)
}
</script>

<template>
  <div class="rounded-xl border border-gray-200 bg-white">
    <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
      <div>
        <h3 class="text-sm font-semibold text-gray-900">Orders & Revenue</h3>
        <div class="mt-1 flex items-center gap-3 text-[10px] text-gray-500">
          <span class="inline-flex items-center gap-1">
            <span class="h-2 w-2 rounded-full bg-blue-500" /> Orders
          </span>
          <span class="inline-flex items-center gap-1">
            <span class="h-2 w-2 rounded-full bg-emerald-500" /> Revenue
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <label class="flex items-center gap-1.5 text-xs text-gray-600">
          <input v-model="compare" type="checkbox" class="rounded text-primary-600 focus:ring-primary-500">
          Compare
        </label>
        <div class="inline-flex rounded-lg border border-gray-200 p-0.5">
          <button
            class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            :class="mode === 'hourly' ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:text-gray-700'"
            @click="mode = 'hourly'"
          >
            Jam
          </button>
          <button
            class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            :class="mode === 'daily' ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:text-gray-700'"
            @click="mode = 'daily'"
          >
            Harian
          </button>
        </div>
      </div>
    </div>

    <div class="p-4">
      <DashboardLineChart
        :labels="data?.labels ?? []"
        :series="series as any"
        :loading="loading"
        :left-format="formatOrders"
        :right-format="formatRevenue"
      />
      <p v-if="!loading && (!data || data.labels.length === 0)" class="py-8 text-center text-xs text-gray-400">
        Tidak ada data
      </p>
    </div>
  </div>
</template>
