<script setup lang="ts">
import {
  Plus, Search, Pencil, Trash2, Star, MapPin, Loader2,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Warehouse {
  id: string
  name: string
  description: string
  country: string
  province: string
  city: string
  district: string
  zipcode: string
  address: string
  primary: boolean
  created_at: string
  updated_at: string
}

interface PaginatedWarehouses {
  data: Warehouse[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

// --- List state ---
const warehouses = ref<Warehouse[]>([])
const loading = ref(true)
const searchQuery = ref('')
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

async function fetchWarehouses() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (searchQuery.value) params.search = searchQuery.value
    const res = await api.get<{ data: PaginatedWarehouses }>('/warehouses/index', params)
    warehouses.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  } catch {
    warehouses.value = []
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchWarehouses()
  }, 300)
}

function onPageChange(p: number) {
  page.value = p
  fetchWarehouses()
}

function onPerPageChange(pp: number) {
  perPage.value = pp
  page.value = 1
  fetchWarehouses()
}

// --- Modal state ---
const showModal = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)

const warehouseForm = reactive({
  name: '',
  description: '',
  country: '',
  province: '',
  city: '',
  district: '',
  postal_code: '',
  address: '',
  primary: false,
})

const address = useAddressSelect(warehouseForm)

function openCreate() {
  editingId.value = null
  warehouseForm.name = ''
  warehouseForm.description = ''
  warehouseForm.country = ''
  warehouseForm.province = ''
  warehouseForm.city = ''
  warehouseForm.district = ''
  warehouseForm.postal_code = ''
  warehouseForm.address = ''
  warehouseForm.primary = false
  address.countries.value = []
  address.provinces.value = []
  address.cities.value = []
  address.districts.value = []
  address.zipcodes.value = []
  showModal.value = true
  address.fetchCountries()
}

async function openEdit(w: Warehouse) {
  editingId.value = w.id
  warehouseForm.name = w.name
  warehouseForm.description = w.description || ''
  warehouseForm.country = w.country
  warehouseForm.province = w.province
  warehouseForm.city = w.city
  warehouseForm.district = w.district
  warehouseForm.postal_code = w.zipcode
  warehouseForm.address = w.address
  warehouseForm.primary = w.primary
  showModal.value = true
  await address.initFromState()
}

async function handleSave() {
  saving.value = true
  try {
    const body = {
      name: warehouseForm.name,
      description: warehouseForm.description,
      country: warehouseForm.country,
      province: warehouseForm.province,
      city: warehouseForm.city,
      district: warehouseForm.district,
      zipcode: warehouseForm.postal_code,
      address: warehouseForm.address,
      primary: warehouseForm.primary,
    }
    if (editingId.value) {
      await api.put(`/warehouses/${editingId.value}`, body)
      toast.success('Gudang berhasil diperbarui')
    } else {
      await api.post('/warehouses/create', body)
      toast.success('Gudang berhasil ditambahkan')
    }
    showModal.value = false
    fetchWarehouses()
  } catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan gudang')
  } finally {
    saving.value = false
  }
}

// --- Delete ---
async function handleDelete(w: Warehouse) {
  const ok = await confirm({
    title: 'Hapus Gudang',
    message: `Yakin ingin menghapus gudang "${w.name}"?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/warehouses/${w.id}`)
    toast.success('Gudang berhasil dihapus')
    fetchWarehouses()
  } catch (err: any) {
    toast.error(err.message || 'Gagal menghapus gudang')
  }
}

// --- Set primary ---
async function handleSetPrimary(w: Warehouse) {
  if (w.primary) return
  try {
    await api.put(`/warehouses/${w.id}/update-primary`)
    toast.success(`"${w.name}" dijadikan gudang utama`)
    fetchWarehouses()
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengubah gudang utama')
  }
}

onMounted(() => fetchWarehouses())
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Gudang</h1>
        <p class="text-sm text-gray-500">Kelola gudang penyimpanan produk Anda.</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" />
        Tambah Gudang
      </button>
    </div>

    <!-- Search -->
    <!-- <div class="relative max-w-sm">
      <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Cari gudang..."
        class="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        @input="onSearch"
      />
    </div> -->

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="animate-pulse rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1 space-y-3">
            <div class="flex items-center gap-2">
              <div class="h-5 w-36 rounded bg-gray-200" />
              <div class="h-5 w-16 rounded-full bg-gray-100" />
            </div>
            <div class="h-4 w-48 rounded bg-gray-100" />
            <div class="flex items-center gap-1.5">
              <div class="h-3.5 w-3.5 rounded bg-gray-100" />
              <div class="h-4 w-64 rounded bg-gray-100" />
            </div>
          </div>
          <div class="flex items-center gap-1">
            <div class="h-8 w-8 rounded-lg bg-gray-100" />
            <div class="h-8 w-8 rounded-lg bg-gray-100" />
            <div class="h-8 w-8 rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="!warehouses.length" class="py-16 text-center text-sm text-gray-400">
      Belum ada gudang.
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="w in warehouses"
        :key="w.id"
        class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md"
      >
        <div class="flex items-start justify-between gap-2 sm:gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-sm font-semibold text-gray-900">{{ w.name }}</h3>
              <span
                v-if="w.primary"
                class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200"
              >
                <Star class="h-3 w-3 fill-amber-500 text-amber-500" />
                Utama
              </span>
            </div>
            <p v-if="w.description" class="mt-1 text-xs text-gray-500">{{ w.description }}</p>
            <div class="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
              <MapPin class="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span>{{ [w.address, w.district, w.city, w.province, w.country, w.zipcode].filter(Boolean).join(', ') }}</span>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-1">
            <button
              v-if="!w.primary"
              type="button"
              class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
              title="Jadikan Utama"
              @click="handleSetPrimary(w)"
            >
              <Star class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title="Edit"
              @click="openEdit(w)"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              v-if="!w.primary"
              type="button"
              class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Hapus"
              @click="handleDelete(w)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <AppPagination
      :page="page"
      :total-page="totalPage"
      :total="total"
      :per-page="perPage"
      :loading="loading"
      :show-per-page="false"
      @update:page="onPageChange"
      @update:per-page="onPerPageChange"
    />

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @mousedown.self="showModal = false">
        <div class="flex w-full max-w-lg flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
          <!-- Header -->
          <div class="shrink-0 border-b border-gray-100 px-6 py-4">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ editingId ? 'Edit Gudang' : 'Tambah Gudang' }}
            </h2>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <div class="space-y-4">
              <!-- Nama -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Gudang <span class="text-red-500">*</span></label>
                <input v-model="warehouseForm.name" type="text" class="form-input" placeholder="Nama gudang" />
              </div>
              <!-- Deskripsi -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Deskripsi</label>
                <textarea v-model="warehouseForm.description" rows="2" class="form-input resize-y" placeholder="Deskripsi gudang" />
              </div>

              <!-- Address fields -->
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Negara <span class="text-red-500">*</span></label>
                  <AppSearchSelect
                    :model-value="warehouseForm.country"
                    :options="address.countries.value"
                    :loading="address.loadingCountries.value"
                    placeholder="Pilih Negara"
                    @update:model-value="address.onCountryChange"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Provinsi <span class="text-red-500">*</span></label>
                  <AppSearchSelect
                    :model-value="warehouseForm.province"
                    :options="address.provinces.value"
                    :loading="address.loadingProvinces.value"
                    :disabled="!warehouseForm.country"
                    placeholder="Pilih Provinsi"
                    @update:model-value="address.onProvinceChange"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Kota <span class="text-red-500">*</span></label>
                  <AppSearchSelect
                    :model-value="warehouseForm.city"
                    :options="address.cities.value"
                    :loading="address.loadingCities.value"
                    :disabled="!warehouseForm.province"
                    placeholder="Pilih Kota"
                    @update:model-value="address.onCityChange"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Kecamatan <span class="text-red-500">*</span></label>
                  <AppSearchSelect
                    :model-value="warehouseForm.district"
                    :options="address.districts.value"
                    :loading="address.loadingDistricts.value"
                    :disabled="!warehouseForm.city"
                    placeholder="Pilih Kecamatan"
                    @update:model-value="address.onDistrictChange"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Kode Pos <span class="text-red-500">*</span></label>
                  <AppSearchSelect
                    :model-value="warehouseForm.postal_code"
                    :options="address.zipcodes.value"
                    :loading="address.loadingZipcodes.value"
                    :disabled="!warehouseForm.district"
                    :allow-custom="true"
                    placeholder="Pilih atau ketik kode pos"
                    @update:model-value="address.onPostalCodeChange"
                  />
                </div>
              </div>

              <!-- Alamat -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Alamat Lengkap <span class="text-red-500">*</span></label>
                <textarea v-model="warehouseForm.address" rows="3" class="form-input resize-y" placeholder="Alamat lengkap gudang" />
              </div>

              <!-- Primary -->
              <!-- <label class="flex items-center gap-2.5">
                <input v-model="warehouseForm.primary" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <span class="text-sm font-medium text-gray-700">Jadikan gudang utama</span>
              </label> -->
            </div>
          </div>

          <!-- Footer -->
          <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              @click="showModal = false"
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="saving || !warehouseForm.name"
              class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleSave"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.form-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
