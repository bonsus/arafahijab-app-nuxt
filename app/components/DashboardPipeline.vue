<script setup lang="ts">
import { Clock, PackageSearch, Package, Truck, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-vue-next'
import type { PipelineData, PipelineStatus } from '~/types/dashboard'

const props = defineProps<{
  storeId?: string
}>()

const api = useApi()
const toast = useToast()

const loading = ref(false)
const data = ref<PipelineData | null>(null)

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (props.storeId) params.store_id = props.storeId
    const res = await api.get<{ data: PipelineData }>('/sales/dashboard/pipeline', params)
    data.value = res.data
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat pipeline')
    data.value = null
  }
  finally {
    loading.value = false
  }
}

defineExpose({ refresh: fetchData })

watch(() => props.storeId, fetchData, { immediate: true })

const statusRing: Record<PipelineStatus, string> = {
  healthy: 'ring-green-200 bg-green-50',
  warning: 'ring-amber-200 bg-amber-50',
  critical: 'ring-red-200 bg-red-50',
}
const statusDot: Record<PipelineStatus, string> = {
  healthy: 'bg-green-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
}

const stages = computed(() => {
  if (!data.value) return []
  return [
    {
      key: 'pending', label: 'Pending', icon: Clock,
      count: data.value.pending.count,
      status: data.value.pending.status ?? 'healthy',
      meta: `Avg wait ${data.value.pending.avg_wait_minutes ?? 0}m`,
      color: 'text-amber-600',
    },
    {
      key: 'picking', label: 'Picking', icon: PackageSearch,
      count: data.value.picking.count,
      status: data.value.picking.status ?? 'healthy',
      meta: `Avg ${data.value.picking.avg_process_minutes ?? 0}m`,
      color: 'text-blue-600',
    },
    {
      key: 'packing', label: 'Packing', icon: Package,
      count: data.value.packing.count,
      status: data.value.packing.status ?? 'healthy',
      meta: `Avg ${data.value.packing.avg_process_minutes ?? 0}m`,
      color: 'text-purple-600',
    },
    {
      key: 'shipping', label: 'Shipping', icon: Truck,
      count: data.value.shipping.count,
      status: data.value.shipping.status ?? 'healthy',
      meta: `Avg ${data.value.shipping.avg_process_minutes ?? 0}m`,
      color: 'text-indigo-600',
    },
    {
      key: 'completed', label: 'Completed', icon: CheckCircle2,
      count: data.value.completed.count,
      status: 'healthy' as PipelineStatus,
      meta: 'Today',
      color: 'text-green-600',
    },
  ]
})
</script>

<template>
  <div class="rounded-xl border border-gray-200 bg-white">
    <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold text-gray-900">Order Fulfillment Pipeline</h3>
        <span class="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 ring-1 ring-green-200">
          <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
          Real-time
        </span>
      </div>
      <button
        class="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        :disabled="loading"
        @click="fetchData"
      >
        <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <div class="p-4">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div
          v-for="(stage, idx) in stages"
          :key="stage.key"
          class="relative rounded-lg p-3 ring-1"
          :class="statusRing[stage.status]"
        >
          <div class="flex items-center justify-between">
            <component :is="stage.icon" class="h-4 w-4" :class="stage.color" />
            <span class="h-2 w-2 rounded-full" :class="statusDot[stage.status]" />
          </div>
          <p class="mt-2 text-2xl font-bold text-gray-900">{{ stage.count }}</p>
          <p class="text-xs font-medium text-gray-700">{{ stage.label }}</p>
          <p class="mt-0.5 text-[10px] text-gray-500">{{ stage.meta }}</p>
        </div>

        <!-- Problem -->
        <div
          v-if="data"
          class="relative rounded-lg p-3 ring-1 ring-red-200 bg-red-50"
        >
          <div class="flex items-center justify-between">
            <AlertTriangle class="h-4 w-4 text-red-600" />
            <span class="h-2 w-2 rounded-full" :class="data.problem.count > 0 ? 'bg-red-500 animate-pulse' : 'bg-gray-300'" />
          </div>
          <p class="mt-2 text-2xl font-bold text-red-700">{{ data.problem.count }}</p>
          <p class="text-xs font-medium text-gray-700">Problem</p>
          <p class="mt-0.5 text-[10px] text-gray-500">Need attention</p>
        </div>

        <template v-if="loading && !data">
          <div
            v-for="n in 6"
            :key="`sk-${n}`"
            class="h-24 animate-pulse rounded-lg bg-gray-100"
          />
        </template>
      </div>
    </div>
  </div>
</template>
