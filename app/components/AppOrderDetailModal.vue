<script setup lang="ts">
import { X, Loader2, FileText } from 'lucide-vue-next'
import type { SalesOrder } from '~/types'

interface Props {
  orderId: string | null
  detail: SalesOrder | null
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'success'])

const api = useApi()
const toast = useToast()

const saving = ref(false)
const errors = ref<Record<string, string[]>>({})

const form = reactive({
  cod: 'no',
  preorder: 'no',
  payment_provider: 'internal',
  payment_method: 'bank_transfer',
  note: '',
  customer_note: '',
  tags: '',
  source: '',
})

const codOptions = [
  { value: 'yes', label: 'Ya (COD)' },
  { value: 'no', label: 'Tidak (Non-COD)' },
]

const preorderOptions = [
  { value: 'yes', label: 'Ya (Preorder)' },
  { value: 'no', label: 'Tidak (Ready Stock)' },
]

const paymentProviderOptions = [
  { value: 'internal', label: 'Transfer Manual' },
  { value: 'midtrans', label: 'Midtrans' },
  { value: 'xendit', label: 'Xendit' },
]

const paymentMethodOptions = [
  { value: 'bank_transfer', label: 'Transfer Bank' },
  { value: 'credit_card', label: 'Kartu Kredit' },
  { value: 'ewallet', label: 'E-Wallet' },
  { value: 'cod', label: 'COD' },
]

const sourceOptions = [
  { value: '', label: 'Tidak ada' },
  { value: 'manual', label: 'Manual' },
  { value: 'tokopedia', label: 'Tokopedia' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'tiktok', label: 'TikTok Shop' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'website', label: 'Website' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'other', label: 'Lainnya' },
]

watch(
  () => props.detail,
  (newDetail) => {
    if (newDetail) {
      form.cod = newDetail.cod || 'no'
      form.preorder = newDetail.preorder || 'no'
      form.payment_provider = newDetail.payment_provider || 'internal'
      form.payment_method = newDetail.payment_method || 'bank_transfer'
      form.note = newDetail.note || ''
      form.customer_note = newDetail.customer_note || ''
      form.tags = newDetail.tags || ''
      form.source = newDetail.source || ''
      errors.value = {}
    }
  },
  { immediate: true },
)

async function handleSubmit() {
  if (!props.orderId) return

  errors.value = {}
  saving.value = true

  try {
    await api.put(`/sales/orders/${props.orderId}/update-detail`, {
      cod: form.cod,
      preorder: form.preorder,
      payment_provider: form.payment_provider,
      payment_method: form.payment_method,
      note: form.note || '',
      customer_note: form.customer_note || '',
      tags: form.tags || '',
      source: form.source || '',
    })

    toast.success('Detail order berhasil diperbarui')
    emit('success')
    emit('close')
  }
  catch (err: any) {
    if (err.errors) {
      errors.value = err.errors
    }
    else {
      toast.error(err.message || 'Gagal memperbarui detail order')
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
        v-if="orderId && detail"
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
            v-if="orderId && detail"
            class="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div class="flex items-center gap-2">
                <FileText class="h-5 w-5 text-primary-500" />
                <h2 class="text-lg font-bold text-gray-900">Update Detail Order</h2>
              </div>
              <button
                class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                @click="$emit('close')"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Body -->
            <form class="max-h-[70vh] overflow-y-auto px-6 py-5" @submit.prevent="handleSubmit">
              <div class="grid gap-4 sm:grid-cols-2">
                <!-- COD -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    COD <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="form.cod"
                    required
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option v-for="opt in codOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                  <p v-if="errors.cod" class="mt-1 text-xs text-red-600">{{ errors.cod[0] }}</p>
                </div>

                <!-- Preorder -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Preorder</label>
                  <select
                    v-model="form.preorder"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option v-for="opt in preorderOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                  <p v-if="errors.preorder" class="mt-1 text-xs text-red-600">{{ errors.preorder[0] }}</p>
                </div>

                <!-- Payment Provider -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Payment Provider <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="form.payment_provider"
                    required
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option v-for="opt in paymentProviderOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                  <p v-if="errors.payment_provider" class="mt-1 text-xs text-red-600">{{ errors.payment_provider[0] }}</p>
                </div>

                <!-- Payment Method -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Metode Pembayaran <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="form.payment_method"
                    required
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option v-for="opt in paymentMethodOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                  <p v-if="errors.payment_method" class="mt-1 text-xs text-red-600">{{ errors.payment_method[0] }}</p>
                </div>

                <!-- Source -->
                <div class="sm:col-span-2">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Sumber Order</label>
                  <select
                    v-model="form.source"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option v-for="opt in sourceOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                  <p v-if="errors.source" class="mt-1 text-xs text-red-600">{{ errors.source[0] }}</p>
                </div>

                <!-- Tags -->
                <div class="sm:col-span-2">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Tags</label>
                  <input
                    v-model="form.tags"
                    type="text"
                    placeholder="important, urgent, vip (pisahkan dengan koma)"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p class="mt-1 text-xs text-gray-500">Pisahkan tags dengan koma</p>
                  <p v-if="errors.tags" class="mt-1 text-xs text-red-600">{{ errors.tags[0] }}</p>
                </div>

                <!-- Internal Note -->
                <div class="sm:col-span-2">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan Internal</label>
                  <textarea
                    v-model="form.note"
                    rows="3"
                    placeholder="Catatan untuk internal tim (tidak terlihat oleh pelanggan)"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="errors.note" class="mt-1 text-xs text-red-600">{{ errors.note[0] }}</p>
                </div>

                <!-- Customer Note -->
                <div class="sm:col-span-2">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan Pelanggan</label>
                  <textarea
                    v-model="form.customer_note"
                    rows="3"
                    placeholder="Catatan dari pelanggan"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="errors.customer_note" class="mt-1 text-xs text-red-600">{{ errors.customer_note[0] }}</p>
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
                :disabled="saving"
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
