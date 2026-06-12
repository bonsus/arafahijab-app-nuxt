<script setup lang="ts">
import { ArrowLeft, Trash2, Loader2, Search, Package, TrendingDown, Layers, MapPin, Truck, X, Plus } from 'lucide-vue-next'
import type { Courier, CourierService } from '~/components/AppCourierPicker.vue'

definePageMeta({ middleware: 'auth' })

interface BinOption {
  id: string
  code: string
  rack: { id: string; name: string; code: string } | null
  zone: { id: string; name: string; code: string } | null
  stock: number
  price: string
}

interface SkuLookupResult {
  id: string
  product_id: string
  name: string
  sku_id: string
  sku: string
  variants: { name: string; value: string }[]
  stock: number
  price: string
  bins: BinOption[]
}

interface ItemRow {
  product_id: string
  sku_id: string
  sku: string
  name: string
  variants: { name: string; value: string }[]
  warehouse_bin_id: string
  bin_label: string
  stock_available: number
  qty: number | ''
  price: number | ''
}

interface AddressForm {
  name: string
  phone: string
  country: string
  province: string
  city: string
  district: string
  address: string
  postal_code: string
}

const api = useApi()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const isEdit = computed(() => !!route.query.edit)
const usageId = computed(() => route.query.edit as string)

const saving = ref(false)
const loadingData = ref(false)
const formErrors = ref<Record<string, string[]>>({})

const showProductModal = ref(false)
const productQuery = ref('')
const productResults = ref<SkuLookupResult[]>([])
const productLoading = ref(false)
const productError = ref('')
let productSearchTimer: ReturnType<typeof setTimeout> | null = null

const showBinModal = ref(false)
const pendingSkuResult = ref<SkuLookupResult | null>(null)
const pendingBinId = ref('')
const pendingBinLabel = ref('')
const binModalIsAddLocation = ref(false)

const showAddress = ref(false)
const showShipment = ref(false)

const typeOptions = [
  { value: "gift", label: 'Hadiah' },
  { value: "kol", label: 'KOL' },
  { value: "endorse", label: 'Endorse' },
  { value: "sponsor", label: 'Sponsor' },
  { value: "promo", label: 'Promo' },
  { value: "affiliate", label: 'Affiliate' },
  { value: 'sample', label: 'Sampel' },
  { value: 'ads', label: 'Iklan' },
  { value: 'event', label: 'Acara' },
  { value: 'usage', label: 'Pemakaian Internal' },
  { value: 'damage', label: 'Kerusakan' },
  { value: 'other', label: 'Lainnya' },
]

const form = reactive({
  warehouse_id: '',
  no: '',
  date: new Date().toISOString().slice(0, 10),
  status: 'draft',
  type: '',
  note: '',
})

const address = reactive<AddressForm>({
  name: '',
  phone: '',
  country: 'Indonesia',
  province: '',
  city: '',
  district: '',
  address: '',
  postal_code: '',
})

const addressSelect = useAddressSelect(address)

const selectedCourier = ref<Courier | null>(null)
const selectedService = ref<CourierService | null>(null)

const showCourierModal = ref(false)
const courierModalQuery = ref('')
const courierModalCouriers = ref<Courier[]>([])
const courierModalLoading = ref(false)

const filteredModalCouriers = computed(() => {
  if (!courierModalQuery.value.trim()) return courierModalCouriers.value
  const q = courierModalQuery.value.toLowerCase()
  return courierModalCouriers.value.filter(
    c => c.courier_name.toLowerCase().includes(q) || c.courier_code.toLowerCase().includes(q),
  )
})

const shipment = reactive({
  courier_code: '',
  courier_name: '',
  service_code: '',
  service_name: '',
  tracking_no: '',
  note: '',
})

const items = ref<ItemRow[]>([])

// ── Computed ─────────────────────────────────────────────────────────────────
const getQty = (item: ItemRow) => item.qty !== '' ? Number(item.qty) : 0

const getItemTotal = (item: ItemRow) => {
  const q = getQty(item)
  if (q <= 0 || item.price === '') return 0
  return Number(item.price) * q
}

const grandTotal = computed(() =>
  items.value.reduce((sum, i) => sum + getItemTotal(i), 0),
)

const totalQty = computed(() =>
  items.value.reduce((sum, i) => sum + getQty(i), 0),
)

const hasAddress = computed(() =>
  !!(address.name || address.phone || address.province),
)

const hasShipment = computed(() =>
  !!(shipment.courier_code || shipment.tracking_no),
)

const addressComplete = computed(() =>
  !!(address.province && address.city),
)

// ── Product Search Modal ─────────────────────────────────────────────────────
function openProductModal() {
  if (!form.warehouse_id) {
    toast.error('Pilih gudang terlebih dahulu')
    return
  }
  showProductModal.value = true
  productQuery.value = ''
  productResults.value = []
  productError.value = ''
}

function closeProductModal() {
  showProductModal.value = false
  productQuery.value = ''
  productResults.value = []
  if (productSearchTimer) clearTimeout(productSearchTimer)
}

async function doProductSearch() {
  const q = productQuery.value.trim()
  if (!q) {
    productResults.value = []
    return
  }
  productLoading.value = true
  productError.value = ''
  try {
    const res = await api.get<{ data: SkuLookupResult[] }>('/inventories/stock-usages/products', {
      warehouse_id: form.warehouse_id,
      search: q,
    })
    productResults.value = res.data || []
  }
  catch {
    productError.value = 'Gagal memuat produk'
    productResults.value = []
  }
  finally {
    productLoading.value = false
  }
}

function onProductQueryInput() {
  if (productSearchTimer) clearTimeout(productSearchTimer)
  productSearchTimer = setTimeout(doProductSearch, 400)
}

function isItemAdded(skuId: string, binId: string) {
  return items.value.some(i => i.sku_id === skuId && i.warehouse_bin_id === binId)
}

function addItemFromBin(sku: SkuLookupResult, bin: BinOption) {
  if (isItemAdded(sku.sku_id, bin.id)) return
  const binLabel = [bin.zone?.code, bin.rack?.code, bin.code].filter(Boolean).join(' / ')
  items.value.push({
    product_id: sku.product_id,
    sku_id: sku.sku_id,
    sku: sku.sku,
    name: sku.name,
    variants: sku.variants || [],
    warehouse_bin_id: bin.id,
    bin_label: binLabel,
    stock_available: bin.stock,
    qty: '',
    price: Number(bin.price || sku.price) || '',
  })
}

function addItemNoBins(sku: SkuLookupResult) {
  pendingSkuResult.value = sku
  pendingBinId.value = ''
  pendingBinLabel.value = ''
  showBinModal.value = true
  closeProductModal()
}

function removeRow(index: number) {
  items.value.splice(index, 1)
}
  
function clearCourier() {
  selectedCourier.value = null
  selectedService.value = null
  shipment.courier_code = ''
  shipment.courier_name = ''
  shipment.service_code = ''
  shipment.service_name = ''
}

async function loadCourierModalCouriers() {
  if (courierModalCouriers.value.length) return
  courierModalLoading.value = true
  try {
    const res = await api.get<{ data: Courier[] }>('/couriers/index')
    courierModalCouriers.value = res.data || []
  }
  catch {
    courierModalCouriers.value = []
  }
  finally {
    courierModalLoading.value = false
  }
}

function openCourierModal() {
  showCourierModal.value = true
  courierModalQuery.value = ''
  loadCourierModalCouriers()
}

function closeCourierModal() {
  showCourierModal.value = false
  courierModalQuery.value = ''
}

function selectCourierService(courier: Courier, service: CourierService | null = null) {
  selectedCourier.value = courier
  selectedService.value = service
  shipment.courier_code = courier.courier_code
  shipment.courier_name = courier.courier_name
  shipment.service_code = service?.service_code || ''
  shipment.service_name = service?.service_name || ''
  closeCourierModal()
}

// ── Load Edit ────────────────────────────────────────────────────────────────
async function loadData() {
  if (!isEdit.value) return
  loadingData.value = true
  try {
    const res = await api.get<{ data: any }>(`/inventories/stock-usages/${usageId.value}`)
    const d = res.data
    form.warehouse_id = d.warehouse_id
    form.no = d.no || ''
    form.date = d.date ? d.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
    form.status = d.status
    form.type = d.type || 'usage'
    form.note = d.note || ''

    if (d.address?.name) {
      Object.assign(address, {
        name: d.address.name || '',
        phone: d.address.phone || '',
        country: d.address.country || 'Indonesia',
        province: d.address.province || '',
        city: d.address.city || '',
        district: d.address.district || '',
        address: d.address.address || '',
        postal_code: d.address.zipcode || '',
      })
      showAddress.value = true
      await nextTick()
      addressSelect.initFromState()
    }

    if (d.shipment?.courier_code) {
      Object.assign(shipment, {
        courier_code: d.shipment.courier_code || '',
        courier_name: d.shipment.courier_name || '',
        service_code: d.shipment.service_code || '',
        service_name: d.shipment.service_name || '',
        tracking_no: d.shipment.tracking_no || '',
        note: d.shipment.note || '',
      })
      selectedCourier.value = {
        id: '', type: '',
        courier_code: d.shipment.courier_code,
        courier_name: d.shipment.courier_name || d.shipment.courier_code,
        is_active: true,
        services: [],
      }
      if (d.shipment.service_code) {
        selectedService.value = {
          id: '', type: '',
          service_code: d.shipment.service_code,
          service_name: d.shipment.service_name || d.shipment.service_code,
          is_active: true,
        }
      }
      showShipment.value = true
    }

    items.value = (d.items || []).map((item: any) => ({
      product_id: item.product_id,
      sku_id: item.sku_id,
      sku: item.sku,
      name: item.name,
      variants: item.variants || [],
      warehouse_bin_id: item.warehouse_bin_id,
      bin_label: item.bin?.code ? [item.zone?.code, item.rack?.code, item.bin.code].filter(Boolean).join(' / ') : '-',
      stock_available: item.bin?.stock ?? 0,
      qty: Math.abs(item.qty),
      price: Number(item.price) || '',
    }))
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data')
    router.push('/inventory/usage')
  }
  finally {
    loadingData.value = false
  }
}

// ── Submit ───────────────────────────────────────────────────────────────────
async function handleSubmit(submitStatus: 'draft' | 'completed' = 'draft') {
  form.status = submitStatus
  formErrors.value = {}

  if (!form.warehouse_id) {
    formErrors.value = { warehouse_id: ['Gudang wajib dipilih'] }
    return
  }
  if (!items.value.length) {
    formErrors.value = { items: ['Minimal 1 item wajib diisi'] }
    return
  }

  const errors: Record<string, string[]> = {}
  for (const [i, item] of items.value.entries()) {
    const q = getQty(item)
    if (item.qty === '' || q <= 0) {
      errors[`items[${i}].qty`] = ['Qty harus lebih dari 0']
    }
    else if (q > item.stock_available && item.stock_available > 0) {
      errors[`items[${i}].qty`] = [`Qty tidak boleh melebihi stok tersedia (${item.stock_available})`]
    }
  }
  if (Object.keys(errors).length) {
    formErrors.value = errors
    toast.error('Periksa kembali isian form')
    return
  }

  saving.value = true
  try {
    const payload: Record<string, any> = {
      warehouse_id: form.warehouse_id,
      status: form.status,
      type: form.type,
      note: form.note,
      items: items.value.map(item => ({
        warehouse_bin_id: item.warehouse_bin_id,
        product_id: item.product_id,
        sku_id: item.sku_id,
        sku: item.sku,
        name: item.name,
        variants: item.variants,
        qty: getQty(item),
        price: item.price !== '' ? String(item.price) : '0',
      })),
    }
    if (form.no) payload.no = form.no

    if (showAddress.value && hasAddress.value) {
      payload.address = {
        name: address.name,
        phone: address.phone,
        country: address.country,
        province: address.province,
        city: address.city,
        district: address.district,
        address: address.address,
        zipcode: address.postal_code,
      }
    }
    if (showShipment.value && hasShipment.value) {
      payload.shipment = { ...shipment }
    }

    if (isEdit.value) {
      await api.put(`/inventories/stock-usages/${usageId.value}`, payload)
      toast.success('Pemakaian stok berhasil diperbarui')
    }
    else {
      await api.post('/inventories/stock-usages/create', payload)
      toast.success('Pemakaian stok berhasil dibuat')
    }
    router.push('/inventory/usage')
  }
  catch (err: any) {
    if (err.errors) formErrors.value = err.errors
    else toast.error(err.message || 'Gagal menyimpan')
  }
  finally {
    saving.value = false
  }
}

function getFieldError(key: string): string | undefined {
  return formErrors.value[key]?.[0]
}

function getRowErrors(idx: number): string[] {
  const prefix = `items[${idx}].`
  return Object.entries(formErrors.value)
    .filter(([key]) => key.startsWith(prefix) && !['qty', 'price'].includes(key.slice(prefix.length)))
    .flatMap(([, msgs]) => msgs)
}

onMounted(() => {
  if (isEdit.value) {
    loadData()
  }
  else {
    addressSelect.fetchProvinces()
  }
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/inventory/usage"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
        {{ isEdit ? 'Edit Pemakaian Stok' : 'Buat Pemakaian Stok' }}
      </h1>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loadingData" class="space-y-4">
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200 space-y-4">
        <div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
        <div class="grid gap-4 sm:grid-cols-3">
          <div v-for="i in 3" :key="i" class="space-y-1.5">
            <div class="h-3 w-20 animate-pulse rounded bg-gray-200" />
            <div class="h-9 w-full animate-pulse rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
    </div>

    <div v-else class="space-y-4">
      <!-- Info Pemakaian -->
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <h2 class="mb-4 text-sm font-semibold text-gray-900">Informasi Pemakaian</h2>
        <div class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-3">
            <!-- Gudang -->
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">
                Gudang <span class="text-red-500">*</span>
              </label>
              <AppWarehousePicker v-model="form.warehouse_id" :disabled="items.length > 0" />
              <p v-if="getFieldError('warehouse_id')" class="mt-1 text-xs text-red-500">
                {{ getFieldError('warehouse_id') }}
              </p>
            </div>
            <!-- Tipe -->
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Tipe Pemakaian</label>
              <select
                v-model="form.type"
                class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <!-- Catatan -->
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Catatan</label>
              <textarea
                v-model="form.note"
                rows="1"
                placeholder="Catatan pemakaian..."
                class="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Address (Optional) -->
      <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <button
          type="button"
          class="flex w-full items-center justify-between px-5 py-4 text-left"
          @click="showAddress = !showAddress"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">Alamat Pengiriman</span>
            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Opsional</span>
            <span v-if="hasAddress" class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-600">Terisi</span>
          </div>
          <span class="text-xs text-gray-400">{{ showAddress ? 'Sembunyikan' : 'Tampilkan' }}</span>
        </button>
        <div v-if="showAddress" class="border-t border-gray-100 px-5 pb-5 pt-4">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Nama Penerima</label>
              <input v-model="address.name" type="text" placeholder="Nama penerima" 
                class="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Telepon</label>
              <input v-model="address.phone" type="text" placeholder="Nomor telepon" 
                class="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Provinsi</label>
              <AppSearchSelect
                :model-value="address.province"
                :options="addressSelect.provinces.value"
                :loading="addressSelect.loadingProvinces.value"
                placeholder="Pilih Provinsi"
                @update:model-value="addressSelect.onProvinceChange"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Kota</label>
              <AppSearchSelect
                :model-value="address.city"
                :options="addressSelect.cities.value"
                :loading="addressSelect.loadingCities.value"
                :disabled="!address.province"
                placeholder="Pilih Kota"
                @update:model-value="addressSelect.onCityChange"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Kecamatan</label>
              <AppSearchSelect
                :model-value="address.district"
                :options="addressSelect.districts.value"
                :loading="addressSelect.loadingDistricts.value"
                :disabled="!address.city"
                placeholder="Pilih Kecamatan"
                @update:model-value="addressSelect.onDistrictChange"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Kode Pos</label>
              <AppSearchSelect
                :model-value="address.postal_code"
                :options="addressSelect.zipcodes.value"
                :loading="addressSelect.loadingZipcodes.value"
                :disabled="!address.district"
                :allow-custom="true"
                placeholder="Kode Pos"
                @update:model-value="addressSelect.onPostalCodeChange"
              />
            </div>
            <div class="sm:col-span-2 lg:col-span-3">
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Alamat Lengkap</label>
              <textarea v-model="address.address" rows="2" placeholder="Alamat lengkap..." class="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
            </div>
          </div>
        </div>
      </div>

      <!-- Shipment (Optional) -->
      <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <button
          type="button"
          class="flex w-full items-center justify-between px-5 py-4 text-left"
          @click="showShipment = !showShipment"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">Info Pengiriman</span>
            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Opsional</span>
            <span v-if="hasShipment" class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-600">Terisi</span>
          </div>
          <span class="text-xs text-gray-400">{{ showShipment ? 'Sembunyikan' : 'Tampilkan' }}</span>
        </button>
        <div v-if="showShipment" class="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">
          <!-- Courier picker —— only when address has province+city -->
          <div v-if="!addressComplete" class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Lengkapi provinsi dan kota pada alamat pengiriman untuk mengaktifkan pilihan kurir.
          </div>
          <div v-else class="space-y-2">
            <label class="block text-xs font-medium text-gray-700">Kurir &amp; Layanan</label>
            <!-- Selected state -->
            <div v-if="selectedCourier" class="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
              <div class="flex items-center gap-2">
                <Truck class="h-4 w-4 text-orange-500" />
                <span class="text-sm font-semibold text-gray-900">{{ selectedCourier.courier_name }}</span>
                <span v-if="selectedService" class="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                  {{ selectedService.service_name }}
                </span>
              </div>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="rounded px-2 py-1 text-xs text-primary-600 transition-colors hover:bg-primary-50"
                  @click="openCourierModal"
                >
                  Ganti
                </button>
                <button type="button" class="rounded p-0.5 text-gray-400 transition-colors hover:text-red-500" @click="clearCourier">
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>
            <!-- Pick button -->
            <button
              v-else
              type="button"
              class="flex w-full items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-600"
              @click="openCourierModal"
            >
              <Truck class="h-4 w-4" />
              Pilih Kurir &amp; Layanan
            </button>
          </div>
          <!-- Tracking & Note -->
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">No. Resi</label>
              <input v-model="shipment.tracking_no" type="text" placeholder="Nomor resi" class="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"/>
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700">Catatan Pengiriman</label>
              <input v-model="shipment.note" type="text" placeholder="Catatan pengiriman..." class="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"/>
            </div>
          </div>
        </div>
      </div>

      <!-- Items -->
      <div class="space-y-4">
        <!-- Items Table -->
        <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
          <div class="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
            <h2 class="text-sm font-semibold text-gray-900">
              Item Pemakaian
              <span class="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                {{ items.length }}
              </span>
            </h2>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
              @click="openProductModal"
            >
              <Plus class="h-3.5 w-3.5" />
              Tambah Produk
            </button>
          </div>
          <p v-if="getFieldError('items')" class="px-5 py-2 text-xs text-red-500">
            {{ getFieldError('items') }}
          </p>

          <div v-if="items.length === 0" class="px-5 py-14 text-center">
            <Package class="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p class="text-sm font-medium text-gray-500">Belum ada item</p>
            <p class="mt-0.5 text-xs text-gray-400">Klik "Tambah Produk" untuk menambahkan produk.</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="min-w-[720px] w-full text-sm">
              <thead>
                <tr class="border-b border-gray-100 bg-gray-50 text-left text-nowrap">
                  <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-8">#</th>
                  <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">SKU / Produk</th>
                  <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-28">Lokasi</th>
                  <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-28 text-center">Qty Pakai</th>
                  <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-32 text-right">Harga / Unit</th>
                  <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-28 text-right">Total Nilai</th>
                  <th class="px-4 py-2.5 w-20" />
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <template v-for="(item, idx) in items" :key="idx">
                  <tr class="group align-top">
                    <td class="px-4 py-3 text-xs text-gray-400">{{ idx + 1 }}</td>
                    <td class="px-4 py-3">
                      <p class="line-clamp-2 text-sm font-medium leading-tight text-gray-900">{{ item.name }}</p>
                      <div class="mt-0.5 flex flex-wrap items-center gap-1 text-xs">
                        <span class="font-mono text-xs font-semibold text-gray-700">{{ item.sku }}</span>
                        <span v-for="v in item.variants" :key="v.name" class="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{{ v.value }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-nowrap">
                      <span class="rounded bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-600">
                        {{ item.bin_label }}
                      </span>
                    </td> 
                    <td class="px-4 py-3 text-center">
                      <input
                        v-model.number="item.qty"
                        type="number"
                        min="1"
                        placeholder="0"
                        class="w-full rounded-lg border px-2.5 py-1.5 text-center text-sm font-semibold focus:outline-none focus:ring-2"
                        :class="
                          getQty(item) > 0
                            ? 'border-red-300 text-red-600 focus:border-red-400 focus:ring-red-400/20'
                            : 'border-gray-200 text-gray-700 focus:border-primary-500 focus:ring-primary-500/20'
                        "
                      />
                      <p v-if="getFieldError(`items[${idx}].qty`)" class="mt-1 whitespace-nowrap text-[10px] text-red-500">
                        {{ getFieldError(`items[${idx}].qty`) }}
                      </p>
                    </td>
                    <td class="px-4 py-3 text-right">
                      <span class="text-sm font-semibold text-gray-700">
                        {{ item.price !== '' ? `Rp${formatCurrency(item.price)}` : '—' }}
                      </span> 
                    </td>
                    <td class="px-4 py-3 text-right">
                      <span class="text-sm font-semibold text-gray-700">
                        {{ getItemTotal(item) > 0 ? `Rp${formatCurrency(getItemTotal(item))}` : '—' }}
                      </span>
                    </td>
                    <td class="px-2 py-3">
                      <div class="flex items-center justify-center gap-1"> 
                        <button
                          type="button"
                          class="rounded-lg p-1 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                          title="Hapus baris"
                          @click="removeRow(idx)"
                        >
                          <Trash2 class="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="getRowErrors(idx).length" class="bg-red-50">
                    <td />
                    <td colspan="7" class="px-4 py-1.5">
                      <p v-for="msg in getRowErrors(idx)" :key="msg" class="text-xs text-red-600">{{ msg }}</p>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Summary -->
        <div v-if="items.length > 0" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
            <div class="flex items-center gap-2.5">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                <Layers class="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500">Total Item</p>
                <p class="text-lg font-bold text-gray-900">{{ items.length }}</p>
              </div>
            </div>
          </div>
          <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
            <div class="flex items-center gap-2.5">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                <TrendingDown class="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500">Total Qty</p>
                <p class="text-lg font-bold text-red-600">{{ totalQty.toLocaleString('id-ID') }}</p>
              </div>
            </div>
          </div>
          <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
            <div class="flex items-center gap-2.5">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                <Package class="h-4 w-4 text-primary-600" />
              </div>
              <div class="min-w-0">
                <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500">Total Nilai</p>
                <p class="truncate text-base font-bold text-gray-900">Rp{{ formatCurrency(grandTotal) }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="h-20" />
      </div>

      <!-- Sticky Action Bar -->
      <div class="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white px-4 py-3 shadow-lg sm:px-6">
        <div class="mx-auto flex max-w-screen-xl items-center justify-between gap-3">
          <p class="text-sm text-gray-500">
            <span class="font-semibold text-gray-900">{{ items.length }}</span> item ·
            <span class="font-semibold text-gray-900">Rp{{ formatCurrency(grandTotal) }}</span>
          </p>
          <div class="flex gap-2">
            <NuxtLink
              to="/inventory/usage"
              class="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Batal
            </NuxtLink>
            <button
              type="button"
              :disabled="saving"
              class="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
              @click="handleSubmit('draft')"
            >
              <Loader2 v-if="saving && form.status === 'draft'" class="h-4 w-4 animate-spin" />
              Simpan Draft
            </button>
            <button
              type="button"
              :disabled="saving"
              class="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
              @click="handleSubmit('completed')"
            >
              <Loader2 v-if="saving && form.status === 'completed'" class="h-4 w-4 animate-spin" />
              Simpan &amp; Selesaikan
            </button>
          </div>
        </div>
      </div>
    </div>
 

    <!-- Product Search Modal -->
    <Teleport to="body">
      <div v-if="showProductModal" class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" @mousedown.self="closeProductModal">
        <div class="flex w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-xl" style="max-height: 90vh">
          <!-- Header -->
          <div class="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 class="text-base font-semibold text-gray-900">Tambah Produk</h3>
            <button type="button" class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" @click="closeProductModal">
              <X class="h-5 w-5" />
            </button>
          </div>
          <!-- Search -->
          <div class="shrink-0 border-b border-gray-100 px-4 py-3">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                v-model="productQuery"
                type="text"
                placeholder="Cari nama produk atau kode SKU..."
                class="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                autofocus
                @input="onProductQueryInput"
              />
            </div>
          </div>
          <!-- Results -->
          <div class="flex-1 overflow-y-auto">
            <!-- Empty state -->
            <div v-if="!productQuery.trim()" class="flex flex-col items-center justify-center py-16 text-gray-400">
              <Search class="mb-2 h-8 w-8 opacity-30" />
              <p class="text-sm">Ketik untuk mencari produk</p>
            </div>
            <!-- Loading -->
            <div v-else-if="productLoading" class="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
              <Loader2 class="h-5 w-5 animate-spin" />
              Mencari...
            </div>
            <!-- Error -->
            <div v-else-if="productError" class="py-16 text-center text-sm text-red-500">{{ productError }}</div>
            <!-- No results -->
            <div v-else-if="productResults.length === 0" class="py-16 text-center text-sm text-gray-400">
              Produk tidak ditemukan
            </div>
            <!-- Results list -->
            <div v-else class="divide-y divide-gray-100 pb-4">
              <div v-for="sku in productResults" :key="sku.sku_id" class="px-5 py-3.5">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold text-gray-900">{{ sku.name }}</p>
                    <div class="mt-0.5 flex flex-wrap items-center gap-1">
                      <span class="font-mono text-xs font-medium text-gray-500">{{ sku.sku }}</span>
                      <span v-for="v in sku.variants" :key="v.name" class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{{ v.value }}</span>
                    </div>
                  </div>
                  <span class="shrink-0 text-xs text-gray-400">Stok: <span class="font-semibold text-gray-700">{{ sku.stock.toLocaleString('id-ID') }}</span></span>
                </div>
                <!-- Bins -->
                <div v-if="sku.bins?.length" class="mt-2.5 flex flex-wrap gap-1.5">
                  <button
                    v-for="bin in sku.bins"
                    :key="bin.id"
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
                    :class="isItemAdded(sku.sku_id, bin.id)
                      ? 'cursor-default border-emerald-200 bg-emerald-50 text-emerald-600'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-600'"
                    :disabled="isItemAdded(sku.sku_id, bin.id)"
                    @click="addItemFromBin(sku, bin)"
                  >
                    <span class="font-mono">[{{ [bin.zone?.code, bin.rack?.code, bin.code].filter(Boolean).join('/') }}]</span>
                    <span class="text-gray-400">·</span>
                    <span>{{ bin.stock.toLocaleString('id-ID') }} stok</span>
                    <span v-if="isItemAdded(sku.sku_id, bin.id)" class="ml-0.5">✓</span>
                    <Plus v-else class="h-3 w-3" />
                  </button>
                </div>
                <!-- No bins —— manual -->
                <div v-else class="mt-2">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2.5 py-1.5 text-xs text-gray-500 transition-colors hover:border-primary-400 hover:text-primary-600"
                    @click="addItemNoBins(sku)"
                  >
                    <Plus class="h-3 w-3" /> Tambah (pilih lokasi manual)
                  </button>
                </div>
              </div>
            </div>
          </div>
          <!-- Footer -->
          <div class="shrink-0 border-t border-gray-100 px-5 py-3 text-right">
            <button
              type="button"
              class="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              @click="closeProductModal"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Product Search Modal -->
    <Teleport to="body">
      <div v-if="showProductModal" class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" @mousedown.self="closeProductModal">
        <div class="flex w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-xl" style="max-height: 90vh">
          <!-- Header -->
          <div class="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 class="text-base font-semibold text-gray-900">Tambah Produk</h3>
            <button type="button" class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" @click="closeProductModal">
              <X class="h-5 w-5" />
            </button>
          </div>
          <!-- Search -->
          <div class="shrink-0 border-b border-gray-100 px-4 py-3">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                v-model="productQuery"
                type="text"
                placeholder="Cari nama produk atau kode SKU..."
                class="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                autofocus
                @input="onProductQueryInput"
              />
            </div>
          </div>
          <!-- Results -->
          <div class="flex-1 overflow-y-auto">
            <div v-if="!productQuery.trim()" class="flex flex-col items-center justify-center py-16 text-gray-400">
              <Search class="mb-2 h-8 w-8 opacity-30" />
              <p class="text-sm">Ketik untuk mencari produk</p>
            </div>
            <div v-else-if="productLoading" class="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
              <Loader2 class="h-5 w-5 animate-spin" />
              Mencari...
            </div>
            <div v-else-if="productError" class="py-16 text-center text-sm text-red-500">{{ productError }}</div>
            <div v-else-if="productResults.length === 0" class="py-16 text-center text-sm text-gray-400">
              Produk tidak ditemukan
            </div>
            <div v-else class="divide-y divide-gray-100 pb-4">
              <div v-for="sku in productResults" :key="sku.sku_id" class="px-5 py-3.5">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold text-gray-900">{{ sku.name }}</p>
                    <div class="mt-0.5 flex flex-wrap items-center gap-1">
                      <span class="font-mono text-xs font-medium text-gray-500">{{ sku.sku }}</span>
                      <span v-for="v in sku.variants" :key="v.name" class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{{ v.value }}</span>
                    </div>
                  </div>
                  <span class="shrink-0 text-xs text-gray-400">Stok: <span class="font-semibold text-gray-700">{{ sku.stock.toLocaleString('id-ID') }}</span></span>
                </div>
                <!-- Bins -->
                <div v-if="sku.bins?.length" class="mt-2.5 flex flex-wrap gap-1.5">
                  <button
                    v-for="bin in sku.bins"
                    :key="bin.id"
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
                    :class="isItemAdded(sku.sku_id, bin.id)
                      ? 'cursor-default border-emerald-200 bg-emerald-50 text-emerald-600'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-600'"
                    :disabled="isItemAdded(sku.sku_id, bin.id)"
                    @click="addItemFromBin(sku, bin)"
                  >
                    <span class="font-mono">[{{ [bin.zone?.code, bin.rack?.code, bin.code].filter(Boolean).join('/') }}]</span>
                    <span class="text-gray-400">·</span>
                    <span>{{ bin.stock.toLocaleString('id-ID') }} stok</span>
                    <span v-if="isItemAdded(sku.sku_id, bin.id)" class="ml-0.5">✓</span>
                    <Plus v-else class="h-3 w-3" />
                  </button>
                </div>
                <!-- No bins — manual -->
                <div v-else class="mt-2">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2.5 py-1.5 text-xs text-gray-500 transition-colors hover:border-primary-400 hover:text-primary-600"
                    @click="addItemNoBins(sku)"
                  >
                    <Plus class="h-3 w-3" /> Tambah (pilih lokasi manual)
                  </button>
                </div>
              </div>
            </div>
          </div>
          <!-- Footer -->
          <div class="shrink-0 border-t border-gray-100 px-5 py-3 text-right">
            <button
              type="button"
              class="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              @click="closeProductModal"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Courier Modal -->
    <Teleport to="body">
      <div v-if="showCourierModal" class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" @mousedown.self="closeCourierModal">
        <div class="flex w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-xl" style="max-height: 85vh">
          <!-- Header -->
          <div class="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 class="text-base font-semibold text-gray-900">Pilih Kurir &amp; Layanan</h3>
            <button type="button" class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" @click="closeCourierModal">
              <X class="h-5 w-5" />
            </button>
          </div>
          <!-- Search -->
          <div class="shrink-0 border-b border-gray-100 px-4 py-3">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                v-model="courierModalQuery"
                type="text"
                placeholder="Cari kurir..."
                class="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
          <!-- List -->
          <div class="flex-1 overflow-y-auto">
            <div v-if="courierModalLoading" class="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
              <Loader2 class="h-5 w-5 animate-spin" />
              Memuat...
            </div>
            <div v-else-if="!filteredModalCouriers.length" class="py-16 text-center text-sm text-gray-400">
              Tidak ada kurir ditemukan
            </div>
            <div v-else class="divide-y divide-gray-100 pb-4">
              <div v-for="courier in filteredModalCouriers" :key="courier.id">
                <div v-if="courier.services.filter(s => s.is_active).length" class="px-5 py-3.5">
                  <!-- Courier name -->
                  <div class="mb-2.5 flex items-center gap-2.5">
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                      <Truck class="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-gray-900">{{ courier.courier_name }}</p>
                      <p class="text-xs text-gray-400">{{ courier.services.filter(s => s.is_active).length }} layanan aktif</p>
                    </div>
                  </div>
                  <!-- Service chips -->
                  <div v-if="courier.services.filter(s => s.is_active).length" class="flex flex-wrap gap-1.5 pl-10">
                    <button
                      v-for="svc in courier.services.filter(s => s.is_active)"
                      :key="svc.service_code"
                      type="button"
                      class="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                      :class="selectedCourier?.courier_code === courier.courier_code && selectedService?.service_code === svc.service_code
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-600'"
                      @click="selectCourierService(courier, svc)"
                    >
                      {{ svc.service_name }}
                    </button>
                  </div>
                  <!-- No services — select courier directly -->
                  <div v-else class="pl-10">
                    <button
                      type="button"
                      class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-600"
                      :class="selectedCourier?.courier_code === courier.courier_code ? 'border-primary-500 bg-primary-50 text-primary-700' : ''"
                      @click="selectCourierService(courier, null)"
                    >
                      Pilih {{ courier.courier_name }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
