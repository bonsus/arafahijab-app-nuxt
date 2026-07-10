<script setup lang="ts">
import {
  Webhook, RefreshCw, Search, X, Inbox, Eye, RotateCw, Copy, Check, Loader2, ChevronDown,
} from 'lucide-vue-next'
import { formatDateTime } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

interface WebhookDelivery {
  id: string
  business_id: string
  event: string
  url: string
  payload: Record<string, any> | null
  status: string
  attempt: number
  response_code: number
  response_body: string
  error: string
  created_at: string
  updated_at: string
  delivered_at: string | null
}

interface DeliveryList {
  data: WebhookDelivery[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const toast = useToast()

const EVENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'order.created', label: 'Order dibuat' },
  { value: 'order.updated', label: 'Order diperbarui' },
  { value: 'order.status_updated', label: 'Status order diperbarui' },
  { value: 'payment.received', label: 'Pembayaran diterima' },
  { value: 'payment.updated', label: 'Pembayaran diperbarui' },
  { value: 'stock.changed', label: 'Stok berubah' },
]

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'success', label: 'Berhasil' },
  { value: 'failed', label: 'Gagal' },
  { value: 'pending', label: 'Menunggu' },
]

const statusConfig: Record<string, { label: string; cls: string; dot: string }> = {
  success: { label: 'Berhasil', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  failed: { label: 'Gagal', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200', dot: 'bg-red-500' },
  pending: { label: 'Menunggu', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-500' },
}

const items = ref<WebhookDelivery[]>([])
const listLoading = ref(true)
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

const fSearch = ref('')
const fStatus = ref('')
const fEvent = ref('')
const fDate = ref({ from: '', to: '' })

async function fetchList() {
  listLoading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (fSearch.value) params.search = fSearch.value
    if (fStatus.value) params.status = fStatus.value
    if (fEvent.value) params.event = fEvent.value
    if (fDate.value.from) params.date_from = formatDateFromForApi(fDate.value.from)
    if (fDate.value.to) params.date_to = formatDateToForApi(fDate.value.to)

    const res = await api.get<{ data: DeliveryList }>('/external/webhook/deliveries', params)
    items.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch (e: any) {
    items.value = []
    toast.error(e?.message || 'Gagal memuat webhook history')
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
  fEvent.value = ''
  fDate.value = { from: '', to: '' }
  applyFilter()
}

const hasActiveFilter = computed(() =>
  !!(fSearch.value || fStatus.value || fEvent.value || fDate.value.from || fDate.value.to),
)

function onPageChange(p: number) {
  page.value = p
  fetchList()
}

function onPerPageChange(pp: number) {
  perPage.value = pp
  page.value = 1
  fetchList()
}

function eventLabel(ev: string): string {
  return EVENT_OPTIONS.find(e => e.value === ev)?.label || ev
}

// ---- Detail modal ----
const showDetail = ref(false)
const detail = ref<WebhookDelivery | null>(null)
const detailLoading = ref(false)
const retrying = ref(false)
const copiedField = ref('')

async function openDetail(item: WebhookDelivery) {
  detail.value = item
  showDetail.value = true
  detailLoading.value = true
  try {
    const res = await api.get<{ data: WebhookDelivery }>(`/external/webhook/deliveries/${item.id}`)
    if (res.data) detail.value = res.data
  }
  catch {
    // fall back to list item
  }
  finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  showDetail.value = false
  detail.value = null
  copiedField.value = ''
}

const payloadJson = computed(() => {
  if (!detail.value?.payload) return ''
  try {
    return JSON.stringify(detail.value.payload, null, 2)
  }
  catch {
    return String(detail.value.payload)
  }
})

async function copyToClipboard(text: string, field: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copiedField.value = field
    setTimeout(() => { copiedField.value = '' }, 2000)
  }
  catch {
    toast.error('Gagal menyalin')
  }
}

async function retryDelivery(item: WebhookDelivery) {
  retrying.value = true
  try {
    await api.post(`/external/webhook/deliveries/${item.id}/retry`)
    toast.success('Webhook dikirim ulang')
    if (showDetail.value) closeDetail()
    fetchList()
  }
  catch (e: any) {
    toast.error(e?.message || 'Gagal mengirim ulang webhook')
  }
  finally {
    retrying.value = false
  }
}

onMounted(fetchList)

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Developer</h1>
      <p class="mt-1 text-sm text-gray-500">Kelola API key dan webhook untuk integrasi eksternal.</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-gray-200">
      <NuxtLink
        to="/developer"
        class="border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-700"
      >
        Konfigurasi
      </NuxtLink>
      <NuxtLink
        to="/developer/webhook-history"
        class="border-b-2 border-primary-600 px-4 py-2.5 text-sm font-semibold text-primary-600"
      >
        Webhook History
      </NuxtLink>
      <NuxtLink
        to="/developer/documentation"
        class="border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-700"
      >
        Dokumentasi API
      </NuxtLink>
    </div>

    <!-- Records -->
    <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
        <div class="relative min-w-[220px] flex-1">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="fSearch"
            type="text"
            placeholder="Cari event / url"
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

        <div class="relative">
          <select
            v-model="fStatus"
            class="appearance-none rounded-lg border border-gray-300 py-1.5 pl-3 pr-8 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
            @change="applyFilter"
          >
            <option value="">Semua Status</option>
            <option v-for="s in STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
          <ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        <div class="relative">
          <select
            v-model="fEvent"
            class="appearance-none rounded-lg border border-gray-300 py-1.5 pl-3 pr-8 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
            @change="applyFilter"
          >
            <option value="">Semua Event</option>
            <option v-for="e in EVENT_OPTIONS" :key="e.value" :value="e.value">{{ e.label }}</option>
          </select>
          <ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        <div class="w-auto">
          <AppDateRangePicker v-model="fDate" @update:model-value="applyFilter" />
        </div>

        <button
          v-if="hasActiveFilter"
          type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          @click="clearFilters"
        >
          <X class="h-3.5 w-3.5 text-red-500" /> Reset
        </button>

        <button
          type="button"
          :disabled="listLoading"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          @click="fetchList"
        >
          <RefreshCw :class="['h-3.5 w-3.5', listLoading && 'animate-spin']" />
          Refresh
        </button>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[820px] text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
              <th class="px-4 py-3 text-left">Event</th>
              <th class="px-4 py-3 text-left">URL</th>
              <th class="px-4 py-3 text-left">Status</th>
              <th class="px-4 py-3 text-center">Kode</th>
              <th class="px-4 py-3 text-center">Percobaan</th>
              <th class="px-4 py-3 text-left">Waktu</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody v-if="listLoading">
            <tr v-for="i in 8" :key="i" class="border-b border-gray-100">
              <td v-for="j in 7" :key="j" class="px-4 py-3">
                <div class="h-4 animate-pulse rounded bg-gray-200" :class="j === 2 ? 'w-40' : 'w-16'" />
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="!items.length">
            <tr>
              <td colspan="7" class="px-4 py-16 text-center">
                <Inbox class="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p class="text-sm text-gray-500">Belum ada webhook terkirim</p>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr
              v-for="item in items"
              :key="item.id"
              class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50"
            >
              <td class="px-4 py-3">
                <span class="font-mono text-xs text-gray-700">{{ item.event }}</span>
              </td>
              <td class="max-w-[240px] px-4 py-3">
                <span class="block truncate text-xs text-gray-600" :title="item.url">{{ item.url }}</span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="statusConfig[item.status]?.cls || 'bg-gray-100 text-gray-600'"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="statusConfig[item.status]?.dot || 'bg-gray-400'" />
                  {{ statusConfig[item.status]?.label || item.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="font-mono text-xs font-semibold"
                  :class="item.response_code >= 200 && item.response_code < 300 ? 'text-emerald-600' : item.response_code ? 'text-red-600' : 'text-gray-400'"
                >{{ item.response_code || '-' }}</span>
              </td>
              <td class="px-4 py-3 text-center text-xs text-gray-600">{{ item.attempt }}</td>
              <td class="px-4 py-3 text-xs text-gray-500">{{ formatDateTime(item.created_at) }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    @click="openDetail(item)"
                  >
                    <Eye class="h-3.5 w-3.5" /> Detail
                  </button>
                  <button
                    type="button"
                    :disabled="retrying"
                    class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Kirim ulang"
                    @click="retryDelivery(item)"
                  >
                    <RotateCw class="h-3.5 w-3.5" /> Retry
                  </button>
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

    <!-- Detail modal -->
    <Teleport to="body">
      <div
        v-if="showDetail && detail"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        @click.self="closeDetail"
      >
        <div class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Webhook class="h-4 w-4 text-primary-500" />
              Detail Pengiriman Webhook
            </h3>
            <button
              type="button"
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              @click="closeDetail"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Body -->
          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div class="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <div>
                <p class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Event</p>
                <p class="mt-0.5 font-mono text-xs text-gray-700">{{ detail.event }}</p>
              </div>
              <div>
                <p class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Status</p>
                <span
                  class="mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="statusConfig[detail.status]?.cls || 'bg-gray-100 text-gray-600'"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="statusConfig[detail.status]?.dot || 'bg-gray-400'" />
                  {{ statusConfig[detail.status]?.label || detail.status }}
                </span>
              </div>
              <div>
                <p class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Kode Respon</p>
                <p
                  class="mt-0.5 font-mono text-xs font-semibold"
                  :class="detail.response_code >= 200 && detail.response_code < 300 ? 'text-emerald-600' : detail.response_code ? 'text-red-600' : 'text-gray-400'"
                >{{ detail.response_code || '-' }}</p>
              </div>
              <div>
                <p class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Percobaan</p>
                <p class="mt-0.5 text-xs text-gray-700">{{ detail.attempt }}</p>
              </div>
              <div>
                <p class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Dibuat</p>
                <p class="mt-0.5 text-xs text-gray-700">{{ formatDateTime(detail.created_at) }}</p>
              </div>
              <div>
                <p class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Terkirim</p>
                <p class="mt-0.5 text-xs text-gray-700">{{ detail.delivered_at ? formatDateTime(detail.delivered_at) : '-' }}</p>
              </div>
            </div>

            <div>
              <p class="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">URL</p>
              <div class="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <code class="min-w-0 flex-1 truncate font-mono text-xs text-gray-700">{{ detail.url }}</code>
                <button
                  type="button"
                  class="shrink-0 text-gray-400 transition-colors hover:text-primary-600"
                  title="Salin"
                  @click="copyToClipboard(detail.url, 'url')"
                >
                  <Check v-if="copiedField === 'url'" class="h-3.5 w-3.5 text-green-500" />
                  <Copy v-else class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div v-if="detail.error">
              <p class="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">Error</p>
              <p class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{{ detail.error }}</p>
            </div>

            <div>
              <div class="mb-1 flex items-center justify-between">
                <p class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Payload</p>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 transition-colors hover:text-primary-600"
                  @click="copyToClipboard(payloadJson, 'payload')"
                >
                  <Check v-if="copiedField === 'payload'" class="h-3 w-3 text-green-500" />
                  <Copy v-else class="h-3 w-3" />
                  Salin
                </button>
              </div>
              <pre class="max-h-56 overflow-auto rounded-lg bg-gray-900 px-3 py-2.5 text-[11px] leading-relaxed text-gray-100">{{ payloadJson || '-' }}</pre>
            </div>

            <div v-if="detail.response_body">
              <div class="mb-1 flex items-center justify-between">
                <p class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Response Body</p>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 transition-colors hover:text-primary-600"
                  @click="copyToClipboard(detail.response_body, 'body')"
                >
                  <Check v-if="copiedField === 'body'" class="h-3 w-3 text-green-500" />
                  <Copy v-else class="h-3 w-3" />
                  Salin
                </button>
              </div>
              <pre class="max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-gray-50 px-3 py-2.5 text-[11px] leading-relaxed text-gray-600 ring-1 ring-gray-200">{{ detail.response_body }}</pre>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              @click="closeDetail"
            >
              Tutup
            </button>
            <button
              type="button"
              :disabled="retrying"
              class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="retryDelivery(detail)"
            >
              <Loader2 v-if="retrying" class="h-4 w-4 animate-spin" />
              <RotateCw v-else class="h-4 w-4" />
              Kirim Ulang
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
