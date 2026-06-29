<script setup lang="ts">
import { RefreshCw, Store as StoreIcon } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
})

interface StoreOption {
  id: string
  shop_name: string
  source?: string
}

const api = useApi()
const authStore = useAuthStore()

if (authStore.user?.is_cs) {
  await navigateTo('/sales/ordercs/dashboard')
}

function todayStr() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const filterDate = ref<{ from: string; to: string }>({ from: todayStr(), to: todayStr() })
const storeId = ref<string>('')
const stores = ref<StoreOption[]>([])
const autoRefresh = ref(false)

const kpiRef = ref<any>()
const pipelineRef = ref<any>()
const ordersChartRef = ref<any>()
const fulfillmentChartRef = ref<any>()
const alertsRef = ref<any>()
const activityRef = ref<any>()
const channelsRef = ref<any>()
const skusRef = ref<any>()
const categoriesRef = ref<any>()

async function loadStores() {
  try {
    const res = await api.get<{ data: StoreOption[] | null }>('/stores/public/index')
    stores.value = res.data || []
  }
  catch {
    stores.value = []
  }
}

function refreshAll() {
  kpiRef.value?.refresh?.()
  pipelineRef.value?.refresh?.()
  ordersChartRef.value?.refresh?.()
  fulfillmentChartRef.value?.refresh?.()
  alertsRef.value?.refresh?.()
  activityRef.value?.refresh?.()
  channelsRef.value?.refresh?.()
  skusRef.value?.refresh?.()
  categoriesRef.value?.refresh?.()
}

let timer: ReturnType<typeof setInterval> | null = null
watch(autoRefresh, (v) => {
  if (timer) { clearInterval(timer); timer = null }
  if (v) {
    timer = setInterval(refreshAll, 30000)
  }
})

onMounted(() => loadStores())
onBeforeUnmount(() => { if (timer) clearInterval(timer) })

function pad(n: number) { return String(n).padStart(2, '0') }
function fmt(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function setRange(preset: 'today' | 'yesterday' | '7d' | '30d') {
  const now = new Date()
  if (preset === 'today') {
    filterDate.value = { from: fmt(now), to: fmt(now) }
  }
  else if (preset === 'yesterday') {
    const y = new Date(now); y.setDate(now.getDate() - 1)
    filterDate.value = { from: fmt(y), to: fmt(y) }
  }
  else if (preset === '7d') {
    const from = new Date(now); from.setDate(now.getDate() - 6)
    filterDate.value = { from: fmt(from), to: fmt(now) }
  }
  else if (preset === '30d') {
    const from = new Date(now); from.setDate(now.getDate() - 29)
    filterDate.value = { from: fmt(from), to: fmt(now) }
  }
}

const currentPreset = computed(() => {
  const now = new Date()
  const today = fmt(now)
  const y = new Date(now); y.setDate(now.getDate() - 1); const yest = fmt(y)
  const from7 = new Date(now); from7.setDate(now.getDate() - 6)
  const from30 = new Date(now); from30.setDate(now.getDate() - 29)
  if (filterDate.value.from === today && filterDate.value.to === today) return 'today'
  if (filterDate.value.from === yest && filterDate.value.to === yest) return 'yesterday'
  if (filterDate.value.from === fmt(from7) && filterDate.value.to === today) return '7d'
  if (filterDate.value.from === fmt(from30) && filterDate.value.to === today) return '30d'
  return ''
})

const presets = [
  { key: 'today', label: 'Hari Ini' },
  { key: 'yesterday', label: 'Kemarin' },
  { key: '7d', label: '7 Hari' },
  { key: '30d', label: '30 Hari' },
] as const
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Dashboard Penjualan</h1>
        <p class="mt-0.5 text-xs text-gray-500">
          Selamat datang, {{ authStore.user?.name || 'User' }}. Ringkasan operasional bisnis Anda.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="relative">
          <StoreIcon class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <select
            v-model="storeId"
            class="appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pl-7 pr-7 text-xs text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Semua Toko</option>
            <option v-for="s in stores" :key="s.id" :value="s.id">{{ s.shop_name }}</option>
          </select>
        </div>

        <div class="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          <button
            v-for="p in presets"
            :key="p.key"
            class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            :class="currentPreset === p.key ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:text-gray-700'"
            @click="setRange(p.key)"
          >
            {{ p.label }}
          </button>
        </div>

        <AppDateRangePicker v-model="filterDate" />

        <label class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600">
          <input v-model="autoRefresh" type="checkbox" class="rounded text-primary-600 focus:ring-primary-500">
          Auto refresh
        </label>

        <button
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
          @click="refreshAll"
        >
          <RefreshCw class="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>
    </div>

    <DashboardKpiSummary
      ref="kpiRef"
      :store-id="storeId"
      :date-from="filterDate.from"
      :date-to="filterDate.to"
    />

    <DashboardPipeline ref="pipelineRef" :store-id="storeId" />

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <DashboardOrdersRevenueChart
        ref="ordersChartRef"
        :store-id="storeId"
        :date-from="filterDate.from"
        :date-to="filterDate.to"
      />
      <DashboardFulfillmentChart
        ref="fulfillmentChartRef"
        :store-id="storeId"
        :date-from="filterDate.from"
        :date-to="filterDate.to"
      />
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <DashboardAlerts ref="alertsRef" :store-id="storeId" />
      <DashboardActivityFeed ref="activityRef" :store-id="storeId" />
      <DashboardTopChannels
        ref="channelsRef"
        :date-from="filterDate.from"
        :date-to="filterDate.to"
      />
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <DashboardTopSkus
          ref="skusRef"
          :store-id="storeId"
          :date-from="filterDate.from"
          :date-to="filterDate.to"
        />
      </div>
      <DashboardCustomerCategories
        ref="categoriesRef"
        :store-id="storeId"
        :date-from="filterDate.from"
        :date-to="filterDate.to"
      />
    </div>
  </div>
</template>
