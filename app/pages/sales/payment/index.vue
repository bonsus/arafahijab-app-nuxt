<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Search, Eye, Loader2, DollarSign, CheckCircle, XCircle, Ban, X as XIcon, RefreshCw, Download } from 'lucide-vue-next'
import { formatCurrency, formatDate } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const toast = useToast()

const loading = ref(false)
const payments = ref<any[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

const search = ref('')
const filterDate = ref({ from: '', to: '' })
const filterStores = ref<string[]>([])
const filterCod = ref<string[]>([])
const filterStatus = ref<string[]>([])

const exporting = ref(false)

async function exportData() {
  if (exporting.value) return
  exporting.value = true
  try {
    const params: Record<string, string> = {}
    if (search.value) params.search = search.value
    if (filterDate.value.from) {
      params.date_from = filterDate.value.from
      params.date_to = filterDate.value.to
    }
    if (filterStores.value.length) params.store_id = filterStores.value.join(',')
    if (filterCod.value.length) params.cod = filterCod.value.join(',')
    if (filterStatus.value.length) params.status = filterStatus.value.join(',')

    const endpoint = '/sales/order-payment-export/payment'
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
    const name = (endpoint.split('/').pop() || 'payment').replace(/-/g, '_')
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

const showLightbox = ref(false)
const lightboxUrl = ref('')
const showCancelModal = ref(false)
const selectedPayment = ref<any>(null)
const cancelling = ref(false)

const summaryOrderId = ref<string | null>(null)

function openOrderSummary(orderId: string) {
  if (orderId) summaryOrderId.value = orderId
}

const tabs = [
  { key: 'payments', label: 'Pembayaran Diterima', to: '/sales/payment' }, 
  { key: 'confirmations', label: 'Konfirmasi Pembayaran', to: '/sales/payment/confirmation' },
]

const statusConfig: Record<string, { label: string; bg: string }> = {
  done: { label: 'Selesai', bg: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  canceled: { label: 'Dibatalkan', bg: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
}

const codOptions = [
  { value: 'yes', label: 'COD' },
  { value: 'no', label: 'Non-COD' },
]

const statusFilterOptions = [
  { value: 'done', label: 'Selesai' },
  { value: 'canceled', label: 'Dibatalkan' },
]

const stores = ref<{ id: string; shop_name: string }[]>([])
const loadingStores = ref(false)

const storeOptions = computed(() =>
  stores.value.map(s => ({ value: s.id, label: s.shop_name })),
)

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    if (filterDate.value.from) {
      params.date_from = filterDate.value.from
      params.date_to = filterDate.value.to
    }
    if (filterStores.value.length) params.store_id = filterStores.value.join(',')
    if (filterCod.value.length) params.cod = filterCod.value.join(',')
    if (filterStatus.value.length) params.status = filterStatus.value.join(',')
    
    const res = await api.get<{ data: any }>('/sales/orders/payments/index', params)
    payments.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  } catch (err: any) {
    toast.error(err.message || 'Gagal memuat data')
    payments.value = []
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  search.value = ''
  filterDate.value = { from: '', to: '' }
  filterStores.value = []
  filterCod.value = []
  filterStatus.value = []
  page.value = 1
  fetchData()
}

function onPageChange(newPage: number) {
  page.value = newPage
  fetchData()
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchData()
  }, 300)
}

function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1
  fetchData()
}

function onStoreFilter(val: string | string[]) {
  filterStores.value = Array.isArray(val) ? val : [val]
  page.value = 1
  fetchData()
}

function onCodFilter(val: string | string[]) {
  filterCod.value = Array.isArray(val) ? val : [val]
  page.value = 1
  fetchData()
}

function onStatusFilter(val: string | string[]) {
  filterStatus.value = Array.isArray(val) ? val : [val]
  page.value = 1
  fetchData()
}

async function fetchStores(searchQuery?: string) {
  loadingStores.value = true
  try {
    const params: Record<string, string> = {}
    if (searchQuery) params.search = searchQuery
    const res = await api.get<{ data: any }>('/stores/public/index', params)
    stores.value = (res.data?.data || res.data || []) as { id: string; shop_name: string }[]
  } catch {
    stores.value = []
  } finally {
    loadingStores.value = false
  }
}

function openLightbox(url: string) {
  lightboxUrl.value = url
  showLightbox.value = true
}

function closeLightbox() {
  showLightbox.value = false
  lightboxUrl.value = ''
}

function openCancelModal(payment: any) {
  selectedPayment.value = payment
  showCancelModal.value = true
}

function closeCancelModal() {
  showCancelModal.value = false
  selectedPayment.value = null
}

async function cancelPayment() {
  if (!selectedPayment.value) return
  
  cancelling.value = true
  try {
    await api.post(`/sales/orders/payments/${selectedPayment.value.id}/cancel`)
    toast.success('Pembayaran berhasil dibatalkan')
    closeCancelModal()
    fetchData()
  } catch (err: any) {
    toast.error(err.message || 'Gagal membatalkan pembayaran')
  } finally {
    cancelling.value = false
  }
}

onMounted(() => {
  fetchData()
  fetchStores()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Manajemen Pembayaran</h1>
        <p class="text-sm text-gray-500">Kelola konfirmasi dan pembayaran dari pelanggan.</p>
      </div> 
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-gray-200">
      <NuxtLink
        v-for="tab in tabs"
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

    <!-- Summary -->
    <AppPaymentSummary
      :search="search"
      :status="filterStatus.join(',')"
      :store-ids="filterStores.join(',')"
      :cod="filterCod.join(',')"
      :date-from="filterDate.from"
      :date-to="filterDate.to"
    />

    <!-- Filters -->
    <div class="rounded-xl">
      <div class="space-y-3">
        <!-- Search + Actions -->
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari nomor order atau nama pelanggan..."
              class="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              @input="onSearch"
            />
          </div>
          <AppFilterSelect
            :model-value="filterStores"
            :options="storeOptions"
            :loading="loadingStores"
            multiple
            placeholder="Toko"
            search-placeholder="Cari toko..."
            @update:model-value="onStoreFilter"
            @search="fetchStores"
          />
          <AppFilterSelect
            :model-value="filterCod"
            :options="codOptions"
            multiple
            :searchable="false"
            placeholder="COD"
            @update:model-value="onCodFilter"
          />
          <AppFilterSelect
            :model-value="filterStatus"
            :options="statusFilterOptions"
            multiple
            :searchable="false"
            placeholder="Status"
            @update:model-value="onStatusFilter"
          />
          <AppDateRangePicker
            :model-value="filterDate"
            @update:model-value="onDateFilter"
          />
          <button
            class="flex shrink-0 rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            title="Refresh data"
            :disabled="loading"
            @click="fetchData()"
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
            class="flex shrink-0 rounded-lg border border-red-200 p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-700"
            title="Reset filters"
            :disabled="loading"
            @click="resetFilters()"
          >
            <XIcon class="h-4 w-4" />
          </button>
        </div>
 
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <div v-if="loading" class="flex items-center justify-center py-16">
        <Loader2 class="h-8 w-8 animate-spin text-gray-400" />
      </div>

      <div v-else-if="payments.length === 0" class="py-16 text-center">
        <CheckCircle class="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <p class="text-sm text-gray-500">Belum ada pembayaran yang diterima</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-600">
            <tr>
              <th class="px-4 py-3 text-left">No. Pembayaran</th>
              <th class="px-4 py-3 text-left">No. Order</th>
              <th class="px-4 py-3 text-left">Pelanggan</th>
              <th class="px-4 py-3 text-left">Tanggal</th>
              <th class="px-4 py-3 text-right">Jumlah</th>
              <th class="px-4 py-3 text-left">Metode</th>
              <th class="px-4 py-3 text-left">Rekening</th>
              <th class="px-4 py-3 text-left">Status</th>
              <th class="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 text-sm">
            <tr v-for="item in payments" :key="item.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <NuxtLink
                  :to="`/sales/payment/${item.id}`"
                  class="text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  {{ item.no || '-' }}
                </NuxtLink>
              </td>
              <td class="px-4 py-3">
                <button
                  v-if="item.order?.id"
                  type="button"
                  class="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                  @click="openOrderSummary(item.order.id)"
                >
                  {{ item.order?.no || '-' }}
                </button>
                <span v-else class="text-xs font-semibold text-gray-400">{{ item.order?.no || '-' }}</span>
              </td>
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900">{{ item.customer?.name || '-' }}</div>
                <div class="text-xs text-gray-500">{{ item.customer?.phone || '-' }}</div>
              </td>
              <td class="px-4 py-3 text-gray-600">
                {{ formatDate(item.date) }}
              </td>
              <td class="px-4 py-3 text-right font-semibold text-gray-900">
                Rp{{ formatCurrency(Number(item.amount)) }}
                <div v-if="item.amount !== item.actual_amount" class="text-xs font-normal text-gray-500">
                  (Rp{{ formatCurrency(Number(item.actual_amount)) }})
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="text-gray-900">{{ item.method }}</div>
                <div class="text-xs text-gray-500">{{ item.provider }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="text-gray-900">{{ item.bank_name }}</div>
                <div class="text-xs text-gray-500">{{ item.account_number }}</div>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="statusConfig[item.status]?.bg || 'bg-gray-50 text-gray-700 ring-1 ring-gray-200'"
                >
                  {{ statusConfig[item.status]?.label || item.status }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    v-if="item.file"
                    type="button"
                    class="inline-flex rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-primary-600"
                    title="Lihat Bukti"
                    @click="openLightbox(item.file)"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  <button
                    v-if="item.status === 'done'"
                    type="button"
                    class="inline-flex rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Batalkan Pembayaran"
                    @click="openCancelModal(item)"
                  >
                    <Ban class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPage > 1" class="border-t border-gray-200 bg-gray-50 px-4 py-3">
        <AppPagination
          :page="page"
          :total-page="totalPage"
          :total="total"
          :per-page="perPage"
          @update:page="onPageChange"
        />
      </div>
    </div>

    <!-- Cancel Modal -->
    <Teleport to="body">
      <div
        v-if="showCancelModal && selectedPayment"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        @click.self="closeCancelModal"
      >
        <div class="flex w-full max-w-md flex-col rounded-xl bg-white shadow-2xl max-h-[90vh]" @click.stop>
          <div class="shrink-0 border-b border-gray-200 px-6 py-4">
            <h3 class="text-lg font-semibold text-gray-900">Batalkan Pembayaran</h3>
          </div>

          <div class="space-y-4 overflow-y-auto p-6">
            <div class="space-y-2.5 rounded-lg bg-gray-50 p-4 text-sm ring-1 ring-gray-200">
              <div class="flex items-center justify-between">
                <span class="text-gray-600">No. Pembayaran</span>
                <span class="font-mono text-xs font-semibold text-gray-600">{{ selectedPayment.no }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">No. Order</span>
                <span class="font-mono text-xs font-semibold text-primary-600">{{ selectedPayment.order?.no }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">Pelanggan</span>
                <span class="font-medium text-gray-900">{{ selectedPayment.customer?.name }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">Jumlah</span>
                <span class="font-bold text-gray-900">Rp{{ formatCurrency(Number(selectedPayment.amount)) }}</span>
              </div>
            </div>

            <div class="rounded-lg border bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
              <Ban class="mr-1.5 inline h-4 w-4" />
              Pembayaran akan dibatalkan dan status order dikembalikan ke <strong>UNPAID</strong>
            </div>
          </div>

          <div class="shrink-0 flex gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">
            <button
              type="button"
              class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="cancelling"
              @click="closeCancelModal"
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="cancelling"
              class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="cancelPayment"
            >
              <Loader2 v-if="cancelling" class="h-4 w-4 animate-spin" />
              {{ cancelling ? 'Memproses...' : 'Batalkan Pembayaran' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Order Summary Modal -->
    <AppOrderSummaryModal :order-id="summaryOrderId" @close="summaryOrderId = null" />

    <!-- Lightbox -->
    <Teleport to="body">
      <div
        v-if="showLightbox"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
        @click="closeLightbox"
      >
        <button
          type="button"
          class="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          @click="closeLightbox"
        >
          <XIcon class="h-6 w-6" />
        </button>
        <img
          v-if="lightboxUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)"
          :src="lightboxUrl"
          alt="Preview"
          class="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          @click.stop
        />
        <iframe
          v-else
          :src="lightboxUrl"
          class="h-[90vh] w-[90vw] rounded-lg bg-white"
          @click.stop
        />
      </div>
    </Teleport>
  </div>
</template>
