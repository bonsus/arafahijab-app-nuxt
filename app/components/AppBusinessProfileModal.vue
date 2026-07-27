<script setup lang="ts">
import { X } from 'lucide-vue-next'
import type { BusinessProfile } from '~/types'

interface Props {
  business: BusinessProfile | null
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'success'])

const api = useApi()
const toast = useToast()

const saving = ref(false)
const errors = ref<Record<string, string[]>>({})

const form = reactive({
  name: '',
  description: '',
  type: 'personal',
  email: '',
  phone: '',
  currency: 'IDR',
  language: 'id',
  timezone: '+7',
  country: '',
  province: '',
  city: '',
  district: '',
  postal_code: '',
  address: '',
})

const address = useAddressSelect(form)

watch(() => props.business, async (biz) => {
  if (biz) {
    form.name = biz.name || ''
    form.description = biz.description || ''
    form.type = biz.type || 'personal'
    form.email = biz.email || ''
    form.phone = biz.phone || ''
    form.currency = biz.currency || 'IDR'
    form.language = biz.language || 'id'
    form.timezone = biz.timezone || '+7'
    form.country = biz.country || ''
    form.province = biz.province || ''
    form.city = biz.city || ''
    form.district = biz.district || ''
    form.postal_code = biz.zipcode || ''
    form.address = biz.address || ''
    errors.value = {}
    await address.initFromState()
  }
}, { immediate: true })

async function handleSubmit() {
  errors.value = {}
  saving.value = true

  try {
    await api.put('/businesses/me', {
      name: form.name,
      description: form.description,
      type: form.type,
      email: form.email,
      phone: form.phone,
      currency: form.currency,
      language: form.language,
      timezone: form.timezone,
      country: form.country,
      province: form.province,
      city: form.city,
      district: form.district,
      zipcode: form.postal_code,
      address: form.address,
    })

    toast.success('Profil bisnis berhasil diperbarui')
    emit('success')
    emit('close')
  }
  catch (err: any) {
    if (err.errors) {
      errors.value = err.errors
    }
    else {
      toast.error(err.message || 'Gagal memperbarui profil bisnis')
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
        v-if="business"
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
            v-if="business"
            class="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 class="text-lg font-bold text-gray-900">Edit Profil Bisnis</h2>
              <button
                class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                @click="$emit('close')"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Body -->
            <form class="max-h-[70vh] overflow-y-auto px-6 py-5" @submit.prevent="handleSubmit">
              <div class="space-y-6">
                <!-- Info umum -->
                <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                  <!-- Nama -->
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-gray-700">
                      Nama Bisnis <span class="text-red-500">*</span>
                    </label>
                    <input v-model="form.name" type="text" required class="form-input" placeholder="Nama bisnis" />
                    <p v-if="errors.name" class="mt-1 text-xs text-red-600">{{ errors.name[0] }}</p>
                  </div>
                  <!-- Tipe -->
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-gray-700">Tipe</label>
                    <select v-model="form.type" class="form-input">
                      <option value="personal">Personal</option>
                      <option value="company">Perusahaan</option>
                    </select>
                    <p v-if="errors.type" class="mt-1 text-xs text-red-600">{{ errors.type[0] }}</p>
                  </div>
                  <!-- Deskripsi -->
                  <div class="sm:col-span-2">
                    <label class="mb-1.5 block text-sm font-medium text-gray-700">Deskripsi</label>
                    <textarea v-model="form.description" rows="2" class="form-input resize-y" placeholder="Deskripsi bisnis" />
                    <p v-if="errors.description" class="mt-1 text-xs text-red-600">{{ errors.description[0] }}</p>
                  </div>
                  <!-- Email -->
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                    <input v-model="form.email" type="email" class="form-input" placeholder="email@perusahaan.com" />
                    <p v-if="errors.email" class="mt-1 text-xs text-red-600">{{ errors.email[0] }}</p>
                  </div>
                  <!-- Telp -->
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-gray-700">Telp.</label>
                    <input v-model="form.phone" type="text" class="form-input" placeholder="Nomor telepon" />
                    <p v-if="errors.phone" class="mt-1 text-xs text-red-600">{{ errors.phone[0] }}</p>
                  </div>
                  <!-- Mata Uang -->
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-gray-700">Mata Uang</label>
                    <select v-model="form.currency" class="form-input">
                      <option value="IDR">IDR - Indonesian Rupiah</option>
                      <!-- <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="SGD">SGD - Singapore Dollar</option>
                      <option value="MYR">MYR - Malaysian Ringgit</option> -->
                    </select>
                  </div>
                  <!-- Bahasa -->
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-gray-700">Bahasa</label>
                    <select v-model="form.language" class="form-input">
                      <option value="id">Bahasa Indonesia</option>
                      <!-- <option value="en">English</option> -->
                    </select>
                  </div>
                  <!-- Zona Waktu -->
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-gray-700">Zona Waktu</label>
                    <select v-model="form.timezone" class="form-input">
                      <option value="+7">(UTC+7) WIB</option>
                      <option value="+8">(UTC+8) WITA</option>
                      <option value="+9">(UTC+9) WIT</option>
                    </select>
                  </div>
                </div>

                <!-- Alamat -->
                <div>
                  <h3 class="mb-4 text-sm font-semibold text-gray-900">Alamat</h3>
                  <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                    <!-- Negara -->
                    <div>
                      <label class="mb-1.5 block text-sm font-medium text-gray-700">Negara</label>
                      <AppSearchSelect
                        :model-value="form.country"
                        :options="address.countries.value"
                        :loading="address.loadingCountries.value"
                        placeholder="Pilih Negara"
                        @update:model-value="address.onCountryChange"
                      />
                      <p v-if="errors.country" class="mt-1 text-xs text-red-600">{{ errors.country[0] }}</p>
                    </div>
                    <!-- Provinsi -->
                    <div>
                      <label class="mb-1.5 block text-sm font-medium text-gray-700">Provinsi</label>
                      <AppSearchSelect
                        :model-value="form.province"
                        :options="address.provinces.value"
                        :loading="address.loadingProvinces.value"
                        :disabled="!form.country"
                        placeholder="Pilih Provinsi"
                        @update:model-value="address.onProvinceChange"
                      />
                      <p v-if="errors.province" class="mt-1 text-xs text-red-600">{{ errors.province[0] }}</p>
                    </div>
                    <!-- Kota/kabupaten -->
                    <div>
                      <label class="mb-1.5 block text-sm font-medium text-gray-700">Kota/kabupaten</label>
                      <AppSearchSelect
                        :model-value="form.city"
                        :options="address.cities.value"
                        :loading="address.loadingCities.value"
                        :disabled="!form.province"
                        placeholder="Pilih Kota"
                        @update:model-value="address.onCityChange"
                      />
                      <p v-if="errors.city" class="mt-1 text-xs text-red-600">{{ errors.city[0] }}</p>
                    </div>
                    <!-- Kecamatan -->
                    <div>
                      <label class="mb-1.5 block text-sm font-medium text-gray-700">Kecamatan</label>
                      <AppSearchSelect
                        :model-value="form.district"
                        :options="address.districts.value"
                        :loading="address.loadingDistricts.value"
                        :disabled="!form.city"
                        placeholder="Pilih Kecamatan"
                        @update:model-value="address.onDistrictChange"
                      />
                      <p v-if="errors.district" class="mt-1 text-xs text-red-600">{{ errors.district[0] }}</p>
                    </div>
                    <!-- Kode Pos -->
                    <div>
                      <label class="mb-1.5 block text-sm font-medium text-gray-700">Kode Pos</label>
                      <AppSearchSelect
                        :model-value="form.postal_code"
                        :options="address.zipcodes.value"
                        :loading="address.loadingZipcodes.value"
                        :disabled="!form.district"
                        :allow-custom="true"
                        placeholder="Pilih atau ketik kode pos"
                        @update:model-value="address.onPostalCodeChange"
                      />
                      <p v-if="errors.zipcode" class="mt-1 text-xs text-red-600">{{ errors.zipcode[0] }}</p>
                    </div>
                    <!-- Alamat -->
                    <div class="sm:col-span-2">
                      <label class="mb-1.5 block text-sm font-medium text-gray-700">Alamat</label>
                      <textarea v-model="form.address" rows="3" class="form-input resize-y" placeholder="Alamat lengkap" />
                      <p v-if="errors.address" class="mt-1 text-xs text-red-600">{{ errors.address[0] }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            <!-- Footer -->
            <div class="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                @click="$emit('close')"
              >
                Batal
              </button>
              <button
                type="button"
                :disabled="saving"
                class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                @click="handleSubmit"
              >
                {{ saving ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.form-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
select.form-input {
  @apply appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%221.5%22%3E%3Cpath%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_8px_center] bg-no-repeat pr-9;
}
</style>
