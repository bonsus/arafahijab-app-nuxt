<script setup lang="ts">
import {
  ArrowLeft, Pencil, Trash2, CheckCircle, XCircle,
  FileText, Package, MapPin, Clock, Link2,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Variant { name: string; value: string }

interface OpnameItem {
  id: string
  warehouse_bin_id: string
  product_id: string
  sku_id: string
  sku: string
  name: string
  variants: Variant[]
  stock_system: number
  stock_counted: number
  stock_change: number
  price: string
  total: string
  bin: { id: string; code: string } | null
  rack: { id: string; code: string } | null
  zone: { id: string; code: string } | null
  created_at: string
}

interface OpnameLog {
  id: string
  user_id: string
  name: string
  action: string
  note: string
  created_at: string
}

interface StockOpname {
  id: string
  no: string
  date: string
  note: string
  status: string
  total: string
  warehouse_id: string
  stock_adjustment_id: string | null
  warehouse: { id: string; name: string } | null
  items: OpnameItem[]
  logs: OpnameLog[]
  created_at: string
  updated_at: string
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const router = useRouter()
const route = useRoute()

const opnameId = computed(() => route.params.id as string)

const loading = ref(true)
const opname = ref<StockOpname | null>(null)
const updatingStatus = ref(false)

const ITEMS_PREVIEW = 5
const showAllItems = ref(false)
const displayedItems = computed(() => {
  if (!opname.value?.items) return []
  return showAllItems.value ? opname.value.items : opname.value.items.slice(0, ITEMS_PREVIEW)
})

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  draft: { label: 'Draft', icon: FileText, color: 'text-yellow-700 bg-yellow-50 ring-yellow-200' },
  completed: { label: 'Selesai', icon: CheckCircle, color: 'text-green-700 bg-green-50 ring-green-200' },
  cancelled: { label: 'Dibatalkan', icon: XCircle, color: 'text-red-700 bg-red-50 ring-red-200' },
}

async function fetchOpname() {
  loading.value = true
  try {
    const res = await api.get<{ data: StockOpname }>(`/inventories/stock-opnames/${opnameId.value}`)
    opname.value = res.data
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data')
    router.push('/inventory/opname')
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

async function handleComplete() {
  if (!opname.value) return
  const ok = await confirm({
    title: 'Selesaikan Stock Opname',
    message: `Selesaikan "${opname.value.no}"? Sistem akan membuat penyesuaian stok otomatis untuk item yang memiliki selisih.`,
    confirmText: 'Selesaikan',
    variant: 'info',
  })
  if (!ok) return

  updatingStatus.value = true
  try {
    const payload = {
      warehouse_id: opname.value.warehouse_id,
      no: opname.value.no,
      note: opname.value.note,
      status: 'completed',
      items: opname.value.items.map(item => ({
        warehouse_bin_id: item.warehouse_bin_id,
        product_id: item.product_id,
        sku_id: item.sku_id,
        sku: item.sku,
        name: item.name,
        variants: item.variants,
        stock_system: item.stock_system,
        stock_counted: item.stock_counted,
        price: item.price,
      })),
    }
    await api.put(`/inventories/stock-opnames/${opnameId.value}`, payload)
    toast.success('Stock opname berhasil diselesaikan')
    await fetchOpname()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menyelesaikan opname')
  }
  finally {
    updatingStatus.value = false
  }
}

async function handleDelete() {
  const ok = await confirm({
    title: 'Hapus Stock Opname',
    message: `Hapus "${opname.value?.no}"? Tindakan ini tidak dapat dipulihkan.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/inventories/stock-opnames/${opnameId.value}`)
    toast.success('Stock opname berhasil dihapus')
    router.push('/inventory/opname')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus')
  }
}

onMounted(fetchOpname)
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-wrap items-center gap-3">
      <NuxtLink
        to="/inventory/opname"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <h1 class="flex-1 text-xl font-bold text-gray-900 sm:text-2xl">
        {{ loading ? 'Memuat...' : opname?.no }}
      </h1>
      <template v-if="opname && opname.status === 'draft'">
        <NuxtLink
          :to="`/inventory/opname/create?edit=${opname.id}`"
          class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Pencil class="h-4 w-4" />
          Edit
        </NuxtLink>
        <button
          :disabled="updatingStatus"
          class="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-60"
          @click="handleComplete"
        >
          <CheckCircle class="h-4 w-4" />
          Selesaikan
        </button>
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
        <div v-for="i in 6" :key="i" class="space-y-1.5">
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

    <template v-else-if="opname">
      <div class="grid gap-5 lg:grid-cols-4">
        <!-- Info card -->
        <div class="lg:col-span-1">
          <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200 space-y-4">
            <h2 class="text-sm font-semibold text-gray-900">Informasi Dokumen</h2>

            <div>
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Nomor</p>
              <p class="mt-0.5 font-mono font-semibold text-gray-900">{{ opname.no }}</p>
            </div>

            <div>
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Status</p>
              <span
                class="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1"
                :class="statusConfig[opname.status]?.color || 'text-gray-600 bg-gray-50 ring-gray-200'"
              >
                <component :is="statusConfig[opname.status]?.icon" class="h-3 w-3" />
                {{ statusConfig[opname.status]?.label || opname.status }}
              </span>
            </div>

            <div>
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Tanggal</p>
              <p class="mt-0.5 text-sm text-gray-800">{{ formatDate(opname.date) }}</p>
            </div>

            <div>
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Gudang</p>
              <p class="mt-0.5 flex items-center gap-1 text-sm font-medium text-gray-800">
                <MapPin class="h-3 w-3 text-gray-400" />
                {{ opname.warehouse?.name || '-' }}
              </p>
            </div>

            <div v-if="opname.note">
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Catatan</p>
              <p class="mt-0.5 text-sm text-gray-600">{{ opname.note }}</p>
            </div>

            <div v-if="opname.stock_adjustment_id">
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Penyesuaian Stok</p>
              <NuxtLink
                :to="`/inventory/adjustment/${opname.stock_adjustment_id}`"
                class="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 transition-colors"
              >
                <Link2 class="h-3 w-3" />
                Lihat Penyesuaian
              </NuxtLink>
            </div>

            <div>
              <p class="text-[10px] uppercase tracking-wide text-gray-400">Dibuat</p>
              <p class="mt-0.5 text-xs text-gray-500">{{ formatDateTime(opname.created_at) }}</p>
            </div>
          </div>
        </div>

        <!-- Right col -->
        <div class="lg:col-span-3 space-y-4">
          <!-- Items table -->
          <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
            <div class="border-b border-gray-200 px-5 py-3.5">
              <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Package class="h-4 w-4 text-gray-400" />
                Item Opname
                <span class="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                  {{ opname.items?.length || 0 }}
                </span>
              </h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[700px] text-sm">
                <thead>
                  <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th class="px-4 py-2.5 text-left">Produk</th>
                    <th class="px-4 py-2.5 text-left">Lokasi</th>
                    <th class="px-4 py-2.5 text-right">Stok Sistem</th>
                    <th class="px-4 py-2.5 text-right">Stok Fisik</th>
                    <th class="px-4 py-2.5 text-right">Selisih</th>
                    <th class="px-4 py-2.5 text-right">Harga</th>
                    <th class="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody v-if="!opname.items?.length">
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
                        {{ item.zone.code }}
                      </span>
                      <span v-if="item.rack?.code" class="rounded bg-gray-100 mx-0.5 px-1 py-0.5 text-xs font-medium text-gray-700">
                        {{ item.rack.code }}
                      </span>
                      <span v-if="item.bin?.code" class="rounded bg-gray-100 mx-0.5 px-1 py-0.5 text-xs font-medium text-gray-700">
                        {{ item.bin.code }}
                      </span>
                      <span v-else class="text-xs text-gray-400">-</span>
                    </td>
                    <td class="px-4 py-3 text-right text-gray-600">
                      {{ item.stock_system.toLocaleString('id-ID') }}
                    </td>
                    <td class="px-4 py-3 text-right font-semibold text-gray-900">
                      {{ item.stock_counted.toLocaleString('id-ID') }}
                    </td>
                    <td class="px-4 py-3 text-right">
                      <span
                        class="font-semibold"
                        :class="item.stock_change > 0 ? 'text-green-700' : item.stock_change < 0 ? 'text-red-600' : 'text-gray-400'"
                      >
                        {{ item.stock_change > 0 ? '+' : '' }}{{ item.stock_change.toLocaleString('id-ID') }}
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
                <tfoot v-if="opname.items?.length">
                  <tr v-if="!showAllItems && opname.items.length > ITEMS_PREVIEW" class="border-t border-gray-100">
                    <td colspan="7" class="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        class="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                        @click="showAllItems = true"
                      >
                        Lihat selengkapnya ({{ opname.items.length - ITEMS_PREVIEW }} item lainnya)
                      </button>
                    </td>
                  </tr>
                  <tr v-else-if="showAllItems && opname.items.length > ITEMS_PREVIEW" class="border-t border-gray-100">
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
                  <tr class="border-t border-gray-200 bg-gray-50">
                    <td colspan="6" class="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Total Nilai Selisih
                    </td>
                    <td class="px-4 py-2.5 text-right font-bold text-gray-900">
                      Rp{{ formatCurrency(opname.total) }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- Stock Movements (via linked adjustment) -->
          <AppStockMovements v-if="opname.stock_adjustment_id" :reference-id="opname.stock_adjustment_id" />

          <!-- Log -->
          <div v-if="opname.logs?.length" class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
            <div class="border-b border-gray-200 px-5 py-3.5">
              <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Clock class="h-4 w-4 text-gray-400" />
                Riwayat Aktivitas
              </h2>
            </div>
            <div class="divide-y divide-gray-100">
              <div
                v-for="log in opname.logs"
                :key="log.id"
                class="flex items-start gap-3 px-5 py-3"
              >
                <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
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
