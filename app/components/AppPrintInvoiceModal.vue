<script setup lang="ts">
import { X, Loader2, FileText, CheckCircle, AlertCircle } from 'lucide-vue-next'

interface Props {
  orderIds: string[]
  orders?: any[]
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'success'])

const api = useApi()
const toast = useToast()

const processing = ref(false)

// Get list of orders to print
const ordersToPrint = computed(() => {
  if (!props.orders) return []
  return props.orders
    .filter(o => props.orderIds.includes(o.id))
    .map(order => ({
      id: order.id,
      no: order.no,
      customer: order.customer,
      total: order.total,
    }))
})

async function handlePrint() {
  processing.value = true

  try {
    const response = await api.post<Blob>('/sales/orders/print-invoice', {
      ids: props.orderIds,
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
    downloadLink.download = `invoice-${Date.now()}.pdf`
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
    
    // Clean up the URL after a short delay
    setTimeout(() => {
      window.URL.revokeObjectURL(url)
    }, 100)

    toast.success(`Invoice untuk ${props.orderIds.length} order berhasil dicetak`)
    emit('success')
    emit('close')
  }
  catch (err: any) {
    // Handle different error scenarios
    let errorMessage = 'Gagal mencetak invoice'
    
    if (err.message) {
      errorMessage = err.message
    }
    else if (err.statusCode === 422) {
      errorMessage = err.message || 'Data order tidak valid atau tidak ditemukan'
    }
    else if (err.statusCode === 404) {
      errorMessage = 'Order tidak ditemukan'
    }
    else if (err.statusCode >= 500) {
      errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi.'
    }
    
    toast.error(errorMessage)
  }
  finally {
    processing.value = false
  }
}

function handleClose() {
  if (!processing.value) {
    emit('close')
  }
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
        v-if="orderIds.length"
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
            v-if="orderIds.length"
            class="relative w-full max-w-xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 class="text-lg font-bold text-gray-900">
                  Cetak Invoice
                </h2>
                <p class="mt-0.5 text-sm text-gray-500">
                  {{ orderIds.length }} order akan dicetak
                </p>
              </div>
              <button
                class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                :disabled="processing"
                @click="handleClose"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Body -->
            <div class="max-h-[60vh] overflow-y-auto px-6 py-5">
              <div class="space-y-4">
                <!-- Info -->
                <div class="flex items-start gap-3 rounded-lg bg-blue-50 p-4 ring-1 ring-blue-200">
                  <FileText class="h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <p class="text-sm font-medium text-blue-900">
                      Invoice akan dicetak dalam format PDF
                    </p>
                    <p class="mt-1 text-xs text-blue-700">
                      PDF akan terbuka di tab baru dan otomatis ter-download
                    </p>
                  </div>
                </div>

                <!-- Orders List -->
                <div>
                  <p class="mb-3 text-sm font-medium text-gray-700">
                    Daftar Order ({{ ordersToPrint.length }})
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
                          <th class="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-200 bg-white">
                        <tr
                          v-for="order in ordersToPrint"
                          :key="order.id"
                          class="transition-colors hover:bg-gray-50"
                        >
                          <td class="px-4 py-3 text-sm font-medium text-gray-900">
                            {{ order.no }}
                          </td>
                          <td class="px-4 py-3 text-sm text-gray-700">
                            {{ order.customer?.name || '-' }}
                          </td>
                          <td class="px-4 py-3 text-right text-sm text-gray-900">
                            {{ order.total }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                :disabled="processing"
                @click="handleClose"
              >
                Batal
              </button>
              <button
                type="button"
                class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                :disabled="processing"
                @click="handlePrint"
              >
                <Loader2 v-if="processing" class="h-4 w-4 animate-spin" />
                <FileText v-else class="h-4 w-4" />
                {{ processing ? 'Mencetak...' : 'Cetak Invoice' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
