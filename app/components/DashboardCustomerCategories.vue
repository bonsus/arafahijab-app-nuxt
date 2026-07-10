<script setup lang="ts">
import { Users, RefreshCw } from 'lucide-vue-next'
import { formatCurrency } from '~/composables/useFormatters'
import type { CustomerCategoryStat } from '~/types/dashboard'

const props = defineProps<{
  storeId?: string
  dateFrom: string
  dateTo: string
}>()

const api = useApi()
const toast = useToast()

const loading = ref(false)
const items = ref<CustomerCategoryStat[]>([])

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (props.storeId) params.store_id = props.storeId
    if (props.dateFrom) params.date_from = formatDateFromForApi(props.dateFrom)
    if (props.dateTo) params.date_to = formatDateToForApi(props.dateTo)
    const res = await api.get<{ data: CustomerCategoryStat[] }>('/sales/dashboard/customer-categories', params)
    items.value = res.data || []
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat customer categories')
    items.value = []
  }
  finally {
    loading.value = false
  }
}

defineExpose({ refresh: fetchData })

watch(() => [props.storeId, props.dateFrom, props.dateTo], fetchData, { immediate: true })

const palette = [
  'bg-primary-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-lime-500',
  'bg-fuchsia-500',
]
</script>

<template>
  <div class="flex h-full flex-col rounded-xl border border-gray-200 bg-white">
    <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
      <h3 class="text-sm font-semibold text-gray-900">Customer Categories</h3>
      <button
        class="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        :disabled="loading"
        @click="fetchData"
      >
        <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4" style="max-height: 360px">
      <div v-if="loading && !items.length" class="space-y-2">
        <div v-for="n in 4" :key="n" class="h-10 animate-pulse rounded-lg bg-gray-100" />
      </div>
      <div v-else-if="!items.length" class="flex flex-col items-center justify-center py-10 text-center">
        <Users class="h-8 w-8 text-gray-300" />
        <p class="mt-2 text-xs text-gray-500">Belum ada data customer</p>
      </div>
      <ul v-else class="space-y-3">
        <li v-for="(c, i) in items" :key="c.category_id || i">
          <div class="flex items-center justify-between gap-2">
            <div class="flex min-w-0 items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full" :class="palette[i % palette.length]" />
              <p class="truncate text-xs font-medium text-gray-900">{{ c.category_name }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs font-semibold text-gray-900">{{ c.total_orders }} order</p>
              <p class="text-[10px] text-gray-500">Rp {{ formatCurrency(c.total_revenue) }}</p>
            </div>
          </div>
          <div class="mt-1.5 flex items-center gap-2">
            <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                class="h-full rounded-full transition-all"
                :class="palette[i % palette.length]"
                :style="{ width: `${Math.min(100, c.percentage)}%` }"
              />
            </div>
            <span class="w-12 text-right text-[10px] font-medium text-gray-500">
              {{ c.percentage.toFixed(1) }}%
            </span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
