<script setup lang="ts">
import {
  ArrowLeft, Loader2, Search, Trash2, Package, ChevronDown,
  User, Truck, ShoppingCart,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface VariantPair { name: string; value: string }

interface OrderListItem {
  id: string
  no: string
  status: string
  sub_status: string
  total: string
  created_at: string
  date_created: string
  cod: 'yes' | 'no'
  customer: { id: string; name: string; phone: string } | null
  store?: { id: string; shop_name?: string; name?: string; source: string } | null
}

interface OrderDetailItem {
  id: string
  sku_id: string
  product_id: string
  category_name?: string
  name: string
  sku: string
  variants: VariantPair[] | Record<string, string> | null
  weight: number
  qty: number
  qty_returned?: number
  price: string
  discount: string
  total: string
}

interface OrderShipment {
  courier_code?: string
  courier_name?: string
  service_code?: string
  service_name?: string
  tracking_no?: string
  note?: string
  total?: string
}

interface OrderDetail {
  id: string
  no: string
  status: string
  date_created: string
  cod?: 'yes' | 'no'
  source?: string
  discount?: string
  shipping_cost?: string
  shipping_discount?: string
  shipping_total?: string
  cod_cost?: string
  adjustment?: string
  unique_code?: string
  tax?: string

  customer: { id: string; name: string; phone: string } | null
  store?: { id: string; name?: string; shop_name?: string; source: string } | null
  shipment?: OrderShipment | null
  address?: {
    name?: string
    phone?: string
    address?: string
    district?: string
    city?: string
    province?: string
    zipcode?: string
  } | null
  items: OrderDetailItem[] | null
}

interface ReturnDetailItem {
  order_item_id: string
  sku: string
  name: string
  qty: number
  price: string
}

interface ReturnDetail {
  id: string
  order_id: string
  external_id: string
  discount: string
  shipping_cost: string
  shipping_discount: string
  shipping_total: string
  cod_cost: string
  unique_code: string
  adjustment: string
  tax: string
  status: string
  note: string
  order: { id: string; no: string; date_created: string } | null
  customer: { id: string; name: string; phone: string } | null
  shipment: OrderShipment | null
  items: ReturnDetailItem[] | null
}

interface ReturnItemInput {
  order_item_id: string
  sku: string
  name: string
  variants: VariantPair[]
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
const returnId = computed(() => route.query.edit as string)

const loadingData = ref(false)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})

const orderOpen = ref(false)
const orderLoading = ref(false)
const orderSearch = ref('')
const orderResults = ref<OrderListItem[]>([])
const selectedOrder = ref<OrderDetail | null>(null)

const form = reactive({
  order_id: '',
  external_id: '',
  discount: 0,
  shipping_cost: 0,
  shipping_discount: 0,
  shipping_total: 0,
  cod_cost: 0,
  unique_code: 0,
  adjustment: 0,
  tax: 0,
  note: '',
  shipment: {
    courier_code: '',
    courier_name: '',
    service_code: '',
    service_name: '',
    tracking_no: '',
    note: '',
  } as OrderShipment,
})

const items = ref<ReturnItemInput[]>([])

const subtotal = computed(() => items.value.reduce((sum, item) => sum + item.total, 0))
const totalQty = computed(() => items.value.reduce((sum, item) => sum + (Number(item.qty) || 0), 0))
// Net shipping is ongkir minus its discount.
const shippingTotal = computed(() => form.shipping_cost - form.shipping_discount)
const grandTotal = computed(() =>
  subtotal.value - form.discount + shippingTotal.value + form.cod_cost
  + form.unique_code + form.adjustment + form.tax,
)

// Marketplace orders (and COD orders) keep their charges locked; only manual
// non-COD orders may edit the summary.
const MARKETPLACE_SOURCES = ['tiktok', 'lazada', 'shopee']
const orderSource = computed(() =>
  (selectedOrder.value?.store?.source || selectedOrder.value?.source || '').toLowerCase(),
)
const isMarketplace = computed(() => MARKETPLACE_SOURCES.includes(orderSource.value))
const isCod = ref(false)
const summaryEditable = computed(() => !!selectedOrder.value && !isMarketplace.value && !isCod.value)

// When COD is re-checked, reset all charge fields back to the original order values.
watch(isCod, (val) => {
  if (val && selectedOrder.value) {
    const d = selectedOrder.value
    form.discount = Number(d.discount ?? 0) || 0
    form.shipping_cost = Number(d.shipping_cost ?? 0) || 0
    form.shipping_discount = Number(d.shipping_discount ?? 0) || 0
    form.shipping_total = Number(d.shipping_total ?? 0) || 0
    form.cod_cost = Number(d.cod_cost ?? 0) || 0
    form.unique_code = Number(d.unique_code ?? 0) || 0
    form.adjustment = Number(d.adjustment ?? 0) || 0
    form.tax = Number(d.tax ?? 0) || 0
  }
})

function getFieldError(key: string): string | undefined {
  return formErrors.value[key]?.[0]
}

function getItemError(index: number, field: string): string | undefined {
  return formErrors.value[`items[${index}].${field}`]?.[0]
}

// Variants from order item can be an array or an object map; normalize to [{name,value}].
function normalizeVariants(variants: OrderDetailItem['variants']): VariantPair[] {
  if (!variants) return []
  if (Array.isArray(variants)) return variants
  return Object.entries(variants).map(([name, value]) => ({ name, value: String(value) }))
}

function orderStoreName(o: OrderListItem | OrderDetail): string {
  return o.store?.shop_name || o.store?.name || ''
}

let orderTimer: ReturnType<typeof setTimeout>
function onOrderSearch(val: string) {
  orderSearch.value = val
  clearTimeout(orderTimer)
  orderTimer = setTimeout(() => fetchOrders(), 300)
}

async function fetchOrders() {
  orderLoading.value = true
  try {
    const params: Record<string, string> = {
      per_page: '20',
      sort_by: 'created_at',
      sorting: 'desc',
      status: 'shipped',
    }
    if (orderSearch.value) params.search = orderSearch.value
    const res = await api.get<{ data: { data: OrderListItem[] } }>('/sales/orders/index', params)
    orderResults.value = res.data?.data || []
  }
  catch {
    orderResults.value = []
  }
  finally {
    orderLoading.value = false
  }
}

function buildItemsFromOrder(detail: OrderDetail): ReturnItemInput[] {
  return (detail.items || [])
    .map((item) => {
      const maxQty = Math.max(0, Number(item.qty) - Number(item.qty_returned || 0))
      const price = Number(item.price) || 0
      const discount = Number(item.discount) || 0
      return {
        order_item_id: item.id,
        sku: item.sku,
        name: item.name,
        variants: normalizeVariants(item.variants),
        qty: maxQty,
        max_qty: maxQty,
        price,
        discount,
        total: maxQty * (price - discount),
      }
    })
    .filter(item => item.max_qty > 0)
}

async function selectOrder(order: OrderListItem) {
  orderOpen.value = false
  form.order_id = order.id

  try {
    const res = await api.get<{ data: OrderDetail }>(`/sales/orders/${order.id}`)
    const detail = res.data
    selectedOrder.value = detail

    // Auto-fill charge fields from order.
    form.discount = Number(detail.discount ?? 0) || 0
    form.shipping_cost = Number(detail.shipping_cost ?? 0) || 0
    form.shipping_discount = Number(detail.shipping_discount ?? 0) || 0
    form.shipping_total = Number(detail.shipping_total ?? 0) || 0
    form.cod_cost = Number(detail.cod_cost ?? 0) || 0
    form.unique_code = Number(detail.unique_code ?? 0) || 0
    form.adjustment = Number(detail.adjustment ?? 0) || 0
    form.tax = Number(detail.tax ?? 0) || 0
    isCod.value = detail.cod === 'yes'
    // Auto-fill shipment from order.
    if (detail.shipment) {
      form.shipment = {
        courier_code: detail.shipment.courier_code || '',
        courier_name: detail.shipment.courier_name || '',
        service_code: detail.shipment.service_code || '',
        service_name: detail.shipment.service_name || '',
        tracking_no: detail.shipment.tracking_no || '',
        note: detail.shipment.note || '',
      }
    }

    items.value = buildItemsFromOrder(detail)
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat detail order')
    items.value = []
  }
}

function updateItemQty(item: ReturnItemInput) {
  if (item.qty > item.max_qty) item.qty = item.max_qty
  if (item.qty < 0) item.qty = 0
  item.total = item.qty * (item.price - item.discount)
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

async function loadEditData() {
  if (!isEdit.value) return
  loadingData.value = true
  try {
    const res = await api.get<{ data: ReturnDetail }>(`/sales/order-returns/${returnId.value}`)
    const data = res.data

    form.order_id = data.order_id
    form.external_id = data.external_id || ''
    form.discount = Number(data.discount) || 0
    form.shipping_cost = Number(data.shipping_cost) || 0
    form.shipping_discount = Number(data.shipping_discount) || 0
    form.shipping_total = Number(data.shipping_total) || 0
    form.cod_cost = Number(data.cod_cost) || 0
    form.unique_code = Number(data.unique_code) || 0
    form.adjustment = Number(data.adjustment) || 0
    form.tax = Number(data.tax) || 0
    form.note = data.note || ''
    if (data.shipment) {
      form.shipment = {
        courier_code: data.shipment.courier_code || '',
        courier_name: data.shipment.courier_name || '',
        service_code: data.shipment.service_code || '',
        service_name: data.shipment.service_name || '',
        tracking_no: data.shipment.tracking_no || '',
        note: data.shipment.note || '',
      }
    }

    // Fetch the source order to know max returnable qty per item.
    const maxQtyMap = new Map<string, number>()
    if (data.order_id) {
      try {
        const orderRes = await api.get<{ data: OrderDetail }>(`/sales/orders/${data.order_id}`)
        selectedOrder.value = orderRes.data
        isCod.value = orderRes.data.cod === 'yes'
        for (const item of orderRes.data.items || []) {
          // The current return qty is already excluded from qty_returned, add it back.
          const base = Math.max(0, Number(item.qty) - Number(item.qty_returned || 0))
          maxQtyMap.set(item.id, base)
        }
      }
      catch {
        // Fallback to the saved qty as the max below.
      }
    }

    items.value = (data.items || []).map((item) => {
      const currentQty = Number(item.qty) || 0
      const price = Number(item.price) || 0
      const maxFromOrder = maxQtyMap.get(item.order_item_id)
      const maxQty = typeof maxFromOrder === 'number'
        ? Math.max(currentQty, maxFromOrder + currentQty)
        : currentQty
      return {
        order_item_id: item.order_item_id,
        sku: item.sku,
        name: item.name,
        variants: [],
        qty: currentQty,
        max_qty: maxQty,
        price,
        discount: 0,
        total: currentQty * price,
      }
    })
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data retur')
    router.push('/sales/return')
  }
  finally {
    loadingData.value = false
  }
}

async function handleSubmit(status: 'draft' | 'completed') {
  if (!form.order_id) {
    formErrors.value = { order_id: ['Order wajib dipilih'] }
    return
  }

  const payloadItems = items.value
    .filter(item => Number(item.qty) > 0)
    .map(item => ({ order_item_id: item.order_item_id, qty: Number(item.qty) }))

  if (!payloadItems.length) {
    formErrors.value = { items: ['Minimal 1 item retur dengan qty > 0'] }
    return
  }

  saving.value = true
  formErrors.value = {}

  try {
    const payload: Record<string, any> = {
      order_id: form.order_id,
      external_id: form.external_id,
      status,
      note: form.note,
      items: payloadItems,
      shipment: {
        courier_code: form.shipment.courier_code,
        courier_name: form.shipment.courier_name,
        service_code: form.shipment.service_code,
        service_name: form.shipment.service_name,
        tracking_no: form.shipment.tracking_no,
        note: form.shipment.note,
      },
    }
    payload.subtotal = subtotal.value
    payload.discount = form.discount
    payload.shipping_cost = form.shipping_cost
    payload.shipping_discount = form.shipping_discount
    payload.shipping_total = form.shipping_cost - form.shipping_discount
    payload.cod_cost = form.cod_cost
    payload.unique_code = form.unique_code
    payload.adjustment = form.adjustment
    payload.tax = form.tax
    payload.total = grandTotal.value
    payload.cod = isCod.value ? 'yes' : 'no'

    if (isEdit.value) {
      await api.put(`/sales/order-returns/${returnId.value}`, payload)
      toast.success('Retur penjualan berhasil diperbarui')
    }
    else {
      await api.post('/sales/order-returns/create', payload)
      toast.success('Retur penjualan berhasil dibuat')
    }
    router.push('/sales/return')
  }
  catch (err: any) {
    // errors = error per field (object); error = main error message.
    if (err.errors && Object.keys(err.errors).length) {
      formErrors.value = err.errors
    }
    if (err.message) {
      toast.error(err.message)
    }
    else if (!err.errors || !Object.keys(err.errors).length) {
      toast.error(`Gagal ${isEdit.value ? 'memperbarui' : 'membuat'} retur penjualan`)
    }
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  if (isEdit.value) loadEditData()
  else fetchOrders()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        :to="'/sales/return'"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        title="Kembali ke daftar retur penjualan"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
        {{ isEdit ? 'Edit Retur Penjualan' : 'Buat Retur Penjualan' }}
      </h1>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loadingData" class="grid gap-5 lg:grid-cols-4">
      <div class="lg:col-span-1">
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
          <div class="mt-4 space-y-4">
            <div v-for="i in 4" :key="i">
              <div class="h-3 w-24 animate-pulse rounded bg-gray-100" />
              <div class="mt-1.5 h-10 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
      <div class="space-y-5 lg:col-span-3">
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-28 animate-pulse rounded bg-gray-200" />
          <div class="mt-4 space-y-3">
            <div v-for="i in 3" :key="i" class="h-12 w-full animate-pulse rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <template v-else>
      <div class="grid gap-5 lg:grid-cols-4">
        <!-- LEFT: Info (1/4) -->
        <div class="space-y-5 lg:col-span-1">
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-sm font-semibold text-gray-900">Informasi Retur</h2>
            <div class="space-y-4">
              <!-- Order Picker -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Order <span class="text-red-500">*</span></label>
                <div v-if="selectedOrder && isEdit" class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                  {{ selectedOrder.no }}
                </div>
                <div v-else class="relative">
                  <button
                    type="button"
                    class="input-field flex items-center justify-between bg-white text-left"
                    @click="orderOpen = !orderOpen; if (orderOpen && !orderResults.length) fetchOrders()"
                  >
                    <span :class="selectedOrder ? 'text-gray-900' : 'text-gray-400'">
                      {{ selectedOrder ? selectedOrder.no : 'Pilih / cari order' }}
                    </span>
                    <ChevronDown class="h-4 w-4 text-gray-400 transition-transform" :class="{ 'rotate-180': orderOpen }" />
                  </button>
                  <div v-if="orderOpen" class="absolute left-0 top-full z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div class="border-b border-gray-100 p-2">
                      <div class="relative">
                        <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        <input
                          :value="orderSearch"
                          type="text"
                          placeholder="Cari no order, pelanggan..."
                          class="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                          @input="onOrderSearch(($event.target as HTMLInputElement).value)"
                        />
                      </div>
                    </div>
                    <div class="max-h-60 overflow-y-auto">
                      <div v-if="orderLoading" class="flex items-center justify-center py-4">
                        <Loader2 class="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                      <div v-else-if="!orderResults.length" class="px-3 py-4 text-center text-sm text-gray-400">
                        Tidak ada order yang tersedia
                      </div>
                      <button
                        v-for="o in orderResults"
                        v-else
                        :key="o.id"
                        type="button"
                        class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                        :class="selectedOrder?.id === o.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'"
                        @click="selectOrder(o)"
                      >
                        <div class="min-w-0 flex-1">
                          <p class="font-medium">{{ o.no }}</p> 
                          <p v-if="o.customer" class="truncate text-xs text-gray-500">{{ o.customer.name }}</p>
                        </div>
                        <span class="shrink-0 text-xs font-medium text-gray-500">Rp{{ formatCurrency(o.total) }}</span>
                      </button>
                    </div>
                  </div>
                </div>
                <p v-if="getFieldError('order_id')" class="mt-1 text-xs text-red-600">{{ getFieldError('order_id') }}</p>
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

          <!-- Customer (auto from order) -->
          <div v-if="selectedOrder?.customer" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <User class="h-4 w-4 text-gray-400" /> Pelanggan
            </h2>
            <p class="text-sm font-medium text-gray-900">{{ selectedOrder.customer.name }}</p>
            <p class="text-xs text-gray-500">{{ selectedOrder.customer.phone || '-' }}</p>
            <div v-if="selectedOrder.address" class="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500">
              {{ [selectedOrder.address.address, selectedOrder.address.district, selectedOrder.address.city, selectedOrder.address.province, selectedOrder.address.zipcode].filter(Boolean).join(', ') || '-' }}
            </div>
          </div>

          <!-- Shipment (auto from order, tracking editable) -->
          <div v-if="selectedOrder" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Truck class="h-4 w-4 text-gray-400" /> Pengiriman
            </h2>
            <div class="space-y-3">
              <div class="text-sm text-gray-700">
                <span class="font-medium">{{ form.shipment.courier_name || '-' }}</span>
                <span v-if="form.shipment.service_name" class="text-gray-500"> · {{ form.shipment.service_name }}</span>
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium text-gray-500">No. Resi</label>
                <input
                  v-model="form.shipment.tracking_no"
                  type="text"
                  placeholder="Nomor resi retur (opsional)"
                  class="input-sm"
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
            <p v-if="getFieldError('qty')" class="mb-3 text-xs text-red-600">{{ getFieldError('qty') }}</p>

            <div v-if="!selectedOrder" class="rounded-lg border-2 border-dashed border-gray-200 py-10 text-center">
              <ShoppingCart class="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p class="text-sm text-gray-400">Pilih order terlebih dahulu</p>
            </div>

            <!-- Items table -->
            <div v-else-if="items.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 text-left text-xs font-medium text-gray-400">
                    <th class="pb-2 pr-3">Produk</th>
                    <th class="w-16 px-2 pb-2 text-center">Maks</th>
                    <th class="w-20 px-2 pb-2 text-center">Qty</th>
                    <th class="w-28 px-2 pb-2 text-right">Harga</th>
                    <th class="w-32 px-2 pb-2 text-right">Total</th>
                    <th class="w-8 pb-2" />
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, idx) in items"
                    :key="item.order_item_id"
                    class="border-b border-gray-100 last:border-b-0"
                  >
                    <td class="py-3 pr-3">
                      <p class="line-clamp-2 text-sm font-medium leading-tight text-gray-900">{{ item.name }}</p>
                      <div class="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span class="text-xs text-gray-500">{{ item.sku }}</span>
                        <span v-for="v in item.variants" :key="v.name" class="rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-500">
                          {{ v.value }}
                        </span>
                      </div>
                      <p v-if="getItemError(idx, 'qty')" class="mt-0.5 text-[10px] leading-tight text-red-500">
                        {{ getItemError(idx, 'qty') }}
                      </p>
                    </td>
                    <td class="px-2 py-3 text-center text-xs text-gray-400">{{ item.max_qty }}</td>
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
                    <td class="whitespace-nowrap px-2 py-3 text-right text-sm font-medium text-gray-900">
                      Rp{{ formatCurrency(item.price) }}
                    </td>
                    <td class="whitespace-nowrap px-2 py-3 text-right font-medium text-gray-900">
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
              <Package class="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p class="text-sm text-gray-400">Tidak ada item yang tersedia untuk diretur</p>
            </div>
          </div>

          <!-- Summary -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div class="mb-4 flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold text-gray-900">Ringkasan</h2>
              <!-- Marketplace orders are locked; manual orders get a COD toggle. -->
              <span
                v-if="selectedOrder && isMarketplace"
                class="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium capitalize text-gray-500"
              >
                {{ orderSource || 'Marketplace' }}
              </span>
              <label
                v-else-if="selectedOrder"
                class="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-600"
              >
                <input
                  v-model="isCod"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500/30"
                />
                COD
              </label>
            </div>

            <!-- Editable form: manual (non-marketplace) & non-COD orders -->
            <div v-if="summaryEditable" class="ml-auto max-w-xs space-y-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <span class="text-gray-500">Subtotal ({{ totalQty }} qty)</span>
                <span class="font-medium text-gray-900">Rp{{ formatCurrency(subtotal) }}</span>
              </div>

              <div class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-gray-500">Diskon</span>
                <div class="relative flex-1">
                  <span class="rp-prefix">Rp</span>
                  <input v-model.number="form.discount" type="number" min="0" class="input-sm pl-7 text-right" placeholder="0" />
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-gray-500">Ongkir</span>
                <div class="relative flex-1">
                  <span class="rp-prefix">Rp</span>
                  <input v-model.number="form.shipping_cost" type="number" min="0" class="input-sm pl-7 text-right" placeholder="0" />
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-gray-500">Diskon Ongkir</span>
                <div class="relative flex-1">
                  <span class="rp-prefix">Rp</span>
                  <input v-model.number="form.shipping_discount" type="number" min="0" class="input-sm pl-7 text-right" placeholder="0" />
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-gray-500">Biaya COD</span>
                <div class="relative flex-1">
                  <span class="rp-prefix">Rp</span>
                  <input v-model.number="form.cod_cost" type="number" min="0" class="input-sm pl-7 text-right" placeholder="0" />
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-gray-500">Kode Unik</span>
                <div class="relative flex-1">
                  <span class="rp-prefix">Rp</span>
                  <input v-model.number="form.unique_code" type="number" class="input-sm pl-7 text-right" placeholder="0" />
                </div>
              </div>

              <!-- <div class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-gray-500">Pajak</span>
                <div class="relative flex-1">
                  <span class="rp-prefix">Rp</span>
                  <input v-model.number="form.tax" type="number" min="0" class="input-sm pl-7 text-right" placeholder="0" />
                </div>
              </div> -->

              <div class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-gray-500">Penyesuaian</span>
                <div class="relative flex-1">
                  <span class="rp-prefix">Rp</span>
                  <input v-model.number="form.adjustment" type="number" class="input-sm pl-7 text-right" placeholder="0" />
                </div>
              </div>

              <div class="flex items-center justify-between border-t border-gray-200 pt-3">
                <span class="text-sm font-semibold text-gray-900">Grand Total</span>
                <span class="text-base font-bold text-primary-600">Rp{{ formatCurrency(grandTotal) }}</span>
              </div>
            </div>

            <!-- Read-only display: marketplace OR COD orders -->
            <div v-else class="ml-auto max-w-xs space-y-2.5 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-gray-500">Subtotal ({{ totalQty }} qty)</span>
                <span class="font-medium text-gray-900">Rp{{ formatCurrency(subtotal) }}</span>
              </div>

              <div v-if="form.discount" class="flex items-center justify-between">
                <span class="text-gray-500">Diskon</span>
                <span class="text-red-600">-Rp{{ formatCurrency(form.discount) }}</span>
              </div>

              <div v-if="form.shipping_cost" class="flex items-center justify-between">
                <span class="text-gray-500">Ongkir</span>
                <span class="text-gray-900">+Rp{{ formatCurrency(form.shipping_cost) }}</span>
              </div>

              <div v-if="form.shipping_discount" class="flex items-center justify-between">
                <span class="text-gray-500">Diskon Ongkir</span>
                <span class="text-red-600">-Rp{{ formatCurrency(form.shipping_discount) }}</span>
              </div>

              <div v-if="form.cod_cost" class="flex items-center justify-between">
                <span class="text-gray-500">Biaya COD</span>
                <span class="text-gray-900">+Rp{{ formatCurrency(form.cod_cost) }}</span>
              </div>

              <div v-if="form.unique_code" class="flex items-center justify-between">
                <span class="text-gray-500">Kode Unik</span>
                <span class="text-gray-900">+Rp{{ formatCurrency(form.unique_code) }}</span>
              </div>

              <div v-if="form.tax" class="flex items-center justify-between">
                <span class="text-gray-500">Pajak</span>
                <span class="text-gray-900">+Rp{{ formatCurrency(form.tax) }}</span>
              </div>

              <div v-if="form.adjustment" class="flex items-center justify-between">
                <span class="text-gray-500">Penyesuaian</span>
                <span class="text-gray-900">{{ form.adjustment >= 0 ? '+' : '' }}Rp{{ formatCurrency(form.adjustment) }}</span>
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
              :to="'/sales/return'"
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
</style>
