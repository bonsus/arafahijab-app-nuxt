<script setup lang="ts">
import {
  X, Search, Link2, Loader2, ChevronDown,
  Plus, Trash2, CheckCircle2, Image as ImageIcon,
} from 'lucide-vue-next'

interface MpSkuInfo {
  productId: string
  productName: string
  sku: {
    id: string
    sku: string
    variants: Record<string, string> | { name: string; value: string }[]
    binding?: BindingInfo | null
  }
}

interface BindingInfo {
  id: string
  product_id: string
  product_name: string
  sku_id: string
  sku: string
  variants: { name: string; value: string }[]
  store_id: string
  mp_product_id: string
  mp_product_name: string
  mp_sku_id: string
  mp_sku: string
  mp_variants: { name: string; value: string }[]
  mp_warehouse_id: string
  status: string
  created_at: string
  updated_at: string
  store: { id: string; name: string; source: string }
}

interface InternalProduct {
  id: string
  name: string
  slug: string
  thumbnail: string
  status: string
  category?: { id: string; name: string }
  skus: InternalSku[]
}

interface InternalSku {
  id: string
  sku: string
  image: string
  variants: { name: string; value: string }[]
  status: string
  is_bound?: boolean
  bound_to_mp?: string
}

interface InternalProductDetail {
  id: string
  name: string
  slug: string
  thumbnail: string
  status: string 
  category?: { id: string; name: string }
  skus: InternalSku[]
}

const props = defineProps<{
  modelValue: boolean
  storeId: string
  storeName: string
  storeSource: string
  mpSku: MpSkuInfo | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'binding-added': [binding: BindingInfo]
  'binding-deleted': []
}>()

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const products = ref<InternalProduct[]>([])
const productsLoading = ref(false)
const productsLoadingMore = ref(false)
const currentPage = ref(1)
const totalPages = ref(0)
const search = ref('')

const expandedProductId = ref<string | null>(null)
const productDetails = ref<Record<string, InternalProductDetail>>({})
const productDetailLoading = ref<Set<string>>(new Set())

const submittingSkuId = ref<string | null>(null)

const sentinelEl = ref<HTMLElement | null>(null)
let sentinelObserver: IntersectionObserver | null = null

// Local filter - search in loaded products (no API call)
const productsFiltered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return products.value
  return products.value.filter(p =>
    p.name.toLowerCase().includes(q)
    || p.id.toLowerCase().includes(q)
    || p.skus?.some(s => s.sku?.toLowerCase().includes(q))
  )
})

// Check if SKU matches search query
function isSkuMatch(sku: InternalSku): boolean {
  const q = search.value.trim().toLowerCase()
  if (!q) return false
  return sku.sku?.toLowerCase().includes(q)
}

// Count matching SKUs in a product
function getMatchingSkuCount(product: InternalProduct): number {
  const q = search.value.trim().toLowerCase()
  if (!q) return 0
  return product.skus?.filter(s => s.sku?.toLowerCase().includes(q)).length || 0
}

// Auto-fetch more pages when search active but no local match
const shouldAutoFetch = computed(() =>
  search.value.trim() !== ''
  && productsFiltered.value.length === 0
  && currentPage.value < totalPages.value
  && !productsLoading.value
  && !productsLoadingMore.value,
)

const mpSkuCode = computed(() => props.mpSku?.sku.sku || '')

const mpSkuVariants = computed(() => {
  if (!props.mpSku) return []
  const v = props.mpSku.sku.variants
  if (Array.isArray(v)) return v
  return Object.entries(v).map(([name, value]) => ({ name, value: String(value) }))
})

async function fetchProducts(append = false) {
  if (append) productsLoadingMore.value = true
  else productsLoading.value = true
  try {
    const params: Record<string, string> = {
      page: String(append ? currentPage.value + 1 : 1),
      per_page: '100',
      with_skus: '1', // Request SKUs to be included for local filtering
    }
    // No SKU filter sent to API - we filter locally
    const res = await api.get<{ data: { data: InternalProduct[]; page: number; per_page: number; total_page: number; total: number } }>('/products/index', params)
    const page = res.data?.data || []
    if (append) {
      products.value.push(...page)
      currentPage.value = res.data?.page || currentPage.value + 1
    } else {
      products.value = page
      currentPage.value = res.data?.page || 1
    }
    totalPages.value = res.data?.total_page || 0
  }
  catch {
    if (!append) products.value = []
  }
  finally {
    productsLoading.value = false
    productsLoadingMore.value = false
  }
}

async function loadMore() {
  if (currentPage.value >= totalPages.value || productsLoading.value || productsLoadingMore.value) return
  await fetchProducts(true)
  if (shouldAutoFetch.value) await loadMore()
}

function setupSentinel() {
  if (sentinelObserver) sentinelObserver.disconnect()
  if (!sentinelEl.value) return
  sentinelObserver = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) loadMore()
  }, { threshold: 0.1 })
  sentinelObserver.observe(sentinelEl.value)
}

watch(sentinelEl, (el) => { if (el) setupSentinel() })

// Watch search for auto-fetch when filtering
watch(search, async () => {
  // Auto-load more pages when search active but no match found
  if (shouldAutoFetch.value) await loadMore()
})

async function toggleProduct(id: string) {
  if (expandedProductId.value === id) {
    expandedProductId.value = null
    return
  }
  expandedProductId.value = id
  if (!productDetails.value[id]) {
    productDetailLoading.value.add(id)
    try {
      const res = await api.get<{ data: InternalProductDetail }>(`/products/${id}`)
      productDetails.value[id] = res.data
    }
    catch {}
    finally {
      productDetailLoading.value.delete(id)
    }
  }
}

async function addBinding(product: InternalProduct, sku: InternalSku) {
  if (!props.mpSku || submittingSkuId.value) return
  
  submittingSkuId.value = sku.id
  try {
    await api.post('/products/bindings/create', {
      sku_id: sku.id,
      product_id: product.id,
      store_id: props.storeId,
      mp_product_id: props.mpSku.productId,
      mp_product_name: props.mpSku.productName,
      mp_sku_id: props.mpSku.sku.id,
      mp_sku: props.mpSku.sku.sku,
      mp_warehouse_id: props.mpSku.sku.id,
      mp_variants: mpSkuVariants.value,
      status: 'active',
    })
    
    // Construct binding data for UI update
    const bindingData: BindingInfo = {
      id: '',
      product_id: product.id,
      product_name: product.name,
      sku_id: sku.id,
      sku: sku.sku,
      variants: sku.variants,
      store_id: props.storeId,
      mp_product_id: props.mpSku.productId,
      mp_product_name: props.mpSku.productName,
      mp_sku_id: props.mpSku.sku.id,
      mp_sku: props.mpSku.sku.sku,
      mp_variants: mpSkuVariants.value,
      mp_warehouse_id: props.mpSku.sku.id,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      store: {
        id: props.storeId,
        name: props.storeName,
        source: props.storeSource,
      },
    }
    
    toast.success('Binding berhasil ditambahkan')
    emit('binding-added', bindingData)
    close()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menambahkan binding')
  }
  finally {
    submittingSkuId.value = null
  }
}

async function deleteBinding() {
  if (!props.mpSku?.sku.binding) return
  const binding = props.mpSku.sku.binding
  const ok = await confirm({
    title: 'Hapus Binding',
    message: `Hapus binding ke produk internal "${binding.product_name}" - SKU "${binding.sku}"?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/products/bindings/${binding.id}`)
    toast.success('Binding berhasil dihapus')
    emit('binding-deleted')
    close()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus binding')
  }
}

function close() {
  emit('update:modelValue', false)
}

watch(() => props.modelValue, async (val) => {
  if (val) {
    products.value = []
    currentPage.value = 1
    totalPages.value = 0
    expandedProductId.value = null
    productDetails.value = {}
    // Fetch first page
    await fetchProducts()
    // Set search which triggers watch to auto-fetch if needed
    search.value = mpSkuCode.value
  }
  else {
    sentinelObserver?.disconnect()
  }
})

onUnmounted(() => {
  sentinelObserver?.disconnect()
})
</script>

<template>
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
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        @click.self="close"
      >
        <div class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-gray-200">
          <!-- Header -->
          <div class="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
            <div class="flex items-center gap-2">
              <Link2 class="h-5 w-5 text-blue-500" />
              <div>
                <h3 class="text-base font-semibold text-gray-900">Pilih Master Produk</h3>
                <p class="mt-0.5 text-sm text-gray-600">
                  Binding untuk: 
                  <span class="font-mono font-medium text-gray-900">{{ mpSku?.sku.sku }}</span>
                  <span v-if="mpSkuVariants.length" class="ml-1">
                    <span
                      v-for="v in mpSkuVariants"
                      :key="v.name"
                      class="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700"
                    >{{ v.value }}</span>
                  </span>
                </p>
              </div>
            </div>
            <button class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="close">
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Current binding info (if exists) -->
          <div v-if="mpSku?.sku.binding" class="shrink-0 border-b border-blue-100 bg-blue-50 px-6 py-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="text-xs font-medium text-blue-900">SKU marketplace ini sudah memiliki binding:</p>
                <p class="mt-1 text-sm font-semibold text-blue-900">{{ mpSku.sku.binding.product_name }}</p>
                <p class="mt-0.5 font-mono text-xs text-blue-700">SKU: {{ mpSku.sku.binding.sku }}</p>
                <div v-if="mpSku.sku.binding.variants.length" class="mt-1 flex flex-wrap gap-1">
                  <span
                    v-for="v in mpSku.sku.binding.variants"
                    :key="v.name"
                    class="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800"
                  >{{ v.value }}</span>
                </div>
              </div>
            </div>
            <p class="mt-2 text-xs text-blue-700">
              Hapus binding yang ada terlebih dahulu sebelum membuat binding baru.
            </p>
          </div>

          <!-- Search -->
          <div class="shrink-0 border-b border-gray-100 px-6 py-3">
            <div class="space-y-1.5">
              <div class="relative">
                <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  v-model="search"
                  type="text"
                  placeholder="Cari berdasarkan SKU internal..."
                  class="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                />
                <button
                  v-if="search"
                  type="button"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
                  @click="search = ''"
                >
                  <X class="h-3.5 w-3.5" />
                </button>
              </div>
              <div class="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span>Filter otomatis:</span>
                <button
                  type="button"
                  class="rounded bg-primary-50 px-1.5 py-0.5 font-mono font-medium text-primary-700 hover:bg-primary-100"
                  :class="search === mpSkuCode ? 'ring-1 ring-primary-300' : ''"
                  @click="search = mpSkuCode"
                >{{ mpSkuCode }}</button>
              </div>
            </div>
          </div>

          <!-- Product list -->
          <div class="flex-1 overflow-y-auto">
            <!-- Blocked by existing binding -->
            <div v-if="mpSku?.sku.binding" class="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Link2 class="h-10 w-10 text-blue-200" />
              <p class="text-sm font-medium text-blue-900">SKU marketplace sudah memiliki binding</p>
              <p class="max-w-md text-xs text-blue-700">
                Hapus binding yang ada terlebih dahulu di halaman import untuk membuat binding baru.
              </p>
            </div>

            <!-- Loading -->
            <div v-if="productsLoading" class="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
              <Loader2 class="h-4 w-4 animate-spin" />
              Memuat produk...
            </div>

            <!-- Empty -->
            <div v-else-if="!productsFiltered.length" class="py-12 text-center text-sm text-gray-400">
              <template v-if="productsLoadingMore">
                <Loader2 class="mx-auto mb-2 h-5 w-5 animate-spin" />
                Mencari lebih banyak produk...
              </template>
              <template v-else>
                Tidak ada produk ditemukan.
              </template>
            </div>

            <!-- Product list -->
            <div v-else class="space-y-2 p-4">
              <div
                v-for="prod in productsFiltered"
                :key="prod.id"
                class="rounded-lg border transition-colors"
                :class="expandedProductId === prod.id ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-white hover:border-blue-200'"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-3 px-4 py-3 text-left"
                  @click="toggleProduct(prod.id)"
                >
                  <div class="h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-100">
                    <img
                      v-if="prod.thumbnail"
                      :src="prod.thumbnail"
                      alt=""
                      class="h-full w-full object-cover"
                      @error="($event.target as HTMLImageElement).style.display='none'"
                    />
                    <ImageIcon v-else class="mx-auto mt-2.5 h-5 w-5 text-gray-300" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-gray-900">{{ prod.name }}</p>
                    <p class="mt-0.5 text-xs text-gray-500">
                      <span v-if="prod.category">{{ prod.category.name }} &middot; </span>
                      ID: {{ prod.id }}
                    </p>
                  </div>
                  <span v-if="getMatchingSkuCount(prod) > 0" class="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                    {{ getMatchingSkuCount(prod) }} SKU cocok
                  </span>
                  <span class="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-500">
                    {{ prod.status }}
                  </span>
                  <ChevronDown
                    class="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150"
                    :class="expandedProductId === prod.id ? 'rotate-180' : ''"
                  />
                </button>

                <!-- SKU list -->
                <div v-if="expandedProductId === prod.id" class="border-t border-blue-100 bg-white">
                  <div v-if="productDetailLoading.has(prod.id)" class="flex items-center justify-center gap-2 py-4 text-sm text-gray-400">
                    <Loader2 class="h-3.5 w-3.5 animate-spin" />
                    Memuat SKU...
                  </div>
                  <template v-else>
                    <div v-if="!productDetails[prod.id]?.skus?.length" class="px-4 py-3 text-sm text-gray-400">Tidak ada SKU.</div>
                    <div v-else class="divide-y divide-gray-100">
                      <div
                        v-for="sku in productDetails[prod.id]!.skus"
                        :key="sku.id"
                        class="flex items-center gap-3 px-4 py-2.5"
                        :class="isSkuMatch(sku) ? 'bg-green-50/50s' : ''"
                      >
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-1.5">
                            <span class="font-mono text-xs" :class="isSkuMatch(sku) ? 'font-semibold text-yellow-700 bg-yellow-100' : 'text-gray-700'">{{ sku.sku }}</span>
                          </div>
                        </div>
                        <div v-if="sku.variants.length" class="mt-1 flex flex-1 gap-1">
                          <span
                            v-for="v in sku.variants"
                            :key="v.name"
                            class="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700"
                          >{{ v.value }}</span>
                        </div>
                        <span class="shrink-0 text-xs text-gray-500">
                          <span
                            class="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase"
                            :class="sku.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'"
                          >{{ sku.status }}</span>
                        </span>
                        
                        <!-- Add binding button -->
                        <button
                          type="button"
                          :disabled="submittingSkuId === sku.id"
                          class="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          @click="addBinding(prod, sku)"
                        >
                          <Loader2 v-if="submittingSkuId === sku.id" class="h-3 w-3 animate-spin" />
                          <Plus v-else class="h-3 w-3" />
                          Pilih
                        </button>
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <!-- Infinite scroll sentinel -->
              <div ref="sentinelEl" class="flex items-center justify-center py-3">
                <template v-if="productsLoadingMore">
                  <Loader2 class="h-4 w-4 animate-spin text-gray-400" />
                </template>
                <template v-else-if="currentPage >= totalPages && products.length">
                  <span class="text-xs text-gray-300">Semua produk telah dimuat</span>
                </template>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="shrink-0 border-t border-gray-100 px-6 py-4 text-right">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="close"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
