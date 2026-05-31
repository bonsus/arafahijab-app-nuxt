<script setup lang="ts">
import {
  ArrowLeft, Package, Truck, Clock, User, CheckCircle,
  AlertCircle, Scan, Settings, Check, Save, X, Info
} from 'lucide-vue-next'
import { formatDate, formatCurrency, formatDateTime } from '~/composables/useFormatters'

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
}

interface ScanResponse {
  order: OrderData
  scan_id: string
}

interface ScannedOrder {
  order_id: string
  scan_time: string
  order: OrderData
}

const api = useApi()
const toast = useToast()
const router = useRouter()

// State
const scanning = ref(false)
const saving = ref(false)
const orderInput = ref('')
const scannedOrders = ref<ScannedOrder[]>([])
const currentScanId = ref('')

// Error modal state
const showErrorModal = ref(false)
const errorMessage = ref('')

// Info modal state
const showInfoModal = ref(false)

// Settings
const autoMode = ref(false)

// Load autoMode from localStorage on mount
onMounted(() => {
  const savedAutoMode = localStorage.getItem('scan-delivery-auto-mode')
  if (savedAutoMode !== null) {
    autoMode.value = savedAutoMode === 'true'
  }
  
  // Watch and save autoMode to localStorage
  watch(autoMode, (newValue) => {
    localStorage.setItem('scan-delivery-auto-mode', String(newValue))
  })
  
  // Auto-focus order input
  nextTick(() => {
    const input = document.querySelector('#order-input') as HTMLInputElement
    if (input) input.focus()
  })
  
  // Listen for escape/enter key globally
  const handleKeydown = (e: KeyboardEvent) => {
    if ((e.key === 'Escape' || e.key === 'Enter') && showErrorModal.value) {
      closeErrorModal()
    }
    if (e.key === 'Escape' && showInfoModal.value) {
      closeInfoModal()
    }
  }
  document.addEventListener('keydown', handleKeydown)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
})

// ─── Scanner handler ────────────────────────────────────────────────────────
async function handleOrderScan() {
  if (!orderInput.value.trim()) return

  const orderNo = orderInput.value.trim()
  
  // Check for duplicate scan BEFORE API call (both modes)
  const isDuplicate = scannedOrders.value.some(item => 
    item.order.no === orderNo
  )
  
  if (isDuplicate) {
    errorMessage.value = `Order ${orderNo} sudah discan sebelumnya! (Double Scan)`
    showErrorModal.value = true
    return
  }
  
  scanning.value = true

  try {
    const payload = {
      no: orderNo,
      auto: autoMode.value,
      scan_id: currentScanId.value || undefined
    }

    const res = await api.post<{ data: ScanResponse, message: string }>('/sales/orders/scan-delivery/scan', payload)
    const { order, scan_id } = res.data

    if (autoMode.value) {
      // Auto mode: save immediately and get scan_id for batch
      currentScanId.value = scan_id
      // Also store locally for display
      scannedOrders.value.unshift({
        order_id: order.id,
        scan_time: new Date().toISOString(),
        order: order
      })
      toast.success(res.message || 'Order berhasil discan dan disimpan')
    } else {
      // Manual mode: store locally
      scannedOrders.value.unshift({
        order_id: order.id,
        scan_time: new Date().toISOString(),
        order: order
      })
      toast.success('Order berhasil discan. Klik simpan untuk menyimpan batch')
    }

    orderInput.value = ''
    
    // Auto-focus back to input
    nextTick(() => {
      const input = document.querySelector('#order-input') as HTMLInputElement
      if (input) input.focus()
    })
  }
  catch (err: any) {
    errorMessage.value = err.message || 'Gagal scan order. Order tidak ditemukan atau status tidak valid'
    showErrorModal.value = true
  }
  finally {
    scanning.value = false
  }
}

// ─── Save manual scans ──────────────────────────────────────────────────────
async function saveScannedOrders() {
  if (scannedOrders.value.length === 0) {
    toast.error('Tidak ada order yang discan')
    return
  }

  saving.value = true

  try {
    const payload = {
      orders: scannedOrders.value.map(item => ({
        order_id: item.order_id,
        scan_time: item.scan_time
      }))
    }

    await api.post('/sales/orders/scan-delivery/save', payload)

    toast.success(`${scannedOrders.value.length} order berhasil disimpan!`)
    
    // Reset for new batch
    scannedOrders.value = []
    
    // Focus back to input
    nextTick(() => {
      const input = document.querySelector('#order-input') as HTMLInputElement
      if (input) input.focus()
    })
  }
  catch (err: any) {
    toast.error('Gagal menyimpan batch order')
  }
  finally {
    saving.value = false
  }
}

// ─── Remove order from list ─────────────────────────────────────────────────
function removeOrder(index: number) {
  scannedOrders.value.splice(index, 1)
  toast.success('Order dihapus dari list')
}

// ─── Start new batch ────────────────────────────────────────────────────────
function startNewBatch() {
  if (autoMode.value) {
    currentScanId.value = ''
    scannedOrders.value = []
    toast.success('Batch baru dimulai')
  } else {
    scannedOrders.value = []
    toast.success('List direset untuk batch baru')
  }
  
  nextTick(() => {
    const input = document.querySelector('#order-input') as HTMLInputElement
    if (input) input.focus()
  })
}

// ─── Error modal ────────────────────────────────────────────────────────────
function closeErrorModal() {
  showErrorModal.value = false
  errorMessage.value = ''
  orderInput.value = ''
  
  nextTick(() => {
    const input = document.querySelector('#order-input') as HTMLInputElement
    if (input) input.focus()
  })
}

function handleOrderKeyPress(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleOrderScan()
  }
}

function goBack() {
  // if have history, go back. otherwise, go to main scan page
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/sales/order/scan-delivery')
  }
}

function showModeInfo() {
  showInfoModal.value = true
}

function closeInfoModal() {
  showInfoModal.value = false
}

// Check if mode can be changed
const canChangeMode = computed(() => {
  return scannedOrders.value.length === 0 && !currentScanId.value
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
          Scan Order - Delivery
        </h1>
        <p class="text-sm text-gray-500">Scan nomor order/resi untuk mengubah status menjadi Dikirim</p>
      </div>
      
      <!-- Settings Toggle -->
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-3 justify-end rounded-lg bg-white px-4 py-2 shadow-sm ring-1 ring-gray-200">
          <Settings class="h-4 w-4 text-gray-400" />
          <label class="flex cursor-pointer items-center gap-2">
            <input
              v-model="autoMode"
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!canChangeMode"
            />
            <span class="text-sm font-medium text-gray-700">Mode Auto</span>
          </label>
        </div>
        <button
          type="button"
          class="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100"
          @click="showModeInfo"
        >
          <Info class="h-4 w-4" />
        </button>
      </div>

      <!-- New Batch Button -->
      <button
        type="button"
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        @click="startNewBatch"
      >
        Batch Baru
      </button>
    </div>

    <!-- Scanner Card -->
    <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <div class="border-b border-gray-100 px-6 py-4">
        <h3 class="text-base font-semibold text-gray-900">Scan nomor order / nomor resi</h3>
        <p class="text-xs text-gray-500 mt-0.5">Arahkan scanner ke barcode atau input manual</p>
      </div>
      <div class="p-6">
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
            :disabled="scanning"
            @keypress="handleOrderKeyPress"
          />
        </div>
      </div>
    </div>

    <!-- Manual Mode: Scanned Orders List -->
    <div v-if="!autoMode && scannedOrders.length > 0" class="space-y-4">
      <!-- Save Button -->
      <div class="rounded-xl bg-green-50 p-4 shadow-sm ring-1 ring-green-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <CheckCircle class="h-6 w-6 text-green-600" />
            <div>
              <p class="font-semibold text-green-900">{{ scannedOrders.length }} order siap disimpan</p>
              <p class="text-xs text-green-700 mt-0.5">Klik tombol simpan untuk menyimpan semua order ke server</p>
            </div>
          </div>
          <button
            type="button"
            class="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 flex items-center gap-2"
            :disabled="saving"
            @click="saveScannedOrders"
          >
            <Save class="h-4 w-4" />
            {{ saving ? 'Menyimpan...' : 'Simpan Batch' }}
          </button>
        </div>
      </div>

      <!-- Orders Table -->
      <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div class="border-b border-gray-100 px-5 py-3">
          <h3 class="text-sm font-semibold text-gray-900">Daftar Order ({{ scannedOrders.length }})</h3>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
              <tr>
                <th class="px-4 py-3 text-left">#</th>
                <th class="px-4 py-3 text-left">No. Order</th>
                <th class="px-4 py-3 text-left">Customer</th>
                <th class="px-4 py-3 text-left">Kurir</th>
                <th class="px-4 py-3 text-left">No. Resi</th>
                <th class="px-4 py-3 text-center">Qty</th>
                <th class="px-4 py-3 text-right">Total</th>
                <th class="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in scannedOrders"
                :key="item.order_id"
                class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50"
              >
                <td class="px-4 py-3">
                  <span class="text-gray-500">{{ index + 1 }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="font-medium text-gray-900">{{ item.order.no }}</span>
                </td>
                <td class="px-4 py-3">
                  <div>
                    <p class="text-sm font-medium text-gray-900">{{ item.order.customer_name }}</p>
                    <p class="text-xs text-gray-500">{{ item.order.customer_phone }}</p>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div>
                    <p class="text-sm font-medium text-gray-900">{{ item.order.courier_name }}</p>
                    <p class="text-xs text-gray-500">{{ item.order.service_name }}</p>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="text-sm text-gray-900">{{ item.order.tracking_no || '-' }}</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="text-sm font-medium text-gray-900">{{ item.order.qty }}</span>
                </td>
                <td class="px-4 py-3 text-right">
                  <span class="text-sm font-medium text-gray-900">{{ formatCurrency(item.order.total) }}</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <button
                    type="button"
                    class="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50"
                    @click="removeOrder(index)"
                  >
                    <X class="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Auto Mode: Batch Info -->
    <div v-if="autoMode && currentScanId" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <div class="flex items-center gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
          <Truck class="h-6 w-6 text-green-600" />
        </div>
        <div class="flex-1">
          <p class="font-semibold text-gray-900">Batch sedang berjalan</p>
          <p class="text-xs text-gray-500 mt-0.5">ID: {{ currentScanId }}</p>
        </div>
        <span class="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-green-200">
          <Check class="h-3 w-3 mr-1" />
          Aktif
        </span>
      </div>
    </div>

    <!-- Auto Mode: Scanned Orders List -->
    <div v-if="autoMode && scannedOrders.length > 0" class="space-y-4">
      <!-- Orders Table -->
      <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div class="border-b border-gray-100 px-5 py-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900">Daftar Order Tersimpan ({{ scannedOrders.length }})</h3>
          <span class="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-green-200">
            <Check class="h-3 w-3 mr-1" />
            Tersimpan Otomatis
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
              <tr>
                <th class="px-4 py-3 text-left">#</th>
                <th class="px-4 py-3 text-left">No. Order</th>
                <th class="px-4 py-3 text-left">Customer</th>
                <th class="px-4 py-3 text-left">Kurir</th>
                <th class="px-4 py-3 text-left">No. Resi</th>
                <th class="px-4 py-3 text-center">Qty</th>
                <th class="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in scannedOrders"
                :key="item.order_id"
                class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50"
              >
                <td class="px-4 py-3">
                  <span class="text-gray-500">{{ index + 1 }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="font-medium text-gray-900">{{ item.order.no }}</span>
                </td>
                <td class="px-4 py-3">
                  <div>
                    <p class="text-sm font-medium text-gray-900">{{ item.order.customer_name }}</p>
                    <p class="text-xs text-gray-500">{{ item.order.customer_phone }}</p>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div>
                    <p class="text-sm font-medium text-gray-900">{{ item.order.courier_name }}</p>
                    <p class="text-xs text-gray-500">{{ item.order.service_name }}</p>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="text-sm text-gray-900">{{ item.order.tracking_no || '-' }}</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="text-sm font-medium text-gray-900">{{ item.order.qty }}</span>
                </td>
                <td class="px-4 py-3 text-right">
                  <span class="text-sm font-medium text-gray-900">{{ formatCurrency(item.order.total) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

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

    <!-- Info Modal -->
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
          v-if="showInfoModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4"
          @click.self="closeInfoModal"
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
              v-if="showInfoModal"
              class="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
            >
              <!-- Header -->
              <div class="border-b border-gray-100 px-6 py-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <Info class="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 class="text-lg font-bold text-gray-900">Informasi Mode Scan</h3>
                  </div>
                  <button
                    type="button"
                    class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    @click="closeInfoModal"
                  >
                    <X class="h-5 w-5" />
                  </button>
                </div>
              </div>

              <!-- Content -->
              <div class="px-6 py-5 space-y-4">
                <!-- Mode Auto -->
                <div class="rounded-lg bg-green-50 p-4 ring-1 ring-green-200">
                  <div class="flex items-start gap-3">
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100">
                      <Check class="h-4 w-4 text-green-600" />
                    </div>
                    <div class="flex-1">
                      <h4 class="text-sm font-semibold text-green-900 mb-1">Mode Auto</h4>
                      <p class="text-xs text-green-700 leading-relaxed">
                        Setiap scan akan <strong>langsung disimpan ke server</strong> dalam 1 batch. 
                        Scan ID akan otomatis digunakan untuk scan berikutnya dalam batch yang sama. 
                        Klik tombol <strong>"Batch Baru"</strong> untuk memulai batch baru.
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Mode Manual -->
                <div class="rounded-lg bg-orange-50 p-4 ring-1 ring-orange-200">
                  <div class="flex items-start gap-3">
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100">
                      <Save class="h-4 w-4 text-orange-600" />
                    </div>
                    <div class="flex-1">
                      <h4 class="text-sm font-semibold text-orange-900 mb-1">Mode Manual</h4>
                      <p class="text-xs text-orange-700 leading-relaxed">
                        Order yang discan akan <strong>disimpan lokal terlebih dahulu</strong>. 
                        Anda bisa review list order sebelum menyimpan. 
                        Klik tombol <strong>"Simpan Batch"</strong> untuk menyimpan semua order ke server sekaligus.
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Important Note -->
                <!-- <div class="rounded-lg bg-yellow-50 p-4 ring-1 ring-yellow-200">
                  <div class="flex items-start gap-3">
                    <AlertCircle class="h-5 w-5 shrink-0 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 class="text-sm font-semibold text-yellow-900 mb-1">Penting!</h4>
                      <p class="text-xs text-yellow-700 leading-relaxed">
                        Mode tidak bisa diganti jika sudah ada order yang discan. 
                        Selesaikan batch terlebih dahulu atau klik "Batch Baru" untuk mereset.
                      </p>
                    </div>
                  </div>
                </div> -->
              </div>

              <!-- Footer -->
              <div class="bg-gray-50 px-6 py-4">
                <button
                  type="button"
                  class="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
                  @click="closeInfoModal"
                >
                  Mengerti
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
