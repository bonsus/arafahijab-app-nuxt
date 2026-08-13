<script setup lang="ts">
import {
  Receipt, RefreshCw, Search, X, Inbox, FileText, ChevronRight,
} from 'lucide-vue-next'
import { formatCurrency, formatDate } from '~/composables/useFormatters'
import { invoiceBadge } from '~/composables/useBilling'
import type { Invoice, Paginated } from '~/types'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const toast = useToast()

const items = ref<Invoice[]>([])
const listLoading = ref(true)
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

const fSearch = ref('')
const fStatus = ref('')

const statusOptions = [
  { value: '', label: 'Semua Status' },
  { value: 'open', label: 'Belum Dibayar' },
  { value: 'paid', label: 'Lunas' },
  { value: 'expired', label: 'Kedaluwarsa' },
  { value: 'void', label: 'Dibatalkan' },
]

async function fetchList() {
  listLoading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      perpage: String(perPage.value),
    }
    if (fSearch.value) params.search = fSearch.value
    if (fStatus.value) params.status = fStatus.value

    const res = await api.get<{ data: Paginated<Invoice> }>('/billing/invoices', params)
    items.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch (e: any) {
    items.value = []
    toast.error(e?.message || 'Gagal memuat invoice')
  }
  finally {
    listLoading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchList() }, 350)
}

function applyFilter() {
  page.value = 1
  fetchList()
}

function clearFilters() {
  fSearch.value = ''
  fStatus.value = ''
  applyFilter()
}

const hasActiveFilter = computed(() => !!(fSearch.value || fStatus.value))

function onPageChange(p: number) {
  page.value = p
  fetchList()
}

function onPerPageChange(pp: number) {
  perPage.value = pp
  page.value = 1
  fetchList()
}

onMounted(() => {
  fetchList()
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Receipt class="h-5 w-5 text-primary-600" />
          Invoice
        </h1>
        <p class="mt-0.5 text-sm text-gray-500">Daftar tagihan langganan &amp; status pembayaran</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
        :disabled="listLoading"
        @click="fetchList"
      >
        <RefreshCw :class="['h-3.5 w-3.5', listLoading && 'animate-spin']" />
        Refresh
      </button>
    </div>

    <BillingTabs />

    <!-- Records -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
        <div class="relative min-w-[240px] flex-1">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="fSearch"
            type="text"
            placeholder="Cari nomor invoice"
            class="w-full rounded-lg border border-gray-300 py-1.5 pl-10 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
            @input="onSearch"
          />
          <button
            v-if="fSearch"
            type="button"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
            @click="fSearch = ''; applyFilter()"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>

        <select
          v-model="fStatus"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
          @change="applyFilter"
        >
          <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>

        <button
          v-if="hasActiveFilter"
          type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          @click="clearFilters"
        >
          <X class="h-3.5 w-3.5 text-red-500" /> Reset
        </button>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[800px] text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
              <th class="px-4 py-3 text-left">Nomor Invoice</th>
              <th class="px-4 py-3 text-left">Paket</th>
              <th class="px-4 py-3 text-left">Status</th>
              <th class="px-4 py-3 text-right">Total</th>
              <th class="px-4 py-3 text-left">Jatuh Tempo</th>
              <th class="px-4 py-3 text-left">Dibayar</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody v-if="listLoading">
            <tr v-for="i in 8" :key="i" class="border-b border-gray-100">
              <td v-for="j in 7" :key="j" class="px-4 py-3">
                <div class="h-4 animate-pulse rounded bg-gray-200" :class="j === 1 ? 'w-32' : 'w-20'" />
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="!items.length">
            <tr>
              <td colspan="7" class="px-4 py-16 text-center">
                <Inbox class="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p class="text-sm text-gray-500">Belum ada invoice</p>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr
              v-for="item in items"
              :key="item.id"
              class="cursor-pointer border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50"
              @click="$router.push(`/billing/invoice/${item.id}`)"
            >
              <td class="px-4 py-3">
                <span class="flex items-center gap-2 font-medium text-gray-900">
                  <FileText class="h-4 w-4 text-gray-400" />
                  {{ item.invoice_number }}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-700">{{ item.plan_name || '-' }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="invoiceBadge(item.status).cls">
                  {{ invoiceBadge(item.status).label }}
                </span>
              </td>
              <td class="px-4 py-3 text-right font-semibold text-gray-900">{{ formatCurrency(item.total) }}</td>
              <td class="px-4 py-3 whitespace-nowrap text-gray-600">{{ formatDate(item.due_date) }}</td>
              <td class="px-4 py-3 whitespace-nowrap text-gray-600">{{ item.paid_at ? formatDate(item.paid_at) : '-' }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end">
                  <ChevronRight class="h-4 w-4 text-gray-400" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <AppPagination
        v-if="!listLoading && totalPage > 0"
        :page="page"
        :total-page="totalPage"
        :total="total"
        :per-page="perPage"
        :loading="listLoading"
        @update:page="onPageChange"
        @update:per-page="onPerPageChange"
      />
    </div>
  </div>
</template>
