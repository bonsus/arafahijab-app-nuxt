<script setup lang="ts">
import {
  Search,
  Package, RefreshCw, X, CreditCard, Eye, Trash2,
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

interface ReceiptRef {
  id: string
  no: string
  customer: CustomerRef | null
}

interface AllocationRef {
  id: string
  purchase_prepayment_id: string
  amount: string
  purchase_prepayment: {
    id: string
    no: string
  } | null
}

interface Payment {
  id: string
  purchase_receipt_id: string
  wallet_id: string
  no: string
  date: string
  amount: string
  method: string
  note: string
  created_at: string
  wallet: WalletRef | null
  allocation: AllocationRef | null
  purchase_receipt: ReceiptRef | null
}

interface PaginatedPayment {
  data: Payment[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(true)
const payments = ref<Payment[]>([])
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
  { value: 'prepayment_allocation', label: 'Alokasi DP' },
]

const methodLabel: Record<string, string> = {
  transfer: 'Transfer',
  cash: 'Tunai',
  ewallet: 'E-Wallet',
  prepayment_allocation: 'Alokasi DP',
  other: 'Lainnya',
}

const tabs = [
  { key: 'payment', label: 'Pembayaran', to: '/purchase/payment' },
  { key: 'history', label: 'Riwayat Pembayaran', to: '/purchase/payment/history' },
  { key: 'prepayment', label: 'Prepayment', to: '/purchase/payment/prepayment' },
]

async function fetchPayments() {
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

    const res = await api.get<{ data: PaginatedPayment }>('/purchase-receipts/payment/index', params)
    payments.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch {
    payments.value = []
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
    fetchPayments()
  }, 300)
}

function onSupplierFilter(val: string | string[]) {
  filterSupplierIds.value = val as string[]
  page.value = 1
  fetchPayments()
}

function onWalletFilter(val: string | string[]) {
  filterWalletIds.value = val as string[]
  page.value = 1
  fetchPayments()
}

function onMethodFilter(val: string | string[]) {
  filterMethod.value = val as string[]
  page.value = 1
  fetchPayments()
}

function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1
  fetchPayments()
}

function onPageChange(p: number) {
  page.value = p
  fetchPayments()
}

function onPerPageChange(pp: number) {
  perPage.value = pp
  page.value = 1
  fetchPayments()
}

async function handleDelete(payment: Payment) {
  const ok = await confirm({
    title: 'Hapus Pembayaran',
    message: `Hapus pembayaran "${payment.no}" sebesar Rp${formatCurrency(Number(payment.amount))}?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/purchase-receipts/payment/${payment.id}`)
    toast.success('Pembayaran berhasil dihapus')
    await fetchPayments()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus pembayaran')
  }
}

function isAllocation(p: Payment): boolean {
  return p.method === 'prepayment_allocation' && !!p.allocation?.id
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
  await fetchPayments()
}

onMounted(() => {
  fetchPayments()
  fetchWallets()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Pembayaran Pembelian</h1>
        <p class="text-sm text-gray-500">Kelola pembayaran penerimaan barang.</p>
      </div>
    </div>

    <!-- Tabs & Filters -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <!-- Tabs -->
      <div class="flex items-center gap-0 overflow-x-auto border-b border-gray-200">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.key"
          :to="tab.to"
          class="relative shrink-0 whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors"
          :class="tab.key === 'history'
            ? 'text-primary-600'
            : 'text-gray-500 hover:text-gray-700'"
        >
          {{ tab.label }}
          <span
            v-if="tab.key === 'history'"
            class="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-primary-600"
          />
        </NuxtLink>
      </div>

      <!-- Filters -->
      <div class="space-y-3 px-4 py-3">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari no pembayaran, no GRN..."
              class="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              @input="onSearch"
            />
          </div>
          <button
            class="shrink-0 flex rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            title="Refresh data"
            :disabled="loading"
            @click="fetchPayments()"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          </button>
          <button
            class="shrink-0 flex rounded-lg border border-red-200 p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-700"
            title="Reset filters"
            :disabled="loading"
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

    <!-- Table -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500">
            <tr>
              <th class="px-4 py-2.5 text-left">No Pembayaran</th>
              <th class="px-4 py-2.5 text-left">No GRN</th>
              <th class="px-4 py-2.5 text-left">Supplier</th>
              <th class="px-4 py-2.5 text-left">Tanggal</th>
              <th class="px-4 py-2.5 text-left">Metode</th>
              <th class="px-4 py-2.5 text-left">Dompet</th>
              <th class="px-4 py-2.5 text-right">Jumlah</th>
              <th class="px-4 py-2.5 text-right">Tindakan</th>
            </tr>
          </thead>

          <!-- Loading -->
          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-gray-100">
              <td class="px-4 py-3"><div class="h-4 w-24 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-24 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-16 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="ml-auto h-4 w-24 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200" /></td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="!payments.length">
            <tr>
              <td colspan="8" class="px-4 py-16 text-center">
                <Package class="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p class="text-sm text-gray-500">
                  {{ search || filterSupplierIds.length || filterWalletIds.length || filterMethod.length ? 'Tidak ada data yang cocok dengan filter.' : 'Belum ada riwayat pembayaran.' }}
                </p>
              </td>
            </tr>
          </tbody>

          <!-- Rows -->
          <tbody v-else>
            <tr
              v-for="p in payments"
              :key="p.id"
              class="border-b border-gray-100 transition-colors hover:bg-gray-50/50 last:border-b-0"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    :class="isAllocation(p) ? 'bg-purple-50' : 'bg-green-50'"
                  >
                    <CreditCard class="h-4 w-4" :class="isAllocation(p) ? 'text-purple-600' : 'text-green-600'" />
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ p.no }}</p>
                    <span v-if="isAllocation(p) && p.allocation?.purchase_prepayment" class="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-600">Alokasi DP: {{ p.allocation.purchase_prepayment.no }}</span>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-700">
                <NuxtLink v-if="p.purchase_receipt" :to="`/purchase/receipt/${p.purchase_receipt.id}`" class="text-primary-600 hover:underline">
                  {{ p.purchase_receipt.no }}
                </NuxtLink>
                <span v-else>-</span>
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                {{ p.purchase_receipt?.customer?.name || '-' }}
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                {{ formatDate(p.date) }}
              </td>
              <td class="px-4 py-3">
                <span
                  class="rounded px-1.5 py-0.5 text-xs font-medium"
                  :class="isAllocation(p) ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-600'"
                >{{ methodLabel[p.method] || p.method }}</span>
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                {{ p.wallet?.name || '-' }}
              </td>
              <td class="px-4 py-3 text-right font-semibold whitespace-nowrap" :class="isAllocation(p) ? 'text-purple-600' : 'text-green-600'">
                Rp{{ formatCurrency(Number(p.amount)) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1.5">
                  <NuxtLink
                    v-if="p.purchase_receipt"
                    :to="`/purchase/receipt/${p.purchase_receipt.id}`"
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Detail GRN"
                  >
                    <Eye class="h-4 w-4" />
                  </NuxtLink>
                  <button
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Hapus"
                    @click="handleDelete(p)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
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
