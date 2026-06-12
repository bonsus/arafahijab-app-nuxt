<script setup lang="ts">
import {
  ArrowLeft, Pencil, Trash2, CheckCircle, FileText, XCircle,
  Package, MapPin, Truck, Clock,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Variant { name: string; value: string }

interface UsageItem {
  id: string
  warehouse_bin_id: string
  product_id: string
  sku_id: string
  sku: string
  name: string
  variants: Variant[]
  qty: number
  price: string
  total: string
  bin: { id: string; code: string } | null
  rack: { id: string; code: string } | null
  zone: { id: string; code: string } | null
}

interface UsageLog {
  id: string
  user_id: string
  name: string
  action: string
  note: string
  created_at: string
}

interface UsageAddress {
  id: string
  name: string
  phone: string
  country: string
  province: string
  city: string
  district: string
  address: string
  zipcode: string
}

interface UsageShipment {
  id: string
  courier_code: string
  courier_name: string
  service_code: string
  service_name: string
  tracking_no: string
  note: string
}

interface StockUsage {
  id: string
  no: string
  date: string
  type: string
  note: string
  status: string
  total: string
  warehouse_id: string
  warehouse: { id: string; name: string } | null
  address: UsageAddress | null
  shipment: UsageShipment | null
  items: UsageItem[]
  logs: UsageLog[]
  created_at: string
  updated_at: string
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const router = useRouter()
const route = useRoute()

const usageId = computed(() => route.params.id as string)

const loading = ref(true)
const usage = ref<StockUsage | null>(null)

const ITEMS_PREVIEW = 5
const showAllItems = ref(false)
const displayedItems = computed(() => {
  if (!usage.value?.items) return []
  return showAllItems.value ? usage.value.items : usage.value.items.slice(0, ITEMS_PREVIEW)
})

const typeLabel: Record<string, string> = {
  usage: 'Pemakaian Internal',
  damage: 'Kerusakan',
  sample: 'Sampel',
  other: 'Lainnya',
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  draft: { label: 'Draft', icon: FileText, color: 'text-yellow-700 bg-yellow-50 ring-yellow-200' },
  completed: { label: 'Selesai', icon: CheckCircle, color: 'text-green-700 bg-green-50 ring-green-200' },
  cancelled: { label: 'Dibatalkan', icon: XCircle, color: 'text-red-700 bg-red-50 ring-red-200' },
}

function formatLogAction(action: string): string {
  const map: Record<string, string> = {
    stock_usage_created: 'Dibuat',
    stock_usage_updated: 'Diperbarui',
    stock_usage_completed: 'Diselesaikan',
    stock_usage_cancelled: 'Dibatalkan',
  }
  return map[action] || action
}

function binLabel(item: UsageItem): string {
  return [item.zone?.code, item.rack?.code, item.bin?.code].filter(Boolean).join(' / ') || '-'
}

const hasAddress = computed(() =>
  !!(usage.value?.address?.name || usage.value?.address?.phone),
)

const hasShipment = computed(() =>
  !!(usage.value?.shipment?.courier_code || usage.value?.shipment?.tracking_no),
)

const LOGS_PREVIEW = 3
const showAllLogs = ref(false)
const visibleLogs = computed(() => {
  if (!usage.value?.logs) return []
  return showAllLogs.value ? usage.value.logs : usage.value.logs.slice(0, LOGS_PREVIEW)
})

async function fetchUsage() {
  loading.value = true
  try {
    const res = await api.get<{ data: StockUsage }>(`/inventories/stock-usages/${usageId.value}`)
    usage.value = res.data
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data')
    router.push('/inventory/usage')
  }
  finally {
    loading.value = false
  }
}

async function handleCancel() {
  const ok = await confirm({
    title: 'Batalkan Pemakaian Stok',
    message: `Batalkan "${usage.value?.no}"? Stok yang sudah dikurangi akan dikembalikan.`,
    confirmText: 'Batalkan',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.post(`/inventories/stock-usages/${usageId.value}/cancel`, {})
    toast.success('Pemakaian stok berhasil dibatalkan')
    fetchUsage()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal membatalkan')
  }
}

async function handleDelete() {
  const ok = await confirm({
    title: 'Hapus Pemakaian Stok',
    message: `Hapus "${usage.value?.no}"? Tindakan ini tidak dapat dipulihkan.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/inventories/stock-usages/${usageId.value}`)
    toast.success('Pemakaian stok berhasil dihapus')
    router.push('/inventory/usage')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus')
  }
}

onMounted(fetchUsage)
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-wrap items-center gap-3">
      <NuxtLink
        to="/inventory/usage"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <h1 class="flex-1 text-xl font-bold text-gray-900 sm:text-2xl">
        {{ loading ? 'Memuat...' : usage?.no }}
      </h1>
      <template v-if="usage && usage.status === 'draft'">
        <NuxtLink
          :to="`/inventory/usage/create?edit=${usage.id}`"
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
      <template v-if="usage && usage.status === 'completed'">
        <button
          class="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
          @click="handleCancel"
        >
          <XCircle class="h-4 w-4" />
          Batalkan
        </button>
      </template>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="space-y-4">
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="i in 4" :key="i" class="space-y-1.5">
            <div class="h-3 w-20 animate-pulse rounded bg-gray-200" />
            <div class="h-5 w-28 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </div>

    <template v-else-if="usage">
      <div class="grid gap-5 lg:grid-cols-3">
        <!-- Left: Items + Address + Shipment + Logs -->
        <div class="space-y-5 lg:col-span-3">
          <!-- Info Card -->
          <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-sm font-semibold text-gray-900">Detail Pemakaian</h2>
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1"
                :class="statusConfig[usage.status]?.color || 'text-gray-700 bg-gray-50 ring-gray-200'"
              >
                <component :is="statusConfig[usage.status]?.icon" class="h-3.5 w-3.5" />
                {{ statusConfig[usage.status]?.label || usage.status }}
              </span>
            </div>
            <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div>
                <dt class="text-xs text-gray-400">Nomor</dt>
                <dd class="mt-0.5 font-semibold text-gray-900">{{ usage.no }}</dd>
              </div>
              <div>
                <dt class="text-xs text-gray-400">Tanggal</dt>
                <dd class="mt-0.5 text-gray-700">{{ formatDate(usage.date) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-gray-400">Gudang</dt>
                <dd class="mt-0.5 text-gray-700">{{ usage.warehouse?.name || '-' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-gray-400">Tipe</dt>
                <dd class="mt-0.5 text-gray-700">{{ typeLabel[usage.type] || usage.type || '-' }}</dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-xs text-gray-400">Catatan</dt>
                <dd class="mt-0.5 text-gray-700">{{ usage.note || '-' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-gray-400">Total Qty</dt>
                <dd class="mt-0.5 text-gray-700">{{ usage.items?.reduce((s, i) => s + Math.abs(i.qty), 0).toLocaleString('id-ID') ?? 0 }}</dd>
              </div>
              <div>
                <dt class="text-xs text-gray-400">Total Item</dt>
                <dd class="mt-0.5 text-gray-700">{{ usage.items?.length ?? 0 }}</dd>
              </div>
              <div>
                <dt class="text-xs text-gray-400">Total Nilai</dt>
                <dd class="mt-0.5 font-semibold text-gray-900">Rp{{ formatCurrency(usage.total) }}</dd>
              </div>
            </dl>
          </div>

          <!-- Items Card -->
          <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
            <div class="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
              <h2 class="text-sm font-semibold text-gray-900">
                Item Pemakaian
                <span class="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                  {{ usage.items?.length ?? 0 }}
                </span>
              </h2>
              <span class="text-xs font-semibold text-gray-700">
                Total: Rp{{ formatCurrency(usage.total) }}
              </span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[580px] text-sm">
                <thead>
                  <tr class="border-b border-gray-100 bg-gray-50 text-left text-nowrap">
                    <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-8">#</th>
                    <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">SKU / Produk</th>
                    <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Lokasi</th>
                    <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-right">Qty</th>
                    <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-right">Harga</th>
                    <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-right">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr
                    v-for="(item, idx) in displayedItems"
                    :key="item.id"
                    class="hover:bg-gray-50/50"
                  >
                    <td class="px-4 py-3 text-xs text-gray-400">{{ idx + 1 }}</td>
                    <td class="px-4 py-3">
                      <p class="font-medium text-gray-900">{{ item.name }}</p>
                      <div class="mt-0.5 flex flex-wrap items-center gap-1">
                        <span class="font-mono text-xs font-semibold text-gray-600">{{ item.sku }}</span>
                        <span v-for="v in item.variants" :key="v.name" class="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{{ v.value }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-nowrap">
                      <span class="rounded bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-600">
                        {{ binLabel(item) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right font-semibold text-red-600">
                      {{ Math.abs(item.qty).toLocaleString('id-ID') }}
                    </td>
                    <td class="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                      Rp{{ formatCurrency(item.price) }}
                    </td>
                    <td class="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                      Rp{{ formatCurrency(item.total) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="(usage.items?.length ?? 0) > ITEMS_PREVIEW" class="border-t border-gray-100 px-5 py-3 text-center">
              <button
                class="text-xs font-medium text-primary-600 hover:underline"
                @click="showAllItems = !showAllItems"
              >
                {{ showAllItems ? 'Sembunyikan' : `Tampilkan semua ${usage.items.length} item` }}
              </button>
            </div>
          </div>

          <!-- Address Card -->
          <div v-if="hasAddress" class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
            <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <MapPin class="h-4 w-4 text-gray-400" />
              Alamat Pengiriman
            </h2>
            <dl class="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-sm">
              <div>
                <dt class="text-xs text-gray-400">Penerima</dt>
                <dd class="mt-0.5 font-medium text-gray-900">{{ usage.address?.name || '-' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-gray-400">Telepon</dt>
                <dd class="mt-0.5 text-gray-700">{{ usage.address?.phone || '-' }}</dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-xs text-gray-400">Alamat</dt>
                <dd class="mt-0.5 text-gray-700">{{ usage.address?.address || '-' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-gray-400">Kota</dt>
                <dd class="mt-0.5 text-gray-700">{{ [usage.address?.district, usage.address?.city, usage.address?.province].filter(Boolean).join(', ') || '-' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-gray-400">Kode Pos</dt>
                <dd class="mt-0.5 text-gray-700">{{ usage.address?.zipcode || '-' }}</dd>
              </div>
            </dl>
          </div>

          <!-- Shipment Card -->
          <div v-if="hasShipment" class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
            <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Truck class="h-4 w-4 text-gray-400" />
              Info Pengiriman
            </h2>
            <dl class="grid gap-x-6 gap-y-2 sm:grid-cols-3 text-sm">
              <div>
                <dt class="text-xs text-gray-400">Kurir</dt>
                <dd class="mt-0.5 font-medium text-gray-900">{{ usage.shipment?.courier_name || '-' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-gray-400">Layanan</dt>
                <dd class="mt-0.5 text-gray-700">{{ usage.shipment?.service_name || '-' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-gray-400">No. Resi</dt>
                <dd class="mt-0.5 font-mono font-semibold text-gray-900">{{ usage.shipment?.tracking_no || '-' }}</dd>
              </div>
              <div v-if="usage.shipment?.note" class="sm:col-span-3">
                <dt class="text-xs text-gray-400">Catatan</dt>
                <dd class="mt-0.5 text-gray-700">{{ usage.shipment.note }}</dd>
              </div>
            </dl>
          </div>

          <!-- Stock Movements (via linked adjustment) -->
          <AppStockMovements v-if="usage.id" :reference-id="usage.id" />

          <!-- Activity Log -->
          <div v-if="usage.logs?.length" class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
            <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Clock class="h-4 w-4 text-gray-400" />
              Riwayat Aktivitas
            </h2>
            <ol class="space-y-3">
              <li
                v-for="log in visibleLogs"
                :key="log.id"
                class="flex gap-3 text-sm"
              >
                <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">
                  {{ log.name?.charAt(0)?.toUpperCase() || '?' }}
                </div>
                <div>
                  <p class="font-medium text-gray-900">{{ formatLogAction(log.action) }}</p>
                  <p class="text-xs text-gray-400">{{ log.name }} · {{ formatDateTime(log.created_at) }}</p>
                  <p v-if="log.note" class="mt-0.5 text-xs text-gray-500">{{ log.note }}</p>
                </div>
              </li>
            </ol>
            <button
              v-if="usage.logs.length > LOGS_PREVIEW"
              class="mt-3 text-xs font-medium text-primary-600 hover:underline"
              @click="showAllLogs = !showAllLogs"
            >
              {{ showAllLogs ? 'Sembunyikan' : `Lihat semua ${usage.logs.length} aktivitas` }}
            </button>
          </div>
        </div>
 
      </div>
    </template>
  </div>
</template>
