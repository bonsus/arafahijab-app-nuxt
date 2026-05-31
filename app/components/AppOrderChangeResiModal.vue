<script setup lang="ts">
import { X, Truck, Loader2 } from 'lucide-vue-next'

interface SalesOrder {
  id: string
  no: string
  shipment?: {
    courier_code?: string
    courier_name?: string
    service_name?: string
    tracking_no?: string
    aggregator?: string
  } | null
}

interface Props {
  order: SalesOrder | null
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'success'])

const api = useApi()
const toast = useToast()

const saving = ref(false)
const errors = ref<Record<string, string[]>>({})

const form = reactive({
  tracking_no: '',
  note: '',
})

watch(() => props.order, (newOrder) => {
  if (newOrder) {
    form.tracking_no = newOrder.shipment?.tracking_no || ''
    form.note = ''
    errors.value = {}
  }
})

async function handleSubmit() {
  if (!props.order) return

  errors.value = {}
  saving.value = true

  try {
    await api.post(`/sales/orders/${props.order.id}/change-resi`, {
      tracking_no: form.tracking_no,
      note: form.note,
    })

    toast.success('Nomor resi berhasil diubah')
    emit('success')
    emit('close')
  }
  catch (err: any) {
    if (err.errors) {
      errors.value = err.errors
    }
    else {
      toast.error(err.message || 'Gagal mengubah nomor resi')
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
        v-if="order"
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
            v-if="order"
            class="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 class="text-lg font-bold text-gray-900">Ubah Nomor Resi</h2>
                <p class="mt-0.5 text-sm text-gray-500">Order: {{ order.no }}</p>
              </div>
              <button
                class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                @click="$emit('close')"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Body -->
            <form class="px-6 py-5" @submit.prevent="handleSubmit">
              <div class="space-y-4">
                <!-- Current shipment info -->
                <div v-if="order.shipment?.courier_name" class="rounded-lg bg-gray-50 p-3">
                  <div class="flex items-center gap-2 text-sm text-gray-700">
                    <Truck class="h-4 w-4 shrink-0 text-gray-500" />
                    <span class="font-medium">
                      {{ [order.shipment.courier_name, order.shipment.service_name].filter(Boolean).join(' – ') }}
                    </span>
                  </div>
                  <p v-if="order.shipment.tracking_no" class="mt-1 font-mono text-xs text-gray-500">
                    Resi saat ini: {{ order.shipment.tracking_no }}
                  </p>
                </div>

                <!-- Tracking Number -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Nomor Resi Baru <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.tracking_no"
                    type="text"
                    required
                    placeholder="Masukkan nomor resi"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="errors.tracking_no" class="mt-1 text-xs text-red-600">{{ errors.tracking_no[0] }}</p>
                </div>

                <!-- Note -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Catatan
                  </label>
                  <textarea
                    v-model="form.note"
                    rows="3"
                    placeholder="Catatan perubahan nomor resi (opsional)"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="errors.note" class="mt-1 text-xs text-red-600">{{ errors.note[0] }}</p>
                </div>
              </div>
            </form>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-3">
              <button
                type="button"
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                :disabled="saving"
                @click="$emit('close')"
              >
                Batal
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="saving || !form.tracking_no"
                @click="handleSubmit"
              >
                <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
                Simpan Perubahan
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
