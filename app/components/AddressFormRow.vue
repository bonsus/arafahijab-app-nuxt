<script setup lang="ts">
import { Star, Trash2 } from 'lucide-vue-next'

interface AddressRow {
  name: string
  phone: string
  country: string
  province: string
  city: string
  district: string
  postal_code: string
  address: string
  primary: boolean
}

const props = defineProps<{
  index: number
  hideActions?: boolean
}>()

defineEmits<{
  remove: []
  'set-primary': []
}>()

const addr = defineModel<AddressRow>({ required: true })

// Reactive proxy for useAddressSelect: keeps in sync with addr model
const selectState = reactive({
  country: addr.value.country,
  province: addr.value.province,
  city: addr.value.city,
  district: addr.value.district,
  postal_code: addr.value.postal_code,
})

const addressSelect = useAddressSelect(selectState)

// Sync selectState changes (from useAddressSelect) back to addr model
watch(selectState, (s) => {
  addr.value = {
    ...addr.value,
    country: s.country,
    province: s.province,
    city: s.city,
    district: s.district,
    postal_code: s.postal_code,
  }
}, { deep: true })

onMounted(() => {
  if (selectState.country) {
    addressSelect.initFromState()
  } else {
    addressSelect.fetchCountries()
  }
})
</script>

<template>
  <div
    class="rounded-lg border p-4"
    :class="[addr.primary ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-gray-50/50', hideActions ? 'border-0 p-0 bg-transparent' : '']"
  >
    <div v-if="!hideActions" class="mb-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-gray-700">Alamat {{ index + 1 }}</span>
        <span
          v-if="addr.primary"
          class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
        >
          <Star class="h-3 w-3 fill-amber-500 text-amber-500" />
          Utama
        </span>
      </div>
      <div class="flex items-center gap-1">
        <button
          v-if="!addr.primary"
          type="button"
          class="rounded p-1 text-gray-400 hover:bg-amber-50 hover:text-amber-600"
          title="Jadikan Utama"
          @click="$emit('set-primary')"
        >
          <Star class="h-4 w-4" />
        </button>
        <button type="button" class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500" @click="$emit('remove')">
          <Trash2 class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Nama <span class="text-red-500">*</span></label>
        <input v-model="addr.name" type="text" class="form-input text-sm" placeholder="Nama Penerima" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Telepon <span class="text-red-500">*</span></label>
        <input v-model="addr.phone" type="text" class="form-input text-sm" placeholder="08xxxx" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Negara <span class="text-red-500">*</span></label>
        <AppSearchSelect
          :model-value="selectState.country"
          :options="addressSelect.countries.value"
          :loading="addressSelect.loadingCountries.value"
          placeholder="Pilih Negara"
          @update:model-value="addressSelect.onCountryChange"
        />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Provinsi <span class="text-red-500">*</span></label>
        <AppSearchSelect
          :model-value="selectState.province"
          :options="addressSelect.provinces.value"
          :loading="addressSelect.loadingProvinces.value"
          :disabled="!selectState.country"
          placeholder="Pilih Provinsi"
          @update:model-value="addressSelect.onProvinceChange"
        />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Kota <span class="text-red-500">*</span></label>
        <AppSearchSelect
          :model-value="selectState.city"
          :options="addressSelect.cities.value"
          :loading="addressSelect.loadingCities.value"
          :disabled="!selectState.province"
          placeholder="Pilih Kota"
          @update:model-value="addressSelect.onCityChange"
        />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Kecamatan <span class="text-red-500">*</span></label>
        <AppSearchSelect
          :model-value="selectState.district"
          :options="addressSelect.districts.value"
          :loading="addressSelect.loadingDistricts.value"
          :disabled="!selectState.city"
          placeholder="Pilih Kecamatan"
          @update:model-value="addressSelect.onDistrictChange"
        />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Kode Pos <span class="text-red-500">*</span></label>
        <AppSearchSelect
          :model-value="selectState.postal_code"
          :options="addressSelect.zipcodes.value"
          :loading="addressSelect.loadingZipcodes.value"
          :disabled="!selectState.district"
          :allow-custom="true"
          placeholder="Pilih atau ketik kode pos"
          @update:model-value="addressSelect.onPostalCodeChange"
        />
      </div>
    </div>
    <div class="mt-3">
      <label class="mb-1 block text-xs font-medium text-gray-600">Alamat Lengkap <span class="text-red-500">*</span></label>
      <textarea v-model="addr.address" rows="2" class="form-input text-sm" placeholder="Jl. Dago No. 1" />
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.form-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
