<script setup lang="ts">
import {
  ArrowLeft, CheckCircle, FileText, XCircle, Clock,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Variant { name: string; value: string }

interface ReturnItem {
  id: string
  stock_usage_item_id: string
  warehouse_bin_id: string
  product_id: string
  sku_id: string
  sku: string
  name: string
  variants: Variant[]
  qty: number
  price: string
  total: string
  zone: { id: string; name: string; code: string } | null
  rack: { id: string; name: string; code: string } | null
  bin: { id: string; code: string } | null
}

interface ReturnLog {
  id: string
  user_id: string
  name: string
  action: string
  note: string
  created_at: string
}

interface StockUsageReturn {
  id: string
  no: string
  date: string
  note: string
  status: string
  total: string
  stock_usage_id: string
  stock_usage: {
    id: string
    no: string
    warehouse: { id: string; name: string } | null
  } | null
  items: ReturnItem[]
  logs: ReturnLog[]
  created_at: string
  updated_at: string
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const router = useRouter()
const route = useRoute()

const returnId = computed(() => route.params.id as string)
const loading = ref(true)
const data = ref<StockUsageReturn | null>(null)

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  draft: { label: 'Draft', icon: FileText, color: 'text-yellow-700 bg-yellow-50 ring-yellow-200' },
  completed: { label: 'Selesai', icon: CheckCircle, color: 'text-green-700 bg-green-50 ring-green-200' },
  canceled: { label: 'Dibatalkan', icon: XCircle, color: 'text-red-700 bg-red-50 ring-red-200' },
}

function binLabel(item: ReturnItem): string {
  return [item.zone?.code, item.rack?.code, item.bin?.code].filter(Boolean).join(' / ') || '-'
}

function formatLogAction(action: string): string {
  const map: Record<string, string> = {
    stock_usage_return_created: 'Dibuat',
    stock_usage_return_updated: 'Diperbarui',
    stock_usage_return_completed: 'Diselesaikan',
    stock_usage_return_cancelled: 'Dibatalkan',
  }
  return map[action] || action
}

const LOGS_PREVIEW = 3
const showAllLogs = ref(false)
const visibleLogs = computed(() => {
  if (!data.value?.logs) return []
  return showAllLogs.value ? data.value.logs : data.value.logs.slice(0, LOGS_PREVIEW)
})

async function fetchData() {
  loading.value = true
  try {
    const res = await api.get<{ data: StockUsageReturn }>(`/inventories/stock-usage-returns/${returnId.value}`)
    data.value = res.data
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data')
    router.push('/inventory/usage/return')
  }
  finally {
    loading.value = false
  }
}

async function handleCancel() {
  const ok = await confirm({
    title: 'Batalkan Return',
    message: `Batalkan "${data.value?.no}"? Stok yang sudah dikembalikan akan di-reset.`,
    confirmText: 'Batalkan',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.post(`/inventories/stock-usage-returns/${returnId.value}/cancel`, {})
    toast.success('Return berhasil dibatalkan')
    fetchData()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal membatalkan')
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-wrap items-center gap-3">
      <NuxtLink
        to="/inventory/usage/return"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <h1 class="flex-1 text-xl font-bold text-gray-900 sm:text-2xl">
        {{ loading ? 'Memuat...' : data?.no }}
      </h1>
      <button
        v-if="data && data.status !== 'canceled'"
        class="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
        @click="handleCancel"
      >
        <XCircle class="h-4 w-4" />
        Batalkan
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="space-y-4">
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <div class="grid gap-4 sm:grid-cols-3">
          <div v-for="i in 4" :key="i" class="space-y-1.5">
            <div class="h-3 w-20 animate-pulse rounded bg-gray-200" />
            <div class="h-5 w-28 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </div>

    <template v-else-if="data">
      <!-- Info Card -->
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-gray-900">Detail Return</h2>
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1"
            :class="statusConfig[data.status]?.color || 'text-gray-700 bg-gray-50 ring-gray-200'"
          >
            <component :is="statusConfig[data.status]?.icon" class="h-3.5 w-3.5" />
            {{ statusConfig[data.status]?.label || data.status }}
          </span>
        </div>
        <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div>
            <dt class="text-xs text-gray-400">Nomor Return</dt>
            <dd class="mt-0.5 font-semibold text-gray-900">{{ data.no }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-400">Tanggal</dt>
            <dd class="mt-0.5 text-gray-700">{{ formatDate(data.date) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-400">Gudang</dt>
            <dd class="mt-0.5 text-gray-700">{{ data.stock_usage?.warehouse?.name || '-' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-400">Stock Usage</dt>
            <dd class="mt-0.5">
              <NuxtLink
                :to="`/inventory/usage/${data.stock_usage_id}`"
                class="font-semibold text-primary-600 hover:underline"
              >
                {{ data.stock_usage?.no || data.stock_usage_id }}
              </NuxtLink>
            </dd>
          </div>
          <div>
            <dt class="text-xs text-gray-400">Total Nilai</dt>
            <dd class="mt-0.5 font-semibold text-gray-900">Rp{{ formatCurrency(data.total) }}</dd>
          </div>
          <div class="sm:col-span-2 lg:col-span-1">
            <dt class="text-xs text-gray-400">Catatan</dt>
            <dd class="mt-0.5 text-gray-700">{{ data.note || '-' }}</dd>
          </div>
        </dl>
      </div>

      <!-- Items Table -->
      <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="border-b border-gray-200 px-5 py-3.5">
          <h2 class="text-sm font-semibold text-gray-900">
            Item Return
            <span class="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{{ data.items.length }}</span>
          </h2>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-[640px] w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50 text-left">
                <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-8">#</th>
                <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">SKU / Produk</th>
                <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-28">Lokasi Return</th>
                <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-20 text-center">Qty</th>
                <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-28 text-right">Harga</th>
                <th class="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 w-28 text-right">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="(item, idx) in data.items" :key="item.id" class="align-middle">
                <td class="px-4 py-3 text-xs text-gray-400">{{ idx + 1 }}</td>
                <td class="px-4 py-3">
                  <p class="text-sm font-medium text-gray-900">{{ item.name }}</p>
                  <div class="mt-0.5 flex flex-wrap items-center gap-1 text-xs">
                    <span class="font-mono text-xs font-semibold text-gray-700">{{ item.sku }}</span>
                    <span v-for="v in item.variants" :key="v.name" class="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{{ v.value }}</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="rounded bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-600">{{ binLabel(item) }}</span>
                </td>
                <td class="px-4 py-3 text-center text-sm font-semibold text-green-600">
                  +{{ item.qty.toLocaleString('id-ID') }}
                </td>
                <td class="px-4 py-3 text-right text-sm text-gray-600">Rp{{ formatCurrency(item.price) }}</td>
                <td class="px-4 py-3 text-right text-sm font-semibold text-gray-900">Rp{{ formatCurrency(item.total) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t border-gray-200 bg-gray-50">
                <td colspan="5" class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Total Nilai</td>
                <td class="px-4 py-3 text-right text-sm font-bold text-gray-900">Rp{{ formatCurrency(data.total) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Activity Log -->
      <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="border-b border-gray-200 px-5 py-3.5">
          <h2 class="text-sm font-semibold text-gray-900">Riwayat Aktivitas</h2>
        </div>
        <div v-if="!data.logs?.length" class="px-5 py-8 text-center text-sm text-gray-400">
          Belum ada aktivitas
        </div>
        <ul v-else class="divide-y divide-gray-100">
          <li v-for="log in visibleLogs" :key="log.id" class="flex items-start gap-3 px-5 py-3">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <Clock class="h-3.5 w-3.5 text-gray-500" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900">{{ formatLogAction(log.action) }}</p>
              <p v-if="log.note" class="mt-0.5 text-xs text-gray-500">{{ log.note }}</p>
              <p class="mt-0.5 text-xs text-gray-400">
                {{ log.name }} · {{ formatDateTime(log.created_at) }}
              </p>
            </div>
          </li>
        </ul>
        <div v-if="data.logs?.length > LOGS_PREVIEW" class="border-t border-gray-100 px-5 py-2.5">
          <button
            type="button"
            class="text-xs text-primary-600 hover:underline"
            @click="showAllLogs = !showAllLogs"
          >
            {{ showAllLogs ? 'Sembunyikan' : `Tampilkan semua (${data.logs.length})` }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
