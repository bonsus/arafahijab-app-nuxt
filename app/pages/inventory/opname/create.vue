<script setup lang="ts">
import { ArrowLeft, Trash2, Loader2, Search, Package, TrendingUp, TrendingDown, Layers } from 'lucide-vue-next'

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
  stock_system: number
  stock_counted: number | ''
  price: number | ''
}

const api = useApi()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const isEdit = computed(() => !!route.query.edit)
const opnameId = computed(() => route.query.edit as string)

const saving = ref(false)
const loadingData = ref(false)
const formErrors = ref<Record<string, string[]>>({})

// SKU search state
const skuInput = ref('')
const searching = ref(false)
const searchError = ref('')
const skuInputRef = ref<HTMLInputElement | null>(null)

// Bin modal state (for SKU with no bins)
const showBinModal = ref(false)
const pendingSkuResult = ref<SkuLookupResult | null>(null)
const pendingBinId = ref('')
const pendingBinLabel = ref('')

const form = reactive({
  warehouse_id: '',
  no: '',
  date: new Date().toISOString().slice(0, 10),
  status: 'draft',
  note: '',
})

const items = ref<ItemRow[]>([])

// ── Computed ────────────────────────────────────────────────────────────────────
const getStockCounted = (item: ItemRow) =>
  item.stock_counted !== '' ? Number(item.stock_counted) : 0

const getStockChange = (item: ItemRow) =>
  getStockCounted(item) - item.stock_system

const getItemTotal = (item: ItemRow) => {
  const change = getStockChange(item)
  if (change <= 0 || item.price === '') return 0
  return Number(item.price) * change
}

const grandTotal = computed(() =>
  items.value.reduce((sum, i) => sum + getItemTotal(i), 0),
)

const totalIncrease = computed(() =>
  items.value.reduce((sum, i) => {
    const c = getStockChange(i)
    return sum + (c > 0 ? c : 0)
  }, 0),
)

const totalDecrease = computed(() =>
  items.value.reduce((sum, i) => {
    const c = getStockChange(i)
    return sum + (c < 0 ? Math.abs(c) : 0)
  }, 0),
)

// ── SKU Search & Auto-Add ───────────────────────────────────────────────────────
async function searchAndAddSku() {
  if (!form.warehouse_id) {
    toast.error('Pilih gudang terlebih dahulu')
    return
  }
  const q = skuInput.value.trim()
  if (!q) return

  searching.value = true
  searchError.value = ''
  try {
    const res = await api.get<{ data: SkuLookupResult }>('/inventories/stock-adjustments/product-sku', {
      warehouse_id: form.warehouse_id,
      sku: q,
    })
    const d = res.data

    // No bins — ask user to pick a bin via modal
    if (!d.bins?.length) {
      pendingSkuResult.value = d
      pendingBinId.value = ''
      pendingBinLabel.value = ''
      showBinModal.value = true
      return
    }

    const bins = d.bins
    let addedCount = 0

    for (const bin of bins) {
      const binId = bin?.id || ''
      const exists = items.value.some(
        i => i.sku_id === d.sku_id && i.warehouse_bin_id === binId,
      )
      if (exists) continue

      const binLabel = bin
        ? [bin.zone?.code, bin.rack?.code, bin.code].filter(Boolean).join(' / ')
        : '-'

      items.value.push({
        product_id: d.product_id,
        sku_id: d.sku_id,
        sku: d.sku,
        name: d.name,
        variants: d.variants || [],
        warehouse_bin_id: binId,
        bin_label: binLabel,
        stock_system: bin?.stock ?? d.stock,
        stock_counted: '',
        price: bin ? (Number(bin.price) || '') : (Number(d.price) || ''),
      })
      addedCount++
    }

    if (addedCount === 0) {
      searchError.value = `SKU "${d.sku}" sudah ditambahkan di semua bin`
    }
    else {
      skuInput.value = ''
      searchError.value = ''
    }
  }
  catch {
    searchError.value = 'SKU tidak ditemukan'
  }
  finally {
    searching.value = false
    skuInputRef.value?.focus()
  }
}

function removeRow(index: number) {
  items.value.splice(index, 1)
}

// ── Bin Modal ──────────────────────────────────────────────────────────────────
function confirmBinSelection() {
  const d = pendingSkuResult.value
  if (!d || !pendingBinId.value) return

  items.value.push({
    product_id: d.product_id,
    sku_id: d.sku_id,
    sku: d.sku,
    name: d.name,
    variants: d.variants || [],
    warehouse_bin_id: pendingBinId.value,
    bin_label: pendingBinLabel.value || pendingBinId.value,
    stock_system: 0,
    stock_counted: '',
    price: Number(d.price) || '',
  })

  showBinModal.value = false
  pendingSkuResult.value = null
  pendingBinId.value = ''
  pendingBinLabel.value = ''
  skuInput.value = ''
  skuInputRef.value?.focus()
}

function cancelBinModal() {
  showBinModal.value = false
  pendingSkuResult.value = null
  pendingBinId.value = ''
  pendingBinLabel.value = ''
  skuInputRef.value?.focus()
}

// ── Load Edit Data ──────────────────────────────────────────────────────────────
async function loadData() {
  if (!isEdit.value) return
  loadingData.value = true
  try {
    const res = await api.get<{ data: any }>(`/inventories/stock-opnames/${opnameId.value}`)
    const d = res.data
    form.warehouse_id = d.warehouse_id
    form.no = d.no || ''
    form.date = d.date ? d.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
    form.status = d.status
    form.note = d.note || ''

    items.value = (d.items || []).map((item: any) => {
      const binLabel = [item.zone?.code, item.rack?.code, item.bin?.code].filter(Boolean).join(' / ') || '-'
      return {
        product_id: item.product_id,
        sku_id: item.sku_id,
        sku: item.sku,
        name: item.name,
        variants: item.variants || [],
        warehouse_bin_id: item.warehouse_bin_id,
        bin_label: binLabel,
        stock_system: item.stock_system,
        stock_counted: item.stock_counted,
        price: Number(item.price) || '',
      }
    })
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data')
    router.push('/inventory/opname')
  }
  finally {
    loadingData.value = false
  }
}

// ── Submit ──────────────────────────────────────────────────────────────────────
async function handleSubmit() {
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
    if (item.stock_counted === '' || item.stock_counted < 0) {
      errors[`items[${i}].stock_counted`] = ['Stok fisik tidak boleh kosong atau negatif']
    }
    const change = getStockChange(item)
    if (change > 0 && (!item.price || Number(item.price) <= 0)) {
      errors[`items[${i}].price`] = ['Harga wajib diisi untuk penambahan stok']
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
      no: form.no || undefined,
      status: form.status,
      note: form.note,
      items: items.value.map((item) => ({
        warehouse_bin_id: item.warehouse_bin_id,
        product_id: item.product_id,
        sku_id: item.sku_id,
        sku: item.sku,
        name: item.name,
        variants: item.variants,
        stock_system: item.stock_system,
        stock_counted: item.stock_counted !== '' ? Number(item.stock_counted) : 0,
        price: item.price !== '' ? String(item.price) : '0',
      })),
    }

    if (isEdit.value) {
      await api.put(`/inventories/stock-opnames/${opnameId.value}`, payload)
      toast.success('Stock opname berhasil diperbarui')
    }
    else {
      await api.post('/inventories/stock-opnames/create', payload)
      toast.success('Stock opname berhasil dibuat')
    }
    router.push('/inventory/opname')
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

const inlineFields = ['stock_counted', 'price']
function getRowErrors(idx: number): string[] {
  const prefix = `items[${idx}].`
  return Object.entries(formErrors.value)
    .filter(([key]) => key.startsWith(prefix) && !inlineFields.includes(key.slice(prefix.length)))
    .flatMap(([, msgs]) => msgs)
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
        to="/inventory/opname"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
        {{ isEdit ? 'Edit Stock Opname' : 'Buat Stock Opname' }}
      </h1>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loadingData" class="space-y-4">
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200 space-y-4">
        <div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
        <div class="grid gap-4 sm:grid-cols-2">
          <div v-for="i in 4" :key="i" class="space-y-1.5">
            <div class="h-3 w-20 animate-pulse rounded bg-gray-200" />
            <div class="h-9 w-full animate-pulse rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <div class="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div class="mt-4 space-y-3">
          <div v-for="i in 3" :key="i" class="h-12 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    </div>

    <div v-else class="space-y-4">
      <!-- ── Info Opname ──────────────────────────────────────────────────── -->
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <h2 class="mb-4 text-sm font-semibold text-gray-900">Informasi Opname</h2>
        <div class="grid gap-4 sm:grid-cols-4">
          <!-- Gudang -->
          <div>
            <label class="mb-1.5 block text-xs font-medium text-gray-700">
              Gudang <span class="text-red-500">*</span>
            </label>
            <AppWarehousePicker v-model="form.warehouse_id" :disabled="items.length > 0" />
            <p v-if="getFieldError('warehouse_id')" class="mt-1 text-xs text-red-500">
              {{ getFieldError('warehouse_id') }}
            </p>
            <p v-if="items.length > 0" class="mt-1 text-xs text-amber-600">
              Hapus semua item untuk mengganti gudang.
            </p>
          </div>
          <!-- Catatan -->
          <div class="col-span-3">
            <label class="mb-1.5 block text-xs font-medium text-gray-700">Catatan</label>
            <textarea
              v-model="form.note"
              rows="1"
              placeholder="Catatan opname..."
              class="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>
      </div>

      <!-- ── SKU Search + Items ──────────────────────────────────────────────── -->
      <div class="space-y-4">
        <!-- SKU Search Card -->
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <p class="mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Cari & Tambah Produk (SKU)
          </p>
          <div class="flex gap-2">
            <input
              ref="skuInputRef"
              v-model="skuInput"
              type="text"
              placeholder="Ketik kode SKU lalu tekan Enter atau klik Cari..."
              class="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              :class="{ 'border-red-300 focus:border-red-400 focus:ring-red-400/20': searchError }"
              :disabled="searching"
              @keydown.enter.prevent="searchAndAddSku"
            />
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              :disabled="searching || !skuInput.trim()"
              @click="searchAndAddSku"
            >
              <Loader2 v-if="searching" class="h-4 w-4 animate-spin" />
              <Search v-else class="h-4 w-4" />
              Cari
            </button>
          </div>
          <p v-if="searchError" class="mt-1.5 text-xs text-red-500">{{ searchError }}</p>
          <p v-if="!form.warehouse_id" class="mt-1.5 text-xs text-amber-600">
            Pilih gudang terlebih dahulu sebelum mencari produk.
          </p>
        </div>

        <!-- Items Table Card -->
        <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
          <div class="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
            <h2 class="text-sm font-semibold text-gray-900">
              Item Opname
              <span class="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                {{ items.length }}
              </span>
            </h2>
          </div>

          <p v-if="getFieldError('items')" class="px-5 py-2 text-xs text-red-500">
            {{ getFieldError('items') }}
          </p>

          <!-- Empty state -->
          <div v-if="items.length === 0" class="px-5 py-14 text-center">
            <Package class="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p class="text-sm font-medium text-gray-500">Belum ada item</p>
            <p class="mt-0.5 text-xs text-gray-400">Gunakan kolom pencarian di atas untuk menambahkan produk.</p>
          </div>

          <!-- Table -->
          <div v-else class="overflow-x-auto">
            <table class="min-w-[820px] w-full text-sm">
              <thead>
                <tr class="border-b border-gray-100 bg-gray-50 text-left text-nowrap">
                  <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-8">#</th>
                  <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">SKU / Produk</th>
                  <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-28">Lokasi</th>
                  <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-24 text-right">Stok Sistem</th>
                  <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-28 text-center">Stok Fisik</th>
                  <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-24 text-right">Selisih</th>
                  <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-32 text-right">Harga</th>
                  <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-28 text-right">Total Selisih</th>
                  <th class="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <template v-for="(item, idx) in items" :key="idx">
                  <tr class="group align-top">
                    <!-- # -->
                    <td class="px-4 py-3 text-xs text-gray-400">{{ idx + 1 }}</td>

                    <!-- SKU / Produk -->
                    <td class="px-4 py-3">
                      <p class="line-clamp-2 text-sm font-medium leading-tight text-gray-900">{{ item.name }}</p>
                      <div class="mt-0.5 flex flex-wrap items-center gap-1 text-xs">
                        <span class="font-mono text-xs font-semibold text-gray-700">{{ item.sku }}</span>
                        <span v-for="v in item.variants" :key="v.name" class="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{{ v.value }}</span>
                      </div>
                    </td>

                    <!-- Lokasi -->
                    <td class="px-4 py-3 text-nowrap">
                      <span class="rounded bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-600">
                        {{ item.bin_label }}
                      </span>
                    </td>

                    <!-- Stok Sistem (read-only) -->
                    <td class="px-4 py-3 text-right text-sm text-gray-600">
                      {{ item.stock_system.toLocaleString('id-ID') }}
                    </td>

                    <!-- Stok Fisik (input) -->
                    <td class="px-4 py-3 text-center">
                      <input
                        v-model.number="item.stock_counted"
                        type="number"
                        min="0"
                        placeholder="0"
                        class="w-full rounded-lg border px-2.5 py-1.5 text-center text-sm font-semibold focus:outline-none focus:ring-2"
                        :class="
                          getStockChange(item) > 0
                            ? 'border-green-300 text-green-700 focus:border-green-400 focus:ring-green-400/20'
                            : getStockChange(item) < 0
                              ? 'border-red-300 text-red-600 focus:border-red-400 focus:ring-red-400/20'
                              : 'border-gray-200 text-gray-700 focus:border-primary-500 focus:ring-primary-500/20'
                        "
                      />
                      <p
                        v-if="getFieldError(`items[${idx}].stock_counted`)"
                        class="mt-1 whitespace-nowrap text-[10px] text-red-500"
                      >
                        {{ getFieldError(`items[${idx}].stock_counted`) }}
                      </p>
                    </td>

                    <!-- Selisih (computed) -->
                    <td class="px-4 py-3 text-right">
                      <span
                        class="text-sm font-semibold"
                        :class="
                          getStockChange(item) > 0
                            ? 'text-green-700'
                            : getStockChange(item) < 0
                              ? 'text-red-600'
                              : 'text-gray-400'
                        "
                      >
                        {{ getStockChange(item) > 0 ? '+' : '' }}{{ getStockChange(item).toLocaleString('id-ID') }}
                      </span>
                    </td>

                    <!-- Harga / Unit -->
                    <td class="px-4 py-3 text-right">
                      <template v-if="getStockChange(item) > 0">
                        <input
                          v-model.number="item.price"
                          type="number"
                          min="0"
                          placeholder="0"
                          class="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-right text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                          :class="{ 'border-red-300 focus:border-red-400 focus:ring-red-400/20': getFieldError(`items[${idx}].price`) }"
                        />
                        <p
                          v-if="getFieldError(`items[${idx}].price`)"
                          class="mt-1 whitespace-nowrap text-[10px] text-red-500"
                        >
                          {{ getFieldError(`items[${idx}].price`) }}
                        </p>
                      </template>
                      <span v-else class="text-sm text-gray-400">—</span>
                    </td>

                    <!-- Total Selisih -->
                    <td class="px-4 py-3 text-right">
                      <span class="text-sm font-semibold text-gray-700">
                        {{ getItemTotal(item) > 0 ? `Rp${formatCurrency(getItemTotal(item))}` : '—' }}
                      </span>
                    </td>

                    <!-- Delete -->
                    <td class="px-3 py-3 text-center">
                      <button
                        type="button"
                        class="rounded-lg p-1 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                        @click="removeRow(idx)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                  <!-- Row-level server errors -->
                  <tr v-if="getRowErrors(idx).length" class="bg-red-50">
                    <td />
                    <td colspan="8" class="px-4 py-1.5">
                      <p v-for="msg in getRowErrors(idx)" :key="msg" class="text-xs text-red-600">
                        {{ msg }}
                      </p>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Summary Cards -->
        <div v-if="items.length > 0" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <!-- Jumlah Item -->
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

          <!-- Total Lebih -->
          <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
            <div class="flex items-center gap-2.5">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                <TrendingUp class="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500">Lebih</p>
                <p class="text-lg font-bold text-green-700">+{{ totalIncrease.toLocaleString('id-ID') }}</p>
              </div>
            </div>
          </div>

          <!-- Total Kurang -->
          <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
            <div class="flex items-center gap-2.5">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                <TrendingDown class="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500">Kurang</p>
                <p class="text-lg font-bold text-red-600">-{{ totalDecrease.toLocaleString('id-ID') }}</p>
              </div>
            </div>
          </div>

          <!-- Total Nilai Selisih -->
          <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
            <div class="flex items-center gap-2.5">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                <Package class="h-4 w-4 text-primary-600" />
              </div>
              <div class="min-w-0">
                <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500">Nilai Selisih</p>
                <p class="truncate text-base font-bold text-gray-900">Rp{{ formatCurrency(grandTotal) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Spacer so sticky bar doesn't cover content -->
        <div class="h-20" />
      </div>
    </div>

    <!-- ── Bin Picker Modal ───────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showBinModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="cancelBinModal"
        >
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="cancelBinModal" />
          <div class="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
            <div class="border-b border-gray-100 px-5 py-4">
              <h3 class="text-sm font-semibold text-gray-900">Pilih Lokasi Bin</h3>
              <p class="mt-0.5 text-xs text-gray-500">
                SKU ini belum memiliki stok di bin manapun. Pilih bin untuk opname.
              </p>
            </div>
            <div v-if="pendingSkuResult" class="border-b border-gray-100 px-5 py-3">
              <p class="text-sm font-medium text-gray-800">{{ pendingSkuResult.name }}</p>
              <div class="mt-1 flex flex-wrap items-center gap-1.5">
                <span class="font-mono text-xs font-semibold text-gray-600">{{ pendingSkuResult.sku }}</span>
                <span
                  v-for="v in pendingSkuResult.variants"
                  :key="v.name"
                  class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                >{{ v.value }}</span>
              </div>
            </div>
            <div class="px-5 py-4">
              <label class="mb-2 block text-xs font-medium text-gray-700">
                Pilih Lokasi (Zone / Rak / Bin) <span class="text-red-500">*</span>
              </label>
              <AppBinPicker
                :warehouse-id="form.warehouse_id"
                v-model="pendingBinId"
                @select="(b) => { pendingBinLabel = b.label }"
              />
              <p v-if="!pendingBinId" class="mt-1.5 text-[10px] text-gray-400">Pilih zone, lalu rak, lalu bin.</p>
            </div>
            <div class="flex justify-end gap-2 border-t border-gray-100 px-5 py-3.5">
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                @click="cancelBinModal"
              >
                Batal
              </button>
              <button
                type="button"
                :disabled="!pendingBinId"
                class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                @click="confirmBinSelection"
              >
                Tambah ke Daftar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Sticky Action Bar ──────────────────────────────────────────────────── -->
    <div v-if="!loadingData" class="sticky bottom-0 flex items-center justify-end gap-3 rounded-xl bg-white/90 px-5 py-4 shadow-sm ring-1 ring-gray-200 backdrop-blur">
      <NuxtLink
        to="/inventory/opname"
        class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
      >
        Batal
      </NuxtLink>
      <button
        type="button"
        :disabled="saving || !items.length"
        class="flex items-center gap-2 rounded-lg bg-gray-500 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        @click="form.status = 'draft'; handleSubmit()"
      >
        <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
        {{ saving ? 'Menyimpan...' : 'Simpan Draft' }}
      </button>
      <button
        type="button"
        :disabled="saving || !items.length"
        class="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        @click="form.status = 'completed'; handleSubmit()"
      >
        <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
        {{ saving ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Selesaikan Opname') }}
      </button>
    </div>
  </div>
</template>
