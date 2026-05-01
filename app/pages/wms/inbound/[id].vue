<script setup lang="ts">
import {
  ArrowLeft, Pencil, Trash2, Loader2,
  Package, CheckCircle, FileText, X, Clock,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface WarehouseZone {
  id: string
  code: string
}
interface WarehouseRack {
  id: string
  code: string 
}
interface WarehouseBin {
  id: string
  code: string 
}
interface Variant {
  name: string
  value: string
}

interface Log {
  id: string
  name: string
  action: string
  note: string
  created_at: string
}

interface InboundItem {
  id: string
  sku_id: string
  sku: string
  name: string
  variants: Variant[]
  qty: number
  price: number
  total: number
  bin_id: string
  bin?: WarehouseBin | null
  rack?: WarehouseRack | null
  zone?: WarehouseZone | null
}

interface WarehouseRef { id: string; name: string }
interface ReceiptRef   { id: string; no: string; status: string }
interface UserRef      { id: string; name: string }
interface CustomerRef { id: string; name: string }

interface Inbound {
  id: string
  no: string
  external_id: string
  date: string
  note: string
  condition: string
  status: string
  warehouse_id: string
  purchase_receipt_id: string
  purchase_receipt: ReceiptRef | null
  warehouse: WarehouseRef | null
  user: UserRef | null
  customer: CustomerRef | null
  items: InboundItem[] | null
  logs: Log[] | null
  created_at: string
  updated_at: string
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const router = useRouter()
const route = useRoute()

const inboundId = computed(() => route.params.id as string)

const loading = ref(true)
const inbound = ref<Inbound | null>(null)
const showAllItems = ref(false)
const showLogModal = ref(false)

const statusConfig: Record<string, { label: string; icon: any; cls: string }> = {
  draft:     { label: 'Draft',  icon: FileText,     cls: 'text-yellow-600 bg-yellow-50 ring-yellow-200' },
  completed: { label: 'Selesai', icon: CheckCircle, cls: 'text-green-600 bg-green-50 ring-green-200'   },
}

const conditionLabel: Record<string, string> = { good: 'Baik', damaged: 'Rusak' }

const visibleItems = computed(() => {
  const all = inbound.value?.items || []
  return showAllItems.value ? all : all.slice(0, 5)
})

function parseVariants(raw: string): { name: string; value: string }[] {
  try {
    const obj = JSON.parse(raw || '{}')
    return Object.entries(obj).map(([name, value]) => ({ name, value: String(value) }))
  }
  catch { return [] }
}

const subtotal = computed(() =>
  (inbound.value?.items || []).reduce((s, i) => s + Number(i.total), 0),
)

const visibleLogs = computed(() => (inbound.value?.logs || []).slice(0, 3))

function formatLogAction(action: string): string {
  const map: Record<string, string> = {
    inbound_created: 'Inbound Dibuat',
    inbound_updated: 'Inbound Diperbarui',
    inbound_detail_updated: 'Detail Diperbarui',
    inbound_status_updated: 'Status Diperbarui',
    inbound_deleted: 'Inbound Dihapus',
  }
  return map[action] || action
}

async function fetchInbound() {
  loading.value = true
  try {
    const res = await api.get<{ data: Inbound }>(`/warehouses/inbounds/${inboundId.value}`)
    inbound.value = res.data
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat detail inbound')
    router.push('/wms/inbound')
  }
  finally {
    loading.value = false
  }
}

// ── Complete ──────────────────────────────────────────────────────────────────
const completing = ref(false)

async function handleComplete() {
  const ok = await confirm({
    title: 'Selesaikan Inbound',
    message: `Yakin menyelesaikan "${inbound.value?.no}"? Stok gudang akan diperbarui secara otomatis dan tindakan ini tidak dapat dibatalkan.`,
    confirmText: 'Selesaikan',
    variant: 'info',
  })
  if (!ok) return

  completing.value = true
  try {
    await api.put(`/warehouses/inbounds/${inboundId.value}/update-status`, { status: 'completed' })
    toast.success('Inbound berhasil diselesaikan, stok gudang diperbarui')
    await fetchInbound()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menyelesaikan inbound')
  }
  finally {
    completing.value = false
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function handleDelete() {
  if (!inbound.value) return
  const ok = await confirm({
    title: 'Hapus Inbound',
    message: `Hapus inbound "${inbound.value.no}"? Data tidak bisa dikembalikan.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/warehouses/inbounds/${inboundId.value}`)
    toast.success('Inbound berhasil dihapus')
    router.push('/wms/inbound')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus inbound')
  }
}

// ── Edit detail (note + condition) ───────────────────────────────────────────
const showDetailModal = ref(false)
const savingDetail = ref(false)
const detailForm = reactive({ note: '', condition: 'good' })
const detailErrors = ref<Record<string, string[]>>({})

function openDetailModal() {
  if (!inbound.value) return
  detailForm.note = inbound.value.note || ''
  detailForm.condition = inbound.value.condition || 'good'
  detailErrors.value = {}
  showDetailModal.value = true
}

async function handleSaveDetail() {
  savingDetail.value = true
  detailErrors.value = {}
  try {
    await api.put(`/warehouses/inbounds/${inboundId.value}/update-detail`, {
      note: detailForm.note,
      condition: detailForm.condition,
    })
    toast.success('Detail inbound berhasil diperbarui')
    showDetailModal.value = false
    await fetchInbound()
  }
  catch (err: any) {
    if (err.errors) detailErrors.value = err.errors
    else toast.error(err.message || 'Gagal memperbarui detail')
  }
  finally {
    savingDetail.value = false
  }
}

onMounted(() => fetchInbound())
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/wms/inbound"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <ArrowLeft class="h-5 w-5" />
      </NuxtLink>
      <div class="flex-1">
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">
          {{ loading ? 'Memuat...' : (inbound?.no || 'Detail Inbound') }}
        </h1>
        <p v-if="inbound?.warehouse" class="text-sm text-gray-500">{{ inbound.warehouse.name }}</p>
      </div>

      <template v-if="inbound">
        <!-- Edit items (draft only, via create page) -->
        <NuxtLink
          v-if="inbound.status === 'draft'"
          :to="`/wms/inbound/create?edit=${inbound.id}`"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Pencil class="h-4 w-4" />
          Edit
        </NuxtLink>

        <!-- Edit note/condition (always) -->
        <button
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          @click="openDetailModal"
        >
          <FileText class="h-4 w-4" />
          Ubah Detail
        </button>

        <!-- Complete (draft only) -->
        <button
          v-if="inbound.status === 'draft'"
          :disabled="completing"
          class="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          @click="handleComplete"
        >
          <Loader2 v-if="completing" class="h-4 w-4 animate-spin" />
          <CheckCircle v-else class="h-4 w-4" />
          Selesaikan
        </button>

        <!-- Delete (draft only) -->
        <button
          v-if="inbound.status === 'draft'"
          class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          @click="handleDelete"
        >
          <Trash2 class="h-4 w-4" />
          Hapus
        </button>
      </template>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid gap-5 lg:grid-cols-4">
      <div class="lg:col-span-1 space-y-4">
        <div v-for="i in 2" :key="i" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-3 w-20 animate-pulse rounded bg-gray-200" />
          <div class="mt-3 h-6 w-24 animate-pulse rounded-full bg-gray-200" />
        </div>
        <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-28 animate-pulse rounded bg-gray-200" />
          <div class="mt-4 space-y-3">
            <div v-for="j in 5" :key="j">
              <div class="h-3 w-16 animate-pulse rounded bg-gray-100" />
              <div class="mt-1.5 h-4 w-28 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
      <div class="lg:col-span-3 rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div class="border-b border-gray-100 px-5 py-4">
          <div class="h-4 w-28 animate-pulse rounded bg-gray-200" />
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50">
                <th v-for="i in 5" :key="i" class="px-4 py-2.5">
                  <div class="h-3 w-16 animate-pulse rounded bg-gray-200" />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in 4" :key="i" class="border-b border-gray-100">
                <td class="px-4 py-3"><div class="h-4 w-32 animate-pulse rounded bg-gray-200" /></td>
                <td class="px-4 py-3"><div class="mx-auto h-4 w-8 animate-pulse rounded bg-gray-200" /></td>
                <td class="px-4 py-3"><div class="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200" /></td>
                <td class="px-4 py-3"><div class="ml-auto h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
                <td class="px-4 py-3"><div class="h-4 w-16 animate-pulse rounded bg-gray-200" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <template v-else-if="inbound">
      <div class="grid gap-5 lg:grid-cols-4">
        <!-- Sidebar info -->
        <div class="lg:col-span-1 space-y-4">
          <!-- Status -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p class="mb-2 text-xs font-medium uppercase text-gray-400">Status</p>
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ring-1"
              :class="statusConfig[inbound.status]?.cls || 'bg-gray-50 text-gray-600 ring-gray-200'"
            >
              <component :is="statusConfig[inbound.status]?.icon || FileText" class="h-4 w-4" />
              {{ statusConfig[inbound.status]?.label || inbound.status }}
            </span>
          </div>
 

          <!-- Detail info -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-3 text-sm font-semibold text-gray-900">Informasi</h2>
            <div class="space-y-3 text-sm">
              <div>
                <p class="text-xs text-gray-400">No. Inbound</p>
                <p class="font-medium text-gray-900">{{ inbound.no }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">No. GRN</p>
                <NuxtLink
                  v-if="inbound.purchase_receipt"
                  :to="`/purchase/receipt/${inbound.purchase_receipt.id}`"
                  class="font-medium text-primary-600 hover:underline"
                >
                  {{ inbound.purchase_receipt.no }}
                </NuxtLink>
                <span v-else class="font-medium text-gray-400">-</span>
              </div>
              <div>
                <p class="text-xs text-gray-400">Supplier</p>
                <p class="font-medium text-gray-900">{{ inbound.customer?.name || '-' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Gudang</p>
                <p class="font-medium text-gray-900">{{ inbound.warehouse?.name || '-' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Tanggal</p>
                <p class="font-medium text-gray-900">{{ formatDate(inbound.date) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Petugas</p>
                <p class="font-medium text-gray-900">{{ inbound.user?.name || '-' }}</p>
              </div>
              <div v-if="inbound.external_id">
                <p class="text-xs text-gray-400">External ID</p>
                <p class="font-medium text-gray-900">{{ inbound.external_id }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Catatan</p>
                <p class="text-gray-700">{{ inbound.note || '-' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Dibuat</p>
                <p class="text-gray-700">{{ formatDateTime(inbound.created_at) }}</p>
              </div>
            </div>
          </div>

        </div>
        <!-- Items table -->
        <div class="lg:col-span-3">
          <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div class="border-b border-gray-100 px-5 py-4">
              <h2 class="text-sm font-semibold text-gray-900">Item Inbound ({{ inbound.items?.length || 0 }})</h2>
            </div>

            <div v-if="inbound.items?.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th class="px-4 py-2.5 text-left">Produk</th>
                    <th class="px-4 py-2.5 text-left">Bin</th>
                    <th class="px-4 py-2.5 text-right">Qty</th>
                    <th class="px-4 py-2.5 text-right">Harga</th>
                    <th class="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in visibleItems"
                    :key="item.id"
                    class="border-b border-gray-100 last:border-b-0"
                  >
                    <td class="px-4 py-3">
                      <p class="font-medium text-gray-900 line-clamp-2">{{ item.name }}</p>
                      <div class="flex flex-wrap items-center gap-1.5 text-xs">
                        <span class="text-gray-500">{{ item.sku }}</span>
                        <span v-for="v in item.variants" :key="v.name" class="rounded bg-gray-100 px-1 py-0.5">
                          {{ v.value }}
                        </span> 
                      </div>
                    </td>
                    <td class="px-4 py-3 text-gray-500">
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
                    <td class="px-4 py-3 text-right">{{ item.qty }}</td>
                    <td class="px-4 py-3 text-right whitespace-nowrap">Rp{{ formatCurrency(item.price) }}</td>
                    <td class="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">Rp{{ formatCurrency(item.total) }}</td>
                    
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else class="px-4 py-10 text-center text-sm text-gray-400">
              <Package class="mx-auto mb-2 h-8 w-8 text-gray-300" />
              Tidak ada item
            </div>

            <!-- Show more -->
            <div v-if="(inbound.items?.length || 0) > 5" class="border-t border-gray-100 px-4 py-2.5 text-center">
              <button
                class="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                @click="showAllItems = !showAllItems"
              >
                {{ showAllItems ? 'Sembunyikan' : `Lihat selengkapnya (${(inbound.items?.length || 0) - 5} item lagi)` }}
              </button>
            </div>

            <!-- Subtotal -->
            <div v-if="inbound.items?.length" class="flex justify-end border-t border-gray-100 px-5 py-3">
              <div class="text-sm">
                <span class="text-gray-500">Subtotal: </span>
                <span class="font-semibold text-gray-900">Rp{{ formatCurrency(subtotal) }}</span>
              </div>
            </div>
          </div>

          <!-- Stock Movements -->
          <AppStockMovements :reference-id="inbound.id" />
          <!-- Activity Log -->
          <div v-if="inbound.logs?.length" class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 mt-5">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h2 class="text-sm font-semibold text-gray-900">Riwayat Aktivitas ({{ inbound.logs.length }})</h2>
            </div>
            <div class="divide-y divide-gray-100">
              <div v-for="log in visibleLogs" :key="log.id" class="flex items-start gap-2.5 px-4 py-2.5">
                <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Clock class="h-3 w-3 text-gray-500" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs text-gray-900">
                    <span class="font-medium">{{ log.name || 'System' }}</span>
                    <span class="text-gray-500"> — {{ formatLogAction(log.action) }}</span>
                  </p>
                  <p v-if="log.note" class="text-xs text-gray-500">{{ log.note }}</p>
                  <p class="text-xs text-gray-400">{{ formatDateTime(log.created_at) }}</p>
                </div>
              </div>
            </div>
            <div v-if="inbound.logs.length > 3" class="border-t border-gray-100 px-4 py-2.5 text-center">
              <button
                class="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                @click="showLogModal = true"
              >
                Lihat selengkapnya ({{ inbound.logs.length - 3 }} lagi)
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- Edit Detail Modal -->
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
        v-if="showLogModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        @click.self="showLogModal = false"
      >
        <div class="flex w-full max-w-lg flex-col rounded-xl bg-white shadow-xl" style="max-height: 80vh;" @click.stop>
          <div class="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 class="text-lg font-semibold text-gray-900">Riwayat Aktivitas ({{ inbound?.logs?.length || 0 }})</h2>
            <button class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="showLogModal = false">
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto divide-y divide-gray-100">
            <div v-for="log in inbound?.logs" :key="log.id" class="flex items-start gap-3 px-6 py-3">
              <div class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
                <Clock class="h-3.5 w-3.5 text-gray-500" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm text-gray-900">
                  <span class="font-medium">{{ log.name || 'System' }}</span>
                  <span class="text-gray-500"> — {{ formatLogAction(log.action) }}</span>
                </p>
                <p v-if="log.note" class="text-xs text-gray-500">{{ log.note }}</p>
                <p class="text-xs text-gray-400">{{ formatDateTime(log.created_at) }}</p>
              </div>
            </div>
          </div>
          <div class="flex shrink-0 justify-end border-t border-gray-100 px-6 py-3">
            <button class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" @click="showLogModal = false">Tutup</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Edit Detail Modal -->
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
        v-if="showDetailModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        @click.self="showDetailModal = false"
      >
        <div class="w-full max-w-sm rounded-xl bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 class="text-base font-semibold text-gray-900">Ubah Catatan</h2>
            <button class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" @click="showDetailModal = false">
              <X class="h-5 w-5" />
            </button>
          </div>

          <div class="space-y-4 px-6 py-5"> 
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan</label>
              <textarea
                v-model="detailForm.note"
                rows="3"
                placeholder="Catatan inbound..."
                class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <p v-if="detailErrors.note" class="mt-1 text-xs text-red-600">{{ detailErrors.note[0] }}</p>
            </div>
          </div>

          <div class="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" @click="showDetailModal = false">
              Batal
            </button>
            <button
              :disabled="savingDetail"
              class="flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              @click="handleSaveDetail"
            >
              <Loader2 v-if="savingDetail" class="h-4 w-4 animate-spin" />
              Simpan
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
