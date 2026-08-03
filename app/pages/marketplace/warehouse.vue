<script setup lang="ts">
import { Warehouse, Loader2, Search, X, Inbox, MapPin, Link2, Check, Info, AlertCircle, PowerOff, RefreshCw, Trash2 } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface StoreOption {
  id: string
  shop_name: string
  source: string
}

interface BoundWarehouse {
  id: string
  name: string
  city: string
  address: string
}

interface MpWarehouse {
  id: string
  name: string
  type: string
  sub_type: string
  is_default: boolean
  status: string
  address: string
  binding?: BoundWarehouse | null
}

interface WarehouseBinding {
  id: string
  warehouse_id: string
  store_id: string
  mp_warehouse_id: string
  mp_warehouse_name: string
  status: string
}

interface InternalWarehouse {
  id: string
  name: string
  address?: string
  city?: string
  bindings?: WarehouseBinding[] | null
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const stores = ref<StoreOption[]>([])
const storesLoading = ref(false)
const selectedStoreId = ref('')

const warehouses = ref<MpWarehouse[]>([])
const warehousesLoading = ref(false)
const total = ref(0)
const search = ref('')
const fStatus = ref('')
const fBinding = ref('')

const statusFilterOptions = [
  { value: '', label: 'Semua Status' },
  { value: 'ENABLED', label: 'Aktif' },
  { value: 'DISABLED', label: 'Nonaktif' },
]

const bindingFilterOptions = [
  { value: '', label: 'Semua Binding' },
  { value: 'bound', label: 'Sudah Dibinding' },
  { value: 'unbound', label: 'Belum Dibinding' },
]

const selectedStore = computed(() => stores.value.find(s => s.id === selectedStoreId.value) || null)

const boundCount = computed(() => warehouses.value.filter(w => w.binding).length)
const unboundCount = computed(() => warehouses.value.filter(w => !w.binding).length)
const inactiveCount = computed(() => warehouses.value.filter(w => w.status !== 'ENABLED').length)

const filteredWarehouses = computed(() => {
  let list = warehouses.value
  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter(w =>
      w.name.toLowerCase().includes(q)
      || w.id.toLowerCase().includes(q)
      || w.address?.toLowerCase().includes(q),
    )
  }
  if (fStatus.value) list = list.filter(w => w.status === fStatus.value)
  if (fBinding.value === 'bound') list = list.filter(w => w.binding)
  else if (fBinding.value === 'unbound') list = list.filter(w => !w.binding)
  return list
})

const statusConfig: Record<string, { label: string; cls: string; dot: string }> = {
  ENABLED: { label: 'Aktif', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  DISABLED: { label: 'Nonaktif', cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200', dot: 'bg-gray-400' },
}

async function loadStores() {
  storesLoading.value = true
  try {
    const res = await api.get<{ data: StoreOption[] | null }>('/stores/public/index')
    stores.value = (res.data || []).filter(s => s.source == 'tiktok' || s.source == 'shopee')
  }
  catch {}
  finally {
    storesLoading.value = false
  }
}

async function onStoreSelect() {
  warehouses.value = []
  total.value = 0
  search.value = ''
  fStatus.value = ''
  fBinding.value = ''
  if (!selectedStoreId.value) return
  await fetchWarehouses()
}

function changeStore() {
  selectedStoreId.value = ''
  warehouses.value = []
  total.value = 0
  search.value = ''
  fStatus.value = ''
  fBinding.value = ''
}

async function fetchWarehouses() {
  const store = selectedStore.value
  if (!store) return
  warehousesLoading.value = true
  try {
    const res = await api.get<{ data: { data: MpWarehouse[]; total: number } }>('/warehouses/mp/index', { store_id: store.id })
    warehouses.value = res.data?.data || []
    total.value = res.data?.total || 0
  }
  catch {
    warehouses.value = []
    total.value = 0
  }
  finally {
    warehousesLoading.value = false
  }
}

// --- Binding modal ---
const bindingModalOpen = ref(false)
const bindingTarget = ref<MpWarehouse | null>(null)
const internalWarehouses = ref<InternalWarehouse[]>([])
const internalWarehousesLoading = ref(false)
const warehouseSearch = ref('')
const selectedWarehouseId = ref('')
const submitting = ref(false)

let warehouseSearchTimer: ReturnType<typeof setTimeout>
function onWarehouseSearch() {
  clearTimeout(warehouseSearchTimer)
  warehouseSearchTimer = setTimeout(() => fetchInternalWarehouses(), 300)
}

async function fetchInternalWarehouses() {
  internalWarehousesLoading.value = true
  try {
    const params: Record<string, string> = { per_page: '50' }
    if (warehouseSearch.value) params.search = warehouseSearch.value
    const res = await api.get<{ data: { data: InternalWarehouse[] } }>('/warehouses/index', params)
    internalWarehouses.value = res.data?.data || []
  }
  catch {
    internalWarehouses.value = []
  }
  finally {
    internalWarehousesLoading.value = false
  }
}

function openBindingModal(w: MpWarehouse) {
  if (w.binding) return
  bindingTarget.value = w
  selectedWarehouseId.value = ''
  warehouseSearch.value = ''
  bindingModalOpen.value = true
  fetchInternalWarehouses()
}

/** Whether an internal warehouse already has a binding for the currently selected store. */
function isBoundToCurrentStore(wh: InternalWarehouse): boolean {
  const storeId = selectedStore.value?.id
  if (!storeId) return false
  return (wh.bindings || []).some(b => b.store_id === storeId)
}

function selectInternalWarehouse(wh: InternalWarehouse) {
  if (isBoundToCurrentStore(wh)) return
  selectedWarehouseId.value = wh.id
}

function closeBindingModal() {
  bindingModalOpen.value = false
  bindingTarget.value = null
  selectedWarehouseId.value = ''
}

async function saveBinding() {
  const store = selectedStore.value
  const target = bindingTarget.value
  if (!store || !target || !selectedWarehouseId.value || submitting.value) return
  const wh = internalWarehouses.value.find(w => w.id === selectedWarehouseId.value)
  if (wh && isBoundToCurrentStore(wh)) return
  submitting.value = true
  try {
    await api.post('/warehouses/mp/bindings/create', {
      warehouse_id: selectedWarehouseId.value,
      store_id: store.id,
      mp_warehouse_id: target.id,
      mp_warehouse_name: target.name,
      mp_warehouse_address: target.address,
    })
    toast.success('Gudang berhasil di-binding')
    closeBindingModal()
    await fetchWarehouses()
  }
  catch {
    // error toast handled globally by useApi
  }
  finally {
    submitting.value = false
  }
}

// --- Delete binding ---
const deletingId = ref<string | null>(null)

async function deleteBinding(w: MpWarehouse) {
  if (!w.binding || deletingId.value) return
  const ok = await confirm({
    title: 'Hapus Binding',
    message: `Hapus binding antara gudang "${w.name}" dengan gudang "${w.binding.name}"?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  deletingId.value = w.id
  try {
    await api.post('/warehouses/mp/bindings/delete', {
      warehouse_id: w.binding.id,
      mp_warehouse_id: w.id,
    })
    toast.success('Binding berhasil dihapus')
    await fetchWarehouses()
  }
  catch {
    // error toast handled globally by useApi
  }
  finally {
    deletingId.value = null
  }
}

onMounted(loadStores)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Integrasi Gudang</h1>
        <p class="mt-0.5 text-sm text-gray-500">Kelola binding antara gudang internal dengan gudang di toko marketplace.</p>
      </div>
    </div>

    <!-- Store picker (no store selected yet) -->
    <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <p class="mb-3 text-sm font-medium text-gray-700">Pilih Toko Marketplace</p>
      <div v-if="storesLoading" class="flex items-center gap-2 text-sm text-gray-400">
        <Loader2 class="h-4 w-4 animate-spin" />
        Memuat toko...
      </div>
      <div v-else-if="!stores.length" class="text-sm text-gray-400">
        Tidak ada toko marketplace yang tersedia.
      </div>
      <div v-else class="flex flex-wrap gap-2">
        <button
          v-for="store in stores"
          :key="store.id"
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
          :class="selectedStoreId === store.id ? 'bg-primary-600 text-white hover:bg-primary-700' : ''"
          @click="selectedStoreId = store.id; onStoreSelect()"
        >
          <img :src="'/images/platform/' + store.source + '.svg'" alt="" class="h-4 w-4 object-contain" />
          <span>{{ store.shop_name }}</span>
        </button>
      </div>
    </div>

    <template v-if="selectedStore">

      <!-- Info banner -->
      <div class="flex items-start gap-3 rounded-xl bg-blue-50 p-4 ring-1 ring-blue-100">
        <Info class="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
        <div>
          <p class="text-sm font-semibold text-blue-900">Tentang Integrasi Gudang</p>
          <p class="mt-0.5 text-xs text-blue-700">
            Lakukan binding antara gudang internal dengan gudang di toko marketplace ini. Stok akan disinkronkan berdasarkan binding yang telah dibuat.
          </p>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
            <Warehouse class="h-5 w-5 text-primary-600" />
          </div>
          <p class="mt-3 text-xl font-bold text-gray-900">{{ warehouses.length }}</p>
          <p class="mt-0.5 text-xs text-gray-500">Total Gudang</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
            <Check class="h-5 w-5 text-emerald-600" />
          </div>
          <p class="mt-3 text-xl font-bold text-gray-900">{{ boundCount }}</p>
          <p class="mt-0.5 text-xs text-gray-500">Sudah Dibinding</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
            <AlertCircle class="h-5 w-5 text-amber-600" />
          </div>
          <p class="mt-3 text-xl font-bold text-gray-900">{{ unboundCount }}</p>
          <p class="mt-0.5 text-xs text-gray-500">Belum Dibinding</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
            <PowerOff class="h-5 w-5 text-gray-500" />
          </div>
          <p class="mt-3 text-xl font-bold text-gray-900">{{ inactiveCount }}</p>
          <p class="mt-0.5 text-xs text-gray-500">Tidak Aktif</p>
        </div>
      </div>

      <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200"> 

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full min-w-[820px] text-sm">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                <th class="px-4 py-3 text-left">Gudang Marketplace</th>
                <th class="px-4 py-3 text-center">Status Binding</th>
                <th class="px-4 py-3 text-left">Gudang</th>
                <th class="px-4 py-3 text-center">Status</th>
                <th class="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody v-if="warehousesLoading">
              <tr v-for="i in 5" :key="i" class="border-b border-gray-100">
                <td v-for="j in 5" :key="j" class="px-4 py-3">
                  <div class="h-4 animate-pulse rounded bg-gray-200" :class="j === 1 ? 'w-40' : 'w-20'" />
                </td>
              </tr>
            </tbody>
            <tbody v-else-if="!filteredWarehouses.length">
              <tr>
                <td colspan="5" class="px-4 py-16 text-center">
                  <Inbox class="mx-auto mb-3 h-10 w-10 text-gray-300" />
                  <p class="text-sm text-gray-500">Belum ada gudang untuk toko ini</p>
                </td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr
                v-for="w in filteredWarehouses"
                :key="w.id"
                class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50"
              >
                <td class="px-4 py-3">
                  <div class="flex items-start gap-2.5">
                    <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <Warehouse class="h-4 w-4 text-gray-500" />
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span class="font-medium text-gray-800">{{ w.name }}</span>
                        <span v-if="w.is_default" class="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-blue-200">Default</span>
                      </div>
                      <p class="mt-0.5 flex items-start gap-1 text-xs text-gray-400">
                        <MapPin class="mt-0.5 h-3 w-3 shrink-0" />
                        <span class="line-clamp-1">{{ w.address }}</span>
                      </p>
                      <p class="mt-0.5 text-[11px] text-gray-400">{{ w.type }} &middot; {{ w.sub_type }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-center">
                  <span
                    v-if="w.binding"
                    class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200"
                  >
                    <Check class="h-3 w-3" />
                    Terikat
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200"
                  >
                    <AlertCircle class="h-3 w-3" />
                    Belum Terikat
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div v-if="w.binding" class="flex items-start gap-2.5">
                    <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                      <Warehouse class="h-4 w-4 text-primary-600" />
                    </div>
                    <div class="min-w-0">
                      <p class="font-medium text-gray-800">{{ w.binding.name }}</p>
                      <p class="mt-0.5 text-xs text-gray-400">{{ w.binding.city }}</p>
                    </div>
                  </div>
                  <span v-else class="text-gray-300">-</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    :class="statusConfig[w.status]?.cls || 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'"
                  >
                    <span class="h-1.5 w-1.5 rounded-full" :class="statusConfig[w.status]?.dot || 'bg-gray-400'" />
                    {{ statusConfig[w.status]?.label || w.status }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <button
                    v-if="w.binding"
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="deletingId === w.id"
                    @click="deleteBinding(w)"
                  >
                    <Loader2 v-if="deletingId === w.id" class="h-3.5 w-3.5 animate-spin" />
                    <Trash2 v-else class="h-3.5 w-3.5" />
                    Hapus Binding
                  </button>
                  <button
                    v-else
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                    @click="openBindingModal(w)"
                  >
                    <Link2 class="h-3.5 w-3.5" />
                    Binding Sekarang
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div v-if="!warehousesLoading && filteredWarehouses.length" class="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
          Menampilkan {{ filteredWarehouses.length }} dari {{ total }} gudang
        </div>
      </div>
    </template>

    <!-- Binding modal -->
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
          v-if="bindingModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          @click.self="closeBindingModal"
        >
          <div class="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-gray-200">
            <!-- Header -->
            <div class="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
              <div class="flex items-center gap-2">
                <Link2 class="h-5 w-5 text-blue-500" />
                <div>
                  <h3 class="text-base font-semibold text-gray-900">Binding Gudang</h3>
                  <p class="mt-0.5 truncate text-xs text-gray-500">{{ bindingTarget?.name }}</p>
                </div>
              </div>
              <button class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="closeBindingModal">
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Search -->
            <div class="shrink-0 border-b border-gray-100 px-5 py-3">
              <div class="relative">
                <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  v-model="warehouseSearch"
                  type="text"
                  placeholder="Cari gudang internal..."
                  class="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  @input="onWarehouseSearch"
                />
                <button
                  v-if="warehouseSearch"
                  type="button"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
                  @click="warehouseSearch = ''; fetchInternalWarehouses()"
                >
                  <X class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <!-- List -->
            <div class="min-h-[200px] flex-1 overflow-y-auto px-2 py-2">
              <div v-if="internalWarehousesLoading" class="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
                <Loader2 class="h-4 w-4 animate-spin" />
                Memuat gudang...
              </div>
              <div v-else-if="!internalWarehouses.length" class="flex flex-col items-center justify-center gap-2 py-10">
                <Inbox class="h-8 w-8 text-gray-300" />
                <p class="text-sm text-gray-400">Gudang tidak ditemukan</p>
              </div>
              <ul v-else class="space-y-1">
                <li
                  v-for="wh in internalWarehouses"
                  :key="wh.id"
                  class="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors"
                  :class="isBoundToCurrentStore(wh)
                    ? 'cursor-not-allowed opacity-50'
                    : selectedWarehouseId === wh.id ? 'cursor-pointer bg-blue-50 ring-1 ring-blue-200' : 'cursor-pointer hover:bg-gray-50'"
                  @click="selectInternalWarehouse(wh)"
                >
                  <div class="min-w-0">
                    <p class="truncate font-medium text-gray-800">{{ wh.name }}</p>
                    <p v-if="isBoundToCurrentStore(wh)" class="truncate text-xs text-amber-600">Sudah dibinding ke toko ini</p>
                    <p v-else-if="wh.address" class="truncate text-xs text-gray-400">{{ wh.address }}</p>
                  </div>
                  <Check v-if="selectedWarehouseId === wh.id" class="h-4 w-4 shrink-0 text-blue-600" />
                </li>
              </ul>
            </div>

            <!-- Footer -->
            <div class="flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                @click="closeBindingModal"
              >
                Batal
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!selectedWarehouseId || submitting"
                @click="saveBinding"
              >
                <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
                Simpan
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

