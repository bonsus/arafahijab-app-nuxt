<script setup lang="ts">
import { Search, X, Loader2, Package, Check, ChevronDown, ShoppingCart } from 'lucide-vue-next'

export interface FreeProduct {
  promotion_id: string
  promotion_name: string
  product_id: string
  product_name: string
  thumbnail: string
  sku_id: string
  sku: string
  variants: { name: string; value: string }[]
  qty: number
  is_multiple: boolean
  stock: number
}

export interface SalesSku {
  sku_id: string
  product_id: string
  sku: string
  variants: { name: string; value: string }[]
  price: string
  price_original: string
  discount: string
  discount_percentage: string
  promotion: { id: string; name: string; discount: string; min_qty: number; max_qty: number } | null
  image: string
  stock: number
  weight: number
  is_preorder?: boolean
  product_frees?: FreeProduct[]
}

export interface SalesProduct {
  id: string
  name: string
  thumbnail: string
  price_min: string
  price_max: string
  status: string
  stock: number
  category: { id: string; name: string } | null
  skus: SalesSku[]
}

const props = defineProps<{
  addedSkuIds: string[]
  customerId?: string | null
  customerCategoryId?: string | null
}>()

const emit = defineEmits<{
  'add-sku': [product: SalesProduct, sku: SalesSku, price: number]
  'add-all-skus': [product: SalesProduct]
}>()

const api = useApi()

const open = ref(false)
const query = ref('')
const loading = ref(false)
const results = ref<SalesProduct[]>([])
const expandedIds = ref<string[]>([])
const total = ref(0)

const filterPreorder = ref(false)
const filterHideOutOfStock = ref(true)

let debounceTimer: ReturnType<typeof setTimeout>
let lastApiQuery = ''

// Search syntax: "query, variant" — the part before the first comma is sent to
// the API as the product search, the parts after are used to filter variants
// on the frontend only (a SKU must match every variant filter term).
const apiQuery = computed(() => (query.value.split(',')[0] || '').trim())

const variantFilters = computed(() =>
  query.value
    .split(',')
    .slice(1)
    .map(p => p.trim().toLowerCase())
    .filter(Boolean),
)

const filteredResults = computed<SalesProduct[]>(() => {
  if (!variantFilters.value.length) return results.value
  return results.value
    .map((product) => {
      const skus = product.skus.filter((sku) => {
        const haystack = [
          ...(sku.variants || []).map(v => v.value),
          sku.sku,
        ].join(' ').toLowerCase()
        return variantFilters.value.every(f => haystack.includes(f))
      })
      return { ...product, skus }
    })
    .filter(product => product.skus.length > 0)
})

function openModal() {
  if (!props.customerId) return
  open.value = true
  fetchProducts()
}

function onSearch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    // Only hit the API when the query part (before the comma) changes.
    // Variant filters are applied on the frontend via `filteredResults`.
    if (apiQuery.value === lastApiQuery) return
    fetchProducts()
  }, 350)
}

function clearSearch() {
  query.value = ''
  fetchProducts()
}

async function fetchProducts() {
  if (!props.customerId) return
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (apiQuery.value) params.search = apiQuery.value
    if (props.customerCategoryId) params.customer_category_id = props.customerCategoryId
    if (filterPreorder.value) params.is_preorder = 'true'
    if (filterHideOutOfStock.value) params.hide_out_of_stock = 'true'
    const res = await api.get<{ data: any }>('/products/public/sales', params)
    const payload = res.data
    results.value = (payload?.data || []) as SalesProduct[]
    total.value = payload?.total || 0
    lastApiQuery = apiQuery.value
    expandedIds.value = results.value.slice(0, 1).map(p => p.id)
  }
  catch {
    results.value = []
    total.value = 0
  }
  finally {
    loading.value = false
  }
}

function isExpanded(id: string) {
  // When a variant filter is active, expand every matching product so the
  // filtered SKUs are immediately visible.
  if (variantFilters.value.length) return true
  return expandedIds.value.includes(id)
}

function toggleExpand(id: string) {
  const idx = expandedIds.value.indexOf(id)
  if (idx >= 0) expandedIds.value.splice(idx, 1)
  else expandedIds.value.push(id)
}

function isThumbUrl(thumb: string): boolean {
  return !!thumb && thumb.startsWith('http')
}

function allAdded(product: SalesProduct): boolean {
  const inStock = product.skus.filter(s => s.stock > 0)
  return inStock.length > 0 && inStock.every(s => props.addedSkuIds.includes(s.sku_id))
}

function addSku(product: SalesProduct, sku: SalesSku) {
  if (props.addedSkuIds.includes(sku.sku_id)) return
  if (sku.stock <= 0) return
  const basePrice = Number(sku.price_original) || Number(sku.price) || 0
  emit('add-sku', product, sku, basePrice)
}

function addAll(product: SalesProduct) { 
  // skip out-of-stock SKUs
  const inStockSkus = product.skus.filter(s => s.stock > 0)
  if (!inStockSkus.length) return
  emit('add-all-skus', product)
}

function priceRange(product: SalesProduct): string {
  const min = Number(product.price_min)
  const max = Number(product.price_max)
  if (!min && !max) return ''
  if (min === max) return `Rp${formatCurrency(min)}`
  return `Rp${formatCurrency(min)}–${formatCurrency(max)}`
}

function stockBadgeClass(stock: number): string {
  if (stock <= 0) return 'bg-red-100 text-red-600'
  if (stock <= 5) return 'bg-amber-100 text-amber-700'
  return 'bg-emerald-100 text-emerald-700'
}
</script>

<template>
  <!-- Trigger button -->
  <div class="mb-4">
    <button
      type="button"
      :disabled="!customerId"
      class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-2.5 text-sm font-medium transition-colors"
      :class="customerId
        ? 'border-primary-200 text-primary-600 hover:border-primary-400 hover:bg-primary-50'
        : 'border-gray-200 text-gray-300 cursor-not-allowed'"
      @click="openModal"
    >
      <ShoppingCart class="h-4 w-4" />
      Cari &amp; Tambah Produk
      <span
        v-if="addedSkuIds.length"
        class="rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-bold text-primary-700"
      >{{ addedSkuIds.length }}</span>
    </button>
    <p v-if="!customerId" class="mt-1.5 text-xs text-gray-400 text-center">
      Pilih pelanggan terlebih dahulu untuk melihat produk
    </p>
  </div>

  <!-- Modal -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        @click.self="open = false"
      >
        <div
          class="flex w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl"
          style="max-height: 90vh"
          @click.stop
        >
          <!-- Header -->
          <div class="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3">
            <ShoppingCart class="h-4 w-4 text-primary-500" />
            <h3 class="flex-1 text-sm font-semibold text-gray-900">Pilih Produk &amp; SKU</h3>
            <button
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              @click="open = false"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Search -->
          <div class="shrink-0 border-b border-gray-100 px-4 py-3 space-y-3">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                v-model="query"
                type="text"
                placeholder="Cari produk, variant (pisah koma). Contoh: Livia, merah"
                class="w-full rounded-xl border border-gray-300 py-2 pl-10 pr-9 text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                @input="onSearch"
              />
              <button
                v-if="query"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                @click="clearSearch"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            </div>
            
            <!-- Variant filter hint -->
            <div v-if="variantFilters.length" class="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
              <span>Filter variant:</span>
              <span
                v-for="f in variantFilters"
                :key="f"
                class="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700"
              >{{ f }}</span>
            </div>

            <!-- Filters -->
            <div class="flex flex-wrap items-center gap-3">
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input
                  v-model="filterPreorder"
                  type="checkbox"
                  class="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500/20"
                  @change="fetchProducts"
                />
                <span class="text-xs text-gray-600">Hanya Preorder</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input
                  v-model="filterHideOutOfStock"
                  type="checkbox"
                  class="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500/20"
                  @change="fetchProducts"
                />
                <span class="text-xs text-gray-600">Sembunyikan Stok Kosong</span>
              </label>
            </div>
          </div>

          <!-- Content -->
          <div class="min-h-0 flex-1 overflow-y-auto bg-gray-50">
            <!-- Loading -->
            <div v-if="loading" class="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
              <Loader2 class="h-5 w-5 animate-spin" /> Memuat produk...
            </div>

            <!-- Empty -->
            <div v-else-if="!filteredResults.length" class="py-16 text-center">
              <Package class="mx-auto mb-3 h-12 w-12 text-gray-200" />
              <p class="text-sm font-medium text-gray-500">Produk tidak ditemukan</p>
              <p class="mt-1 text-xs text-gray-400">Coba kata kunci lain</p>
            </div>

            <!-- Product list -->
            <div v-else class="space-y-3 p-4">
              <div
                v-for="product in filteredResults"
                :key="product.id"
                class="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-xs"
              >

                <!-- Product header row -->
                <button
                  class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                  :class="allAdded(product) ? 'opacity-60' : ''"
                  @click="toggleExpand(product.id)"
                >
                  <img
                    v-if="isThumbUrl(product.thumbnail)"
                    :src="product.thumbnail"
                    :alt="product.name"
                    class="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-gray-200"
                  />
                  <div
                    v-else
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 ring-1 ring-gray-200"
                  >
                    <Package class="h-5 w-5 text-gray-300" />
                  </div>

                  <div class="min-w-0 flex-1">
                    <p class="truncate text-base font-bold text-gray-900">{{ product.name }}</p>
                    <div class="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
                      <span
                        v-if="product.category"
                        class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500"
                      >{{ product.category.name }}</span>
                      <span class="text-gray-400">{{ product.skus.length }} Sku</span>
                    </div>
                  </div>

                  <div class="flex shrink-0 items-center gap-2">
                    <span
                      class="rounded-full px-2.5 py-1 text-[11px] font-bold"
                      :class="stockBadgeClass(product.stock)"
                    >Total {{ product.stock }}</span>
                    <ChevronDown
                      class="h-4 w-4 text-gray-400 transition-transform duration-200"
                      :class="isExpanded(product.id) ? 'rotate-180' : ''"
                    />
                  </div>
                </button>

                <!-- SKU table (expanded) -->
                <div v-if="isExpanded(product.id)" class="border-t border-gray-100 pb-2">
                  <!-- <div class="flex items-center justify-end px-4 pt-2">
                    <button
                      v-if="!allAdded(product)"
                      class="rounded-lg bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-600 transition-colors hover:bg-primary-100"
                      @click="addAll(product)"
                    >
                      + Tambah semua varian
                    </button>
                    <span
                      v-else
                      class="flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-600"
                    >
                      <Check class="h-3 w-3" /> Semua varian ditambahkan
                    </span>
                  </div> -->
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead>
                        <tr class="text-[11px] text-gray-400">
                          <th class="px-4 py-2 text-left font-medium">Sku</th>
                          <th class="px-4 py-2 text-left font-medium">Varian</th>
                          <th class="px-4 py-2 text-right font-medium">Harga</th>
                          <th class="px-4 py-2 text-center font-medium">Stok</th>
                          <th class="px-4 py-2 text-right font-medium">Aksi</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-100">
                        <tr
                          v-for="sku in product.skus"
                          :key="sku.sku_id"
                          class="transition-colors hover:bg-gray-50"
                          :class="addedSkuIds.includes(sku.sku_id) ? 'bg-primary-50/40' : ''"
                        >
                          <!-- Varian -->
                          <td class="px-4 py-2.5 align-top">
                            <span class="font-mono text-gray-600 text-xs">{{ sku.sku }}</span>
                          </td>
                          <td class="px-4 py-2.5 align-top">
                            <div class="flex flex-wrap items-center gap-1">
                              <span v-if="sku.variants?.length" class="text-xs font-semibold text-gray-800">
                                {{ sku.variants.map(v => v.value).join(' · ') }}
                              </span>
                              <span v-else class="text-gray-400">Tanpa variant</span>
                              <span v-if="sku.is_preorder" class="rounded bg-blue-100 ml-1 px-1 py-0 text-[9px] font-bold text-blue-700">PREORDER</span>
                            </div>
                            <!-- <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
                              <span v-if="sku.promotion" class="truncate rounded bg-orange-100 px-1.5 py-0.5 font-semibold text-orange-700">{{ sku.promotion.name }}</span>
                              <span v-if="sku.promotion && (sku.promotion.min_qty > 0 || sku.promotion.max_qty > 0)" class="text-orange-500">
                                <span v-if="sku.promotion.min_qty > 0">Min. {{ sku.promotion.min_qty }}</span><span v-if="sku.promotion.min_qty > 0 && sku.promotion.max_qty > 0"> · </span><span v-if="sku.promotion.max_qty > 0">Maks. {{ sku.promotion.max_qty }}</span>
                              </span>
                            </div> -->
                          </td>
                          <!-- Harga -->
                          <td class="whitespace-nowrap px-4 py-2.5 text-right align-top">
                            <p v-if="Number(sku.discount) > 0" class="text-[10px] leading-tight text-gray-400 line-through">
                              Rp{{ formatCurrency(Number(sku.price_original)) }}
                            </p>
                            <p class="font-semibold text-xs leading-tight" :class="Number(sku.discount) > 0 ? 'text-primary-600' : 'text-gray-900'">
                              Rp {{ formatCurrency(Number(sku.price)) }}
                            </p>
                          </td>
                          <!-- Stok -->
                          <td class="px-4 py-2.5 text-center align-top">
                            <span class="font-bold text-xs" :class="sku.stock > 0 ? 'text-gray-800' : 'text-red-500'">{{ sku.stock }}</span>
                          </td>
                          <!-- Aksi -->
                          <td class="px-4 py-1 text-right align-top">
                            <button
                              :disabled="sku.stock <= 0 || addedSkuIds.includes(sku.sku_id)"
                              class="inline-flex pointer-cursor h-8 w-8 items-center justify-center rounded-lg transition-colors"
                              :class="addedSkuIds.includes(sku.sku_id)
                                ? 'bg-green-100 text-green-600'
                                : sku.stock <= 0
                                  ? 'cursor-not-allowed bg-gray-100 text-gray-300'
                                  : 'bg-primary-600 text-white hover:bg-primary-700'"
                              :title="addedSkuIds.includes(sku.sku_id) ? 'Sudah ditambahkan' : sku.stock <= 0 ? 'Stok habis' : 'Tambah'"
                              @click="addSku(product, sku)"
                            >
                              <Check v-if="addedSkuIds.includes(sku.sku_id)" class="h-4 w-4" />
                              <ShoppingCart v-else class="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex shrink-0 items-center justify-between border-t border-gray-100 px-4 py-2.5">
            <p class="text-xs text-gray-400">
              <template v-if="variantFilters.length">
                {{ filteredResults.length }} produk cocok dengan filter variant
              </template>
              <template v-else-if="total > results.length">
                Menampilkan {{ results.length }} dari {{ total }} produk · Gunakan pencarian untuk memfilter
              </template>
              <template v-else-if="results.length">
                {{ results.length }} produk
              </template>
            </p>
            <span v-if="addedSkuIds.length" class="text-xs font-semibold text-primary-600">
              {{ addedSkuIds.length }} SKU dipilih
            </span>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>
