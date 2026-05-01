<script setup lang="ts">
import {
  ArrowLeft, Pencil, Trash2, CheckCircle, XCircle,
  FileText, Package, MapPin, Clock,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Variant { name: string; value: string }

interface AdjItem {
  id: string
  warehouse_bin_id: string
  product_id: string
  sku_id: string
  sku: string
  name: string
  variants: Variant[]
  stock_before: number
  stock_after: number
  stock_change: number
  price: string
  total: string
  bin: { id: string; code: string } | null
  rack: { id: string; code: string } | null
  zone: { id: string; code: string } | null
  created_at: string
}

interface AdjLog {
  id: string
  user_id: string
  name: string
  action: string
  note: string
  created_at: string
}

interface StockAdjustment {
  id: string
  no: string
  date: string
  note: string
  status: string
  total: string
  warehouse_id: string
  warehouse: { id: string; name: string } | null
  items: AdjItem[]
  logs: AdjLog[]
  created_at: string
  updated_at: string
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const router = useRouter()
const route = useRoute()

const adjId = computed(() => route.params.id as string)

const loading = ref(true)
const adj = ref<StockAdjustment | null>(null)
const updatingStatus = ref(false)

const ITEMS_PREVIEW = 5
const showAllItems = ref(false)
const displayedItems = computed(() => {
  if (!adj.value?.items) return []
  return showAllItems.value ? adj.value.items : adj.value.items.slice(0, ITEMS_PREVIEW)
})

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  draft: { label: 'Draft', icon: FileText, color: 'text-yellow-700 bg-yellow-50 ring-yellow-200' },
  completed: { label: 'Selesai', icon: CheckCircle, color: 'text-green-700 bg-green-50 ring-green-200' },
  cancelled: { label: 'Dibatalkan', icon: XCircle, color: 'text-red-700 bg-red-50 ring-red-200' },
}

async function fetchAdj() {
  loading.value = true
  try {
    const res = await api.get<{ data: StockAdjustment }>(`/inventories/stock-adjustments/${adjId.value}`)
    adj.value = res.data
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data')
    router.push('/inventory/adjustment')
  }
  finally {
    loading.value = false
  }
}

function formatLogAction(action: string): string {
  const map: Record<string, string> = {
    created: 'Dibuat',
    updated: 'Diperbarui',
    completed: 'Diselesaikan',
    cancelled: 'Dibatalkan',
  }
  return map[action] || action
}

async function handleDelete() {
  const ok = await confirm({
    title: 'Hapus Penyesuaian Stok',
    message: `Hapus "${adj.value?.no}"? Tindakan ini tidak dapat dipulihkan.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/inventories/stock-adjustments/${adjId.value}`)
    toast.success('Penyesuaian stok berhasil dihapus')
    router.push('/inventory/adjustment')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus')
  }
}

onMounted(fetchAdj)
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-wrap items-center gap-3">
      <NuxtLink
        to="/inventory/adjustment"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <h1 class="flex-1 text-xl font-bold text-gray-900 sm:text-2xl">
        {{ loading ? 'Memuat...' : adj?.no }}
      </h1>
      <template v-if="adj && adj.status === 'draft'">
        <NuxtLink
          :to="`/inventory/adjustment/create?edit=${adj.id}`"
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
            <div v-for="i in 4" :key="i" class="h-10 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </div>

    <template v-else-if="adj">
      <div class="grid gap-5 lg:grid-cols-4">
        <!-- Info card -->
        <div class="lg:col-span-1">
          <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200 space-y-4">
            <h2 class="text-sm font-semibold text-gray-900">Informasi Dokumen</h2>

            <div>
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Nomor</p>
              <p class="mt-0.5 font-mono font-semibold text-gray-900">{{ adj.no }}</p>
            </div>

            <div>
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Status</p>
              <span
                class="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1"
                :class="statusConfig[adj.status]?.color || 'text-gray-600 bg-gray-50 ring-gray-200'"
              >
                <component :is="statusConfig[adj.status]?.icon" class="h-3 w-3" />
                {{ statusConfig[adj.status]?.label || adj.status }}
              </span>
            </div>

            <div>
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Tanggal</p>
              <p class="mt-0.5 text-sm text-gray-800">{{ formatDate(adj.date) }}</p>
            </div>

            <div>
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Gudang</p>
              <p class="mt-0.5 flex items-center gap-1 text-sm font-medium text-gray-800">
                <MapPin class="h-3 w-3 text-gray-400" />
                {{ adj.warehouse?.name || '-' }}
              </p>
            </div>

            <div v-if="adj.note">
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Catatan</p>
              <p class="mt-0.5 text-sm text-gray-600">{{ adj.note }}</p>
            </div>

            <div>
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Dibuat</p>
              <p class="mt-0.5 text-xs text-gray-500">{{ formatDateTime(adj.created_at) }}</p>
            </div>
          </div>
        </div>

        <!-- Right col -->
        <div class="lg:col-span-3 space-y-4">
          <!-- Items table -->
          <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
            <div class="border-b border-gray-200 px-5 py-3.5">
              <h2 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Package class="h-4 w-4 text-gray-400" />
                Item Penyesuaian
                <span class="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                  {{ adj.items?.length || 0 }}
                </span>
              </h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[640px] text-sm">
                <thead>
                  <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th class="px-4 py-2.5 text-left">Produk</th>
                    <th class="px-4 py-2.5 text-left">Lokasi</th>
                    <th class="px-4 py-2.5 text-right">Stok Awal</th>
                    <th class="px-4 py-2.5 text-right">Stok Akhir</th>
                    <th class="px-4 py-2.5 text-right">Perubahan</th>
                    <th class="px-4 py-2.5 text-right">Harga</th>
                    <th class="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody v-if="!adj.items?.length">
                  <tr>
                    <td colspan="7" class="px-4 py-10 text-center text-sm text-gray-400">
                      Tidak ada item
                    </td>
                  </tr>
                </tbody>
                <tbody v-else>
                  <tr
                    v-for="item in displayedItems"
                    :key="item.id"
                    class="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors"
                  > 
                    <td class="px-4 py-3">
                      <p class="text-sm font-medium text-gray-800">{{ item.name }}</p>
                      <div class="flex flex-wrap items-center gap-1.5 text-xs"> 
                        <span class="text-gray-500">{{ item.sku }}</span>
                        <span v-for="v in item.variants" :key="v.name" class="rounded bg-gray-100 px-1 py-0.5">
                          {{ v.value }}
                        </span>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <span v-if="item.zone?.code" class="rounded bg-gray-100 mx-0.5 px-1 py-0.5 text-xs font-medium text-gray-700">
                        {{ item.zone?.code }}
                      </span>
                      <span v-if="item.rack?.code" class="rounded bg-gray-100 mx-0.5 px-1 py-0.5 text-xs font-medium text-gray-700">
                        {{ item.rack?.code }}
                      </span>  
                      <span v-if="item.bin?.code" class="rounded bg-gray-100 mx-0.5 px-1 py-0.5 text-xs font-medium text-gray-700">
                        {{ item.bin.code }}
                      </span>
                      <span v-else class="text-xs text-gray-400">-</span>
                    </td>
                    <td class="px-4 py-3 text-right text-gray-600">{{ formatCurrency(item.stock_before) }}</td>
                    <td class="px-4 py-3 text-right font-semibold text-gray-900">{{ formatCurrency(item.stock_after) }}</td>
                    <td class="px-4 py-3 text-right">
                      <span
                        class="font-semibold"
                        :class="item.stock_change > 0 ? 'text-green-700' : item.stock_change < 0 ? 'text-red-600' : 'text-gray-400'"
                      >
                        {{ item.stock_change > 0 ? '+' : '' }}{{ formatCurrency(item.stock_change) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right whitespace-nowrap text-gray-700">
                      Rp{{ formatCurrency(item.price) }}
                    </td>
                    <td class="px-4 py-3 text-right whitespace-nowrap font-semibold text-gray-900">
                      Rp{{ formatCurrency(item.total) }}
                    </td>
                  </tr>
                </tbody>
                <tfoot v-if="adj.items?.length">
                  <tr v-if="!showAllItems && adj.items.length > ITEMS_PREVIEW" class="border-t border-gray-100 text-nowrap">
                    <td colspan="7" class="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        class="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                        @click="showAllItems = true"
                      >
                        Lihat selengkapnya ({{ adj.items.length - ITEMS_PREVIEW }} item lainnya)
                      </button>
                    </td>
                  </tr>
                  <tr v-else-if="showAllItems && adj.items.length > ITEMS_PREVIEW" class="border-t border-gray-100">
                    <td colspan="7" class="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        class="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                        @click="showAllItems = false"
                      >
                        Sembunyikan
                      </button>
                    </td>
                  </tr>
                  <tr class="border-t border-gray-200 bg-gray-50 text-nowrap">
                    <td colspan="6" class="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Total Nilai
                    </td>
                    <td class="px-4 py-2.5 text-right font-bold text-gray-900">
                      Rp{{ formatCurrency(adj.total) }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- Stock Movements -->
          <AppStockMovements :reference-id="adjId" />
          <!-- Log -->
          <div v-if="adj.logs?.length" class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
            <div class="border-b border-gray-200 px-5 py-3.5">
              <h2 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Clock class="h-4 w-4 text-gray-400" />
                Riwayat Aktivitas
              </h2>
            </div>
            <div class="divide-y divide-gray-100">
              <div
                v-for="log in adj.logs"
                :key="log.id"
                class="flex items-start gap-3 px-5 py-3"
              >
                <div class="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-gray-100 flex items-center justify-center">
                  <Clock class="h-3 w-3 text-gray-400" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs text-gray-900">
                    <span class="font-medium">{{ log.name }}</span>
                    <span class="text-gray-500"> — {{ formatLogAction(log.action) }}</span>
                  </p>
                  <p v-if="log.note" class="text-xs text-gray-500">{{ log.note }}</p>
                  <p class="text-xs text-gray-400">{{ formatDateTime(log.created_at) }}</p>
                </div> 
              </div>
            </div>
          </div>

        </div>
      </div>
    </template>
  </div>
</template>
