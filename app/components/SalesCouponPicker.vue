<script setup lang="ts">
import { Search, X, Loader2, Ticket, CheckCircle2, ChevronDown, Tag, Truck } from 'lucide-vue-next'

export interface CouponOption {
  id: string
  code: string
  promotionId: string
  promotionName: string
  type: string
  discountType: string
  discountValue: number
  maxDiscountValue: number
  minSpend: number
  minQty: number
  terms: string
  qualified: boolean
  couriers: Array<{ courier_name: string; courier_code: string; service_name: string; service_code: string; status: string }>
}

const props = defineProps<{
  checkoutCoupon: CouponOption | null
  shippingCoupon: CouponOption | null
  items: Array<{ category_id?: string; product_id: string; sku_id: string; qty: number; price: number; total: number }>
  subtotal: number
  courierCode?: string
  courierServiceCode?: string
  customerId?: string
  customerCategoryId?: string
  province?: string
  city?: string
}>()

const emit = defineEmits<{
  'update:checkoutCoupon': [value: CouponOption | null]
  'update:shippingCoupon': [value: CouponOption | null]
}>()

const api = useApi()

const open = ref(false)
const search = ref('')
const loading = ref(false)
const promotions = ref<any[]>([])

const typeLabels: Record<string, string> = {
  checkout: 'Diskon Checkout',
  shipping: 'Diskon Ongkir',
}

// Sort qualified=true first, then group by type
const groupedPromotions = computed(() => {
  const sorted = [...promotions.value].sort((a, b) => {
    if (a.qualified === b.qualified) return 0
    return a.qualified ? -1 : 1
  })
  const groups: Record<string, any[]> = {}
  for (const p of sorted) {
    const t = p.type || 'checkout'
    if (!groups[t]) groups[t] = []
    groups[t]!.push(p)
  }
  return groups
})

let timer: ReturnType<typeof setTimeout>

async function fetchCoupons() {
  loading.value = true
  try {
    const payload: Record<string, any> = {
      items: props.items.map(i => ({
        ...(i.category_id ? { category_id: i.category_id } : {}),
        product_id: i.product_id,
        sku_id: i.sku_id,
        qty: i.qty,
        price: i.price,
        total: i.total,
      })),
      subtotal: props.subtotal,
    }
    if (search.value) payload.search = search.value
    if (props.courierCode) payload.courier_code = props.courierCode
    if (props.courierServiceCode) payload.courier_service_code = props.courierServiceCode
    if (props.customerId) payload.customer_id = props.customerId
    if (props.customerCategoryId) payload.customer_category_id = props.customerCategoryId
    if (props.province) payload.province = props.province
    if (props.city) payload.city = props.city

    const res: any = await api.post('/promotions/checkouts/public/coupons/available', payload)
    promotions.value = res.data || []
  }
  catch {
    promotions.value = []
  }
  finally {
    loading.value = false
  }
}

function onSearchInput() {
  clearTimeout(timer)
  timer = setTimeout(fetchCoupons, 400)
}

function openModal() {
  open.value = true
  search.value = ''
  fetchCoupons()
}

function selectPromotion(promo: any) {
  console.log('Selected promotion:', promo)
  if (!promo.qualified) return
  const available: any[] = promo.coupons || []
  if (!available.length) return
  const coupon = available[Math.floor(Math.random() * available.length)]!
  const option: CouponOption = {
    id: coupon.id,
    code: coupon.code,
    promotionId: promo.id,
    promotionName: promo.name,
    type: promo.type || 'checkout',
    discountType: promo.discount_type || 'percentage',
    discountValue: Number(promo.discount_value) || 0,
    maxDiscountValue: Number(promo.max_discount_value) || 0,
    minSpend: Number(promo.min_spend) || 0,
    minQty: Number(promo.min_qty) || 0,
    terms: promo.terms || '',
    qualified: !!promo.qualified,
    couriers: promo.couriers || [],
  } 
  if (promo.type === 'shipping') {
    emit('update:shippingCoupon', option)
  } else {
    emit('update:checkoutCoupon', option)
  }
  open.value = false
}

function clearCheckoutCoupon() {
  emit('update:checkoutCoupon', null)
}

function clearShippingCoupon() {
  emit('update:shippingCoupon', null)
}

function activeCouriers(promo: any): string[] {
  if (!promo.couriers?.length) return []
  return promo.couriers
    .filter((c: any) => c.status === 'active')
    .map((c: any) => `${c.courier_name} ${c.service_name}`)
}

function isSelected(promo: any): boolean {
  if (promo.type === 'shipping') return props.shippingCoupon?.promotionId === promo.id
  return props.checkoutCoupon?.promotionId === promo.id
}

function selectedCode(promo: any): string | undefined {
  if (promo.type === 'shipping') return props.shippingCoupon?.promotionId === promo.id ? props.shippingCoupon?.code : undefined
  return props.checkoutCoupon?.promotionId === promo.id ? props.checkoutCoupon?.code : undefined
}

function formatDiscount(p: any): string {
  const val = Number(p.discount_value) || 0
  const max = Number(p.max_discount_value) || 0
  if (p.discount_type === 'percentage') {
    return max > 0
      ? `${val}% (maks Rp${max.toLocaleString('id-ID')})`
      : `${val}%`
  }
  if (p.discount_type === 'fixed_price') {
    return `Ongkir jadi Rp${val.toLocaleString('id-ID')}`
  }
  return `-Rp${val.toLocaleString('id-ID')}`
}

function formatMin(p: any): string {
  const parts: string[] = []
  if (Number(p.min_spend) > 0) parts.push(`Min. belanja Rp${Number(p.min_spend).toLocaleString('id-ID')}`)
  if (Number(p.min_qty) > 0) parts.push(`Min. ${p.min_qty} item`)
  return parts.join(' · ')
}
</script>

<template>
  <!-- Trigger -->
  <div class="space-y-2">
    <div class="flex items-center gap-4">
      <!-- Checkout coupon pill -->
      <div v-if="checkoutCoupon" class="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2">
        <Ticket class="h-4 w-4 shrink-0 text-primary-500" />
        <div class="min-w-0 flex-1">
          <p class="text-xs font-bold tracking-wide text-primary-700">{{ checkoutCoupon.code }}</p>
          <p class="truncate text-[10px] text-primary-500">{{ checkoutCoupon.promotionName }}</p>
        </div>
        <button type="button" class="shrink-0 text-primary-400 hover:text-primary-700" @click="clearCheckoutCoupon">
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Shipping coupon pill -->
      <div v-if="shippingCoupon" class="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
        <Truck class="h-4 w-4 shrink-0 text-blue-500" />
        <div class="min-w-0 flex-1">
          <p class="text-xs font-bold tracking-wide text-blue-700">{{ shippingCoupon.code }}</p>
          <p class="truncate text-[10px] text-blue-500">{{ shippingCoupon.promotionName }}</p>
        </div>
        <button type="button" class="shrink-0 text-blue-400 hover:text-blue-700" @click="clearShippingCoupon">
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Open modal button -->
    <button 
      type="button"
      class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
      @click="openModal"
    >
      <Ticket class="h-4 w-4 text-gray-400" /> 
      {{ (checkoutCoupon || shippingCoupon) ? 'Ganti / Tambah Kupon' : 'Pakai Kode Kupon' }}
    </button> 
  </div>

  <!-- Modal -->
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 overflow-y-auto bg-black/50">
      <div class="flex min-h-full items-center justify-center p-4" @click.self="open = false">
        <div class="w-full max-w-lg rounded-xl bg-white shadow-xl">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div class="flex items-center gap-2">
              <Ticket class="h-5 w-5 text-primary-500" />
              <h3 class="text-base font-semibold text-gray-900">Pilih Kode Kupon</h3>
            </div>
            <button type="button" class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="open = false">
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Search -->
          <div class="border-b border-gray-100 px-5 py-3">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                v-model="search"
                type="text"
                placeholder="Cari promosi kupon..."
                class="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm placeholder-normal focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400/20"
                @input="onSearchInput"
              />
            </div>
          </div>

          <!-- Content -->
          <div class="max-h-[60vh] overflow-y-auto p-4">
            <div v-if="loading" class="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
              <Loader2 class="h-5 w-5 animate-spin" /> Memuat kupon...
            </div>

            <div v-else-if="!Object.keys(groupedPromotions).length" class="py-10 text-center text-sm text-gray-400">
              <Ticket class="mx-auto mb-2 h-8 w-8 text-gray-200" />
              Tidak ada kupon tersedia
            </div>

            <div v-else class="space-y-6">
              <div v-for="(promos, type) in groupedPromotions" :key="type">
                <!-- Group label -->
                <div class="mb-2 flex items-center gap-1.5">
                  <Truck v-if="type === 'shipping'" class="h-3.5 w-3.5 text-gray-400" />
                  <Tag v-else class="h-3.5 w-3.5 text-gray-400" />
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {{ typeLabels[type as string] || type }}
                  </span>
                </div>

                <div class="space-y-3"> 
                  <button
                    v-for="promo in promos"
                    :key="promo.id"
                    type="button"
                    :disabled="!promo.qualified"
                    class="w-full rounded-xl border p-4 text-left transition-all"
                    :class="isSelected(promo)
                      ? (promo.type === 'shipping' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400' : 'border-primary-500 bg-primary-50 ring-1 ring-primary-400')
                      : promo.qualified
                        ? (promo.type === 'shipping' ? 'border-blue-200 bg-blue-50/40 hover:border-blue-400 hover:bg-blue-50' : 'border-primary-200 bg-primary-50/40 hover:border-primary-400 hover:bg-primary-50')
                        : 'cursor-not-allowed border-gray-200 bg-gray-50/50 opacity-60'"
                    @click="selectPromotion(promo)"
                  >
                    <div class="flex flex-wrap items-center gap-2"> 
                      <p class="text-sm font-semibold text-gray-900">{{ promo.name }}</p>
                      <span
                        v-if="promo.qualified"
                        class="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700"
                      >
                        <CheckCircle2 class="h-2.5 w-2.5" /> Memenuhi syarat
                      </span>
                      <span
                        v-else
                        class="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500"
                      >
                        Belum memenuhi syarat
                      </span>
                    </div>
                    <p class="mt-0.5 text-xs font-medium" :class="promo.type === 'shipping' ? 'text-blue-600' : 'text-primary-600'">{{ formatDiscount(promo) }}</p>
                    <p v-if="formatMin(promo)" class="mt-0.5 text-[10px] text-gray-500">{{ formatMin(promo) }}</p>
                    <p v-if="promo.terms" class="mt-0.5 text-[10px] italic text-gray-400">{{ promo.terms }}</p>
                    <!-- Active couriers for shipping promos -->
                    <div v-if="promo.type === 'shipping' && activeCouriers(promo).length" class="mt-2 flex flex-wrap gap-1">
                      <span
                        v-for="c in activeCouriers(promo)"
                        :key="c"
                        class="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-600 ring-1 ring-blue-100"
                      >{{ c }}</span>
                    </div>
                    <!-- Selected coupon code indicator -->
                    <div v-if="isSelected(promo)" class="mt-2 flex items-center gap-1.5">
                      <Ticket class="h-3 w-3" :class="promo.type === 'shipping' ? 'text-blue-500' : 'text-primary-500'" />
                      <span class="font-mono text-xs font-bold" :class="promo.type === 'shipping' ? 'text-blue-700' : 'text-primary-700'">{{ selectedCode(promo) }}</span>
                      <span class="text-[10px] text-gray-400">terpilih</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="border-t border-gray-100 px-5 py-3 text-right">
            <button type="button" class="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50" @click="open = false">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
