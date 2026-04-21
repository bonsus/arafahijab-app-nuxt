<script setup lang="ts">
import {
  Search, ChevronLeft, ChevronRight,
  Package, RefreshCw, X, CreditCard, Eye, Trash2, ChevronDown, Plus,
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

interface PurchaseOrderRef {
  id: string
  no: string
  total: string
  status: string
  payment_status: string
  customer: CustomerRef | null
}

interface AllocationRef {
  id: string
  purchase_receipt_id: string
  purchase_payment_id: string
  date: string
  amount: string
  purchase_receipt: {
    id: string
    no: string
  } | null
}

interface Prepayment {
  id: string
  purchase_order_id: string
  wallet_id: string
  no: string
  date: string
  amount: string
  method: string
  note: string
  created_at: string
  purchase_order: PurchaseOrderRef | null
  allocations: AllocationRef[]
  wallet: WalletRef | null
}

interface PaginatedPrepayment {
  data: Prepayment[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(true)
const prepayments = ref<Prepayment[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)
const search = ref('')
const filterSupplierIds = ref<string[]>([])
const filterWalletIds = ref<string[]>([])
const filterDate = ref({ from: '', to: '' })
const recapRef = ref<{ refresh: () => Promise<void> } | null>(null)

const wallets = ref<WalletRef[]>([])
const loadingWallets = ref(false)

const walletOptions = computed(() =>
  wallets.value.map(w => ({ value: w.id, label: w.name })),
)

const methodLabel: Record<string, string> = {
  transfer: 'Transfer',
  cash: 'Tunai',
  ewallet: 'E-Wallet',
  other: 'Lainnya',
}

const tabs = [
  { key: 'payment', label: 'Pembayaran', to: '/purchase/payment' },
  { key: 'history', label: 'Riwayat Pembayaran', to: '/purchase/payment/history' },
  { key: 'prepayment', label: 'Prepayment', to: '/purchase/payment/prepayment' },
]

async function fetchPrepayments() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    if (filterSupplierIds.value.length) params.customer_id = filterSupplierIds.value.join(',')
    if (filterWalletIds.value.length) params.wallet_id = filterWalletIds.value.join(',')
    if (filterDate.value.from) {
      params.date_from = filterDate.value.from
      params.date_to = filterDate.value.to
    }

    const res = await api.get<{ data: PaginatedPrepayment }>('/purchases/payment/index', params)
    prepayments.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch {
    prepayments.value = []
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
    fetchPrepayments()
  }, 300)
}

function onSupplierFilter(val: string | string[]) {
  filterSupplierIds.value = val as string[]
  page.value = 1
  fetchPrepayments()
}

function onWalletFilter(val: string | string[]) {
  filterWalletIds.value = val as string[]
  page.value = 1
  fetchPrepayments()
}

function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1
  fetchPrepayments()
}

function goPage(p: number) {
  if (p < 1 || p > totalPage.value) return
  page.value = p
  fetchPrepayments()
}

const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, page.value - 2)
  const end = Math.min(totalPage.value, page.value + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('id-ID').format(val)
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.startsWith('0001')) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function calcAllocated(p: Prepayment): number {
  return (p.allocations || []).reduce((sum, a) => sum + Number(a.amount), 0)
}

function calcRemaining(p: Prepayment): number {
  return Number(p.amount) - calcAllocated(p)
}

async function handleDelete(prepayment: Prepayment) {
  const ok = await confirm({
    title: 'Hapus Prepayment',
    message: `Hapus prepayment "${prepayment.no}" sebesar Rp${formatCurrency(Number(prepayment.amount))}?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/purchases/payment/${prepayment.id}`)
    toast.success('Prepayment berhasil dihapus')
    await fetchPrepayments()
    await recapRef.value?.refresh()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus prepayment')
  }
}

const showCreateModal = ref(false)

async function onPrepaymentSaved() {
  await fetchPrepayments()
  await recapRef.value?.refresh()
}

// Expandable allocation rows
const expandedIds = ref<Set<string>>(new Set())

function toggleExpand(id: string) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  }
  else {
    expandedIds.value.add(id)
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
  filterDate.value = { from: '', to: '' }
  await fetchPrepayments()
}

onMounted(() => {
  fetchPrepayments()
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
      <button
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        @click="showCreateModal = true"
      >
        <Plus class="h-4 w-4" />
        Tambah Prepayment
      </button>
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
          :class="tab.key === 'prepayment'
            ? 'text-primary-600'
            : 'text-gray-500 hover:text-gray-700'"
        >
          {{ tab.label }}
          <span
            v-if="tab.key === 'prepayment'"
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
              placeholder="Cari no prepayment, no PO..."
              class="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              @input="onSearch"
            />
          </div>
          <button
            class="shrink-0 flex rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            title="Refresh data"
            :disabled="loading"
            @click="fetchPrepayments()"
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
          <AppDateRangePicker :model-value="filterDate" @update:model-value="onDateFilter" />
        </div>
      </div>
    </div>

    <AppPrepaymentRecap
      ref="recapRef"
      :search="search"
      :supplier-ids="filterSupplierIds"
      :wallet-ids="filterWalletIds"
      :date-from="filterDate.from"
      :date-to="filterDate.to"
    />

    <!-- Table -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-gray-200 bg-gray-50/80 text-xs font-medium uppercase tracking-wider text-gray-500">
            <tr>
              <th class="px-4 py-2.5 text-left">No Prepayment</th>
              <th class="px-4 py-2.5 text-left">No PO</th>
              <th class="px-4 py-2.5 text-left">Supplier</th>
              <th class="px-4 py-2.5 text-left">Tanggal</th> 
              <th class="px-4 py-2.5 text-left">Dompet</th>
              <th class="px-4 py-2.5 text-right">Jumlah</th>
              <th class="px-4 py-2.5 text-right">Teralokasi</th>
              <th class="px-4 py-2.5 text-right">Sisa</th>
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
              <td class="px-4 py-3"><div class="ml-auto h-4 w-24 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="ml-auto h-4 w-24 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="ml-auto h-4 w-24 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-3"><div class="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200" /></td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="!prepayments.length">
            <tr>
              <td colspan="9" class="px-4 py-16 text-center">
                <Package class="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p class="text-sm text-gray-500">
                  {{ search || filterSupplierIds.length ? 'Tidak ada data yang cocok dengan filter.' : 'Belum ada data prepayment.' }}
                </p>
              </td>
            </tr>
          </tbody>

          <!-- Rows -->
          <tbody v-else>
            <template
              v-for="p in prepayments"
              :key="p.id"
            >
              <tr
                class="border-b border-gray-100 transition-colors hover:bg-gray-50/50 cursor-pointer"
                :class="{ 'bg-gray-50/50': expandedIds.has(p.id) }"
                @click="p.allocations?.length ? toggleExpand(p.id) : undefined"
              >
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                      <CreditCard class="h-4 w-4 text-purple-600" />
                    </div>
                    <p class="font-medium text-gray-900">{{ p.no }}</p>
                    <ChevronDown
                      v-if="p.allocations?.length"
                      class="h-4 w-4 text-gray-400 transition-transform duration-200"
                      :class="{ 'rotate-180': expandedIds.has(p.id) }"
                    />
                  </div>
                </td>
              <td class="px-4 py-3 text-gray-700">
                <NuxtLink v-if="p.purchase_order" :to="`/purchase/order/${p.purchase_order.id}`" class="text-primary-600 hover:underline">
                  {{ p.purchase_order.no }}
                </NuxtLink>
                <span v-else>-</span>
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                {{ p.purchase_order?.customer?.name || '-' }}
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                {{ formatDate(p.date) }}
              </td> 
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {{ p.wallet?.name || '-' }}
              </td>
              <td class="px-4 py-3 text-right font-semibold text-purple-600 whitespace-nowrap">
                Rp{{ formatCurrency(Number(p.amount)) }}
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <span
                  v-if="p.allocations?.length"
                  class="text-emerald-600 font-medium"
                >
                  Rp{{ formatCurrency(calcAllocated(p)) }}
                </span>
                <span v-else class="text-gray-400">Rp0</span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <span :class="calcRemaining(p) <= 0 ? 'text-green-600' : 'text-orange-600 font-medium'">
                  Rp{{ formatCurrency(calcRemaining(p)) }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1.5">
                  <NuxtLink
                    v-if="p.purchase_order"
                    :to="`/purchase/order/${p.purchase_order.id}`"
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Detail PO"
                    @click.stop
                  >
                    <Eye class="h-4 w-4" />
                  </NuxtLink>
                  <button
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Hapus"
                    @click.stop="handleDelete(p)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
              </tr>

              <!-- Expanded allocation rows -->
              <tr v-if="expandedIds.has(p.id) && p.allocations?.length">
                <td colspan="9" class="bg-gray-50/80 px-4 py-0">
                  <div class="py-3 pl-10">
                    <p class="mb-2 text-xs font-medium uppercase text-gray-400">Alokasi ke Penerimaan</p>
                    <div class="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                      <div
                        v-for="alloc in p.allocations"
                        :key="alloc.id"
                        class="flex items-center gap-3 px-4 py-2.5"
                      >
                        <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                          <CreditCard class="h-3.5 w-3.5 text-emerald-500" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <NuxtLink
                            v-if="alloc.purchase_receipt?.id"
                            :to="`/purchase/receipt/${alloc.purchase_receipt.id}`"
                            class="text-sm font-medium text-primary-600 hover:underline"
                            @click.stop
                          >
                            {{ alloc.purchase_receipt.no }}
                          </NuxtLink>
                          <span v-else class="text-sm text-gray-500">-</span>
                          <p class="text-xs text-gray-400">{{ formatDate(alloc.date) }}</p>
                        </div>
                        <p class="shrink-0 text-sm font-semibold text-emerald-600">Rp{{ formatCurrency(Number(alloc.amount)) }}</p>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="!loading && totalPage > 1"
        class="flex flex-col items-center gap-3 border-t border-gray-200 bg-gray-50/50 px-4 py-3 sm:flex-row sm:justify-between"
      >
        <p class="text-xs text-gray-500">
          Halaman {{ page }} dari {{ totalPage }} &middot; {{ total }} data
        </p>
        <div class="flex items-center gap-1">
          <button
            :disabled="page <= 1"
            class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-gray-600 disabled:opacity-40"
            @click="goPage(page - 1)"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <button
            v-for="pg in visiblePages"
            :key="pg"
            class="min-w-[32px] rounded-lg px-2.5 py-1 text-sm font-medium transition-colors"
            :class="pg === page ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'"
            @click="goPage(pg)"
          >
            {{ pg }}
          </button>
          <button
            :disabled="page >= totalPage"
            class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-gray-600 disabled:opacity-40"
            @click="goPage(page + 1)"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Create Prepayment Modal -->
    <AppPrepaymentModal v-model="showCreateModal" @saved="onPrepaymentSaved" />
  </div>
</template>
