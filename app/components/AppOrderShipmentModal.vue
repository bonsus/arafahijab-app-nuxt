<script setup lang="ts">
import { X, Loader2, Truck } from 'lucide-vue-next'
import type { OrderShipment, SalesOrder } from '~/types'
import type { ShippingService } from '~/components/SalesShippingPicker.vue'

interface Props {
  orderId: string | null
  order: SalesOrder | null
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'success'])

const api = useApi()
const toast = useToast()

const saving = ref(false)
const errors = ref<Record<string, string[]>>({})

const selectedShipping = ref<ShippingService | null>(null)
const trackingNo = ref('')
const note = ref('')

// Computed values for SalesShippingPicker
const district = computed(() => props.order?.address?.district || '')
const zipcode = computed(() => props.order?.address?.zipcode || '')
const totalWeight = computed(() => {
  const items = props.order?.items || []
  return items.reduce((sum, item) => sum + (item.weight * item.qty), 0)
})

watch(
  () => props.order,
  (newOrder) => {
    if (newOrder?.shipment) {
      // Set existing shipment data
      selectedShipping.value = {
        provider: newOrder.shipment.aggregator || '',
        type: 'regular',
        courierName: newOrder.shipment.courier_name,
        courierCode: newOrder.shipment.courier_code,
        serviceName: newOrder.shipment.service_name,
        serviceCode: newOrder.shipment.service_code,
        cod: false,
        price: Number(newOrder.shipment.price) || 0,
        minDuration: 0,
        maxDuration: 0,
      }
      trackingNo.value = newOrder.shipment.tracking_no || ''
      note.value = newOrder.shipment.note || ''
      errors.value = {}
    }
  },
  { immediate: true },
)

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}

async function handleSubmit() {
  if (!props.orderId || !selectedShipping.value) return

  errors.value = {}
  saving.value = true

  try {
    await api.post(`/sales/orders/${props.orderId}/change-shipment`, {
      courier_code: selectedShipping.value.courierCode,
      courier_name: selectedShipping.value.courierName,
      service_code: selectedShipping.value.serviceCode,
      service_name: selectedShipping.value.serviceName,
      tracking_no: trackingNo.value || '',
      note: note.value || '',
      price: selectedShipping.value.price.toString(),
      discount: '0',
      aggregator: selectedShipping.value.provider || '',
    })

    toast.success('Data pengiriman berhasil diperbarui')
    emit('success')
    emit('close')
  }
  catch (err: any) {
    if (err.errors) {
      errors.value = err.errors
    }
    else {
      toast.error(err.message || 'Gagal memperbarui data pengiriman')
    }
  }
  finally {
    saving.value = false
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
        v-if="orderId && order"
        class="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 px-4 pb-4 sm:items-center sm:p-0"
        @click.self="$emit('close')"
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
            v-if="orderId && order"
            class="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div class="flex items-center gap-2">
                <Truck class="h-5 w-5 text-primary-500" />
                <h2 class="text-lg font-bold text-gray-900">Update Data Pengiriman</h2>
              </div>
              <button
                class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                @click="$emit('close')"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Body -->
            <form class="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4" @submit.prevent="handleSubmit">
              <!-- Shipping Service Picker -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">
                  Layanan Pengiriman <span class="text-red-500">*</span>
                </label>
                <SalesShippingPicker
                  v-model="selectedShipping"
                  :district="district"
                  :zipcode="zipcode"
                  :weight="totalWeight"
                />
                <p v-if="errors.courier_code || errors.service_code" class="mt-1 text-xs text-red-600">
                  {{ errors.courier_code?.[0] || errors.service_code?.[0] }}
                </p>
              </div>

              <!-- Tracking Number -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Nomor Resi</label>
                <input
                  v-model="trackingNo"
                  type="text"
                  placeholder="Masukkan nomor resi pengiriman"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <p v-if="errors.tracking_no" class="mt-1 text-xs text-red-600">{{ errors.tracking_no[0] }}</p>
              </div>

              <!-- Note -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan Pengiriman</label>
                <textarea
                  v-model="note"
                  rows="3"
                  placeholder="Catatan khusus untuk pengiriman (opsional)"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <p v-if="errors.note" class="mt-1 text-xs text-red-600">{{ errors.note[0] }}</p>
              </div>

              <!-- Info -->
              <div v-if="selectedShipping" class="rounded-lg bg-blue-50 p-3">
                <div class="space-y-1 text-sm">
                  <div class="flex items-center justify-between">
                    <span class="text-blue-700">Berat Total</span>
                    <span class="font-medium text-blue-900">{{ totalWeight }}g</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-blue-700">Alamat</span>
                    <span class="font-medium text-blue-900">{{ district }}, {{ zipcode }}</span>
                  </div>
                  <div class="flex items-center justify-between border-t border-blue-200 pt-2 mt-2">
                    <span class="font-semibold text-blue-900">Ongkos Kirim</span>
                    <span class="text-lg font-bold text-blue-900">
                      Rp{{ formatCurrency(selectedShipping.price) }}
                    </span>
                  </div>
                </div>
              </div>
            </form>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                :disabled="saving"
                @click="$emit('close')"
              >
                Batal
              </button>
              <button
                type="button"
                class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
                :disabled="saving || !selectedShipping"
                @click="handleSubmit"
              >
                <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
                {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
