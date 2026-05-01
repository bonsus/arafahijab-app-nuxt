<script setup lang="ts">
import {
  Search,
  Package, RefreshCw, X, Wallet, Trash2,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface WalletRef {
  id: string
  name: string
}

interface CustomerRef {
  id: string
  name: string
}

interface ReturnRef {
  id: string
  no: string
  customer: CustomerRef | null
}

interface RefundPayment {
  id: string
  purchase_return_id: string
  wallet_id: string
  no: string
  date: string
  amount: string
  method: string
  note: string
  created_at: string
  wallet: WalletRef | null
  purchase_return: ReturnRef | null
}

interface PaginatedRefund {
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
const filterSupplierIds = ref<string[]>([])
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

const tabs = [
  { key: 'return', label: 'Retur Pembelian', to: '/purchase/return' },
  { key: 'refund', label: 'Refund', to: '/purchase/return/refund' },
]

async function fetchRefunds() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    if (filterSupplierIds.value.length) params.customer_id = filterSupplierIds.value.join(',')
    if (filterWalletIds.value.length) params.wallet_id = filterWalletIds.value.join(',')
    if (filterMethod.value.length) params.method = filterMethod.value.join(',')
    if (filterDate.value.from) {
      params.date_from = filterDate.value.from
      params.date_to = filterDate.value.to
    }

    const res = await api.get<{ data: PaginatedRefund }>('/purchase-returns/payment/index', params)
    refunds.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch {
    refunds.value = []
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
    fetchRefunds()
  }, 300)
}

function onSupplierFilter(val: string | string[]) {
  filterSupplierIds.value = val as string[]
  page.value = 1
  fetchRefunds()
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

async function handleDelete(refund: RefundPayment) {
  const ok = await confirm({
    title: 'Hapus Refund',
    message: `Hapus refund "${refund.no}" sebesar Rp${formatCurrency(Number(refund.amount))}?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/purchase-returns/payment/${refund.id}`)
    toast.success('Refund berhasil dihapus')
    await fetchRefunds()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus refund')
  }
}

async function fetchWallets() {
  loadingWallets.value = true
  try {
    const res = await api.get<{ data: WalletRef[] }>('/wallets/index')
    wallets.value = (res.data || []).filter((w: any) => w.status === 'active')
  }
  catch {
    wallets.value = []
  }
  finally {
    loadingWallets.value = false
  }
}

async function resetFilters() {
  search.value = ''
  filterSupplierIds.value = []
  filterWalletIds.value = []
  filterMethod.value = []
  filterDate.value = { from: '', to: '' }
  await fetchRefunds()
}

onMounted(() => {
  fetchRefunds()
  fetchWallets()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Refund Retur Pembelian</h1>
        <p class="text-sm text-gray-500">Kelola pembayaran refund untuk retur pembelian.</p>
      </div>
    </div>

    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="flex items-center gap-0 overflow-x-auto border-b border-gray-200">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.key"
          :to="tab.to"
          class="relative shrink-0 whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors"
          :class="tab.key === 'refund' ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'"
        >
          {{ tab.label }}
          <span
            v-if="tab.key === 'refund'"
            class="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-primary-600"
          />
        </NuxtLink>
      </div>

      <div class="space-y-3 px-4 py-3">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari no refund, catatan..."
              class="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              @input="onSearch"
            />
          </div>
          <button
            class="shrink-0 flex rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            :disabled="loading"
            title="Refresh data"
            @click="fetchRefunds()"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          </button>
          <button
            class="shrink-0 flex rounded-lg border border-red-200 p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-700"
            :disabled="loading"
            title="Reset filters"
            @click="resetFilters()"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <AppSupplierFilter
            :model-value="filterSupplierIds"
            @update:model-value="onSupplierFilter"
          />
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
        </div>
      </div>
    </div>

    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500 text-nowrap">
            <tr>
              <th class="px-4 py-2.5 text-left">No Refund</th>
              <th class="px-4 py-2.5 text-left">No Return</th>
              <th class="px-4 py-2.5 text-left">Supplier</th>
              <th class="px-4 py-2.5 text-left">Tanggal</th>
              <th class="px-4 py-2.5 text-left">Metode</th>
              <th class="px-4 py-2.5 text-left">Dompet</th>
              <th class="px-4 py-2.5 text-right">Jumlah</th>
              <th class="px-4 py-2.5 text-left">Catatan</th>
              <th class="px-4 py-2.5 text-right">Tindakan</th>
            </tr>
          </thead>

          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-gray-100">
              <td v-for="j in 9" :key="j" class="px-4 py-3">
                <div class="h-4 w-20 animate-pulse rounded bg-gray-200" :class="j === 7 || j === 9 ? 'ml-auto' : ''" />
              </td>
            </tr>
          </tbody>

          <tbody v-else-if="!refunds.length">
            <tr>
              <td colspan="9" class="px-4 py-16 text-center">
                <Package class="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p class="text-sm text-gray-500">
                  {{ search || filterSupplierIds.length || filterWalletIds.length || filterMethod.length ? 'Tidak ada data yang cocok dengan filter.' : 'Belum ada data refund.' }}
                </p>
              </td>
            </tr>
          </tbody>

          <tbody v-else>
            <tr
              v-for="r in refunds"
              :key="r.id"
              class="border-b border-gray-100 transition-colors hover:bg-gray-50/50 last:border-b-0"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                    <Wallet class="h-4 w-4 text-emerald-600" />
                  </div>
                  <span class="font-medium text-gray-900">{{ r.no }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-700">{{ r.purchase_return?.no || '-' }}</td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ r.purchase_return?.customer?.name || '-' }}</td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ formatDate(r.date) }}</td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ methodLabel[r.method] || r.method }}</td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ r.wallet?.name || '-' }}</td>
              <td class="px-4 py-3 text-right font-semibold text-emerald-600 whitespace-nowrap">Rp{{ formatCurrency(Number(r.amount)) }}</td>
              <td class="px-4 py-3 text-gray-500">{{ r.note || '-' }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Hapus"
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
