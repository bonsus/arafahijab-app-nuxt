<script setup lang="ts">
import {
  ArrowLeft, Trash2, Loader2, Search, ChevronDown, Package, Plus, Check,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface ReceiptItemRef {
  id: string
  sku_id: string
  sku: string
  name: string
  variants: { name: string; value: string }[]
  qty: number
  qty_returned: number
  qty_good: number
  price: number
}

interface ReceiptRef {
  id: string
  no: string
  status: string
  warehouse_id: string
  warehouse?: { id: string; name: string } | null
  items: ReceiptItemRef[] | null
}

interface ReceiptItemBase {
  id: string
  sku_id: string
  sku: string
  name: string
  variants: { name: string; value: string }[]
  max_qty: number
  price: number
}

interface InboundItemInput {
  sku_id: string
  sku: string
  name: string
  variants: { name: string; value: string }[]
  qty: number
  max_qty: number
  price: number
  total: number
  bin_id: string
  zone_id: string
  rack_id: string
}

interface InboundDetail {
  id: string
  purchase_receipt_id: string
  user_id: string
  no: string
  external_id: string
  date: string
  note: string
  condition: string
  status: string
  warehouse_id: string
  purchase_receipt: ReceiptRef | null
  items: Array<{
    id: string
    sku_id: string
    sku: string
    name: string
    variants: string
    qty: number
    price: number
    total: number
    bin_id: string
    bin?: { id: string; code: string;} | null
    rack?: { id: string; code: string; } | null
    zone?: { id: string; code: string; } | null
  }> | null
}

const api = useApi()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const isEdit = computed(() => !!route.query.edit)
const editId = computed(() => route.query.edit as string)

const saving = ref(false)
const loadingData = ref(false)
const formErrors = ref<Record<string, string[]>>({})

const form = reactive({
  purchase_receipt_id: '',
  external_id: '',
  date: new Date().toISOString().slice(0, 10),
  note: '',
  condition: 'good',
  user_id: '',
  status: '',
})

const selectedReceipt = ref<ReceiptRef | null>(null)
// Left panel: available items from selected receipt
const receiptItems = ref<ReceiptItemBase[]>([])
// Right panel: items added to inbound
const items = ref<InboundItemInput[]>([])

// ── Purchase Receipt picker ─────────────────────────────────────────────────
const receiptOpen = ref(false)
const receiptLoading = ref(false)
const receiptSearch = ref('')
const receiptResults = ref<Pick<ReceiptRef, 'id' | 'no' | 'status'>[]>([])

let receiptTimer: ReturnType<typeof setTimeout>
function onReceiptSearch(val: string) {
  receiptSearch.value = val
  clearTimeout(receiptTimer)
  receiptTimer = setTimeout(() => fetchReceipts(), 300)
}

async function fetchReceipts() {
  receiptLoading.value = true
  try {
    const params: Record<string, string> = { status: 'received,completed', per_page: '20' }
    if (receiptSearch.value) params.search = receiptSearch.value
    const res = await api.get<{ data: { data: typeof receiptResults.value } }>('/purchase-receipts/index', params)
    receiptResults.value = res.data?.data || []
  }
  catch { receiptResults.value = [] }
  finally { receiptLoading.value = false }
}

async function selectReceipt(receipt: Pick<ReceiptRef, 'id' | 'no' | 'status'>) {
  receiptOpen.value = false
  form.purchase_receipt_id = receipt.id
  receiptItems.value = []
  items.value = []

  try {
    const res = await api.get<{ data: ReceiptRef }>(`/purchase-receipts/${receipt.id}`)
    selectedReceipt.value = res.data
    receiptItems.value = (res.data.items || [])
      .map(item => ({
        id: item.id,
        sku_id: item.sku_id,
        sku: item.sku,
        name: item.name,
        variants: item.variants || [],
        max_qty: Math.max(0, item.qty - (item.qty_returned || 0) - (item.qty_good || 0)),
        price: Number(item.price) || 0,
      }))
      .filter(i => i.max_qty > 0)
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat detail penerimaan')
    receiptItems.value = []
  }
}

// ── Item management ──────────────────────────────────────────────────────────
function isAdded(skuId: string): boolean {
  return items.value.some(i => i.sku_id === skuId)
}

function addItem(ri: ReceiptItemBase) {
  if (isAdded(ri.sku_id)) return
  items.value.push({
    sku_id: ri.sku_id,
    sku: ri.sku,
    name: ri.name,
    variants: ri.variants,
    qty: ri.max_qty,
    max_qty: ri.max_qty,
    price: ri.price,
    total: ri.max_qty * ri.price,
    bin_id: '',
    zone_id: '',
    rack_id: '',
  })
}

function addAll() {
  for (const ri of filteredReceiptItems.value) addItem(ri)
}

// ── Receipt item search ──────────────────────────────────────────────────────
const itemSearch = ref('')

const filteredReceiptItems = computed(() => {
  const q = itemSearch.value.trim().toLowerCase()
  if (!q) return receiptItems.value
  return receiptItems.value.filter(
    i => i.sku.toLowerCase().includes(q) || i.name.toLowerCase().includes(q),
  )
})

function onItemSearch(val: string) {
  itemSearch.value = val
  const q = val.trim().toLowerCase()
  if (!q) return
  const exact = receiptItems.value.find(i => i.sku.toLowerCase() === q)
  if (exact) {
    addItem(exact)
    itemSearch.value = ''
  }
}

function updateItemTotal(item: InboundItemInput) {
  if (item.qty > item.max_qty) item.qty = item.max_qty
  if (item.qty < 0) item.qty = 0
  item.total = item.qty * item.price
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

function getFieldError(key: string): string | undefined {
  return formErrors.value[key]?.[0]
}

function getItemError(idx: number, field: string): string | undefined {
  return formErrors.value[`items[${idx}].${field}`]?.[0]
}

const subtotal = computed(() => items.value.reduce((s, i) => s + i.total, 0))

// ── Load for edit ────────────────────────────────────────────────────────────
async function loadEdit() {
  if (!isEdit.value) return
  loadingData.value = true
  try {
    const res = await api.get<{ data: InboundDetail }>(`/warehouses/inbounds/${editId.value}`)
    const data = res.data

    form.purchase_receipt_id = data.purchase_receipt_id
    form.external_id = data.external_id || ''
    form.date = data.date && !data.date.startsWith('0001') ? data.date.slice(0, 10) : ''
    form.note = data.note || ''
    form.condition = data.condition || 'good'
    form.user_id = data.user_id || ''

    const maxMap = new Map<string, number>()
    if (data.purchase_receipt_id) {
      try {
        const rRes = await api.get<{ data: ReceiptRef }>(`/purchase-receipts/${data.purchase_receipt_id}`)
        selectedReceipt.value = rRes.data
        for (const ri of rRes.data.items || []) {
          const maxQty = Math.max(0, ri.qty - (ri.qty_returned || 0) - (ri.qty_good || 0))
          maxMap.set(ri.sku_id, maxQty)
          if (maxQty > 0) {
            receiptItems.value.push({
              id: ri.id,
              sku_id: ri.sku_id,
              sku: ri.sku,
              name: ri.name,
              variants: ri.variants || [],
              max_qty: maxQty,
              price: Number(ri.price) || 0,
            })
          }
        }
      }
      catch { /* ignore */ }
    }

    items.value = (data.items || []).map((item) => {
      const currentQty = Number(item.qty) || 0
      const remaining = maxMap.get(item.sku_id) ?? 0
      // const maxQty = currentQty + remaining
      const maxQty = currentQty + remaining
      let variants: { name: string; value: string }[] = []
      try {
        const parsed = JSON.parse(item.variants || '{}')
        variants = Object.entries(parsed).map(([name, value]) => ({ name, value: String(value) }))
      }
      catch { /* ignore */ }
      return {
        sku_id: item.sku_id,
        sku: item.sku,
        name: item.name,
        variants,
        qty: currentQty,
        max_qty: maxQty || currentQty,
        price: Number(item.price) || 0,
        total: Number(item.total) || currentQty * (Number(item.price) || 0),
        bin_id: item.bin_id || '',
        zone_id: item.zone?.id || '',
        rack_id: item.rack?.id || '',
      }
    })
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data inbound')
    router.push('/wms/inbound')
  }
  finally {
    loadingData.value = false
  }
}

// ── Submit ───────────────────────────────────────────────────────────────────
async function handleSubmit(status: string) {
  formErrors.value = {}
  if (!form.purchase_receipt_id) {
    formErrors.value = { purchase_receipt_id: ['Purchase receipt wajib dipilih'] }
    return
  }
  const payloadItems = items.value.filter(i => i.qty > 0).map(i => ({
    sku_id: i.sku_id,
    qty: i.qty,
    price: i.price,
    bin_id: i.bin_id || undefined,
  }))
  if (!payloadItems.length) {
    formErrors.value = { items: ['Minimal 1 item dengan qty lebih dari 0'] }
    return
  }

  saving.value = true
  const payload: Record<string, any> = {
    external_id: form.external_id,
    date: form.date ? `${form.date} 00:00:00` : undefined,
    note: form.note,
    condition: form.condition,
    user_id: form.user_id || undefined,
    status: status || undefined,
    items: payloadItems,
  }

  try {
    if (isEdit.value) {
      await api.put(`/warehouses/inbounds/${editId.value}`, payload)
      toast.success('Inbound berhasil diperbarui')
    }
    else {
      payload.purchase_receipt_id = form.purchase_receipt_id
      await api.post('/warehouses/inbounds/create', payload)
      toast.success('Inbound berhasil dibuat')
    }
    router.push('/wms/inbound')
  }
  catch (err: any) {
    if (err.errors) formErrors.value = err.errors
    else toast.error(err.message || 'Gagal menyimpan inbound')
  }
  finally {
    saving.value = false
  }
}

const warehouseId = computed(() => selectedReceipt.value?.warehouse_id || '')

onMounted(() => {
  if (isEdit.value) loadEdit()
  else fetchReceipts()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/wms/inbound"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
        {{ isEdit ? 'Edit Inbound' : 'Buat Inbound' }}
      </h1>
    </div>
    <!-- end header -->

    <!-- Skeleton -->
    <div v-if="loadingData" class="space-y-4">
      <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="i in 4" :key="i">
            <div class="h-3 w-20 animate-pulse rounded bg-gray-100" />
            <div class="mt-1.5 h-9 w-full animate-pulse rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <div v-for="p in 2" :key="p" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-28 animate-pulse rounded bg-gray-200 mb-4" />
          <div v-for="i in 4" :key="i" class="mb-3 h-12 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    </div>

    <template v-else>
      <!-- TOP: Informasi Inbound (2-col grid) -->
      <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 class="mb-4 text-sm font-semibold text-gray-900">Informasi Inbound</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-8">
          <!-- Purchase Receipt -->
          <div class="sm:col-span-2 lg:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Purchase Receipt <span class="text-red-500">*</span></label>
            <div v-if="selectedReceipt && isEdit" class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
              {{ selectedReceipt.no }}
            </div>
            <div v-else class="relative">
              <button
                type="button"
                class="input-field flex w-full items-center justify-between bg-white text-left"
                @click="receiptOpen = !receiptOpen; if (receiptOpen && !receiptResults.length) fetchReceipts()"
              >
                <span :class="selectedReceipt ? 'text-gray-900' : 'text-gray-400'">
                  {{ selectedReceipt ? selectedReceipt.no : 'Pilih GRN...' }}
                </span>
                <ChevronDown class="h-4 w-4 shrink-0 text-gray-400 transition-transform" :class="{ 'rotate-180': receiptOpen }" />
              </button>
              <div v-if="receiptOpen" class="absolute left-0 top-full z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                <div class="border-b border-gray-100 p-2">
                  <div class="relative">
                    <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      :value="receiptSearch"
                      type="text"
                      placeholder="Cari no GRN..."
                      class="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                      @input="onReceiptSearch(($event.target as HTMLInputElement).value)"
                    />
                  </div>
                </div>
                <div class="max-h-48 overflow-y-auto">
                  <div v-if="receiptLoading" class="flex items-center justify-center py-4">
                    <Loader2 class="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                  <div v-else-if="!receiptResults.length" class="px-3 py-4 text-center text-sm text-gray-400">
                    Tidak ada GRN tersedia
                  </div>
                  <button
                    v-for="r in receiptResults"
                    v-else
                    :key="r.id"
                    type="button"
                    class="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                    :class="selectedReceipt?.id === r.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'"
                    @click="selectReceipt(r)"
                  >
                    <span class="font-medium">{{ r.no }}</span>
                    <span class="rounded bg-gray-100 px-1.5 text-[10px] text-gray-500">{{ r.status }}</span>
                  </button>
                </div>
              </div>
            </div>
            <p v-if="getFieldError('purchase_receipt_id')" class="mt-1 text-xs text-red-600">{{ getFieldError('purchase_receipt_id') }}</p>
          </div>

          <!-- External ID -->
          <div class="sm:col-span-2 lg:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-gray-700">External ID</label>
            <input v-model="form.external_id" type="text" placeholder="ID referensi (opsional)" class="input-field" />
          </div>

          <!-- Kondisi -->
          <!-- <div class="sm:col-span-1 lg:col-span-1">
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Kondisi Barang</label>
            <select v-model="form.condition" class="input-field bg-white">
              <option value="good">Baik</option>
              <option value="damaged">Rusak</option>
            </select>
          </div> -->

          <!-- Petugas -->
          <div class="sm:col-span-2 lg:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Petugas</label>
            <AppUserPicker
              v-model="form.user_id"
              :class="getFieldError('user_id') ? 'ring-1 ring-red-400 rounded-lg' : ''"
            />
            <p v-if="getFieldError('user_id')" class="mt-1 text-xs text-red-600">{{ getFieldError('user_id') }}</p>
          </div>

          <!-- Catatan -->
          <div class="sm:col-span-2 lg:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan</label>
            <input v-model="form.note" type="text" placeholder="Catatan inbound (opsional)" class="input-field" />
          </div>
        </div>
      </div>

      <!-- BOTTOM: two-panel item picker -->
      <div class="grid gap-4 lg:grid-cols-4">

        <!-- LEFT: Available receipt items -->
        <div class="lg:col-span-1 rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <h2 class="text-sm font-semibold text-gray-900">Item Penerimaan</h2>
            <button
              v-if="receiptItems.length"
              type="button"
              class="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
              @click="addAll"
            >
              <Plus class="h-3.5 w-3.5" />
              {{ itemSearch ? 'Tambah Hasil' : 'Semua' }}
            </button>
          </div>

          <!-- Search -->
          <div v-if="receiptItems.length" class="border-b border-gray-100 px-4 py-2.5">
            <div class="relative">
              <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                :value="itemSearch"
                type="text"
                placeholder="Cari nama / scan SKU..."
                class="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                @input="onItemSearch(($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>

          <div v-if="!selectedReceipt" class="flex flex-col items-center justify-center py-14 text-center">
            <Package class="mb-2 h-9 w-9 text-gray-300" />
            <p class="text-sm text-gray-400">Pilih Purchase Receipt terlebih dahulu</p>
          </div>
          <div v-else-if="!receiptItems.length" class="py-14 text-center text-sm text-gray-400">
            Tidak ada item tersedia
          </div>
          <div v-else-if="!filteredReceiptItems.length" class="py-8 text-center text-sm text-gray-400">
            Tidak ada item cocok
          </div>
          <ul v-else class="divide-y divide-gray-100">
            <li
              v-for="ri in filteredReceiptItems"
              :key="ri.sku_id"
              class="flex items-center gap-3 px-4 py-3"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-gray-900">{{ ri.name }}</p>
                <div class="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-gray-500">
                  <span>{{ ri.sku }}</span>
                  <span v-for="v in ri.variants" :key="v.name" class="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{{ v.value }}</span>
                </div>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-xs text-gray-400">Qty</p>
                <p class="text-sm font-semibold text-gray-900">{{ ri.max_qty }}</p>
              </div>
              <button
                type="button"
                :disabled="isAdded(ri.sku_id)"
                :title="isAdded(ri.sku_id) ? 'Sudah ditambahkan' : 'Tambah ke inbound'"
                class="shrink-0 rounded-lg p-1.5 transition-colors"
                :class="isAdded(ri.sku_id) ? 'cursor-default text-green-500' : 'text-gray-400 hover:bg-primary-50 hover:text-primary-600'"
                @click="addItem(ri)"
              >
                <Check v-if="isAdded(ri.sku_id)" class="h-4 w-4" />
                <Plus v-else class="h-4 w-4" />
              </button>
            </li>
          </ul>
        </div>

        <!-- RIGHT: Inbound items -->
        <div class="lg:col-span-3 rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div class="border-b border-gray-100 px-5 py-3.5">
            <h2 class="text-sm font-semibold text-gray-900">
              Item Inbound
              <span v-if="items.length" class="ml-1 rounded-full bg-primary-100 px-1.5 py-0.5 text-xs font-semibold text-primary-700">{{ items.length }}</span>
              <span class="text-red-500">*</span>
            </h2>
            <p v-if="getFieldError('items')" class="mt-0.5 text-xs text-red-600">{{ getFieldError('items') }}</p>
          </div>

          <div v-if="!items.length" class="flex flex-col items-center justify-center py-14 text-center">
            <Package class="mb-2 h-9 w-9 text-gray-300" />
            <p class="text-sm text-gray-400">Belum ada item ditambahkan</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-400">
                  <th class="px-4 py-2.5">Produk</th>
                  <th class="px-3 py-2.5 text-center">Max</th>
                  <th class="px-3 py-2.5 text-center">Qty</th>
                  <!-- <th class="px-3 py-2.5 text-right whitespace-nowrap">Harga</th>
                  <th class="px-3 py-2.5 text-right whitespace-nowrap">Total</th> -->
                  <th class="px-3 py-2.5">Lokasi Bin</th>
                  <th class="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, idx) in items"
                  :key="item.sku_id"
                  class="border-b border-gray-100 last:border-b-0"
                >
                  <!-- Produk -->
                  <td class="px-4 py-3">
                    <p class="font-medium text-gray-900 line-clamp-1">{{ item.name }}</p>
                    <div class="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-gray-500">
                      <span>{{ item.sku }}</span>
                      <span v-for="v in item.variants" :key="v.name" class="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{{ v.value }}</span>
                    </div>
                  </td>
                  <!-- Max -->
                  <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">
                    {{ item.max_qty }}
                  </td>
                  <!-- Qty -->
                  
                  <td class="px-3 py-3">
                    <input
                      v-model.number="item.qty"
                      type="number"
                      min="1"
                      :max="item.max_qty"
                      :title="`maks ${item.max_qty}`"
                      class="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                      :class="{ 'border-red-400': getItemError(idx, 'qty') }"
                      @input="updateItemTotal(item)"
                    />
                    <p v-if="getItemError(idx, 'qty')" class="mt-0.5 text-[10px] text-red-600">{{ getItemError(idx, 'qty') }}</p>
                  </td>
                  <!-- Harga -->
                  <!-- <td class="px-3 py-3 text-right text-gray-700 whitespace-nowrap">
                    Rp{{ formatCurrency(item.price) }}
                  </td> -->
                  <!-- Total -->
                  <!-- <td class="px-3 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                    Rp{{ formatCurrency(item.total) }}
                  </td> -->
                  <!-- Bin -->
                  <td class="px-3 py-3">
                    <AppBinPicker
                      v-model="item.bin_id"
                      :warehouse-id="warehouseId"
                      :initial-zone-id="item.zone_id"
                      :initial-rack-id="item.rack_id"
                      :class="getItemError(idx, 'bin_id') ? 'ring-1 ring-red-400 rounded-lg' : ''"
                    />
                    <p v-if="getItemError(idx, 'bin_id')" class="mt-0.5 text-[10px] text-red-600">{{ getItemError(idx, 'bin_id') }}</p>
                  </td>
                  <!-- Hapus -->
                  <td class="px-3 py-3">
                    <button
                      type="button"
                      class="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      @click="removeItem(idx)"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Subtotal -->
          <div v-if="items.length" class="flex justify-end border-t border-gray-100 px-5 py-3">
            <div class="text-sm">
              <span class="text-gray-500">Subtotal: </span>
              <span class="font-semibold text-gray-900">Rp{{ formatCurrency(subtotal) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="sticky bottom-0 flex items-center justify-end gap-3 rounded-xl bg-white/90 px-5 py-4 shadow-sm ring-1 ring-gray-200 backdrop-blur">
        <NuxtLink
          to="/wms/inbound"
          class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          Batal
        </NuxtLink>
        <button
          :disabled="saving"
          class="flex items-center gap-2 rounded-lg bg-gray-500 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          @click="handleSubmit('draft')"
        >
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          {{ saving ? 'Menyimpan...' : 'Simpan Draft' }}
        </button>
        <button
          :disabled="saving"
          class="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          @click="handleSubmit('completed')"
        >
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          {{ saving ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Buat Inbound') }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.input-field {
  @apply w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
