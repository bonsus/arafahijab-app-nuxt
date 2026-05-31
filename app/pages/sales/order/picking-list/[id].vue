<script setup lang="ts">
import {
  ArrowLeft, Package, MapPin, Loader2, AlertCircle, CheckCircle, ShoppingBag, Layers, Printer, Scan
} from 'lucide-vue-next'
import { formatDate } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

interface Warehouse {
  id: string
  name: string
  address: string
  city: string
  province: string
  district: string
  zipcode: string
}

interface OrderInfo {
  id: string
  no: string
  status: string
  sub_status: string
}

interface Variant {
  name: string
  value: string
}

interface PickingItem {
  id: string
  order_picking_id: string
  order_id: string
  order_item_id: string
  product_id: string
  sku_id: string
  qty: number
  qty_picked: number
  stock_fifo_id: string
  product_name: string
  sku: string
  variants: Variant[]
  zone_id: string
  zone_code: string
  rack_id: string
  rack_code: string
  bin_id: string
  bin_code: string
  orders: OrderInfo[]
}

interface PickingListDetail {
  id: string
  warehouse_id: string
  no: string
  date: string
  status: string
  created_at: string
  updated_at: string
  order_count: number
  product_count: number
  sku_count: number
  qty: number
  qty_picked: number
  items: PickingItem[]
  warehouse: Warehouse
}

const api = useApi()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const loading = ref(true)
const pickingList = ref<PickingListDetail | null>(null)
const printing = ref(false)

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'text-yellow-600 bg-yellow-50 ring-1 ring-yellow-200' },
  in_progress: { label: 'Sedang Proses', cls: 'text-blue-600 bg-blue-50 ring-1 ring-blue-200' },
  completed: { label: 'Selesai', cls: 'text-green-600 bg-green-50 ring-1 ring-green-200' },
}

// ─── Fetch data ─────────────────────────────────────────────────────────────
async function fetchPickingList() {
  loading.value = true
  try {
    const id = route.params.id as string
    const res = await api.get<{ data: PickingListDetail }>(`/sales/orders/picking-lists/${id}`)
    pickingList.value = res.data
  }
  catch (err) {
    toast.error('Terjadi kesalahan saat memuat data picking list')
    pickingList.value = null
  }
  finally {
    loading.value = false
  }
}

// ─── Handlers ──────────────────────────────────────────────────────────────
function goBack() {
  router.push('/sales/order/picking-list')
}

async function printPickingList() {
  if (!pickingList.value) return
  
  printing.value = true
  try {
    const id = route.params.id as string
    const response = await api.post<Blob>(`/sales/orders/picking-lists/${id}/print`, {}, {
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
    link.download = `picking-list-${pickingList.value.no}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
    
    toast.success('Picking list berhasil dicetak')
  }
  catch (err) {
    toast.error('Gagal mencetak picking list')
  }
  finally {
    printing.value = false
  }
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  fetchPickingList()
})

// ─── Computed ───────────────────────────────────────────────────────────────
const progress = computed(() => {
  if (!pickingList.value || pickingList.value.qty === 0) return 0
  return Math.round((pickingList.value.qty_picked / pickingList.value.qty) * 100)
})

// Sort items by location (zone-rack-bin)
const sortedItems = computed(() => {
  if (!pickingList.value?.items) return []
  return [...pickingList.value.items].sort((a, b) => {
    const locA = `${a.zone_code}-${a.rack_code}-${a.bin_code}`
    const locB = `${b.zone_code}-${b.rack_code}-${b.bin_code}`
    return locA.localeCompare(locB)
  })
})
</script>

<template>
  <div class="space-y-5">
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
          {{ loading ? 'Memuat...' : (pickingList?.no || 'Detail Picking List') }}
        </h1>
        <p v-if="pickingList?.warehouse" class="text-sm text-gray-500">{{ pickingList.warehouse.name }}</p>
      </div>
      <div v-if="pickingList" class="flex items-center gap-2">
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          @click="router.push(`/sales/order/picking-list/scan/${pickingList.id}`)"
        >
          <Scan class="h-4 w-4" />
          Mulai Scan
        </button>
        <button
          type="button"
          :disabled="printing"
          class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="printPickingList"
        >
          <Loader2 v-if="printing" class="h-4 w-4 animate-spin" />
          <Printer v-else class="h-4 w-4" />
          Print
        </button>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="space-y-4">
      <div class="grid gap-4 lg:grid-cols-2">
        <div v-for="i in 2" :key="i" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-24 animate-pulse rounded bg-gray-200" />
          <div class="mt-4 space-y-3">
            <div v-for="j in 4" :key="j" class="h-4 w-full animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
      <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div class="border-b border-gray-100 px-5 py-4">
          <div class="h-4 w-28 animate-pulse rounded bg-gray-200" />
        </div>
        <div class="p-5 space-y-3">
          <div v-for="i in 5" :key="i" class="h-12 w-full animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="!pickingList" class="rounded-xl bg-white p-16 shadow-sm ring-1 ring-gray-200 text-center">
      <AlertCircle class="mx-auto h-12 w-12 text-gray-300" />
      <p class="mt-3 text-sm font-medium text-gray-500">Data tidak ditemukan</p>
      <button
        type="button"
        class="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        @click="goBack"
      >
        Kembali ke Daftar
      </button>
    </div>

    <!-- Main Content -->
    <template v-else>
      <div class="space-y-4">
        <!-- Cards Row: 2 Columns -->
        <div class="grid gap-4 lg:grid-cols-2">
          <!-- Info Card -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Informasi</h3>
            <div class="space-y-3">
              <div>
                <p class="text-xs text-gray-500">No. Picking List</p>
                <div class="mt-1 flex items-center gap-2">
                  <Package class="h-4 w-4 text-gray-400" />
                  <p class="text-sm font-semibold text-gray-900">{{ pickingList.no }}</p>
                </div>
              </div>
              <div>
                <p class="text-xs text-gray-500">Status</p>
                <span
                  v-if="statusConfig[pickingList.status]"
                  :class="statusConfig[pickingList.status]?.cls"
                  class="mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1"
                >
                  {{ statusConfig[pickingList.status]?.label }}
                </span>
              </div>
              <div>
                <p class="text-xs text-gray-500">Tanggal Dibuat</p>
                <p class="mt-1 text-sm font-medium text-gray-900">{{ formatDate(pickingList.date) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">Terakhir Diperbarui</p>
                <p class="mt-1 text-sm font-medium text-gray-900">{{ formatDateTime(pickingList.updated_at) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">Warehouse</p>
                <div class="mt-1 flex items-center gap-2">
                  <MapPin class="h-4 w-4 text-gray-400" />
                  <p class="text-sm font-semibold text-gray-900">{{ pickingList.warehouse.name }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Summary & Progress Card -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Ringkasan</h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <ShoppingBag class="h-4 w-4 text-gray-400" />
                  <span class="text-xs text-gray-500">Order</span>
                </div>
                <span class="text-lg font-bold text-gray-900">{{ pickingList.order_count }}</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Package class="h-4 w-4 text-gray-400" />
                  <span class="text-xs text-gray-500">Produk</span>
                </div>
                <span class="text-lg font-bold text-gray-900">{{ pickingList.product_count }}</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Layers class="h-4 w-4 text-gray-400" />
                  <span class="text-xs text-gray-500">SKU</span>
                </div>
                <span class="text-lg font-bold text-gray-900">{{ pickingList.sku_count }}</span>
              </div>
              <!-- qty -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Loader2 class="h-4 w-4 text-gray-400" />
                  <span class="text-xs text-gray-500">Qty to Pick</span>
                </div>
                <span class="text-lg font-bold text-gray-900">{{ pickingList.qty }}</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <CheckCircle class="h-4 w-4 text-gray-400" />
                  <span class="text-xs text-gray-500">Qty Picked</span>
                </div>
                <span class="text-lg font-bold text-gray-900">{{ pickingList.qty_picked }}</span>
              </div> 
              
              <!-- Progress Section -->
              <div class="border-t border-gray-100 pt-4 space-y-3">
                <div class="flex items-end justify-between">
                  <span class="text-2xl font-bold text-gray-900">{{ progress }}%</span>
                  <span class="text-xs text-gray-500">{{ pickingList.qty_picked }} / {{ pickingList.qty }}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-3">
                  <div
                    class="h-3 rounded-full transition-all"
                    :class="progress >= 100 ? 'bg-green-500' : 'bg-blue-500'"
                    :style="{ width: `${progress}%` }"
                  />
                </div>
                <div v-if="progress >= 100" class="flex items-center gap-2 text-green-600">
                  <CheckCircle class="h-4 w-4" />
                  <span class="text-xs font-medium">Picking selesai</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Items Table: Full Width -->
        <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="border-b border-gray-100 px-5 py-4">
              <h2 class="text-lg font-semibold text-gray-900">Daftar Item</h2>
              <p class="text-xs text-gray-500 mt-0.5">{{ sortedItems.length }} item diurutkan berdasarkan lokasi</p>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th class="px-4 py-2.5 text-left">Lokasi</th>
                    <th class="px-4 py-2.5 text-left">Produk</th>
                    <th class="px-4 py-2.5 text-left">Order</th>
                    <th class="px-4 py-2.5 text-center">Qty</th>
                    <th class="px-4 py-2.5 text-center">Picked</th>
                    <th class="px-4 py-2.5 text-center">Progress</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="item in sortedItems"
                    :key="item.id"
                    class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50"
                  >
                    <!-- Lokasi -->
                    <td class="px-4 py-3 align-top">
                      <div class="flex items-start gap-2 min-w-[120px]">
                        <MapPin class="h-3.5 w-3.5 shrink-0 text-gray-400 mt-0.5" />
                        <div>
                          <p class="text-xs font-semibold text-gray-900">
                            {{ item.zone_code }}-{{ item.rack_code }}-{{ item.bin_code }}
                          </p>
                          <p class="text-[10px] text-gray-500">
                            Z:{{ item.zone_code }} R:{{ item.rack_code }} B:{{ item.bin_code }}
                          </p>
                        </div>
                      </div>
                    </td>

                    <!-- Produk -->
                    <td class="px-4 py-3 align-top">
                      <div class="min-w-[240px]">
                        <p class="text-sm font-medium text-gray-900">{{ item.product_name }}</p>
                        <p class="text-xs text-gray-500 mt-0.5">SKU: {{ item.sku }}</p>
                        <div
                          v-if="item.variants && item.variants.length > 0"
                          class="flex flex-wrap gap-1 mt-1.5"
                        >
                          <span
                            v-for="(variant, idx) in item.variants"
                            :key="idx"
                            class="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700"
                          >
                            {{ variant.name }}: {{ variant.value }}
                          </span>
                        </div>
                      </div>
                    </td>

                    <!-- Order -->
                    <td class="px-4 py-3 align-top">
                      <div
                        v-if="item.orders && item.orders.length > 0"
                        class="flex flex-wrap gap-1 min-w-[120px]"
                      >
                        <span
                          v-for="order in item.orders"
                          :key="order.id"
                          class="inline-flex items-center rounded-md bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700 ring-1 ring-primary-200"
                        >
                          {{ order.no }}
                        </span>
                      </div>
                      <span v-else class="text-xs text-gray-300">—</span>
                    </td>

                    <!-- Qty -->
                    <td class="px-4 py-3 text-center align-top">
                      <span class="text-lg font-bold text-gray-900">{{ item.qty }}</span>
                    </td>

                    <!-- Picked -->
                    <td class="px-4 py-3 text-center align-top">
                      <span class="text-sm font-semibold text-gray-900">{{ item.qty_picked }}</span>
                    </td>

                    <!-- Progress -->
                    <td class="px-4 py-3 align-top">
                      <div class="space-y-1 min-w-[100px]">
                        <div class="flex items-center justify-between text-xs">
                          <span
                            class="font-medium"
                            :class="item.qty_picked >= item.qty ? 'text-green-600' : 'text-gray-700'"
                          >
                            {{ item.qty > 0 ? Math.round((item.qty_picked / item.qty) * 100) : 0 }}%
                          </span>
                          <CheckCircle
                            v-if="item.qty_picked >= item.qty"
                            class="h-3.5 w-3.5 text-green-500"
                          />
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            class="h-1.5 rounded-full transition-all"
                            :class="item.qty_picked >= item.qty ? 'bg-green-500' : 'bg-blue-500'"
                            :style="{ width: `${item.qty > 0 ? (item.qty_picked / item.qty) * 100 : 0}%` }"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
      </div>
    </template>
  </div>
</template>
