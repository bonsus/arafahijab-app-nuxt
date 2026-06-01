<script setup lang="ts">
import { Activity, RefreshCw, ShoppingCart, RefreshCcw, Package, Truck, CreditCard, MapPin, Pencil, Trash2 } from 'lucide-vue-next'
import type { DashboardActivity, DashboardActivityPage } from '~/types/dashboard'

const props = defineProps<{
  storeId?: string
}>()

const api = useApi()
const toast = useToast()

const loading = ref(false)
const items = ref<DashboardActivity[]>([])

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, string> = { page: '1', per_page: '15' }
    if (props.storeId) params.store_id = props.storeId
    const res = await api.get<{ data: DashboardActivityPage }>('/sales/dashboard/activity', params)
    items.value = res.data?.data || []
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat activity')
    items.value = []
  }
  finally {
    loading.value = false
  }
}

defineExpose({ refresh: fetchData })

watch(() => props.storeId, fetchData, { immediate: true })

function iconFor(type: string) {
  if (type.includes('payment')) return CreditCard
  if (type.includes('address')) return MapPin
  if (type.includes('shipment') || type.includes('resi')) return Truck
  if (type.includes('status')) return RefreshCcw
  if (type.includes('detail') || type.includes('updated')) return Pencil
  if (type.includes('deleted')) return Trash2
  if (type.includes('packed') || type.includes('packing')) return Package
  return ShoppingCart
}

function colorFor(type: string) {
  if (type.includes('deleted') || type.includes('canceled')) return 'bg-red-50 text-red-600 ring-red-200'
  if (type.includes('created')) return 'bg-green-50 text-green-600 ring-green-200'
  if (type.includes('payment')) return 'bg-emerald-50 text-emerald-600 ring-emerald-200'
  if (type.includes('shipment') || type.includes('resi')) return 'bg-indigo-50 text-indigo-600 ring-indigo-200'
  if (type.includes('status')) return 'bg-blue-50 text-blue-600 ring-blue-200'
  return 'bg-gray-50 text-gray-600 ring-gray-200'
}

function timeShort(dateStr: string) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="flex h-full flex-col rounded-xl border border-gray-200 bg-white">
    <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold text-gray-900">Live Activity Feed</h3>
        <span class="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 ring-1 ring-green-200">
          <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
          Live
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

    <div class="flex-1 overflow-y-auto" style="max-height: 360px">
      <div v-if="loading && !items.length" class="space-y-2 p-3">
        <div v-for="n in 5" :key="n" class="h-12 animate-pulse rounded-lg bg-gray-100" />
      </div>
      <div v-else-if="!items.length" class="flex flex-col items-center justify-center px-4 py-10 text-center">
        <Activity class="h-8 w-8 text-gray-300" />
        <p class="mt-2 text-xs text-gray-500">Belum ada aktivitas</p>
      </div>
      <ul v-else class="divide-y divide-gray-100">
        <li
          v-for="a in items"
          :key="a.id"
          class="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50"
        >
          <span class="w-9 shrink-0 pt-0.5 text-[10px] font-medium text-gray-400">
            {{ timeShort(a.created_at) }}
          </span>
          <div
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1"
            :class="colorFor(a.type)"
          >
            <component :is="iconFor(a.type)" class="h-3.5 w-3.5" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="line-clamp-2 text-xs text-gray-700">{{ a.message }}</p>
            <p v-if="a.warehouse" class="mt-0.5 text-[10px] text-gray-400">{{ a.warehouse }}</p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
