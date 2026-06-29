<script setup lang="ts">
import { Search, X, Loader2, User, MapPin, ArrowLeft, Plus, Edit2, Check, UserPlus } from 'lucide-vue-next'

export interface SalesCustomer {
  id: string
  name: string
  phone: string
  email: string
  category: { id: string; name: string } | null
  addresses: SalesCustomerAddress[]
  status: string
}

export interface SalesCustomerAddress {
  id: string
  name: string
  phone: string
  country: string
  province: string
  city: string
  district: string
  address: string
  zipcode: string
  primary: boolean
}

const props = defineProps<{
  modelValue: boolean
  initialCustomer?: SalesCustomer | null
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  'select': [customer: SalesCustomer, address: SalesCustomerAddress]
}>()

const api = useApi()
const toast = useToast()

// ─── View machine ─────────────────────────────────────────────────────────────
type View = 'search' | 'create_customer' | 'address_list' | 'address_form'
const view = ref<View>('search')
const openedForAddressOnly = ref(false)

// ─── Search state ─────────────────────────────────────────────────────────────
const query = ref('')
const loading = ref(false)
const results = ref<SalesCustomer[]>([])
let debounceTimer: ReturnType<typeof setTimeout>

// ─── Customer + address state ─────────────────────────────────────────────────
const selectedCustomer = ref<SalesCustomer | null>(null)
const addresses = ref<SalesCustomerAddress[]>([])
const loadingAddresses = ref(false)
const highlightedAddressId = ref<string | null>(null)

// ─── Create customer form ─────────────────────────────────────────────────────
const custForm = reactive({
  name: '', phone: '', email: '',
  country: 'Indonesia', province: '', city: '', district: '', postal_code: '', address: '',
})
const custErrors = ref<Record<string, string[]>>({})
const savingCust = ref(false)
const custAddr = useAddressSelect(custForm)

// ─── Address form (create / edit) ─────────────────────────────────────────────
const addrForm = reactive({
  name: '', phone: '',
  country: 'Indonesia', province: '', city: '', district: '', postal_code: '', address: '',
})
const addrErrors = ref<Record<string, string[]>>({})
const savingAddr = ref(false)
const editingAddressId = ref<string | null>(null)
const addrSelect = useAddressSelect(addrForm)

// ─── Lifecycle ────────────────────────────────────────────────────────────────
watch(() => props.modelValue, async (open) => {
  if (open) {
    openedForAddressOnly.value = !!props.initialCustomer
    if (props.initialCustomer) {
      selectedCustomer.value = props.initialCustomer
      view.value = 'address_list'
      await loadAddresses(props.initialCustomer.id)
    }
    else {
      view.value = 'search'
      selectedCustomer.value = null
      query.value = ''
      results.value = []
    }
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function close() {
  emit('update:modelValue', false)
}

function goBack() {
  if (view.value === 'create_customer') {
    view.value = 'search'
  }
  else if (view.value === 'address_list') {
    if (openedForAddressOnly.value) {
      close()
    }
    else {
      view.value = 'search'
      selectedCustomer.value = null
    }
  }
  else if (view.value === 'address_form') {
    view.value = 'address_list'
  }
}

const viewTitle = computed(() => {
  if (view.value === 'search') return 'Pilih Pelanggan'
  if (view.value === 'create_customer') return 'Tambah Pelanggan Baru'
  if (view.value === 'address_list') return 'Alamat Pengiriman'
  return editingAddressId.value ? 'Ubah Alamat' : 'Tambah Alamat Baru'
})

// ─── Search ───────────────────────────────────────────────────────────────────
function onSearch() {
  clearTimeout(debounceTimer)
  if (query.value.length < 2) { results.value = []; return }
  debounceTimer = setTimeout(fetchCustomers, 300)
}

async function fetchCustomers() {
  loading.value = true
  try {
    const res = await api.get<{ data: any }>('/customers/public/index', {
      type: 'customer', search: query.value, per_page: '30',
    })
    results.value = (res.data?.data || res.data || []) as SalesCustomer[]
  }
  catch { results.value = [] }
  finally { loading.value = false }
}

async function selectCustomerFromSearch(customer: SalesCustomer) {
  selectedCustomer.value = customer
  view.value = 'address_list'
  await loadAddresses(customer.id)
}

// ─── Addresses ────────────────────────────────────────────────────────────────
async function loadAddresses(customerId: string) {
  loadingAddresses.value = true
  highlightedAddressId.value = null
  try {
    const res = await api.get<{ data: any }>(`/customers/public/${customerId}/addresses`)
    addresses.value = (res.data || []) as SalesCustomerAddress[]
    const primary = addresses.value.find(a => a.primary)
    highlightedAddressId.value = (primary || addresses.value[0])?.id || null
  }
  catch { addresses.value = [] }
  finally { loadingAddresses.value = false }
}

function confirmSelectAddress() {
  if (!selectedCustomer.value || !highlightedAddressId.value) return
  const addr = addresses.value.find(a => a.id === highlightedAddressId.value)
  if (!addr) return
  emit('select', selectedCustomer.value, addr)
  close()
}

// ─── Create customer ──────────────────────────────────────────────────────────
function openCreateCustomer() {
  Object.assign(custForm, {
    name: '', phone: '', email: '',
    country: 'Indonesia', province: '', city: '', district: '', postal_code: '', address: '',
  })
  custErrors.value = {}
  view.value = 'create_customer'
  custAddr.fetchProvinces()
}

async function submitCreateCustomer() {
  custErrors.value = {}
  savingCust.value = true
  try {
    const res = await api.post<{ data: any }>('/customers/public/create', {
      name: custForm.name,
      phone: custForm.phone,
      email: custForm.email,
      province: custForm.province,
      city: custForm.city,
      district: custForm.district,
      zipcode: custForm.postal_code,
      address: custForm.address,
    } as Record<string, string>)
    
    // Map response ke SalesCustomer dengan category dari API
    const newCustomer: SalesCustomer = {
      id: res.data.id,
      name: res.data.name,
      phone: res.data.phone || '',
      email: res.data.email || '',
      category: res.data.customer_category || res.data.category || null,
      addresses: [],
      status: res.data.status || '',
    }
    selectedCustomer.value = newCustomer
    
    // Load addresses untuk customer baru
    await loadAddresses(newCustomer.id)
    
    toast.success('Pelanggan baru berhasil dibuat')
    
    // Otomatis pilih alamat pertama yang baru dibuat dan kembali ke form
    if (addresses.value.length > 0) {
      const firstAddress = addresses.value[0]
      if (firstAddress) {
        emit('select', newCustomer, firstAddress)
        close()
        return
      }
    }
    
    // Jika tidak ada alamat (edge case), tampilkan address list
    view.value = 'address_list'
  }
  catch (err: any) {
    if (err.errors) custErrors.value = err.errors
    else toast.error(err.message || 'Gagal membuat pelanggan')
  }
  finally { savingCust.value = false }
}

// ─── Create / Edit address ────────────────────────────────────────────────────
function openCreateAddress() {
  editingAddressId.value = null
  Object.assign(addrForm, {
    name: '', phone: '',
    country: 'Indonesia', province: '', city: '', district: '', postal_code: '', address: '',
  })
  addrErrors.value = {}
  view.value = 'address_form'
  addrSelect.fetchProvinces()
}

function openEditAddress(addr: SalesCustomerAddress) {
  editingAddressId.value = addr.id
  Object.assign(addrForm, {
    name: addr.name,
    phone: addr.phone,
    country: addr.country || 'Indonesia',
    province: addr.province,
    city: addr.city,
    district: addr.district,
    postal_code: addr.zipcode,
    address: addr.address,
  })
  addrErrors.value = {}
  view.value = 'address_form'
  addrSelect.initFromState()
}

async function submitAddressForm() {
  addrErrors.value = {}
  savingAddr.value = true
  try {
    const wasFirstAddress = addresses.value.length === 0
    
    if (editingAddressId.value) {
      await api.put(`/customers/public/addresses/${editingAddressId.value}`, {
        name: addrForm.name,
        phone: addrForm.phone,
        province: addrForm.province,
        city: addrForm.city,
        district: addrForm.district,
        zipcode: addrForm.postal_code,
        address: addrForm.address,
      })
      toast.success('Alamat berhasil diperbarui')
    }
    else {
      await api.post('/customers/public/addresses/create', {
        customer_id: selectedCustomer.value!.id,
        name: addrForm.name,
        phone: addrForm.phone,
        province: addrForm.province,
        city: addrForm.city,
        district: addrForm.district,
        zipcode: addrForm.postal_code,
        address: addrForm.address,
      } as Record<string, string>)
      toast.success('Alamat baru berhasil ditambahkan')
    }
    
    await loadAddresses(selectedCustomer.value!.id)
    
    // Jika ini alamat pertama (customer baru), otomatis pilih dan kembali ke form
    if (wasFirstAddress && addresses.value.length > 0 && selectedCustomer.value) {
      const newAddress = addresses.value[0]
      if (newAddress) {
        emit('select', selectedCustomer.value, newAddress)
        close()
        return
      }
    }
    
    view.value = 'address_list'
  }
  catch (err: any) {
    if (err.errors) addrErrors.value = err.errors
    else toast.error(err.message || 'Gagal menyimpan alamat')
  }
  finally { savingAddr.value = false }
}

function getCustError(key: string) { return custErrors.value[key]?.[0] }
function getAddrError(key: string) { return addrErrors.value[key]?.[0] }
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
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        @click.self="close"
      >
        <div class="flex w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl" style="max-height: 90vh" @click.stop>

          <!-- Header -->
          <div class="flex shrink-0 items-center gap-2 border-b border-gray-100 px-4 py-3">
            <button
              v-if="view !== 'search'"
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              @click="goBack"
            >
              <ArrowLeft class="h-4 w-4" />
            </button>
            <h3 class="flex-1 text-sm font-semibold text-gray-900">{{ viewTitle }}</h3>
            <button
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              @click="close"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Body -->
          <div class="min-h-0 flex-1 overflow-y-auto">

            <!-- ── VIEW: search ─────────────────────────────────────────── -->
            <div v-if="view === 'search'" class="flex flex-col p-4">
              <!-- Search input -->
              <div class="relative mb-3">
                <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  v-model="query"
                  type="text"
                  placeholder="Cari nama, telepon, atau email..."
                  class="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  @input="onSearch"
                />
              </div>

              <!-- Results -->
              <div v-if="loading" class="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
                <Loader2 class="h-4 w-4 animate-spin" /> Mencari...
              </div>

              <div v-else-if="query.length >= 2 && !results.length" class="py-8 text-center text-sm text-gray-400">
                Tidak ada pelanggan ditemukan
              </div>

              <div v-else-if="results.length" class="space-y-1">
                <button
                  v-for="customer in results"
                  :key="customer.id"
                  class="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-primary-50"
                  @click="selectCustomerFromSearch(customer)"
                >
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100">
                    <User class="h-4 w-4 text-primary-600" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-gray-900">{{ customer.name }}</p>
                    <div class="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                      <span v-if="customer.phone">{{ customer.phone }}</span>
                      <span v-if="customer.email" class="truncate">{{ customer.email }}</span>
                      <span v-if="customer.category" class="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-700">
                        {{ customer.category.name }}
                      </span>
                    </div>
                  </div>
                </button>
              </div>

              <div v-else class="py-8 text-center text-sm text-gray-400">
                Ketik minimal 2 karakter untuk mencari
              </div>

              <!-- Divider + create new -->
              <div class="mt-4 border-t border-gray-100 pt-4">
                <button
                  class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary-200 py-3 text-sm font-medium text-primary-600 transition-colors hover:border-primary-400 hover:bg-primary-50"
                  @click="openCreateCustomer"
                >
                  <UserPlus class="h-4 w-4" />
                  Tambah Pelanggan Baru
                </button>
              </div>
            </div>

            <!-- ── VIEW: create_customer ────────────────────────────────── -->
            <div v-else-if="view === 'create_customer'" class="space-y-3 p-4">
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Nama <span class="text-red-500">*</span></label>
                <input v-model="custForm.name" type="text" class="form-input" placeholder="Nama lengkap pelanggan" />
                <p v-if="getCustError('name')" class="mt-1 text-xs text-red-600">{{ getCustError('name') }}</p>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600">No. Telepon</label>
                  <input v-model="custForm.phone" type="text" class="form-input" placeholder="08xxx" />
                  <p v-if="getCustError('phone')" class="mt-1 text-xs text-red-600">{{ getCustError('phone') }}</p>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600">Email</label>
                  <input v-model="custForm.email" type="email" class="form-input" placeholder="email@domain.com" />
                  <p v-if="getCustError('email')" class="mt-1 text-xs text-red-600">{{ getCustError('email') }}</p>
                </div>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Provinsi <span class="text-red-500">*</span></label>
                <AppSearchSelect
                  :model-value="custForm.province"
                  :options="custAddr.provinces.value"
                  :loading="custAddr.loadingProvinces.value"
                  placeholder="Pilih Provinsi"
                  @update:model-value="custAddr.onProvinceChange"
                />
                <p v-if="getCustError('province')" class="mt-1 text-xs text-red-600">{{ getCustError('province') }}</p>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Kota <span class="text-red-500">*</span></label>
                <AppSearchSelect
                  :model-value="custForm.city"
                  :options="custAddr.cities.value"
                  :loading="custAddr.loadingCities.value"
                  :disabled="!custForm.province"
                  placeholder="Pilih Kota"
                  @update:model-value="custAddr.onCityChange"
                />
                <p v-if="getCustError('city')" class="mt-1 text-xs text-red-600">{{ getCustError('city') }}</p>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600">Kecamatan <span class="text-red-500">*</span></label>
                  <AppSearchSelect
                    :model-value="custForm.district"
                    :options="custAddr.districts.value"
                    :loading="custAddr.loadingDistricts.value"
                    :disabled="!custForm.city"
                    placeholder="Kecamatan"
                    @update:model-value="custAddr.onDistrictChange"
                  />
                  <p v-if="getCustError('district')" class="mt-1 text-xs text-red-600">{{ getCustError('district') }}</p>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600">Kode Pos <span class="text-red-500">*</span></label>
                  <AppSearchSelect
                    :model-value="custForm.postal_code"
                    :options="custAddr.zipcodes.value"
                    :loading="custAddr.loadingZipcodes.value"
                    :disabled="!custForm.district"
                    placeholder="Kode Pos"
                    @update:model-value="(v) => custForm.postal_code = v"
                  />
                  <p v-if="getCustError('zipcode')" class="mt-1 text-xs text-red-600">{{ getCustError('zipcode') }}</p>
                </div>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Alamat Lengkap <span class="text-red-500">*</span></label>
                <textarea v-model="custForm.address" rows="2" class="form-input" placeholder="Jl. Nama Jalan No. X, RT/RW" />
                <p v-if="getCustError('address')" class="mt-1 text-xs text-red-600">{{ getCustError('address') }}</p>
              </div>
            </div>

            <!-- ── VIEW: address_list ───────────────────────────────────── -->
            <div v-else-if="view === 'address_list'" class="p-4">
              <!-- Customer badge -->
              <div class="mb-4 flex items-center gap-2 rounded-xl bg-primary-50 px-3 py-2.5 ring-1 ring-primary-100">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-200">
                  <User class="h-3.5 w-3.5 text-primary-700" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-primary-900">{{ selectedCustomer?.name }}</p>
                  <p v-if="selectedCustomer?.phone" class="text-xs text-primary-600">{{ selectedCustomer?.phone }}</p>
                  <p v-if="selectedCustomer?.category" class="text-xs text-primary-500">
                    Kategori: {{ selectedCustomer.category.name }}
                  </p>
                </div>
                <button
                  v-if="!openedForAddressOnly"
                  class="shrink-0 text-xs text-primary-500 hover:text-primary-700"
                  @click="view = 'search'; selectedCustomer = null"
                >
                  Ganti
                </button>
              </div>

              <!-- Loading -->
              <div v-if="loadingAddresses" class="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
                <Loader2 class="h-4 w-4 animate-spin" /> Memuat alamat...
              </div>

              <!-- No addresses yet -->
              <div v-else-if="!addresses.length" class="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center">
                <MapPin class="mx-auto mb-2 h-7 w-7 text-gray-300" />
                <p class="text-sm text-gray-500">Belum ada alamat terdaftar</p>
                <p class="mt-0.5 text-xs text-gray-400">Tambahkan alamat untuk melanjutkan</p>
              </div>

              <!-- Address cards -->
              <div v-else class="space-y-2">
                <div
                  v-for="addr in addresses"
                  :key="addr.id"
                  class="flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-colors"
                  :class="highlightedAddressId === addr.id
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'"
                  @click="highlightedAddressId = addr.id"
                >
                  <!-- Radio indicator -->
                  <div
                    class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                    :class="highlightedAddressId === addr.id ? 'border-primary-500 bg-primary-500' : 'border-gray-300'"
                  >
                    <Check v-if="highlightedAddressId === addr.id" class="h-2.5 w-2.5 text-white" />
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                      <p class="text-sm font-medium text-gray-900">{{ addr.name }}</p>
                      <span v-if="addr.primary" class="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">Utama</span>
                    </div>
                    <p class="text-xs text-gray-500">{{ addr.phone }}</p>
                    <p class="mt-0.5 text-xs text-gray-500 line-clamp-2">
                      {{ addr.address }}, {{ addr.district }}, {{ addr.city }}, {{ addr.province }} {{ addr.zipcode }}
                    </p>
                  </div>

                  <!-- Edit button -->
                  <button
                    class="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-primary-600"
                    @click.stop="openEditAddress(addr)"
                  >
                    <Edit2 class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <!-- Add address -->
              <button
                class="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:border-primary-300 hover:text-primary-600"
                @click="openCreateAddress"
              >
                <Plus class="h-4 w-4" />
                Tambah Alamat Baru
              </button>
            </div>

            <!-- ── VIEW: address_form ────────────────────────────────────── -->
            <div v-else-if="view === 'address_form'" class="space-y-3 p-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600">Nama Penerima <span class="text-red-500">*</span></label>
                  <input v-model="addrForm.name" type="text" class="form-input" placeholder="Nama penerima" />
                  <p v-if="getAddrError('name')" class="mt-1 text-xs text-red-600">{{ getAddrError('name') }}</p>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600">Telepon <span class="text-red-500">*</span></label>
                  <input v-model="addrForm.phone" type="text" class="form-input" placeholder="08xxx" />
                  <p v-if="getAddrError('phone')" class="mt-1 text-xs text-red-600">{{ getAddrError('phone') }}</p>
                </div>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Provinsi <span class="text-red-500">*</span></label>
                <AppSearchSelect
                  :model-value="addrForm.province"
                  :options="addrSelect.provinces.value"
                  :loading="addrSelect.loadingProvinces.value"
                  placeholder="Pilih Provinsi"
                  @update:model-value="addrSelect.onProvinceChange"
                />
                <p v-if="getAddrError('province')" class="mt-1 text-xs text-red-600">{{ getAddrError('province') }}</p>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Kota <span class="text-red-500">*</span></label>
                <AppSearchSelect
                  :model-value="addrForm.city"
                  :options="addrSelect.cities.value"
                  :loading="addrSelect.loadingCities.value"
                  :disabled="!addrForm.province"
                  placeholder="Pilih Kota"
                  @update:model-value="addrSelect.onCityChange"
                />
                <p v-if="getAddrError('city')" class="mt-1 text-xs text-red-600">{{ getAddrError('city') }}</p>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600">Kecamatan <span class="text-red-500">*</span></label>
                  <AppSearchSelect
                    :model-value="addrForm.district"
                    :options="addrSelect.districts.value"
                    :loading="addrSelect.loadingDistricts.value"
                    :disabled="!addrForm.city"
                    placeholder="Kecamatan"
                    @update:model-value="addrSelect.onDistrictChange"
                  />
                  <p v-if="getAddrError('district')" class="mt-1 text-xs text-red-600">{{ getAddrError('district') }}</p>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600">Kode Pos <span class="text-red-500">*</span></label>
                  <AppSearchSelect
                    :model-value="addrForm.postal_code"
                    :options="addrSelect.zipcodes.value"
                    :loading="addrSelect.loadingZipcodes.value"
                    :disabled="!addrForm.district"
                    placeholder="Kode Pos"
                    @update:model-value="(v) => addrForm.postal_code = v"
                  />
                  <p v-if="getAddrError('zipcode')" class="mt-1 text-xs text-red-600">{{ getAddrError('zipcode') }}</p>
                </div>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Alamat Lengkap <span class="text-red-500">*</span></label>
                <textarea v-model="addrForm.address" rows="2" class="form-input" placeholder="Jl. Nama Jalan No. X, RT/RW" />
                <p v-if="getAddrError('address')" class="mt-1 text-xs text-red-600">{{ getAddrError('address') }}</p>
              </div>
            </div>

          </div><!-- end body -->

          <!-- Footer actions -->
          <div class="shrink-0 border-t border-gray-100 px-4 py-3">

            <!-- search: no footer button -->

            <!-- create_customer footer -->
            <button
              v-if="view === 'create_customer'"
              :disabled="savingCust || !custForm.name"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="submitCreateCustomer"
            >
              <Loader2 v-if="savingCust" class="h-4 w-4 animate-spin" />
              {{ savingCust ? 'Menyimpan...' : 'Buat Pelanggan' }}
            </button>

            <!-- address_list footer -->
            <button
              v-else-if="view === 'address_list'"
              :disabled="!highlightedAddressId || loadingAddresses"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="confirmSelectAddress"
            >
              Pilih Alamat Ini
            </button>

            <!-- address_form footer -->
            <button
              v-else-if="view === 'address_form'"
              :disabled="savingAddr || !addrForm.name || !addrForm.phone"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="submitAddressForm"
            >
              <Loader2 v-if="savingAddr" class="h-4 w-4 animate-spin" />
              {{ savingAddr ? 'Menyimpan...' : (editingAddressId ? 'Simpan Perubahan' : 'Tambah Alamat') }}
            </button>

          </div><!-- end footer -->

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.form-input {
  @apply w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
