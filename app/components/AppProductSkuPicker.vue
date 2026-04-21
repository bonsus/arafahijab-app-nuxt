<script setup lang="ts">
import { Search, X, Loader2 } from 'lucide-vue-next'

interface SkuPrice {
  sku_id: string
  price: string
  customer_category_id: string
}

export interface ProductSku {
  product_id: string
  sku_id: string
  sku: string
  variants: { name: string; value: string }[]
  capital_price: string
  image: string
  prices: SkuPrice[]
}

export interface ProductResult {
  id: string
  name: string
  thumbnail: string
  price_min: string
  price_max: string
  status: string
  category: { id: string; name: string } | null
  skus: ProductSku[]
}

const props = defineProps<{
  addedSkuIds: string[]
}>()

const emit = defineEmits<{
  'add-sku': [product: ProductResult, sku: ProductSku]
  'add-all-skus': [product: ProductResult]
}>()

const api = useApi()

const containerRef = ref<HTMLDivElement | null>(null)
const open = ref(false)
const query = ref('')
const loading = ref(false)
const results = ref<ProductResult[]>([])

let timer: ReturnType<typeof setTimeout>

function onSearch(val: string) {
  query.value = val
  clearTimeout(timer)
  if (val.length < 2) {
    results.value = []
    open.value = false
    return
  }
  timer = setTimeout(() => fetchProducts(val), 300)
}

async function fetchProducts(search: string) {
  loading.value = true
  try {
    const res = await api.get<{ data: any }>('/products/public/index', { search })
    results.value = (res.data?.data || res.data || []) as ProductResult[]
    open.value = true
  }
  catch {
    results.value = []
  }
  finally {
    loading.value = false
  }
}

function closeDropdown() {
  open.value = false
  query.value = ''
  results.value = []
}

function onClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div ref="containerRef" class="relative">
    <!-- Search input -->
    <div class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        v-model="query"
        type="text"
        placeholder="Cari produk / SKU..."
        class="input-base pl-10 pr-10"
        @input="onSearch(query)"
        @focus="query.length >= 2 && (open = true)"
      />
      <button
        v-if="query"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        @click="closeDropdown"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- Dropdown -->
    <div v-if="open && (results.length || loading)" class="absolute z-40 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
      <div class="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <span class="text-xs text-gray-400">Pilih SKU untuk ditambahkan</span>
        <button class="text-xs text-gray-400 hover:text-gray-600" @click="closeDropdown">Tutup</button>
      </div>

      <div v-if="loading" class="flex items-center justify-center gap-2 px-3 py-6 text-sm text-gray-400">
        <Loader2 class="h-4 w-4 animate-spin" /> Memuat...
      </div>

      <div v-else class="max-h-80 overflow-y-auto">
        <div v-for="product in results" :key="product.id" class="border-b border-gray-100 last:border-b-0">
          <!-- Product header -->
          <div class="flex items-center gap-3 bg-gray-50/50 px-3 py-2">
            <img
              v-if="product.thumbnail"
              :src="product.thumbnail"
              :alt="product.name"
              class="h-8 w-8 shrink-0 rounded bg-gray-100 object-cover"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-medium text-gray-900">{{ product.name }}</p>
              <p class="text-[10px] text-gray-400">
                {{ product.category?.name || '' }}
                &middot; {{ product.skus?.length || 0 }} SKU
              </p>
            </div>
            <button
              v-if="product.skus?.length"
              class="shrink-0 rounded px-2 py-1 text-[10px] font-medium text-primary-600 hover:bg-primary-50"
              @click="emit('add-all-skus', product)"
            >
              + Semua
            </button>
          </div>

          <!-- SKU list -->
          <div v-if="product.skus?.length">
            <div
              v-for="sku in product.skus"
              :key="sku.sku_id"
              class="flex cursor-pointer items-center gap-3 px-3 py-2 pl-6 text-sm transition-colors hover:bg-primary-50"
              :class="addedSkuIds.includes(sku.sku_id) ? 'opacity-40' : ''"
              @click="!addedSkuIds.includes(sku.sku_id) && emit('add-sku', product, sku)"
            >
              <img
                v-if="sku.image"
                :src="sku.image"
                class="h-7 w-7 shrink-0 rounded bg-gray-100 object-cover"
              />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-1">
                  <span class="text-xs font-medium text-gray-700">{{ sku.sku }}</span>
                  <span
                    v-for="v in sku.variants"
                    :key="v.name"
                    class="rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-500"
                  >
                    {{ v.value }}
                  </span>
                </div>
              </div>
              <span v-if="addedSkuIds.includes(sku.sku_id)" class="text-[10px] text-gray-400">Ditambahkan</span>
            </div>
          </div>
          <div v-else class="px-3 py-2 text-center text-xs text-gray-400">Tidak ada SKU</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.input-base {
  @apply w-full rounded-lg border border-gray-300 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
