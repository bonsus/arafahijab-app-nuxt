<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search, Eye, Loader2, FileCheck, X as XIcon, RefreshCw, ArrowLeft } from 'lucide-vue-next'
import { formatCurrency, formatDate } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

const router = useRouter()
const api = useApi()
const toast = useToast()
const authStore = useAuthStore()

if (!authStore.user?.is_cs) {
  await navigateTo('/dashboard')
}

const loading = ref(false)
const confirmations = ref<any[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

const search = ref('')
const filterStatus = ref<string[]>([])
const filterDate = ref({ from: '', to: '' })

const showLightbox = ref(false)
const lightboxUrl = ref('')

const statusOptions = [
  { value: 'pending', label: 'Menunggu' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'rejected', label: 'Ditolak' },
]

const statusConfig: Record<string, { label: string, bg: string }> = {
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
      params.date_from = filterDate.value.from
      params.date_to = filterDate.value.to
    }
    const res = await api.get<{ data: any }>('/sales/ordercs/payment-confirmations/index', params)
    confirmations.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data')
    confirmations.value = []
  }
  finally {
    loading.value = false
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
  searchTimer = setTimeout(() => { page.value = 1; fetchData() }, 300)
}

function onStatusFilter(val: string | string[]) {
  filterStatus.value = Array.isArray(val) ? val : [val]
  page.value = 1
  fetchData()
}

function onDateFilter(val: { from: string, to: string }) {
  filterDate.value = val
  page.value = 1
  fetchData()
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink to="/sales/ordercs" class="rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50">
        <ArrowLeft class="h-4 w-4" />
      </NuxtLink>
      <div>
        <h1 class="text-xl font-bold text-gray-900">History Konfirmasi Pembayaran</h1>
        <p class="mt-1 text-sm text-gray-500">Riwayat konfirmasi pembayaran order CS.</p>
      </div>
    </div>

    <!-- Filters -->
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
      <AppDateRangePicker :model-value="filterDate" @update:model-value="onDateFilter" />
      <button
        class="flex shrink-0 rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
        title="Refresh data"
        :disabled="loading"
        @click="fetchData()"
      >
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
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
              <th class="px-4 py-3 text-center">Bukti</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 text-sm">
            <tr v-for="item in confirmations" :key="item.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <span class="text-xs font-semibold text-primary-600">{{ item.order?.no || '-' }}</span>
              </td>
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900">{{ item.customer?.name || '-' }}</div>
                <div class="text-xs text-gray-500">{{ item.customer?.phone || '-' }}</div>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ formatDate(item.payment_date) }}</td>
              <td class="px-4 py-3 text-right font-semibold text-gray-900">Rp{{ formatCurrency(Number(item.amount)) }}</td>
              <td class="px-4 py-3">
                <div class="text-gray-900">{{ item.from_name }}</div>
                <div class="text-xs text-gray-500">{{ item.from_bank }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="text-gray-900">{{ item.to_name }}</div>
                <div class="text-xs text-gray-500">{{ item.to_bank }} - {{ item.to_account }}</div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusConfig[item.status]?.bg || 'bg-gray-50 text-gray-700 ring-1 ring-gray-200'">
                  {{ statusConfig[item.status]?.label || item.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <button
                  v-if="item.file"
                  type="button"
                  class="inline-flex rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-primary-600"
                  title="Lihat Bukti"
                  @click="openLightbox(item.file)"
                >
                  <Eye class="h-4 w-4" />
                </button>
                <span v-else class="text-xs text-gray-400">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPage > 1" class="border-t border-gray-200 bg-gray-50 px-4 py-3">
        <AppPagination :page="page" :total-page="totalPage" :total="total" :per-page="perPage" @update:page="onPageChange" />
      </div>
    </div>

    <!-- Lightbox -->
    <Teleport to="body">
      <div v-if="showLightbox" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" @click.self="closeLightbox">
        <button class="absolute right-4 top-4 rounded-lg p-2 text-white hover:bg-white/10" @click="closeLightbox">
          <XIcon class="h-6 w-6" />
        </button>
        <img :src="lightboxUrl" alt="Bukti Transfer" class="max-h-[90vh] max-w-full rounded-lg object-contain" />
      </div>
    </Teleport>
  </div>
</template>
