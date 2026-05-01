<script setup lang="ts">
import { Search, Loader2, MapPin } from 'lucide-vue-next'

export interface Variant { name: string; value: string }

export interface TransferStockLocation {
  id: string
  sku_id: string
  warehouse_id: string
  warehouse_bin_id: string
  stock: number
  bin: { id: string; code: string } | null
  rack: { id: string; code: string } | null
  zone: { id: string; code: string } | null
  warehouse: { id: string; name: string } | null
}

export interface TransferSku {
  id: string
  product_id: string
  sku: string
  variants: Variant[]
  stocks: TransferStockLocation[]
}

export interface TransferProduct {
  id: string
  name: string
  category: { id: string; name: string } | null
  skus: TransferSku[]
}

const props = defineProps<{
  /** Already-used (sku_id + warehouse_bin_id) pairs from other rows, for duplicate guard */
  usedLocations?: { sku_id: string; warehouse_bin_id: string }[]
  /** External validation error (e.g. from API form errors) */
  error?: string
  placeholder?: string
}>()

const emit = defineEmits<{
  select: [product: TransferProduct, sku: TransferSku, stock: TransferStockLocation]
}>()

const api = useApi()

const search = ref('')
const searching = ref(false)
const results = ref<TransferProduct[]>([])
const showDropdown = ref(false)
const internalError = ref('')

let timer: ReturnType<typeof setTimeout>

function onInput() {
  internalError.value = ''
  showDropdown.value = false
  clearTimeout(timer)
  const q = search.value.trim()
  if (!q) { results.value = []; return }
  timer = setTimeout(() => fetchProducts(q), 300)
}

async function fetchProducts(q: string) {
  searching.value = true
  try {
    const res = await api.get<{ data: { data: TransferProduct[] } }>('/inventories/transfers/products', { search: q })
    results.value = res.data?.data || []
    showDropdown.value = true
  }
  catch { results.value = [] }
  finally { searching.value = false }
}

function delayHide() {
  window.setTimeout(() => { showDropdown.value = false }, 150)
}

function pickLocation(product: TransferProduct, sku: TransferSku, stock: TransferStockLocation) {
  const duplicate = props.usedLocations?.some(
    u => u.sku_id === sku.id && u.warehouse_bin_id === stock.warehouse_bin_id,
  )
  if (duplicate) {
    internalError.value = `SKU "${sku.sku}" dari lokasi ini sudah ada di list`
    showDropdown.value = false
    return
  }
  emit('select', product, sku, stock)
  search.value = ''
  results.value = []
  showDropdown.value = false
  internalError.value = ''
}
</script>

<template>
  <div class="relative">
    <!-- Search input -->
    <div class="relative">
      <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
      <input
        v-model="search"
        type="text"
        :placeholder="placeholder || 'Cari nama produk atau kode SKU...'"
        class="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        :class="{ 'border-red-300': internalError || error }"
        @input="onInput"
        @keydown.escape="showDropdown = false"
        @focus="showDropdown = !!results.length"
        @blur="delayHide"
      />
      <Loader2
        v-if="searching"
        class="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-gray-400"
      />
    </div>

    <!-- Dropdown -->
    <div
      v-if="showDropdown && results.length"
      class="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
    >
      <template v-for="product in results" :key="product.id">
        <!-- Product header (sticky) -->
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
              <span
                v-for="v in sku.variants"
                :key="v.name"
                class="rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-500"
              >{{ v.value }}</span>
            </div>
            <span class="ml-2 text-[10px] font-bold text-gray-400">
              {{ sku.stocks.reduce((s, st) => s + st.stock, 0) }}
            </span>
          </div>

          <!-- Per-location rows -->
          <template v-if="sku.stocks.length">
            <button
              v-for="st in sku.stocks"
              :key="st.warehouse_bin_id"
              type="button"
              class="flex w-full items-center justify-between border-b border-gray-50 px-4 py-2 text-xs transition-colors last:border-b-0 hover:bg-primary-50"
              @mousedown.prevent="pickLocation(product, sku, st)"
            >
              <div class="flex min-w-0 items-center gap-1.5">
                <MapPin class="h-3 w-3 shrink-0 text-gray-400" />
                <span class="shrink-0 text-gray-500">{{ st.warehouse?.name || '—' }}</span>
                <span class="shrink-0 text-gray-300">›</span>
                <span class="truncate text-gray-700">
                  {{ [st.zone?.code, st.rack?.code, st.bin?.code].filter(Boolean).join(' / ') || 'Default' }}
                </span>
              </div>
              <span class="ml-2 shrink-0 font-bold text-green-700">{{ st.stock }}</span>
            </button>
          </template>
          <div v-else class="flex items-center justify-between border-b border-gray-50 px-4 py-2 text-xs text-gray-400">
            <span>Stok kosong</span>
            <span>0</span>
          </div>
        </template>
      </template>
    </div>

    <!-- Error messages -->
    <p v-if="internalError" class="mt-1 text-xs text-red-500">{{ internalError }}</p>
    <p v-else-if="error" class="mt-1 text-xs text-red-500">{{ error }}</p>
  </div>
</template>
