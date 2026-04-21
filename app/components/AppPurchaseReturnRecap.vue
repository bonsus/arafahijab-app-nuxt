<script setup lang="ts">
import {
  RefreshCcw, Wallet, CircleDollarSign, Users,
} from 'lucide-vue-next'

interface Recap {
  date_from: string
  date_to: string
  total_return: number
  total_draft: number
  total_completed: number
  total_return_unpaid: number
  total_return_partial: number
  total_return_paid: number
  total_amount: number
  total_refunded: number
  total_unrefunded: number
  total_products: number
  total_skus: number
  total_qty: number
  total_customers: number
  total_warehouses: number
}

interface Props {
  supplierIds?: string[]
  warehouseIds?: string[]
  dateFrom?: string
  dateTo?: string
  purchaseReceiptId?: string
}

const props = withDefaults(defineProps<Props>(), {
  supplierIds: () => [],
  warehouseIds: () => [],
  dateFrom: '',
  dateTo: '',
  purchaseReceiptId: '',
})

const api = useApi()
const loading = ref(true)
const recap = ref<Recap | null>(null)

const refundProgress = computed(() => {
  if (!recap.value || !Number(recap.value.total_amount)) return 0
  return Math.min(100, Math.round((Number(recap.value.total_refunded) / Number(recap.value.total_amount)) * 100))
})

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('id-ID').format(val)
}

async function fetchRecap() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (props.supplierIds.length) params.customer_id = props.supplierIds.join(',')
    if (props.warehouseIds.length) params.warehouse_id = props.warehouseIds.join(',')
    if (props.purchaseReceiptId) params.purchase_receipt_id = props.purchaseReceiptId
    if (props.dateFrom) {
      params.date_from = props.dateFrom
      params.date_to = props.dateTo
    }

    const res = await api.get<{ data: Recap }>('/purchase-returns/summary', params)
    recap.value = res.data
  }
  catch {
    recap.value = null
  }
  finally {
    loading.value = false
  }
}

watch(() => [props.supplierIds, props.warehouseIds, props.dateFrom, props.dateTo, props.purchaseReceiptId], () => {
  fetchRecap()
}, { deep: true })

onMounted(() => {
  fetchRecap()
})

defineExpose({ refresh: fetchRecap })
</script>

<template>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
          <RefreshCcw class="h-4.5 w-4.5 text-primary-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Total Return</p>
          <div v-if="loading" class="mt-1 h-5 w-12 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">{{ recap?.total_return ?? 0 }}</p>
        </div>
      </div>
      <div v-if="!loading && recap" class="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span class="text-yellow-600">{{ recap.total_draft }} Draft</span>
        <span class="text-green-600">{{ recap.total_completed }} Selesai</span>
      </div>
    </div>

    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50">
          <Wallet class="h-4.5 w-4.5 text-purple-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Nilai Return</p>
          <div v-if="loading" class="mt-1 h-5 w-24 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">Rp{{ formatCurrency(Number(recap?.total_amount ?? 0)) }}</p>
        </div>
      </div>
      <div v-if="!loading && recap" class="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span class="text-emerald-600">Refund Rp{{ formatCurrency(Number(recap.total_refunded)) }}</span>
        <span class="text-red-500">Sisa Rp{{ formatCurrency(Number(recap.total_unrefunded)) }}</span>
      </div>
    </div>

    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
          <CircleDollarSign class="h-4.5 w-4.5 text-emerald-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Status Refund</p>
          <div v-if="loading" class="mt-1 h-5 w-12 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">{{ refundProgress }}%</p>
        </div>
      </div>
      <div v-if="!loading && recap" class="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span class="text-red-600">{{ recap.total_return_unpaid }} Belum</span>
        <span class="text-orange-600">{{ recap.total_return_partial }} Sebagian</span>
        <span class="text-green-600">{{ recap.total_return_paid }} Lunas</span>
      </div>
    </div>

    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50">
          <Users class="h-4.5 w-4.5 text-teal-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Supplier</p>
          <div v-if="loading" class="mt-1 h-5 w-8 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">{{ recap?.total_customers ?? 0 }}</p>
        </div>
      </div>
      <div v-if="!loading && recap" class="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
        <span>{{ recap.total_warehouses }} Gudang</span>
        <span>{{ recap.total_skus }} SKU</span>
      </div>
    </div>
  </div>
</template>
