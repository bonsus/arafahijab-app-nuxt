<script setup lang="ts">
import { ArrowLeft, Trash2, Loader2, UserCircle, MapPin, Package, Truck, CreditCard, Ticket, CheckCircle2, ExternalLink } from 'lucide-vue-next'
import type { SalesCustomer, SalesCustomerAddress } from '~/components/SalesCustomerPicker.vue'
import type { SalesProduct, SalesSku } from '~/components/SalesProductSkuPicker.vue'
import type { ShippingService } from '~/components/SalesShippingPicker.vue'
import type { PaymentMethod } from '~/components/SalesPaymentMethodPicker.vue'
import type { CouponOption } from '~/components/SalesCouponPicker.vue'

interface CreatedOrder {
  id: string
  no: string
  date_created: string
  total: string
  payment_total: string
  status: string
  payment_status: string
  payment_provider: string
  payment_method: string
  cod: string
  xendit?: {
    id: string
    external_id: string
    url: string
    type: string
    status: string
    amount: number
    date_expired: string
  }
}

definePageMeta({ middleware: 'auth' })

const api = useApi()
const toast = useToast()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isCs = computed(() => !!authStore.user?.is_cs)
const ordersListPath = computed(() => (isCs.value ? '/sales/ordercs' : '/sales/order'))

const isEdit = computed(() => !!route.query.edit)
const orderId = computed(() => route.query.edit as string)

const saving = ref(false)
const loadingData = ref(false)
const formErrors = ref<Record<string, string[]>>({})

// Success modal
const showSuccessModal = ref(false)
const createdOrder = ref<CreatedOrder | null>(null)

// ─── Customer picker modal ───────────────────────────────────────────────────
const pickerOpen = ref(false)
const pickerInitialCustomer = ref<SalesCustomer | null>(null)

function openPickerSearch() {
  pickerInitialCustomer.value = null
  pickerOpen.value = true
}

function openPickerAddresses() {
  pickerInitialCustomer.value = selectedCustomer.value
  pickerOpen.value = true
}

// ─── Customer ────────────────────────────────────────────────────────────────
const selectedCustomer = ref<SalesCustomer | null>(null)
const selectedAddress = ref<SalesCustomerAddress | null>(null)

// ─── Address ─────────────────────────────────────────────────────────────────
const address = reactive({
  customer_id: '',
  name: '',
  phone: '',
  country: 'Indonesia',
  province: '',
  city: '',
  district: '',
  postal_code: '',
  address: '',
})

const addressSelect = useAddressSelect(address)

function onCustomerAddressSelect(customer: SalesCustomer, addr: SalesCustomerAddress) {
  selectedCustomer.value = customer
  selectedAddress.value = addr
  address.customer_id = customer.id
  address.name = addr.name
  address.phone = addr.phone
  address.country = addr.country || 'Indonesia'
  address.province = addr.province
  address.city = addr.city
  address.district = addr.district
  address.address = addr.address
  address.postal_code = addr.zipcode
  selectedShipping.value = null
  addressSelect.initFromState()
}

// ─── Form meta ───────────────────────────────────────────────────────────────
const form = reactive({
  external_id: '',
  date_created: new Date().toISOString().slice(0, 16),
  date_due: '',
  cod: 'no',
  payment_provider: '',
  payment_method: '',
  payment_method_id: '',
  staff_id: '',
  source: '',
  note: '',
  customer_note: '',
  shipment_note: '',
  discount: 0,
  shipping_discount: 0,
  adjustment: 0,
  tax: 0,
  cod_percent: 0,
  cod_cost: 0,
})

// ─── Source options ───────────────────────────────────────────────────────────
const sourceOptions = ref<string[]>([])
async function fetchSources() {
  try {
    const res = await api.get<{ data: any }>('/options/sales-source')
    const list = (res.data as any)?.value ?? res.data ?? []
    sourceOptions.value = Array.isArray(list) ? list.map((i: any) => i.source) : []
  }
  catch { sourceOptions.value = [] }
}

// ─── Tags ─────────────────────────────────────────────────────────────────────
const tags = ref<string[]>([])
const tagInput = ref('')

function addTag(raw: string) {
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
  for (const t of parts) {
    if (!tags.value.includes(t)) tags.value.push(t)
  }
  tagInput.value = ''
}
function removeTag(i: number) {
  tags.value.splice(i, 1)
}
function onTagKeydown(e: KeyboardEvent) {
  if (e.key === ',' || e.key === 'Enter') {
    e.preventDefault()
    addTag(tagInput.value)
  }
  else if (e.key === 'Backspace' && !tagInput.value && tags.value.length) {
    tags.value.pop()
  }
}
function onTagBlur() {
  if (tagInput.value.trim()) addTag(tagInput.value)
}

// ─── Items ───────────────────────────────────────────────────────────────────
interface ItemRow {
  sku_id: string
  product_id: string
  category_id: string
  sku: string
  name: string
  variants: { name: string; value: string }[]
  weight: number
  qty: number
  price: number
  discount: number          // adjusted per-unit discount (recalculated on qty change)
  promotion_discount: number // original per-unit discount from promotion
  promotion_id: string
  promotion_min_qty: number
  promotion_max_qty: number
  total: number
  is_free: string           // 'yes' or 'no'
  is_preorder: boolean      // whether this SKU is a preorder item
  free_from_sku_ids?: string[]  // track which SKU IDs give this free product
  free_product_info?: {
    promotion_id: string
    promotion_name: string
    base_qty: number        // qty per purchase
    is_multiple: boolean
  }
}

const items = ref<ItemRow[]>([])

const addedSkuIds = computed(() => items.value.filter(i => i.is_free === 'no').map(i => i.sku_id))

// Check if cart has preorder or non-preorder items
const hasPreorderItems = computed(() => items.value.some(i => i.is_free === 'no' && i.is_preorder))
const hasNonPreorderItems = computed(() => items.value.some(i => i.is_free === 'no' && !i.is_preorder))

// Sort items: regular items first, then free items (with original index for operations)
const sortedItemsWithIndex = computed(() => {
  return items.value
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((a, b) => {
      // Regular items (is_free === 'no') first, then free items
      if (a.item.is_free === 'no' && b.item.is_free === 'yes') return -1
      if (a.item.is_free === 'yes' && b.item.is_free === 'no') return 1
      return 0
    })
})

// Helper functions for free products
function addFreeProducts(sourceSkuId: string, freeProducts: any[], sourceQty: number) {
  for (const freeProduct of freeProducts) {
    // Check if this free SKU already exists (added by another source SKU)
    const existingFree = items.value.find(i => 
      i.is_free === 'yes' && 
      i.sku_id === freeProduct.sku_id &&
      i.free_product_info?.promotion_id === freeProduct.promotion_id
    )
    
    if (existingFree) {
      // Add this source to tracking
      if (!existingFree.free_from_sku_ids) existingFree.free_from_sku_ids = []
      if (!existingFree.free_from_sku_ids.includes(sourceSkuId)) {
        existingFree.free_from_sku_ids.push(sourceSkuId)
      }
      // Recalculate qty
      recalculateFreeProductQty(existingFree)
    } else {
      // Add new free product
      const freeQty = freeProduct.is_multiple ? freeProduct.qty * sourceQty : freeProduct.qty
      items.value.push({
        sku_id: freeProduct.sku_id,
        product_id: freeProduct.product_id,
        category_id: '',
        sku: freeProduct.sku,
        name: freeProduct.product_name,
        variants: freeProduct.variants || [],
        weight: 0,
        qty: freeQty,
        price: 0,
        discount: 0,
        promotion_discount: 0,
        promotion_id: '',
        promotion_min_qty: 0,
        promotion_max_qty: 0,
        total: 0,
        is_free: 'yes',
        is_preorder: false,
        free_from_sku_ids: [sourceSkuId],
        free_product_info: {
          promotion_id: freeProduct.promotion_id,
          promotion_name: freeProduct.promotion_name,
          base_qty: freeProduct.qty,
          is_multiple: freeProduct.is_multiple,
        },
      })
    }
  }
}

function updateRelatedFreeProducts(sourceItem: ItemRow) {
  if (sourceItem.is_free === 'yes') return
  
  // Find all free products that this SKU gives
  const freeItems = items.value.filter(i => 
    i.is_free === 'yes' && i.free_from_sku_ids?.includes(sourceItem.sku_id)
  )
  
  for (const freeItem of freeItems) {
    recalculateFreeProductQty(freeItem)
  }
}

function recalculateFreeProductQty(freeItem: ItemRow) {
  if (!freeItem.free_product_info || !freeItem.free_from_sku_ids) return
  
  let totalQty = 0
  const baseQty = freeItem.free_product_info.base_qty
  const isMultiple = freeItem.free_product_info.is_multiple
  
  for (const sourceSkuId of freeItem.free_from_sku_ids) {
    const sourceItem = items.value.find(i => i.sku_id === sourceSkuId && i.is_free === 'no')
    if (sourceItem) {
      if (isMultiple) {
        totalQty += baseQty * sourceItem.qty
      } else {
        totalQty += baseQty
      }
    }
  }
  
  freeItem.qty = totalQty
}

function onAddSku(product: SalesProduct, sku: SalesSku, price: number) {
  if (items.value.some(i => i.sku_id === sku.sku_id && i.is_free === 'no')) {
    toast.error('SKU ini sudah ditambahkan')
    return
  }
  
  // Validate preorder mixing
  const isPreorder = sku.is_preorder || false
  if (isPreorder && hasNonPreorderItems.value) {
    toast.error('Tidak bisa menambahkan produk preorder dengan produk non-preorder')
    return
  }
  if (!isPreorder && hasPreorderItems.value) {
    toast.error('Tidak bisa menambahkan produk non-preorder dengan produk preorder')
    return
  }
  
  const promoDiscount = Number(sku.discount) || 0
  const promoMin = sku.promotion?.min_qty ?? 0
  const promoMax = sku.promotion?.max_qty ?? 0
  const qualifies = promoMin === 0 || 1 >= promoMin
  const effectiveDiscount = qualifies ? promoDiscount : 0
  items.value.push({
    sku_id: sku.sku_id,
    product_id: sku.product_id,
    category_id: product.category?.id || '',
    sku: sku.sku,
    name: product.name,
    variants: sku.variants || [],
    weight: sku.weight || 0,
    qty: 1,
    price,
    discount: effectiveDiscount,
    promotion_discount: promoDiscount,
    promotion_id: sku.promotion?.id || '',
    promotion_min_qty: promoMin,
    promotion_max_qty: promoMax,
    total: Math.max(0, price - effectiveDiscount),
    is_free: 'no',
    is_preorder: isPreorder,
  })
  
  // Add free products if any
  if (sku.product_frees && sku.product_frees.length > 0) {
    addFreeProducts(sku.sku_id, sku.product_frees, 1)
  }
}

function onAddAllSkus(product: SalesProduct) {
  let added = 0
  for (const sku of product.skus) {
    if (sku.stock <= 0) continue
    if (!items.value.some(i => i.sku_id === sku.sku_id && i.is_free === 'no')) {
      // Validate preorder mixing
      const isPreorder = sku.is_preorder || false
      if (isPreorder && hasNonPreorderItems.value) continue
      if (!isPreorder && hasPreorderItems.value) continue
      
      const basePrice = Number(sku.price_original) || Number(sku.price) || 0
      const promoDiscount = Number(sku.discount) || 0
      const promoMin = sku.promotion?.min_qty ?? 0
      const promoMax = sku.promotion?.max_qty ?? 0
      const qualifies = promoMin === 0 || 1 >= promoMin
      const effectiveDiscount = qualifies ? promoDiscount : 0
      items.value.push({
        sku_id: sku.sku_id,
        product_id: sku.product_id,
        category_id: product.category?.id || '',
        sku: sku.sku,
        name: product.name,
        variants: sku.variants || [],
        weight: sku.weight || 0,
        qty: 1,
        price: basePrice,
        discount: effectiveDiscount,
        promotion_discount: promoDiscount,
        promotion_id: sku.promotion?.id || '',
        promotion_min_qty: promoMin,
        promotion_max_qty: promoMax,
        total: Math.max(0, basePrice - effectiveDiscount),
        is_free: 'no',
        is_preorder: isPreorder,
      })
      
      // Add free products if any
      if (sku.product_frees && sku.product_frees.length > 0) {
        addFreeProducts(sku.sku_id, sku.product_frees, 1)
      }
      
      added++
    }
  }
  if (!added) toast.error('Semua SKU sudah ditambahkan atau tidak kompatibel dengan item di cart')
}

function removeItem(index: number) {
  const item = items.value[index]
  if (!item) return
  
  // If removing a regular item, update or remove related free products
  if (item.is_free === 'no') {
    // Find all free products that were given by this SKU
    const freeItems = items.value.filter(i => 
      i.is_free === 'yes' && i.free_from_sku_ids?.includes(item.sku_id)
    )
    
    for (const freeItem of freeItems) {
      // Remove this SKU from the free product's tracking
      if (freeItem.free_from_sku_ids) {
        const idx = freeItem.free_from_sku_ids.indexOf(item.sku_id)
        if (idx >= 0) freeItem.free_from_sku_ids.splice(idx, 1)
      }
      
      // Recalculate free product qty
      if (freeItem.free_from_sku_ids && freeItem.free_from_sku_ids.length > 0) {
        recalculateFreeProductQty(freeItem)
      } else {
        // No more sources, remove the free product
        const freeIdx = items.value.findIndex(i => i === freeItem)
        if (freeIdx >= 0) items.value.splice(freeIdx, 1)
      }
    }
  }
  
  items.value.splice(index, 1)
}

function updateItemTotal(item: ItemRow) {
  // Free products always have 0 price and total
  if (item.is_free === 'yes') {
    item.price = 0
    item.discount = 0
    item.total = 0
    return
  }
  
  if (item.promotion_id && item.promotion_discount > 0) {
    const min = item.promotion_min_qty
    const max = item.promotion_max_qty
    const qualifies = min === 0 || item.qty >= min
    if (!qualifies) {
      // below minimum — no discount
      item.discount = 0
      item.total = item.price * item.qty
    }
    else {
      // keep the original per-unit promo discount
      item.discount = item.promotion_discount
      // only up to max_qty units get the discount; rest pay full price
      const discountedUnits = max === 0 ? item.qty : Math.min(item.qty, max)
      const fullUnits = item.qty - discountedUnits
      item.total = (item.price - item.promotion_discount) * discountedUnits + item.price * fullUnits
    }
  }
  else {
    item.total = Math.max(0, (item.price - item.discount) * item.qty)
  }
  
  // Update related free products qty
  updateRelatedFreeProducts(item)
}

function itemRowDiscount(item: ItemRow): number {
  if (item.promotion_id && item.promotion_discount > 0) {
    const qualifies = item.promotion_min_qty === 0 || item.qty >= item.promotion_min_qty
    if (!qualifies) return 0
    const discountedUnits = item.promotion_max_qty === 0 ? item.qty : Math.min(item.qty, item.promotion_max_qty)
    return item.promotion_discount * discountedUnits
  }
  return item.discount * item.qty
}

// ─── Shipping ─────────────────────────────────────────────────────────────────
const selectedShipping = ref<ShippingService | null>(null)
const selectedPaymentMethod = ref<PaymentMethod | null>(null)
const manualShippingCost = ref(0)

watch(selectedShipping, () => {
  manualShippingCost.value = 0
})

const isInstantShipping = computed(() => selectedShipping.value?.type === 'instant')

const totalWeight = computed(() => items.value.reduce((s, i) => s + (i.weight || 0) * i.qty, 0))

// ─── Summary calculations ─────────────────────────────────────────────────────
const subtotal = computed(() => items.value.reduce((s, i) => s + i.total, 0))
const totalItemDiscount = computed(() => items.value.reduce((s, i) => {
  if (i.promotion_id && i.promotion_discount > 0) {
    const qualifies = i.promotion_min_qty === 0 || i.qty >= i.promotion_min_qty
    if (!qualifies) return s
    const discountedUnits = i.promotion_max_qty === 0 ? i.qty : Math.min(i.qty, i.promotion_max_qty)
    return s + i.promotion_discount * discountedUnits
  }
  return s + i.discount * i.qty
}, 0))
const shippingCost = computed(() => isInstantShipping.value ? manualShippingCost.value : (selectedShipping.value?.price || 0))

// ─── Coupon ───────────────────────────────────────────────────────────────────
const selectedCheckoutCoupon = ref<CouponOption | null>(null)
const selectedShippingCoupon = ref<CouponOption | null>(null)

const checkoutCouponDiscount = computed(() => {
  if (!selectedCheckoutCoupon.value) return 0
  const c = selectedCheckoutCoupon.value
  if (c.discountType === 'percentage') {
    const raw = subtotal.value * (c.discountValue / 100)
    return c.maxDiscountValue > 0 ? Math.min(raw, c.maxDiscountValue) : raw
  }
  return Math.min(c.discountValue, subtotal.value)
})

const shippingCouponDiscount = computed(() => {
  if (!selectedShippingCoupon.value) return 0
  const c = selectedShippingCoupon.value
  // Only apply if selected shipping service matches an active courier in the coupon
  if (c.couriers?.length && selectedShipping.value) {
    const matches = c.couriers.some(
      cr => cr.status === 'active'
        && cr.courier_code === selectedShipping.value?.courierCode
        && cr.service_code === selectedShipping.value?.serviceCode,
    )
    if (!matches) return 0
  }
  if (c.discountType === 'percentage') {
    const raw = shippingCost.value * (c.discountValue / 100)
    return c.maxDiscountValue > 0 ? Math.min(raw, c.maxDiscountValue) : raw
  }
  if (c.discountType === 'fixed_price') {
    return Math.max(0, shippingCost.value - c.discountValue)
  }
  return Math.min(c.discountValue, shippingCost.value)
})

// Checkout coupon → auto-populate form.discount
watch(checkoutCouponDiscount, (val) => {
  form.discount = Math.round(val)
})
watch(selectedCheckoutCoupon, (val) => {
  if (!val) form.discount = 0
})

// Shipping coupon → auto-populate form.shipping_discount
watch(shippingCouponDiscount, (val) => {
  if (selectedShippingCoupon.value) form.shipping_discount = Math.round(val)
})
watch(selectedShippingCoupon, (val) => {
  if (!val) form.shipping_discount = 0
})

const total = computed(() => subtotal.value + shippingCost.value - form.shipping_discount - form.discount + form.adjustment + form.tax)

// COD cost calculation
const isCODPayment = computed(() => selectedPaymentMethod.value?.category === 'COD')
watch(isCODPayment, (isCOD) => {
  if (!isCOD) {
    form.cod_percent = 0
    form.cod_cost = 0
  }
})

function calculateCODCost() {
  if (form.cod_percent >= 0) {
    form.cod_cost = Math.round((form.cod_percent / 100) * total.value)
  }
}

watch(() => form.cod_percent, calculateCODCost)
watch(total, calculateCODCost)

const grandTotal = computed(() => total.value + form.cod_cost)

// ─── Load for edit ─────────────────────────────────────────────────────────────
async function loadOrder() {
  if (!isEdit.value) return
  loadingData.value = true
  try {
    const res = await api.get<{ data: any }>(`/sales/orders/${orderId.value}`)
    const o = res.data

    form.external_id = o.external_id || ''
    form.date_created = o.date_created ? o.date_created.slice(0, 16) : new Date().toISOString().slice(0, 16)
    form.date_due = o.date_due && !o.date_due.startsWith('0001') ? o.date_due.slice(0, 16) : ''
    form.cod = o.cod || 'no'
    form.payment_provider = o.payment_provider
    form.payment_method = o.payment_method
    form.payment_method_id = o.payment_method_id || ''
    form.staff_id = o.staff_id || ''
    form.source = o.source || ''
    form.note = o.note || ''
    form.customer_note = o.customer_note || ''
    tags.value = Array.isArray(o.tags)
      ? o.tags
      : (o.tags ? String(o.tags).split(',').map((s: string) => s.trim()).filter(Boolean) : [])
    form.discount = Number(o.discount) || 0
    form.adjustment = Number(o.adjustment) || 0
    form.tax = Number(o.tax) || 0
    form.shipping_discount = Number(o.shipping_discount) || 0
    if (o.customer) {
      selectedCustomer.value = { id: o.customer.id, name: o.customer.name, phone: o.customer.phone || '', email: '', category: o.customer_category || null, addresses: [], status: '' }
    }

    if (o.address) {
      address.customer_id = o.address.customer_id || o.customer?.id || ''
      address.name = o.address.name || ''
      address.phone = o.address.phone || ''
      address.country = o.address.country || 'Indonesia'
      address.province = o.address.province || ''
      address.city = o.address.city || ''
      address.district = o.address.district || ''
      address.postal_code = o.address.zipcode || ''
      address.address = o.address.address || ''
      selectedAddress.value = {
        id: '', name: address.name, phone: address.phone,
        country: address.country, province: address.province, city: address.city,
        district: address.district, address: address.address,
        zipcode: address.postal_code, primary: true,
      }
      addressSelect.initFromState()
    }

    if (o.shipment) {
      selectedShipping.value = {
        provider: o.shipment.aggregator || '',
        type: '',
        courierName: o.shipment.courier_name,
        courierCode: o.shipment.courier_code,
        serviceName: o.shipment.service_name,
        serviceCode: o.shipment.service_code,
        cod: false,
        price: Number(o.shipment.price) || 0,
        minDuration: 0,
        maxDuration: 0,
      }
      form.shipment_note = o.shipment.note || ''
    }

    items.value = (o.items || []).map((item: any) => ({
      sku_id: item.sku_id,
      product_id: item.product_id,
      category_id: '',
      sku: item.sku,
      name: item.name,
      variants: item.variants ? Object.entries(item.variants).map(([name, value]) => ({ name, value })) : [],
      weight: Number(item.weight) || 0,
      qty: Number(item.qty) || 1,
      price: Number(item.price) || 0,
      discount: Number(item.discount) || 0,
      promotion_discount: Number(item.promotion_discount) || Number(item.discount) || 0,
      promotion_id: item.promotion_id || '',
      promotion_min_qty: Number(item.promotion_min_qty) || 0,
      promotion_max_qty: Number(item.promotion_max_qty) || 0,
      total: Number(item.total) || 0,
      is_free: item.is_free || 'no',
      is_preorder: item.is_preorder || false,
      free_from_sku_ids: item.free_from_sku_ids || undefined,
      free_product_info: item.free_product_info || undefined,
    }))
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data order')
    router.push(ordersListPath.value)
  }
  finally {
    loadingData.value = false
  }
}

// ─── Staff picker ─────────────────────────────────────────────────────────────
interface StaffUser { id: string; name: string; email: string; phone: string }
const staffSearch = ref('')
const staffLoading = ref(false)
const staffList = ref<StaffUser[]>([])
const staffDropdownOpen = ref(false)
const selectedStaff = ref<StaffUser | null>(null)

let staffDebounce: ReturnType<typeof setTimeout>
function onStaffSearch() {
  clearTimeout(staffDebounce)
  staffDebounce = setTimeout(fetchStaff, 300)
}
async function fetchStaff() {
  staffLoading.value = true
  try {
    const res = await api.get<{ data: any }>('/users/public/index', { search: staffSearch.value, is_cs: 'true' })
    staffList.value = res.data?.data || []
  }
  catch { staffList.value = [] }
  finally { staffLoading.value = false }
}
function selectStaff(s: StaffUser) {
  selectedStaff.value = s
  form.staff_id = s.id
  staffDropdownOpen.value = false
  staffSearch.value = ''
}
function clearStaff() {
  if (isCs.value) return
  selectedStaff.value = null
  form.staff_id = ''
}
function openStaffDropdown() {
  if (isCs.value) return
  staffDropdownOpen.value = true
  staffSearch.value = ''
  fetchStaff()
}


// ─── Submit ───────────────────────────────────────────────────────────────────
async function handleSubmit() {
  formErrors.value = {}

  if (!selectedCustomer.value) {
    formErrors.value = { customer: ['Pelanggan wajib dipilih'] }
    return
  }
  if (!items.value.length) {
    formErrors.value = { items: ['Minimal 1 item produk harus ditambahkan'] }
    return
  }
  if (!selectedShipping.value) {
    formErrors.value = { shipment: ['Pilih layanan pengiriman terlebih dahulu'] }
    return
  }
  if (!address.name || !address.phone || !address.district || !address.postal_code) {
    formErrors.value = { address: ['Alamat pengiriman belum lengkap'] }
    return
  }

  saving.value = true

  const payload = {
    external_id: form.external_id,
    date_created: formatDateTimeWithTZ(form.date_created),
    date_due: formatDateTimeWithTZ(form.date_due),
    cod: selectedPaymentMethod.value?.category === 'COD' ? 'yes' : 'no',
    payment_provider: selectedPaymentMethod.value?.provider || form.payment_provider,
    payment_method: selectedPaymentMethod.value?.code || form.payment_method,
    payment_method_id: selectedPaymentMethod.value?.id || form.payment_method_id,
    note: form.note,
    customer_note: form.customer_note,
    staff_id: form.staff_id,
    source: form.source,
    tags: tags.value,
    coupon_code: selectedCheckoutCoupon.value?.code || '',
    shipping_coupon_code: selectedShippingCoupon.value?.code || '',
    promotion_checkout: selectedCheckoutCoupon.value ? {
      id: selectedCheckoutCoupon.value.promotionId,
      code: selectedCheckoutCoupon.value.code,
    } : null,
    promotion_shipping: selectedShippingCoupon.value ? {
      id: selectedShippingCoupon.value.promotionId,
      code: selectedShippingCoupon.value.code,
    } : null,
    subtotal: String(subtotal.value.toFixed(2)),
    discount: String(form.discount.toFixed(2)),
    adjustment: String(form.adjustment.toFixed(2)),
    tax: String(form.tax.toFixed(2)),
    address: {
      customer_id: address.customer_id || selectedCustomer.value.id,
      name: address.name,
      phone: address.phone,
      country: address.country,
      province: address.province,
      city: address.city,
      district: address.district,
      address: address.address,
      zipcode: address.postal_code,
    },
    shipping_cost: String(shippingCost.value.toFixed(2)),
    shipping_discount: String(form.shipping_discount.toFixed(2)),
    shipping_total: String((shippingCost.value - form.shipping_discount).toFixed(2)),
    cod_cost: String(form.cod_cost.toFixed(2)),
    shipment: {
      courier_code: selectedShipping.value.courierCode,
      courier_name: selectedShipping.value.courierName,
      service_code: selectedShipping.value.serviceCode,
      service_name: selectedShipping.value.serviceName,
      note: form.shipment_note,
      price: String(shippingCost.value.toFixed(2)),
      discount: String(form.shipping_discount.toFixed(2)),
      total: String((shippingCost.value - form.shipping_discount).toFixed(2)),
      aggregator: selectedShipping.value.provider,
    },
    items: items.value.map(i => ({
      sku_id: i.sku_id,
      weight: i.weight,
      qty: i.qty,
      price: String(i.price.toFixed(2)),
      discount: String(itemRowDiscount(i).toFixed(2)),
      discount_total: String(itemRowDiscount(i).toFixed(2)),
      promotion_discount: String(i.promotion_discount.toFixed(2)),
      total: String(i.total.toFixed(2)),
      is_free: i.is_free,
      promotion_id: i.promotion_id || '',
      promotion_product_free_id: (i.is_free === 'yes' && i.free_product_info?.promotion_id) ? i.free_product_info.promotion_id : '',
    })),
  }

  try {
    if (isEdit.value) {
      await api.put(`/sales/orders/${orderId.value}`, payload)
      toast.success('Order berhasil diperbarui')
      router.push(ordersListPath.value)
    }
    else {
      const res = await api.post<{ data: CreatedOrder }>('/sales/orders/create', payload)
      createdOrder.value = res.data
      showSuccessModal.value = true
    }
  }
  catch (err: any) {
    if (err.errors) {
      formErrors.value = err.errors
    }
    else {
      toast.error(err.message || 'Gagal menyimpan order')
    }
  }
  finally {
    saving.value = false
  }
}

function getError(key: string): string | undefined {
  return formErrors.value[key]?.[0]
}

// Success modal actions
function handleCreateNew() {
  showSuccessModal.value = false
  createdOrder.value = null
  // Reset form
  selectedCustomer.value = null
  selectedAddress.value = null
  address.customer_id = ''
  address.name = ''
  address.phone = ''
  address.province = ''
  address.city = ''
  address.district = ''
  address.postal_code = ''
  address.address = ''
  items.value = []
  selectedShipping.value = null
  selectedPaymentMethod.value = null
  selectedCheckoutCoupon.value = null
  selectedShippingCoupon.value = null
  form.external_id = ''
  form.date_created = new Date().toISOString().slice(0, 16)
  form.date_due = ''
  form.staff_id = ''
  form.source = ''
  form.note = ''
  form.customer_note = ''
  form.shipment_note = ''
  tags.value = []
  form.discount = 0
  form.shipping_discount = 0
  form.adjustment = 0
  form.tax = 0
  form.cod_percent = 0
  form.cod_cost = 0
  selectedStaff.value = null
  if (isCs.value && authStore.user) {
    selectedStaff.value = { id: authStore.user.id, name: authStore.user.name, email: authStore.user.email, phone: authStore.user.phone }
    form.staff_id = authStore.user.id
  }
  toast.success('Form berhasil direset untuk order baru')
}

function handleFinish() {
  router.push(ordersListPath.value)
}

function handlePayNowXendit() {
  if (createdOrder.value?.xendit?.url) {
    window.open(createdOrder.value.xendit.url, '_blank')
  }
}

function handlePayNowBankTransfer() {
  if (createdOrder.value?.id) {
    router.push(`/sales/order/${createdOrder.value.id}/payment`)
  }
}

// Helper untuk parse available stock dari error message
function parseAvailableStock(errorMessage: string): number | null {
  const match = errorMessage.match(/tersedia:\s*(\d+)/i)
  if (!match || !match[1]) return null
  return parseInt(match[1], 10)
}

// Function untuk adjust qty produk free ke stok tersedia
function adjustFreeProductQty(index: number, availableQty: number) {
  const item = items.value[index]
  if (item && item.is_free === 'yes') {
    item.qty = availableQty
    // Clear error untuk item ini
    const qtyKey = `items[${index}].qty`
    if (formErrors.value[qtyKey]) {
      delete formErrors.value[qtyKey]
    }
    toast.success(`Qty produk gratis disesuaikan menjadi ${availableQty}`)
  }
}

onMounted(() => {
  fetchSources()
  if (isCs.value && authStore.user) {
    selectedStaff.value = { id: authStore.user.id, name: authStore.user.name, email: authStore.user.email, phone: authStore.user.phone }
    form.staff_id = authStore.user.id
  }
  if (isEdit.value) loadOrder()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        :to="ordersListPath"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
        {{ isEdit ? 'Edit Order Penjualan' : 'Buat Order Penjualan' }}
      </h1>
    </div>

    <!-- Loading -->
    <div v-if="loadingData" class="space-y-4">
      <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
        <div class="mt-4 space-y-3">
          <div v-for="i in 4" :key="i" class="h-10 w-full animate-pulse rounded-lg bg-gray-200" />
        </div>
      </div>
    </div>

    <template v-else>
      <div class="grid gap-5 lg:grid-cols-12">
        <!-- LEFT: Info & Address (4/12) -->
        <div class="space-y-5 lg:col-span-4">

          <!-- Customer -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <UserCircle class="h-4 w-4 text-primary-500" />
              Pelanggan <span class="text-red-500">*</span>
            </h2>

            <!-- No customer yet -->
            <div v-if="!selectedCustomer">
              <button
                type="button"
                class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-4 text-sm font-medium text-gray-500 transition-colors hover:border-primary-400 hover:text-primary-600"
                @click="openPickerSearch"
              >
                <UserCircle class="h-5 w-5" />
                Pilih atau Buat Pelanggan
              </button>
              <p v-if="getError('customer')" class="mt-1 text-xs text-red-600">{{ getError('customer') }}</p>
            </div>

            <!-- Customer selected -->
            <div v-else class="space-y-2">
              <div class="flex items-start gap-3 rounded-xl bg-primary-50 p-3 ring-1 ring-primary-100">
                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-200">
                  <UserCircle class="h-5 w-5 text-primary-700" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-primary-900">{{ selectedCustomer.name }}</p>
                  <p v-if="selectedCustomer.phone" class="text-xs text-primary-600">{{ selectedCustomer.phone }}</p>
                  <p v-if="selectedCustomer.category" class="mt-0.5 text-xs text-primary-500">
                    Kategori: {{ selectedCustomer.category.name }}
                  </p>
                </div>
                <button
                  type="button"
                  class="shrink-0 text-xs text-primary-400 hover:text-primary-600"
                  @click="openPickerSearch"
                >
                  Ganti
                </button>
              </div>

              <!-- Selected address summary -->
              <div v-if="selectedAddress" class="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-medium text-gray-700">{{ selectedAddress.name }} · {{ selectedAddress.phone }}</p>
                    <p class="mt-0.5 text-xs text-gray-500 line-clamp-2">
                      {{ selectedAddress.address }}, {{ selectedAddress.district }}, {{ selectedAddress.city }}, {{ selectedAddress.province }} {{ selectedAddress.zipcode }}
                    </p>
                    <!-- Address errors -->
                    <div v-if="getError('address.name') || getError('address.phone') || getError('address.district') || getError('address.postal_code') || getError('address.address')" class="mt-2 space-y-0.5">
                      <p v-if="getError('address.name')" class="text-xs text-red-600">• {{ getError('address.name') }}</p>
                      <p v-if="getError('address.phone')" class="text-xs text-red-600">• {{ getError('address.phone') }}</p>
                      <p v-if="getError('address.province')" class="text-xs text-red-600">• {{ getError('address.province') }}</p>
                      <p v-if="getError('address.city')" class="text-xs text-red-600">• {{ getError('address.city') }}</p>
                      <p v-if="getError('address.district')" class="text-xs text-red-600">• {{ getError('address.district') }}</p>
                      <p v-if="getError('address.zipcode')" class="text-xs text-red-600">• {{ getError('address.zipcode') }}</p>
                      <p v-if="getError('address.address')" class="text-xs text-red-600">• {{ getError('address.address') }}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-medium text-primary-600 ring-1 ring-gray-200 transition-colors hover:bg-primary-50"
                    @click="openPickerAddresses"
                  >
                    Kelola
                  </button>
                </div>
              </div>
              <button
                v-else
                type="button"
                class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-2 text-xs text-gray-500 hover:border-primary-300 hover:text-primary-600"
                @click="openPickerAddresses"
              >
                <MapPin class="h-3.5 w-3.5" /> Pilih Alamat Pengiriman
              </button>
            </div>

            <!-- Customer picker modal -->
            <SalesCustomerPicker
              v-model="pickerOpen"
              :initial-customer="pickerInitialCustomer"
              @select="onCustomerAddressSelect"
            />
            <p v-if="getError('address')" class="mb-3 text-xs text-red-600">{{ getError('address') }}</p>

          </div>

          <!-- Shipping Address -->
          <!-- <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200"> 
            <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <MapPin class="h-4 w-4 text-primary-500" />
              Alamat Pengiriman <span class="text-red-500">*</span>
            </h2>

            <p v-if="getError('address')" class="mb-3 text-xs text-red-600">{{ getError('address') }}</p>

            <div class="space-y-3">
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Nama Penerima <span class="text-red-500">*</span></label>
                <input v-model="address.name" type="text" class="input-field" placeholder="Nama penerima" />
                <p v-if="getError('address.name')" class="mt-1 text-xs text-red-600">{{ getError('address.name') }}</p>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Telepon <span class="text-red-500">*</span></label>
                <input v-model="address.phone" type="text" class="input-field" placeholder="08xxxx" />
                <p v-if="getError('address.phone')" class="mt-1 text-xs text-red-600">{{ getError('address.phone') }}</p>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Provinsi <span class="text-red-500">*</span></label>
                <AppSearchSelect
                  :model-value="address.province"
                  :options="addressSelect.provinces.value"
                  :loading="addressSelect.loadingProvinces.value"
                  placeholder="Pilih Provinsi"
                  @update:model-value="(v) => { address.province = v; address.city = ''; address.district = ''; address.postal_code = ''; selectedShipping = null; addressSelect.onProvinceChange(v) }"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Kota <span class="text-red-500">*</span></label>
                <AppSearchSelect
                  :model-value="address.city"
                  :options="addressSelect.cities.value"
                  :loading="addressSelect.loadingCities.value"
                  :disabled="!address.province"
                  placeholder="Pilih Kota"
                  @update:model-value="(v) => { address.city = v; address.district = ''; address.postal_code = ''; selectedShipping = null; addressSelect.onCityChange(v) }"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Kecamatan <span class="text-red-500">*</span></label>
                <AppSearchSelect
                  :model-value="address.district"
                  :options="addressSelect.districts.value"
                  :loading="addressSelect.loadingDistricts.value"
                  :disabled="!address.city"
                  placeholder="Pilih Kecamatan"
                  @update:model-value="(v) => { address.district = v; address.postal_code = ''; selectedShipping = null; addressSelect.onDistrictChange(v) }"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Kode Pos <span class="text-red-500">*</span></label>
                <AppSearchSelect
                  :model-value="address.postal_code"
                  :options="addressSelect.zipcodes.value"
                  :loading="addressSelect.loadingZipcodes.value"
                  :disabled="!address.district"
                  placeholder="Kode Pos"
                  @update:model-value="(v) => { address.postal_code = v; selectedShipping = null }"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Alamat Lengkap <span class="text-red-500">*</span></label>
                <textarea
                  v-model="address.address"
                  rows="2"
                  class="input-field"
                  placeholder="Jl. Nama Jalan No. X, RT/RW, Kel/Desa"
                />
              </div>
            </div>
          </div> -->

          <!-- Order Info -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-sm font-semibold text-gray-900">Info Order</h2>
            <div class="space-y-3">
              <!-- external ID -->
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">External ID</label>
                <input v-model="form.external_id" type="text" class="input-field" placeholder="ID referensi eksternal" />
              </div>
              <!-- tanggal dibuat -->
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Tanggal Order</label>
                <input v-model="form.date_created" type="datetime-local" class="input-field" />
              </div>
              <!-- tanggal jatuh tempo -->
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Jatuh Tempo / Batal Otomatis</label>
                <input v-model="form.date_due" type="datetime-local" class="input-field" />
              </div>
              <!-- CS -->
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Staff / CS</label>
                <!-- Selected -->
                <div v-if="selectedStaff" class="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2">
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-primary-900">{{ selectedStaff.name }}</p>
                    <p class="text-xs text-primary-500">{{ selectedStaff.email }}</p>
                  </div>
                  <button type="button" class="text-xs text-primary-400 hover:text-primary-600" v-if="!isCs" @click="clearStaff">Hapus</button>
                </div>
                <!-- Trigger -->
                <button
                  v-else
                  type="button"
                  class="flex w-full items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-500 hover:border-primary-400"
                  @click="openStaffDropdown"
                >
                  <span class="flex-1 text-left">Pilih staff / CS...</span>
                </button>
                <!-- Dropdown -->
                <div v-if="staffDropdownOpen" class="relative z-20 mt-1">
                  <div class="rounded-xl border border-gray-200 bg-white shadow-lg">
                    <div class="border-b border-gray-100 p-2">
                      <input
                        v-model="staffSearch"
                        type="text"
                        class="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-primary-400 focus:outline-none"
                        placeholder="Cari nama staff..."
                        autofocus
                        @input="onStaffSearch"
                      />
                    </div>
                    <div class="max-h-48 overflow-y-auto">
                      <div v-if="staffLoading" class="px-4 py-3 text-center text-xs text-gray-400">Memuat...</div>
                      <div v-else-if="!staffList.length" class="px-4 py-3 text-center text-xs text-gray-400">Tidak ada data</div>
                      <button
                        v-for="s in staffList"
                        :key="s.id"
                        type="button"
                        class="flex w-full items-start gap-2 px-4 py-2.5 text-left hover:bg-primary-50"
                        @click="selectStaff(s)"
                      >
                        <div>
                          <p class="text-sm font-medium text-gray-900">{{ s.name }}</p>
                          <p class="text-xs text-gray-400">{{ s.email }}</p>
                        </div>
                      </button>
                    </div>
                    <div class="border-t border-gray-100 p-2">
                      <button type="button" class="w-full rounded-lg py-1 text-xs text-gray-400 hover:bg-gray-50" @click="staffDropdownOpen = false">Tutup</button>
                    </div>
                  </div>
                </div>
              </div>
              <!-- source -->
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Sumber Penjualan</label>
                <select v-model="form.source" class="input-field text-sm text-gray-500">
                  <option value="">-- Pilih sumber --</option>
                  <option v-for="src in sourceOptions" :key="src" :value="src">{{ src }}</option>
                </select>
              </div>
              <!-- tags -->
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Tags</label>
                <div
                  class="flex min-h-[42px] flex-wrap items-center gap-1 rounded-lg border border-gray-300 px-2 py-1.5 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20"
                  @click="($event.currentTarget as HTMLElement).querySelector('input')?.focus()"
                >
                  <span
                    v-for="(tag, i) in tags"
                    :key="i"
                    class="flex items-center gap-1 rounded bg-primary-100 px-2 py-0.5 text-xs text-primary-800"
                  >
                    {{ tag }}
                    <button type="button" class="leading-none text-primary-400 hover:text-primary-700" @click.stop="removeTag(i)">×</button>
                  </span>
                  <input
                    v-model="tagInput"
                    type="text"
                    class="min-w-[100px] flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
                    placeholder="Ketik tag, pisah dengan koma..."
                    @keydown="onTagKeydown"
                    @blur="onTagBlur"
                  />
                </div>
              </div>
              <!-- catatan internal -->
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Catatan Internal</label>
                <textarea v-model="form.note" rows="2" class="input-field" placeholder="Catatan untuk tim internal" />
              </div>
              <!-- catatan pelanggan -->
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Catatan Pelanggan</label>
                <textarea v-model="form.customer_note" rows="2" class="input-field" placeholder="Catatan dari pelanggan" />
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Products + Shipping + Summary (8/12) -->
        <div class="space-y-5 lg:col-span-8">

          <!-- Product Items -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Package class="h-4 w-4 text-primary-500" />
              Item Produk <span class="text-red-500">*</span>
            </h2>

            <SalesProductSkuPicker
              :added-sku-ids="addedSkuIds"
              :customer-id="selectedCustomer?.id"
              :customer-category-id="selectedCustomer?.category?.id"
              class="mb-4"
              @add-sku="onAddSku"
              @add-all-skus="onAddAllSkus"
            />

            <p v-if="getError('items')" class="mb-3 text-xs text-red-600">{{ getError('items') }}</p>

            <div v-if="items.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 text-left text-xs font-medium text-gray-400">
                    <th class="pb-2 pr-2">Produk</th>
                    <th class="w-20 pb-2 px-2 text-center">Qty</th>
                    <th class="w-28 pb-2 px-2 text-right">Harga</th>
                    <th class="w-26 pb-2 px-2 text-right">Diskon</th>
                    <th class="w-30 pb-2 px-2 text-right">Total</th>
                    <th class="w-8 pb-2" />
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="{ item, originalIndex: idx } in sortedItemsWithIndex"
                    :key="`${item.sku_id}-${item.is_free}`"
                    class="border-b border-gray-100 last:border-b-0 text-sm"
                    :class="item.is_free === 'yes' ? 'bg-green-50/30' : ''"
                  >
                    <td class="pr-2" :class="item.is_free === 'yes' ? 'py-1.5' : 'py-3'">
                      <div class="flex items-start gap-2">
                        <p :class="item.is_free === 'yes' ? 'text-xs' : 'text-sm'" class="line-clamp-2 font-medium text-gray-900 flex-1">{{ item.name }}</p> 
                        <span v-if="item.is_free === 'no' && item.is_preorder" class="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">PREORDER</span>
                      </div>
                      <div class="flex flex-wrap items-center gap-1 text-xs text-gray-500">
                        <span>{{ item.sku }}</span>
                        <span
                          v-for="v in item.variants"
                          :key="v.name"
                          class="rounded bg-gray-100 px-1 py-0.5 text-[10px]"
                        >{{ v.value }}</span>
                        <span v-if="item.weight > 0" class="text-gray-400">· {{ item.weight }}g</span>
                      </div>
                      <!-- Free product info -->
                      <div v-if="item.is_free === 'yes' && item.free_product_info" class="mt-0.5">
                        <span class="rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-medium text-green-700">
                          {{ item.free_product_info.promotion_name }}
                        </span>
                      </div>
                      <!-- Regular promotion info -->
                      <div v-if="item.is_free === 'no' && item.promotion_id && (item.promotion_min_qty > 0 || item.promotion_max_qty > 0)" class="mt-0.5 flex flex-wrap gap-1">
                        <span
                          v-if="item.promotion_min_qty > 0 && item.qty < item.promotion_min_qty"
                          class="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700"
                        >Min. {{ item.promotion_min_qty }} pcs untuk diskon</span>
                        <span
                          v-else-if="item.promotion_min_qty > 0"
                          class="rounded bg-orange-50 px-1.5 py-0.5 text-[9px] font-medium text-orange-600"
                        >Min. {{ item.promotion_min_qty }} pcs ✓</span>
                        <span
                          v-if="item.promotion_max_qty > 0"
                          class="rounded bg-orange-50 px-1.5 py-0.5 text-[9px] font-medium text-orange-600"
                        >Maks. diskon {{ item.promotion_max_qty }} pcs</span>
                      </div>
                      <!-- Item errors -->
                      <div v-if="getError(`items[${idx}].price`) || getError(`items[${idx}].discount`) || getError(`items[${idx}].qty`) || getError(`items[${idx}].sku_id`)" class="mt-1 space-y-0.5">
                        <p v-if="getError(`items[${idx}].sku_id`)" class="text-[10px] text-red-600">• {{ getError(`items[${idx}].sku_id`) }}</p>
                        <p v-if="getError(`items[${idx}].price`)" class="text-[10px] text-red-600">• {{ getError(`items[${idx}].price`) }}</p>
                        <p v-if="getError(`items[${idx}].discount`)" class="text-[10px] text-red-600">• {{ getError(`items[${idx}].discount`) }}</p>
                        <p v-if="getError(`items[${idx}].qty`)" class="text-[10px] text-red-600">
                          • {{ getError(`items[${idx}].qty`) }}
                          <!-- Tombol konfirmasi untuk adjust qty produk free -->
                          <button
                            v-if="item.is_free === 'yes' && parseAvailableStock(getError(`items[${idx}].qty`) || '')"
                            type="button"
                            class="ml-2 rounded bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-200"
                            @click="adjustFreeProductQty(idx, parseAvailableStock(getError(`items[${idx}].qty`) || '') || 0)"
                          >
                            Sesuaikan ke {{ parseAvailableStock(getError(`items[${idx}].qty`) || '') }}
                          </button>
                        </p>
                      </div>
                    </td>
                    <td class="px-2 py-3">
                      <input
                        v-if="item.is_free === 'no'"
                        v-model.number="item.qty"
                        type="number"
                        min="1"
                        class="input-sm w-16 text-center"
                        @input="updateItemTotal(item)"
                      />
                      <div v-else class="px-1 py-1.5 text-center text-xs text-gray-500">
                        {{ item.qty }}
                      </div>
                    </td>
                    <td class="px-2 py-3">
                      <div class="px-1 py-1.5 text-right font-medium text-[12px]">
                        <span v-if="item.is_free === 'yes'" class="text-green-600 font-bold">-</span>
                        <span v-else>Rp{{ formatCurrency(item.price) }}</span>
                      </div>  
                    </td>
                    <td class="px-2 py-3">
                      <div class="px-1 py-1.5 text-right font-medium text-[12px]" :class="item.is_free === 'yes' ? 'text-gray-400' : 'text-orange-600'">
                        <span v-if="item.is_free === 'yes'">-</span>
                        <span v-else>Rp{{ formatCurrency(itemRowDiscount(item)) }}</span>
                      </div> 
                    </td>
                    <td class="px-2 py-3 text-right font-medium text-[12px] whitespace-nowrap" :class="item.is_free === 'yes' ? 'text-green-600' : 'text-gray-900'">
                      <span v-if="item.is_free === 'yes'" class="font-bold text-[10px]">GRATIS</span>
                      <span v-else>Rp{{ formatCurrency(item.total) }}</span>
                    </td>
                    <td class="py-3 pl-1">
                      <button v-if="item.is_free === 'no'"
                        class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
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
              <Package class="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p class="text-sm text-gray-400">Cari dan tambahkan produk di atas</p>
            </div>
          </div>

          <!-- Shipping -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Truck class="h-4 w-4 text-primary-500" />
              Pengiriman <span class="text-red-500">*</span>
            </h2>

            <p v-if="getError('shipment')" class="mb-3 text-xs text-red-600">{{ getError('shipment') }}</p>

            <SalesShippingPicker
              v-model="selectedShipping"
              :district="address.district"
              :zipcode="address.postal_code"
              :weight="totalWeight"
            />
            <!-- Shipment errors -->
            <div v-if="getError('shipment.courier_code') || getError('shipment.service_code') || getError('shipment.price')" class="mt-2 space-y-0.5">
              <p v-if="getError('shipment.courier_code')" class="text-xs text-red-600">• {{ getError('shipment.courier_code') }}</p>
              <p v-if="getError('shipment.service_code')" class="text-xs text-red-600">• {{ getError('shipment.service_code') }}</p>
              <p v-if="getError('shipment.price')" class="text-xs text-red-600">• {{ getError('shipment.price') }}</p>
            </div>
            <div class="flex items-center gap-2 py-2 text-sm">
              <div class="mt-3 flex-1">
                <label class="mb-1 block text-xs font-medium text-gray-600">Catatan Pengiriman</label>
                <input v-model="form.shipment_note" type="text" class="input-field" placeholder="Catatan untuk kurir" />
              </div>
              <div v-if="isInstantShipping" class="mt-3 w-48 ml-auto">
                <label class="mb-1 block text-xs font-medium text-gray-600">Ongkos Kirim (Instant) <span class="text-red-500">*</span></label>
                <div class="relative">
                  <span class="rp-prefix">Rp</span>
                  <input v-model.number="manualShippingCost" type="number" min="0" class="input-field pl-7 text-right" placeholder="0" />
                  <p v-if="getError('shipment.price')" class="mt-1 text-xs text-red-600">{{ getError('shipment.price') }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Payment Method -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <CreditCard class="h-4 w-4 text-primary-500" />
              Metode Pembayaran <span class="text-red-500">*</span>
            </h2>
            <SalesPaymentMethodPicker
              v-model="selectedPaymentMethod"
              :cod-available="selectedShipping?.cod ?? false"
            />
            <!-- Payment errors -->
            <div v-if="getError('payment_method') || getError('payment_provider')" class="mt-2 space-y-0.5">
              <p v-if="getError('payment_method')" class="text-xs text-red-600">• {{ getError('payment_method') }}</p>
              <p v-if="getError('payment_provider')" class="text-xs text-red-600">• {{ getError('payment_provider') }}</p>
            </div>
            
            <!-- COD Cost (if COD payment) -->
            <div v-if="isCODPayment" class="mt-4 space-y-3 rounded-lg border border-orange-200 bg-orange-50/30 p-3">
              <p class="text-xs font-semibold text-orange-700">Biaya COD</p>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600">Persentase (%)</label>
                  <input
                    v-model.number="form.cod_percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    class="input-field text-right"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600">Biaya COD</label>
                  <div class="relative">
                    <span class="rp-prefix">Rp</span>
                    <input
                      v-model.number="form.cod_cost"
                      type="number"
                      min="0"
                      class="input-field pl-7 text-right"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
              <p class="text-[10px] text-gray-500">
                Biaya COD akan otomatis dihitung berdasarkan persentase × total order. Atau input manual biaya COD.
              </p>
            </div>
          </div>
          <!-- kupon -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Ticket class="h-4 w-4 text-primary-500" />
              Kupon
            </h2>
            <SalesCouponPicker
              v-model:checkout-coupon="selectedCheckoutCoupon"
              v-model:shipping-coupon="selectedShippingCoupon"
              :items="items.map(i => ({ category_id: i.category_id, product_id: i.product_id, sku_id: i.sku_id, qty: i.qty, price: i.price, total: i.total }))"
              :subtotal="subtotal"
              :courier-code="selectedShipping?.courierCode"
              :courier-service-code="selectedShipping?.serviceCode"
              :customer-id="selectedCustomer?.id"
              :customer-category-id="selectedCustomer?.category?.id"
              :province="address.province"
              :city="address.city"
            />
          </div>

          <!-- Summary -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-4 text-sm font-semibold text-gray-900">Ringkasan</h2>
            <div class="ml-auto max-w-xs space-y-3">
              <div class="flex items-center justify-between text-xs text-gray-400">
                <span>Total Berat</span>
                <span>{{ totalWeight }}g</span>
              </div>
              <div v-if="totalItemDiscount > 0" class="flex items-center justify-between text-sm">
                <span class="text-gray-500">Total Produk</span>
                <span class="font-medium text-gray-900">Rp{{ formatCurrency(totalItemDiscount + subtotal) }}</span>
              </div>
              <div v-if="totalItemDiscount > 0" class="flex items-center justify-between text-sm">
                <span class="text-gray-500">Diskon Produk</span>
                <span class="text-red-500">-Rp{{ formatCurrency(totalItemDiscount) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-500">Subtotal ({{ items.length }} item)</span>
                <span class="font-medium text-gray-900">Rp{{ formatCurrency(subtotal) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-500">Ongkir</span>
                <span class="text-gray-900">
                  {{ selectedShipping ? `Rp${formatCurrency(shippingCost)}` : '-' }}
                </span>
              </div>
              <!-- Kupon (shipping: ditampilkan di bawah ongkir) -->
              <div v-if="selectedShippingCoupon && shippingCouponDiscount > 0" class="flex items-center justify-between text-sm">
                <span class="text-gray-500">Diskon Ongkir Kupon</span>
                <span class="text-red-500">-Rp{{ formatCurrency(form.shipping_discount) }}</span>
              </div>
              <div v-else class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-sm text-gray-500">Diskon Ongkir</span>
                <div class="relative flex-1">
                  <span class="rp-prefix">Rp</span>
                  <input
                    v-model.number="form.shipping_discount"
                    type="number"
                    min="0"
                    class="input-sm pl-7 text-right"
                  />
                  <p v-if="getError('shipping_discount')" class="mt-1 text-xs text-red-600">{{ getError('shipping_discount') }}</p>
                </div>
              </div>  
              <!-- Kupon (checkout: ditampilkan di bawah diskon ongkir) -->
              <div v-if="selectedCheckoutCoupon" class="flex items-center justify-between text-sm">
                <span class="text-gray-500">Diskon Order</span>
                <span class="text-red-500 text-sm">-Rp{{ formatCurrency(form.discount) }}</span>
              </div> 
              <div v-else class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-sm text-gray-500">Diskon Order</span>
                <div class="relative flex-1">
                  <span class="rp-prefix">Rp</span>
                  <input
                    v-model.number="form.discount"
                    type="number"
                    min="0"
                    class="input-sm pl-7 text-right"
                    :disabled="!!selectedCheckoutCoupon"
                    :class="selectedCheckoutCoupon ? 'cursor-not-allowed bg-gray-50 text-gray-400' : ''"
                  />
                  <p v-if="getError('discount')" class="mt-1 text-xs text-red-600">{{ getError('discount') }}</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-sm text-gray-500">Penyesuaian</span>
                <div class="relative flex-1">
                  <span class="rp-prefix">Rp</span>
                  <input v-model.number="form.adjustment" type="number" class="input-sm pl-7 text-right" />
                  <p v-if="getError('adjustment')" class="mt-1 text-xs text-red-600">{{ getError('adjustment') }}</p>
                </div>
              </div>
              <!-- <div class="flex items-center gap-3">
                <span class="w-28 shrink-0 text-sm text-gray-500">Pajak</span>
                <div class="relative flex-1">
                  <span class="rp-prefix">Rp</span>
                  <input v-model.number="form.tax" type="number" min="0" class="input-sm pl-7 text-right" />
                </div>
              </div> -->
              <div class="flex items-center justify-between border-t border-gray-200 pt-3">
                <span class="text-sm font-semibold text-gray-900">Total</span>
                <span class="text-base font-bold text-primary-600">Rp{{ formatCurrency(total) }}</span>
              </div>
              <div v-if="form.cod_cost > 0" class="flex items-center justify-between text-sm">
                <span class="text-gray-500">Biaya COD</span>
                <span class="font-medium text-orange-600">+Rp{{ formatCurrency(form.cod_cost) }}</span>
              </div>
              <div v-if="form.cod_cost > 0" class="flex items-center justify-between border-t border-gray-200 pt-3">
                <span class="text-base font-bold text-gray-900">Grand Total</span>
                <span class="text-lg font-bold text-primary-600">Rp{{ formatCurrency(grandTotal) }}</span>
              </div>
            </div>
          </div>

          <!-- General errors (yang tidak terkait dengan field spesifik) -->
          <div v-if="Object.keys(formErrors).some(key => !key.includes('.') && !key.includes('[') && !['customer', 'items', 'address', 'shipment', 'payment_method', 'payment_provider', 'discount', 'adjustment', 'tax'].includes(key))" class="rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
            <p class="mb-2 text-sm font-semibold text-red-700">Terdapat error:</p>
            <ul class="space-y-1">
              <li
                v-for="(msgs, key) in formErrors"
                v-show="!key.includes('.') && !key.includes('[') && !['customer', 'items', 'address', 'shipment', 'payment_method', 'payment_provider', 'discount', 'adjustment', 'tax'].includes(key)"
                :key="key"
                class="text-xs text-red-600"
              >
                <span class="font-medium">{{ key }}:</span> {{ msgs[0] }}
              </li>
            </ul>
          </div>
          <!-- Actions -->
          <div class="sticky bottom-0 flex items-center justify-end gap-3 rounded-xl bg-white/90 px-5 py-4 shadow-sm ring-1 ring-gray-200 backdrop-blur">
            <NuxtLink
              :to="ordersListPath"
              class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              Batal
            </NuxtLink>
            <button
              :disabled="saving"
              class="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleSubmit"
            >
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              {{ saving ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Buat Order Penjualan') }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Success Modal -->
    <Teleport to="body">
      <div v-if="showSuccessModal && createdOrder" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
          <!-- Header -->
          <div class="mb-4 flex flex-col items-center">
            <div class="mb-3 rounded-full bg-green-100 p-3">
              <CheckCircle2 class="h-8 w-8 text-green-600" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Order Berhasil Dibuat!</h3>
            <p class="mt-1 text-sm text-gray-500">Pesanan Anda telah berhasil disimpan ke sistem</p>
          </div>

          <!-- Order Details -->
          <div class="mb-5 space-y-3 rounded-lg bg-gray-50 p-4">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">No. Order</span>
              <span class="font-mono text-sm font-bold text-primary-600">{{ createdOrder.no }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">Total Pembayaran</span>
              <span class="text-base font-bold text-gray-900">Rp{{ formatCurrency(Number(createdOrder.total)) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">Status Order</span>
              <span class="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                {{ createdOrder.status }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">Status Pembayaran</span>
              <span class="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                {{ createdOrder.payment_status }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">Metode Pembayaran</span>
              <span class="text-sm font-medium text-gray-900">{{ createdOrder.payment_method }}</span>
            </div>
          </div>

          <!-- Payment Info (Xendit) -->
          <div v-if="createdOrder.payment_provider === 'xendit' && createdOrder.xendit" class="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p class="mb-2 text-xs font-semibold text-blue-700">Info Pembayaran Xendit</p>
            <div class="space-y-2 text-xs text-blue-600">
              <div class="flex justify-between">
                <span>External ID:</span>
                <span class="font-mono">{{ createdOrder.xendit.external_id }}</span>
              </div>
              <div class="flex justify-between">
                <span>Berlaku Hingga:</span>
                <span>{{ new Date(createdOrder.xendit.date_expired).toLocaleString('id-ID') }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-2">
            <!-- Xendit Payment Button -->
            <button
              v-if="createdOrder.payment_provider === 'xendit' && createdOrder.xendit?.url"
              type="button"
              class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              @click="handlePayNowXendit"
            >
              <ExternalLink class="h-4 w-4" />
              Bayar Sekarang (Xendit)
            </button>

            <!-- Internal Bank Transfer Payment Button -->
            <button
              v-if="createdOrder.payment_provider === 'internal' && createdOrder.payment_method === 'bank_transfer'"
              type="button"
              class="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700"
              @click="handlePayNowBankTransfer"
            >
              <CreditCard class="h-4 w-4" />
              Bayar Sekarang (Bank Transfer)
            </button>

            <div class="flex gap-2">
              <button
                type="button"
                class="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                @click="handleCreateNew"
              >
                Buat Order Baru
              </button>
              <button
                type="button"
                class="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                @click="handleFinish"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
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
