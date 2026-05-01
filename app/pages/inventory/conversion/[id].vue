<script setup lang="ts">
import {
  ArrowLeft, Pencil, Trash2, CheckCircle, FileText,
  Package, Clock, ArrowLeftRight, Layers, MapPin,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Variant { name: string; value: string }

interface ConvItemFrom {
  id: string
  stock_conversion_item_to_id: string
  product_id: string
  sku_id: string
  sku: string
  name: string
  variants: Variant[]
  qty: number
  price: string
  total: string
  created_at: string
}

interface ConvItemTo {
  id: string
  stock_conversion_id: string
  product_id: string
  sku_id: string
  sku: string
  name: string
  variants: Variant[]
  qty: number
  price: string
  total: string
  item_froms: ConvItemFrom[]
  created_at: string
}

interface StockConversion {
  id: string
  business_id: string
  warehouse_id: string
  no: string
  date: string
  note: string
  status: string
  total: string
  warehouse: { id: string; name: string } | null
  item_froms: ConvItemFrom[]
  item_tos: ConvItemTo[]
  created_at: string
  updated_at: string
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const router = useRouter()
const route = useRoute()

const convId = computed(() => route.params.id as string)

const loading = ref(true)
const conv = ref<StockConversion | null>(null)

const ITEMS_PREVIEW = 5
const showAllItems = ref(false)
const displayedItems = computed(() => {
  if (!conv.value?.item_tos) return []
  return showAllItems.value ? conv.value.item_tos : conv.value.item_tos.slice(0, ITEMS_PREVIEW)
})

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  draft: { label: 'Draft', icon: FileText, color: 'text-yellow-700 bg-yellow-50 ring-yellow-200' },
  completed: { label: 'Selesai', icon: CheckCircle, color: 'text-green-700 bg-green-50 ring-green-200' },
}

async function fetchConv() {
  loading.value = true
  try {
    const res = await api.get<{ data: StockConversion }>(`/inventories/conversions/${convId.value}`)
    conv.value = res.data
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data')
    router.push('/inventory/conversion')
  }
  finally {
    loading.value = false
  }
}

async function handleDelete() {
  if (!conv.value) return
  const isCompleted = conv.value.status === 'completed'
  const ok = await confirm({
    title: 'Hapus Konversi Stok',
    message: isCompleted
      ? `Hapus "${conv.value.no}"? Konversi ini sudah selesai — stok akan di-rollback otomatis.`
      : `Hapus "${conv.value.no}"? Tindakan ini tidak dapat dipulihkan.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/inventories/conversions/${convId.value}`)
    toast.success('Konversi stok berhasil dihapus')
    router.push('/inventory/conversion')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus')
  }
}

onMounted(fetchConv)
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-wrap items-center gap-3">
      <NuxtLink
        to="/inventory/conversion"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <h1 class="flex-1 text-xl font-bold text-gray-900 sm:text-2xl">
        {{ loading ? 'Memuat...' : conv?.no }}
      </h1>
      <template v-if="conv">
        <NuxtLink
          v-if="conv.status === 'draft'"
          :to="`/inventory/conversion/create?edit=${conv.id}`"
          class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Pencil class="h-4 w-4" />
          Edit
        </NuxtLink>
        <button
          class="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors"
          @click="handleDelete"
        >
          <Trash2 class="h-4 w-4" />
          Hapus
        </button>
      </template>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid gap-5 lg:grid-cols-4">
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200 lg:col-span-1 space-y-4">
        <div v-for="i in 5" :key="i" class="space-y-1.5">
          <div class="h-3 w-16 animate-pulse rounded bg-gray-200" />
          <div class="h-5 w-28 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
      <div class="lg:col-span-3 space-y-4">
        <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
          <div class="h-4 w-20 animate-pulse rounded bg-gray-200" />
          <div class="mt-4 space-y-3">
            <div v-for="i in 4" :key="i" class="h-16 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </div>

    <template v-else-if="conv">
      <div class="grid gap-5 lg:grid-cols-4">
        <!-- Info card -->
        <div class="lg:col-span-1">
          <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200 space-y-4">
            <h2 class="text-sm font-semibold text-gray-900">Informasi Dokumen</h2>

            <div>
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Nomor</p>
              <p class="mt-0.5 font-mono font-semibold text-gray-900">{{ conv.no }}</p>
            </div>

            <div>
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Status</p>
              <span
                class="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1"
                :class="statusConfig[conv.status]?.color || 'text-gray-600 bg-gray-50 ring-gray-200'"
              >
                <component :is="statusConfig[conv.status]?.icon" class="h-3 w-3" />
                {{ statusConfig[conv.status]?.label || conv.status }}
              </span>
            </div>

            <div>
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Tanggal</p>
              <p class="mt-0.5 text-sm text-gray-800">{{ formatDate(conv.date) }}</p>
            </div>

            <div>
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Gudang</p>
              <p class="mt-0.5 flex items-center gap-1 text-sm font-medium text-gray-800">
                <MapPin class="h-3 w-3 text-gray-400" />
                {{ conv.warehouse?.name || '-' }}
              </p>
            </div>

            <div v-if="conv.note">
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Catatan</p>
              <p class="mt-0.5 text-sm text-gray-600">{{ conv.note }}</p>
            </div>

            <div>
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Total Nilai</p>
              <p class="mt-0.5 text-sm font-bold text-gray-900">Rp{{ formatCurrency(conv.total) }}</p>
            </div>

            <div>
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Dibuat</p>
              <p class="mt-0.5 text-xs text-gray-500">{{ formatDateTime(conv.created_at) }}</p>
            </div>
          </div>
        </div>

        <!-- Right col -->
        <div class="lg:col-span-3 space-y-4">
          <!-- Items table -->
          <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
            <div class="border-b border-gray-200 px-5 py-3.5">
              <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ArrowLeftRight class="h-4 w-4 text-gray-400" />
                Item Konversi
                <span class="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                  {{ conv.item_tos?.length || 0 }}
                </span>
              </h2>
            </div>

            <!-- Empty state -->
            <div v-if="!conv.item_tos?.length" class="px-5 py-10 text-center">
              <p class="text-sm text-gray-400">Tidak ada item konversi</p>
            </div>

            <!-- Conversion item cards -->
            <div v-else class="divide-y divide-gray-100">
              <div
                v-for="(itemTo, idx) in displayedItems"
                :key="itemTo.id"
                class="p-5"
              >
                <!-- Item header: number + to sku -->
                <div class="flex items-start gap-3 mb-3">
                  <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                    {{ idx + 1 }}
                  </span>
                  <div class="grid flex-1 gap-0 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                    <!-- Froms -->
                    <div class="pb-3 sm:pb-0 sm:pr-4">
                      <div class="flex items-center gap-1.5 mb-2">
                        <div class="flex h-4 w-4 items-center justify-center rounded bg-red-100">
                          <Package class="h-2.5 w-2.5 text-red-600" />
                        </div>
                        <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500">SKU Sumber</p>
                      </div>
                      <div class="space-y-2">
                        <div
                          v-for="from in itemTo.item_froms"
                          :key="from.id"
                          class="rounded-lg bg-red-50 px-3 py-2"
                        >
                          <p class="text-xs font-medium text-gray-800 leading-tight">{{ from.name }}</p>
                          <div class="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span class="font-mono text-[10px] font-semibold text-gray-600">{{ from.sku }}</span>
                            <span v-for="v in from.variants" :key="v.name" class="rounded bg-white/60 px-1 py-0.5 text-[10px]">{{ v.value }}</span>
                          </div>
                          <div class="mt-1.5 flex items-center gap-3 text-xs">
                            <span class="text-gray-500">Qty: <strong class="text-red-700">{{ from.qty.toLocaleString('id-ID') }}</strong></span>
                            <span v-if="conv.status === 'completed'" class="text-gray-400">
                              Rp{{ formatCurrency(from.price) }}/unit
                            </span>
                            <span v-if="conv.status === 'completed'" class="font-semibold text-red-700">
                              Rp{{ formatCurrency(from.total) }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- To -->
                    <div class="pt-3 sm:pt-0 sm:pl-4">
                      <div class="flex items-center gap-1.5 mb-2">
                        <div class="flex h-4 w-4 items-center justify-center rounded bg-green-100">
                          <Layers class="h-2.5 w-2.5 text-green-600" />
                        </div>
                        <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500">SKU Hasil</p>
                      </div>
                      <div class="rounded-lg bg-green-50 px-3 py-2">
                        <p class="text-xs font-medium text-gray-800 leading-tight">{{ itemTo.name }}</p>
                        <div class="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span class="font-mono text-[10px] font-semibold text-gray-600">{{ itemTo.sku }}</span>
                          <span v-for="v in itemTo.variants" :key="v.name" class="rounded bg-white/60 px-1 py-0.5 text-[10px]">{{ v.value }}</span>
                        </div>
                        <div class="mt-1.5 flex items-center gap-3 text-xs">
                          <span class="text-gray-500">Qty: <strong class="text-green-700">{{ itemTo.qty.toLocaleString('id-ID') }}</strong></span>
                          <span v-if="conv.status === 'completed'" class="text-gray-400">
                            Rp{{ formatCurrency(itemTo.price) }}/unit
                          </span>
                          <span v-if="conv.status === 'completed'" class="font-semibold text-green-700">
                            Rp{{ formatCurrency(itemTo.total) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Show more / Total -->
            <div v-if="conv.item_tos?.length" class="border-t border-gray-100">
              <div v-if="!showAllItems && conv.item_tos.length > ITEMS_PREVIEW" class="text-center px-4 py-2.5">
                <button
                  type="button"
                  class="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                  @click="showAllItems = true"
                >
                  Lihat selengkapnya ({{ conv.item_tos.length - ITEMS_PREVIEW }} item lainnya)
                </button>
              </div>
              <div v-else-if="showAllItems && conv.item_tos.length > ITEMS_PREVIEW" class="text-center px-4 py-2.5">
                <button
                  type="button"
                  class="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  @click="showAllItems = false"
                >
                  Sembunyikan
                </button>
              </div>
              <div class="flex items-center justify-end gap-4 border-t border-gray-200 bg-gray-50 px-5 py-2.5">
                <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Nilai</span>
                <span class="font-bold text-gray-900">Rp{{ formatCurrency(conv.total) }}</span>
              </div>
            </div>
          </div>

          <!-- Stock Movements -->
          <AppStockMovements :reference-id="convId+'-'" />

          <!-- Last updated -->
          <div class="flex items-center gap-1.5 justify-end text-xs text-gray-400">
            <Clock class="h-3.5 w-3.5" />
            Diperbarui {{ formatDateTime(conv.updated_at) }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
