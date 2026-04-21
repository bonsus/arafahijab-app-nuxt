<script setup lang="ts">
import {
  ClipboardList, Wallet, CircleDollarSign, Users,
} from 'lucide-vue-next'

interface Recap {
  total_receipt: number
  total_receipt_unpaid?: number
  total_receipt_partial?: number
  total_receipt_paid?: number
  total_draft: number
  total_checking?: number
  total_received?: number
  total_completed: number
  total_amount: number
  total_paid: number
  total_unpaid: number
  total_products: number
  total_skus: number
  total_qty: number
  total_qty_returned: number
  total_qty_good: number
  total_customers: number
  total_warehouses: number
}

interface Props {
  search?: string
  supplierIds?: string[]
  paymentStatus?: string[]
  dateType?: string
  dateFrom?: string
  dateTo?: string
}

const props = withDefaults(defineProps<Props>(), {
  search: '',
  supplierIds: () => [],
  paymentStatus: () => [],
  dateType: 'date_due',
  dateFrom: '',
  dateTo: '',
})

const api = useApi()
const loading = ref(true)
const recap = ref<Recap | null>(null)

const paidProgress = computed(() => {
  if (!recap.value || !Number(recap.value.total_amount)) return 0
  return Math.min(100, Math.round((Number(recap.value.total_paid) / Number(recap.value.total_amount)) * 100))
})

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('id-ID').format(val)
}

async function fetchRecap() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      status: 'received,completed',
    }
    if (props.search) params.search = props.search
    if (props.supplierIds.length) params.customer_id = props.supplierIds.join(',')
    if (props.paymentStatus.length) params.payment_status = props.paymentStatus.join(',')
    if (props.dateFrom) {
      params.date_type = props.dateType
      params.date_from = props.dateFrom
      params.date_to = props.dateTo
    }
    const res = await api.get<{ data: Recap }>('/purchase-receipts/summary', params)
    recap.value = res.data
  }
  catch {
    recap.value = null
  }
  finally {
    loading.value = false
  }
}

watch(() => [props.search, props.supplierIds, props.paymentStatus, props.dateType, props.dateFrom, props.dateTo], () => {
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
          <ClipboardList class="h-4.5 w-4.5 text-primary-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Tagihan GRN</p>
          <div v-if="loading" class="mt-1 h-5 w-12 animate-pulse rounded bg-gray-200" />
          <div v-if="loading" class="mt-1 h-5 w-22 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">{{ recap?.total_receipt ?? 0 }}</p>
        </div>
      </div>
      <div v-if="!loading && recap" class="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span class="text-red-600">{{ Number(recap.total_receipt_unpaid ?? 0) }} Belum Bayar</span>
        <span class="text-orange-600">{{ Number(recap.total_receipt_partial ?? 0) }} Sebagian</span>
        <span class="text-green-600">{{ Number(recap.total_receipt_paid ?? 0) }} Lunas</span>
      </div>
    </div>

    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50">
          <Wallet class="h-4.5 w-4.5 text-purple-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Nilai Tagihan</p>
          <div v-if="loading" class="mt-1 h-5 w-24 animate-pulse rounded bg-gray-200" />
          <div v-if="loading" class="mt-1 h-5 w-34 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">Rp{{ formatCurrency(Number(recap?.total_amount ?? 0)) }}</p>
        </div>
      </div>
      <div v-if="!loading && recap" class="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span class="text-emerald-600">Dibayar Rp{{ formatCurrency(Number(recap.total_paid)) }}</span>
        <span class="text-red-500">Sisa Rp{{ formatCurrency(Number(recap.total_unpaid)) }}</span>
      </div>
    </div>

    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
          <CircleDollarSign class="h-4.5 w-4.5 text-emerald-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Progres Bayar</p>
          <div v-if="loading" class="mt-1 h-5 w-12 animate-pulse rounded bg-gray-200" />
          <div v-if="loading" class="mt-1 h-5 w-24 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">{{ paidProgress }}%</p>
        </div>
      </div>
      <div v-if="!loading && recap" class="mt-2.5 text-xs text-gray-500">
        Rp{{ formatCurrency(Number(recap.total_paid)) }} dari Rp{{ formatCurrency(Number(recap.total_amount)) }}
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
          <div v-if="loading" class="mt-1 h-5 w-20 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">{{ recap?.total_customers ?? 0 }}</p>
        </div>
      </div>
      <div v-if="!loading && recap" class="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span class="text-gray-500">{{ recap.total_warehouses }} Gudang</span>
        <span class="text-gray-500">{{ recap.total_skus }} SKU</span>
      </div>
    </div>
  </div>
</template>