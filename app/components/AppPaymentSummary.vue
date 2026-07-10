<script setup lang="ts">
import { DollarSign, CheckCircle, XCircle, Clock, FileCheck, FileX, FileClock, ShoppingCart } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { formatCurrency } from '~/composables/useFormatters'

const props = defineProps<{
  search?: string
  status?: string
  storeIds?: string
  cod?: string
  dateFrom?: string
  dateTo?: string
}>()

const api = useApi()

const loading = ref(false)
const summaryData = ref<{
  order_paid_count: number
  order_paid_total: number
  order_not_paid_count: number
  order_not_paid_total: number
  payment_paid_count: number
  payment_paid_total: number
  payment_cancelled_count: number
  payment_cancelled_total: number
  payment_confirmation_approved_count: number
  payment_confirmation_approved_total: number
  payment_confirmation_rejected_count: number
  payment_confirmation_rejected_total: number
  payment_confirmation_pending_count: number
  payment_confirmation_pending_total: number
}>({
  order_paid_count: 0,
  order_paid_total: 0,
  order_not_paid_count: 0,
  order_not_paid_total: 0,
  payment_paid_count: 0,
  payment_paid_total: 0,
  payment_cancelled_count: 0,
  payment_cancelled_total: 0,
  payment_confirmation_approved_count: 0,
  payment_confirmation_approved_total: 0,
  payment_confirmation_rejected_count: 0,
  payment_confirmation_rejected_total: 0,
  payment_confirmation_pending_count: 0,
  payment_confirmation_pending_total: 0,
})

async function fetchSummary() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (props.search) params.search = props.search
    if (props.status) params.status = props.status
    if (props.storeIds) params.store_id = props.storeIds
    if (props.cod) params.cod = props.cod
    if (props.dateFrom) {
      params.date_from = formatDateFromForApi(props.dateFrom)
      params.date_to = formatDateToForApi(props.dateTo || '')
    }

    const res = await api.get<{ data: any }>('/sales/orders/payments/summary', params)
    summaryData.value = res.data || summaryData.value
  } catch {
    // silent fail
  } finally {
    loading.value = false
  }
}

watch(() => [props.search, props.status, props.storeIds, props.cod, props.dateFrom, props.dateTo], () => {
  fetchSummary()
})

onMounted(() => {
  fetchSummary()
})
</script>

<template>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <!-- Order Status -->
    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50">
          <ShoppingCart class="h-4.5 w-4.5 text-green-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Order Lunas</p>
          <div v-if="loading" class="mt-1 h-5 w-12 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">Rp{{ formatCurrency(summaryData.order_paid_total) }}</p>
        </div>
      </div>
      <div v-if="!loading" class="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span class="text-orange-500">Rp{{ formatCurrency(summaryData.order_not_paid_total) }} Belum Lunas</span>
      </div>
    </div>

    <!-- Payment Status -->
    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
          <DollarSign class="h-4.5 w-4.5 text-blue-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Total Pembayaran</p>
          <div v-if="loading" class="mt-1 h-5 w-24 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">Rp{{ formatCurrency(summaryData.payment_paid_total) }}</p>
        </div>
      </div>
      <div v-if="!loading" class="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span class="text-blue-600">{{ summaryData.payment_paid_count }} Selesai</span>
        <span class="text-red-500">{{ summaryData.payment_cancelled_count }} Dibatalkan</span>
      </div>
    </div>

    <!-- Confirmation Status -->
    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
          <FileCheck class="h-4.5 w-4.5 text-emerald-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Konfirmasi Pembayaran</p>
          <div v-if="loading" class="mt-1 h-5 w-12 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">{{ summaryData.payment_confirmation_approved_count }}</p>
        </div>
      </div>
      <div v-if="!loading" class="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span class="text-emerald-600">{{ summaryData.payment_confirmation_approved_count }} Disetujui</span>
        <span class="text-red-500">{{ summaryData.payment_confirmation_rejected_count }} Ditolak</span>
        <span class="text-amber-600">{{ summaryData.payment_confirmation_pending_count }} Menunggu</span>
      </div>
    </div> 

    <!-- Total Orders -->
    <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50">
          <ShoppingCart class="h-4.5 w-4.5 text-purple-600" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Total Order</p>
          <div v-if="loading" class="mt-1 h-5 w-12 animate-pulse rounded bg-gray-200" />
          <p v-else class="text-lg font-bold text-gray-900">{{ summaryData.order_paid_count + summaryData.order_not_paid_count }}</p>
        </div>
      </div>
      <div v-if="!loading" class="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span class="text-emerald-600">{{ summaryData.order_paid_count }} Lunas</span>
        <span class="text-orange-500">{{ summaryData.order_not_paid_count }} Belum Lunas</span>
      </div>
    </div>
  </div>
</template>
