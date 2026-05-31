<script setup lang="ts">
import {
  ArrowLeft, Search, Image as ImageIcon, Loader2,
  X, Download, CheckCircle2, ChevronDown, ChevronUp, Plus, Check,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface StoreOption {
  id: string
  shop_name: string
  source: string
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

interface MpSkuItem {
  id: string
  sku: string
  price: string
  warehouse_id: string
  stock: number
  status: string
  variants: { name: string; value: string }[]
  binding?: BindingInfo | null
}

interface MpProduct {
  id: string
  name: string
  status: string
  thumbnail: string
  skus: MpSkuItem[]
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const stores = ref<StoreOption[]>([])
const storesLoading = ref(false)
const selectedStoreId = ref('')

const mpProducts = ref<MpProduct[]>([])
const mpProductsLoading = ref(false)
const mpProductsLoadingMore = ref(false)
const mpNextCursor = ref<string | null>(null)
const mpSearch = ref('')

const importingId = ref<string | null>(null)
const importedIds = ref<Set<string>>(new Set())

const expandedIds = ref<Set<string>>(new Set())
// Detail cache for platforms that need a separate detail API call (e.g. TikTok)
const mpProductDetails = ref<Record<string, MpProduct>>({})
const mpProductDetailLoading = ref<Set<string>>(new Set())

// Global SKU filters
const bindingFilter = ref<'all' | 'bound' | 'unbound'>('all')
const matchFilter = ref<'all' | 'match' | 'mismatch'>('all')

// Binding modal state
const bindingModalOpen = ref(false)
const selectedMpSku = ref<{ productId: string; productName: string; sku: MpSkuItem } | null>(null)
const deletingBindingId = ref<string | null>(null)

// Bulk binding
const selectedProductIds = ref<Set<string>>(new Set())
const bulkBindingModalOpen = ref(false)

const sentinelEl = ref<HTMLElement | null>(null)
let sentinelObserver: IntersectionObserver | null = null

const selectedStore = computed(() => stores.value.find(s => s.id === selectedStoreId.value) || null)

const selectedProducts = computed(() => 
  mpProducts.value.filter(p => selectedProductIds.value.has(p.id))
)

const allFilteredSelected = computed(() => {
  if (mpProductsFiltered.value.length === 0) return false
  return mpProductsFiltered.value.every(p => selectedProductIds.value.has(p.id))
})

const someFilteredSelected = computed(() => {
  if (mpProductsFiltered.value.length === 0) return false
  return mpProductsFiltered.value.some(p => selectedProductIds.value.has(p.id)) && !allFilteredSelected.value
})

const mpProductsFiltered = computed(() => {
  const q = mpSearch.value.trim().toLowerCase()
  let filtered = mpProducts.value
  
  // Text search filter
  if (q) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q)
      || p.id.toLowerCase().includes(q)
      || p.skus?.some(s => {
        const sku = s.sku?.toLowerCase()
        return sku?.includes(q) || s.id?.toLowerCase().includes(q)
      }),
    )
  }
  
  // Binding & match filter - filter products that have at least one matching SKU
  if (bindingFilter.value !== 'all' || matchFilter.value !== 'all') {
    filtered = filtered.filter(p => {
      const skus = mpProductDetails.value[p.id]?.skus ?? p.skus ?? []
      return skus.some(sku => {
        // Binding filter
        if (bindingFilter.value === 'bound' && !sku.binding) return false
        if (bindingFilter.value === 'unbound' && sku.binding) return false
        
        // Match filter (only applies to bound SKUs)
        if (matchFilter.value !== 'all' && sku.binding) {
          const isMatch = sku.binding.sku === sku.sku
          if (matchFilter.value === 'match' && !isMatch) return false
          if (matchFilter.value === 'mismatch' && isMatch) return false
        }
        
        return true
      })
    })
  }
  
  return filtered
})

const shouldAutoFetch = computed(() =>
  mpSearch.value.trim() !== ''
  && mpProductsFiltered.value.length === 0
  && mpNextCursor.value !== null
  && !mpProductsLoading.value
  && !mpProductsLoadingMore.value,
)

async function loadStores() {
  storesLoading.value = true
  try {
    const res = await api.get<{ data: StoreOption[] | null }>('/stores/public/index')
    stores.value = (res.data || []).filter(s => s.source !== 'internal')
  }
  catch {}
  finally {
    storesLoading.value = false
  }
}

async function onStoreSelect() {
  mpProducts.value = []
  mpNextCursor.value = null
  expandedIds.value = new Set()
  importedIds.value = new Set()
  mpProductDetails.value = {}
  mpSearch.value = ''
  bindingFilter.value = 'all'
  matchFilter.value = 'all'
  selectedProductIds.value = new Set()
  if (!selectedStoreId.value) return
  await fetchMpProducts()
  if (shouldAutoFetch.value) await loadMore()
}

async function fetchMpProducts(append = false) {
  const store = selectedStore.value
  if (!store) return
  if (append) mpProductsLoadingMore.value = true
  else mpProductsLoading.value = true
  try {
    const params: Record<string, string> = { store_id: store.id }
    if (append && mpNextCursor.value) params.cursor = mpNextCursor.value
    const res = await api.get<{ data: { data: MpProduct[]; next_cursor?: string | null } }>(`/products/${store.source}/index`, params)
    const page = res.data?.data || []
    if (append) mpProducts.value.push(...page)
    else mpProducts.value = page
    mpNextCursor.value = res.data?.next_cursor ?? null
  }
  catch {
    if (!append) mpProducts.value = []
  }
  finally {
    mpProductsLoading.value = false
    mpProductsLoadingMore.value = false
  }
}

async function loadMore() {
  if (!mpNextCursor.value || mpProductsLoading.value || mpProductsLoadingMore.value) return
  await fetchMpProducts(true)
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

watch(mpSearch, async () => {
  if (shouldAutoFetch.value) await loadMore()
})

// ── Helpers ────────────────────────────────────────────────────────────────

function normalizeVariants(v: Record<string, string> | { name: string; value: string }[]): { name: string; value: string }[] {
  if (Array.isArray(v)) return v
  if (v && typeof v === 'object') return Object.entries(v).map(([name, value]) => ({ name, value: String(value) }))
  return []
}

function buildImportPayload(mpProd: MpProduct) {
  const firstVariants = mpProd.skus?.[0] ? normalizeVariants(mpProd.skus[0].variants) : []
  const variant1Name = firstVariants[0]?.name || ''
  const variant2Name = firstVariants[1]?.name || ''

  return {
    name: mpProd.name,
    slug: '',
    description: '',
    short_description: '',
    thumbnail: mpProd.thumbnail || '',
    images: [],
    variant_1: variant1Name,
    variant_2: variant2Name,
    tags: [],
    type: 'master',
    status: 'active',
    category_id: '',
    skus: (mpProd.skus || []).map((s) => {
      const vars = normalizeVariants(s.variants)
      return {
        sku: s.sku || s.id,
        image: '',
        variant_1: vars[0]?.value || '',
        variant_2: vars[1]?.value || '',
        weight: 0,
        is_preorder: false,
        buffer_stock: 0,
        rewards_point: 0,
        status: 'active',
        prices: [],
      }
    }),
  }
}

async function fetchProductDetail(id: string): Promise<MpProduct | null> {
  const store = selectedStore.value
  if (!store) return null
  if (mpProductDetails.value[id]) return mpProductDetails.value[id]!
  mpProductDetailLoading.value.add(id)
  // Trigger reactivity
  mpProductDetailLoading.value = new Set(mpProductDetailLoading.value)
  try {
    const res = await api.get<{ data: MpProduct }>(`/products/${store.source}/${id}`, { store_id: store.id })
    mpProductDetails.value[id] = res.data
    return res.data
  }
  catch {
    toast.error('Gagal memuat detail produk')
    return null
  }
  finally {
    mpProductDetailLoading.value.delete(id)
    mpProductDetailLoading.value = new Set(mpProductDetailLoading.value)
  }
}

async function importProduct(mpProd: MpProduct) {
  const store = selectedStore.value
  if (!store || importingId.value) return

  // TikTok index API does not return full SKU data — always fetch detail first
  let prodToImport = mpProd
  if (store.source === 'tiktok') {
    const detail = await fetchProductDetail(mpProd.id)
    if (!detail) return
    prodToImport = detail
  }

  const ok = await confirm({
    title: 'Import Produk',
    message: `Import "${mpProd.name}" ke produk internal? Data dasar seperti kategori dan harga dapat diisi setelah import.`,
    confirmText: 'Import',
  })
  if (!ok) return

  importingId.value = mpProd.id
  try {
    await api.post('/products/create', buildImportPayload(prodToImport))
    importedIds.value.add(mpProd.id)
    // Trigger reactivity
    importedIds.value = new Set(importedIds.value)
    toast.success(`"${mpProd.name}" berhasil diimport`)
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal import produk')
  }
  finally {
    importingId.value = null
  }
}

async function toggleExpand(id: string) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
    expandedIds.value = new Set(expandedIds.value)
    return
  }
  // TikTok: fetch detail before expanding so we have full SKU list
  if (selectedStore.value?.source === 'tiktok' && !mpProductDetails.value[id]) {
    await fetchProductDetail(id)
  }
  expandedIds.value.add(id)
  expandedIds.value = new Set(expandedIds.value)
}

function getFilteredSkus(skus: MpSkuItem[]): MpSkuItem[] {
  return skus.filter(sku => {
    // Binding filter
    if (bindingFilter.value === 'bound' && !sku.binding) return false
    if (bindingFilter.value === 'unbound' && sku.binding) return false
    
    // Match filter (only applies to bound SKUs)
    if (matchFilter.value !== 'all' && sku.binding) {
      const isMatch = sku.binding.sku === sku.sku
      if (matchFilter.value === 'match' && !isMatch) return false
      if (matchFilter.value === 'mismatch' && isMatch) return false
    }
    
    return true
  })
}

function openBindingModal(mpProd: MpProduct, sku: MpSkuItem) {
  selectedMpSku.value = {
    productId: mpProd.id,
    productName: mpProd.name,
    sku,
  }
  bindingModalOpen.value = true
}

function closeBindingModal() {
  bindingModalOpen.value = false
  selectedMpSku.value = null
}

async function deleteBinding(sku: MpSkuItem) {
  if (!sku.binding || deletingBindingId.value) return
  
  const ok = await confirm({
    title: 'Hapus Binding',
    message: `Hapus binding ke produk internal "${sku.binding.product_name}" - SKU "${sku.binding.sku}"?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  deletingBindingId.value = sku.binding.id
  try {
    await api.delete(`/products/bindings/${sku.binding.id}`)
    toast.success('Binding berhasil dihapus') 
    
    // Update local state - remove binding without refresh
    // Find the product that contains this SKU
    let targetProductId: string | null = null
    
    // Search in mpProducts
    for (const prod of mpProducts.value) {
      if (prod.skus.some(s => s.id === sku.id)) {
        targetProductId = prod.id
        const productIndex = mpProducts.value.findIndex(p => p.id === prod.id)
        if (productIndex !== -1) {
          const product = mpProducts.value[productIndex]!
          const skuIndex = product.skus.findIndex(s => s.id === sku.id)
          if (skuIndex !== -1) {
            const updatedSkus = [...product.skus]
            updatedSkus[skuIndex] = { ...updatedSkus[skuIndex]!, binding: null } as MpSkuItem
            mpProducts.value[productIndex] = { ...product, skus: updatedSkus }
          }
        }
        break
      }
    }
    
    // Also update in product details cache if exists (for TikTok)
    if (targetProductId && mpProductDetails.value[targetProductId]) {
      const detail = mpProductDetails.value[targetProductId]
      if (detail) {
        const skuIndex = detail.skus.findIndex(s => s.id === sku.id)
        if (skuIndex !== -1) {
          const updatedSkus = [...detail.skus]
          updatedSkus[skuIndex] = { ...updatedSkus[skuIndex]!, binding: null } as MpSkuItem
          mpProductDetails.value[targetProductId] = { ...detail, skus: updatedSkus }
        }
      }
    }
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus binding')
  }
  finally {
    deletingBindingId.value = null
  }
}

async function onBindingAdded(binding: BindingInfo) {
  // Update local state with new binding data (no refresh needed)
  const mpProd = selectedMpSku.value
  if (!mpProd) return
  
  // Find and update the SKU in the product list
  const productIndex = mpProducts.value.findIndex(p => p.id === mpProd.productId)
  if (productIndex !== -1) {
    const product = mpProducts.value[productIndex]!
    const skuIndex = product.skus.findIndex(s => s.id === mpProd.sku.id)
    if (skuIndex !== -1) {
      // Update the SKU with binding - trigger reactivity by replacing array item
      const updatedSkus = [...product.skus]
      updatedSkus[skuIndex] = { ...updatedSkus[skuIndex]!, binding } as MpSkuItem
      mpProducts.value[productIndex] = { ...product, skus: updatedSkus }
    }
  }
  
  // Also update in product details cache if exists (for TikTok)
  if (mpProductDetails.value[mpProd.productId]) {
    const detail = mpProductDetails.value[mpProd.productId]
    if (detail) {
      const skuIndex = detail.skus.findIndex(s => s.id === mpProd.sku.id)
      if (skuIndex !== -1) {
        const updatedSkus = [...detail.skus]
        updatedSkus[skuIndex] = { ...updatedSkus[skuIndex]!, binding } as MpSkuItem
        mpProductDetails.value[mpProd.productId] = { ...detail, skus: updatedSkus }
      }
    }
  }
}

async function onBindingDeleted() {
  // Refresh product detail to get updated binding info
  if (selectedStore.value?.source === 'tiktok' && selectedMpSku.value) {
    await fetchProductDetail(selectedMpSku.value.productId)
  } else {
    await fetchMpProducts()
  }
}

function toggleSelectAll() {
  if (allFilteredSelected.value) {
    // Deselect all filtered products
    mpProductsFiltered.value.forEach(p => selectedProductIds.value.delete(p.id))
  } else {
    // Select all filtered products
    mpProductsFiltered.value.forEach(p => selectedProductIds.value.add(p.id))
  }
  selectedProductIds.value = new Set(selectedProductIds.value)
}

function toggleSelectProduct(productId: string) {
  if (selectedProductIds.value.has(productId)) {
    selectedProductIds.value.delete(productId)
  } else {
    selectedProductIds.value.add(productId)
  }
  selectedProductIds.value = new Set(selectedProductIds.value)
}

function openBulkBindingModal() {
  if (selectedProducts.value.length === 0) {
    toast.error('Pilih minimal 1 produk')
    return
  }
  bulkBindingModalOpen.value = true
}

function onBulkBindingsCreated(bindings: BindingInfo[]) {
  // Update local state for all created bindings
  for (const binding of bindings) {
    const productIndex = mpProducts.value.findIndex(p => p.id === binding.mp_product_id)
    if (productIndex !== -1) {
      const product = mpProducts.value[productIndex]!
      const skuIndex = product.skus.findIndex(s => s.id === binding.mp_sku_id)
      if (skuIndex !== -1) {
        const updatedSkus = [...product.skus]
        updatedSkus[skuIndex] = { ...updatedSkus[skuIndex]!, binding } as MpSkuItem
        mpProducts.value[productIndex] = { ...product, skus: updatedSkus }
      }
    }
    
    // Also update in product details cache if exists (for TikTok)
    if (mpProductDetails.value[binding.mp_product_id]) {
      const detail = mpProductDetails.value[binding.mp_product_id]!
      const skuIndex = detail.skus.findIndex(s => s.id === binding.mp_sku_id)
      if (skuIndex !== -1) {
        const updatedSkus = [...detail.skus]
        updatedSkus[skuIndex] = { ...updatedSkus[skuIndex]!, binding } as MpSkuItem
        mpProductDetails.value[binding.mp_product_id] = { ...detail, skus: updatedSkus }
      }
    }
  }
  
  // Clear selection
  selectedProductIds.value = new Set()
}

onMounted(() => {
  loadStores()
})

onUnmounted(() => {
  sentinelObserver?.disconnect()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/product/masters"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Produk Marketplace</h1>
        <p class="mt-0.5 text-sm text-gray-500">Produk dari marketplace</p>
      </div>
    </div>

    <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <!-- Store selector -->
      <div class="border-b border-gray-100 px-6 py-4">
        <p class="mb-3 text-sm font-medium text-gray-700">Pilih Toko Marketplace</p>
        <div v-if="storesLoading" class="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 class="h-4 w-4 animate-spin" />
          Memuat toko...
        </div>
        <div v-else-if="!stores.length" class="text-sm text-gray-400">
          Tidak ada toko marketplace yang tersedia.
        </div>
        <div v-else class="flex flex-wrap gap-2">
          <button
            v-for="store in stores"
            :key="store.id"
            type="button"
            class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            :class="selectedStoreId === store.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            @click="selectedStoreId = store.id; onStoreSelect()"
          >
            <img :src="'/images/platform/' + store.source + '.svg'" alt="" class="h-4 w-4 object-contain" />
            <span>{{ store.shop_name }}</span> 
          </button>
        </div>
      </div>

      <!-- Search & Filters -->
      <div v-if="selectedStoreId" class="border-b border-gray-100 px-6 py-3 space-y-3">
          <!-- Search input -->
          <div class="relative max-w-sm">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="mpSearch"
              type="text"
              placeholder="Cari nama produk atau ID..."
              class="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
            />
            <button
              v-if="mpSearch"
              type="button"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
              @click="mpSearch = ''"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>

          <!-- Filters -->
          <div class="flex flex-wrap items-center gap-3">
            <!-- Bulk selection actions -->
            <div v-if="selectedProductIds.size > 0" class="flex items-center gap-2">
              <span class="text-xs font-medium text-blue-600">{{ selectedProductIds.size }} dipilih</span>
              <button
                type="button"
                class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                @click="openBulkBindingModal"
              >
                Binding Massal
              </button>
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                @click="selectedProductIds = new Set()"
              >
                Batal
              </button>
            </div>
            
            <span v-if="selectedProductIds.size > 0" class="text-gray-300">|</span>
            
            <span class="text-xs font-medium text-gray-600">Filter SKU:</span>
            
            <!-- Binding status filter -->
            <div class="flex items-center gap-1">
              <button
                v-for="opt in [
                  { value: 'all', label: 'Semua' },
                  { value: 'bound', label: 'Sudah Binding' },
                  { value: 'unbound', label: 'Belum Binding' }
                ]"
                :key="opt.value"
                type="button"
                class="rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                :class="bindingFilter === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                @click="bindingFilter = opt.value as 'all' | 'bound' | 'unbound'"
              >
                {{ opt.label }}
              </button>
            </div>

            <span class="text-gray-300">|</span>

            <!-- SKU match filter -->
            <div class="flex items-center gap-1">
              <button
                v-for="opt in [
                  { value: 'all', label: 'Semua' },
                  { value: 'match', label: 'SKU Cocok' },
                  { value: 'mismatch', label: 'SKU Beda' }
                ]"
                :key="opt.value"
                type="button"
                class="rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                :class="matchFilter === opt.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                @click="matchFilter = opt.value as 'all' | 'match' | 'mismatch'"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
      </div>
 

      <!-- Empty state: no store selected -->
      <div v-if="!selectedStoreId" class="flex flex-col items-center justify-center gap-3 py-16">
        <Download class="h-10 w-10 text-gray-200" />
        <p class="text-sm text-gray-400">Pilih toko untuk melihat daftar produk</p>
      </div>

      <!-- Loading -->
      <div v-else-if="mpProductsLoading" class="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
        <Loader2 class="h-5 w-5 animate-spin" />
        Memuat produk...
      </div>

      <!-- Empty: no results -->
      <div v-else-if="!mpProductsFiltered.length" class="py-16 text-center">
        <template v-if="mpProductsLoadingMore">
          <Loader2 class="mx-auto mb-2 h-5 w-5 animate-spin text-gray-400" />
          <p class="text-sm text-gray-400">Mencari lebih banyak produk...</p>
        </template>
        <template v-else>
          <p class="text-sm text-gray-400">Tidak ada produk ditemukan.</p>
        </template>
      </div>

      <!-- Product list -->
      <template v-else>
        <div class="divide-y divide-gray-100">
          <!-- Select all -->
          <div class="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-6 py-2">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
              :checked="allFilteredSelected"
              :indeterminate="someFilteredSelected"
              @change="toggleSelectAll"
            />
            <span class="text-xs font-medium text-gray-600">
              Pilih Semua ({{ mpProductsFiltered.length }} produk)
            </span>
          </div>
          
          <div
            v-for="mpProd in mpProductsFiltered"
            :key="mpProd.id"
            class="px-6 py-4"
          >
            <div class="flex items-start gap-4">
              <!-- Checkbox -->
              <div class="pt-1">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                  :checked="selectedProductIds.has(mpProd.id)"
                  @change="toggleSelectProduct(mpProd.id)"
                />
              </div>
              <!-- Thumbnail -->
              <div class="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <img
                  v-if="mpProd.thumbnail"
                  :src="mpProd.thumbnail"
                  alt=""
                  class="h-full w-full object-cover"
                  @error="($event.target as HTMLImageElement).style.display='none'"
                />
                <ImageIcon v-else class="mx-auto mt-4 h-6 w-6 text-gray-300" />
              </div>

              <!-- Info -->
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-gray-900">{{ mpProd.name }}</p>
                    <div class="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span class="font-mono">ID: {{ mpProd.id }}</span>
                      <span>&middot;</span>
                      <span>{{ mpProd.skus?.length || 0 }} SKU</span>
                      <span
                        class="rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
                        :class="mpProd.status === 'active' || mpProd.status === 'NORMAL'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'"
                      >{{ mpProd.status }}</span>
                    </div>
                  </div>

                  <!-- Import button / already imported -->
                  <div class="shrink-0">
                    <button
                      v-if="!importedIds.has(mpProd.id)"
                      type="button"
                      class="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="importingId === mpProd.id"
                      @click="importProduct(mpProd)"
                    >
                      <Loader2 v-if="importingId === mpProd.id" class="mr-1.5 inline h-3 w-3 animate-spin" />
                      {{ importingId === mpProd.id ? 'Mengimport...' : 'Import' }}
                    </button>
                    <span
                      v-else
                      class="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
                    >
                      <Check class="h-3 w-3" />
                      Sudah Import
                    </span>
                  </div>
                </div>

                <!-- SKU list toggle -->
                <button
                  type="button"
                  class="mt-2 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
                  @click="toggleExpand(mpProd.id)"
                >
                  <component :is="expandedIds.has(mpProd.id) ? ChevronUp : ChevronDown" class="h-3.5 w-3.5" />
                  {{ expandedIds.has(mpProd.id) ? 'Sembunyikan' : 'Lihat' }} Daftar SKU
                </button>

                <!-- SKU Table (Expanded) -->
                <div v-if="expandedIds.has(mpProd.id)" class="mt-3 overflow-hidden rounded-lg border border-gray-200">
                  <table class="w-full text-xs">
                    <thead class="bg-gray-50">
                      <tr class="border-b border-gray-200">
                        <th class="px-3 py-2 text-left font-medium text-gray-600">SKU ID</th>
                        <th class="px-3 py-2 text-left font-medium text-gray-600">SKU</th>
                        <th class="px-3 py-2 text-left font-medium text-gray-600">Varian</th>
                        <th class="px-3 py-2 text-left font-medium text-gray-600">Stok</th>
                        <th class="px-3 py-2 text-left font-medium text-gray-600">Binding Master Produk</th>
                        <th class="px-3 py-2 text-left font-medium text-gray-600">SKU</th>
                        <th class="px-3 py-2 text-left font-medium text-gray-600">Varian</th>
                        <th class="px-3 py-2 text-center font-medium text-gray-600">Aksi</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                      <template v-if="getFilteredSkus(mpProductDetails[mpProd.id]?.skus ?? mpProd.skus).length === 0">
                        <tr>
                          <td colspan="7" class="px-3 py-8 text-center text-sm text-gray-400">
                            Tidak ada SKU yang sesuai dengan filter
                          </td>
                        </tr>
                      </template>
                      <tr
                        v-else
                        v-for="sku in getFilteredSkus(mpProductDetails[mpProd.id]?.skus ?? mpProd.skus)"
                        :key="sku.id"
                        :class="sku.binding ? 'bg-green-50/30' : 'bg-white hover:bg-gray-50'"
                      >
                        <!-- SKU ID -->
                        <td class="px-3 py-2">
                          <span class="font-mono text-gray-700">{{ sku.id }}</span>
                        </td>
                        <!-- SKU Code -->
                        <td class="px-3 py-2">
                          <span class="font-mono text-gray-700">{{ sku.sku || sku.id }}</span>
                        </td>

                        <!-- Variants -->
                        <td class="px-3 py-2">
                          <div class="flex flex-wrap gap-1">
                            <template v-for="(val, key) in sku.variants" :key="key">
                              <span class="rounded bg-primary-50 px-1.5 py-0.5 font-medium text-primary-700">{{ val?.value }}</span>
                            </template>
                          </div>
                        </td>

                        <!-- Stock -->
                        <td class="px-3 py-2">
                          <span class="text-gray-700">{{ sku.stock ?? '-' }}</span>
                        </td>

                        <!-- Binding: Product Name -->
                        <td class="px-3 py-2">
                          <span v-if="sku.binding" class="text-gray-700">{{ sku.binding.product_name }}</span>
                          <span v-else class="text-gray-400">-</span>
                        </td>

                        <!-- Binding: SKU Code -->
                        <td class="px-3 py-2">
                          <span
                            v-if="sku.binding"
                            class="font-mono"
                            :class="sku.binding.sku === sku.sku
                              ? 'text-gray-700'
                              : 'rounded bg-yellow-100 px-1.5 py-0.5 font-medium text-yellow-900'"
                          >
                            {{ sku.binding.sku }}
                          </span>
                          <span v-else class="text-gray-400">-</span>
                        </td>

                        <!-- Binding: Variant Names -->
                        <td class="px-3 py-2">
                          <template v-if="sku.binding">
                            <div class="flex flex-wrap gap-1">
                              <span
                                v-for="(variant, idx) in sku.binding.variants"
                                :key="idx"
                                class="rounded bg-gray-100 px-1.5 py-0.5 text-gray-700"
                              >
                                {{ variant.value }}
                              </span>
                            </div>
                          </template>
                          <span v-else class="text-gray-400">-</span>
                        </td>

                        <!-- Action -->
                        <td class="px-3 py-2 text-center">
                          <template v-if="sku.binding">
                            <button
                              type="button"
                              class="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                              :disabled="deletingBindingId === sku.binding.id"
                              @click="deleteBinding(sku)"
                            >
                              <Loader2 v-if="deletingBindingId === sku.binding.id" class="mr-1 inline h-3 w-3 animate-spin" />
                              {{ deletingBindingId === sku.binding.id ? 'Menghapus...' : 'Hapus' }}
                            </button>
                          </template>
                          <template v-else>
                            <button
                              type="button"
                              class="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                              @click="openBindingModal(mpProd, sku)"
                            >
                              Tambah
                            </button>
                          </template>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sentinel for infinite scroll -->
        <div ref="sentinelEl" class="flex items-center justify-center py-4">
          <template v-if="mpProductsLoadingMore">
            <Loader2 class="h-4 w-4 animate-spin text-gray-400" />
          </template>
          <template v-else-if="!mpNextCursor">
            <span class="text-xs text-gray-300">Semua produk telah dimuat</span>
          </template>
        </div>
      </template>
    </div>

    <!-- Binding modal -->
    <AppBindingMarketplaceModal
      v-model="bindingModalOpen"
      :store-id="selectedStoreId"
      :store-name="selectedStore?.shop_name || ''"
      :store-source="selectedStore?.source || ''"
      :mp-sku="selectedMpSku"
      @binding-added="onBindingAdded"
      @binding-deleted="onBindingDeleted"
    />
    
    <!-- Bulk binding modal -->
    <AppBulkBindingModal
      v-model="bulkBindingModalOpen"
      :selected-products="selectedProducts"
      :store-id="selectedStoreId"
      :store-name="selectedStore?.shop_name || ''"
      :store-source="selectedStore?.source || ''"
      @bindings-created="onBulkBindingsCreated"
    />
  </div>
</template>
