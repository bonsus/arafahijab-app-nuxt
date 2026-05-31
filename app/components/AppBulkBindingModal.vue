<script setup lang="ts">
import { Loader2, X, Check, AlertCircle, ChevronRight, Search } from 'lucide-vue-next'

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

interface MpSkuItem {
  id: string
  sku: string
  price: string
  warehouse_id: string
  stock: number
  status: string
  variants?: { name: string; value: string }[] | null
  binding?: BindingInfo | null
}

interface MpProduct {
  id: string
  name: string
  status: string
  thumbnail: string
  skus: MpSkuItem[]
}

interface InternalProduct {
  id: string
  name: string
  thumbnail: string
  skus?: InternalSku[]
}

interface InternalSku {
  id: string
  sku: string
  variants?: { name: string; value: string }[] | null
  status: string
}

interface MatchedSkuPair {
  mpProduct: MpProduct
  mpSku: MpSkuItem
  internalProduct?: InternalProduct
  internalSku?: InternalSku
  status: 'matched' | 'not-matched' | 'already-bound' | 'pending' | 'processing' | 'success' | 'error'
  error?: string
  binding?: BindingInfo
}

interface Props {
  modelValue: boolean
  selectedProducts: MpProduct[]
  storeId: string
  storeName: string
  storeSource: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'bindings-created': [bindings: BindingInfo[]]
}>()

const api = useApi()
const toast = useToast()

const internalProducts = ref<InternalProduct[]>([])
const loadingProducts = ref(false)
const matchedPairs = ref<MatchedSkuPair[]>([])
const processing = ref(false)
const currentIndex = ref(0)
const activeFilter = ref<'all' | 'matched' | 'not-matched' | 'already-bound'>('all')
const detailedMpProducts = ref<Record<string, MpProduct>>({})

const stats = computed(() => {
  const total = matchedPairs.value.length
  const matched = matchedPairs.value.filter(p => p.status === 'matched').length
  const notMatched = matchedPairs.value.filter(p => p.status === 'not-matched').length
  const alreadyBound = matchedPairs.value.filter(p => p.status === 'already-bound').length
  const success = matchedPairs.value.filter(p => p.status === 'success').length
  const error = matchedPairs.value.filter(p => p.status === 'error').length
  const pending = matchedPairs.value.filter(p => p.status === 'pending').length
  const processing = matchedPairs.value.filter(p => p.status === 'processing').length
  
  return { total, matched, notMatched, alreadyBound, success, error, pending, processing }
})

const filteredPairs = computed(() => {
  if (activeFilter.value === 'all') {
    return matchedPairs.value
  } else if (activeFilter.value === 'matched') {
    return matchedPairs.value.filter(p => p.status === 'matched' || p.status === 'pending' || p.status === 'processing' || p.status === 'success' || p.status === 'error')
  } else if (activeFilter.value === 'not-matched') {
    return matchedPairs.value.filter(p => p.status === 'not-matched')
  } else if (activeFilter.value === 'already-bound') {
    return matchedPairs.value.filter(p => p.status === 'already-bound')
  }
  return matchedPairs.value
})

const canCreateBinding = computed(() => {
  return stats.value.matched > 0 || stats.value.pending > 0
})

const isComplete = computed(() => {
  // Complete means: we've processed something AND we're not currently processing
  const hasProcessedSomething = stats.value.success > 0 || stats.value.error > 0
  return hasProcessedSomething && 
         stats.value.pending === 0 && 
         stats.value.processing === 0 && 
         processing.value === false
})

function close() {
  if (processing.value) {
    toast.error('Proses binding masih berjalan')
    return
  }
  emit('update:modelValue', false)
}

async function fetchInternalProducts() {
  try {
    // Fetch all products with SKUs (page-based, fetch all pages)
    let allProducts: InternalProduct[] = []
    let currentPage = 1
    let hasMore = true
    
    while (hasMore) {
      const res = await api.get<{ data: { data: InternalProduct[]; total_page: number } }>('/products/index', {
        page: String(currentPage),
        per_page: '200',
        with_skus: '1',
      })
      
      const pageData = res.data?.data || []
      allProducts = allProducts.concat(pageData)
      
      const totalPages = res.data?.total_page || 0
      hasMore = currentPage < totalPages
      currentPage++
    }
    
    internalProducts.value = allProducts
  } catch (err: any) {
    toast.error('Gagal memuat produk internal')
    internalProducts.value = []
  }
}

function matchSkus() {
  const pairs: MatchedSkuPair[] = []
  
  for (const mpProduct of props.selectedProducts) {
    // Use detailed version if available (for TikTok)
    const productToUse = detailedMpProducts.value[mpProduct.id] || mpProduct
    
    if (!productToUse.skus || !Array.isArray(productToUse.skus)) continue
    
    for (const mpSku of productToUse.skus) {
      // Check if already bound
      if (mpSku.binding) {
        pairs.push({
          mpProduct: productToUse,
          mpSku,
          status: 'already-bound',
        })
        continue
      }
      
      // Try to find matching internal SKU by code
      let matched = false
      for (const internalProduct of internalProducts.value) {
        if (!internalProduct.skus || !Array.isArray(internalProduct.skus)) continue
        
        for (const internalSku of internalProduct.skus) {
          // Exact match or Lazada variant match (e.g., 1120103007-Putih matches 1120103007)
          const isExactMatch = internalSku.sku === mpSku.sku
          const isLazadaVariantMatch = mpSku.sku.startsWith(internalSku.sku + '-')
          
          if (isExactMatch || isLazadaVariantMatch) {
            pairs.push({
              mpProduct: productToUse,
              mpSku,
              internalProduct,
              internalSku,
              status: 'matched',
            })
            matched = true
            break
          }
        }
        
        if (matched) break
      }
      
      // If not matched, add as not-matched
      if (!matched) {
        pairs.push({
          mpProduct: productToUse,
          mpSku,
          status: 'not-matched',
        })
      }
    }
  }
  
  matchedPairs.value = pairs
}

async function startBulkBinding() {
  if (processing.value) return
  
  processing.value = true
  currentIndex.value = 0
  
  const createdBindings: BindingInfo[] = []
  
  // Get only matched pairs
  const pairsToProcess = matchedPairs.value.filter(p => p.status === 'matched')
  
  // Change matched status to pending before processing
  for (const pair of pairsToProcess) {
    pair.status = 'pending'
  }
  
  // Process in chunks of 400
  const chunkSize = 400
  for (let i = 0; i < pairsToProcess.length; i += chunkSize) {
    const chunk = pairsToProcess.slice(i, i + chunkSize)
    
    // Prepare payload array for this chunk
    const payloads = chunk.map(pair => ({
      store_id: props.storeId,
      mp_product_id: pair.mpProduct.id,
      mp_product_name: pair.mpProduct.name,
      mp_sku_id: pair.mpSku.id,
      mp_sku: pair.mpSku.sku,
      mp_variants: pair.mpSku.variants || [],
      mp_warehouse_id: pair.mpSku.warehouse_id,
      product_id: pair.internalProduct!.id,
      sku_id: pair.internalSku!.id,
    }))
    
    // Mark all in chunk as processing
    for (const pair of chunk) {
      pair.status = 'processing'
    }
    
    try {
      // Call mass create API
      const response = await api.post<{ data: Record<string, string> }>('/products/bindings/create-mass', payloads)
      
      // Process response for each item in chunk
      chunk.forEach((pair, index) => {
        const result = response.data?.[String(index)]
        
        if (result === 'success') {
          pair.status = 'success'
          
          // Construct binding info
          const binding: BindingInfo = {
            id: '',
            product_id: pair.internalProduct!.id,
            product_name: pair.internalProduct!.name,
            sku_id: pair.internalSku!.id,
            sku: pair.internalSku!.sku,
            variants: pair.internalSku!.variants || [],
            store_id: props.storeId,
            mp_product_id: pair.mpProduct.id,
            mp_product_name: pair.mpProduct.name,
            mp_sku_id: pair.mpSku.id,
            mp_sku: pair.mpSku.sku,
            mp_variants: pair.mpSku.variants || [],
            mp_warehouse_id: pair.mpSku.warehouse_id,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            store: {
              id: props.storeId,
              name: props.storeName,
              source: props.storeSource,
            },
          }
          
          pair.binding = binding
          // Update the original mpSku binding so it persists
          pair.mpSku.binding = binding
          createdBindings.push(binding)
        } else {
          pair.status = 'error'
          pair.error = result || 'Gagal membuat binding'
        }
      })
      
    } catch (err: any) {
      // If chunk request fails, mark all items in chunk as error
      for (const pair of chunk) {
        pair.status = 'error'
        pair.error = err.message || 'Gagal membuat binding'
      }
    }
    
    // Small delay between chunks
    if (i + chunkSize < pairsToProcess.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  processing.value = false
  
  // Emit all created bindings
  if (createdBindings.length > 0) {
    emit('bindings-created', createdBindings)
  }
  
  toast.success(`${stats.value.success} binding berhasil dibuat`)
}

async function initializeModal() {
  matchedPairs.value = []
  // Don't reset detailedMpProducts - keep the cache across modal opens
  loadingProducts.value = true
  
  try {
    // Only fetch internal products if not already loaded
    if (internalProducts.value.length === 0) {
      await fetchInternalProducts()
    }
    
    // For TikTok: fetch detail for products with incomplete SKU data
    if (props.storeSource === 'tiktok') {
      await fetchTikTokProductDetails()
    }
    
    matchSkus()
  } finally {
    loadingProducts.value = false
  }
}

async function fetchTikTokProductDetails() {
  const productsNeedingDetail = props.selectedProducts.filter(p => {
    // Skip if already cached
    if (detailedMpProducts.value[p.id]) return false
    
    // Check if any SKU is missing variants data
    return p.skus?.some(sku => !sku.variants || sku.variants.length === 0)
  })
  
  if (productsNeedingDetail.length === 0) return
  
  try {
    // Fetch details in parallel (max 5 at a time to avoid overwhelming the API)
    const chunkSize = 5
    for (let i = 0; i < productsNeedingDetail.length; i += chunkSize) {
      const chunk = productsNeedingDetail.slice(i, i + chunkSize)
      await Promise.all(
        chunk.map(async (product) => {
          try {
            const res = await api.get<{ data: MpProduct }>(`/products/${props.storeSource}/${product.id}`, {
              store_id: props.storeId
            })
            
            // Store detailed version in cache
            if (res.data) {
              detailedMpProducts.value[product.id] = res.data
            }
          } catch (err) {
            console.warn(`Failed to fetch detail for TikTok product ${product.id}:`, err)
          }
        })
      )
      
      // Small delay between chunks
      if (i + chunkSize < productsNeedingDetail.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
  } catch (err) {
    console.error('Error fetching TikTok product details:', err)
  }
}

watch(() => props.modelValue, (open) => {
  if (open) {
    initializeModal()
  }
})

onMounted(() => {
  if (props.modelValue) {
    initializeModal()
  }
})
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @click.self="close"
  >
    <div class="w-full max-w-6xl max-h-[90vh] flex flex-col rounded-xl bg-white shadow-2xl" @click.stop>
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Binding Massal</h2>
          <p class="mt-0.5 text-sm text-gray-500">
            {{ selectedProducts.length }} produk terpilih
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          @click="close"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Loading state -->
      <div v-if="loadingProducts" class="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 class="h-8 w-8 animate-spin text-blue-600" />
        <p class="text-sm text-gray-600">
          {{ storeSource === 'tiktok' ? 'Memuat produk dan detail SKU...' : 'Memuat dan mencocokan produk...' }}
        </p>
      </div>

      <!-- Content -->
      <template v-else>
        <!-- Filter Tabs -->
        <div class="border-b border-gray-200 px-6">
          <div class="flex gap-8">
            <button
              type="button"
              class="relative pb-3 pt-4 text-sm font-medium transition-colors"
              :class="activeFilter === 'all' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'"
              @click="activeFilter = 'all'"
            >
              Semua ({{ stats.total }})
              <div v-if="activeFilter === 'all'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            </button>
            <button
              type="button"
              class="relative pb-3 pt-4 text-sm font-medium transition-colors"
              :class="activeFilter === 'matched' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'"
              @click="activeFilter = 'matched'"
            >
              Cocok ({{ stats.matched }})
              <div v-if="activeFilter === 'matched'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            </button>
            <button
              type="button"
              class="relative pb-3 pt-4 text-sm font-medium transition-colors"
              :class="activeFilter === 'not-matched' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'"
              @click="activeFilter = 'not-matched'"
            >
              Tidak Cocok ({{ stats.notMatched }})
              <div v-if="activeFilter === 'not-matched'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            </button>
            <button
              type="button"
              class="relative pb-3 pt-4 text-sm font-medium transition-colors"
              :class="activeFilter === 'already-bound' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'"
              @click="activeFilter = 'already-bound'"
            >
              Sudah Terikat ({{ stats.alreadyBound }})
              <div v-if="activeFilter === 'already-bound'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            </button>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-auto relative text-xs">
          <div class="flex grid-cols-4 gap-4 items-center p-4 bg-gray-100 sticky top-0 z-10">
            <!-- status -->
            <div class="w-12 text-xs font-medium text-gray-700">Status</div>
            <!-- mp product -->
            <div class="flex-1 text-xs font-medium text-gray-700">Produk Marketplace</div>
            <!-- arrow -->
            <div class="w-12 text-xs font-medium text-gray-700 text-center">→</div>
            <!-- internal product -->
            <div class="flex-1 text-xs font-medium text-gray-700">Produk Master</div>
          </div>
          <div v-for="(pair, idx) in filteredPairs"
                :key="`${pair.mpProduct.id}-${pair.mpSku.id}`"
                class="flex grid-cols-4 gap-4 items-center p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                :class="{
                  'bg-white': pair.status === 'matched' || pair.status === 'not-matched',
                  'bg-blue-50': pair.status === 'pending' || pair.status === 'processing',
                  'bg-green-50': pair.status === 'success',
                  'bg-red-50': pair.status === 'error',
                  'bg-gray-50': pair.status === 'already-bound',
                }"
          >
            <!-- Status Icon -->
            <div class="w-12 text-center">
              <div class="flex items-center gap-2">
                <Loader2 v-if="pair.status === 'processing'" class="h-4 w-4 animate-spin text-blue-600" />
                <Check v-else-if="pair.status === 'success'" class="h-4 w-4 text-green-600" />
                <AlertCircle v-else-if="pair.status === 'error'" class="h-4 w-4 text-red-600" />
                <AlertCircle v-else-if="pair.status === 'not-matched'" class="h-4 w-4 text-orange-500" />
                <div v-else-if="pair.status === 'already-bound'" class="h-4 w-4 rounded-full bg-gray-300"></div>
                <Check v-else-if="pair.status === 'matched'" class="h-4 w-4 text-green-500" />
                <div v-else class="h-4 w-4 rounded-full border-2 border-gray-300"></div>
              </div>
            </div>
            <!-- MP Product -->
            <div class="flex-1">
              <div class="font-medium text-gray-900 mb-1.5" :title="pair.mpProduct.name">{{ pair.mpProduct.name }}</div>
              <div class="flex items-center gap-2">
                <span class="font-mono text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">{{ pair.mpSku.sku || pair.mpSku.id }}</span>
                <span v-if="pair.mpSku.variants?.length" class="flex flex-wrap gap-1">
                  <span
                    v-for="(v, vIdx) in pair.mpSku.variants"
                    :key="vIdx"
                    class="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700"
                  >
                    {{ v.value }}
                  </span>
                </span>
                <span v-else class="text-gray-400">-</span>
              </div>
            </div>
            <!-- Arrow -->
            <div class="col-span-1 text-center">→</div>
            <!-- Internal Product -->
            <div class="flex-1">
              <template v-if="pair.internalProduct">
                <p class="font-medium truncate max-w-xs text-gray-900 mb-1.5" :title="pair.internalProduct?.name">{{ pair.internalProduct?.name }}</p>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">{{ pair.internalSku?.sku || pair.internalSku?.id }}</span>
                  <span v-if="pair.internalSku?.variants?.length" class="flex flex-wrap gap-1">
                    <span
                      v-for="(v, vIdx) in pair.internalSku?.variants"
                      :key="vIdx"
                      class="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700"
                    >
                      {{ v.value }}
                    </span>
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </div>  
              </template>
              <span v-else-if="pair.status !== 'already-bound'" class="text-orange-600">Tidak ditemukan</span>
            </div>
          </div> 
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <div class="text-sm text-gray-600">
            <template v-if="!processing && !isComplete">
              <span v-if="stats.matched > 0" class="text-green-600 font-medium">{{ stats.matched }} SKU siap dibuat binding</span>
              <span v-else class="text-orange-600">Tidak ada SKU yang cocok</span>
            </template>
            <template v-else-if="processing">
              <span class="text-blue-600 font-medium">Sedang memproses...</span>
            </template>
            <template v-else-if="isComplete">
              <span class="text-green-600 font-medium">Selesai! {{ stats.success }} binding berhasil dibuat</span>
            </template>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              :disabled="processing"
              @click="close"
            >
              {{ isComplete ? 'Tutup' : 'Batal' }}
            </button>
            <button
              v-if="!isComplete"
              type="button"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="processing || !canCreateBinding"
              @click="startBulkBinding"
            >
              <Loader2 v-if="processing" class="mr-2 inline h-4 w-4 animate-spin" />
              {{ processing ? 'Memproses...' : `Buat ${stats.matched} Binding` }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
