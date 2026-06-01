<script setup lang="ts">
import { X, Loader2, CheckCircle, AlertCircle, ArrowRight, CheckCheck, Package, PackageCheck, Truck, AlertTriangle, PackageX, Ban, Printer } from 'lucide-vue-next'

interface Props {
  action: string // Pre-determined action key
  orderIds: string[]
  orders?: any[] // Full order objects for validation
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'success'])

const api = useApi()
const toast = useToast()

const processing = ref(false)
const showResult = ref(false)
const results = ref<Record<string, string>>({})
const pickingId = ref<string>('')
const printingLabel = ref(false)
const printingPicking = ref(false)
const useAggregator = ref(false)

// Reset results when modal opens with new orders/action
watch(() => [props.orderIds.join(','), props.action], () => {
  showResult.value = false
  results.value = {}
  processing.value = false
  pickingId.value = ''
  printingLabel.value = false
  printingPicking.value = false
  pickingId.value = ''
  printingLabel.value = false
  printingPicking.value = false
  useAggregator.value = false
}, { immediate: true })

// Define available actions based on order status/substatus
interface StatusAction {
  key: string
  label: string
  description: string
  icon: any
  color: string
  colorClass: string
  targetStatus: string
  targetSubStatus: string
  condition?: (order: any) => boolean // Optional condition check
}

const statusActions: StatusAction[] = [
  // COD Confirmation - only for COD orders with pending status
  {
    key: 'confirm_cod',
    label: 'Konfirmasi COD',
    description: 'Konfirmasi order dengan metode pembayaran COD',
    icon: CheckCheck,
    color: 'yellow',
    colorClass: 'bg-yellow-50 text-yellow-700 ring-yellow-200 hover:bg-yellow-100',
    targetStatus: 'processing',
    targetSubStatus: 'open',
    condition: (order) => order.status === 'pending' && order.cod === 'yes',
  },
  // Start processing - for orders in processing/open
  {
    key: 'start_process',
    label: 'Mulai Proses',
    description: 'Mulai memproses order',
    icon: Package,
    color: 'blue',
    colorClass: 'bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100',
    targetStatus: 'processing',
    targetSubStatus: 'process',
    condition: (order) => order.status === 'processing' && order.substatus === 'open',
  },
  // Start packing - for orders in processing/process
  {
    key: 'start_packing',
    label: 'Mulai Packing',
    description: 'Mulai proses packing order',
    icon: PackageCheck,
    color: 'indigo',
    colorClass: 'bg-indigo-50 text-indigo-700 ring-indigo-200 hover:bg-indigo-100',
    targetStatus: 'processing',
    targetSubStatus: 'packing',
    condition: (order) => order.status === 'processing' && order.substatus === 'process',
  },
  // Ready to ship - for orders in processing/packing
  {
    key: 'ready_ship',
    label: 'Siap Dikirim',
    description: 'Order sudah dipacking dan siap untuk dikirim',
    icon: PackageCheck,
    color: 'green',
    colorClass: 'bg-green-50 text-green-700 ring-green-200 hover:bg-green-100',
    targetStatus: 'processing',
    targetSubStatus: 'ready',
    condition: (order) => order.status === 'processing' && order.substatus === 'packing',
  },
  // Ship order - for orders in processing/ready
  {
    key: 'ship',
    label: 'Kirim Order',
    description: 'Kirim order ke customer',
    icon: Truck,
    color: 'purple',
    colorClass: 'bg-purple-50 text-purple-700 ring-purple-200 hover:bg-purple-100',
    targetStatus: 'shipped',
    targetSubStatus: 'in_delivery',
    condition: (order) => order.status === 'processing' && order.substatus === 'ready',
  },
  // Mark as delayed - for orders in shipped/in_delivery
  {
    key: 'mark_delayed',
    label: 'Tandai Bermasalah',
    description: 'Tandai pengiriman bermasalah atau delay',
    icon: AlertTriangle,
    color: 'orange',
    colorClass: 'bg-orange-50 text-orange-700 ring-orange-200 hover:bg-orange-100',
    targetStatus: 'shipped',
    targetSubStatus: 'delayed',
    condition: (order) => order.status === 'shipped' && order.substatus === 'in_delivery',
  },
  // Mark as delivered - for orders in shipped (in_delivery or delayed)
  {
    key: 'mark_delivered',
    label: 'Tandai Diterima',
    description: 'Order sudah diterima oleh customer',
    icon: CheckCircle,
    color: 'teal',
    colorClass: 'bg-teal-50 text-teal-700 ring-teal-200 hover:bg-teal-100',
    targetStatus: 'shipped',
    targetSubStatus: 'delivered',
    condition: (order) => order.status === 'shipped' && ['in_delivery', 'delayed'].includes(order.substatus),
  },
  // Mark as returning - for orders in shipped (in_delivery or delayed)
  {
    key: 'mark_returning',
    label: 'Dalam Pengembalian',
    description: 'Order sedang dalam proses pengembalian',
    icon: PackageX,
    color: 'red',
    colorClass: 'bg-red-50 text-red-700 ring-red-200 hover:bg-red-100',
    targetStatus: 'shipped',
    targetSubStatus: 'returning',
    condition: (order) => order.status === 'shipped' && ['in_delivery', 'delayed'].includes(order.substatus),
  },
  // Complete order - for orders in shipped/delivered
  {
    key: 'complete',
    label: 'Selesaikan Order',
    description: 'Selesaikan order',
    icon: CheckCircle,
    color: 'green',
    colorClass: 'bg-green-50 text-green-700 ring-green-200 hover:bg-green-100',
    targetStatus: 'completed',
    targetSubStatus: 'completed',
    condition: (order) => order.status === 'shipped' && order.substatus === 'delivered',
  },
  // Cancel order - for pending or early processing orders
  {
    key: 'cancel',
    label: 'Batalkan Order',
    description: 'Batalkan order',
    icon: Ban,
    color: 'red',
    colorClass: 'bg-red-50 text-red-700 ring-red-200 hover:bg-red-100',
    targetStatus: 'canceled',
    targetSubStatus: 'canceled',
    condition: (order) => {
      if (order.status === 'pending') return true
      if (order.status === 'processing' && ['open', 'process', 'packing'].includes(order.substatus)) return true
      return false
    },
  },
]

// Get available actions based on selected orders
const availableActions = computed(() => {
  if (!props.orders || props.orders.length === 0) return []
  
  // Filter actions that are available for ALL selected orders
  return statusActions.filter(action => {
    // Check if this action is applicable to ALL selected orders
    return props.orders?.every(order => {
      const applicableOrder = props.orderIds.includes(order.id)
      if (!applicableOrder) return true // Skip orders not in selection
      return action.condition ? action.condition(order) : true
    })
  })
})

// Get current order statuses for display
const currentOrderStatuses = computed(() => {
  if (!props.orders || props.orders.length === 0) return []
  
  const selectedOrders = props.orders.filter(o => props.orderIds.includes(o.id))
  const statusMap = new Map<string, { status: string; substatus: string; count: number; orders: any[] }>()
  
  selectedOrders.forEach(order => {
    const key = `${order.status}/${order.substatus}`
    const existing = statusMap.get(key)
    if (existing) {
      existing.count++
      existing.orders.push(order)
    } else {
      statusMap.set(key, {
        status: order.status,
        substatus: order.substatus,
        count: 1,
        orders: [order]
      })
    }
  })
  
  return Array.from(statusMap.values())
})

const hasMultipleStatuses = computed(() => currentOrderStatuses.value.length > 1)

const actionInfo = computed(() => {
  return statusActions.find(a => a.key === props.action)
})

const canSubmit = computed(() => {
  return props.action && !processing.value
})

// Show aggregator option only when packing orders that are currently processing/process
const showAggregatorOption = computed(() => actionInfo.value?.key === 'start_process')

// Get list of orders to process with their current status
const ordersToProcess = computed(() => {
  if (!props.orders) return []
  return props.orders
    .filter(o => props.orderIds.includes(o.id))
    .map(order => ({
      id: order.id,
      no: order.no,
      status: order.status,
      substatus: order.sub_status,
      cod: order.cod,
      customer: order.customer,
    }))
})

// Computed results
const successCount = computed(() => {
  return Object.values(results.value).filter(msg => msg === 'success').length
})

const failedCount = computed(() => {
  return props.orderIds.length - successCount.value
})

const resultsWithOrderInfo = computed(() => {
  return Object.entries(results.value).map(([orderId, message]) => {
    const order = props.orders?.find(o => o.id === orderId)
    return {
      orderId,
      orderNo: order?.no || orderId,
      customerName: order?.customer?.name || '-',
      message,
      isSuccess: message === 'success',
    }
  })
})

const successResults = computed(() => resultsWithOrderInfo.value.filter(r => r.isSuccess))
const failedResults = computed(() => resultsWithOrderInfo.value.filter(r => !r.isSuccess))

// Check if should show print buttons
const shouldShowPrintButtons = computed(() => {
  return showResult.value && 
         successCount.value > 0 && 
         actionInfo.value?.key === 'start_process' && 
         pickingId.value !== ''
})

interface UpdateStatusResponse {
  data: {
    picking_id?: string
    result: Record<string, string>
  }
  message: string
}

async function handleSubmit() {
  if (!canSubmit.value || !actionInfo.value) return

  processing.value = true

  try {
    const payload: Record<string, any> = {
      ids: props.orderIds,
      status: actionInfo.value.targetStatus,
      sub_status: actionInfo.value.targetSubStatus,
    }
    if (showAggregatorOption.value) {
      payload.aggregator = useAggregator.value
    }
    const res = await api.post<UpdateStatusResponse>('/sales/orders/update-status', payload)

    results.value = res.data?.result || {}
    pickingId.value = res.data?.picking_id || ''
    showResult.value = true

    // Show toast based on results
    if (successCount.value === props.orderIds.length) {
      toast.success(`${successCount.value} order berhasil diupdate`)
    }
    else if (successCount.value > 0) {
      toast.warning(`${successCount.value} order berhasil, ${failedCount.value} gagal`)
    }
    else {
      toast.error('Semua order gagal diupdate')
    }
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengupdate status order')
  }
  finally {
    processing.value = false
  }
}

function handleClose() {
  if (showResult.value && successCount.value > 0) {
    emit('success')
  }
  emit('close')
}

async function handlePrintLabel() {
  printingLabel.value = true
  try {
    const response = await api.post<Blob>('/sales/orders/print-label', {
      ids: props.orderIds.filter((id) => results.value[id] === 'success'),
    }, {
      responseType: 'blob',
    })

    // Create blob URL from response
    const blob = new Blob([response as BlobPart], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    
    // Open in new tab
    window.open(url, '_blank')
    
    // Download file automatically
    const downloadLink = document.createElement('a')
    downloadLink.href = url
    downloadLink.download = `label-pengiriman-${Date.now()}.pdf`
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
    
    // Clean up the URL after a short delay
    setTimeout(() => {
      window.URL.revokeObjectURL(url)
    }, 100)

    toast.success('Label pengiriman berhasil dicetak')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mencetak label pengiriman')
  }
  finally {
    printingLabel.value = false
  }
}

async function handlePrintPickingList() {
  if (!pickingId.value) return
  
  printingPicking.value = true
  try {
    const response = await api.post<Blob>(`/sales/orders/picking-lists/${pickingId.value}/print`, {}, {
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
    link.download = `picking-list-${pickingId.value}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
    
    toast.success('Picking list berhasil dicetak')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mencetak picking list')
  }
  finally {
    printingPicking.value = false
  }
}

function getColorClass(color: string) {
  const colorMap: Record<string, string> = {
    yellow: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    green: 'bg-green-50 text-green-700 ring-green-200',
    purple: 'bg-purple-50 text-purple-700 ring-purple-200',
    orange: 'bg-orange-50 text-orange-700 ring-orange-200',
    teal: 'bg-teal-50 text-teal-700 ring-teal-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
  }
  return colorMap[color] || 'bg-gray-50 text-gray-700 ring-gray-200'
}

// Status label mappings
const statusLabels: Record<string, string> = {
  pending: 'Pending',
  processing: 'Diproses',
  shipped: 'Dikirim',
  delivered: 'Diterima',
  completed: 'Selesai',
  returned: 'Retur',
  canceled: 'Dibatalkan',
}

const substatusLabels: Record<string, string> = {
  // Pending
  unpaid: 'Belum Dibayar',
  waiting_approval: 'Menunggu Konfirmasi',
  // Processing
  open: 'Belum Diproses',
  process: 'Sedang Diproses',
  packing: 'Sedang Dipacking',
  ready: 'Siap Dikirim',
  // Delivery
  in_delivery: 'Dalam Pengiriman',
  delayed: 'Pengiriman Bermasalah',
  delivered: 'Diterima',
  returning: 'Dikembalikan',
  // Completed
  completed: 'Selesai',
  // Canceled
  canceled: 'Dibatalkan',
}

function getStatusLabel(status: string, substatus: string) {
  const statusLabel = statusLabels[status] || status
  const substatusLabel = substatusLabels[substatus] || substatus
  return `${statusLabel} - ${substatusLabel}`
}
</script>

<template>
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
        v-if="orderIds.length && actionInfo"
        class="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 px-4 pb-4 sm:items-center sm:p-0"
        @click.self="handleClose"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enter-to-class="opacity-100 translate-y-0 sm:scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0 sm:scale-100"
          leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        >
          <div
            v-if="orderIds.length && actionInfo"
            class="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 class="text-lg font-bold text-gray-900">
                  {{ showResult ? 'Hasil Proses' : actionInfo.label }}
                </h2>
                <p class="mt-0.5 text-sm text-gray-500">
                  {{ orderIds.length }} order akan diproses
                </p>
              </div>
              <button
                class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                @click="handleClose"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Body -->
            <div class="max-h-[70vh] overflow-y-auto px-6 py-5">
              <!-- Confirmation View -->
              <div v-if="!showResult" class="space-y-5">
                <!-- Action Info -->
                <div class="flex items-start gap-4 rounded-lg bg-gray-50 p-4">
                  <div
                    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ring-1"
                    :class="getColorClass(actionInfo.color)"
                  >
                    <component :is="actionInfo.icon" class="h-6 w-6" />
                  </div>
                  <div class="flex-1">
                    <p class="text-base font-semibold text-gray-900">{{ actionInfo.label }}</p>
                    <p class="mt-1 text-sm text-gray-600">{{ actionInfo.description }}</p>
                    <div class="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <ArrowRight class="h-3 w-3" />
                      <span
                        class="rounded-full px-2 py-0.5 font-medium ring-1"
                        :class="getColorClass(actionInfo.color)"
                      >
                        {{ getStatusLabel(actionInfo.targetStatus, actionInfo.targetSubStatus) }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Orders List -->
                <div>
                  <p class="mb-3 text-sm font-medium text-gray-700">
                    Daftar Order ({{ ordersToProcess.length }})
                  </p>
                  <div class="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
                    <table class="min-w-full divide-y divide-gray-200">
                      <thead class="sticky top-0 bg-gray-50">
                        <tr>
                          <th class="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Nomor Order
                          </th>
                          <th class="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Pelanggan
                          </th>
                          <th class="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-200 bg-white">
                        <tr
                          v-for="order in ordersToProcess"
                          :key="order.id"
                          class="transition-colors hover:bg-gray-50"
                        >
                          <td class="px-4 py-3 text-sm font-medium text-gray-900">
                            {{ order.no }}
                          </td>
                          <td class="px-4 py-3 text-sm text-gray-700">
                            {{ order.customer?.name || '-' }}
                          </td>
                          <td class="px-4 py-3">
                            <div class="flex items-center gap-2">
                              <span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 ring-1 ring-gray-200">
                                {{ getStatusLabel(order.status, order.substatus) }}
                              </span>
                              <span
                                v-if="order.cod === 'yes'"
                                class="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-bold text-orange-700"
                              >
                                COD
                              </span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Aggregator option (packing) --> 
                <div v-if="showAggregatorOption" class="rounded-lg bg-purple-50 p-4 ring-1 ring-purple-200">
                  <label class="flex cursor-pointer items-start gap-3">
                    <input
                      v-model="useAggregator"
                      type="checkbox"
                      class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <p class="text-sm font-medium text-purple-900">Hubungkan ke Aggregator</p>
                      <p class="mt-0.5 text-xs text-purple-700">
                        Aktifkan untuk membuat pengiriman melalui aggregator (Everpro) saat order diproses.
                      </p>
                    </div>
                  </label>
                </div>

                <!-- Warning for multiple statuses -->
                <div v-if="hasMultipleStatuses" class="rounded-lg bg-orange-50 p-4 ring-1 ring-orange-200">
                  <div class="flex items-start gap-3">
                    <AlertCircle class="h-5 w-5 shrink-0 text-orange-600" />
                    <div>
                      <p class="text-sm font-medium text-orange-900">Perhatian</p>
                      <p class="mt-1 text-xs text-orange-700">
                        Order yang dipilih memiliki status yang berbeda-beda. 
                        Pastikan semua order sesuai untuk aksi ini.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Results View -->
              <div v-else class="space-y-4">
                <!-- Summary -->
                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="rounded-lg bg-green-50 p-4 ring-1 ring-green-200">
                    <div class="flex items-center gap-2">
                      <CheckCircle class="h-5 w-5 text-green-600" />
                      <div>
                        <p class="text-sm font-medium text-green-900">Berhasil</p>
                        <p class="text-2xl font-bold text-green-900">{{ successCount }}</p>
                      </div>
                    </div>
                  </div>
                  <div v-if="failedCount > 0" class="rounded-lg bg-red-50 p-4 ring-1 ring-red-200">
                    <div class="flex items-center gap-2">
                      <AlertCircle class="h-5 w-5 text-red-600" />
                      <div>
                        <p class="text-sm font-medium text-red-900">Gagal</p>
                        <p class="text-2xl font-bold text-red-900">{{ failedCount }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Success List -->
                <div v-if="successResults.length" class="space-y-2">
                  <p class="text-sm font-semibold text-gray-700">Berhasil Diproses:</p>
                  <div class="max-h-48 space-y-2 overflow-y-auto">
                    <div
                      v-for="result in successResults"
                      :key="result.orderId"
                      class="flex items-center gap-3 rounded-lg bg-green-50 p-3 ring-1 ring-green-200"
                    >
                      <CheckCircle class="h-4 w-4 shrink-0 text-green-600" />
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-green-900">{{ result.orderNo }}</p>
                        <p class="text-xs text-green-700">{{ result.customerName }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Failed List -->
                <div v-if="failedResults.length" class="space-y-2">
                  <p class="text-sm font-semibold text-gray-700">Gagal Diproses:</p>
                  <div class="max-h-48 space-y-2 overflow-y-auto">
                    <div
                      v-for="result in failedResults"
                      :key="result.orderId"
                      class="rounded-lg bg-red-50 p-3 ring-1 ring-red-200"
                    >
                      <div class="flex items-start gap-3">
                        <AlertCircle class="h-4 w-4 shrink-0 text-red-600" />
                        <div class="min-w-0 flex-1">
                          <p class="text-sm font-medium text-red-900">{{ result.orderNo }}</p>
                          <p class="text-xs text-red-600">{{ result.customerName }}</p>
                          <p class="mt-1 text-xs text-red-700">{{ result.message }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Print Buttons -->
                <div v-if="shouldShowPrintButtons" class="space-y-2">
                  <p class="text-sm font-semibold text-gray-700">Cetak Dokumen:</p>
                  <div class="flex flex-wrap gap-2">
                    <button
                      type="button"
                      :disabled="printingLabel"
                      class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      @click="handlePrintLabel"
                    >
                      <Loader2 v-if="printingLabel" class="h-4 w-4 animate-spin" />
                      <Printer v-else class="h-4 w-4" />
                      Print Label Pengiriman
                    </button>
                    <button
                      type="button"
                      :disabled="printingPicking"
                      class="flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      @click="handlePrintPickingList"
                    >
                      <Loader2 v-if="printingPicking" class="h-4 w-4 animate-spin" />
                      <Printer v-else class="h-4 w-4" />
                      Print Picking List
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
              <button
                v-if="!showResult"
                type="button"
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                :disabled="processing"
                @click="handleClose"
              >
                Batal
              </button>
              <button
                v-if="!showResult"
                type="button"
                class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
                :disabled="!canSubmit"
                @click="handleSubmit"
              >
                <Loader2 v-if="processing" class="h-4 w-4 animate-spin" />
                <component v-else :is="actionInfo.icon" class="h-4 w-4" />
                {{ processing ? 'Memproses...' : 'Lanjutkan' }}
              </button>
              <button
                v-else
                type="button"
                class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800"
                @click="handleClose"
              >
                Tutup
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
