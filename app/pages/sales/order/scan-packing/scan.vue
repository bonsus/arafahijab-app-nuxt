<script setup lang="ts">
import {
  ArrowLeft, Package, MapPin, Clock, User, ShoppingBag, CheckCircle,
  AlertCircle, Loader2, Scan, Settings, X, Check,
  Truck, History
} from 'lucide-vue-next'
import { formatDate, formatCurrency } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

interface Variant {
  name: string
  value: string
}

interface OrderItem {
  id: string
  product_id: string
  sku_id: string
  name: string
  sku: string
  variants: Variant[]
  qty: number
  qty_packed: number
  price: number
  subtotal: number
}
interface Shipment {
  id: string
  order_id: string
  tracking_no: string
  courier_name: string
  courier_code: string
  service_name: string
  service_code: string
}
interface Address {
  name: string
  phone: string 
}
interface OrderDetail {
  id: string
  no: string 
  date_created: string
  status: string
  sub_status: string
  total: number
  items: OrderItem[]
  shipment?: Shipment
  address: Address
  customer: Address
}

interface PackedHistory {
  id: string
  order_id: string
  order_item_id: string
  sku_id: string
  sku: string
  product_name: string
  variants: Variant[]
  qty_packed: number
  scan_time: string
  created_at: string
}

const api = useApi()
const toast = useToast()
const router = useRouter()

// State
const loading = ref(false)
const order = ref<OrderDetail | null>(null)
const histories = ref<PackedHistory[]>([])
const scanning = ref(false)
const saveFailed = ref(false)
const saving = ref(false)

// Error modal state
const showErrorModal = ref(false)
const errorMessage = ref('')

// Scanner state
const orderInput = ref('')
const skuInput = ref('')
const scanningOrder = ref(false)

// Settings
const autoSave = ref(true)

// Load autoSave from localStorage on mount
onMounted(() => {
  const savedAutoSave = localStorage.getItem('scan-packing-auto-save')
  if (savedAutoSave !== null) {
    autoSave.value = savedAutoSave === 'true'
  }
  
  // Watch and save autoSave to localStorage
  watch(autoSave, (newValue) => {
    localStorage.setItem('scan-packing-auto-save', String(newValue))
  })
})

// ─── Fetch order detail ─────────────────────────────────────────────────────
async function fetchOrderDetail(orderNo: string) {
  loading.value = true
  try {
    const res = await api.get<{ data: OrderDetail }>(`/sales/orders/${orderNo}`)
    const orderData = res.data

    // Validate status
    if (orderData.status !== 'processing' || orderData.sub_status !== 'packing') {
      throw new Error('Order tidak valid. Status harus "Sedang Dipacking" untuk melakukan scan packing.')
    }

    // Initialize qty_packed if not exists
    orderData.items = orderData.items.map(item => ({
      ...item,
      qty_packed: item.qty_packed || 0
    }))

    // mapping response to local state
    order.value = orderData
    histories.value = []
    toast.success('Order berhasil dimuat')
  }
  catch (err: any) {
    errorMessage.value = err.message || 'Order tidak ditemukan atau status tidak valid'
    showErrorModal.value = true
    order.value = null
  }
  finally {
    loading.value = false
  }
}

// ─── Scanner handlers ───────────────────────────────────────────────────────
async function handleOrderScan() {
  if (!orderInput.value.trim()) return

  const orderNo = orderInput.value.trim()
  scanningOrder.value = true

  try {
    await fetchOrderDetail(orderNo)
    orderInput.value = ''
    
    // Focus to SKU input after order loaded
    nextTick(() => {
      const input = document.querySelector('#sku-input') as HTMLInputElement
      if (input) input.focus()
    })
  }
  catch (err) {
    // Error already handled in fetchOrderDetail
  }
  finally {
    scanningOrder.value = false
  }
}

async function handleSkuScan() {
  if (!skuInput.value.trim() || !order.value) return

  const sku = skuInput.value.trim()
  scanning.value = true

  try {
    // Find the first item by SKU that is not yet fully packed
    const item = order.value.items.find(i => 
      (i.sku === sku || i.sku_id === sku) && i.qty_packed < i.qty
    )

    if (!item) {
      throw new Error('SKU tidak ditemukan atau sudah lengkap dipacking')
    }

    // Update locally
    item.qty_packed += 1

    // Add to history (prepend) with scan_time
    const scanTime = new Date().toISOString()
    const newHistory: PackedHistory = {
      id: `temp_${Date.now()}`,
      order_id: order.value.id,
      order_item_id: item.id,
      sku_id: item.sku_id,
      sku: item.sku,
      product_name: item.name,
      variants: item.variants,
      qty_packed: 1,
      scan_time: scanTime,
      created_at: scanTime
    }
    histories.value.unshift(newHistory)

    toast.success('SKU berhasil discan')
    skuInput.value = ''

    // Check if all items are packed
    const allPacked = order.value.items.every(i => i.qty_packed >= i.qty)
    
    if (allPacked) {
      if (autoSave.value) {
        // Auto save and continue
        await completeOrder()
      } else {
        // Show completion message
        toast.success('Semua item sudah dipacking! Silakan simpan untuk melanjutkan.')
      }
    }

    // Auto-focus back to input after successful scan
    nextTick(() => {
      const input = document.querySelector('#sku-input') as HTMLInputElement
      if (input) input.focus()
    })
  }
  catch (err: any) {
    errorMessage.value = err.message || 'Gagal menyimpan scan. SKU tidak ditemukan atau sudah lengkap.'
    showErrorModal.value = true
  }
  finally {
    scanning.value = false
  }
}

async function completeOrder() {
  if (!order.value) return

  saving.value = true
  saveFailed.value = false
  try {
    // Aggregate scan data by item_id
    const itemMap = new Map<string, { item_id: string; qty: number; scan_time: string }>()
    
    histories.value.forEach(history => {
      const existing = itemMap.get(history.order_item_id)
      if (existing) {
        // Increment qty and update scan_time to the latest
        existing.qty += history.qty_packed
        // Keep the later scan_time (histories are prepended, so earlier in array = later in time)
        if (new Date(history.scan_time) > new Date(existing.scan_time)) {
          existing.scan_time = history.scan_time
        }
      } else {
        itemMap.set(history.order_item_id, {
          item_id: history.order_item_id,
          qty: history.qty_packed,
          scan_time: history.scan_time
        })
      }
    })

    const items = Array.from(itemMap.values())

    // Save scan results
    await api.post('/sales/orders/scan-packing/scan', {
      order_id: order.value.id,
      items
    })
 
    toast.success('Order berhasil diselesaikan dan siap dikirim!')
    
    // Reset for next order
    order.value = null
    histories.value = []
    saveFailed.value = false
    
    // Focus back to order input
    nextTick(() => {
      const input = document.querySelector('#order-input') as HTMLInputElement
      if (input) input.focus()
    })
  }
  catch (err: any) {
    toast.error('Gagal mengupdate status order')
    saveFailed.value = true
  }
  finally {
    saving.value = false
  }
}

function closeErrorModal() {
  showErrorModal.value = false
  errorMessage.value = ''
  
  if (!order.value) {
    orderInput.value = ''
    // Focus back to order input
    nextTick(() => {
      const input = document.querySelector('#order-input') as HTMLInputElement
      if (input) input.focus()
    })
  } else {
    skuInput.value = ''
    // Focus back to sku input
    nextTick(() => {
      const input = document.querySelector('#sku-input') as HTMLInputElement
      if (input) input.focus()
    })
  }
}

function handleOrderKeyPress(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleOrderScan()
  }
}

function handleSkuKeyPress(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleSkuScan()
  }
}

function goBack() {
  router.push('/sales/order/scan-packing')
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  // Auto-focus order input on mount
  nextTick(() => {
    const input = document.querySelector('#order-input') as HTMLInputElement
    if (input) input.focus()
  })
  
  // Listen for escape/enter key globally
  const handleKeydown = (e: KeyboardEvent) => {
    if ((e.key === 'Escape' || e.key === 'Enter') && showErrorModal.value) {
      closeErrorModal()
    }
  }
  document.addEventListener('keydown', handleKeydown)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
})

// ─── Computed ───────────────────────────────────────────────────────────────
const packingProgress = computed(() => {
  if (!order.value || order.value.items.length === 0) return 0
  const totalQty = order.value.items.reduce((sum, item) => sum + item.qty, 0)
  const packedQty = order.value.items.reduce((sum, item) => sum + item.qty_packed, 0)
  return totalQty > 0 ? Math.round((packedQty / totalQty) * 100) : 0
})

const totalQty = computed(() => {
  if (!order.value) return 0
  return order.value.items.reduce((sum, item) => sum + item.qty, 0)
})

const packedQty = computed(() => {
  if (!order.value) return 0
  return order.value.items.reduce((sum, item) => sum + item.qty_packed, 0)
})

const remainingQty = computed(() => {
  return totalQty.value - packedQty.value
})

const totalSKU = computed(() => {
  if (!order.value) return 0
  return order.value.items.length
})

const completedSKU = computed(() => {
  if (!order.value) return 0
  return order.value.items.filter(item => item.qty_packed >= item.qty).length
})

const isAllPacked = computed(() => {
  if (!order.value) return false
  return order.value.items.every(item => item.qty_packed >= item.qty)
})

// Get item progress percentage
function getItemProgress(item: OrderItem) {
  if (item.qty === 0) return 0
  return Math.round((item.qty_packed / item.qty) * 100)
}

// Get item status
function getItemStatus(item: OrderItem) {
  if (item.qty_packed >= item.qty) {
    return { label: 'Selesai', cls: 'bg-green-50 text-green-700 ring-green-200' }
  }
  if (item.qty_packed > 0) {
    return { label: 'Belum lengkap', cls: 'bg-orange-50 text-orange-700 ring-orange-200' }
  }
  return { label: 'Belum discan', cls: 'bg-gray-50 text-gray-600 ring-gray-200' }
}
 
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
          Scan Order - Siap Dikirim
        </h1>
        <p class="text-sm text-gray-500">Scan nomor order dan barcode produk untuk packing</p>
      </div>
      
      <!-- History Button -->
      <!-- <NuxtLink
        to="/sales/order/scan-packing-history"
        class="inline-flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
      >
        <History class="h-4 w-4" />
        History
      </NuxtLink> -->

      <!-- Settings Toggle -->
      <div class="flex items-center gap-3 rounded-lg bg-white px-4 py-2 shadow-sm ring-1 ring-gray-200">
        <Settings class="h-4 w-4 text-gray-400" />
        <label class="flex cursor-pointer items-center gap-2">
          <input
            v-model="autoSave"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
          />
          <span class="text-sm font-medium text-gray-700">Simpan Otomatis</span>
        </label>
      </div>
    </div>

    <!-- Order Scanner Card -->
    <div v-if="!order" class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <div class="border-b border-gray-100 px-6 py-4">
        <h3 class="text-base font-semibold text-gray-900">Scan nomor order / nomor resi</h3>
        <p class="text-xs text-gray-500 mt-0.5">Arahkan scanner ke barcode atau input manual</p>
      </div>
      <div class="p-6">
        <div class="mx-auto"> 
          <div class="space-y-4"> 
            <!-- Scanner Input order -->
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                <Scan class="h-5 w-5 text-primary-500" />
              </div>
              <input
                id="order-input"
                v-model="orderInput"
                type="text"
                placeholder="Input nomor order / nomor resi"
                class="flex-1 rounded-lg border-1 border-gray-300 bg-white px-4 py-3 text-base font-medium focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                :disabled="scanningOrder"
                @keypress="handleOrderKeyPress"
              />
            </div> 
          </div>
        </div>
      </div>
    </div>

    <!-- Order Detail & Packing -->
    <template v-else>
      <div class="space-y-4">
        <!-- Order Info Card -->
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="flex items-center justify-between mb-4">
            <div> 
              <div class="flex items-center gap-2">
                <h3 class="text-2xl font-bold text-gray-900">{{ order.no }}</h3>
                <span class="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                  Sedang dipacking
                </span>
              </div>
            </div>
            
          </div>

          <div class="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div class="flex items-start gap-2">
              <Clock class="h-4 w-4 shrink-0 text-gray-400 mt-1" />
              <div>
                <p class="text-xs text-gray-500">Tanggal Order</p>
                <p class="text-xs font-medium text-gray-900 mt-0.5">{{ formatDateTime(order.date_created) }}</p>
              </div>
            </div>
            
            <div class="flex items-start gap-2">
              <Truck class="h-4 w-4 shrink-0 text-gray-400 mt-1" />
              <div>
                <p class="text-xs text-gray-500">Jasa Kirim</p>
                <p class="text-sm font-medium text-gray-900 mt-0.5">{{ order.shipment?.courier_name || '-' }}</p>
              </div>
            </div>
            
            <div class="flex items-start gap-2">
              <Package class="h-4 w-4 shrink-0 text-gray-400 mt-1" />
              <div>
                <p class="text-xs text-gray-500">No. Resi</p>
                <p class="text-sm font-medium text-gray-900 mt-0.5">{{ order.shipment?.tracking_no || '-' }}</p>
              </div>
            </div>
            
            <div class="flex items-start gap-2">
              <User class="h-4 w-4 shrink-0 text-gray-400 mt-1" />
              <div>
                <p class="text-xs text-gray-500">Penerima</p>
                <p class="text-xs font-medium text-gray-900 mt-0.5">{{ order.address?.name || '-' }} - {{ order.address?.phone || '-' }}</p>
              </div>
            </div>
          </div>

          <!-- Stats Row -->
          <div class="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">             
            <div class="flex-1">
              <div class="flex items-center justify-end gap-2">
                <span class="text-sm text-gray-500">Progress Scan</span>
                <span class="text-sm font-medium text-gray-900">{{ packedQty }} / {{ totalQty }} ({{ packingProgress }}%)</span>
                <Check class="h-4 w-4 text-green-600" v-if="isAllPacked" />
              </div>
              <!-- <p class="text-xs text-gray-500 mb-1">Progress Packing</p>
              <p class="text-4xl font-bold text-gray-900">{{ packingProgress }}%</p> -->
              <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  class="h-2 rounded-full transition-all"
                  :class="packingProgress >= 100 ? 'bg-green-500' : 'bg-orange-500'"
                  :style="{ width: `${packingProgress}%` }"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Scanner Input -->
        <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50">
              <Scan class="h-5 w-5 text-primary-500" />
            </div>
            <input
              id="sku-input"
              v-model="skuInput"
              type="text"
              placeholder="Input SKU / Barcode"
              class="flex-1 rounded-lg border-1 border-gray-300 bg-white px-4 py-2.5 text-sm font-medium focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              :disabled="scanning || showErrorModal"
              @keypress="handleSkuKeyPress"
            />
          </div>
        </div>


        <!-- Complete Button (Manual Save) -->
        <div v-if="isAllPacked && !autoSave && !saveFailed" class="rounded-xl bg-green-50 p-5 shadow-sm ring-1 ring-green-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <CheckCircle class="h-8 w-8 text-green-600" />
              <div>
                <p class="font-semibold text-green-900">Semua item sudah discan!</p>
                <p class="text-sm text-green-700 mt-0.5">Klik tombol simpan untuk menyelesaikan order ini</p>
              </div>
            </div>
            <button
              type="button"
              class="rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="saving"
              @click="completeOrder"
            >
              <span v-if="saving">Menyimpan...</span>
              <span v-else>Simpan & Lanjut Order Berikutnya</span>
            </button>
          </div>
        </div>

        <!-- Save Failed - Manual Save Button -->
        <div v-if="saveFailed" class="rounded-xl bg-red-50 p-5 shadow-sm ring-1 ring-red-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <AlertCircle class="h-8 w-8 text-red-600" />
              <div>
                <p class="font-semibold text-red-900">Gagal menyimpan status order!</p>
                <p class="text-sm text-red-700 mt-0.5">Terjadi kesalahan saat mengupdate status. Silakan coba lagi.</p>
              </div>
            </div>
            <button
              type="button"
              class="rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="saving"
              @click="completeOrder"
            >
              <span v-if="saving">Mencoba lagi...</span>
              <span v-else>Coba Lagi</span>
            </button>
          </div>
        </div>

        <!-- Items Table -->
        <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div class="border-b border-gray-100 px-5 py-3">
            <h3 class="text-sm font-semibold text-gray-900">List Produk (Scan setiap SKU)</h3>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
                <tr>
                  <th class="px-4 py-3 text-left">#</th>
                  <th class="px-4 py-3 text-left">Produk</th>
                  <th class="px-4 py-3 text-center">SKU</th>
                  <th class="px-4 py-3 text-center">Qty Order</th>
                  <th class="px-4 py-3 text-center">Dipack</th>
                  <th class="px-4 py-3 text-center">Sisa</th>
                  <th class="px-4 py-3 text-left">Progress</th>
                  <th class="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in order.items"
                  :key="item.id"
                  class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50"
                >
                  <!-- # -->
                  <td class="px-4 py-3">
                    <span class="text-xs text-gray-500">{{ index + 1 }}</span>
                  </td>

                  <!-- Produk -->
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3"> 
                      <div>
                        <p class="text-xs font-medium text-gray-900">{{ item.name }} - 
                          <span v-if="item.variants && item.variants.length > 0">
                            {{ item.variants.map(v => v.value).join(' / ') }}
                          </span>
                        </p>
                      </div>
                    </div>
                  </td>

                  <!-- SKU -->
                  <td class="px-4 py-3 text-center">
                    <span class="text-xs font-medium text-gray-900">{{ item.sku }}</span>
                  </td>

                  <!-- Qty Order -->
                  <td class="px-4 py-3 text-center">
                    <span class="text-sm font-bold text-gray-900">{{ item.qty }}</span>
                  </td>

                  <!-- Dipack -->
                  <td class="px-4 py-3 text-center">
                    <span
                      class="text-sm font-bold"
                      :class="item.qty_packed >= item.qty ? 'text-green-600' : item.qty_packed > 0 ? 'text-orange-600' : 'text-red-600'"
                    >
                      {{ item.qty_packed }}
                    </span>
                  </td>

                  <!-- Sisa -->
                  <td class="px-4 py-3 text-center">
                    <span class="text-sm font-semibold text-gray-900">
                      {{ Math.max(0, item.qty - item.qty_packed) }}
                    </span>
                  </td>
                  <!-- progress -->
                  <td class="px-4 py-3 w-48">
                    <div class="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        class="h-1.5 rounded-full transition-all"
                        :class="item.qty_packed >= item.qty ? 'bg-green-500' : 'bg-orange-500'"
                        :style="{ width: `${getItemProgress(item)}%` }"
                      />
                    </div> 
                  </td>
                  <!-- Status -->
                  <td class="px-4 py-3">
                    <div class="space-y-1.5">
                      <span
                        :class="getItemStatus(item).cls"
                        class="inline-flex items-center rounded px-2 py-1 text-xs font-medium ring-1"
                      >
                        {{ getItemStatus(item).label }}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </template>

    <!-- Error Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showErrorModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4"
          @click.self="closeErrorModal"
        >
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="showErrorModal"
              class="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
            >
              <!-- Error Icon -->
              <div class="bg-red-50 px-6 pt-8 pb-6 text-center">
                <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 ring-4 ring-red-50">
                  <AlertCircle class="h-8 w-8 text-red-600" />
                </div>
                <h3 class="mt-4 text-lg font-bold text-gray-900">Gagal</h3>
                <p class="mt-2 text-sm text-gray-600">{{ errorMessage }}</p>
                <p class="mt-3 text-xs text-gray-500">Tekan ESC / ENTER atau klik tombol di bawah untuk menutup</p>
              </div>

              <!-- Actions -->
              <div class="bg-gray-50 px-6 py-4">
                <button
                  type="button"
                  class="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  @click="closeErrorModal"
                  autofocus
                >
                  Tutup & Coba Lagi
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
