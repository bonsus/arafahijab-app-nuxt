<script setup lang="ts">
import {
  CreditCard, Wallet, PieChart, Users,
} from 'lucide-vue-next'

interface Recap {
  date_from: string
  date_to: string
  total_prepayment: number
  total_amount: number
  total_allocated: number
  total_available: number
  total_purchase_orders: number
  total_customers: number
  total_wallets: number
}

interface Props {
  search?: string
  supplierIds?: string[]
  walletIds?: string[]
  dateFrom?: string
  dateTo?: string
}

const props = withDefaults(defineProps<Props>(), {
  search: '',
  supplierIds: () => [],
  walletIds: () => [],
  dateFrom: '',
  dateTo: '',
})

const api = useApi()
const loading = ref(true)
const recap = ref<Recap | null>(null)

const allocatedPercent = computed(() => {
  if (!recap.value || !Number(recap.value.total_amount)) return 0
  return Math.min(100, Math.round((Number(recap.value.total_allocated) / Number(recap.value.total_amount)) * 100))
})

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('id-ID').format(val)
}

async function fetchRecap() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (props.search) params.search = props.search
    if (props.supplierIds.length) params.customer_id = props.supplierIds.join(',')
    if (props.walletIds.length) params.wallet_id = props.walletIds.join(',')
    if (props.dateFrom) {
      params.date_from = props.dateFrom
      params.date_to = props.dateTo
    }

    const res = await api.get<{ data: Recap }>('/purchases/payment/summary', params)
    recap.value = res.data
  }
  catch {
    recap.value = null
  }
  finally {
    loading.value = false
  }
}

watch(() => [props.search, props.supplierIds, props.walletIds, props.dateFrom, props.dateTo], () => {
  fetchRecap()
}, { deep: true })

onMounted(() => {
  fetchRecap()
})

defineExpose({ refresh: fetchRecap })
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
          <CreditCard class="h-4.5 w-4.5 text-primary-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Total Prepayment</p>
          <div v-if="loading" class="mt-1 h-5 w-12 animate-pulse rounded bg-gray-200" />
          <div v-if="loading" class="mt-1 h-5 w-20 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">{{ recap?.total_prepayment ?? 0 }}</p>
        </div>
      </div>
      <div v-if="!loading && recap" class="mt-2.5 text-xs text-gray-500">
        {{ recap.total_purchase_orders }} PO
      </div>
    </div>

    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50">
          <Wallet class="h-4.5 w-4.5 text-purple-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Nilai Prepayment</p>
          <div v-if="loading" class="mt-1 h-5 w-20 animate-pulse rounded bg-gray-200" />
          <div v-if="loading" class="mt-1 h-5 w-28 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">Rp{{ formatCurrency(Number(recap?.total_amount ?? 0)) }}</p>
        </div>
      </div>
      <div v-if="!loading && recap" class="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span class="text-emerald-600">Teralokasi Rp{{ formatCurrency(Number(recap.total_allocated)) }}</span>
        <span class="text-orange-600">Sisa Rp{{ formatCurrency(Number(recap.total_available)) }}</span>
      </div>
    </div>

    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
          <PieChart class="h-4.5 w-4.5 text-emerald-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Progres Alokasi</p>
          <div v-if="loading" class="mt-1 h-5 w-12 animate-pulse rounded bg-gray-200" />
          <div v-if="loading" class="mt-1 h-5 w-16 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">{{ allocatedPercent }}%</p>
        </div>
      </div>
      <div v-if="!loading && recap" class="mt-2.5 text-xs text-gray-500">
        Rp{{ formatCurrency(Number(recap.total_allocated)) }} dari Rp{{ formatCurrency(Number(recap.total_amount)) }}
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
          <div v-if="loading" class="mt-1 h-5 w-16 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">{{ recap?.total_customers ?? 0 }}</p>
        </div>
      </div>
      <div v-if="!loading && recap" class="mt-2.5 text-xs text-gray-500">
        {{ recap.total_wallets }} Dompet
      </div>
    </div>
  </div>
</template>