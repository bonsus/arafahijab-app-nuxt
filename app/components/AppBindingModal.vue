<script setup lang="ts">
import {
  X, Search, Image as ImageIcon, Loader2, ChevronDown,
  ToggleLeft, ToggleRight, Trash2, Plus, Link2, CheckCircle2,
} from 'lucide-vue-next'

interface StoreOption {
  id: string
  shop_name: string
  source: string
}

interface MpSkuItem {
  id: string
  sku: string
  price: string
  warehouse_id: string
  stock: number
  status: string
  variants: Record<string, string>
  binding?: BindingInfo | null
}

interface MpProduct {
  id: string
  name: string
  status: string
  thumbnail: string
  skus: MpSkuItem[]
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

interface MpSkuDetail {
  id: string
  sku: string
  price: string
  warehouse_id: string
  stock: number
  status: string
  variants: { name: string; value: string }[]
  binding?: BindingInfo | null
}

interface MpProductDetail {
  id: string
  name: string
  status: string
  thumbnail: string
  skus: MpSkuDetail[]
}

interface Binding {
  id: string
  sku_id: string
  store_id: string
  mp_product_id: string
  mp_product_name: string
  mp_sku_id: string
  mp_sku: string
  mp_warehouse_id: string
  mp_variants: { name: string; value: string }[]
  status: string
  store: {
    id: string
    name: string
    source: string
  }
}

const props = defineProps<{
  modelValue: boolean
  productId: string
  skuId: string
  skuCode: string
  productName: string
  variants: { name: string; value: string }[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'binding-added': []
  'binding-deleted': []
}>()

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const sourceLabels: Record<string, string> = {
  tiktok: 'TikTok', shopee: 'Shopee', lazada: 'Lazada', website: 'Website', internal: 'Internal',
}

// Tabs
const activeTab = ref<'bindings' | 'add'>('bindings')

// ── Tab: List bindings ─────────────────────────────────────────────────────
const bindings = ref<Binding[]>([])
const bindingsLoading = ref(false)
const togglingBinding = ref<Set<string>>(new Set())

async function loadBindings() {
  if (!props.skuId) return
  bindingsLoading.value = true
  try {
    const res = await api.get<{ data: Binding[] | null }>(`/products/bindings/${props.skuId}`)
    bindings.value = res.data || []
  }
  catch {
    bindings.value = []
  }
  finally {
    bindingsLoading.value = false
  }
}

async function toggleBindingStatus(binding: Binding) {
  if (togglingBinding.value.has(binding.id)) return
  const newStatus = binding.status === 'active' ? 'inactive' : 'active'
  togglingBinding.value.add(binding.id)
  try {
    await api.put(`/products/bindings/${binding.id}/update-status`, { status: newStatus })
    binding.status = newStatus
    toast.success(`Binding ${newStatus === 'active' ? 'diaktifkan' : 'dinonaktifkan'}`)
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status binding')
  }
  finally {
    togglingBinding.value.delete(binding.id)
  }
}

async function deleteBinding(binding: Binding) {
  const ok = await confirm({
    title: 'Hapus Binding',
    message: `Hapus binding untuk SKU marketplace "${binding.mp_sku || binding.mp_sku_id}"?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/products/bindings/${binding.id}`)
    bindings.value = bindings.value.filter(b => b.id !== binding.id)
    toast.success('Binding berhasil dihapus')
    emit('binding-deleted')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus binding')
  }
}

// ── Tab: Add binding ───────────────────────────────────────────────────────
const stores = ref<StoreOption[]>([])
const storesLoading = ref(false)
const selectedStoreId = ref('')
const mpProducts = ref<MpProduct[]>([])
const mpProductsLoading = ref(false)
const mpProductsLoadingMore = ref(false)
const mpNextCursor = ref<string | null>(null)
const mpSearch = ref('')
const expandedMpProductId = ref<string | null>(null)
const mpProductDetails = ref<Record<string, MpProductDetail>>({})
const mpProductDetailLoading = ref<Set<string>>(new Set())
const submittingSkuId = ref<string | null>(null)
const tooltipSkuId = ref<string | null>(null)
const showOnlyMatchingSkus = ref(false)
const sentinelEl = ref<HTMLElement | null>(null)
let sentinelObserver: IntersectionObserver | null = null

function openTooltip(skuId: string) {
  tooltipSkuId.value = tooltipSkuId.value === skuId ? null : skuId
}

function closeTooltip() {
  tooltipSkuId.value = null
}

const selectedStore = computed(() => stores.value.find(s => s.id === selectedStoreId.value) || null)

// Local search filter: match name, id, sku code, or sku id
const mpProductsFiltered = computed(() => {
  const q = mpSearch.value.trim().toLowerCase()
  if (!q) return mpProducts.value
  return mpProducts.value.filter(p =>
    p.name.toLowerCase().includes(q)
    || p.id.toLowerCase().includes(q)
    || p.skus?.some(s => s.sku?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q)),
  )
})

// Returns true when search is active but filtered results are empty and more pages exist
const shouldAutoFetch = computed(() =>
  mpSearch.value.trim() !== ''
  && mpProductsFiltered.value.length === 0
  && mpNextCursor.value !== null
  && !mpProductsLoading.value
  && !mpProductsLoadingMore.value,
)

async function loadStores() {
  if (stores.value.length) return
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
  expandedMpProductId.value = null
  mpProductDetails.value = {}
  mpSearch.value = props.skuCode
  if (!selectedStoreId.value) return
  await fetchMpProducts()
  // After initial fetch, if filter active and no local match, keep loading pages
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
  // If still no local match after loading more, keep fetching
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

watch(sentinelEl, (el) => {
  if (el) setupSentinel()
})

// When search changes, if nothing matches locally but more pages exist, auto-fetch
watch(mpSearch, async () => {
  if (shouldAutoFetch.value) await loadMore()
})

// ── Helpers ───────────────────────────────────────────────────────────────
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function highlightText(text: string, query: string): string {
  const q = query.trim()
  if (!q || !text) return escapeHtml(text || '')
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  let result = ''
  let lastIndex = 0
  let match: RegExpExecArray | null
  // eslint-disable-next-line no-cond-assign
  while ((match = regex.exec(text)) !== null) {
    result += escapeHtml(text.slice(lastIndex, match.index))
    result += `<mark class="rounded bg-yellow-200 px-0.5 text-yellow-900">${escapeHtml(match[0])}</mark>`
    lastIndex = regex.lastIndex
  }
  result += escapeHtml(text.slice(lastIndex))
  return result
}

function skuMatchesSearch(mpProd: MpProduct): boolean {
  const q = mpSearch.value.trim().toLowerCase()
  if (!q) return false
  return mpProd.skus?.some(s => s.sku?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q)) ?? false
}

function skuItemMatchesSearch(sku: MpSkuDetail): boolean {
  const q = mpSearch.value.trim().toLowerCase()
  if (!q) return true
  return sku.sku?.toLowerCase().includes(q) || sku.id?.toLowerCase().includes(q)
}

function getFilteredSkus(productId: string): MpSkuDetail[] {
  const detail = mpProductDetails.value[productId]
  if (!detail?.skus) return []
  if (!showOnlyMatchingSkus.value || !mpSearch.value.trim()) return detail.skus
  return detail.skus.filter(skuItemMatchesSearch)
}

async function toggleMpProduct(id: string) {
  if (expandedMpProductId.value === id) {
    expandedMpProductId.value = null
    return
  }
  expandedMpProductId.value = id
  if (!mpProductDetails.value[id] && selectedStore.value) {
    // Shopee & Lazada index API already returns complete SKU data — no detail call needed
    if (['shopee', 'lazada'].includes(selectedStore.value.source)) {
      const mpProd = mpProducts.value.find(p => p.id === id)
      if (mpProd) {
        mpProductDetails.value[id] = {
          id: mpProd.id,
          name: mpProd.name,
          status: mpProd.status,
          thumbnail: mpProd.thumbnail,
          skus: mpProd.skus.map(s => ({
            id: s.id,
            sku: s.sku,
            price: s.price,
            warehouse_id: s.warehouse_id,
            stock: s.stock,
            status: s.status,
            variants: Array.isArray(s.variants)
              ? (s.variants as unknown as { name: string; value: string }[])
              : Object.entries(s.variants as Record<string, string>).map(([name, value]) => ({ name, value })),
            binding: s.binding,
          })),
        }
      }
      return
    }
    mpProductDetailLoading.value.add(id)
    try {
      const res = await api.get<{ data: MpProductDetail }>(
        `/products/${selectedStore.value.source}/${id}`,
        { store_id: selectedStore.value.id },
      )
      mpProductDetails.value[id] = res.data
    }
    catch {}
    finally {
      mpProductDetailLoading.value.delete(id)
    }
  }
}

async function submitBinding(mpProd: MpProduct, sku: MpSkuDetail) {
  if (!selectedStore.value || submittingSkuId.value) return
  const store = selectedStore.value
  submittingSkuId.value = sku.id
  try {
    await api.post('/products/bindings/create', {
      sku_id: props.skuId,
      product_id: props.productId,
      store_id: store.id,
      mp_product_id: mpProd.id,
      mp_product_name: mpProd.name,
      mp_sku_id: sku.id,
      mp_sku: sku.sku,
      mp_warehouse_id: sku.warehouse_id,
      mp_variants: sku.variants,
      status: 'active',
    })
    // Immediately patch cache so SKU shows "Terikat" without needing a refresh
    const detail = mpProductDetails.value[mpProd.id]
    if (detail) {
      const skuInDetail = detail.skus.find(s => s.id === sku.id)
      if (skuInDetail) {
        skuInDetail.binding = {
          id: '',
          product_id: props.productId,
          product_name: props.productName,
          sku_id: props.skuId,
          sku: props.skuCode,
          variants: props.variants,
          store_id: store.id,
          mp_product_id: mpProd.id,
          mp_product_name: mpProd.name,
          mp_sku_id: sku.id,
          mp_sku: sku.sku,
          mp_variants: sku.variants,
          mp_warehouse_id: sku.warehouse_id,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          store: { id: store.id, name: store.shop_name, source: store.source },
        }
      }
    }
    toast.success('Binding berhasil ditambahkan')
    emit('binding-added')
    await loadBindings()
    activeTab.value = 'bindings'
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menambahkan binding')
  }
  finally {
    submittingSkuId.value = null
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
function close() {
  emit('update:modelValue', false)
}

onUnmounted(() => {
  sentinelObserver?.disconnect()
})

watch(() => props.modelValue, async (val) => {
  if (val) {
    activeTab.value = 'bindings'
    bindings.value = []
    selectedStoreId.value = ''
    mpProducts.value = []
    mpNextCursor.value = null
    mpSearch.value = ''
    expandedMpProductId.value = null
    mpProductDetails.value = {}
    submittingSkuId.value = null
    await Promise.all([loadBindings(), loadStores()])
  }
  else {
    sentinelObserver?.disconnect()
  }
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
        <div class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-gray-200" @mousedown="tooltipSkuId ? closeTooltip() : undefined">
          <!-- Header -->
          <div class="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
            <div class="flex items-center gap-2">
              <Link2 class="h-5 w-5 text-blue-500" />
              <div>
                <h3 class="text-base font-semibold text-gray-900">Binding Marketplace</h3>
                <p class="mt-0.5 text-sm text-gray-600">SKU: <span class="font-mono font-medium bg-yellow-100 text-yellow-900">{{ skuCode }}</span></p>
                <p v-if="productName" class="text-sm text-gray-600">
                  {{ productName }} - 
                  <span v-if="variants.length">
                    <span
                      v-for="v in variants"
                      :key="v.name"
                      class="rounded mr-1 bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700"
                    >{{ v.value }}</span>
                  </span> 
                </p>
              </div>
            </div>
            <button class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="close">
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Tabs -->
          <div class="flex shrink-0 border-b border-gray-200">
            <button
              class="relative px-5 py-3 text-sm font-medium transition-colors"
              :class="activeTab === 'bindings' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'"
              @click="activeTab = 'bindings'"
            >
              <span class="flex items-center gap-1.5">
                Daftar Binding
                <span
                  v-if="bindings.length"
                  class="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"
                >{{ bindings.length }}</span>
              </span>
              <span
                v-if="activeTab === 'bindings'"
                class="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-blue-600"
              />
            </button>
            <button
              class="relative px-5 py-3 text-sm font-medium transition-colors"
              :class="activeTab === 'add' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'"
              @click="activeTab = 'add'"
            >
              <span class="flex items-center gap-1.5">
                <Plus class="h-3.5 w-3.5" />
                Tambah Binding
              </span>
              <span
                v-if="activeTab === 'add'"
                class="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-blue-600"
              />
            </button>
          </div>

          <!-- Tab: Daftar Binding -->
          <div v-if="activeTab === 'bindings'" class="flex flex-1 flex-col overflow-hidden">
            <!-- Loading -->
            <div v-if="bindingsLoading" class="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
              <Loader2 class="h-4 w-4 animate-spin" />
              Memuat data binding...
            </div>

            <!-- Empty -->
            <div v-else-if="!bindings.length" class="flex flex-col items-center justify-center gap-3 py-12">
              <Link2 class="h-10 w-10 text-gray-200" />
              <p class="text-sm text-gray-400">Belum ada binding untuk SKU ini.</p>
              <button
                class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                @click="activeTab = 'add'"
              >
                <Plus class="h-4 w-4" />
                Tambah Binding
              </button>
            </div>

            <!-- Binding list -->
            <div v-else class="overflow-y-auto">
              <table class="w-full text-left text-xs">
                <thead class="sticky top-0 border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th class="whitespace-nowrap px-4 py-2.5 font-medium text-gray-500">Toko</th>
                    <th class="whitespace-nowrap px-4 py-2.5 font-medium text-gray-500">Produk MP</th>
                    <th class="whitespace-nowrap px-4 py-2.5 font-medium text-gray-500">SKU MP</th>
                    <th class="whitespace-nowrap px-4 py-2.5 font-medium text-gray-500">Status</th>
                    <th class="whitespace-nowrap px-4 py-2.5 font-medium text-gray-500" />
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="binding in bindings" :key="binding.id" class="hover:bg-gray-50/60">
                    <td class="whitespace-nowrap px-4 py-2.5 font-medium text-gray-800">
                      <div class="flex">
                        <img 
                          :src="`/images/platform/${binding.store?.source}.svg`"
                          :alt="binding.store?.source"
                          class="mr-2 h-4 w-4 object-contain"
                          @error="($event.target as HTMLImageElement).style.display='none'"
                        />
                        <span>{{ binding.store?.name || '-' }}</span>
                      </div> 
                    </td> 
                    <td class="max-w-[160px] truncate px-4 py-2.5 text-gray-700">
                      <span :title="binding.mp_product_name">{{ binding.mp_product_name || binding.mp_product_id || '-' }}</span>
                      <div class="mt-0.5 font-mono text-[10px] text-gray-400">{{ binding.mp_product_id }}</div>
                      <div v-if="binding.mp_variants.length" class="mt-1 flex flex-wrap gap-1">
                        <span
                          v-for="v in binding.mp_variants"
                          :key="v.name"
                          class="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700"
                        >{{ v.value }}</span>
                      </div>
                    </td>
                    <td class="whitespace-nowrap px-4 py-2.5">
                      <div class="font-mono text-gray-700">{{ binding.mp_sku || '-' }}</div>
                      <div class="mt-0.5 font-mono text-[10px] text-gray-400">{{ binding.mp_sku_id }}</div>
                    </td>
                    <td class="whitespace-nowrap px-4 py-2.5">
                      <span
                        class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        :class="binding.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'"
                      >
                        <span class="h-1 w-1 rounded-full" :class="binding.status === 'active' ? 'bg-green-500' : 'bg-gray-400'" />
                        {{ binding.status === 'active' ? 'Aktif' : 'Nonaktif' }}
                      </span>
                    </td>
                    <td class="whitespace-nowrap px-4 py-2.5">
                      <div class="flex items-center gap-0.5">
                        <button
                          :disabled="togglingBinding.has(binding.id)"
                          class="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                          title="Toggle Status"
                          @click="toggleBindingStatus(binding)"
                        >
                          <Loader2 v-if="togglingBinding.has(binding.id)" class="h-3.5 w-3.5 animate-spin" />
                          <ToggleRight v-else-if="binding.status === 'active'" class="h-3.5 w-3.5 text-green-500" />
                          <ToggleLeft v-else class="h-3.5 w-3.5 text-gray-400" />
                        </button>
                        <button
                          class="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Hapus Binding"
                          @click="deleteBinding(binding)"
                        >
                          <Trash2 class="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Footer: add button -->
            <div v-if="bindings.length" class="shrink-0 border-t border-gray-100 px-6 py-3 text-right">
              <button
                class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                @click="activeTab = 'add'"
              >
                <Plus class="h-4 w-4" />
                Tambah Binding
              </button>
            </div>
          </div>

          <!-- Tab: Tambah Binding -->
          <div v-else-if="activeTab === 'add'" class="flex flex-1 flex-col overflow-hidden">
            <div class="flex flex-col gap-4 overflow-y-auto p-6">
              <!-- Store selector -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Toko Marketplace</label>
                <div v-if="storesLoading" class="flex items-center gap-2 py-1 text-sm text-gray-400">
                  <Loader2 class="h-4 w-4 animate-spin" />
                  Memuat toko...
                </div>
                <div v-else class="flex flex-wrap gap-2">
                  <button
                    v-for="store in stores"
                    :key="store.id"
                    type="button"
                    class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                    :class="selectedStoreId === store.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50'"
                    @click="selectedStoreId = store.id; onStoreSelect()"
                  >
                    <img
                      :src="`/images/platform/${store.source}.svg`"
                      :alt="store.source"
                      class="h-4 w-4 object-contain"
                      @error="($event.target as HTMLImageElement).style.display='none'"
                    />
                    {{ store.shop_name }}
                  </button>
                </div>
              </div>

              <template v-if="selectedStoreId">
                <!-- Search -->
                <div class="space-y-1.5">
                  <div class="relative">
                    <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      v-model="mpSearch"
                      type="text"
                      placeholder="Cari nama produk, ID, atau SKU..."
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
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-1.5 text-[11px] text-gray-400">
                      <span>Filter otomatis:</span>
                      <button
                        type="button"
                        class="rounded bg-primary-50 px-1.5 py-0.5 font-mono font-medium text-primary-700 hover:bg-primary-100"
                        :class="mpSearch === skuCode ? 'ring-1 ring-primary-300' : ''"
                        @click="mpSearch = skuCode"
                      >{{ skuCode }}</button>
                    </div>
                    <label class="flex cursor-pointer items-center gap-1.5 text-xs text-gray-600 hover:text-gray-800">
                      <input
                        v-model="showOnlyMatchingSkus"
                        type="checkbox"
                        class="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500/20"
                      />
                      <span>Hanya SKU cocok</span>
                    </label>
                  </div>
                </div>

                <!-- Loading -->
                <div v-if="mpProductsLoading" class="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
                  <Loader2 class="h-4 w-4 animate-spin" />
                  Memuat produk...
                </div>

                <!-- Empty -->
                <div v-else-if="!mpProductsFiltered.length" class="py-8 text-center text-sm text-gray-400">
                  <template v-if="mpProductsLoadingMore">
                    <Loader2 class="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Mencari lebih banyak produk...
                  </template>
                  <template v-else-if="mpNextCursor">
                    Tidak ditemukan di halaman ini, memuat lebih...
                  </template>
                  <template v-else>
                    Tidak ada produk ditemukan.
                  </template>
                </div>

                <!-- Product list -->
                <div v-else class="space-y-2">
                  <div
                    v-for="mpProd in mpProductsFiltered"
                    :key="mpProd.id"
                    class="rounded-lg border transition-colors"
                    :class="expandedMpProductId === mpProd.id ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-white hover:border-blue-200'"
                  >
                    <button
                      type="button"
                      class="flex w-full items-center gap-3 px-4 py-3 text-left"
                      @click="toggleMpProduct(mpProd.id)"
                    >
                      <div class="h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-100">
                        <img
                          v-if="mpProd.thumbnail"
                          :src="mpProd.thumbnail"
                          alt=""
                          class="h-full w-full object-cover"
                          @error="($event.target as HTMLImageElement).style.display='none'"
                        />
                        <ImageIcon v-else class="mx-auto mt-2.5 h-5 w-5 text-gray-300" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-gray-900">{{ mpProd.name }}</p>
                        <p class="mt-0.5 text-xs text-gray-500">
                          {{ mpProd.skus?.length || 0 }} SKU &middot; ID: {{ mpProd.id }}
                          <span
                            v-if="skuMatchesSearch(mpProd)"
                            class="ml-1.5 inline-flex items-center rounded-full bg-yellow-100 px-1.5 py-0.5 text-[9px] font-semibold text-yellow-800"
                          >SKU cocok</span>
                        </p>
                      </div>
                      <span class="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-500">
                        {{ mpProd.status }}
                      </span>
                      <ChevronDown
                        class="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150"
                        :class="expandedMpProductId === mpProd.id ? 'rotate-180' : ''"
                      />
                    </button>

                    <!-- SKU list -->
                    <div v-if="expandedMpProductId === mpProd.id" class="border-t border-blue-100 bg-white">
                      <div v-if="mpProductDetailLoading.has(mpProd.id)" class="flex items-center justify-center gap-2 py-4 text-sm text-gray-400">
                        <Loader2 class="h-3.5 w-3.5 animate-spin" />
                        Memuat SKU...
                      </div>
                      <template v-else>
                        <div v-if="!mpProductDetails[mpProd.id]?.skus?.length" class="px-4 py-3 text-sm text-gray-400">Tidak ada SKU.</div>
                        <div v-else-if="!getFilteredSkus(mpProd.id).length" class="px-4 py-3 text-sm text-gray-400">
                          Tidak ada SKU yang cocok dengan pencarian.
                        </div>
                        <div v-else class="divide-y divide-gray-100">
                          <div
                            v-for="mpSku in getFilteredSkus(mpProd.id)"
                            :key="mpSku.id"
                            class="relative flex items-center gap-3 px-4 py-2.5"
                          >
                            <div class="min-w-0 flex-1">
                              <!-- eslint-disable-next-line vue/no-v-html -->
                              <span class="font-mono text-xs text-gray-700" v-html="highlightText(mpSku.sku || mpSku.id, mpSearch)" />
                            </div>
                            <div class="min-w-0 flex-1">
                              <div v-if="mpSku.variants.length" class="mt-1 flex flex-wrap gap-1">
                                <span
                                  v-for="v in mpSku.variants"
                                  :key="v.name"
                                  class="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700"
                                >{{ v.value }}</span>
                              </div>
                            </div>
                            <span class="shrink-0 text-xs text-gray-500">Stok: {{ mpSku.stock }}</span>
                            <!-- Already bound indicator -->
                            <div v-if="mpSku.binding" class="relative shrink-0">
                              <button
                                type="button"
                                class="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                                @mousedown.stop
                                @click.stop="openTooltip(mpSku.id)"
                              >
                                <CheckCircle2 class="h-3 w-3" />
                                Terikat
                              </button>

                              <!-- Tooltip panel -->
                              <div
                                v-if="tooltipSkuId === mpSku.id"
                                class="absolute bottom-full right-0 z-100 mb-2 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
                                @mousedown.stop
                                @click.stop
                              >
                                <p class="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Detail Binding</p>
                                <div class="space-y-1.5 text-xs">
                                  <!-- Internal SKU -->
                                  <div class="flex gap-2">
                                    <span class="w-20 shrink-0 text-gray-400">Produk</span>
                                    <span class="font-medium text-gray-800">{{ mpSku.binding.product_name }}</span>
                                  </div>
                                  <div class="flex gap-2">
                                    <span class="w-20 shrink-0 text-gray-400">SKU Internal</span>
                                    <span class="font-mono font-medium text-gray-800">{{ mpSku.binding.sku }}</span>
                                  </div>
                                  <div v-if="mpSku.binding.variants.length" class="flex gap-2">
                                    <span class="w-20 shrink-0 text-gray-400">Varian</span>
                                    <span class="flex flex-wrap gap-1">
                                      <span
                                        v-for="v in mpSku.binding.variants"
                                        :key="v.name"
                                        class="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700"
                                      >{{ v.value }}</span>
                                    </span>
                                  </div>
                                  <!-- Divider -->
                                  <div class="border-t border-gray-100 pt-1.5">
                                    <div class="flex gap-2">
                                      <span class="w-20 shrink-0 text-gray-400">Toko</span>
                                      <span class="font-medium text-gray-800">{{ mpSku.binding.store?.name }}</span>
                                    </div>
                                    <div class="mt-1 flex gap-2">
                                      <span class="w-20 shrink-0 text-gray-400">Produk MP</span>
                                      <span class="line-clamp-2 text-gray-700">{{ mpSku.binding.mp_product_name }}</span>
                                    </div>
                                    <div class="mt-1 flex gap-2">
                                      <span class="w-20 shrink-0 text-gray-400">SKU MP</span>
                                      <span class="font-mono font-medium text-gray-800">{{ mpSku.binding.mp_sku }}</span>
                                    </div>
                                    <div v-if="mpSku.binding.mp_variants.length" class="mt-1 flex gap-2">
                                      <span class="w-20 shrink-0 text-gray-400">Varian MP</span>
                                      <span class="flex flex-wrap gap-1">
                                        <span
                                          v-for="v in mpSku.binding.mp_variants"
                                          :key="v.name"
                                          class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"
                                        >{{ v.value }}</span>
                                      </span>
                                    </div>
                                  </div>
                                  <!-- Status -->
                                  <div class="border-t border-gray-100 pt-1.5">
                                    <span
                                      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                                      :class="mpSku.binding.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'"
                                    >
                                      <span class="h-1 w-1 rounded-full" :class="mpSku.binding.status === 'active' ? 'bg-green-500' : 'bg-gray-400'" />
                                      {{ mpSku.binding.status === 'active' ? 'Aktif' : 'Nonaktif' }}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <!-- Tambah button (unbound) -->
                            <button
                              v-else
                              type="button"
                              :disabled="submittingSkuId === mpSku.id"
                              class="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                              @click="submitBinding(mpProd, mpSku)"
                            >
                              <Loader2 v-if="submittingSkuId === mpSku.id" class="h-3 w-3 animate-spin" />
                              <Plus v-else class="h-3 w-3" />
                              Tambah
                            </button>
                          </div>
                        </div>
                      </template>
                    </div>
                  </div>

                  <!-- Infinite scroll sentinel -->
                  <div ref="sentinelEl" class="flex items-center justify-center py-3">
                    <template v-if="mpProductsLoadingMore">
                      <Loader2 class="h-4 w-4 animate-spin text-gray-400" />
                    </template>
                    <template v-else-if="!mpNextCursor && mpProducts.length">
                      <span class="text-xs text-gray-300">Semua produk telah dimuat</span>
                    </template>
                  </div>
                </div>
              </template>
            </div>

            <!-- Footer -->
            <div class="shrink-0 border-t border-gray-100 px-6 py-4 text-right">
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                @click="activeTab = 'bindings'"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
