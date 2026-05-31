<script setup lang="ts">
import {
  ArrowLeft, Package, Truck, Calendar, User, Clock, Printer
} from 'lucide-vue-next'
import { formatDateTime, formatCurrency } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

interface OrderData {
  id: string
  no: string
  date_created: string
  date_shipped: string
  status: string
  sub_status: string
  qty: number
  total: string
  cod: string
  customer_id: string
  customer_name: string
  customer_phone: string
  customer_city: string
  courier_code: string
  courier_name: string
  service_code: string
  service_name: string
  tracking_no: string
  store_id: string
  store_name: string
  store_source: string
  scan_time: string
  staff_id: string
  staff_name: string
}

interface ScanItem {
  id: string
  staff_id: string
  staff_name: string
  order_id: string
  order_no: string
  status: string
  sub_status: string
  date_created: string
  date_shipped: string
  customer_id: string
  customer_name: string
  customer_phone: string
  customer_city: string
  courier_code: string
  courier_name: string
  service_code: string
  service_name: string
  tracking_no: string
  created_at: string
  updated_at: string
}

interface BatchDetail {
  id: string
  created_at: string
  updated_at: string
  orders_count: number
  items_count: number
  orders: OrderData[]
  items: ScanItem[]
}

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

// State
const loading = ref(false)
const printing = ref(false)
const batch = ref<BatchDetail | null>(null)
const activeTab = ref<'orders' | 'items'>('orders')

// ─── Fetch batch detail ─────────────────────────────────────────────────────
async function fetchBatchDetail() {
  loading.value = true
  try {
    const batchId = route.params.id as string
    const res = await api.get<{ data: BatchDetail }>(`/sales/orders/scan-delivery/${batchId}`)
    batch.value = res.data
  }
  catch (err: any) {
    console.error('Failed to fetch batch detail:', err)
  }
  finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/sales/order/scan-delivery')
}

// ─── Print batch ────────────────────────────────────────────────────────────
async function handlePrint() {
  if (!batch.value) return
  
  printing.value = true
  try {
    const batchId = route.params.id as string
    const response = await api.post<Blob>(`/sales/orders/scan-delivery/${batchId}/print`, {}, {
      responseType: 'blob'
    })
    
    // Create blob URL from response
    const blob = new Blob([response as BlobPart], { type: 'application/pdf' })
    const blobUrl = URL.createObjectURL(blob)
    
    // Open in new tab
    window.open(blobUrl, '_blank')
    
    // Trigger download
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `scan-delivery-${batch.value.id}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
    
    toast.success('Dokumen berhasil dicetak')
  }
  catch (err: any) {
    console.error('Failed to print batch:', err)
    toast.error('Gagal mencetak dokumen')
  }
  finally {
    printing.value = false
  }
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  fetchBatchDetail()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        @click="goBack"
      >
        <ArrowLeft class="h-5 w-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
          Detail Batch Scan Delivery
        </h1>
        <p class="text-sm text-gray-500">Detail informasi batch dan daftar order</p>
      </div>
      <button
        v-if="batch"
        type="button"
        class="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs border-1 border-gray-300 font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="printing"
        @click="handlePrint"
      >
        <Printer class="h-4 w-4" :class="{ 'animate-pulse': printing }" />
        {{ printing ? 'Memproses...' : 'Print' }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
        <p class="mt-2 text-sm text-gray-500">Memuat data...</p>
      </div>
    </div>

    <template v-else-if="batch">
      <!-- Batch Info Card -->
      <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <Package class="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p class="text-xs text-gray-500">Batch ID</p>
              <p class="font-mono text-xs font-medium text-gray-900 mt-0.5">{{ batch.id }}</p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50">
              <Calendar class="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p class="text-xs text-gray-500">Waktu Dibuat</p>
              <p class="text-sm font-medium text-gray-900 mt-0.5">{{ formatDateTime(batch.created_at) }}</p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
              <Truck class="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p class="text-xs text-gray-500">Jumlah Order</p>
              <p class="text-2xl font-bold text-gray-900 mt-0.5">{{ batch.orders_count }}</p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50">
              <Clock class="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p class="text-xs text-gray-500">Jumlah Scan</p>
              <p class="text-2xl font-bold text-gray-900 mt-0.5">{{ batch.items_count }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div class="border-b border-gray-200">
          <nav class="flex gap-4 px-5" aria-label="Tabs">
            <button
              type="button"
              class="border-b-2 px-1 py-4 text-sm font-medium transition-colors"
              :class="activeTab === 'orders' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'"
              @click="activeTab = 'orders'"
            >
              Orders ({{ batch.orders_count }})
            </button>
            <!-- <button
              type="button"
              class="border-b-2 px-1 py-4 text-sm font-medium transition-colors"
              :class="activeTab === 'items' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'"
              @click="activeTab = 'items'"
            >
              Scan Items ({{ batch.items_count }})
            </button> -->
          </nav>
        </div>

        <!-- Orders Tab -->
        <div v-show="activeTab === 'orders'" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
              <tr>
                <th class="px-4 py-3 text-left">#</th>
                <th class="px-4 py-3 text-left">Waktu Scan</th>
                <th class="px-4 py-3 text-left">Staff</th>
                <th class="px-4 py-3 text-left">No. Order</th>
                <th class="px-4 py-3 text-left">Customer</th>
                <th class="px-4 py-3 text-left">Kurir</th>
                <th class="px-4 py-3 text-left">No. Resi</th>
                <th class="px-4 py-3 text-center">Qty</th>
                <th class="px-4 py-3 text-right">Total</th>
                <th class="px-4 py-3 text-center">COD</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(order, index) in batch.orders"
                :key="order.id"
                class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50"
              >
                <td class="px-4 py-3">
                  <span class="text-gray-500">{{ index + 1 }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs text-gray-900">{{ formatDateTime(order.scan_time) }}</span>
                </td>
                <td class="px-4 py-3"> 
                  <span class="text-xs font-medium text-gray-900">{{ order.staff_name }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs font-medium text-gray-900">{{ order.no }}</span>
                </td>
                <td class="px-4 py-3">
                  <div>
                    <p class="text-xs font-medium text-gray-900">{{ order.customer_name }}</p>
                    <p class="text-xs text-gray-500">{{ order.customer_phone }}</p>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div>
                    <p class="text-xs font-medium text-gray-900">{{ order.courier_name }}</p>
                    <p class="text-xs text-gray-500">{{ order.service_name }}</p>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs text-gray-900">{{ order.tracking_no || '-' }}</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="text-xs font-medium text-gray-900">{{ order.qty }}</span>
                </td>
                <td class="px-4 py-3 text-right">
                  <span class="text-xs font-medium text-gray-900">{{ formatCurrency(order.total) }}</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span 
                    class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1"
                    :class="order.cod === 'yes' 
                      ? 'bg-orange-50 text-orange-700 ring-orange-200' 
                      : 'bg-gray-50 text-gray-700 ring-gray-200'"
                  >
                    {{ order.cod === 'yes' ? 'YA' : 'TIDAK' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Scan Items Tab -->
        <div v-show="activeTab === 'items'" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
              <tr>
                <th class="px-4 py-3 text-left">#</th>
                <th class="px-4 py-3 text-left">Waktu Scan</th>
                <th class="px-4 py-3 text-left">Staff</th>
                <th class="px-4 py-3 text-left">No. Order</th>
                <th class="px-4 py-3 text-left">Customer</th>
                <th class="px-4 py-3 text-left">Kurir</th>
                <th class="px-4 py-3 text-left">No. Resi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in batch.items"
                :key="item.id"
                class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50"
              >
                <td class="px-4 py-3">
                  <span class="text-gray-500">{{ index + 1 }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-sm text-gray-900">{{ formatDateTime(item.created_at) }}</span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <User class="h-4 w-4 text-blue-600" />
                    </div>
                    <span class="text-xs font-medium text-gray-900">{{ item.staff_name }}</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs font-medium text-gray-900">{{ item.order_no }}</span>
                </td>
                <td class="px-4 py-3">
                  <div>
                    <p class="text-xs font-medium text-gray-900">{{ item.customer_name }}</p>
                    <p class="text-xs text-gray-500">{{ item.customer_phone }}</p>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div>
                    <p class="text-xs font-medium text-gray-900">{{ item.courier_name }}</p>
                    <p class="text-xs text-gray-500">{{ item.service_name }}</p>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs text-gray-900">{{ item.tracking_no || '-' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
