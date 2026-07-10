<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, CheckCircle, XCircle, Eye, Loader2, FileCheck, DollarSign, X as XIcon, RefreshCw, Download } from 'lucide-vue-next'
import { formatCurrency, formatDate } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

const router = useRouter()
const api = useApi()
const toast = useToast()

const loading = ref(false)
const confirmations = ref<any[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

const search = ref('')
const filterStatus = ref<string[]>([])
const filterDate = ref({ from: '', to: '' })

const exporting = ref(false)

async function exportData() {
  if (exporting.value) return
  exporting.value = true
  try {
    const params: Record<string, string> = {}
    if (search.value) params.search = search.value
    if (filterStatus.value.length) params.status = filterStatus.value.join(',')
    if (filterDate.value.from) {
      params.date_from = formatDateFromForApi(filterDate.value.from)
      params.date_to = formatDateToForApi(filterDate.value.to)
    }

    const endpoint = '/sales/order-payment-export/payment-confirmation'
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
    const name = (endpoint.split('/').pop() || 'payment_confirmation').replace(/-/g, '_')
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

const showReviewModal = ref(false)
const selectedConfirmation = ref<any>(null)
const reviewAction = ref<'approved' | 'rejected' | ''>('')
const processing = ref(false)

// Banks for "to bank" selection
const banks = ref<any[]>([])
const banksLoading = ref(false)
const approveForm = reactive({
  to_bank_id: '',
  actual_amount: 0,
})

const bankOptions = computed(() =>
  banks.value.map(b => ({
    value: String(b.id),
    label: `${b.bank_name} - ${b.account_number} (${b.account_name})`,
  })),
)

async function fetchBanks() {
  if (banks.value.length || banksLoading.value) return
  banksLoading.value = true
  try {
    const res = await api.get<{ data: any[] }>('/banks/index')
    banks.value = (res.data || []).filter((b: any) => b.status === 'active')
  } catch {
    banks.value = []
  } finally {
    banksLoading.value = false
  }
}

const showLightbox = ref(false)
const lightboxUrl = ref('')

const summaryOrderId = ref<string | null>(null)

function openOrderSummary(orderId: string) {
  if (orderId) summaryOrderId.value = orderId
}

const tabs = [
  { key: 'payments', label: 'Pembayaran Diterima', to: '/sales/payment' },
  { key: 'confirmations', label: 'Konfirmasi Pembayaran', to: '/sales/payment/confirmation' },
]

const statusOptions = [
  { value: 'pending', label: 'Menunggu' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'rejected', label: 'Ditolak' },
]

const statusConfig: Record<string, { label: string; bg: string }> = {
  pending: { label: 'Menunggu', bg: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  approved: { label: 'Disetujui', bg: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  rejected: { label: 'Ditolak', bg: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
}

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (search.value) params.search = search.value
    if (filterStatus.value.length) params.status = filterStatus.value.join(',')
    if (filterDate.value.from) {
      params.date_from = formatDateFromForApi(filterDate.value.from)
      params.date_to = formatDateToForApi(filterDate.value.to)
    }
    
    const res = await api.get<{ data: any }>('/sales/orders/payment-confirmations/index', params)
    confirmations.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  } catch (err: any) {
    toast.error(err.message || 'Gagal memuat data')
    confirmations.value = []
  } finally {
    loading.value = false
  }
}

function openReviewModal(item: any, action: 'approved' | 'rejected') {
  selectedConfirmation.value = item
  reviewAction.value = action
  if (action === 'approved') {
    approveForm.to_bank_id = item.to_bank_id ? String(item.to_bank_id) : ''
    approveForm.actual_amount = Number(item.amount) || 0
    fetchBanks()
  }
  showReviewModal.value = true
}

function closeReviewModal() {
  showReviewModal.value = false
  selectedConfirmation.value = null
  reviewAction.value = ''
  approveForm.to_bank_id = ''
  approveForm.actual_amount = 0
}

async function confirmAction() {
  if (!selectedConfirmation.value || !reviewAction.value) return

  if (reviewAction.value === 'approved') {
    if (!approveForm.to_bank_id) {
      toast.error('Pilih bank tujuan terlebih dahulu')
      return
    }
    if (!approveForm.actual_amount || approveForm.actual_amount <= 0) {
      toast.error('Jumlah aktual harus lebih dari 0')
      return
    }
  }

  processing.value = true
  try {
    const payload: Record<string, any> = {
      id: selectedConfirmation.value.id,
      status: reviewAction.value,
    }
    if (reviewAction.value === 'approved') {
      payload.to_bank_id = Number(approveForm.to_bank_id) || approveForm.to_bank_id
      payload.actual_amount = Number(approveForm.actual_amount)
    }
    await api.post('/sales/orders/payment-confirmations/update-status', payload)
    toast.success(`Konfirmasi pembayaran berhasil ${reviewAction.value === 'approved' ? 'disetujui' : 'ditolak'}`)
    closeReviewModal()
    fetchData()
  } catch (err: any) {
    toast.error(err.message || 'Gagal memproses konfirmasi')
  } finally {
    processing.value = false
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

function resetFilters() {
  search.value = ''
  filterStatus.value = []
  filterDate.value = { from: '', to: '' }
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

function onStatusFilter(val: string | string[]) {
  filterStatus.value = Array.isArray(val) ? val : [val]
  page.value = 1
  fetchData()
}

function onDateFilter(val: { from: string; to: string }) {
  filterDate.value = val
  page.value = 1
  fetchData()
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Manajemen Pembayaran</h1>
        <p class="mt-1 text-sm text-gray-500">Kelola konfirmasi dan pembayaran dari pelanggan</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-gray-200">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.key"
        :to="tab.to"
        class="px-4 py-2.5 text-sm font-medium transition-colors"
        :class="tab.key === 'confirmations' 
          ? 'border-b-2 border-primary-600 text-primary-600' 
          : 'text-gray-600 hover:text-gray-900'"
      >
        {{ tab.label }}
      </NuxtLink>
    </div>

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
            :model-value="filterStatus"
            :options="statusOptions"
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

      <div v-else-if="confirmations.length === 0" class="py-16 text-center">
        <FileCheck class="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <p class="text-sm text-gray-500">Belum ada konfirmasi pembayaran</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-600">
            <tr>
              <th class="px-4 py-3 text-left">No. Order</th>
              <th class="px-4 py-3 text-left">Pelanggan</th>
              <th class="px-4 py-3 text-left">Tgl Transfer</th>
              <th class="px-4 py-3 text-right">Jumlah</th>
              <th class="px-4 py-3 text-left">Dari</th>
              <th class="px-4 py-3 text-left">Ke</th>
              <th class="px-4 py-3 text-left">Status</th>
              <th class="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 text-sm">
            <tr v-for="item in confirmations" :key="item.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <button
                  v-if="item.order?.id || item.order_id"
                  type="button"
                  class="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                  @click="openOrderSummary(item.order?.id || item.order_id)"
                >
                  {{ item.order?.no || '-' }}
                </button>
                <span v-else class="text-xs font-semibold text-gray-400">{{ item.order?.no || '-' }}</span>
              </td>
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900">{{ item.customer?.name || '-' }}</div>
                <div class="text-xs text-gray-500">{{ item.customer?.phone || '-' }}</div>
              </td>
              <td class="px-4 py-3 text-gray-600 text-xs">
                {{ formatDateTime(item.payment_date) }}
              </td>
              <td class="px-4 py-3 text-right font-semibold text-gray-900">
                Rp{{ formatCurrency(Number(item.amount)) }}
              </td>
              <td class="px-4 py-3">
                <div class="text-gray-900">{{ item.from_name }}</div>
                <div class="text-xs text-gray-500">{{ item.from_bank }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="text-gray-900">{{ item.to_name }}</div>
                <div class="text-xs text-gray-500">{{ item.to_bank }} - {{ item.to_account }}</div>
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
                  <template v-if="item.status === 'pending'">
                    <button
                      type="button"
                      class="inline-flex rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-green-50 hover:text-green-600"
                      title="Setujui"
                      @click="openReviewModal(item, 'approved')"
                    >
                      <CheckCircle class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="inline-flex rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Tolak"
                      @click="openReviewModal(item, 'rejected')"
                    >
                      <XCircle class="h-4 w-4" />
                    </button>
                  </template>
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

    <!-- Review Modal -->
    <Teleport to="body">
      <div
        v-if="showReviewModal && selectedConfirmation"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        @click.self="closeReviewModal"
      >
        <div class="flex w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl max-h-[90vh]" @click.stop>
          <div class="shrink-0 border-b border-gray-200 px-6 py-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-6">
              {{ reviewAction === 'approved' ? 'Setujui' : 'Tolak' }} Konfirmasi Pembayaran
            </h3>

            <!-- Warning -->
            <div
              v-if="reviewAction === 'approved'"
              class="rounded-lg border bg-green-50 p-3 text-sm text-green-800 ring-1 ring-green-200"
            >
              <CheckCircle class="mr-1.5 inline h-4 w-4" />
              Order akan otomatis ditandai sebagai <strong>PAID</strong>
            </div>

            <div
              v-else
              class="rounded-lg border bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200"
            >
              <XCircle class="mr-1.5 inline h-4 w-4" />
              Konfirmasi akan ditolak dan order tetap <strong>UNPAID</strong>
            </div>
          </div>

          <div class="space-y-4 overflow-y-auto p-6">

            <!-- Detail -->
            <div class="space-y-2.5 rounded-lg bg-gray-50 p-4 text-sm ring-1 ring-gray-200">
              <div class="flex items-center justify-between">
                <span class="text-gray-600">No. Order</span>
                <span class="font-mono text-xs font-semibold text-primary-600">{{ selectedConfirmation.order?.no }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">Pelanggan</span>
                <span class="font-medium text-gray-900">{{ selectedConfirmation.customer?.name }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">Jumlah Transfer</span>
                <span class="font-bold text-gray-900">Rp{{ formatCurrency(Number(selectedConfirmation.amount)) }}</span>
              </div>
              <div class="flex items-center justify-between border-t border-gray-200 pt-2.5">
                <span class="text-gray-600">Dari</span>
                <span class="text-right text-gray-900">{{ selectedConfirmation.from_name }}<br><span class="text-xs text-gray-500">{{ selectedConfirmation.from_bank }}</span></span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">Ke</span>
                <span class="text-right text-gray-900">{{ selectedConfirmation.to_bank }}<br><span class="text-xs text-gray-500">{{ selectedConfirmation.to_account }}</span></span>
              </div>
              <div v-if="selectedConfirmation.note" class="border-t border-gray-200 pt-2.5">
                <span class="text-gray-600">Catatan:</span>
                <p class="mt-1 text-gray-900">{{ selectedConfirmation.note }}</p>
              </div>
            </div>

            <!-- Approve form: bank tujuan & actual amount -->
            <div v-if="reviewAction === 'approved'" class="space-y-4 rounded-lg border border-green-200 bg-green-50/40 p-4">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">
                  Ganti Bank Tujuan <span class="text-red-500">*</span>
                </label>
                <AppFilterSelect
                  :model-value="approveForm.to_bank_id"
                  :options="bankOptions"
                  :searchable="true"
                  :placeholder="banksLoading ? 'Memuat bank...' : 'Pilih bank tujuan'"
                  @update:model-value="(v: any) => approveForm.to_bank_id = Array.isArray(v) ? v[0] : v"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">
                  Jumlah Aktual Diterima <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
                  <input
                    v-model.number="approveForm.actual_amount"
                    type="number"
                    min="0"
                    class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                  />
                </div>
                <p class="mt-1 text-xs text-gray-500">Otomatis terisi dari jumlah transfer, ubah bila berbeda.</p>
              </div>
            </div>
            <!-- File Preview -->
            <div v-if="selectedConfirmation.file" class="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div class="mb-3 flex items-center justify-between">
                <span class="text-sm font-medium text-gray-700">Bukti Transfer</span>
                <button
                  type="button"
                  class="text-xs text-primary-600 hover:text-primary-700"
                  @click="openLightbox(selectedConfirmation.file)"
                >
                  Buka di Tab Baru
                </button>
              </div>
              <div class="overflow-hidden rounded-lg">
                <img
                  v-if="selectedConfirmation.file.match(/\.(jpg|jpeg|png|gif|webp)$/i)"
                  :src="selectedConfirmation.file"
                  alt="Bukti Transfer"
                  class="w-full max-h-[300px] cursor-pointer object-contain transition-transform hover:scale-105"
                  @click="openLightbox(selectedConfirmation.file)"
                />
                <div v-else class="flex items-center gap-2 rounded bg-white p-3">
                  <Eye class="h-5 w-5 text-gray-400" />
                  <span class="text-sm text-gray-600">{{ selectedConfirmation.file.split('/').pop() }}</span>
                </div>
              </div>
            </div>

          </div>

          <!-- Actions -->
          <div class="shrink-0 flex gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">
            <button
              type="button"
              class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="processing"
              @click="closeReviewModal"
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="processing"
              class="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              :class="reviewAction === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'"
              @click="confirmAction"
            >
              <Loader2 v-if="processing" class="h-4 w-4 animate-spin" />
              {{ processing ? 'Memproses...' : (reviewAction === 'approved' ? 'Setujui' : 'Tolak') }}
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
