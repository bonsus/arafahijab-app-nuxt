<script setup lang="ts">
import { DollarSign, ShoppingCart, Clock, Truck, CheckCircle2, RotateCcw } from 'lucide-vue-next'
import type { KpiSummary } from '~/types/dashboard'

const props = defineProps<{
  storeId?: string
  dateFrom: string
  dateTo: string
}>()

const api = useApi()
const toast = useToast()

const loading = ref(false)
const data = ref<KpiSummary | null>(null)

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (props.storeId) params.store_id = props.storeId
    if (props.dateFrom) params.date_from = props.dateFrom
    if (props.dateTo) params.date_to = props.dateTo
    const res = await api.get<{ data: KpiSummary }>('/sales/dashboard/summary', params)
    data.value = res.data
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat ringkasan KPI')
    data.value = null
  }
  finally {
    loading.value = false
  }
}

defineExpose({ refresh: fetchData })

watch(() => [props.storeId, props.dateFrom, props.dateTo], fetchData, { immediate: true })
</script>

<template>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
    <DashboardKpiCard
      label="Revenue"
      :value="data?.revenue_today.value ?? 0"
      :growth="data?.revenue_today.growth ?? 0"
      :icon="DollarSign"
      icon-bg="bg-green-50"
      icon-color="text-green-600"
      format="currency"
      :loading="loading"
    />
    <DashboardKpiCard
      label="Orders"
      :value="data?.orders_today.value ?? 0"
      :growth="data?.orders_today.growth ?? 0"
      :icon="ShoppingCart"
      icon-bg="bg-blue-50"
      icon-color="text-blue-600"
      :loading="loading"
    />
    <DashboardKpiCard
      label="Pending Orders"
      :value="data?.pending_orders.value ?? 0"
      :growth="data?.pending_orders.growth ?? 0"
      :icon="Clock"
      icon-bg="bg-amber-50"
      icon-color="text-amber-600"
      :loading="loading"
    />
    <DashboardKpiCard
      label="Dalam Pengiriman"
      :value="data?.in_delivery_orders.value ?? 0"
      :growth="data?.in_delivery_orders.growth ?? 0"
      :icon="Truck"
      icon-bg="bg-indigo-50"
      icon-color="text-indigo-600"
      :loading="loading"
    />
    <DashboardKpiCard
      label="Fulfillment SLA"
      :value="data?.fulfillment_sla.value ?? 0"
      :growth="data?.fulfillment_sla.growth ?? 0"
      :icon="CheckCircle2"
      icon-bg="bg-emerald-50"
      icon-color="text-emerald-600"
      format="percent"
      growth-as-points
      :loading="loading"
    />
    <DashboardKpiCard
      label="Return Rate"
      :value="data?.return_rate.value ?? 0"
      :growth="data?.return_rate.growth ?? 0"
      :icon="RotateCcw"
      icon-bg="bg-rose-50"
      icon-color="text-rose-600"
      format="percent"
      growth-as-points
      :loading="loading"
    />
  </div>
</template>
