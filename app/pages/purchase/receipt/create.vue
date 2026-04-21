<script setup lang="ts">
import { ArrowLeft, Trash2, Loader2, Search, ChevronDown, Package } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface POItem {
  id: string
  sku_id: string
  product_id: string
  sku: string
  name: string
  variants: { name: string; value: string }[]
  qty: number
  qty_received: number
  price: number
  discount: number
  total: number
}

interface PurchaseOrder {
  id: string
  no: string
  status: string
  customer: { id: string; name: string } | null
  items: POItem[] | null
}

interface ReceiptItem {
  sku_id: string
  product_id: string
  sku: string
  name: string
  variants: { name: string; value: string }[]
  qty: number
  max_qty: number
  price: number
  discount: number
  total: number
}

const api = useApi()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const isEdit = computed(() => !!route.query.edit)
const receiptId = computed(() => route.query.edit as string)

const saving = ref(false)
const loadingData = ref(false)
const formErrors = ref<Record<string, string[]>>({})

const form = reactive({
  purchase_order_id: '',
  warehouse_id: '',
  external_id: '',
  date_received: new Date().toISOString().slice(0, 10),
  date_due: '',
  status: 'draft',
  note: '',
})

const items = ref<ReceiptItem[]>([])

// PO search
const poSearch = ref('')
const poResults = ref<PurchaseOrder[]>([])
const poLoading = ref(false)
const poOpen = ref(false)
const selectedPO = ref<PurchaseOrder | null>(null)
const poItems = ref<POItem[]>([])

const extraDiscount = ref(0)
const shippingFee = ref(0)
const tax = ref(0)
const adjustment = ref(0)

let poTimer: ReturnType<typeof setTimeout>
function onPOSearch(val: string) {
  poSearch.value = val
  clearTimeout(poTimer)
  poTimer = setTimeout(() => fetchPOs(), 300)
}

async function fetchPOs() {
  poLoading.value = true
  try {
    const params: Record<string, string> = {
      status: 'approved,partial',
      per_page: '20',
    }
    if (poSearch.value) params.search = poSearch.value
    const res = await api.get<{ data: { data: PurchaseOrder[] } }>('/purchases/index', params)
    poResults.value = res.data?.data || []
  }
  catch {
    poResults.value = []
  }
  finally {
    poLoading.value = false
  }
}

async function selectPO(po: PurchaseOrder) {
  poOpen.value = false
  selectedPO.value = po
  form.purchase_order_id = po.id
  poSearch.value = ''

  // Fetch PO detail to get items with qty_received
  try {
    const res = await api.get<{ data: PurchaseOrder }>(`/purchases/${po.id}`)
    const detail = res.data
    poItems.value = detail.items || []

    // Auto-add items with remaining qty
    items.value = poItems.value
      .filter(item => item.qty - item.qty_received > 0)
      .map(item => ({
        sku_id: item.sku_id,
        product_id: item.product_id,
        sku: item.sku,
        name: item.name,
        variants: item.variants || [],
        qty: item.qty - item.qty_received,
        max_qty: item.qty - item.qty_received,
        price: Number(item.price) || 0,
        discount: Number(item.discount) || 0,
        total: (item.qty - item.qty_received) * (Number(item.price) - Number(item.discount)),
      }))
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat detail PO')
  }
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

function updateItemTotal(item: ReceiptItem) {
  if (item.qty > item.max_qty) item.qty = item.max_qty
  if (item.qty < 0) item.qty = 0
  item.total = (item.price - item.discount) * item.qty
  if (item.total < 0) item.total = 0
}

// Summary
const subtotal = computed(() => items.value.reduce((sum, i) => sum + i.total, 0))
const grandTotal = computed(() => subtotal.value - extraDiscount.value + shippingFee.value + tax.value + adjustment.value)

// Load data for edit
async function loadReceipt() {
  if (!isEdit.value) return
  loadingData.value = true
  try {
    const res = await api.get<{ data: any }>(`/purchase-receipts/${receiptId.value}`)
    const data = res.data

    form.purchase_order_id = data.purchase_order_id
    form.warehouse_id = data.warehouse_id || ''
    form.external_id = data.external_id || ''
    form.date_received = data.date_received && !data.date_received.startsWith('0001') ? data.date_received.slice(0, 10) : ''
    form.date_due = data.date_due && !data.date_due.startsWith('0001') ? data.date_due.slice(0, 10) : ''
    form.status = data.status
    form.note = data.note || ''
    extraDiscount.value = Number(data.discount) || 0
    shippingFee.value = Number(data.shipping_fee) || 0
    tax.value = Number(data.tax) || 0
    adjustment.value = Number(data.adjustment) || 0

    if (data.purchase_order) {
      selectedPO.value = data.purchase_order
    }

    // Fetch PO detail for max_qty
    if (data.purchase_order_id) {
      try {
        const poRes = await api.get<{ data: PurchaseOrder }>(`/purchases/${data.purchase_order_id}`)
        poItems.value = poRes.data.items || []
      }
      catch { /* ignore */ }
    }

    items.value = (data.items || []).map((item: any) => {
      // Find matching PO item to calc max_qty (current receipt qty + remaining)
      const poItem = poItems.value.find(p => p.sku_id === item.sku_id)
      const currentQty = Number(item.qty) || 0
      const poRemaining = poItem ? (poItem.qty - poItem.qty_received) : 0
      return {
        sku_id: item.sku_id,
        product_id: item.product_id,
        sku: item.sku,
        name: item.name,
        variants: item.variants || [],
        qty: currentQty,
        max_qty: currentQty + poRemaining,
        price: Number(item.price) || 0,
        discount: Number(item.discount) || 0,
        total: Number(item.total) || 0,
      }
    })
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data')
    router.push('/purchase/receipt')
  }
  finally {
    loadingData.value = false
  }
}

function formatDateRFC(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString()
}

async function handleSubmit() {
  if (!form.purchase_order_id) {
    formErrors.value = { purchase_order_id: ['Purchase order wajib dipilih'] }
    return
  }
  if (!items.value.length) {
    formErrors.value = { items: ['Minimal 1 item produk'] }
    return
  }

  saving.value = true
  formErrors.value = {}

  const payload: Record<string, any> = {
    purchase_order_id: form.purchase_order_id,
    warehouse_id: form.warehouse_id,
    external_id: form.external_id,
    date_received: formatDateRFC(form.date_received),
    date_due: formatDateRFC(form.date_due),
    discount: extraDiscount.value,
    shipping_fee: shippingFee.value,
    tax: tax.value,
    adjustment: adjustment.value,
    status: form.status,
    note: form.note,
    items: items.value.map(i => ({
      sku_id: i.sku_id,
      qty: i.qty,
      price: i.price,
      discount: i.discount,
    })),
  }

  try {
    if (isEdit.value) {
      await api.put(`/purchase-receipts/${receiptId.value}`, payload)
      toast.success('Penerimaan barang berhasil diperbarui')
    }
    else {
      await api.post('/purchase-receipts/create', payload)
      toast.success('Penerimaan barang berhasil dibuat')
    }
    router.push('/purchase/receipt')
  }
  catch (err: any) {
    if (err.errors) {
      formErrors.value = err.errors
    }
    else {
      toast.error(err.message || 'Gagal menyimpan')
    }
  }
  finally {
    saving.value = false
  }
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('id-ID').format(val)
}

function getFieldError(key: string): string | undefined {
  return formErrors.value[key]?.[0]
}

onMounted(() => {
  if (isEdit.value) {
    loadReceipt()
  }
  else {
    fetchPOs()
  }
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/purchase/receipt"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
        {{ isEdit ? 'Edit Penerimaan Barang' : 'Buat Penerimaan Barang' }}
      </h1>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loadingData" class="grid gap-5 lg:grid-cols-4">
      <!-- Left Column Skeleton -->
      <div class="lg:col-span-1">
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
          <div class="mt-4 space-y-4">
            <!-- PO Picker -->
            <div>
              <div class="h-3 w-24 animate-pulse rounded bg-gray-100" />
              <div class="mt-1.5 h-10 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>
            <!-- Warehouse -->
            <div>
              <div class="h-3 w-14 animate-pulse rounded bg-gray-100" />
              <div class="mt-1.5 h-10 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>
            <!-- External ID -->
            <div>
              <div class="h-3 w-20 animate-pulse rounded bg-gray-100" />
              <div class="mt-1.5 h-10 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>
            <!-- Date Received -->
            <div>
              <div class="h-3 w-24 animate-pulse rounded bg-gray-100" />
              <div class="mt-1.5 h-10 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>
            <!-- Date Due -->
            <div>
              <div class="h-3 w-28 animate-pulse rounded bg-gray-100" />
              <div class="mt-1.5 h-10 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>
            <!-- Note -->
            <div>
              <div class="h-3 w-14 animate-pulse rounded bg-gray-100" />
              <div class="mt-1.5 h-20 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
      <!-- Right Column Skeleton -->
      <div class="space-y-5 lg:col-span-3">
        <!-- Item Table -->
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-28 animate-pulse rounded bg-gray-200" />
          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200">
                  <th class="pb-2 pr-3"><div class="h-3 w-12 animate-pulse rounded bg-gray-200" /></th>
                  <th class="w-24 pb-2 px-2"><div class="mx-auto h-3 w-8 animate-pulse rounded bg-gray-200" /></th>
                  <th class="w-16 pb-2 px-2"><div class="mx-auto h-3 w-10 animate-pulse rounded bg-gray-200" /></th>
                  <th class="w-34 pb-2 px-2"><div class="ml-auto h-3 w-10 animate-pulse rounded bg-gray-200" /></th>
                  <th class="w-28 pb-2 px-2"><div class="ml-auto h-3 w-14 animate-pulse rounded bg-gray-200" /></th>
                  <th class="w-34 pb-2 px-2"><div class="ml-auto h-3 w-10 animate-pulse rounded bg-gray-200" /></th>
                  <th class="w-8 pb-2" />
                </tr>
              </thead>
              <tbody>
                <tr v-for="i in 3" :key="i" class="border-b border-gray-100">
                  <td class="py-3 pr-3">
                    <div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
                    <div class="mt-1 flex gap-1.5">
                      <div class="h-3 w-16 animate-pulse rounded bg-gray-100" />
                      <div class="h-3 w-10 animate-pulse rounded bg-gray-100" />
                    </div>
                  </td>
                  <td class="px-2 py-3"><div class="mx-auto h-8 w-20 animate-pulse rounded-lg bg-gray-200" /></td>
                  <td class="px-2 py-3"><div class="mx-auto h-4 w-8 animate-pulse rounded bg-gray-100" /></td>
                  <td class="px-2 py-3"><div class="h-8 w-full animate-pulse rounded-lg bg-gray-200" /></td>
                  <td class="px-2 py-3"><div class="h-8 w-full animate-pulse rounded-lg bg-gray-200" /></td>
                  <td class="px-2 py-3"><div class="ml-auto h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
                  <td class="py-3 pl-1"><div class="h-5 w-5 animate-pulse rounded bg-gray-200" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- Summary -->
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-20 animate-pulse rounded bg-gray-200" />
          <div class="ml-auto mt-4 max-w-xs space-y-3">
            <div class="flex justify-between">
              <div class="h-3.5 w-24 animate-pulse rounded bg-gray-100" />
              <div class="h-3.5 w-28 animate-pulse rounded bg-gray-200" />
            </div>
            <div v-for="i in 3" :key="i" class="flex items-center gap-3">
              <div class="h-3.5 w-20 shrink-0 animate-pulse rounded bg-gray-100" />
              <div class="h-8 flex-1 animate-pulse rounded-lg bg-gray-200" />
            </div>
            <div class="border-t border-gray-200 pt-3 flex justify-between">
              <div class="h-4 w-20 animate-pulse rounded bg-gray-200" />
              <div class="h-5 w-32 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </div>
        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-gray-200">
          <div class="h-9 w-16 animate-pulse rounded-lg bg-gray-200" />
          <div class="h-9 w-28 animate-pulse rounded-lg bg-gray-300" />
          <div class="h-9 w-32 animate-pulse rounded-lg bg-gray-300" />
        </div>
      </div>
    </div>

    <template v-else>
      <div class="grid gap-5 lg:grid-cols-4">
        <!-- LEFT: Info (1/4) -->
        <div class="lg:col-span-1">
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-sm font-semibold text-gray-900">Informasi Penerimaan</h2>
            <div class="space-y-4">
              <!-- PO Picker -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Purchase Order <span class="text-red-500">*</span></label>
                <div v-if="selectedPO && isEdit" class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                  {{ selectedPO.no }}
                  <span v-if="selectedPO.customer" class="text-gray-500"> — {{ selectedPO.customer.name }}</span>
                </div>
                <div v-else class="relative">
                  <button
                    type="button"
                    class="input-field flex items-center justify-between bg-white text-left"
                    @click="poOpen = !poOpen; if (poOpen && !poResults.length) fetchPOs()"
                  >
                    <span :class="selectedPO ? 'text-gray-900' : 'text-gray-400'">
                      {{ selectedPO ? `${selectedPO.no}${selectedPO.customer ? ` — ${selectedPO.customer.name}` : ''}` : 'Pilih Purchase Order' }}
                    </span>
                    <ChevronDown class="h-4 w-4 text-gray-400 transition-transform" :class="{ 'rotate-180': poOpen }" />
                  </button>
                  <!-- PO Dropdown -->
                  <div
                    v-if="poOpen"
                    class="absolute left-0 top-full z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg"
                  >
                    <div class="border-b border-gray-100 p-2">
                      <div class="relative">
                        <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        <input
                          :value="poSearch"
                          type="text"
                          placeholder="Cari no PO, supplier..."
                          class="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                          @input="onPOSearch(($event.target as HTMLInputElement).value)"
                        />
                      </div>
                    </div>
                    <div class="max-h-48 overflow-y-auto">
                      <div v-if="poLoading" class="flex items-center justify-center py-4">
                        <Loader2 class="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                      <div v-else-if="!poResults.length" class="px-3 py-4 text-center text-sm text-gray-400">
                        Tidak ada PO yang tersedia
                      </div>
                      <button
                        v-for="po in poResults"
                        v-else
                        :key="po.id"
                        type="button"
                        class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                        :class="selectedPO?.id === po.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'"
                        @click="selectPO(po)"
                      >
                        <div class="min-w-0 flex-1">
                          <p class="font-medium">{{ po.no }}</p>
                          <p v-if="po.customer" class="truncate text-xs text-gray-500">{{ po.customer.name }}</p>
                        </div>
                        <span class="shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium"
                          :class="po.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'"
                        >
                          {{ po.status === 'approved' ? 'Approved' : 'Parsial' }}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
                <p v-if="getFieldError('purchase_order_id')" class="mt-1 text-xs text-red-600">{{ getFieldError('purchase_order_id') }}</p>
              </div>

              <!-- Warehouse -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Gudang</label>
                <AppWarehousePicker v-model="form.warehouse_id" />
                <p v-if="getFieldError('warehouse_id')" class="mt-1 text-xs text-red-600">{{ getFieldError('warehouse_id') }}</p>
              </div>

              <!-- External ID -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">External ID</label>
                <input
                  v-model="form.external_id"
                  type="text"
                  placeholder="ID referensi eksternal"
                  class="input-field"
                />
              </div>

              <!-- Date Received -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Tanggal Diterima</label>
                <input v-model="form.date_received" type="date" class="input-field" />
              </div>

              <!-- Date Due -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Tanggal Jatuh Tempo</label>
                <input v-model="form.date_due" type="date" class="input-field" />
              </div>

              <!-- Note -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan</label>
                <textarea
                  v-model="form.note"
                  rows="3"
                  placeholder="Catatan (opsional)"
                  class="input-field"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Items + Summary (3/4) -->
        <div class="space-y-5 lg:col-span-3">
          <!-- Items -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-sm font-semibold text-gray-900">Item Penerimaan <span class="text-red-500">*</span></h2>

            <p v-if="getFieldError('items')" class="mb-3 text-xs text-red-600">{{ getFieldError('items') }}</p>

            <div v-if="!selectedPO" class="rounded-lg border-2 border-dashed border-gray-200 py-10 text-center">
              <Package class="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p class="text-sm text-gray-400">Pilih purchase order terlebih dahulu</p>
            </div>

            <!-- Items table -->
            <div v-else-if="items.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 text-left text-xs font-medium text-gray-400">
                    <th class="pb-2 pr-3">Produk</th>
                    <th class="w-24 pb-2 px-2 text-center">Qty</th>
                    <th class="w-16 pb-2 px-2 text-center">Maks</th>
                    <th class="w-34 pb-2 px-2 text-right">Harga</th>
                    <th class="w-28 pb-2 px-2 text-right">Diskon/pcs</th>
                    <th class="w-34 pb-2 px-2 text-right">Total</th>
                    <th class="w-8 pb-2" />
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, idx) in items"
                    :key="item.sku_id"
                    class="border-b border-gray-100 last:border-b-0"
                  >
                    <td class="py-3 pr-3">
                      <div class="min-w-0">
                        <p class="line-clamp-2 text-sm font-medium leading-tight text-gray-900">{{ item.name }}</p>
                        <div class="mt-0.5 flex flex-wrap items-center gap-1 text-xs">
                          <span>{{ item.sku }}</span>
                          <span v-for="v in item.variants" :key="v.name" class="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{{ v.value }}</span>
                        </div>
                        <p v-if="getFieldError(`items[${idx}].qty`)" class="mt-1 text-xs text-red-600">{{ getFieldError(`items[${idx}].qty`) }}</p>
                      </div>
                    </td>
                    <td class="px-2 py-3">
                      <input
                        v-model.number="item.qty"
                        type="number"
                        min="0"
                        :max="item.max_qty"
                        class="input-sm w-20 text-center"
                        @input="updateItemTotal(item)"
                      />
                    </td>
                    <td class="px-2 py-3 text-center text-xs text-gray-400">
                      {{ item.max_qty }}
                    </td>
                    <td class="px-2 py-3">
                      <div class="relative">
                        <span class="rp-prefix">Rp</span>
                        <input
                          v-model.number="item.price"
                          type="number"
                          min="0"
                          class="input-sm pl-7 text-right"
                          @input="updateItemTotal(item)"
                        />
                      </div>
                    </td>
                    <td class="px-2 py-3">
                      <div class="relative">
                        <span class="rp-prefix">Rp</span>
                        <input
                          v-model.number="item.discount"
                          type="number"
                          min="0"
                          class="input-sm pl-7 text-right"
                          @input="updateItemTotal(item)"
                        />
                      </div>
                    </td>
                    <td class="px-2 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                      Rp{{ formatCurrency(item.total) }}
                    </td>
                    <td class="py-3 pl-1">
                      <button
                        class="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        @click="removeItem(idx)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else class="rounded-lg border-2 border-dashed border-gray-200 py-10 text-center">
              <p class="text-sm text-gray-400">Tidak ada item yang tersisa dari PO ini</p>
            </div>
          </div>

          <!-- Summary -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-sm font-semibold text-gray-900">Ringkasan</h2>
            <div class="ml-auto max-w-xs space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-500">Subtotal ({{ items.length }} item)</span>
                <span class="font-medium text-gray-900">Rp{{ formatCurrency(subtotal) }}</span>
              </div>

              <div class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-sm text-gray-500">Diskon</span>
                <div class="relative flex-1">
                  <span class="rp-prefix">Rp</span>
                  <input v-model.number="extraDiscount" type="number" min="0" class="input-sm pl-7 text-right" />
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-sm text-gray-500">Ongkir</span>
                <div class="relative flex-1">
                  <span class="rp-prefix">Rp</span>
                  <input v-model.number="shippingFee" type="number" min="0" class="input-sm pl-7 text-right" />
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-sm text-gray-500">Penyesuaian</span>
                <div class="relative flex-1">
                  <span class="rp-prefix">Rp</span>
                  <input v-model.number="adjustment" type="number" class="input-sm pl-7 text-right" />
                </div>
              </div>

              <div class="flex items-center justify-between border-t border-gray-200 pt-3">
                <span class="text-sm font-semibold text-gray-900">Grand Total</span>
                <span class="text-base font-bold text-primary-600">Rp{{ formatCurrency(grandTotal) }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="sticky bottom-0 flex items-center justify-end gap-3 rounded-xl bg-white/90 px-5 py-4 shadow-sm ring-1 ring-gray-200 backdrop-blur">
            <NuxtLink
              to="/purchase/receipt"
              class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              Batal
            </NuxtLink>
            <button
              :disabled="saving"
              class="flex items-center gap-2 rounded-lg bg-gray-500 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              @click="form.status = 'draft'; handleSubmit()"
            >
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              {{ saving ? 'Menyimpan...' : 'Simpan Draft' }}
            </button>
            <button
              :disabled="saving"
              class="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="form.status = 'received'; handleSubmit()"
            >
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              {{ saving ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Simpan') }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.input-field {
  @apply w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}

.input-sm {
  @apply w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20;
}

.rp-prefix {
  @apply absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-gray-400 pointer-events-none;
}
</style>
