<script setup lang="ts">
import { Search, X, Loader2, Package, Plus } from 'lucide-vue-next'

export interface CustomerCategoryPrice {
  customer_category_id: string
  customer_category_name: string
  price_min: string
  price_max: string
}

export interface PromotionProduct {
  id: string
  name: string
  thumbnail: string
  stock: number
  prices: CustomerCategoryPrice[]
}

const props = defineProps<{
  addedProductIds?: string[]
}>()

const emit = defineEmits<{
  'select': [product: PromotionProduct]
}>()

const api = useApi()

const showModal = ref(false)
const query = ref('')
const loading = ref(false)
const results = ref<PromotionProduct[]>([])

let timer: ReturnType<typeof setTimeout>

function openModal() {
  showModal.value = true
  query.value = ''
  results.value = []
}

function closeModal() {
  showModal.value = false
  query.value = ''
  results.value = []
}

function onSearch(val: string) {
  query.value = val
  clearTimeout(timer)
  // if (val.length < 2) {
  //   results.value = []
  //   return
  // }
  timer = setTimeout(() => fetchProducts(val), 300)
}

async function fetchProducts(search: string) {
  loading.value = true
  try {
    const res = await api.get<{ data: PromotionProduct[] }>('/promotions/products/index', { search })
    results.value = res.data || []
  }
  catch {
    results.value = []
  }
  finally {
    loading.value = false
  }
}

function selectProduct(product: PromotionProduct) {
  if (props.addedProductIds?.includes(product.id)) return
  emit('select', product)
}

function formatPrice(price: string): string {
  return new Intl.NumberFormat('id-ID').format(Number(price))
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
      Pilih Produk
    </button>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          @click.self="closeModal"
        >
          <div class="w-full max-w-3xl rounded-xl bg-white shadow-2xl">
            <!-- Modal Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 class="text-lg font-semibold text-gray-900">Pilih Produk</h3>
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
                  placeholder="Cari produk untuk promosi..."
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

            <!-- Product List -->
            <div class="max-h-[60vh] overflow-y-auto px-6 py-4">
              <div v-if="loading" class="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
                <Loader2 class="h-5 w-5 animate-spin" /> Memuat produk...
              </div>

              <div v-else-if="!query" class="py-12 text-center text-sm text-gray-400">
                Ketik minimal 2 karakter untuk mencari produk
              </div>

              <div v-else-if="!results.length" class="py-12 text-center text-sm text-gray-400">
                Tidak ada produk ditemukan
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="product in results"
                  :key="product.id"
                  class="flex gap-4 rounded-lg border border-gray-200 p-4 transition-all"
                  :class="addedProductIds?.includes(product.id) ? 'bg-gray-50 opacity-60' : 'hover:border-primary-300 hover:shadow-sm'"
                >
                  <div class="shrink-0">
                    <img
                      v-if="product.thumbnail"
                      :src="product.thumbnail"
                      :alt="product.name"
                      class="h-16 w-16 rounded-lg bg-gray-100 object-cover"
                    />
                    <div v-else class="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100">
                      <Package class="h-7 w-7 text-gray-400" />
                    </div>
                  </div>
                  
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-gray-900">{{ product.name }}</p>
                    <p class="mt-1 text-xs text-gray-500">Stock: {{ product.stock }}</p>
                    
                    <!-- Price Range -->
                    <div v-if="product.prices.length" class="mt-2">
                      <p class="text-xs text-gray-500"> 
                        <span class="font-medium text-gray-700">
                          Rp {{ formatPrice(Math.min(...product.prices.map(p => Number(p.price_min))).toString()) }} - 
                          Rp {{ formatPrice(Math.max(...product.prices.map(p => Number(p.price_max))).toString()) }}
                        </span>
                      </p>
                    </div>
                  </div>

                  <!-- Add Button -->
                  <div class="shrink-0 self-center">
                    <button
                      v-if="!addedProductIds?.includes(product.id)"
                      type="button"
                      class="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                      @click="selectProduct(product)"
                    >
                      <Plus class="h-4 w-4" />
                      Tambah
                    </button>
                    <span
                      v-else
                      class="inline-flex items-center rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-500"
                    >
                      Ditambahkan
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
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
