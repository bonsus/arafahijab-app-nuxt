<script setup lang="ts">
import {
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
} from 'lucide-vue-next'

interface SummaryWallet {
  total_transaction: number
  total_transaction_in: number
  total_transaction_out: number
  total_in: string
  total_out: string
  balance: string
}

interface Props {
  walletIds?: string[]
  type?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

const props = withDefaults(defineProps<Props>(), {
  walletIds: () => [],
  type: '',
  search: '',
  dateFrom: '',
  dateTo: '',
})

const api = useApi()
const loading = ref(true)
const summary = ref<SummaryWallet | null>(null)

const ratioIn = computed(() => {
  const totalIn = Number(summary.value?.total_in || 0)
  const totalOut = Number(summary.value?.total_out || 0)
  const all = totalIn + totalOut
  if (!all) return 0
  return Math.round((totalIn / all) * 100)
})

function formatCurrency(val: number | string): string {
  return new Intl.NumberFormat('id-ID').format(Number(val) || 0)
}

async function fetchSummary() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (props.walletIds.length) params.wallet_id = props.walletIds.join(',')
    if (props.type) params.type = props.type
    if (props.search) params.search = props.search
    if (props.dateFrom) {
      params.date_from = props.dateFrom
      params.date_to = props.dateTo
    }

    const res = await api.get<{ data: SummaryWallet }>('/wallets/transactions/summary', params)
    summary.value = res.data || null
  }
  catch {
    summary.value = null
  }
  finally {
    loading.value = false
  }
}

watch(() => [props.walletIds, props.type, props.search, props.dateFrom, props.dateTo], () => {
  fetchSummary()
}, { deep: true })

onMounted(() => {
  fetchSummary()
})

defineExpose({ refresh: fetchSummary })
</script>

<template>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
          <Landmark class="h-4.5 w-4.5 text-primary-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Total Transaksi</p>
          <div v-if="loading" class="mt-1 h-5 w-16 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">{{ summary?.total_transaction ?? 0 }}</p>
        </div>
      </div>
      <div v-if="!loading && summary" class="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span class="text-emerald-600">{{ summary.total_transaction_in }} Masuk</span>
        <span class="text-red-600">{{ summary.total_transaction_out }} Keluar</span>
      </div>
    </div>

    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
          <ArrowDownLeft class="h-4.5 w-4.5 text-emerald-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Uang Masuk</p>
          <div v-if="loading" class="mt-1 h-5 w-24 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">Rp{{ formatCurrency(summary?.total_in || 0) }}</p>
        </div>
      </div>
    </div>

    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50">
          <ArrowUpRight class="h-4.5 w-4.5 text-red-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Uang Keluar</p>
          <div v-if="loading" class="mt-1 h-5 w-24 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">Rp{{ formatCurrency(summary?.total_out || 0) }}</p>
        </div>
      </div>
    </div>

    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50">
          <Scale class="h-4.5 w-4.5 text-sky-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Saldo Bersih</p>
          <div v-if="loading" class="mt-1 h-5 w-24 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">Rp{{ formatCurrency(summary?.balance || 0) }}</p>
        </div>
      </div>
      <div v-if="!loading && summary" class="mt-2.5 text-xs text-gray-500">
        {{ ratioIn }}% arus kas masuk
      </div>
    </div>
  </div>
</template>
