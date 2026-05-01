<script setup lang="ts">
import { ArrowLeft, Trash2, Loader2, Search, Package, Plus, ArrowLeftRight, Layers, X, MapPin } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Variant { name: string; value: string }

interface StockLocation {
  id: string
  warehouse_bin_id: string
  stock: number
  bin: { id: string; code: string } | null
  rack: { id: string; code: string } | null
  zone: { id: string; code: string } | null
}

interface SkuResult {
  id: string
  product_id: string
  sku: string
  variants: Variant[]
  stocks: StockLocation[]
}

interface ProductResult {
  id: string
  name: string
  category: { id: string; name: string } | null
  skus: SkuResult[]
}

interface FromRow {
  product_id: string
  sku_id: string
  sku: string
  name: string
  variants: Variant[]
  warehouse_bin_id: string
  binLabel: string
  totalStock: number
  qty: number | ''
}

interface ToRow {
  product_id: string
  sku_id: string
  sku: string
  name: string
  variants: Variant[]
  stocks: StockLocation[]
  targetBinId: string
  targetBinLabel: string
  qty: number | ''
}

interface ConversionItemRow {
  froms: FromRow[]
  to: ToRow | null
  fromSearch: string
  fromSearching: boolean
  fromSearchError: string
  fromResults: ProductResult[]
  showFromDropdown: boolean
  toSearch: string
  toSearching: boolean
  toSearchError: string
  toResults: ProductResult[]
  showToDropdown: boolean
  showToBinPicker: boolean
}

const api = useApi()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const isEdit = computed(() => !!route.query.edit)
const convId = computed(() => route.query.edit as string)

const saving = ref(false)
const loadingData = ref(false)
const formErrors = ref<Record<string, string[]>>({})

const form = reactive({
  warehouse_id: '', 
  date: new Date().toISOString().slice(0, 10),
  note: '',
})

const conversionItems = ref<ConversionItemRow[]>([])

// ── Helpers ──────────────────────────────────────────────────────────────────
function newItem(): ConversionItemRow {
  return {
    froms: [],
    to: null,
    fromSearch: '',
    fromSearching: false,
    fromSearchError: '',
    fromResults: [],
    showFromDropdown: false,
    toSearch: '',
    toSearching: false,
    toSearchError: '',
    toResults: [],
    showToDropdown: false,
    showToBinPicker: false,
  }
}

function addItem() {
  conversionItems.value.push(newItem())
}

function removeItem(idx: number) {
  conversionItems.value.splice(idx, 1)
}

// ── Product search helpers ────────────────────────────────────────────────────
const fromSearchTimers = new Map<number, ReturnType<typeof setTimeout>>()
const toSearchTimers = new Map<number, ReturnType<typeof setTimeout>>()

function delayHideDropdown(item: ConversionItemRow, type: 'from' | 'to') {
  window.setTimeout(() => {
    if (type === 'from') item.showFromDropdown = false
    else item.showToDropdown = false
  }, 150)
}

function onFromSearchInput(itemIdx: number) {
  const item = conversionItems.value[itemIdx]
  if (!item) return
  item.showFromDropdown = false
  const existing = fromSearchTimers.get(itemIdx)
  if (existing) clearTimeout(existing)
  if (!item.fromSearch.trim()) { item.fromResults = []; return }
  fromSearchTimers.set(itemIdx, setTimeout(() => searchFromProducts(itemIdx), 300))
}

async function searchFromProducts(itemIdx: number) {
  const item = conversionItems.value[itemIdx]
  if (!item || !form.warehouse_id) return
  const q = item.fromSearch.trim()
  if (!q) return
  item.fromSearching = true
  try {
    const res = await api.get<{ data: { data: ProductResult[] } }>('/inventories/products/index', {
      search: q,
      warehouse_id: form.warehouse_id,
    })
    item.fromResults = res.data?.data || []
    item.showFromDropdown = true
  }
  catch { item.fromResults = [] }
  finally { item.fromSearching = false }
}

function selectFromSkuLocation(itemIdx: number, product: ProductResult, sku: SkuResult, stock: StockLocation | null) {
  const item = conversionItems.value[itemIdx]
  if (!item) return
  const binId = stock?.warehouse_bin_id ?? ''
  const exists = item.froms.some(f => f.sku_id === sku.id && f.warehouse_bin_id === binId)
  if (exists) {
    item.fromSearchError = `SKU "${sku.sku}" di lokasi ini sudah ditambahkan`
    item.showFromDropdown = false
    return
  }
  if (item.to?.sku_id === sku.id) {
    item.fromSearchError = 'SKU sumber tidak boleh sama dengan SKU hasil'
    item.showFromDropdown = false
    return
  }
  const binLabel = stock
    ? [stock.zone?.code, stock.rack?.code, stock.bin?.code].filter(Boolean).join(' / ')
    : ''
  item.froms.push({
    product_id: product.id,
    sku_id: sku.id,
    sku: sku.sku,
    name: product.name,
    variants: sku.variants || [],
    warehouse_bin_id: binId,
    binLabel,
    totalStock: stock?.stock ?? 0,
    qty: '',
  })
  item.fromSearch = ''
  item.fromSearchError = ''
  item.fromResults = []
  item.showFromDropdown = false
}

function removeFrom(itemIdx: number, fromIdx: number) {
  conversionItems.value[itemIdx]?.froms.splice(fromIdx, 1)
}

function onToSearchInput(itemIdx: number) {
  const item = conversionItems.value[itemIdx]
  if (!item) return
  item.showToDropdown = false
  const existing = toSearchTimers.get(itemIdx)
  if (existing) clearTimeout(existing)
  if (!item.toSearch.trim()) { item.toResults = []; return }
  toSearchTimers.set(itemIdx, setTimeout(() => searchToProducts(itemIdx), 300))
}

async function searchToProducts(itemIdx: number) {
  const item = conversionItems.value[itemIdx]
  if (!item || !form.warehouse_id) return
  const q = item.toSearch.trim()
  if (!q) return
  item.toSearching = true
  try {
    const res = await api.get<{ data: { data: ProductResult[] } }>('/inventories/products/index', {
      search: q,
      warehouse_id: form.warehouse_id,
    })
    item.toResults = res.data?.data || []
    item.showToDropdown = true
  }
  catch { item.toResults = [] }
  finally { item.toSearching = false }
}

function selectToSku(itemIdx: number, product: ProductResult, sku: SkuResult) {
  const item = conversionItems.value[itemIdx]
  if (!item) return
  const fromConflict = item.froms.some(f => f.sku_id === sku.id)
  if (fromConflict) {
    item.toSearchError = 'SKU hasil tidak boleh sama dengan salah satu SKU sumber'
    item.showToDropdown = false
    return
  }
  const firstStock = sku.stocks?.[0] ?? null
  item.to = {
    product_id: product.id,
    sku_id: sku.id,
    sku: sku.sku,
    name: product.name,
    variants: sku.variants || [],
    stocks: sku.stocks || [],
    targetBinId: firstStock?.warehouse_bin_id ?? '',
    targetBinLabel: firstStock
      ? ([firstStock.zone?.code, firstStock.rack?.code, firstStock.bin?.code].filter(Boolean).join(' / ') || 'Default')
      : '',
    qty: '',
  }
  item.toSearch = ''
  item.toSearchError = ''
  item.toResults = []
  item.showToDropdown = false
}

function clearTo(itemIdx: number) {
  const item = conversionItems.value[itemIdx]
  if (!item) return
  item.to = null
  item.toSearch = ''
  item.toSearchError = ''
  item.toResults = []
  item.showToDropdown = false
  item.showToBinPicker = false
}

function selectToBin(itemIdx: number, binId: string, binLabel: string) {
  const item = conversionItems.value[itemIdx]
  if (!item?.to) return
  item.to.targetBinId = binId
  item.to.targetBinLabel = binLabel
  item.showToBinPicker = false
}

// ── Load Edit Data ───────────────────────────────────────────────────────────
async function loadData() {
  if (!isEdit.value) return
  loadingData.value = true
  try {
    const res = await api.get<{ data: any }>(`/inventories/conversions/${convId.value}`)
    const d = res.data
    form.warehouse_id = d.warehouse_id 
    form.date = d.date ? d.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
    form.note = d.note || ''

    conversionItems.value = (d.item_tos || []).map((itemTo: any) => {
      const froms: FromRow[] = (itemTo.item_froms || []).map((f: any) => ({
        product_id: f.product_id,
        sku_id: f.sku_id,
        sku: f.sku,
        name: f.name,
        variants: f.variants || [],
        warehouse_bin_id: f.warehouse_bin_id || '',
        binLabel: f.warehouse_bin_id || '',
        totalStock: 0,
        qty: f.qty,
      }))

      const toRow: ToRow = {
        product_id: itemTo.product_id,
        sku_id: itemTo.sku_id,
        sku: itemTo.sku,
        name: itemTo.name,
        variants: itemTo.variants || [],
        stocks: [],
        targetBinId: '',
        targetBinLabel: '',
        qty: itemTo.qty,
      }

      return {
        froms,
        to: toRow,
        fromSearch: '',
        fromSearching: false,
        fromSearchError: '',
        fromResults: [],
        showFromDropdown: false,
        toSearch: '',
        toSearching: false,
        toSearchError: '',
        toResults: [],
        showToDropdown: false,
        showToBinPicker: false,
      } as ConversionItemRow
    })

    if (conversionItems.value.length === 0) {
      conversionItems.value.push(newItem())
    }
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data')
    router.push('/inventory/conversion')
  }
  finally {
    loadingData.value = false
  }
}

// ── Validation & Submit ──────────────────────────────────────────────────────
function getFieldError(key: string): string | undefined {
  return formErrors.value[key]?.[0]
}

async function handleSubmit(status: 'draft' | 'completed') {
  formErrors.value = {}

  if (!form.warehouse_id) {
    formErrors.value = { warehouse_id: ['Gudang wajib dipilih'] }
    return
  }

  if (!conversionItems.value.length) {
    formErrors.value = { items: ['Minimal 1 item konversi wajib diisi'] }
    return
  }

  const errors: Record<string, string[]> = {}

  for (const [i, item] of conversionItems.value.entries()) {
    if (!item.froms.length) {
      errors[`items[${i}].froms`] = ['Minimal 1 SKU sumber wajib diisi']
    }
    else {
      for (const [j, f] of item.froms.entries()) {
        if (f.qty === '' || Number(f.qty) <= 0) {
          errors[`items[${i}].froms[${j}].qty`] = ['Qty harus lebih dari 0']
        }
      }
    }
    if (!item.to) {
      errors[`items[${i}].to`] = ['SKU hasil wajib dipilih']
    }
    else {
      if (item.to.qty === '' || Number(item.to.qty) <= 0) {
        errors[`items[${i}].to.qty`] = ['Qty hasil harus lebih dari 0']
      }
      if (!item.to.targetBinId) {
        errors[`items[${i}].to.warehouse_bin_id`] = ['Lokasi tujuan wajib dipilih']
      }
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
      warehouse_id: form.warehouse_id, 
      note: form.note,
      status,
      items: conversionItems.value.map(item => ({
        froms: item.froms.map(f => ({
          sku_id: f.sku_id,
          qty: Number(f.qty),
          ...(f.warehouse_bin_id ? { warehouse_bin_id: f.warehouse_bin_id } : {}),
        })),
        to: {
          sku_id: item.to!.sku_id,
          qty: Number(item.to!.qty),
          ...(item.to!.targetBinId ? { warehouse_bin_id: item.to!.targetBinId } : {}),
        },
      })),
    }

    if (isEdit.value) {
      await api.put(`/inventories/conversions/${convId.value}`, payload)
      toast.success('Konversi stok berhasil diperbarui')
    }
    else {
      await api.post('/inventories/conversions/create', payload)
      toast.success(status === 'completed' ? 'Konversi stok berhasil diselesaikan' : 'Draft konversi stok berhasil disimpan')
    }
    router.push('/inventory/conversion')
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
  if (isEdit.value) {
    loadData()
  }
  else {
    conversionItems.value.push(newItem())
  }
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/inventory/conversion"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
        {{ isEdit ? 'Edit Konversi Stok' : 'Buat Konversi Stok' }}
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
          <div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    </div>

    <div v-else class="space-y-4">
      <!-- ── Info Konversi ──────────────────────────────────────────────────── -->
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <h2 class="mb-4 text-sm font-semibold text-gray-900">Informasi Konversi</h2>
        <div class="grid gap-4 sm:grid-cols-4">
          <!-- Gudang -->
          <div>
            <label class="mb-1.5 block text-xs font-medium text-gray-700">
              Gudang <span class="text-red-500">*</span>
            </label>
            <AppWarehousePicker v-model="form.warehouse_id" :disabled="conversionItems.some(i => i.froms.length > 0 || i.to !== null)" />
            <p v-if="getFieldError('warehouse_id')" class="mt-1 text-xs text-red-500">
              {{ getFieldError('warehouse_id') }}
            </p>
            <p v-if="conversionItems.some(i => i.froms.length > 0 || i.to !== null)" class="mt-1 text-xs text-amber-600">
              Hapus semua item untuk mengganti gudang.
            </p>
          </div>
 

          <!-- Catatan -->
          <div class="sm:col-span-2">
            <label class="mb-1.5 block text-xs font-medium text-gray-700">Catatan</label>
            <textarea
              v-model="form.note"
              rows="1"
              placeholder="Catatan konversi..."
              class="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>
      </div>

      <!-- ── Items Konversi ─────────────────────────────────────────────────── -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-900">
            Item Konversi
            <span class="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
              {{ conversionItems.length }}
            </span>
          </h2>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            @click="addItem"
          >
            <Plus class="h-3.5 w-3.5" />
            Tambah Item
          </button>
        </div>

        <p v-if="getFieldError('items')" class="text-xs text-red-500">{{ getFieldError('items') }}</p>

        <!-- Empty state -->
        <div v-if="conversionItems.length === 0" class="rounded-xl bg-white px-5 py-14 text-center shadow-xs ring-1 ring-gray-200">
          <ArrowLeftRight class="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p class="text-sm font-medium text-gray-500">Belum ada item konversi</p>
          <p class="mt-0.5 text-xs text-gray-400">Klik "Tambah Item" untuk menambahkan konversi.</p>
          <button
            type="button"
            class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
            @click="addItem"
          >
            <Plus class="h-3.5 w-3.5" />
            Tambah Item
          </button>
        </div>

        <!-- Item Cards -->
        <div
          v-for="(item, idx) in conversionItems"
          :key="idx"
          class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200"
        >
          <!-- Card header -->
          <div class="flex items-center justify-between border-b border-gray-200 px-5 py-3">
            <div class="flex items-center gap-2">
              <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                {{ idx + 1 }}
              </span>
              <span class="text-sm font-semibold text-gray-700">Konversi {{ idx + 1 }}</span>
            </div>
            <button
              type="button"
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              title="Hapus item konversi"
              @click="removeItem(idx)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

          <div class="grid gap-0 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            <!-- Froms / SKU Sumber -->
            <div class="p-4 space-y-3">
              <div class="flex items-center gap-2">
                <div class="flex h-5 w-5 items-center justify-center rounded bg-red-100">
                  <Package class="h-3 w-3 text-red-600" />
                </div>
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-600">SKU Sumber (Dikurangi)</p>
              </div>

              <!-- From search with live dropdown -->
              <div class="relative">
                <div class="relative">
                  <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    v-model="item.fromSearch"
                    type="text"
                    placeholder="Cari nama produk atau kode SKU sumber..."
                    class="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    :class="{ 'border-red-300': item.fromSearchError }"
                    @input="onFromSearchInput(idx)"
                    @keydown.escape="item.showFromDropdown = false"
                    @focus="item.showFromDropdown = !!item.fromResults.length"
                    @blur="delayHideDropdown(item, 'from')"
                  />
                  <Loader2 v-if="item.fromSearching" class="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-gray-400" />
                </div>
                <!-- From dropdown -->
                <div
                  v-if="item.showFromDropdown && item.fromResults.length"
                  class="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
                >
                  <template v-for="product in item.fromResults" :key="product.id">
                    <!-- Product header -->
                    <div class="sticky top-0 border-b border-gray-100 bg-gray-50 px-3 py-1.5">
                      <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-600">{{ product.name }}</p>
                      <p v-if="product.category" class="text-[10px] text-gray-400">{{ product.category.name }}</p>
                    </div>
                    <!-- SKUs -->
                    <template v-for="sku in product.skus" :key="sku.id">
                      <!-- SKU sub-header (non-clickable) -->
                      <div class="flex items-center justify-between border-b border-gray-50 bg-white px-3 py-1.5">
                        <div class="flex flex-wrap items-center gap-1">
                          <span class="font-mono text-xs font-semibold text-gray-700">{{ sku.sku }}</span>
                          <span v-for="v in sku.variants" :key="v.name" class="rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-500">{{ v.value }}</span>
                        </div>
                        <span class="text-[10px] font-bold text-gray-400">{{ sku.stocks.reduce((s, st) => s + st.stock, 0) }}</span>
                      </div>
                      <!-- Per-location rows -->
                      <template v-if="sku.stocks.length">
                        <button
                          v-for="st in sku.stocks"
                          :key="st.warehouse_bin_id"
                          type="button"
                          class="flex w-full items-center justify-between border-b border-gray-50 px-4 py-2 text-xs transition-colors last:border-b-0 hover:bg-primary-50"
                          @mousedown.prevent="selectFromSkuLocation(idx, product, sku, st)"
                        >
                          <div class="flex items-center gap-1.5">
                            <MapPin class="h-3 w-3 shrink-0 text-gray-400" />
                            <span class="text-gray-700">{{ [st.zone?.code, st.rack?.code, st.bin?.code].filter(Boolean).join(' / ') || 'Default' }}</span>
                          </div>
                          <span class="font-bold text-green-700">{{ st.stock }}</span>
                        </button>
                      </template>
                      <div v-else class="flex items-center justify-between border-b border-gray-50 px-4 py-2 text-xs text-gray-400">
                        <span>Stok kosong</span>
                        <span>0</span>
                      </div>
                    </template>
                  </template>
                </div>
              </div>
              <p v-if="item.fromSearchError" class="text-xs text-red-500">{{ item.fromSearchError }}</p>
              <p v-if="getFieldError(`items[${idx}].froms`)" class="text-xs text-red-500">
                {{ getFieldError(`items[${idx}].froms`) }}
              </p>
              <p v-if="!form.warehouse_id" class="text-xs text-amber-600">Pilih gudang terlebih dahulu.</p>

              <!-- Froms table -->
              <div v-if="item.froms.length" class="rounded-lg border border-gray-100 overflow-hidden">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="bg-gray-50 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      <th class="px-3 py-2 text-left">SKU / Produk</th>
                      <th class="px-3 py-2 text-right w-20">Stok</th>
                      <th class="px-3 py-2 text-right w-24">Qty</th>
                      <th class="px-3 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    <tr v-for="(from, fIdx) in item.froms" :key="fIdx" class="align-top">
                      <td class="px-3 py-2">
                        <p class="font-medium text-gray-800 leading-tight">{{ from.name }}</p>
                        <div class="mt-0.5 flex flex-wrap items-center gap-1">
                          <span class="font-mono font-semibold text-gray-600">{{ from.sku }}</span>
                          <span v-for="v in from.variants" :key="v.name" class="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{{ v.value }}</span>
                        </div>
                        <div v-if="from.binLabel" class="mt-1">
                          <span class="inline-flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-[10px] text-green-700">
                            <MapPin class="h-2.5 w-2.5" />
                            {{ from.binLabel }}
                          </span>
                        </div>
                        <p v-if="getFieldError(`items[${idx}].froms[${fIdx}].sku_id`)" class="mt-0.5 text-[10px] text-red-500">
                          {{ getFieldError(`items[${idx}].froms[${fIdx}].sku_id`) }}
                        </p>
                        <p v-if="getFieldError(`items[${idx}].froms[${fIdx}].warehouse_bin_id`)" class="mt-0.5 text-[10px] text-red-500">
                          {{ getFieldError(`items[${idx}].froms[${fIdx}].warehouse_bin_id`) }}
                        </p>
                      </td>
                      <td class="px-3 py-2 text-right text-gray-500">{{ from.totalStock.toLocaleString('id-ID') }}</td>
                      <td class="px-3 py-2">
                        <input
                          v-model.number="from.qty"
                          type="number"
                          min="1"
                          placeholder="0"
                          class="w-full rounded border border-gray-200 px-2 py-1 text-right text-xs font-semibold text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                          :class="{ 'border-red-300': getFieldError(`items[${idx}].froms[${fIdx}].qty`) }"
                        />
                        <p v-if="getFieldError(`items[${idx}].froms[${fIdx}].qty`)" class="mt-0.5 text-[10px] text-red-500">
                          {{ getFieldError(`items[${idx}].froms[${fIdx}].qty`) }}
                        </p>
                      </td>
                      <td class="px-2 py-2 text-center">
                        <button
                          type="button"
                          class="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                          @click="removeFrom(idx, fIdx)"
                        >
                          <X class="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center">
                <p class="text-xs text-gray-400">Belum ada SKU sumber</p>
              </div>
            </div>

            <!-- To / SKU Hasil -->
            <div class="p-4 space-y-3">
              <div class="flex items-center gap-2">
                <div class="flex h-5 w-5 items-center justify-center rounded bg-green-100">
                  <Layers class="h-3 w-3 text-green-600" />
                </div>
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-600">SKU Hasil (Ditambah)</p>
              </div>

              <!-- To search — only show if no to yet -->
              <template v-if="!item.to">
                <!-- To search with live dropdown -->
                <div class="relative">
                  <div class="relative">
                    <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      v-model="item.toSearch"
                      type="text"
                      placeholder="Cari nama produk atau kode SKU hasil..."
                      class="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      :class="{ 'border-red-300': item.toSearchError }"
                      @input="onToSearchInput(idx)"
                      @keydown.escape="item.showToDropdown = false"
                      @focus="item.showToDropdown = !!item.toResults.length"
                      @blur="delayHideDropdown(item, 'to')"
                    />
                    <Loader2 v-if="item.toSearching" class="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-gray-400" />
                  </div>
                  <!-- To dropdown -->
                  <div
                    v-if="item.showToDropdown && item.toResults.length"
                    class="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
                  >
                    <template v-for="product in item.toResults" :key="product.id">
                      <div class="sticky top-0 border-b border-gray-100 bg-gray-50 px-3 py-1.5">
                        <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-600">{{ product.name }}</p>
                        <p v-if="product.category" class="text-[10px] text-gray-400">{{ product.category.name }}</p>
                      </div>
                      <button
                        v-for="sku in product.skus"
                        :key="sku.id"
                        type="button"
                        class="flex w-full items-start gap-2 border-b border-gray-50 px-3 py-2 text-left text-xs transition-colors last:border-b-0 hover:bg-primary-50"
                        @mousedown.prevent="selectToSku(idx, product, sku)"
                      >
                        <div class="min-w-0 flex-1">
                          <div class="flex flex-wrap items-center gap-1">
                            <span class="font-mono font-semibold text-gray-800">{{ sku.sku }}</span>
                            <span v-for="v in sku.variants" :key="v.name" class="rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-600">{{ v.value }}</span>
                          </div>
                          <div v-if="sku.stocks.length" class="mt-0.5 flex flex-wrap gap-1">
                            <span
                              v-for="st in sku.stocks"
                              :key="st.warehouse_bin_id"
                              class="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700"
                            >
                              {{ [st.zone?.code, st.rack?.code, st.bin?.code].filter(Boolean).join('/') }}
                              <strong>{{ st.stock }}</strong>
                            </span>
                          </div>
                          <span v-else class="text-[10px] text-gray-400">Belum ada stok (SKU baru)</span>
                        </div>
                        <span
                          class="shrink-0 text-right text-xs font-bold tabular-nums"
                          :class="sku.stocks.reduce((s, st) => s + st.stock, 0) > 0 ? 'text-blue-700' : 'text-gray-300'"
                        >
                          {{ sku.stocks.reduce((s, st) => s + st.stock, 0) }}
                        </span>
                      </button>
                    </template>
                  </div>
                </div>
                <p v-if="item.toSearchError" class="text-xs text-red-500">{{ item.toSearchError }}</p>
                <p v-if="getFieldError(`items[${idx}].to`)" class="text-xs text-red-500">
                  {{ getFieldError(`items[${idx}].to`) }}
                </p>
                <p v-if="!form.warehouse_id" class="text-xs text-amber-600">Pilih gudang terlebih dahulu.</p>

                <div class="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center">
                  <p class="text-xs text-gray-400">Belum ada SKU hasil</p>
                </div>
              </template>

              <!-- To selected -->
              <template v-else>
                <div class="rounded-lg border border-gray-100 overflow-hidden">
                  <table class="w-full text-xs">
                    <thead>
                      <tr class="bg-gray-50 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        <th class="px-3 py-2 text-left">SKU / Produk</th>
                        <th class="px-3 py-2 text-right w-24">Qty</th>
                        <th class="px-3 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr class="align-top">
                        <td class="px-3 py-2">
                          <p class="font-medium text-gray-800 leading-tight">{{ item.to.name }}</p>
                          <div class="mt-0.5 flex flex-wrap gap-1">
                            <span class="font-mono font-semibold text-gray-600">{{ item.to.sku }}</span>
                            <span v-for="v in item.to.variants" :key="v.name" class="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{{ v.value }}</span>
                          </div>
                          <!-- Bin selection area -->
                          <div class="mt-2 space-y-1.5">
                            <!-- Quick-select from existing stock locations -->
                            <template v-if="item.to.stocks.length">
                              <p class="text-[10px] text-gray-400">Lokasi tujuan:</p>
                              <div class="flex flex-wrap gap-1">
                                <button
                                  v-for="st in item.to.stocks"
                                  :key="st.warehouse_bin_id"
                                  type="button"
                                  class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition-colors"
                                  :class="item.to.targetBinId === st.warehouse_bin_id
                                    ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300 font-medium'
                                    : 'bg-blue-50 text-blue-700 hover:bg-primary-50 hover:text-primary-700'"
                                  @click="selectToBin(idx, st.warehouse_bin_id, [st.zone?.code, st.rack?.code, st.bin?.code].filter(Boolean).join(' / ') || 'Default')"
                                >
                                  <MapPin class="h-2.5 w-2.5" />
                                  {{ [st.zone?.code, st.rack?.code, st.bin?.code].filter(Boolean).join('/') || 'Default' }}
                                  <strong>{{ st.stock }}</strong>
                                </button>
                              </div>
                            </template>
                            <!-- Custom bin badge (picked via picker, not from existing stocks) -->
                            <div
                              v-if="item.to?.targetBinId && !item.to?.stocks.some(s => s.warehouse_bin_id === item.to?.targetBinId)"
                              class="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-2 py-1 ring-1 ring-primary-200"
                            >
                              <MapPin class="h-3 w-3 text-primary-500" />
                              <span class="text-[11px] font-medium text-primary-700">{{ item.to.targetBinLabel }}</span>
                              <button
                                type="button"
                                class="ml-0.5 rounded p-0.5 text-primary-400 hover:text-red-500 transition-colors"
                                @click="item.to.targetBinId = ''; item.to.targetBinLabel = ''; item.showToBinPicker = false"
                              >
                                <X class="h-2.5 w-2.5" />
                              </button>
                            </div>
                            <!-- AppBinPicker -->
                            <template v-if="item.showToBinPicker">
                              <div class="space-y-1.5">
                                <AppBinPicker
                                  :warehouse-id="form.warehouse_id"
                                  v-model="item.to.targetBinId"
                                  @select="(b) => { if (item.to) { item.to.targetBinLabel = b.label; item.showToBinPicker = false } }"
                                />
                                <button
                                  type="button"
                                  class="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                                  @click="item.showToBinPicker = false"
                                >
                                  Batal
                                </button>
                              </div>
                            </template>
                            <template v-else>
                              <button
                                type="button"
                                class="inline-flex items-center gap-1 text-[11px] font-medium transition-colors"
                                :class="!item.to.targetBinId ? 'text-amber-600 hover:text-amber-700' : 'text-primary-600 hover:text-primary-700'"
                                @click="item.showToBinPicker = true"
                              >
                                <MapPin class="h-3 w-3" />
                                {{ item.to.stocks.length ? 'Pilih/Buat Lokasi Lain' : 'Pilih Lokasi Tujuan' }}
                                <span v-if="!item.to.targetBinId" class="ml-0.5 text-red-500">*</span>
                              </button>
                            </template>
                            <p v-if="getFieldError(`items[${idx}].to.warehouse_bin_id`)" class="text-[10px] text-red-500">
                              {{ getFieldError(`items[${idx}].to.warehouse_bin_id`) }}
                            </p>
                          </div>
                        </td>
                        <td class="px-3 py-2">
                          <input
                            v-model.number="item.to.qty"
                            type="number"
                            min="1"
                            placeholder="0"
                            class="w-full rounded border border-gray-200 px-2 py-1 text-right text-xs font-semibold text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                            :class="{ 'border-red-300': getFieldError(`items[${idx}].to.qty`) }"
                          />
                          <p v-if="getFieldError(`items[${idx}].to.qty`)" class="mt-0.5 text-[10px] text-red-500">
                            {{ getFieldError(`items[${idx}].to.qty`) }}
                          </p>
                        </td>
                        <td class="px-2 py-2 text-center">
                          <button
                            type="button"
                            class="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Ganti SKU hasil"
                            @click="clearTo(idx)"
                          >
                            <X class="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                      <tr v-if="getFieldError(`items[${idx}].to.sku_id`)" class="bg-red-50">
                        <td colspan="3" class="px-3 py-1.5 text-xs text-red-600">
                          {{ getFieldError(`items[${idx}].to.sku_id`) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Arrow indicator -->
                <div class="hidden sm:flex items-center justify-center">
                  <ArrowLeftRight class="h-4 w-4 text-gray-300" />
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div v-if="conversionItems.length > 0" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
            <div class="flex items-center gap-2.5">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                <ArrowLeftRight class="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500">Total Konversi</p>
                <p class="text-lg font-bold text-gray-900">{{ conversionItems.length }}</p>
              </div>
            </div>
          </div>
          <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
            <div class="flex items-center gap-2.5">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                <Package class="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500">Total SKU Sumber</p>
                <p class="text-lg font-bold text-gray-900">{{ conversionItems.reduce((s, i) => s + i.froms.length, 0) }}</p>
              </div>
            </div>
          </div>
          <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
            <div class="flex items-center gap-2.5">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                <Layers class="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500">Total SKU Hasil</p>
                <p class="text-lg font-bold text-gray-900">{{ conversionItems.filter(i => i.to).length }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Spacer -->
        <div class="h-20" />
      </div>
    </div>

    <!-- ── Sticky Action Bar ──────────────────────────────────────────────────── -->
    <div v-if="!loadingData" class="sticky bottom-0 flex items-center justify-end gap-3 rounded-xl bg-white/90 px-5 py-4 shadow-sm ring-1 ring-gray-200 backdrop-blur">
      <NuxtLink
        to="/inventory/conversion"
        class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
      >
        Batal
      </NuxtLink>
      <button
        type="button"
        :disabled="saving || !conversionItems.length"
        class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-xs transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleSubmit('draft')"
      >
        <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
        Simpan Draft
      </button>
      <button
        type="button"
        :disabled="saving || !conversionItems.length"
        class="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleSubmit('completed')"
      >
        <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
        <ArrowLeftRight v-else class="h-4 w-4" />
        Selesaikan Konversi
      </button>
    </div>
  </div>
</template>
