<script setup lang="ts">
import { Upload, Image as ImageIcon, X } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
})

const api = useApi()
const toast = useToast()

const saving = ref(false)
const logoPreview = ref<string | null>(null)
const showLogoPicker = ref(false)

const form = reactive({
  name: '',
  email: '',
  phone: '',
  mobile: '',
  website: '',
  currency: 'IDR',
  language: 'id',
  timezone: 'Asia/Jakarta',
  country: '',
  province: '',
  city: '',
  district: '',
  address: '',
  postal_code: '',
  logo: '',
})

const address = useAddressSelect(form)

async function fetchSettings() {
  try {
    const res = await api.get<{ data: Record<string, string> }>('/options/general')
    const values = res.data || {}
    Object.keys(form).forEach((key) => {
      if (key in values) {
        ;(form as any)[key] = values[key]
      }
    })
    if (form.logo) {
      logoPreview.value = form.logo
    }
  }
  catch {
    // Settings not found yet — use defaults
  }
}

function onLogoSelect(medias: any[]) {
  if (medias.length) {
    const m = medias[0]
    const url = m.files?.find((f: any) => f.size === 'original')?.file_url || m.files?.[0]?.file_url || ''
    form.logo = url
    logoPreview.value = url
  }
  showLogoPicker.value = false
}

function removeLogo() {
  form.logo = ''
  logoPreview.value = null
}

async function handleSave() {
  saving.value = true

  try {
    await api.put('/options/general', {
      value: { ...form },
    })
    toast.success('Pengaturan berhasil disimpan')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan pengaturan')
  }
  finally {
    saving.value = false
  }
}

onMounted(async () => {
  await fetchSettings()
  address.initFromState()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Pengaturan Umum</h1>
      <button
        type="button"
        :disabled="saving"
        class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleSave"
      >
        {{ saving ? 'Menyimpan...' : 'Simpan' }}
      </button>
    </div>

    <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div class="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-[180px_1fr]">
        <!-- Logo upload -->
        <div class="flex flex-col items-center gap-2">
          <div
            v-if="logoPreview"
            class="group relative h-28 w-28 cursor-pointer overflow-hidden rounded-lg border border-gray-200"
            @click="showLogoPicker = true"
          >
            <img :src="logoPreview" alt="Logo" class="h-full w-full object-cover" />
            <div class="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <span class="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-gray-700">Ganti</span>
            </div>
            <button
              type="button"
              class="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
              @click.stop="removeLogo"
            >
              <X class="h-3 w-3" />
            </button>
          </div>
          <button
            v-else
            type="button"
            class="flex h-28 w-28 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:border-primary-400 hover:text-primary-500"
            @click="showLogoPicker = true"
          >
            <ImageIcon class="h-8 w-8" />
            <span class="text-[10px] font-medium">Pilih Logo</span>
          </button>
        </div>

        <!-- Form fields -->
        <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <!-- Nama -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama</label>
            <input v-model="form.name" type="text" class="form-input" placeholder="Nama bisnis" />
          </div>
          <!-- Email -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
            <input v-model="form.email" type="email" class="form-input" placeholder="email@perusahaan.com" />
          </div>
          <!-- Telp -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Telp.</label>
            <input v-model="form.phone" type="text" class="form-input" placeholder="Nomor telepon" />
          </div>
          <!-- No. Hp -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">No. Hp</label>
            <input v-model="form.mobile" type="text" class="form-input" placeholder="Nomor HP" />
          </div>
          <!-- Situs Web -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Situs Web</label>
            <input v-model="form.website" type="url" class="form-input" placeholder="https://" />
          </div>
          <!-- Mata Uang -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Mata Uang</label>
            <select v-model="form.currency" class="form-input">
              <option value="IDR">IDR - Indonesian Rupiah</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="SGD">SGD - Singapore Dollar</option>
              <option value="MYR">MYR - Malaysian Ringgit</option>
            </select>
          </div>
          <!-- Bahasa -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Bahasa</label>
            <select v-model="form.language" class="form-input">
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
          </div>
          <!-- Zona Waktu -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Zona Waktu</label>
            <select v-model="form.timezone" class="form-input">
              <option value="Asia/Jakarta">(UTC+7) Asia/Jakarta</option>
              <option value="Asia/Makassar">(UTC+8) Asia/Makassar</option>
              <option value="Asia/Jayapura">(UTC+9) Asia/Jayapura</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Alamat -->
    <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 class="mb-5 text-lg font-semibold text-gray-900">Alamat</h2>
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
        </div>
        <!-- Alamat -->
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Alamat</label>
          <textarea v-model="form.address" rows="3" class="form-input resize-y" placeholder="Alamat lengkap" />
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
        </div>
      </div>
    </div>

    <!-- Media Picker Modal -->
    <AppMediaPicker
      v-if="showLogoPicker"
      :selected="[]"
      @select="onLogoSelect"
      @close="showLogoPicker = false"
    />
  </div>
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
