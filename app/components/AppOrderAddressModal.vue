<script setup lang="ts">
import { X, Loader2, MapPin } from 'lucide-vue-next'
import type { OrderAddress } from '~/types'

interface Props {
  orderId: string | null
  address: OrderAddress | null
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'success'])

const api = useApi()
const toast = useToast()

const saving = ref(false)
const errors = ref<Record<string, string[]>>({})

const form = reactive({
  name: '',
  phone: '',
  country: 'Indonesia',
  province: '',
  city: '',
  district: '',
  address: '',
  zipcode: '',
})

watch(
  () => props.address,
  (newAddress) => {
    if (newAddress) {
      form.name = newAddress.name || ''
      form.phone = newAddress.phone || ''
      form.country = newAddress.country || 'Indonesia'
      form.province = newAddress.province || ''
      form.city = newAddress.city || ''
      form.district = newAddress.district || ''
      form.address = newAddress.address || ''
      form.zipcode = newAddress.zipcode || ''
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
    await api.put(`/sales/orders/${props.orderId}/update-address`, {
      name: form.name,
      phone: form.phone,
      country: form.country,
      province: form.province,
      city: form.city,
      district: form.district,
      address: form.address,
      zipcode: form.zipcode,
    })

    toast.success('Alamat pengiriman berhasil diperbarui')
    emit('success')
    emit('close')
  }
  catch (err: any) {
    if (err.errors) {
      errors.value = err.errors
    }
    else {
      toast.error(err.message || 'Gagal memperbarui alamat pengiriman')
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
        v-if="orderId && address"
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
            v-if="orderId && address"
            class="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div class="flex items-center gap-2">
                <MapPin class="h-5 w-5 text-primary-500" />
                <h2 class="text-lg font-bold text-gray-900">Update Alamat Pengiriman</h2>
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
                <!-- Name -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Nama Penerima <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.name"
                    type="text"
                    required
                    placeholder="Masukkan nama penerima"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="errors.name" class="mt-1 text-xs text-red-600">{{ errors.name[0] }}</p>
                </div>

                <!-- Phone -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Nomor Telepon <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.phone"
                    type="tel"
                    required
                    placeholder="08123456789"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="errors.phone" class="mt-1 text-xs text-red-600">{{ errors.phone[0] }}</p>
                </div>

                <!-- Country -->
                <div class="sm:col-span-2">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Negara <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.country"
                    type="text"
                    required
                    placeholder="Indonesia"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="errors.country" class="mt-1 text-xs text-red-600">{{ errors.country[0] }}</p>
                </div>

                <!-- Province -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Provinsi <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.province"
                    type="text"
                    required
                    placeholder="DKI Jakarta"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="errors.province" class="mt-1 text-xs text-red-600">{{ errors.province[0] }}</p>
                </div>

                <!-- City -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Kota/Kabupaten <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.city"
                    type="text"
                    required
                    placeholder="Jakarta Selatan"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="errors.city" class="mt-1 text-xs text-red-600">{{ errors.city[0] }}</p>
                </div>

                <!-- District -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Kecamatan <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.district"
                    type="text"
                    required
                    placeholder="Kebayoran Baru"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="errors.district" class="mt-1 text-xs text-red-600">{{ errors.district[0] }}</p>
                </div>

                <!-- Zipcode -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Kode Pos <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.zipcode"
                    type="text"
                    required
                    placeholder="12180"
                    maxlength="5"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="errors.zipcode" class="mt-1 text-xs text-red-600">{{ errors.zipcode[0] }}</p>
                </div>

                <!-- Address -->
                <div class="sm:col-span-2">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Alamat Lengkap <span class="text-red-500">*</span>
                  </label>
                  <textarea
                    v-model="form.address"
                    rows="3"
                    required
                    placeholder="Jl. Melati No. 10, RT 05/RW 02"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="errors.address" class="mt-1 text-xs text-red-600">{{ errors.address[0] }}</p>
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
