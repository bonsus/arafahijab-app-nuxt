<script setup lang="ts">
import {
  ShoppingCart, FileText, Clock, CheckCircle, Package,
  Wallet, Users, Layers,
} from 'lucide-vue-next'

interface Recap {
  total_purchase: number
  total_draft: number
  total_waiting_approval: number
  total_approved: number
  total_partial: number
  total_rejected: number
  total_completed: number
  total_amount: number
  total_paid: number
  total_unpaid: number
  total_products: number
  total_skus: number
  total_qty: number
  total_qty_received: number
  total_qty_pending: number
  total_customers: number
}

interface Props {
  search?: string
  status?: string[]
  supplierIds?: string[]
  dateType?: string
  dateFrom?: string
  dateTo?: string
}

const props = withDefaults(defineProps<Props>(), {
  search: '',
  status: () => [],
  supplierIds: () => [],
  dateType: 'date_created',
  dateFrom: '',
  dateTo: '',
})

const api = useApi()
const loading = ref(true)
const recap = ref<Recap | null>(null)

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('id-ID').format(val)
}

async function fetchRecap() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (props.search) params.search = props.search
    if (props.status.length) params.status = props.status.join(',')
    if (props.supplierIds.length) params.customer_id = props.supplierIds.join(',')
    if (props.dateFrom) {
      params.date_type = props.dateType
      params.date_from = props.dateFrom
      params.date_to = props.dateTo
    }
    const res = await api.get<{ data: Recap }>('/purchases/recap', params)
    recap.value = res.data
  }
  catch {
    recap.value = null
  }
  finally {
    loading.value = false
  }
}

watch(() => [props.search, props.status, props.supplierIds, props.dateType, props.dateFrom, props.dateTo], () => {
  fetchRecap()
}, { deep: true })

onMounted(() => {
  fetchRecap()
})

defineExpose({ refresh: fetchRecap })
</script>

<template>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
    <!-- Total PO -->
    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
          <ShoppingCart class="h-4.5 w-4.5 text-primary-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Total PO</p>
          <div v-if="loading" class="mt-1 h-5 w-12 animate-pulse rounded bg-gray-200" />
          <div v-if="loading" class="mt-1 h-5 w-22 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">{{ recap?.total_purchase ?? 0 }}</p>
        </div>
      </div>
      <div v-if="!loading && recap" class="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span class="text-yellow-600">{{ recap.total_draft }} Draft</span>
        <span class="text-amber-600">{{ recap.total_waiting_approval }} Menunggu</span>
        <span class="text-emerald-600">{{ recap.total_approved }} Disetujui</span>
        <span class="text-blue-600">{{ recap.total_partial }} Parsial</span>
        <span class="text-red-600">{{ recap.total_rejected }} Ditolak</span>
        <span class="text-green-600">{{ recap.total_completed }} Selesai</span>
      </div>
    </div>

    <!-- Total Amount -->
    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50">
          <Wallet class="h-4.5 w-4.5 text-purple-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Total Nilai</p>
          <div v-if="loading" class="mt-1 h-5 w-24 animate-pulse rounded bg-gray-200" />
          <div v-if="loading" class="mt-1 h-5 w-34 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">Rp{{ formatCurrency(recap?.total_amount ?? 0) }}</p>
        </div>
      </div>
      <div v-if="!loading && recap" class="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span class="text-emerald-600">Dibayar Rp{{ formatCurrency(recap.total_paid) }}</span>
        <span class="text-red-500">Sisa Rp{{ formatCurrency(recap.total_unpaid) }}</span>
      </div>
    </div>

    <!-- Qty -->
    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
          <Package class="h-4.5 w-4.5 text-blue-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Total Qty</p>
          <div v-if="loading" class="mt-1 h-5 w-12 animate-pulse rounded bg-gray-200" />
          <div v-if="loading" class="mt-1 h-5 w-22 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">{{ recap?.total_qty ?? 0 }}</p>
        </div>
      </div>
      <div v-if="!loading && recap" class="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span class="text-emerald-600">{{ recap.total_qty_received }} Diterima</span>
        <span class="text-orange-500">{{ recap.total_qty_pending }} Pending</span>
      </div>
    </div>

    <!-- Suppliers & Products -->
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
        <span class="text-gray-500">{{ recap.total_products }} Produk</span>
        <span class="text-gray-500">{{ recap.total_skus }} SKU</span>
      </div>
    </div>
  </div>
</template>
