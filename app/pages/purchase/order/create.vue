<script setup lang="ts">
import { ArrowLeft, Trash2, Loader2 } from 'lucide-vue-next'
import type { ProductResult, ProductSku } from '~/components/AppProductSkuPicker.vue'

definePageMeta({ middleware: 'auth' })

interface Supplier {
  id: string
  name: string
  phone: string
}

interface ItemRow {
  sku_id: string
  product_id: string
  sku: string
  name: string
  variants: { name: string; value: string }[]
  image: string
  qty: number
  price: number
  discount: number
  total: number
}

const api = useApi()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const isEdit = computed(() => !!route.query.edit)
const poId = computed(() => route.query.edit as string)

const saving = ref(false)
const loadingData = ref(false)
const formErrors = ref<Record<string, string[]>>({})

const form = reactive({
  customer_id: '',
  external_id: '',
  date_created: new Date().toISOString().slice(0, 10),
  date_expected: '',
  status: 'draft',
  note: '',
})

const items = ref<ItemRow[]>([])
const selectedSupplier = ref<Supplier | null>(null)

const addedSkuIds = computed(() => items.value.map(i => i.sku_id))

// Supplier sync
watch(selectedSupplier, (s) => {
  form.customer_id = s?.id || ''
})

// Product actions
function onAddSku(product: ProductResult, sku: ProductSku) {
  if (items.value.some(i => i.sku_id === sku.sku_id)) {
    toast.error('SKU ini sudah ditambahkan')
    return
  }
  const price = Number(sku.capital_price) || Number(sku.prices?.[0]?.price) || 0
  items.value.push({
    sku_id: sku.sku_id,
    product_id: sku.product_id,
    sku: sku.sku,
    name: product.name,
    variants: sku.variants || [],
    image: sku.image || product.thumbnail || '',
    qty: 1,
    price,
    discount: 0,
    total: price,
  })
}

function onAddAllSkus(product: ProductResult) {
  let added = 0
  for (const sku of product.skus) {
    if (!items.value.some(i => i.sku_id === sku.sku_id)) {
      const price = Number(sku.capital_price) || Number(sku.prices?.[0]?.price) || 0
      items.value.push({
        sku_id: sku.sku_id,
        product_id: sku.product_id,
        sku: sku.sku,
        name: product.name,
        variants: sku.variants || [],
        image: sku.image || product.thumbnail || '',
        qty: 1,
        price,
        discount: 0,
        total: price,
      })
      added++
    }
  }
  if (!added) toast.error('Semua SKU sudah ditambahkan')
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

function updateItemTotal(item: ItemRow) {
  item.total = (item.price - item.discount) * item.qty
  if (item.total < 0) item.total = 0
}

// Summary
const subtotal = computed(() => items.value.reduce((sum, i) => sum + i.total, 0))
const extraDiscount = ref(0)
const shippingFee = ref(0)
const tax = ref(0)
const adjustment = ref(0)
const grandTotal = computed(() => subtotal.value - extraDiscount.value + shippingFee.value + tax.value + adjustment.value)

// Load data for edit
async function loadPO() {
  if (!isEdit.value) return
  loadingData.value = true
  try {
    const res = await api.get<{ data: any }>(`/purchases/${poId.value}`)
    const po = res.data
    form.customer_id = po.customer_id
    form.external_id = po.external_id || ''
    form.date_created = po.date_created ? po.date_created.slice(0, 10) : ''
    form.date_expected = po.date_expected && !po.date_expected.startsWith('0001') ? po.date_expected.slice(0, 10) : ''
    form.status = po.status
    form.note = po.note || ''
    extraDiscount.value = Number(po.discount) || 0
    shippingFee.value = Number(po.shipping_fee) || 0
    tax.value = Number(po.tax) || 0
    adjustment.value = Number(po.adjustment) || 0

    if (po.customer) {
      selectedSupplier.value = { id: po.customer.id, name: po.customer.name, phone: po.customer.phone || '' }
    }

    items.value = (po.items || []).map((item: any) => ({
      sku_id: item.sku_id,
      product_id: item.product_id,
      sku: item.sku,
      name: item.name,
      variants: item.variants || [],
      image: '',
      qty: Number(item.qty) || 0,
      price: Number(item.price) || 0,
      discount: Number(item.discount) || 0,
      total: Number(item.total) || 0,
    }))
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data PO')
    router.push('/purchase/order')
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
  if (!form.customer_id) {
    formErrors.value = { customer_id: ['Supplier wajib dipilih'] }
    return
  }
  if (!items.value.length) {
    formErrors.value = { items: ['Minimal 1 item produk'] }
    return
  }

  saving.value = true
  formErrors.value = {}

  const payload = {
    customer_id: form.customer_id,
    external_id: form.external_id,
    date_created: formatDateRFC(form.date_created),
    date_expected: formatDateRFC(form.date_expected),
    subtotal: subtotal.value,
    discount: extraDiscount.value,
    shipping_fee: shippingFee.value,
    tax: tax.value,
    adjustment: adjustment.value,
    total: grandTotal.value,
    status: form.status,
    note: form.note,
    items: items.value.map(i => ({
      product_id: i.product_id,
      sku_id: i.sku_id,
      qty: i.qty,
      price: i.price,
      discount: i.discount,
      total: i.total,
    })),
  }

  try {
    if (isEdit.value) {
      await api.put(`/purchases/${poId.value}`, payload)
      toast.success('Purchase order berhasil diperbarui')
    }
    else {
      await api.post('/purchases/create', payload)
      toast.success('Purchase order berhasil dibuat')
    }
    router.push('/purchase/order')
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

function getFieldError(key: string): string | undefined {
  return formErrors.value[key]?.[0]
}

onMounted(() => {
  if (isEdit.value) loadPO()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/purchase/order"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
        {{ isEdit ? 'Edit Purchase Order' : 'Buat Purchase Order' }}
      </h1>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loadingData" class="grid gap-5 lg:grid-cols-4">
      <!-- Left Column Skeleton -->
      <div class="lg:col-span-1">
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-24 animate-pulse rounded bg-gray-200" />
          <div class="mt-4 space-y-4">
            <!-- Supplier -->
            <div>
              <div class="h-3 w-14 animate-pulse rounded bg-gray-100" />
              <div class="mt-1.5 h-10 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>
            <!-- External ID -->
            <div>
              <div class="h-3 w-20 animate-pulse rounded bg-gray-100" />
              <div class="mt-1.5 h-10 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>
            <!-- Date Created -->
            <div>
              <div class="h-3 w-24 animate-pulse rounded bg-gray-100" />
              <div class="mt-1.5 h-10 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>
            <!-- Date Expected -->
            <div>
              <div class="h-3 w-20 animate-pulse rounded bg-gray-100" />
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
        <!-- Product Items -->
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-24 animate-pulse rounded bg-gray-200" />
          <div class="mt-4 h-10 w-full animate-pulse rounded-lg bg-gray-200" />
          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200">
                  <th class="pb-2 pr-3"><div class="h-3 w-12 animate-pulse rounded bg-gray-200" /></th>
                  <th class="w-24 pb-2 px-2"><div class="mx-auto h-3 w-8 animate-pulse rounded bg-gray-200" /></th>
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
                  <td class="px-2 py-3"><div class="mx-auto h-8 w-16 animate-pulse rounded-lg bg-gray-200" /></td>
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
          <div class="h-9 w-36 animate-pulse rounded-lg bg-gray-300" />
        </div>
      </div>
    </div>

    <template v-else>
      <div class="grid gap-5 lg:grid-cols-4">
        <!-- LEFT: Info PO (1/4) -->
        <div class="lg:col-span-1">
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-sm font-semibold text-gray-900">Informasi PO</h2>
            <div class="space-y-4">
              <!-- Supplier -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Supplier <span class="text-red-500">*</span></label>
                <AppSupplierPicker v-model="selectedSupplier" />
                <p v-if="getFieldError('customer_id')" class="mt-1 text-xs text-red-600">{{ getFieldError('customer_id') }}</p>
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

              <!-- Status -->
              <!-- <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
                <select v-model="form.status" class="input-field bg-white">
                  <option value="waiting_approval">Waiting Approval</option>
                  <option value="draft">Draft</option> 
                </select>
              </div> -->

              <!-- Date Created -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Tanggal Dibuat</label>
                <input v-model="form.date_created" type="date" class="input-field" />
              </div>

              <!-- Date Expected -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Estimasi Tiba</label>
                <input v-model="form.date_expected" type="date" class="input-field" />
              </div>

              <!-- Note -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan</label>
                <textarea
                  v-model="form.note"
                  rows="3"
                  placeholder="Catatan PO (opsional)"
                  class="input-field"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Products + Summary (3/4) -->
        <div class="space-y-5 lg:col-span-3">
          <!-- Product Items -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-sm font-semibold text-gray-900">Item Produk <span class="text-red-500">*</span></h2>

            <AppProductSkuPicker
              :added-sku-ids="addedSkuIds"
              class="mb-4"
              @add-sku="onAddSku"
              @add-all-skus="onAddAllSkus"
            />

            <p v-if="getFieldError('items')" class="mb-3 text-xs text-red-600">{{ getFieldError('items') }}</p>

            <!-- Items table -->
            <div v-if="items.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 text-left text-xs font-medium text-gray-400">
                    <th class="pb-2 pr-3">Produk</th>
                    <th class="w-24 pb-2 px-2 text-center">Qty</th>
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
                      <div class="flex items-center gap-2.5"> 
                        <div class="min-w-0">
                          <p class="line-clamp-2 text-sm font-medium leading-tight text-gray-900">{{ item.name }}</p>
                          <div class="mt-0.5 flex flex-wrap items-center gap-1 text-xs">
                            <span>{{ item.sku }}</span>
                            <span v-for="v in item.variants" :key="v.name" class="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{{ v.value }}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-2 py-3">
                      <input
                        v-model.number="item.qty"
                        type="number"
                        min="1"
                        class="input-sm w-16 text-center"
                        @input="updateItemTotal(item)"
                      />
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
              <p class="text-sm text-gray-400">Cari dan tambahkan produk di atas</p>
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

              <!-- <div class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-sm text-gray-500">Pajak</span>
                <div class="relative flex-1">
                  <span class="rp-prefix">Rp</span>
                  <input v-model.number="tax" type="number" min="0" class="input-sm pl-7 text-right" />
                </div>
              </div> -->

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
              to="/purchase/order"
              class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              Batal
            </NuxtLink>
            <button
              :disabled="saving"
              class="flex items-center gap-2 rounded-lg bg-gray-500 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              @click="form.status= 'draft'; handleSubmit()"
            >
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              {{ saving ? 'Menyimpan...' : (isEdit ? 'Simpan Draft' : 'Simpan Draft') }}
            </button>
            <button
              :disabled="saving"
              class="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="form.status= 'waiting_approval'; handleSubmit()"
            >
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              {{ saving ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Buat Purchase Order') }}
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