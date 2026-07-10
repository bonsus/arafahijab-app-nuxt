<script setup lang="ts">
import {
  Search, RefreshCw, X, Wallet, Trash2, Download, Loader2,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface WalletRef { id: string; name: string }

interface ReturnRef {
  id: string
  no: string
}

interface CustomerRef { id: string; name: string; phone: string }
interface StoreRef { id: string; name: string; source: string }

interface RefundPayment {
  id: string
  order_return_id: string
  wallet_id: string
  date: string
  amount: string
  method: string
  file: string
  note: string
  created_at: string
  updated_at: string
  wallet: WalletRef | null
  order_return: ReturnRef | null
  customer: CustomerRef | null
  store: StoreRef | null
}

interface Paginated {
  data: RefundPayment[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(true)
const refunds = ref<RefundPayment[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

const search = ref('')
const filterWalletIds = ref<string[]>([])
const filterMethod = ref<string[]>([])
const filterDate = ref({ from: '', to: '' })

const wallets = ref<WalletRef[]>([])
const loadingWallets = ref(false)

const walletOptions = computed(() =>
  wallets.value.map(w => ({ value: w.id, label: w.name })),
)

const methodOptions = [
  { value: 'transfer', label: 'Transfer' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Tunai' },
  { value: 'ewallet', label: 'E-Wallet' },
  { value: 'other', label: 'Lainnya' },
]

const methodLabel: Record<string, string> = {
  transfer: 'Transfer',
  bank_transfer: 'Bank Transfer',
  cash: 'Tunai',
  ewallet: 'E-Wallet',
  other: 'Lainnya',
}

const pageTabs = [
  { key: 'return', label: 'Retur', to: '/sales/return' },
  { key: 'payments', label: 'Pembayaran', to: '/sales/return/payments' },
]

const hasActiveFilters = computed(() =>
  !!(search.value || filterWalletIds.value.length || filterMethod.value.length
    || filterDate.value.from || filterDate.value.to),
)

async function fetchRefunds() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    if (filterWalletIds.value.length) params.wallet_id = filterWalletIds.value.join(',')
    if (filterMethod.value.length) params.method = filterMethod.value.join(',')
    if (filterDate.value.from && filterDate.value.to) {
      params.date_from = formatDateFromForApi(filterDate.value.from)
      params.date_to = formatDateToForApi(filterDate.value.to)
    }
    const res = await api.get<{ data: Paginated }>('/sales/order-returns/payments/index', params)
    refunds.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch { refunds.value = [] }
  finally { loading.value = false }
}

async function fetchWallets() {
  loadingWallets.value = true
  try {
    const res = await api.get<{ data: WalletRef[] }>('/wallets/index')
    wallets.value = (res.data || []).filter((w: any) => w.status === 'active')
  }
  catch { wallets.value = [] }
  finally { loadingWallets.value = false }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchRefunds() }, 300)
}

function onWalletFilter(val: string | string[]) {
  filterWalletIds.value = val as string[]
  page.value = 1
  fetchRefunds()
}

function onMethodFilter(val: string | string[]) {
  filterMethod.value = val as string[]
  page.value = 1
  fetchRefunds()
}

function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1
  fetchRefunds()
}

function onPageChange(p: number) {
  page.value = p
  fetchRefunds()
}

function onPerPageChange(pp: number) {
  perPage.value = pp
  page.value = 1
  fetchRefunds()
}

function resetFilters() {
  search.value = ''
  filterWalletIds.value = []
  filterMethod.value = []
  filterDate.value = { from: '', to: '' }
  page.value = 1
  fetchRefunds()
}

// ─── Export ──────────────────────────────────────────────────────────────────
const exporting = ref(false)

async function exportData() {
  if (exporting.value) return
  exporting.value = true
  try {
    const params: Record<string, string> = {}
    if (search.value) params.search = search.value
    if (filterWalletIds.value.length) params.wallet_id = filterWalletIds.value.join(',')
    if (filterMethod.value.length) params.method = filterMethod.value.join(',')
    if (filterDate.value.from && filterDate.value.to) {
      params.date_from = formatDateFromForApi(filterDate.value.from)
      params.date_to = formatDateToForApi(filterDate.value.to)
    }
    const endpoint = '/sales/order-return-export/return-payment'
    const response = await api.get<Blob>(endpoint, params, { responseType: 'blob' })
    const blob = new Blob([response as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const now = new Date()
    const date = now.toISOString().slice(0, 10).replace(/-/g, '')
    const hhmm = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    const name = (endpoint.split('/').pop() || 'return_payment').replace(/-/g, '_')
    link.download = `${name}_${date}_${hhmm}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => window.URL.revokeObjectURL(url), 100)
    toast.success('Export berhasil diunduh')
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengekspor data')
  } finally {
    exporting.value = false
  }
}

async function handleDelete(refund: RefundPayment) {
  const ok = await confirm({
    title: 'Hapus Refund',
    message: `Hapus refund sebesar Rp${formatCurrency(Number(refund.amount))}? Data tidak bisa dikembalikan.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/sales/order-returns/${refund.order_return_id}/payments/${refund.id}`)
    toast.success('Refund berhasil dihapus')
    fetchRefunds()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus refund')
  }
}

onMounted(() => {
  fetchRefunds()
  fetchWallets()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div>
      <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Retur Penjualan</h1>
      <p class="text-sm text-gray-500">Kelola retur dan pembayaran/refund pelanggan.</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-gray-200">
      <NuxtLink
        v-for="tab in pageTabs"
        :key="tab.key"
        :to="tab.to"
        class="px-4 py-2.5 text-sm font-medium transition-colors"
        :class="tab.key === 'payments' 
          ? 'border-b-2 border-primary-600 text-primary-600' 
          : 'text-gray-600 hover:text-gray-900'"
      >
        {{ tab.label }}
      </NuxtLink>
    </div>
    <!-- Filter Card -->
    <div class="rounded-xl"> 
      <!-- Filter body -->
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari no refund, no retur, pelanggan..."
              class="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              @input="onSearch"
            />
          </div>
          <AppFilterSelect
            :model-value="filterWalletIds"
            :options="walletOptions"
            :loading="loadingWallets"
            multiple
            placeholder="Dompet"
            search-placeholder="Cari dompet..."
            @update:model-value="onWalletFilter"
          />
          <AppFilterSelect
            :model-value="filterMethod"
            :options="methodOptions"
            multiple
            :searchable="false"
            placeholder="Metode"
            @update:model-value="onMethodFilter"
          />
          <AppDateRangePicker :model-value="filterDate" @update:model-value="onDateFilter" />

          <button
            class="flex shrink-0 rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            :disabled="loading"
            title="Refresh data"
            @click="fetchRefunds()"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          </button>
          <button
            class="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
            title="Export Excel"
            :disabled="exporting"
            @click="exportData()"
          >
            <Loader2 v-if="exporting" class="h-4 w-4 animate-spin" />
            <Download v-else class="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            v-if="hasActiveFilters"
            class="flex shrink-0 rounded-lg border border-red-200 p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-700"
            title="Reset filter"
            @click="resetFilters()"
          >
            <X class="h-4 w-4" />
          </button>
        </div> 
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[800px] text-sm">
          <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500 text-nowrap">
            <tr>
              <th class="px-4 py-2.5 text-left">No Retur</th>
              <th class="px-4 py-2.5 text-left">Pelanggan</th>
              <th class="px-4 py-2.5 text-left">Toko</th>
              <th class="px-4 py-2.5 text-left">Tanggal</th>
              <th class="px-4 py-2.5 text-left">Metode</th>
              <th class="px-4 py-2.5 text-left">Dompet</th>
              <th class="px-4 py-2.5 text-right">Jumlah</th>
              <th class="px-4 py-2.5 text-left">Catatan</th>
              <th class="px-4 py-2.5 text-right">Tindakan</th>
            </tr>
          </thead>

          <!-- Loading -->
          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-gray-100">
              <td v-for="j in 9" :key="j" class="px-4 py-3">
                <div class="h-4 w-20 animate-pulse rounded bg-gray-200" :class="j === 7 || j === 9 ? 'ml-auto' : ''" />
              </td>
            </tr>          </tbody>

          <!-- Empty -->
          <tbody v-else-if="!refunds.length">
            <tr>
              <td colspan="9" class="px-4 py-16 text-center">
                <Wallet class="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p class="text-sm text-gray-500">
                  {{ hasActiveFilters ? 'Tidak ada data yang cocok dengan filter.' : 'Belum ada history pembayaran refund.' }}
                </p>
              </td>
            </tr>
          </tbody>

          <!-- Rows -->
          <tbody v-else>
            <tr
              v-for="r in refunds"
              :key="r.id"
              class="border-b border-gray-100 transition-colors hover:bg-gray-50/50 last:border-b-0"
            >
              <td class="px-4 py-3 text-gray-700">
                <NuxtLink
                  v-if="r.order_return?.id"
                  :to="`/sales/return/${r.order_return.id}`"
                  class="font-semibold text-primary-600 hover:underline"
                >
                  {{ r.order_return.no }}
                </NuxtLink>
                <span v-else>-</span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-gray-600">{{ r.customer?.name || '-' }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-gray-600">
                <span class="inline-flex items-center gap-1.5">
                  <img v-if="r.store?.source" :src="'/images/platform/' + r.store.source + '.svg'" alt="" class="h-4 w-4 object-contain" />
                  {{ r.store?.name || '-' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-gray-600">{{ formatDate(r.date) }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-gray-600">{{ methodLabel[r.method] || r.method }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-gray-600">{{ r.wallet?.name || '-' }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-600">Rp{{ formatCurrency(Number(r.amount)) }}</td>
              <td class="px-4 py-3 text-gray-500 max-w-[180px] truncate">{{ r.note || '-' }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Hapus Refund"
                    @click="handleDelete(r)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <AppPagination
        :page="page"
        :total-page="totalPage"
        :total="total"
        :per-page="perPage"
        :loading="loading"
        @update:page="onPageChange"
        @update:per-page="onPerPageChange"
      />
    </div>
  </div>
</template>
