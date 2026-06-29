<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ShoppingBag, Clock, Package, Truck, CheckCircle2, XCircle, Wallet, RefreshCw } from 'lucide-vue-next'
import { formatCurrency } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const authStore = useAuthStore()
 

interface CsSummary {
  total_orders: number
  pending_payment: number
  processing_count: number
  shipped_count: number
  completed_count: number
  canceled_count: number
  total_sales: string
}

function todayStr() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const filterDate = ref({ from: todayStr(), to: todayStr() })
const loading = ref(false)
const summary = ref<CsSummary | null>(null)

async function fetchSummary() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (filterDate.value.from) {
      params.date_from = filterDate.value.from
      params.date_to = filterDate.value.to
    }
    const res = await api.get<{ data: CsSummary }>('/sales/ordercs/summary', params)
    summary.value = res.data
  }
  catch {
    summary.value = null
  }
  finally {
    loading.value = false
  }
}

function onDateFilter(val: { from: string, to: string }) {
  filterDate.value = val
  fetchSummary()
}

const cards = computed(() => [
  { label: 'Total Order', value: summary.value?.total_orders ?? 0, icon: ShoppingBag, cls: 'bg-blue-50 text-blue-600' },
  { label: 'Belum Bayar', value: summary.value?.pending_payment ?? 0, icon: Clock, cls: 'bg-amber-50 text-amber-600' },
  { label: 'Diproses', value: summary.value?.processing_count ?? 0, icon: Package, cls: 'bg-indigo-50 text-indigo-600' },
  { label: 'Dikirim', value: summary.value?.shipped_count ?? 0, icon: Truck, cls: 'bg-cyan-50 text-cyan-600' },
  { label: 'Selesai', value: summary.value?.completed_count ?? 0, icon: CheckCircle2, cls: 'bg-green-50 text-green-600' },
  { label: 'Dibatalkan', value: summary.value?.canceled_count ?? 0, icon: XCircle, cls: 'bg-red-50 text-red-600' },
])

onMounted(fetchSummary)
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Dashboard CS</h1>
        <p class="mt-0.5 text-xs text-gray-500">Selamat datang, {{ authStore.user?.name || 'CS' }}. Ringkasan order Anda.</p>
      </div>
      <div class="flex items-center gap-2">
        <AppDateRangePicker :model-value="filterDate" @update:model-value="onDateFilter" />
        <button
          class="flex shrink-0 rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          title="Refresh data"
          :disabled="loading"
          @click="fetchSummary()"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- Total Sales -->
    <div class="rounded-xl bg-primary-600 p-5 text-white shadow-sm">
      <div class="flex items-center gap-3">
        <div class="rounded-lg bg-white/20 p-2.5">
          <Wallet class="h-6 w-6" />
        </div>
        <div>
          <p class="text-xs font-medium text-white/80">Total Penjualan</p>
          <p class="text-2xl font-bold">Rp{{ formatCurrency(summary?.total_sales ?? 0) }}</p>
        </div>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <div
        v-for="card in cards"
        :key="card.label"
        class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200"
      >
        <div class="mb-2 inline-flex rounded-lg p-2" :class="card.cls">
          <component :is="card.icon" class="h-5 w-5" />
        </div>
        <p class="text-xl font-bold text-gray-900">{{ card.value }}</p>
        <p class="text-xs text-gray-500">{{ card.label }}</p>
      </div>
    </div>
  </div>
</template>
