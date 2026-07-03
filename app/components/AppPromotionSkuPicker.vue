<script setup lang="ts">
import { Search, X, Loader2, Package, Plus, Check } from 'lucide-vue-next'

export interface SkuPrice {
  customer_category_id: string
  customer_category_name: string
  price: string
}

export interface PromotionSku {
  id: string
  product_id: string
  sku: string
  thumbnail: string
  variants: Record<string, string>
  stock: number
  prices: SkuPrice[]
  qty: number 
}

export interface PromotionProductWithSkus {
  id: string
  name: string
  thumbnail: string
  stock: number
  skus: PromotionSku[]
}

const props = defineProps<{
  addedSkuIds?: string[]
}>()

const emit = defineEmits<{
  'select': [productId: string, productName: string, sku: PromotionSku]
}>()

const api = useApi()

const showModal = ref(false)
const query = ref('')
const loading = ref(false)
const results = ref<PromotionProductWithSkus[]>([])

let timer: ReturnType<typeof setTimeout>

function openModal() {
  showModal.value = true
  query.value = ''
  results.value = []
  // Load initial data immediately
  fetchSkus('')
}

function closeModal() {
  showModal.value = false
  query.value = ''
  results.value = []
}

function onSearch(val: string) {
  query.value = val
  clearTimeout(timer)
  // Allow search with any length, filter results immediately
  timer = setTimeout(() => fetchSkus(val), 300)
}

async function fetchSkus(search: string) {
  loading.value = true
  try {
    const res = await api.get<{ data: PromotionProductWithSkus[] }>('/promotions/products/skus', { search })
    results.value = res.data || []
    // add qty 
    if (results.value.length) {
      results.value = results.value.map(product => ({
        ...product,
        skus: product.skus.map(sku => ({
          ...sku,
          qty: 1, 
        }))
      }))
    }
  }
  catch {
    results.value = []
  }
  finally {
    loading.value = false
  }
}

function selectSku(product: PromotionProductWithSkus, sku: PromotionSku) {
  if (props.addedSkuIds?.includes(sku.id)) return
  emit('select', product.id, product.name, sku)
}

function selectAllSkus(product: PromotionProductWithSkus) {
  if (!product.skus?.length) return
  // Add all SKUs from this product
  product.skus.forEach(sku => {
    if (!props.addedSkuIds?.includes(sku.id)) {
      emit('select', product.id, product.name, sku)
    }
  })
}

function isProductFullyAdded(product: PromotionProductWithSkus): boolean {
  if (!product.skus?.length) return false
  return product.skus.every(sku => props.addedSkuIds?.includes(sku.id))
}

function formatPrice(price: string): string {
  return new Intl.NumberFormat('id-ID').format(Number(price))
}


function formatVariants(variants: any): string {
  if (!variants) return '-'
  
  // Handle array format: [{ name: "Warna", value: "Cappuccino" }]
  if (Array.isArray(variants)) {
    if (variants.length === 0) return '-'
    return variants.map(v => v.value || v.name || String(v)).join(' / ')
  }
  
  // Handle object format: { "Warna": "Cappuccino" }
  if (typeof variants === 'object') {
    const entries = Object.entries(variants)
    if (entries.length === 0) return '-'
    return entries.map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return (value as any).value || (value as any).name || String(value)
      }
      return String(value)
    }).join(' / ')
  }
  
  return String(variants)
}
</script>

<template>
  <div>
    <!-- Trigger Button -->
    <button
      type="button"
      class="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-600"
      @click="openModal"
    >
      <Plus class="h-4 w-4" />
      Pilih SKU
    </button>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          @click.self="closeModal"
        >
          <div class="w-full max-w-4xl rounded-xl bg-white shadow-2xl">
            <!-- Modal Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 class="text-lg font-semibold text-gray-900">Pilih SKU</h3>
              <button
                type="button"
                class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                @click="closeModal"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Search Input -->
            <div class="border-b border-gray-200 px-6 py-4">
              <div class="relative">
                <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  v-model="query"
                  type="text"
                  placeholder="Cari produk / SKU..."
                  class="input-base pl-11 pr-10" style="padding-left: 2.20rem;"
                  @input="onSearch(query)"
                />
                <button
                  v-if="query"
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  @click="query = ''; results = []"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>

            <!-- SKU List -->
            <div class="max-h-[60vh] overflow-y-auto px-6 py-4">
              <div v-if="loading" class="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
                <Loader2 class="h-5 w-5 animate-spin" /> Memuat SKU...
              </div>

              <div v-else-if="!results.length" class="py-12 text-center text-sm text-gray-400">
                {{ query ? 'Tidak ada SKU ditemukan' : 'Tidak ada SKU tersedia' }}
              </div>

              <div v-else class="divide-y divide-gray-100 rounded-lg border border-gray-200">
                <template v-for="product in results" :key="product.id">
                  <!-- Product header row -->
                  <div class="flex items-center gap-2 bg-gray-50 px-4 py-2">
                    <div class="h-6 w-6 shrink-0 overflow-hidden rounded bg-white ring-1 ring-gray-200">
                      <img v-if="product.thumbnail" :src="product.thumbnail" :alt="product.name" class="h-full w-full object-cover" />
                      <Package v-else class="h-full w-full p-1 text-gray-400" />
                    </div>
                    <p class="text-xs font-semibold text-gray-700">{{ product.name }}</p>
                    <span class="ml-auto text-[10px] text-gray-400">{{ product.skus?.length || 0 }} SKU</span>
                    <button
                      v-if="!isProductFullyAdded(product)"
                      type="button"
                      class="flex shrink-0 items-center gap-1 rounded-lg bg-primary-100 px-2.5 py-1 text-[11px] font-semibold text-primary-700 transition-colors hover:bg-primary-200"
                      @click="selectAllSkus(product)"
                    >
                      <Plus class="h-3 w-3" />
                      Pilih Semua
                    </button>
                    <span
                      v-else
                      class="inline-flex shrink-0 items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-600"
                    >
                      <Check class="h-3 w-3" />
                      Semua Ditambahkan
                    </span>
                  </div>

                  <!-- Individual SKU rows -->
                  <div
                    v-for="sku in product.skus"
                    :key="sku.id"
                    class="flex items-center gap-3 px-4 py-3 transition-colors"
                    :class="addedSkuIds?.includes(sku.id) ? 'bg-gray-50 opacity-60' : 'hover:bg-primary-50'"
                  >
                    <!-- SKU thumbnail -->
                    <div class="h-9 w-9 shrink-0 overflow-hidden rounded bg-gray-100 ring-1 ring-gray-200">
                      <img v-if="sku.thumbnail" :src="sku.thumbnail" class="h-full w-full object-cover" />
                      <Package v-else class="h-full w-full p-2 text-gray-400" />
                    </div>

                    <!-- SKU info -->
                    <div class="min-w-0 flex-1">
                      <p class="font-mono text-sm text-gray-900">{{ sku.sku }}</p>
                      <p class="text-xs text-gray-500">{{ formatVariants(sku.variants) }}</p>
                    </div>

                    <!-- Stock -->
                    <span class="hidden shrink-0 text-xs text-gray-400 sm:block">Stok: {{ sku.stock }}</span>

                    <!-- Add button -->
                    <button
                      v-if="!addedSkuIds?.includes(sku.id)"
                      type="button"
                      class="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
                      @click="selectSku(product, sku)"
                    >
                      <Plus class="h-3.5 w-3.5" />
                      Tambah
                    </button>
                    <span
                      v-else
                      class="inline-flex shrink-0 items-center rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500"
                    >
                      Ditambahkan
                    </span>
                  </div>
                </template>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="border-t border-gray-200 px-6 py-4 text-right">
              <button
                type="button"
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                @click="closeModal"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.input-base {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid rgb(209 213 219);
  background-color: white;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: rgb(17 24 39);
  transition-property: color, background-color, border-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.input-base:focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
  border-color: rgb(var(--color-primary-500) / 1);
  --tw-ring-color: rgb(var(--color-primary-500) / 0.2);
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
}

.input-base::placeholder {
  color: rgb(156 163 175);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .rounded-xl,
.modal-leave-active .rounded-xl {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from .rounded-xl,
.modal-leave-to .rounded-xl {
  transform: scale(0.95);
  opacity: 0;
}
</style>
