<script setup lang="ts">
import { ArrowLeft, Trash2, Loader2, Package, Plus, ArrowRight, X, MapPin, Pencil } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

import type { TransferProduct, TransferSku, TransferStockLocation } from '~/components/AppTransferProductPicker.vue'

type Variant = { name: string; value: string }

interface TransferItemRow {
  sku_id: string
  sku: string
  product_id: string
  name: string
  variants: Variant[]
  warehouse_from_id: string
  warehouse_from_name: string
  warehouse_bin_from_id: string
  bin_from_label: string
  total_stock: number
  warehouse_to_id: string
  warehouse_to_name: string
  warehouse_bin_to_id: string
  bin_to_label: string
  qty: number | ''
}

const api = useApi()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const isEdit = computed(() => !!route.query.edit)
const transferId = computed(() => route.query.edit as string)

const saving = ref(false)
const loadingData = ref(false)
const formErrors = ref<Record<string, string[]>>({})

const form = reactive({
  date: new Date().toISOString().slice(0, 10),
  note: '',
})

const transferItems = ref<TransferItemRow[]>([])

// ── Modal state ───────────────────────────────────────────────────────────────
const modalIsOpen = ref(false)
const modalPending = ref<{
  product: TransferProduct | null
  sku: TransferSku | null
  stock: TransferStockLocation | null
}>({ product: null, sku: null, stock: null })

const modalForm = reactive({
  warehouse_to_id: '',
  warehouse_to_name: '',
  warehouse_bin_to_id: '',
  bin_to_label: '',
  qty: '' as number | '',
})

const modalErrors = ref<Record<string, string>>({})

// ── Edit destination modal state ──────────────────────────────────────────────
const editDestModalOpen = ref(false)
const editDestItemIdx = ref(-1)
const editDestModalKey = ref(0)
const editDestForm = reactive({
  warehouse_to_id: '',
  warehouse_to_name: '',
  warehouse_bin_to_id: '',
  bin_to_label: '',
})

// ── Product picker handler ────────────────────────────────────────────────────
function onPickerSelect(product: TransferProduct, sku: TransferSku, stock: TransferStockLocation) {
  // Check duplicate
  const duplicate = transferItems.value.some(
    it => it.sku_id === sku.id && it.warehouse_bin_from_id === stock.warehouse_bin_id,
  )
  if (duplicate) {
    toast.error(`SKU "${sku.sku}" dari lokasi ini sudah ditambahkan`)
    return
  }

  // Open modal
  modalPending.value = { product, sku, stock }
  modalForm.warehouse_to_id = ''
  modalForm.warehouse_to_name = ''
  modalForm.warehouse_bin_to_id = ''
  modalForm.bin_to_label = ''
  modalForm.qty = ''
  modalErrors.value = {}
  modalIsOpen.value = true
}

function closeModal() {
  modalIsOpen.value = false
  modalErrors.value = {}
}

function onModalWarehouseSelect(warehouseId: string, warehouseName: string) {
  modalForm.warehouse_to_id = warehouseId
  modalForm.warehouse_to_name = warehouseName
  modalForm.warehouse_bin_to_id = ''
  modalForm.bin_to_label = ''
}

function onModalBinSelect(bin: { id: string; code: string; label: string }) {
  modalForm.warehouse_bin_to_id = bin.id
  modalForm.bin_to_label = bin.label
}

function addFromModal() {
  modalErrors.value = {}

  if (!modalForm.warehouse_to_id) modalErrors.value.warehouse_to_id = 'Gudang tujuan wajib dipilih'
  if (!modalForm.warehouse_bin_to_id) modalErrors.value.warehouse_bin_to_id = 'Lokasi tujuan wajib dipilih'
  if (!modalForm.qty || Number(modalForm.qty) <= 0) modalErrors.value.qty = 'Qty harus lebih dari 0'

  if (Object.keys(modalErrors.value).length) return

  const { product, sku, stock } = modalPending.value
  if (!product || !sku || !stock) return

  const binLabelFrom = [stock.zone?.code, stock.rack?.code, stock.bin?.code].filter(Boolean).join(' / ') || 'Default'

  transferItems.value.push({
    sku_id: sku.id,
    sku: sku.sku,
    product_id: product.id,
    name: product.name,
    variants: sku.variants || [],
    warehouse_from_id: stock.warehouse_id || '',
    warehouse_from_name: stock.warehouse?.name || '',
    warehouse_bin_from_id: stock.warehouse_bin_id,
    bin_from_label: binLabelFrom,
    total_stock: stock.stock,
    warehouse_to_id: modalForm.warehouse_to_id,
    warehouse_to_name: modalForm.warehouse_to_name,
    warehouse_bin_to_id: modalForm.warehouse_bin_to_id,
    bin_to_label: modalForm.bin_to_label,
    qty: Number(modalForm.qty),
  })

  toast.success('Item berhasil ditambahkan')
  modalIsOpen.value = false
}

// ── Edit destination ──────────────────────────────────────────────────────────
function openEditDest(idx: number) {
  const item = transferItems.value[idx]
  if (!item) return
  editDestItemIdx.value = idx
  editDestForm.warehouse_to_id = item.warehouse_to_id
  editDestForm.warehouse_to_name = item.warehouse_to_name
  editDestForm.warehouse_bin_to_id = item.warehouse_bin_to_id
  editDestForm.bin_to_label = item.bin_to_label
  editDestModalKey.value++ // Force re-render of pickers
  editDestModalOpen.value = true
}

function closeEditDestModal() {
  editDestModalOpen.value = false
}

function onEditDestWarehouseSelect(warehouseId: string, warehouseName: string) {
  editDestForm.warehouse_to_id = warehouseId
  editDestForm.warehouse_to_name = warehouseName
  editDestForm.warehouse_bin_to_id = ''
  editDestForm.bin_to_label = ''
}

function onEditDestBinSelect(bin: { id: string; code: string; label: string }) {
  editDestForm.warehouse_bin_to_id = bin.id
  editDestForm.bin_to_label = bin.label
}

function saveEditDest() {
  if (!editDestForm.warehouse_to_id || !editDestForm.warehouse_bin_to_id) {
    toast.error('Pilih gudang dan lokasi tujuan')
    return
  }
  const item = transferItems.value[editDestItemIdx.value]
  if (!item) return
  item.warehouse_to_id = editDestForm.warehouse_to_id
  item.warehouse_to_name = editDestForm.warehouse_to_name
  item.warehouse_bin_to_id = editDestForm.warehouse_bin_to_id
  item.bin_to_label = editDestForm.bin_to_label
  editDestModalOpen.value = false
  toast.success('Lokasi tujuan diperbarui')
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function removeItem(idx: number) {
  transferItems.value.splice(idx, 1)
}

// ── Load edit data ────────────────────────────────────────────────────────────
async function loadData() {
  if (!isEdit.value) return
  loadingData.value = true
  try {
    const res = await api.get<{ data: any }>(`/inventories/transfers/${transferId.value}/edit`)
    const d = res.data
    form.date = d.date ? d.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
    form.note = d.note || ''

    transferItems.value = (d.items || []).map((it: any): TransferItemRow => {
      const binFromLabel = [it.zone_from?.code, it.rack_from?.code, it.bin_from?.code]
        .filter(Boolean)
        .join(' / ') || 'Default'
      const binToLabel = [it.zone_to?.code, it.rack_to?.code, it.bin_to?.code]
        .filter(Boolean)
        .join(' / ') || 'Default'

      return {
        sku_id: it.sku_id,
        sku: it.sku,
        product_id: it.product_id,
        name: it.name,
        variants: it.variants || [],
        warehouse_from_id: it.warehouse_from_id,
        warehouse_from_name: it.warehouse_from?.name || '',
        warehouse_bin_from_id: it.warehouse_bin_from_id,
        bin_from_label: binFromLabel,
        total_stock: it.stock,
        warehouse_to_id: it.warehouse_to_id,
        warehouse_to_name: it.warehouse_to?.name || '',
        warehouse_bin_to_id: it.warehouse_bin_to_id,
        bin_to_label: binToLabel,
        qty: it.qty,
      }
    })

    if (transferItems.value.length === 0) transferItems.value = []
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data')
    router.push('/inventory/transfer')
  }
  finally {
    loadingData.value = false
  }
}

// ── Validation & Submit ───────────────────────────────────────────────────────
function getFieldError(key: string): string | undefined {
  return formErrors.value[key]?.[0]
}

async function handleSubmit(status: 'draft' | 'completed') {
  formErrors.value = {}

  if (!transferItems.value.length) {
    formErrors.value = { items: ['Minimal 1 item wajib diisi'] }
    return
  }

  const errors: Record<string, string[]> = {}
  for (const [i, it] of transferItems.value.entries()) {
    if (!it.sku_id) {
      errors[`items[${i}].sku_id`] = ['SKU wajib dipilih']
    }
    if (!it.warehouse_from_id) {
      errors[`items[${i}].warehouse_from_id`] = ['Gudang asal wajib dipilih']
    }
    if (!it.warehouse_bin_from_id) {
      errors[`items[${i}].warehouse_bin_from_id`] = ['Lokasi asal wajib dipilih']
    }
    if (!it.warehouse_to_id) {
      errors[`items[${i}].warehouse_to_id`] = ['Gudang tujuan wajib dipilih']
    }
    if (!it.warehouse_bin_to_id) {
      errors[`items[${i}].warehouse_bin_to_id`] = ['Lokasi tujuan wajib dipilih']
    }
    if (it.qty === '' || Number(it.qty) <= 0) {
      errors[`items[${i}].qty`] = ['Qty harus lebih dari 0']
    }
  }

  if (Object.keys(errors).length) {
    formErrors.value = errors
    toast.error('Periksa kembali isian form')
    return
  }

  saving.value = true
  try {
    const payload = {
      date: form.date,
      note: form.note,
      status,
      items: transferItems.value.map(it => ({
        sku_id: it.sku_id,
        warehouse_from_id: it.warehouse_from_id,
        warehouse_bin_from_id: it.warehouse_bin_from_id,
        warehouse_to_id: it.warehouse_to_id,
        warehouse_bin_to_id: it.warehouse_bin_to_id,
        qty: Number(it.qty),
      })),
    }

    if (isEdit.value) {
      await api.put(`/inventories/transfers/${transferId.value}`, payload)
      toast.success('Transfer stok berhasil diperbarui')
    }
    else {
      await api.post('/inventories/transfers/create', payload)
      toast.success(status === 'completed' ? 'Transfer stok berhasil diselesaikan' : 'Draft transfer stok berhasil disimpan')
    }
    router.push('/inventory/transfer')
  }
  catch (err: any) {
    if (err.errors) formErrors.value = err.errors
    else toast.error(err.message || 'Gagal menyimpan')
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  if (isEdit.value) loadData()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/inventory/transfer"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
        {{ isEdit ? 'Edit Transfer Stok' : 'Buat Transfer Stok' }}
      </h1>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loadingData" class="space-y-4">
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200 space-y-4">
        <div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
        <div class="grid gap-4 sm:grid-cols-2">
          <div v-for="i in 2" :key="i" class="space-y-1.5">
            <div class="h-3 w-20 animate-pulse rounded bg-gray-200" />
            <div class="h-9 w-full animate-pulse rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
    </div>

    <div v-else class="space-y-4">
      <!-- Info -->
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <h2 class="mb-4 text-sm font-semibold text-gray-900">Informasi Transfer</h2>
        <div class="grid gap-4 sm:grid-cols-3"> 
          <div class="sm:col-span-2">
            <label class="mb-1.5 block text-xs font-medium text-gray-700">Catatan</label>
            <textarea
              v-model="form.note"
              rows="1"
              placeholder="Catatan transfer..."
              class="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>
      </div>

      <!-- Product Picker -->
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <h2 class="mb-3 text-sm font-semibold text-gray-900">Tambah Item Transfer</h2>
        <AppTransferProductPicker
          :used-locations="transferItems.map(it => ({ sku_id: it.sku_id, warehouse_bin_id: it.warehouse_bin_from_id }))"
          :error="getFieldError('items')"
          @select="onPickerSelect"
        />
        <p v-if="getFieldError('items')" class="mt-1 text-xs text-red-500">{{ getFieldError('items') }}</p>
      </div>

      <!-- Items Table -->
      <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 class="text-sm font-semibold text-gray-900">
            Item Transfer
            <span class="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
              {{ transferItems.length }}
            </span>
          </h2>
        </div>

        <!-- Empty state -->
        <div v-if="!transferItems.length" class="px-5 py-14 text-center">
          <Package class="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p class="text-sm font-medium text-gray-500">Belum ada item transfer</p>
          <p class="mt-0.5 text-xs text-gray-400">Cari dan pilih produk/SKU di atas untuk menambahkan.</p>
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[800px] text-sm">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                <th class="px-4 py-3 text-left" style="width: 40px">#</th>
                <th class="px-4 py-3 text-left">Produk / SKU</th>
                <th class="px-4 py-3 text-left">Lokasi Asal</th>
                <th class="px-4 py-3 text-left">Lokasi Tujuan</th>
                <th class="px-4 py-3 text-right" style="width: 120px">Qty</th>
                <th class="px-4 py-3 text-center" style="width: 80px">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) in transferItems"
                :key="idx"
                class="border-b border-gray-100 last:border-b-0"
              >
                <!-- No -->
                <td class="px-4 py-3 text-gray-500">{{ idx + 1 }}</td>

                <!-- Product/SKU -->
                <td class="px-4 py-3">
                  <p class="font-semibold text-gray-800">{{ item.name }}</p>
                  <div class="mt-0.5 flex flex-wrap items-center gap-1">
                    <span class="font-mono text-xs text-gray-600">{{ item.sku }}</span>
                    <span
                      v-for="v in item.variants"
                      :key="v.name"
                      class="rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-600"
                    >{{ v.value }}</span>
                  </div>
                  <p
                    v-if="getFieldError(`items[${idx}].sku_id`)"
                    class="mt-0.5 text-xs text-red-500"
                  >{{ getFieldError(`items[${idx}].sku_id`) }}</p>
                </td>

                <!-- From Location -->
                <td class="px-4 py-3">
                  <div class="flex items-start gap-1.5">
                    <MapPin class="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
                    <div>
                      <p class="font-medium text-gray-700">{{ item.warehouse_from_name }}</p>
                      <p class="text-xs text-gray-500">{{ item.bin_from_label }}</p>
                      <p class="text-[10px] text-gray-400">Stok: {{ item.total_stock }}</p>
                    </div>
                  </div>
                </td>

                <!-- To Location -->
                <td class="px-4 py-3">
                  <div v-if="item.warehouse_bin_to_id" class="flex items-start gap-1.5">
                    <MapPin class="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                    <div class="flex-1">
                      <p class="font-medium text-gray-700">{{ item.warehouse_to_name }}</p>
                      <p class="text-xs text-gray-500">{{ item.bin_to_label }}</p>
                    </div>
                    <button
                      type="button"
                      class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-primary-600 transition-colors"
                      title="Edit tujuan"
                      @click="openEditDest(idx)"
                    >
                      <Pencil class="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    v-else
                    type="button"
                    class="text-xs text-red-500 hover:underline"
                    @click="openEditDest(idx)"
                  >
                    Pilih tujuan
                  </button>
                  <p
                    v-if="getFieldError(`items[${idx}].warehouse_to_id`) || getFieldError(`items[${idx}].warehouse_bin_to_id`)"
                    class="mt-0.5 text-xs text-red-500"
                  >
                    {{ getFieldError(`items[${idx}].warehouse_to_id`) || getFieldError(`items[${idx}].warehouse_bin_to_id`) }}
                  </p>
                </td>

                <!-- Qty -->
                <td class="px-4 py-3">
                  <input
                    v-model.number="item.qty"
                    type="number"
                    min="1"
                    :max="item.total_stock"
                    class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm font-semibold text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    :class="{ 'border-red-300': getFieldError(`items[${idx}].qty`) }"
                  />
                  <p v-if="getFieldError(`items[${idx}].qty`)" class="mt-0.5 text-xs text-red-500">
                    {{ getFieldError(`items[${idx}].qty`) }}
                  </p>
                </td>

                <!-- Actions -->
                <td class="px-4 py-3 text-center">
                  <button
                    type="button"
                    class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Hapus"
                    @click="removeItem(idx)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="h-20" />
    </div>

    <!-- Sticky Action Bar -->
    <div v-if="!loadingData" class="sticky bottom-0 flex items-center justify-end gap-3 rounded-xl bg-white/90 px-5 py-4 shadow-sm ring-1 ring-gray-200 backdrop-blur">
      <NuxtLink
        to="/inventory/transfer"
        class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
      >
        Batal
      </NuxtLink>
      <button
        type="button"
        :disabled="saving || !transferItems.length"
        class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-xs transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleSubmit('draft')"
      >
        <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
        Simpan Draft
      </button>
      <button
        type="button"
        :disabled="saving || !transferItems.length"
        class="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleSubmit('completed')"
      >
        <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
        <ArrowRight v-else class="h-4 w-4" />
        Selesaikan Transfer
      </button>
    </div>

    <!-- Add Modal -->
    <Teleport to="body">
      <div
        v-if="modalIsOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="closeModal"
      >
        <div class="w-full max-w-lg rounded-xl bg-white shadow-xl">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h3 class="text-lg font-semibold text-gray-900">Tambah Item Transfer</h3>
            <button
              type="button"
              class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              @click="closeModal"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="space-y-4 px-5 py-4">
            <!-- Product info -->
            <div class="rounded-lg bg-gray-50 p-3">
              <p class="text-xs font-medium text-gray-500">Produk</p>
              <p class="mt-0.5 font-semibold text-gray-800">{{ modalPending.product?.name }}</p>
              <div class="mt-1 flex flex-wrap items-center gap-1">
                <span class="font-mono text-xs text-gray-600">{{ modalPending.sku?.sku }}</span>
                <span
                  v-for="v in modalPending.sku?.variants"
                  :key="v.name"
                  class="rounded bg-gray-200 px-1 py-0.5 text-[10px] text-gray-600"
                >{{ v.value }}</span>
              </div>
            </div>

            <!-- From location (readonly) -->
            <div class="rounded-lg border border-gray-200 p-3">
              <p class="text-xs font-medium text-gray-500">Lokasi Asal</p>
              <div class="mt-1 flex items-center gap-1.5">
                <MapPin class="h-3 w-3 text-gray-400" />
                <span class="text-sm font-medium text-gray-700">{{ modalPending.stock?.warehouse?.name }}</span>
                <span class="text-gray-400">›</span>
                <span class="text-sm text-gray-600">
                  {{ [modalPending.stock?.zone?.code, modalPending.stock?.rack?.code, modalPending.stock?.bin?.code].filter(Boolean).join(' / ') || 'Default' }}
                </span>
              </div>
              <p class="mt-0.5 text-xs text-gray-500">Stok tersedia: <strong>{{ modalPending.stock?.stock }}</strong></p>
            </div>

            <!-- Warehouse To -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">
                Gudang Tujuan <span class="text-red-500">*</span>
              </label>
              <AppWarehousePicker
                v-model="modalForm.warehouse_to_id"
                @select="(wh: any) => onModalWarehouseSelect(wh.id, wh.name)"
              />
              <p v-if="modalErrors.warehouse_to_id" class="mt-1 text-xs text-red-500">{{ modalErrors.warehouse_to_id }}</p>
            </div>

            <!-- Bin To -->
            <div v-if="modalForm.warehouse_to_id">
              <label class="mb-1.5 block text-sm font-medium text-gray-700">
                Lokasi Tujuan <span class="text-red-500">*</span>
              </label>
              <AppBinPicker
                :warehouse-id="modalForm.warehouse_to_id"
                v-model="modalForm.warehouse_bin_to_id"
                @select="onModalBinSelect"
              />
              <p v-if="modalErrors.warehouse_bin_to_id" class="mt-1 text-xs text-red-500">{{ modalErrors.warehouse_bin_to_id }}</p>
            </div>

            <!-- Qty -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">
                Qty <span class="text-red-500">*</span>
              </label>
              <input
                v-model.number="modalForm.qty"
                type="number"
                min="1"
                :max="modalPending.stock?.stock"
                placeholder="0"
                class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                :class="{ 'border-red-300': modalErrors.qty }"
              />
              <p v-if="modalErrors.qty" class="mt-1 text-xs text-red-500">{{ modalErrors.qty }}</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              @click="closeModal"
            >
              Batal
            </button>
            <button
              type="button"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
              @click="addFromModal"
            >
              Tambah
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit Destination Modal -->
    <Teleport to="body">
      <div
        v-if="editDestModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="closeEditDestModal"
      >
        <div :key="editDestModalKey" class="w-full max-w-md rounded-xl bg-white shadow-xl">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h3 class="text-lg font-semibold text-gray-900">Edit Lokasi Tujuan</h3>
            <button
              type="button"
              class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              @click="closeEditDestModal"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="space-y-4 px-5 py-4">
            <!-- Warehouse To -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">
                Gudang Tujuan <span class="text-red-500">*</span>
              </label>
              <AppWarehousePicker
                v-model="editDestForm.warehouse_to_id"
                @select="(wh: any) => onEditDestWarehouseSelect(wh.id, wh.name)"
              />
            </div>

            <!-- Bin To -->
            <div v-if="editDestForm.warehouse_to_id">
              <label class="mb-1.5 block text-sm font-medium text-gray-700">
                Lokasi Tujuan <span class="text-red-500">*</span>
              </label>
              <AppBinPicker
                :warehouse-id="editDestForm.warehouse_to_id"
                v-model="editDestForm.warehouse_bin_to_id"
                @select="onEditDestBinSelect"
              />
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              @click="closeEditDestModal"
            >
              Batal
            </button>
            <button
              type="button"
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
              @click="saveEditDest"
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
