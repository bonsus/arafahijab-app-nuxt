<script setup lang="ts">
import {
  Search,
  RefreshCw,
  X,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  Trash2,
  Loader2,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface WalletItem {
  id: string
  name: string
}

interface WalletTransaction {
  id: string
  business_id: string
  wallet_id: string
  type: 'in' | 'out'
  amount: string
  description: string
  reference_id: string
  reference_type: string
  reference_no: string
  created_at: string
  updated_at: string
}

interface PaginatedTransaction {
  data: WalletTransaction[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(true)
const wallets = ref<WalletItem[]>([])
const transactions = ref<WalletTransaction[]>([])

const search = ref('')
const filterWalletIds = ref<string[]>([])
const filterType = ref('')
const filterDate = ref({ from: '', to: '' })

const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

const showTransactionDetail = ref(false)
const selectedTransaction = ref<WalletTransaction | null>(null)
const loadingTransactionDetail = ref(false)

const summaryRef = ref<{ refresh: () => Promise<void> } | null>(null)

const walletFilterOptions = computed(() =>
  wallets.value.map(w => ({ value: w.id, label: w.name })),
)

const walletMap = computed(() => {
  const map = new Map<string, WalletItem>()
  for (const w of wallets.value) map.set(w.id, w)
  return map
})

const typeFilterOptions = [
  { value: 'in', label: 'Masuk' },
  { value: 'out', label: 'Keluar' },
]

const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, page.value - 2)
  const end = Math.min(totalPage.value, page.value + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

async function fetchWallets() {
  try {
    const res = await api.get<{ data: WalletItem[] }>('/wallets/index')
    wallets.value = res.data || []
  }
  catch {
    wallets.value = []
  }
}

async function fetchTransactions() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
      sorting: 'desc',
      sort_by: 'created_at',
    }
    if (search.value) params.search = search.value
    if (filterWalletIds.value.length) params.wallet_id = filterWalletIds.value.join(',')
    if (filterType.value) params.type = filterType.value
    if (filterDate.value.from) {
      params.date_from = filterDate.value.from
      params.date_to = filterDate.value.to
    }

    const res = await api.get<{ data: PaginatedTransaction }>('/wallets/transactions', params)
    transactions.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch {
    transactions.value = []
    totalPage.value = 1
    total.value = 0
  }
  finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchTransactions()
  }, 300)
}

function onWalletFilter(val: string | string[]) {
  filterWalletIds.value = val as string[]
  page.value = 1
  fetchTransactions()
}

function onTypeFilter(val: string | string[]) {
  filterType.value = (val as string) || ''
  page.value = 1
  fetchTransactions()
}

function onDateFilter(val: { from: string, to: string }) {
  filterDate.value = val
  page.value = 1
  fetchTransactions()
}

function onPageChange(p: number) {
  page.value = p
  fetchTransactions()
}

function onPerPageChange(pp: number) {
  perPage.value = pp
  page.value = 1
  fetchTransactions()
}

async function refreshAll() {
  await Promise.all([fetchWallets(), fetchTransactions()])
  await summaryRef.value?.refresh()
}

async function deleteTransaction(tx: WalletTransaction) {
  const ok = await confirm({
    title: 'Hapus Transaksi',
    message: `Hapus transaksi Rp${formatCurrency(tx.amount)}?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/wallets/transactions/${tx.id}`)
    toast.success('Transaksi berhasil dihapus')
    await fetchTransactions()
    await summaryRef.value?.refresh()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus transaksi')
  }
}

async function openTransactionDetail(tx: WalletTransaction) {
  showTransactionDetail.value = true
  loadingTransactionDetail.value = true
  selectedTransaction.value = null

  try {
    const res = await api.get<{ data: WalletTransaction }>(`/wallets/transactions/${tx.id}`)
    selectedTransaction.value = res.data || tx
  }
  catch {
    selectedTransaction.value = tx
  }
  finally {
    loadingTransactionDetail.value = false
  }
}

async function resetFilters() {
  search.value = ''
  filterWalletIds.value = []
  filterType.value = ''
  filterDate.value = { from: '', to: '' }
  page.value = 1
  await fetchTransactions()
  await summaryRef.value?.refresh()
}

onMounted(async () => {
  await fetchWallets()
  await fetchTransactions()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">History Transaksi Wallet</h1>
        <p class="text-sm text-gray-500">Riwayat uang masuk dan keluar semua dompet.</p>
      </div>
      <NuxtLink
        to="/wallet"
        class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
      >
        <Wallet class="h-4 w-4" />
        Ringkasan Dompet
      </NuxtLink>
    </div>

    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="space-y-3 px-4 py-3">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari deskripsi transaksi / no referensi..."
              class="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              @input="onSearch"
            />
          </div>
          <button
            class="shrink-0 flex rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            :disabled="loading"
            title="Refresh data"
            @click="refreshAll"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          </button>
          <button
            class="shrink-0 flex rounded-lg border border-red-200 p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-700"
            :disabled="loading"
            title="Reset filters"
            @click="resetFilters"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <AppFilterSelect
            :model-value="filterWalletIds"
            :options="walletFilterOptions"
            multiple
            placeholder="Dompet"
            search-placeholder="Cari dompet..."
            @update:model-value="onWalletFilter"
          />
          <AppFilterSelect
            :model-value="filterType"
            :options="typeFilterOptions"
            :searchable="false"
            placeholder="Tipe"
            @update:model-value="onTypeFilter"
          />
          <AppDateRangePicker :model-value="filterDate" @update:model-value="onDateFilter" />
        </div>
      </div>
    </div>

    <AppWalletSummary
      ref="summaryRef"
      :wallet-ids="filterWalletIds"
      :type="filterType"
      :search="search"
      :date-from="filterDate.from"
      :date-to="filterDate.to"
    />

    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500 text-nowrap">
            <tr>
              <th class="px-4 py-2.5 text-left">Tanggal</th>
              <th class="px-4 py-2.5 text-left">Dompet</th>
              <th class="px-4 py-2.5 text-left">Keterangan</th>
              <th class="px-4 py-2.5 text-left">Referensi</th>
              <th class="px-4 py-2.5 text-center">Tipe</th>
              <th class="px-4 py-2.5 text-right">Nominal</th>
              <th class="px-4 py-2.5 text-right">Tindakan</th>
            </tr>
          </thead>

          <tbody v-if="loading">
            <tr v-for="i in 6" :key="i" class="border-b border-gray-100">
              <td v-for="j in 7" :key="j" class="px-4 py-3">
                <div class="h-4 w-24 animate-pulse rounded bg-gray-200" :class="j >= 6 ? 'ml-auto' : ''" />
              </td>
            </tr>
          </tbody>

          <tbody v-else-if="!transactions.length">
            <tr>
              <td colspan="7" class="px-4 py-16 text-center">
                <Wallet class="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p class="text-sm text-gray-500">Belum ada transaksi dengan filter saat ini.</p>
              </td>
            </tr>
          </tbody>

          <tbody v-else>
            <tr
              v-for="tx in transactions"
              :key="tx.id"
              class="border-b border-gray-100 transition-colors hover:bg-gray-50/50 last:border-b-0"
            >
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ formatDate(tx.created_at) }}</td>
              <td class="px-4 py-3 text-gray-700 whitespace-nowrap">{{ walletMap.get(tx.wallet_id)?.name || '-' }}</td>
              <td class="px-4 py-3 text-gray-700"><p class="line-clamp-2">{{ tx.description || '-' }}</p></td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ tx.reference_no || '-' }}</td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" :class="tx.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'">
                  <ArrowDownLeft v-if="tx.type === 'in'" class="h-3.5 w-3.5" />
                  <ArrowUpRight v-else class="h-3.5 w-3.5" />
                  {{ tx.type === 'in' ? 'Masuk' : 'Keluar' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right font-semibold whitespace-nowrap" :class="tx.type === 'in' ? 'text-emerald-600' : 'text-red-600'">
                {{ tx.type === 'in' ? '+' : '-' }}Rp{{ formatCurrency(tx.amount) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1.5">
                  <button class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" title="Detail" @click="openTransactionDetail(tx)">
                    <Eye class="h-4 w-4" />
                  </button>
                  <button v-if="tx.reference_id==''" class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Hapus" @click="deleteTransaction(tx)">
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

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showTransactionDetail" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="showTransactionDetail = false">
          <div class="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div class="border-b border-gray-100 px-6 py-4">
              <h2 class="text-lg font-semibold text-gray-900">Detail Transaksi</h2>
            </div>

            <div class="px-6 py-5">
              <div v-if="loadingTransactionDetail" class="flex items-center justify-center py-10">
                <Loader2 class="h-5 w-5 animate-spin text-gray-400" />
              </div>

              <div v-else-if="selectedTransaction" class="space-y-3 text-sm">
                <div class="flex justify-between gap-3"><span class="text-gray-500">Dompet</span><span class="font-medium text-gray-900">{{ walletMap.get(selectedTransaction.wallet_id)?.name || '-' }}</span></div>
                <div class="flex justify-between gap-3"><span class="text-gray-500">Tipe</span><span class="font-medium" :class="selectedTransaction.type === 'in' ? 'text-emerald-600' : 'text-red-600'">{{ selectedTransaction.type === 'in' ? 'Masuk' : 'Keluar' }}</span></div>
                <div class="flex justify-between gap-3"><span class="text-gray-500">Nominal</span><span class="font-semibold text-gray-900">Rp{{ formatCurrency(selectedTransaction.amount) }}</span></div>
                <div class="flex justify-between gap-3"><span class="text-gray-500">Tanggal</span><span class="font-medium text-gray-900">{{ formatDateTime(selectedTransaction.created_at) }}</span></div>
                <div class="flex justify-between gap-3"><span class="text-gray-500">Referensi</span><span class="font-medium text-gray-900">{{ selectedTransaction.reference_no || '-' }}</span></div>
                <div class="border-t border-gray-100 pt-3">
                  <p class="text-xs text-gray-500">Keterangan</p>
                  <p class="mt-1 text-sm text-gray-900">{{ selectedTransaction.description || '-' }}</p>
                </div>
              </div>
            </div>

            <div class="flex justify-end border-t border-gray-100 px-6 py-4">
              <button class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100" @click="showTransactionDetail = false">
                Tutup
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
