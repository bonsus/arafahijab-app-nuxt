<script setup lang="ts">
import { Package, RefreshCw } from 'lucide-vue-next'
import { formatCurrency } from '~/composables/useFormatters'
import type { SkuStat } from '~/types/dashboard'

const props = defineProps<{
  storeId?: string
  dateFrom: string
  dateTo: string
}>()

const api = useApi()
const toast = useToast()

const sortBy = ref<'revenue' | 'qty' | 'orders'>('revenue')
const loading = ref(false)
const items = ref<SkuStat[]>([])

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      sort_by: sortBy.value,
      sort_order: 'desc',
      limit: '8',
    }
    if (props.storeId) params.store_id = props.storeId
    if (props.dateFrom) params.date_from = formatDateFromForApi(props.dateFrom)
    if (props.dateTo) params.date_to = formatDateToForApi(props.dateTo)
    const res = await api.get<{ data: SkuStat[] }>('/sales/dashboard/skus', params)
    items.value = res.data || []
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat top SKU')
    items.value = []
  }
  finally {
    loading.value = false
  }
}

defineExpose({ refresh: fetchData })

watch(
  () => [props.storeId, props.dateFrom, props.dateTo, sortBy.value],
  fetchData,
  { immediate: true },
)
</script>

<template>
  <div class="flex h-full flex-col rounded-xl border border-gray-200 bg-white">
    <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
      <h3 class="text-sm font-semibold text-gray-900">Top SKU</h3>
      <div class="flex items-center gap-2">
        <div class="inline-flex rounded-lg border border-gray-200 p-0.5">
          <button
            v-for="s in ['revenue','orders','qty'] as const"
            :key="s"
            class="rounded-md px-2 py-0.5 text-[10px] font-medium capitalize transition-colors"
            :class="sortBy === s ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:text-gray-700'"
            @click="sortBy = s"
          >
            {{ s }}
          </button>
        </div>
        <button
          class="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          :disabled="loading"
          @click="fetchData"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto" style="max-height: 420px">
      <div v-if="loading && !items.length" class="space-y-2 p-3">
        <div v-for="n in 5" :key="n" class="h-12 animate-pulse rounded-lg bg-gray-100" />
      </div>
      <div v-else-if="!items.length" class="flex flex-col items-center justify-center py-10 text-center">
        <Package class="h-8 w-8 text-gray-300" />
        <p class="mt-2 text-xs text-gray-500">Belum ada SKU terjual</p>
      </div>
      <table v-else class="w-full text-xs">
        <thead class="bg-gray-50 text-[10px] uppercase text-gray-500">
          <tr>
            <th class="px-4 py-2 text-left font-medium">#</th>
            <th class="px-2 py-2 text-left font-medium">SKU / Produk</th>
            <th class="px-2 py-2 text-right font-medium">Qty</th>
            <th class="px-2 py-2 text-right font-medium">Order</th>
            <th class="px-4 py-2 text-right font-medium">Revenue</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="(s, i) in items" :key="s.sku_id" class="hover:bg-gray-50">
            <td class="px-4 py-2 text-gray-400">{{ i + 1 }}</td>
            <td class="px-2 py-2">
              <p class="font-medium text-gray-900">{{ s.product_name }}</p>
              <p class="text-[10px] text-gray-500">
                {{ s.sku }}<span v-if="s.variant"> · {{ s.variant }}</span>
              </p>
            </td>
            <td class="px-2 py-2 text-right font-medium text-gray-700">{{ s.total_qty }}</td>
            <td class="px-2 py-2 text-right text-gray-600">{{ s.total_orders }}</td>
            <td class="px-4 py-2 text-right">
              <p class="font-semibold text-gray-900">Rp {{ formatCurrency(s.total_revenue) }}</p>
              <p class="text-[10px] text-gray-400">{{ s.percentage.toFixed(1) }}%</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
