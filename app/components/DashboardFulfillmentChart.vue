<script setup lang="ts">
import type { FulfillmentChart } from '~/types/dashboard'

const props = defineProps<{
  storeId?: string
  dateFrom: string
  dateTo: string
}>()

const api = useApi()
const toast = useToast()

const mode = ref<'hourly' | 'daily'>('hourly')
const loading = ref(false)
const data = ref<FulfillmentChart | null>(null)

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

    let url = ''
    if (mode.value === 'hourly') {
      url = '/sales/dashboard/charts/fulfillment-hourly'
      if (props.dateFrom) params.date = props.dateFrom
    }
    else {
      url = '/sales/dashboard/charts/fulfillment-daily'
      if (props.dateFrom) params.date_from = formatDateFromForApi(props.dateFrom)
      if (props.dateTo) params.date_to = formatDateToForApi(props.dateTo)
    }
    const res = await api.get<{ data: FulfillmentChart }>(url, params)
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
  () => [props.storeId, props.dateFrom, props.dateTo, mode.value],
  fetchData,
  { immediate: true },
)

const series = computed(() => {
  if (!data.value) return []
  return [
    { name: 'Picking', color: '#3b82f6', data: data.value.picking_avg, axis: 'left' as const },
    { name: 'Packing', color: '#8b5cf6', data: data.value.packing_avg, axis: 'left' as const },
    { name: 'Shipping', color: '#f59e0b', data: data.value.shipping_avg, axis: 'left' as const },
  ]
})

function formatMin(v: number) {
  return `${Math.round(v)}m`
}
</script>

<template>
  <div class="rounded-xl border border-gray-200 bg-white">
    <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
      <div>
        <h3 class="text-sm font-semibold text-gray-900">Fulfillment Performance (SLA)</h3>
        <div class="mt-1 flex items-center gap-3 text-[10px] text-gray-500">
          <span class="inline-flex items-center gap-1">
            <span class="h-2 w-2 rounded-full bg-blue-500" /> Picking
          </span>
          <span class="inline-flex items-center gap-1">
            <span class="h-2 w-2 rounded-full bg-violet-500" /> Packing
          </span>
          <span class="inline-flex items-center gap-1">
            <span class="h-2 w-2 rounded-full bg-amber-500" /> Shipping
          </span>
        </div>
      </div>
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

    <div class="p-4">
      <DashboardLineChart
        :labels="data?.labels ?? []"
        :series="series as any"
        :loading="loading"
        :left-format="formatMin"
      />
      <p v-if="!loading && (!data || data.labels.length === 0)" class="py-8 text-center text-xs text-gray-400">
        Tidak ada data
      </p>
    </div>
  </div>
</template>
