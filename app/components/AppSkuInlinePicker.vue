<script setup lang="ts">
import { Search, X, Loader2, Package, Check } from 'lucide-vue-next'
import type { PromotionSku, PromotionProductWithSkus } from './AppPromotionSkuPicker.vue'

const props = defineProps<{
  /** Currently selected SKU id - used to highlight selected state */
  selectedSkuId?: string | null
}>()

const emit = defineEmits<{
  'select': [productId: string, productName: string, sku: PromotionSku]
}>()

const api = useApi()

const query = ref('')
const loading = ref(false)
const results = ref<PromotionProductWithSkus[]>([])

let timer: ReturnType<typeof setTimeout>

function onSearch() {
  clearTimeout(timer)
  timer = setTimeout(() => fetchSkus(query.value), 300)
}

async function fetchSkus(search: string) {
  loading.value = true
  try {
    const res = await api.get<{ data: PromotionProductWithSkus[] }>('/promotions/products/skus', { search })
    results.value = (res.data || []).map(product => ({
      ...product,
      skus: product.skus.map(sku => ({ ...sku, qty: 1 })),
    }))
  }
  catch {
    results.value = []
  }
  finally {
    loading.value = false
  }
}

function selectSku(product: PromotionProductWithSkus, sku: PromotionSku) {
  emit('select', product.id, product.name, sku)
}

function formatVariants(variants: any): string {
  if (!variants) return '-'
  if (Array.isArray(variants)) {
    if (variants.length === 0) return '-'
    return variants.map((v: any) => v.value || v.name || String(v)).join(' / ')
  }
  if (typeof variants === 'object') {
    const entries = Object.entries(variants)
    if (entries.length === 0) return '-'
    return entries.map(([_, value]) => {
      if (typeof value === 'object' && value !== null) return (value as any).value || (value as any).name || String(value)
      return String(value)
    }).join(' / ')
  }
  return String(variants)
}

onMounted(() => { fetchSkus('') })
</script>

<template>
  <div class="space-y-3">
    <!-- Search -->
    <div class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        v-model="query"
        type="text"
        placeholder="Cari produk / SKU..."
        class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
        @input="onSearch"
      />
      <button
        v-if="query"
        type="button"
        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        @click="query = ''; fetchSkus('')"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- List -->
    <div class="max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white">
      <div v-if="loading" class="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
        <Loader2 class="h-4 w-4 animate-spin" /> Memuat...
      </div>

      <div v-else-if="!results.length" class="py-8 text-center text-sm text-gray-400">
        {{ query ? 'Tidak ada SKU ditemukan' : 'Tidak ada SKU tersedia' }}
      </div>

      <div v-else class="divide-y divide-gray-100">
        <template v-for="product in results" :key="product.id">
          <!-- Product Row -->
          <div class="bg-gray-50 px-3 py-2">
            <div class="flex items-center gap-2">
              <div class="h-7 w-7 shrink-0 overflow-hidden rounded bg-white ring-1 ring-gray-200">
                <img v-if="product.thumbnail" :src="product.thumbnail" :alt="product.name" class="h-full w-full object-cover" />
                <Package v-else class="h-full w-full p-1 text-gray-400" />
              </div>
              <p class="text-xs font-semibold text-gray-700">{{ product.name }}</p>
              <span class="ml-auto text-[10px] text-gray-400">{{ product.skus?.length || 0 }} SKU</span>
            </div>
          </div>

          <!-- SKU Rows -->
          <button
            v-for="sku in product.skus"
            :key="sku.id"
            type="button"
            class="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors"
            :class="selectedSkuId === sku.id
              ? 'bg-primary-50'
              : 'hover:bg-gray-50'"
            @click="selectSku(product, sku)"
          >
            <!-- Thumbnail -->
            <div class="h-8 w-8 shrink-0 overflow-hidden rounded bg-gray-100 ring-1 ring-gray-200">
              <img v-if="sku.thumbnail" :src="sku.thumbnail" class="h-full w-full object-cover" />
              <Package v-else class="h-full w-full p-1.5 text-gray-400" />
            </div>

            <!-- Info -->
            <div class="min-w-0 flex-1">
              <p class="truncate font-mono text-xs text-gray-800">{{ sku.sku }}</p>
              <p class="text-[11px] text-gray-500">{{ formatVariants(sku.variants) }}</p>
            </div>

            <!-- Selected indicator -->
            <div
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
              :class="selectedSkuId === sku.id
                ? 'border-primary-500 bg-primary-500'
                : 'border-gray-300'"
            >
              <Check v-if="selectedSkuId === sku.id" class="h-3 w-3 text-white" />
            </div>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
