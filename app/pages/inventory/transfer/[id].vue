<script setup lang="ts">
import {
  ArrowLeft, Pencil, Trash2, CheckCircle, FileText,
  Package, Clock, ArrowRight, MapPin, User,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Variant { name: string; value: string }

interface TransferLog {
  id: string
  business_id: string
  stock_transfer_id: string
  user_id: string
  name: string
  action: string
  note: string
  created_at: string
  updated_at: string
}

interface TransferItem {
  id: string
  stock_transfer_id: string
  warehouse_from_id: string
  warehouse_bin_from_id: string
  warehouse_to_id: string
  warehouse_bin_to_id: string
  product_id: string
  sku_id: string
  sku: string
  name: string
  variants: Variant[]
  qty: number
  price: string
  total: string
  warehouse_from: { id: string; name: string } | null
  bin_from: { id: string; code: string } | null
  rack_from: { id: string; code: string } | null
  zone_from: { id: string; code: string } | null
  warehouse_to: { id: string; name: string } | null
  bin_to: { id: string; code: string } | null
  rack_to: { id: string; code: string } | null
  zone_to: { id: string; code: string } | null
  created_at: string
}

interface StockTransfer {
  id: string
  business_id: string
  no: string
  date: string
  note: string
  status: string
  total: string
  items: TransferItem[]
  logs: TransferLog[]
  created_at: string
  updated_at: string
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const router = useRouter()
const route = useRoute()

const transferId = computed(() => route.params.id as string)

const loading = ref(true)
const transfer = ref<StockTransfer | null>(null)

const ITEMS_PREVIEW = 10
const showAllItems = ref(false)
const displayedItems = computed(() => {
  if (!transfer.value?.items) return []
  return showAllItems.value ? transfer.value.items : transfer.value.items.slice(0, ITEMS_PREVIEW)
})

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  draft: { label: 'Draft', icon: FileText, color: 'text-yellow-700 bg-yellow-50 ring-yellow-200' },
  completed: { label: 'Selesai', icon: CheckCircle, color: 'text-green-700 bg-green-50 ring-green-200' },
}

const actionLabels: Record<string, string> = {
  stock_transfer_created: 'Transfer stok dibuat',
  stock_transfer_updated: 'Transfer stok diperbarui',
  stock_transfer_completed: 'Transfer stok diselesaikan',
  stock_transfer_deleted: 'Transfer stok dihapus',
}

function getActionLabel(action: string): string {
  return actionLabels[action] || action.replace(/_/g, ' ')
}

async function fetchTransfer() {
  loading.value = true
  try {
    const res = await api.get<{ data: StockTransfer }>(`/inventories/transfers/${transferId.value}`)
    transfer.value = res.data
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data')
    router.push('/inventory/transfer')
  }
  finally {
    loading.value = false
  }
}

async function handleDelete() {
  if (!transfer.value) return
  const isCompleted = transfer.value.status === 'completed'
  const ok = await confirm({
    title: 'Hapus Transfer Stok',
    message: isCompleted
      ? `Hapus "${transfer.value.no}"? Transfer ini sudah selesai — stok akan di-rollback otomatis.`
      : `Hapus "${transfer.value.no}"? Tindakan ini tidak dapat dipulihkan.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/inventories/transfers/${transferId.value}`)
    toast.success('Transfer stok berhasil dihapus')
    router.push('/inventory/transfer')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus')
  }
}

onMounted(fetchTransfer)
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/inventory/transfer"
          class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft class="h-5 w-5" />
        </NuxtLink>
        <div>
          <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
            {{ transfer?.no || 'Detail Transfer Stok' }}
          </h1>
          <p class="mt-0.5 text-xs text-gray-400">Transfer Stok</p>
        </div>
      </div>
      <div v-if="!loading && transfer" class="flex items-center gap-2">
        <NuxtLink
          v-if="transfer.status === 'draft'"
          :to="`/inventory/transfer/create?edit=${transfer.id}`"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Pencil class="h-3.5 w-3.5" />
          Edit
        </NuxtLink>
        <button
          class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          @click="handleDelete"
        >
          <Trash2 class="h-3.5 w-3.5" />
          Hapus
        </button>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-4">
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200 space-y-4">
        <div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
        <div class="grid gap-3 sm:grid-cols-3">
          <div v-for="i in 4" :key="i" class="space-y-1.5">
            <div class="h-3 w-20 animate-pulse rounded bg-gray-200" />
            <div class="h-5 w-32 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <div class="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div class="mt-4 space-y-3">
          <div v-for="i in 4" :key="i" class="h-20 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    </div>

    <template v-else-if="transfer">
      <!-- Info card -->
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-900">Informasi Transfer</h2>
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
            :class="statusConfig[transfer.status]?.color || 'text-gray-700 bg-gray-50 ring-gray-200'"
          >
            <component :is="statusConfig[transfer.status]?.icon || Clock" class="h-3.5 w-3.5" />
            {{ statusConfig[transfer.status]?.label || transfer.status }}
          </span>
        </div>
        <div class="grid gap-x-6 gap-y-3 sm:grid-cols-2 md:grid-cols-4 text-sm">
          <div>
            <p class="text-xs text-gray-500">Nomor Transfer</p>
            <p class="font-semibold text-gray-900">{{ transfer.no }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500">Tanggal</p>
            <p class="font-medium text-gray-800">{{ formatDate(transfer.date) }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500">Total Nilai</p>
            <p class="font-semibold text-gray-900">Rp{{ formatCurrency(transfer.total) }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500">Catatan</p>
            <p class="text-gray-700">{{ transfer.note || '-' }}</p>
          </div>
        </div>
      </div>

      <!-- Items -->
      <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 class="text-sm font-semibold text-gray-900">
            Item Transfer
            <span class="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
              {{ transfer.items?.length || 0 }}
            </span>
          </h2>
        </div>

        <div v-if="!transfer.items?.length" class="px-5 py-12 text-center">
          <Package class="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p class="text-sm text-gray-400">Tidak ada item</p>
        </div>

        <div v-else class="divide-y divide-gray-100">
          <div
            v-for="it in displayedItems"
            :key="it.id"
            class="px-5 py-4"
          >
            <!-- SKU / Product info -->
            <div class="mb-3">
              <p class="font-semibold text-gray-800">{{ it.name }}</p>
              <div class="mt-0.5 flex flex-wrap items-center gap-1">
                <span class="font-mono text-xs font-medium text-gray-600">{{ it.sku }}</span>
                <span v-for="v in it.variants" :key="v.name" class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{{ v.value }}</span>
              </div>
            </div>

            <!-- From → To row -->
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <!-- From -->
              <div class="flex-1 rounded-lg bg-red-50 px-3 py-2 ring-1 ring-red-100">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-red-700 mb-0.5">Asal</p>
                <div class="flex items-center gap-1 text-xs text-red-800">
                  <MapPin class="h-3 w-3 shrink-0 text-red-500" />
                  <span class="font-medium">{{ it.warehouse_from?.name || it.warehouse_from_id }}</span>
                  <span v-if="it.bin_from" class="text-red-400">›</span>
                  <span v-if="it.bin_from" class="font-medium">{{ it.bin_from.code }}</span>
                  <span v-if="it.rack_from" class="text-red-400">›</span>
                  <span v-if="it.rack_from" class="font-medium">{{ it.rack_from.code }}</span>
                  <span v-if="it.zone_from" class="text-red-400">›</span>
                  <span v-if="it.zone_from" class="font-medium">{{ it.zone_from.code }}</span>
                </div>
              </div>

              <!-- Arrow -->
              <div class="hidden sm:flex items-center justify-center">
                <ArrowRight class="h-4 w-4 text-gray-400" />
              </div>
              <div class="flex sm:hidden items-center justify-center">
                <ArrowRight class="h-4 w-4 rotate-90 text-gray-400" />
              </div>

              <!-- To -->
              <div class="flex-1 rounded-lg bg-green-50 px-3 py-2 ring-1 ring-green-100">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-green-700 mb-0.5">Tujuan</p>
                <div class="flex items-center gap-1 text-xs text-green-800">
                  <MapPin class="h-3 w-3 shrink-0 text-green-500" />
                  <span class="font-medium">{{ it.warehouse_to?.name || it.warehouse_to_id }}</span>
                  <span v-if="it.bin_to" class="text-green-400">›</span>
                  <span v-if="it.bin_to" class="font-medium">{{ it.bin_to.code }}</span>
                  <span v-if="it.rack_to" class="text-green-400">›</span>
                  <span v-if="it.rack_to" class="font-medium">{{ it.rack_to.code }}</span>
                  <span v-if="it.zone_to" class="text-green-400">›</span>
                  <span v-if="it.zone_to" class="font-medium">{{ it.zone_to.code }}</span>
                </div>
              </div>

              <!-- Qty & value -->
              <div class="shrink-0 text-right">
                <p class="text-sm font-bold text-gray-900">{{ it.qty.toLocaleString('id-ID') }} pcs</p>
                <p v-if="transfer.status === 'completed'" class="text-xs text-gray-500">
                  Rp{{ formatCurrency(it.total) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Show more -->
          <div
            v-if="(transfer.items?.length || 0) > ITEMS_PREVIEW && !showAllItems"
            class="px-5 py-3 text-center"
          >
            <button
              type="button"
              class="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
              @click="showAllItems = true"
            >
              Tampilkan semua {{ transfer.items.length }} item
            </button>
          </div>
        </div>
      </div>

      <!-- Activity log -->
      <div v-if="transfer.logs?.length" class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="border-b border-gray-200 px-5 py-3.5">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Clock class="h-4 w-4 text-gray-400" />
            Riwayat Aktivitas
          </h2>
        </div>
        <div class="divide-y divide-gray-100">
          <div
            v-for="log in transfer.logs"
            :key="log.id"
            class="flex items-start gap-3 px-5 py-3"
          >
            <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <User class="h-3 w-3 text-gray-400" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs text-gray-900">
                <span class="font-medium">{{ log.name }}</span>
                <span class="text-gray-500"> — {{ getActionLabel(log.action) }}</span>
              </p>
              <p v-if="log.note" class="text-xs text-gray-500">{{ log.note }}</p>
              <p class="text-xs text-gray-400">{{ formatDateTime(log.created_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
