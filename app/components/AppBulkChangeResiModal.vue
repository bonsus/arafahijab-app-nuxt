<script setup lang="ts">
import { X, Truck, Loader2 } from 'lucide-vue-next'

interface SalesOrder {
  id: string
  no: string
  customer?: { id: string; name: string; phone: string } | null
  shipment?: {
    courier_code?: string
    courier_name?: string
    service_name?: string
    tracking_no?: string
    aggregator?: string
  } | null
}

interface Props {
  orderIds: string[]
  orders: SalesOrder[]
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'success'])

const api = useApi()
const toast = useToast()

const saving = ref(false)

interface Row {
  order_id: string
  no: string
  customer_name: string
  tracking_no: string
}

const rows = ref<Row[]>([])

const isOpen = computed(() => props.orderIds.length > 0)

watch(() => props.orderIds, (ids) => {
  if (!ids.length) {
    rows.value = []
    return
  }
  rows.value = ids
    .map((id) => {
      const order = props.orders.find(o => o.id === id)
      if (!order) return null
      return {
        order_id: order.id,
        no: order.no,
        customer_name: order.customer?.name || '-',
        tracking_no: order.shipment?.tracking_no || '',
      } as Row
    })
    .filter((r): r is Row => r !== null)
}, { immediate: true })

async function handleSubmit() {
  const payload = rows.value
    .filter(r => r.tracking_no.trim())
    .map(r => ({ order_id: r.order_id, tracking_no: r.tracking_no.trim() }))

  if (!payload.length) {
    toast.error('Isi minimal satu nomor resi')
    return
  }

  saving.value = true
  try {
    await api.post('/sales/orders/change-resi-mass', payload)
    toast.success('Nomor resi berhasil diubah')
    emit('success')
    emit('close')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengubah nomor resi')
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
        v-if="isOpen"
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
            v-if="isOpen"
            class="relative flex max-h-[85vh] w-full max-w-2xl transform flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
          >
            <!-- Header -->
            <div class="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 class="text-lg font-bold text-gray-900">Ubah Resi Massal</h2>
                <p class="mt-0.5 text-sm text-gray-500">{{ rows.length }} order dipilih</p>
              </div>
              <button
                class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                @click="$emit('close')"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto px-6 py-4">
              <table class="w-full text-sm">
                <thead class="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th class="pb-2 pr-3 text-left">Nomor Order</th>
                    <th class="pb-2 pr-3 text-left">Pelanggan</th>
                    <th class="pb-2 text-left">Nomor Resi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in rows"
                    :key="row.order_id"
                    class="border-b border-gray-100 last:border-b-0"
                  >
                    <td class="py-2.5 pr-3 align-top">
                      <span class="font-semibold text-primary-600">{{ row.no }}</span>
                    </td>
                    <td class="py-2.5 pr-3 align-top text-gray-700">
                      {{ row.customer_name }}
                    </td>
                    <td class="py-2.5 align-top">
                      <div class="relative">
                        <Truck class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        <input
                          v-model="row.tracking_no"
                          type="text"
                          placeholder="Masukkan nomor resi"
                          class="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Footer -->
            <div class="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-3">
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
                :disabled="saving"
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
