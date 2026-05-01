<script setup lang="ts">
import {
  ArrowLeft, Loader2, Search, Trash2, Package, ChevronDown,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface CustomerRef {
  id: string
  name: string
}

interface WarehouseRef {
  id: string
  name: string
}

interface ReceiptItemRef {
  id: string
  sku_id: string
  product_id: string
  sku: string
  name: string
  variants: { name: string; value: string }[]
  qty: number
  qty_good: number
  qty_returned: number
  price: number
}

interface ReceiptRef {
  id: string
  no: string
  customer: CustomerRef | null
  warehouse: WarehouseRef | null
  items?: ReceiptItemRef[]
}

interface ReturnDetailItem {
  id: string
  sku_id: string
  sku: string
  name: string
  qty: number
  price: number
}

interface ReturnDetail {
  id: string
  purchase_receipt_id: string
  no: string
  external_id: string
  date_created: string
  discount: number
  shipping_fee: number
  tax: number
  adjustment: number
  status: string
  note: string
  purchase_receipt: ReceiptRef | null
  items: ReturnDetailItem[] | null
}

interface ReturnItemInput {
  sku_id: string
  sku: string
  name: string
  variants: { name: string; value: string }[]
  qty: number
  max_qty: number
  price: number
  total: number
}

const api = useApi()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const isEdit = computed(() => !!route.query.edit)
const returnId = computed(() => route.query.edit as string)

const loadingData = ref(false)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})

const receiptOpen = ref(false)
const receiptLoading = ref(false)
const receiptSearch = ref('')
const receiptResults = ref<ReceiptRef[]>([])
const selectedReceipt = ref<ReceiptRef | null>(null)

const form = reactive({
  purchase_receipt_id: '',
  external_id: '',
  date_created: new Date().toISOString().slice(0, 10),
  discount: 0,
  shipping_fee: 0,
  tax: 0,
  adjustment: 0,
  status: 'draft',
  note: '',
})

const items = ref<ReturnItemInput[]>([])

const subtotal = computed(() => items.value.reduce((sum, item) => sum + item.total, 0))
const grandTotal = computed(() => subtotal.value - form.discount + form.shipping_fee + form.tax + form.adjustment)

function getFieldError(key: string): string | undefined {
  return formErrors.value[key]?.[0]
}

function getItemError(index: number, field: string): string | undefined {
  return formErrors.value[`items[${index}].${field}`]?.[0]
}

let receiptTimer: ReturnType<typeof setTimeout>
function onReceiptSearch(val: string) {
  receiptSearch.value = val
  clearTimeout(receiptTimer)
  receiptTimer = setTimeout(() => fetchReceipts(), 300)
}

async function fetchReceipts() {
  receiptLoading.value = true
  try {
    const params: Record<string, string> = {
      status: 'received,completed',
      per_page: '20',
    }
    if (receiptSearch.value) params.search = receiptSearch.value
    const res = await api.get<{ data: { data: ReceiptRef[] } }>('/purchase-receipts/index', params)
    receiptResults.value = res.data?.data || []
  }
  catch {
    receiptResults.value = []
  }
  finally {
    receiptLoading.value = false
  }
}

async function selectReceipt(receipt: ReceiptRef) {
  receiptOpen.value = false
  selectedReceipt.value = receipt
  form.purchase_receipt_id = receipt.id

  try {
    const res = await api.get<{ data: ReceiptRef }>(`/purchase-receipts/${receipt.id}`)
    const detail = res.data
    selectedReceipt.value = detail

    items.value = (detail.items || [])
      .map((item) => {
        const maxQty = Number(item.qty) - Number(item.qty_good) - Number(item.qty_returned)
        return {
          sku_id: item.sku_id,
          sku: item.sku,
          name: item.name,
          variants: item.variants || [],
          qty: maxQty > 0 ? maxQty : 0,
          max_qty: maxQty > 0 ? maxQty : 0,
          price: Number(item.price) || 0,
          total: (maxQty > 0 ? maxQty : 0) * (Number(item.price) || 0),
        }
      })
      .filter(item => item.max_qty > 0)
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat detail penerimaan')
    items.value = []
  }
}

function updateItemQty(item: ReturnItemInput) {
  if (item.qty > item.max_qty) item.qty = item.max_qty
  if (item.qty < 0) item.qty = 0
  item.total = item.qty * item.price
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

async function loadEditData() {
  if (!isEdit.value) return
  loadingData.value = true
  try {
    const res = await api.get<{ data: ReturnDetail }>(`/purchase-returns/${returnId.value}`)
    const data = res.data

    form.purchase_receipt_id = data.purchase_receipt_id
    form.external_id = data.external_id || ''
    form.date_created = data.date_created && !data.date_created.startsWith('0001') ? data.date_created.slice(0, 10) : ''
    form.discount = Number(data.discount) || 0
    form.shipping_fee = Number(data.shipping_fee) || 0
    form.tax = Number(data.tax) || 0
    form.adjustment = Number(data.adjustment) || 0
    form.status = data.status || 'draft'
    form.note = data.note || ''

    if (data.purchase_receipt) {
      selectedReceipt.value = data.purchase_receipt
    }

    const maxQtyMap = new Map<string, number>()
    if (data.purchase_receipt_id) {
      try {
        const receiptRes = await api.get<{ data: ReceiptRef }>(`/purchase-receipts/${data.purchase_receipt_id}`)
        const receiptItems = receiptRes.data?.items || []
        for (const item of receiptItems) {
          maxQtyMap.set(item.sku_id, Math.max(0, Number(item.qty) - Number(item.qty_good)))
        }
      }
      catch {
        // Fallback to current qty below.
      }
    }

    items.value = (data.items || []).map((item) => {
      const currentQty = Number(item.qty) || 0
      const maxQty = maxQtyMap.has(item.sku_id)
        ? Math.max(currentQty, Number(maxQtyMap.get(item.sku_id) || 0))
        : currentQty
      return {
        sku_id: item.sku_id,
        sku: item.sku,
        name: item.name,
        variants: [],
        qty: currentQty,
        max_qty: maxQty,
        price: Number(item.price) || 0,
        total: currentQty * (Number(item.price) || 0),
      }
    })
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data retur')
    router.push('/purchase/return')
  }
  finally {
    loadingData.value = false
  }
}

async function handleSubmit(status: 'draft' | 'completed') {
  if (!form.purchase_receipt_id) {
    formErrors.value = { purchase_receipt_id: ['Penerimaan barang wajib dipilih'] }
    return
  }

  const payloadItems = items.value
    .filter(item => Number(item.qty) > 0)
    .map(item => ({ sku_id: item.sku_id, qty: Number(item.qty) }))

  if (!payloadItems.length) {
    formErrors.value = { items: ['Minimal 1 item retur dengan qty > 0'] }
    return
  }

  saving.value = true
  formErrors.value = {}

  try {
    const payload: Record<string, any> = {
      external_id: form.external_id,
      date_created: form.date_created,
      discount: form.discount,
      shipping_fee: form.shipping_fee,
      tax: form.tax,
      adjustment: form.adjustment,
      status,
      note: form.note,
      items: payloadItems,
    }

    if (isEdit.value) {
      await api.put(`/purchase-returns/${returnId.value}`, payload)
      toast.success('Retur pembelian berhasil diperbarui')
      router.push(`/purchase/return`)
    }
    else {
      payload.purchase_receipt_id = form.purchase_receipt_id
      await api.post('/purchase-returns/create', payload)
      toast.success('Retur pembelian berhasil dibuat')
      router.push('/purchase/return')
    }
  }
  catch (err: any) {
    if (err.errors) formErrors.value = err.errors
    else toast.error(err.message || `Gagal ${isEdit.value ? 'memperbarui' : 'membuat'} retur pembelian`)
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  if (isEdit.value) loadEditData()
  else fetchReceipts()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <!-- router back -->
      <NuxtLink :to="'/purchase/return'" 
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        title="Kembali ke daftar retur pembelian">
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink> 
      <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
        {{ isEdit ? 'Edit Retur Pembelian' : 'Buat Retur Pembelian' }}
      </h1>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loadingData" class="grid gap-5 lg:grid-cols-4">
      <!-- Left Column Skeleton -->
      <div class="lg:col-span-1">
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
          <div class="mt-4 space-y-4">
            <div>
              <div class="h-3 w-24 animate-pulse rounded bg-gray-100" />
              <div class="mt-1.5 h-10 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>
            <div>
              <div class="h-3 w-20 animate-pulse rounded bg-gray-100" />
              <div class="mt-1.5 h-10 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>
            <div>
              <div class="h-3 w-20 animate-pulse rounded bg-gray-100" />
              <div class="mt-1.5 h-10 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>
            <div>
              <div class="h-3 w-14 animate-pulse rounded bg-gray-100" />
              <div class="mt-1.5 h-10 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>
            <div>
              <div class="h-3 w-14 animate-pulse rounded bg-gray-100" />
              <div class="mt-1.5 h-20 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
      <!-- Right Column Skeleton -->
      <div class="space-y-5 lg:col-span-3">
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-28 animate-pulse rounded bg-gray-200" />
          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200">
                  <th class="pb-2 pr-3"><div class="h-3 w-20 animate-pulse rounded bg-gray-200" /></th>
                  <th class="w-16 pb-2 px-2"><div class="mx-auto h-3 w-8 animate-pulse rounded bg-gray-200" /></th>
                  <th class="w-20 pb-2 px-2"><div class="mx-auto h-3 w-10 animate-pulse rounded bg-gray-200" /></th>
                  <th class="w-28 pb-2 px-2"><div class="ml-auto h-3 w-14 animate-pulse rounded bg-gray-200" /></th>
                  <th class="w-32 pb-2 px-2"><div class="ml-auto h-3 w-16 animate-pulse rounded bg-gray-200" /></th>
                  <th class="w-8 pb-2" />
                </tr>
              </thead>
              <tbody>
                <tr v-for="i in 3" :key="i" class="border-b border-gray-100">
                  <td class="py-3 pr-3">
                    <div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
                    <div class="mt-1 flex gap-1.5">
                      <div class="h-3 w-16 animate-pulse rounded bg-gray-100" />
                    </div>
                  </td>
                  <td class="px-2 py-3"><div class="mx-auto h-8 w-16 animate-pulse rounded-lg bg-gray-200" /></td>
                  <td class="px-2 py-3"><div class="mx-auto h-8 w-20 animate-pulse rounded-lg bg-gray-200" /></td>
                  <td class="px-2 py-3"><div class="ml-auto h-4 w-20 animate-pulse rounded bg-gray-100" /></td>
                  <td class="px-2 py-3"><div class="ml-auto h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
                  <td class="py-3 pl-1"><div class="h-5 w-5 animate-pulse rounded bg-gray-200" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-20 animate-pulse rounded bg-gray-200" />
          <div class="ml-auto mt-4 max-w-xs space-y-3">
            <div class="flex justify-between">
              <div class="h-3.5 w-24 animate-pulse rounded bg-gray-100" />
              <div class="h-3.5 w-28 animate-pulse rounded bg-gray-200" />
            </div>
            <div v-for="i in 4" :key="i" class="flex items-center gap-3">
              <div class="h-3.5 w-20 shrink-0 animate-pulse rounded bg-gray-100" />
              <div class="h-8 flex-1 animate-pulse rounded-lg bg-gray-200" />
            </div>
            <div class="border-t border-gray-200 pt-3 flex justify-between">
              <div class="h-4 w-20 animate-pulse rounded bg-gray-200" />
              <div class="h-5 w-32 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end gap-3 rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-gray-200">
          <div class="h-9 w-20 animate-pulse rounded-lg bg-gray-200" />
          <div class="h-9 w-28 animate-pulse rounded-lg bg-gray-300" />
          <div class="h-9 w-32 animate-pulse rounded-lg bg-gray-300" />
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <template v-else>
      <div class="grid gap-5 lg:grid-cols-4">
        <!-- LEFT: Info (1/4) -->
        <div class="lg:col-span-1">
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-sm font-semibold text-gray-900">Informasi Retur</h2>
            <div class="space-y-4">
              <!-- Receipt Picker -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Penerimaan Barang <span class="text-red-500">*</span></label>
                <div v-if="selectedReceipt && isEdit" class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                  {{ selectedReceipt.no }}
                  <span v-if="selectedReceipt.warehouse" class="text-gray-500"> — {{ selectedReceipt.warehouse.name }}</span>
                </div>
                <div v-else class="relative">
                  <button
                    type="button"
                    class="input-field flex items-center justify-between bg-white text-left"
                    @click="receiptOpen = !receiptOpen; if (receiptOpen && !receiptResults.length) fetchReceipts()"
                  >
                    <span :class="selectedReceipt ? 'text-gray-900' : 'text-gray-400'">
                      {{ selectedReceipt ? `${selectedReceipt.no}${selectedReceipt.warehouse ? ` — ${selectedReceipt.warehouse.name}` : ''}` : 'Pilih Penerimaan Barang' }}
                    </span>
                    <ChevronDown class="h-4 w-4 text-gray-400 transition-transform" :class="{ 'rotate-180': receiptOpen }" />
                  </button>
                  <div v-if="receiptOpen" class="absolute left-0 top-full z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div class="border-b border-gray-100 p-2">
                      <div class="relative">
                        <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        <input
                          :value="receiptSearch"
                          type="text"
                          placeholder="Cari no GRN, supplier..."
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
                        Tidak ada GRN yang tersedia
                      </div>
                      <button
                        v-for="r in receiptResults"
                        v-else
                        :key="r.id"
                        type="button"
                        class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                        :class="selectedReceipt?.id === r.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'"
                        @click="selectReceipt(r)"
                      >
                        <div class="min-w-0 flex-1">
                          <p class="font-medium">{{ r.no }}</p>
                          <p v-if="r.customer" class="truncate text-xs text-gray-500">{{ r.customer.name }}</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
                <p v-if="getFieldError('purchase_receipt_id')" class="mt-1 text-xs text-red-600">{{ getFieldError('purchase_receipt_id') }}</p>
              </div>

              <!-- Date Created -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Tanggal Retur</label>
                <input v-model="form.date_created" type="date" class="input-field" />
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
 

              <!-- Note -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan</label>
                <textarea
                  v-model="form.note"
                  rows="3"
                  placeholder="Catatan retur (opsional)"
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
            <h2 class="mb-4 text-sm font-semibold text-gray-900">Item Retur <span class="text-red-500">*</span></h2>

            <p v-if="getFieldError('items')" class="mb-3 text-xs text-red-600">{{ getFieldError('items') }}</p>

            <div v-if="!selectedReceipt" class="rounded-lg border-2 border-dashed border-gray-200 py-10 text-center">
              <Package class="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p class="text-sm text-gray-400">Pilih penerimaan barang terlebih dahulu</p>
            </div>

            <!-- Items table -->
            <div v-else-if="items.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 text-left text-xs font-medium text-gray-400">
                    <th class="pb-2 pr-3">Produk</th>
                    <th class="w-16 pb-2 px-2 text-center">Maks</th>
                    <th class="w-20 pb-2 px-2 text-center">Qty</th>
                    <th class="w-28 pb-2 px-2 text-right">Harga</th>
                    <th class="w-32 pb-2 px-2 text-right">Total</th>
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
                        <p class="mt-0.5 text-xs text-gray-500">{{ item.sku }}</p>
                      </div> 
                      <p v-if="getItemError(idx, 'qty')" class="mt-0.5 text-left text-[10px] leading-tight text-red-500">
                        {{ getItemError(idx, 'qty') }}
                      </p>
                    </td>
                    <td class="px-2 py-3 text-center text-xs text-gray-400">
                      {{ item.max_qty }}
                    </td>
                    <td class="px-2 py-3">
                      <input
                        v-model.number="item.qty"
                        type="number"
                        min="0"
                        :max="item.max_qty"
                        :class="['input-sm mx-auto w-16 text-center', getItemError(idx, 'qty') ? 'border-red-400' : '']"
                        @input="updateItemQty(item)"
                      />
                    </td>
                    <td class="px-2 py-3 text-right text-sm font-medium text-gray-900 whitespace-nowrap">
                      Rp{{ formatCurrency(item.price) }}
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
              <p class="text-sm text-gray-400">Tidak ada item yang tersedia untuk diretur</p>
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
                  <input v-model.number="form.discount" type="number" min="0" class="input-sm pl-7 text-right" />
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-sm text-gray-500">Ongkir</span>
                <div class="relative flex-1">
                  <span class="rp-prefix">Rp</span>
                  <input v-model.number="form.shipping_fee" type="number" min="0" class="input-sm pl-7 text-right" />
                </div>
              </div>

              <!-- <div class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-sm text-gray-500">Pajak</span>
                <div class="relative flex-1">
                  <span class="rp-prefix">Rp</span>
                  <input v-model.number="form.tax" type="number" min="0" class="input-sm pl-7 text-right" />
                </div>
              </div> -->

              <div class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-sm text-gray-500">Penyesuaian</span>
                <div class="relative flex-1">
                  <span class="rp-prefix">Rp</span>
                  <input v-model.number="form.adjustment" type="number" class="input-sm pl-7 text-right" />
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
              :to="'/purchase/return'"
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
              {{ saving ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Simpan') }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.input-field {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: #111827;
}

.input-sm {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.rp-prefix {
  position: absolute;
  top: 50%;
  left: 0.5rem;
  transform: translateY(-50%);
  font-size: 10px;
  font-weight: 500;
  color: #9ca3af;
  pointer-events: none;
}

.input-field:focus,
.input-sm:focus {
  outline: none;
  border-color: rgb(var(--color-primary-500));
  box-shadow: 0 0 0 2px rgb(var(--color-primary-500) / 0.2);
}

.input-sm:focus {
  box-shadow: 0 0 0 1px rgb(var(--color-primary-500) / 0.2);
}

.input-field::placeholder {
  color: #9ca3af;
}
</style>
