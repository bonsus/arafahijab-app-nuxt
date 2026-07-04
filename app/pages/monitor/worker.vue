<script setup lang="ts">
import {
  Activity, Server, RefreshCw, Loader2, Search, X, AlertTriangle,
  CheckCircle2, Clock, Database, Cpu, Wifi, WifiOff, RotateCw, Inbox,
  Hash, Timer, Zap, Play,
} from 'lucide-vue-next'
import { formatDateTime } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

// ---- Types ----
interface Heartbeat {
  status: string
  hostname: string
  pid: number
  queue: string
  started_at: string
  last_beat: string
  processed: number
  succeeded: number
  failed: number
  last_event_at: string
  last_error: string
}

interface WorkerHealth {
  online: boolean
  heartbeat?: Heartbeat | null
}

interface StatusCounts {
  pending: number
  processing: number
  done: number
  failed: number
  skipped: number
  total: number
}

interface Summary {
  worker: WorkerHealth
  queue_depth: number
  counts: StatusCounts
  today: StatusCounts
  last_24h: StatusCounts
  oldest_pending_at: string | null
  oldest_pending_seconds: number
  last_activity_at: string | null
  generated_at: string
}

interface WebhookItem {
  id: string
  source: string
  shop_id: string
  code: number
  event_type: string
  reference_id: string
  status: string
  error: string
  attempts: number 
  payload: any
  created_at: string
  updated_at: string
}

interface WebhookList {
  data: WebhookItem[]
  page: number
  per_page: number
  total_page: number
  total: number
}

interface RetryResult {
  total: number
  succeeded: number
  failed: number
  ids: string[]
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

// ---- Realtime summary state ----
const summary = ref<Summary | null>(null)
const summaryLoading = ref(false)
const summaryError = ref('')
const lastUpdated = ref<Date | null>(null)

const autoRefresh = ref(true)
const intervalSec = ref(3)
const intervalOptions = [
  { value: 1, label: '1 dtk' },
  { value: 3, label: '3 dtk' },
  { value: 5, label: '5 dtk' },
  { value: 10, label: '10 dtk' },
  { value: 30, label: '30 dtk' },
]
let pollTimer: ReturnType<typeof setInterval> | null = null

// Ambang batas peringatan
const OLDEST_PENDING_WARN = 300 // detik

const PENDING_THRESHOLD_HIGH = 50

const worker = computed(() => summary.value?.worker || null)
const heartbeat = computed(() => worker.value?.heartbeat || null)

const isWorkerOnline = computed(() => !!worker.value?.online)
const queueDepth = computed(() => summary.value?.queue_depth ?? null)
const brokerOffline = computed(() => queueDepth.value === -1)
const oldestPendingSec = computed(() => summary.value?.oldest_pending_seconds ?? 0)

const hasProblem = computed(() => {
  if (!summary.value) return false
  if (!isWorkerOnline.value) return true
  if (brokerOffline.value) return true
  if ((queueDepth.value ?? 0) > PENDING_THRESHOLD_HIGH) return true
  if (oldestPendingSec.value > OLDEST_PENDING_WARN) return true
  return false
})

async function fetchSummary(showSpinner = false) {
  if (showSpinner) summaryLoading.value = true
  try {
    const res = await api.get<{ data: Summary }>('/worker/summary')
    summary.value = res.data
    summaryError.value = ''
    lastUpdated.value = new Date()
  }
  catch (e: any) {
    summaryError.value = e?.message || 'Gagal memuat ringkasan worker'
  }
  finally {
    if (showSpinner) summaryLoading.value = false
  }
}

function startPolling() {
  stopPolling()
  if (!autoRefresh.value) return
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') fetchSummary(false)
  }, intervalSec.value * 1000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

watch([autoRefresh, intervalSec], () => startPolling())

// ---- Webhook list state ----
const items = ref<WebhookItem[]>([])
const listLoading = ref(true)
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

const fSource = ref('')
const fStatus = ref('')
const fEventType = ref('')
const fSearch = ref('')
const fDate = ref({ from: '', to: '' })

const sourceOptions = [
  { value: '', label: 'Semua Source' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'xendit', label: 'Xendit' },
]

const statusOptions = [
  { value: '', label: 'Semua Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'done', label: 'Done' },
  { value: 'failed', label: 'Failed' },
  { value: 'skipped', label: 'Skipped' },
]

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  processing: { label: 'Processing', cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  done: { label: 'Done', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  failed: { label: 'Failed', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  skipped: { label: 'Skipped', cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
}

async function fetchList() {
  listLoading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (fSource.value) params.source = fSource.value
    if (fStatus.value) params.status = fStatus.value
    if (fEventType.value) params.event_type = fEventType.value
    if (fSearch.value) params.search = fSearch.value
    if (fDate.value.from) params.from = fDate.value.from
    if (fDate.value.to) params.to = fDate.value.to

    const res = await api.get<{ data: WebhookList }>('/worker/webhooks', params)
    items.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch (e: any) {
    items.value = []
    toast.error(e?.message || 'Gagal memuat data webhook')
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
  fSource.value = ''
  fStatus.value = ''
  fEventType.value = ''
  fSearch.value = ''
  fDate.value = { from: '', to: '' }
  applyFilter()
}

const hasActiveFilter = computed(() =>
  !!(fSource.value || fStatus.value || fEventType.value || fSearch.value || fDate.value.from || fDate.value.to),
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

// ---- Retry actions ----
const retryingIds = ref<Set<string>>(new Set())
const bulkRetrying = ref(false)

async function retryOne(item: WebhookItem) {
  const isDone = item.status === 'done'
  if (isDone) {
    const ok = await confirm({
      title: 'Proses Ulang Record',
      message: `Record ini sudah "done". Paksa reset ke pending dan proses ulang "${item.reference_id || item.id}"?`,
      confirmText: 'Paksa Proses Ulang',
    })
    if (!ok) return
  }
  retryingIds.value.add(item.id)
  try {
    const url = `/worker/webhooks/${item.id}/retry${isDone ? '?force=true' : ''}`
    const res = await api.post<{ data: WebhookItem }>(url)
    const updated = res.data
    const idx = items.value.findIndex(i => i.id === item.id)
    if (idx !== -1 && updated) items.value[idx] = updated
    if (selectedDetail.value?.id === item.id && updated) selectedDetail.value = updated
    toast.success('Webhook berhasil diproses ulang')
    fetchSummary(false)
  }
  catch (e: any) {
    toast.error(e?.message || 'Gagal memproses ulang webhook')
  }
  finally {
    retryingIds.value.delete(item.id)
  }
}

async function retryFailed() {
  const ok = await confirm({
    title: 'Proses Ulang Semua yang Gagal',
    message: 'Reproses record berstatus "failed" secara bulk (oldest first, maksimal 200 record). Lanjutkan?',
    confirmText: 'Proses Ulang',
  })
  if (!ok) return
  bulkRetrying.value = true
  try {
    const res = await api.post<{ data: RetryResult }>('/worker/retry-failed?limit=200')
    const r = res.data
    toast.success(`Selesai: ${r.succeeded} berhasil, ${r.failed} gagal dari ${r.total} record`)
    fetchList()
    fetchSummary(false)
  }
  catch (e: any) {
    toast.error(e?.message || 'Gagal memproses ulang record yang gagal')
  }
  finally {
    bulkRetrying.value = false
  }
}

// ---- Detail modal ----
const selectedDetail = ref<WebhookItem | null>(null)
const detailLoading = ref(false)
const showDetail = ref(false)

async function openDetail(item: WebhookItem) {
  selectedDetail.value = item
  showDetail.value = true
  detailLoading.value = true
  try {
    const res = await api.get<{ data: WebhookItem }>(`/worker/webhooks/${item.id}`)
    if (res.data) selectedDetail.value = res.data
  }
  catch {
    // keep the row data we already have
  }
  finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  showDetail.value = false
  selectedDetail.value = null
}

// ---- Helpers ----
function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr).getTime()
  if (Number.isNaN(d)) return '-'
  const diff = Math.floor((Date.now() - d) / 1000)
  if (diff < 5) return 'baru saja'
  if (diff < 60) return `${diff} dtk lalu`
  const m = Math.floor(diff / 60)
  if (m < 60) return `${m} mnt lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  const days = Math.floor(h / 24)
  return `${days} hari lalu`
}

function humanizeSeconds(sec: number): string {
  if (!sec || sec <= 0) return '-'
  if (sec < 60) return `${sec} dtk`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h}j ${mm}m`
}

const scope = ref<'counts' | 'today' | 'last_24h'>('counts')
const scopeOptions = [
  { value: 'counts', label: 'Total' },
  { value: 'today', label: 'Hari Ini' },
  { value: 'last_24h', label: '24 Jam' },
] as const

const activeCounts = computed<StatusCounts | null>(() => {
  if (!summary.value) return null
  return summary.value[scope.value]
})

const countChips: { key: keyof StatusCounts; label: string; cls: string }[] = [
  { key: 'pending', label: 'Pending', cls: 'text-yellow-700 bg-yellow-50 ring-yellow-200' },
  { key: 'processing', label: 'Processing', cls: 'text-blue-700 bg-blue-50 ring-blue-200' },
  { key: 'done', label: 'Done', cls: 'text-green-700 bg-green-50 ring-green-200' },
  { key: 'failed', label: 'Failed', cls: 'text-red-700 bg-red-50 ring-red-200' },
  { key: 'skipped', label: 'Skipped', cls: 'text-gray-600 bg-gray-50 ring-gray-200' },
  { key: 'total', label: 'Total', cls: 'text-gray-900 bg-gray-100 ring-gray-200' },
]

onMounted(() => {
  fetchSummary(true)
  fetchList()
  startPolling()
})

onBeforeUnmount(() => {
  stopPolling()
  clearTimeout(searchTimer)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Activity class="h-5 w-5 text-primary-600" />
          Monitor Worker
        </h1>
        <p class="mt-0.5 text-sm text-gray-500">Pantau worker webhook marketplace secara realtime</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span v-if="lastUpdated" class="text-xs text-gray-400">
          Update: {{ relativeTime(lastUpdated.toISOString()) }}
        </span>

        <!-- Auto refresh toggle -->
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
          :class="autoRefresh
            ? 'border-green-300 bg-green-50 text-green-700'
            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'"
          @click="autoRefresh = !autoRefresh"
        >
          <span
            class="h-2 w-2 rounded-full"
            :class="autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'"
          />
          {{ autoRefresh ? 'Live' : 'Paused' }}
        </button>

        <!-- Interval -->
        <select
          v-model.number="intervalSec"
          :disabled="!autoRefresh"
          class="rounded-lg border border-gray-300 py-2 pl-2 pr-7 text-xs text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50"
        >
          <option v-for="opt in intervalOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>

        <!-- Manual refresh -->
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          :disabled="summaryLoading"
          @click="fetchSummary(true)"
        >
          <RefreshCw :class="['h-3.5 w-3.5', summaryLoading && 'animate-spin']" />
          Refresh
        </button>
      </div>
    </div>

    <!-- Summary error -->
    <div
      v-if="summaryError"
      class="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <AlertTriangle class="h-4 w-4 shrink-0" />
      {{ summaryError }}
    </div>

    <!-- Problem banner -->
    <div
      v-if="hasProblem"
      class="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      <AlertTriangle class="h-4 w-4 shrink-0" />
      <span>
        Worker terdeteksi <strong>bermasalah</strong>.
        <template v-if="!isWorkerOnline">Worker offline. </template>
        <template v-if="brokerOffline">Broker antrian tidak tersedia. </template>
        <template v-else-if="(queueDepth ?? 0) > PENDING_THRESHOLD_HIGH">Antrian menumpuk ({{ queueDepth }}). </template>
        <template v-if="oldestPendingSec > OLDEST_PENDING_WARN">Ada record pending tertua {{ humanizeSeconds(oldestPendingSec) }}.</template>
      </span>
    </div>

    <!-- Worker health + metrics -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- Worker health card -->
      <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200 lg:col-span-2">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Server class="h-4 w-4 text-gray-400" />
            Status Worker
          </h2>
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            :class="isWorkerOnline
              ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
              : 'bg-red-50 text-red-700 ring-1 ring-red-200'"
          >
            <Wifi v-if="isWorkerOnline" class="h-3.5 w-3.5" />
            <WifiOff v-else class="h-3.5 w-3.5" />
            {{ isWorkerOnline ? 'Online' : 'Offline' }}
          </span>
        </div>

        <div v-if="!summary && summaryLoading" class="flex items-center gap-2 py-6 text-sm text-gray-400">
          <Loader2 class="h-4 w-4 animate-spin" /> Memuat status worker...
        </div>

        <div v-else-if="!heartbeat" class="py-6 text-center text-sm text-gray-400">
          Tidak ada data heartbeat dari worker.
        </div>

        <div v-else class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <p class="text-xs text-gray-400">Status</p>
            <p class="font-medium" :class="heartbeat.status === 'running' ? 'text-green-600' : 'text-red-600'">
              {{ heartbeat.status }}
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Hostname</p>
            <p class="font-medium text-gray-800">{{ heartbeat.hostname || '-' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400">PID</p>
            <p class="font-medium text-gray-800">{{ heartbeat.pid || '-' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Queue</p>
            <p class="font-medium text-gray-800">{{ heartbeat.queue || '-' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Mulai</p>
            <p class="font-medium text-gray-800">{{ formatDateTime(heartbeat.started_at) }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Heartbeat Terakhir</p>
            <p class="font-medium text-gray-800">{{ relativeTime(heartbeat.last_beat) }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Diproses</p>
            <p class="font-semibold text-gray-900">{{ heartbeat.processed?.toLocaleString() ?? 0 }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Sukses</p>
            <p class="font-semibold text-green-600">{{ heartbeat.succeeded?.toLocaleString() ?? 0 }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Gagal</p>
            <p class="font-semibold text-red-600">{{ heartbeat.failed?.toLocaleString() ?? 0 }}</p>
          </div>
          <div class="col-span-2 sm:col-span-3">
            <p class="text-xs text-gray-400">Event Terakhir</p>
            <p class="font-medium text-gray-800">{{ formatDateTime(heartbeat.last_event_at) }}</p>
          </div>
          <div v-if="heartbeat.last_error" class="col-span-2 sm:col-span-3">
            <p class="text-xs text-gray-400">Error Terakhir</p>
            <p class="rounded-md bg-red-50 px-2 py-1 font-mono text-xs text-red-600">{{ heartbeat.last_error }}</p>
          </div>
        </div>
      </div>

      <!-- Metric cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <div class="flex items-center gap-2 text-xs font-medium text-gray-400">
            <Database class="h-4 w-4" /> Queue Depth
          </div>
          <p
            class="mt-1 text-2xl font-bold"
            :class="brokerOffline ? 'text-red-600' : (queueDepth ?? 0) > PENDING_THRESHOLD_HIGH ? 'text-amber-600' : 'text-gray-900'"
          >
            <template v-if="brokerOffline">Broker offline</template>
            <template v-else>{{ queueDepth?.toLocaleString() ?? '-' }}</template>
          </p>
        </div>

        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <div class="flex items-center gap-2 text-xs font-medium text-gray-400">
            <Timer class="h-4 w-4" /> Pending Tertua
          </div>
          <p
            class="mt-1 text-2xl font-bold"
            :class="oldestPendingSec > OLDEST_PENDING_WARN ? 'text-amber-600' : 'text-gray-900'"
          >
            {{ humanizeSeconds(oldestPendingSec) }}
          </p>
        </div>

        <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
          <div class="flex items-center gap-2 text-xs font-medium text-gray-400">
            <Clock class="h-4 w-4" /> Aktivitas Terakhir
          </div>
          <p class="mt-1 text-lg font-bold text-gray-900">
            {{ relativeTime(summary?.last_activity_at) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Status counts -->
    <div class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Zap class="h-4 w-4 text-gray-400" />
          Ringkasan Pemrosesan
        </h2>
        <div class="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
          <button
            v-for="opt in scopeOptions"
            :key="opt.value"
            type="button"
            class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
            :class="scope === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
            @click="scope = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div
          v-for="chip in countChips"
          :key="chip.key"
          class="rounded-lg px-3 py-3 text-center ring-1"
          :class="chip.cls"
        >
          <p class="text-2xl font-bold">{{ (activeCounts?.[chip.key] ?? 0).toLocaleString() }}</p>
          <p class="mt-0.5 text-xs font-medium">{{ chip.label }}</p>
        </div>
      </div>
    </div>

    <!-- Webhook records -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
        <div class="relative min-w-[240px] flex-1">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="fSearch"
            type="text"
            placeholder="Cari reference_id / shop_id"
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

        <div class="w-auto">
          <AppFilterSelect v-model="fSource" :options="sourceOptions" placeholder="Source" :searchable="false" @update:model-value="applyFilter" />
        </div>
        <div class="w-auto">
          <AppFilterSelect v-model="fStatus" :options="statusOptions" placeholder="Status" :searchable="false" @update:model-value="applyFilter" />
        </div>

        <input
          v-model="fEventType"
          type="text"
          placeholder="Event type"
          class="w-40 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
          @keyup.enter="applyFilter"
        />

        <div class="w-auto">
          <AppDateRangePicker v-model="fDate" @update:model-value="applyFilter" />
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          :disabled="listLoading"
          @click="fetchList"
        >
          <RefreshCw :class="['h-3.5 w-3.5', listLoading && 'animate-spin']" />
        </button>

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
          class="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
          :disabled="bulkRetrying"
          @click="retryFailed"
        >
          <Loader2 v-if="bulkRetrying" class="h-3.5 w-3.5 animate-spin" />
          <RotateCw v-else class="h-3.5 w-3.5" />
          Retry Failed
        </button>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
              <th class="px-4 py-3 text-left">Source</th>
              <th class="px-4 py-3 text-left">Event</th>
              <th class="px-4 py-3 text-left">Reference</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3 text-center">Attempt</th>
              <th class="px-4 py-3 text-left">Diterima</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody v-if="listLoading">
            <tr v-for="i in 8" :key="i" class="border-b border-gray-100">
              <td v-for="j in 7" :key="j" class="px-4 py-3">
                <div class="h-4 animate-pulse rounded bg-gray-200" :class="j === 3 ? 'w-40' : 'w-20'" />
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="!items.length">
            <tr>
              <td colspan="7" class="px-4 py-16 text-center">
                <Inbox class="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p class="text-sm text-gray-500">Tidak ada record webhook</p>
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
                <span class="font-medium capitalize text-gray-800">{{ item.source }}</span>
                <p class="text-xs text-gray-400">Shop: {{ item.shop_id || '-' }}</p>
              </td>
              <td class="px-4 py-3">
                <span class="text-gray-700">{{ item.event_type || '-' }}</span>
                <p class="text-xs text-gray-400">Code: {{ item.code }}</p>
              </td>
              <td class="px-4 py-3">
                <span class="font-mono text-xs text-gray-700">{{ item.reference_id || '-' }}</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="statusConfig[item.status]?.cls || 'bg-gray-100 text-gray-600'"
                >
                  {{ statusConfig[item.status]?.label || item.status }}
                </span>
                <p v-if="item.error" class="mt-1 max-w-[220px] truncate text-xs text-red-500" :title="item.error">
                  {{ item.error }}
                </p>
              </td>
              <td class="px-4 py-3 text-center text-gray-600">{{ item.attempts }}</td>
              <td class="px-4 py-3 whitespace-nowrap text-gray-600">
                {{ formatDateTime(item.created_at) }}
                <p class="text-xs text-gray-400">{{ relativeTime(item.created_at) }}</p>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Detail"
                    @click="openDetail(item)"
                  >
                    <Search class="h-4 w-4" />
                  </button>
                  <button
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                    :title="item.status === 'done' ? 'Paksa proses ulang' : 'Proses ulang'"
                    :disabled="retryingIds.has(item.id)"
                    @click="retryOne(item)"
                  >
                    <Loader2 v-if="retryingIds.has(item.id)" class="h-4 w-4 animate-spin" />
                    <RotateCw v-else class="h-4 w-4" />
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
        v-if="showDetail"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        @click.self="closeDetail"
      >
        <div class="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Hash class="h-4 w-4 text-gray-400" /> Detail Webhook
            </h3>
            <button class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="closeDetail">
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="max-h-[70vh] overflow-y-auto px-5 py-4">
            <div v-if="detailLoading && !selectedDetail" class="flex items-center gap-2 py-6 text-sm text-gray-400">
              <Loader2 class="h-4 w-4 animate-spin" /> Memuat detail...
            </div>
            <dl v-else-if="selectedDetail" class="grid grid-cols-3 gap-y-3 text-sm">
              <dt class="text-gray-400">ID</dt>
              <dd class="col-span-2 break-all font-mono text-xs text-gray-800">{{ selectedDetail.id }}</dd>

              <dt class="text-gray-400">Source</dt>
              <dd class="col-span-2 capitalize text-gray-800">{{ selectedDetail.source }}</dd>

              <dt class="text-gray-400">Shop ID</dt>
              <dd class="col-span-2 text-gray-800">{{ selectedDetail.shop_id || '-' }}</dd>

              <dt class="text-gray-400">Event Type</dt>
              <dd class="col-span-2 text-gray-800">{{ selectedDetail.event_type || '-' }}</dd>

              <dt class="text-gray-400">Code</dt>
              <dd class="col-span-2 text-gray-800">{{ selectedDetail.code }}</dd>

              <dt class="text-gray-400">Reference</dt>
              <dd class="col-span-2 break-all font-mono text-xs text-gray-800">{{ selectedDetail.reference_id || '-' }}</dd>

              <dt class="text-gray-400">Status</dt>
              <dd class="col-span-2">
                <span
                  class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="statusConfig[selectedDetail.status]?.cls || 'bg-gray-100 text-gray-600'"
                >
                  {{ statusConfig[selectedDetail.status]?.label || selectedDetail.status }}
                </span>
              </dd>

              <dt class="text-gray-400">Attempts</dt>
              <dd class="col-span-2 text-gray-800">{{ selectedDetail.attempts }}</dd>

              <dt class="text-gray-400">Dibuat</dt>
              <dd class="col-span-2 text-gray-800">{{ formatDateTime(selectedDetail.created_at) }}</dd>

              <dt class="text-gray-400">Diupdate</dt>
              <dd class="col-span-2 text-gray-800">{{ formatDateTime(selectedDetail.updated_at) }}</dd>

              <!-- payload -->
              <template v-if="selectedDetail.payload">
                <dt class="text-gray-400">Payload</dt>
                <dd class="col-span-2 rounded-md bg-gray-50 px-2 py-1 font-mono text-xs text-gray-800">{{ selectedDetail.payload }}</dd>
              </template>

              <template v-if="selectedDetail.error">
                <dt class="text-gray-400">Error</dt>
                <dd class="col-span-2 rounded-md bg-red-50 px-2 py-1 font-mono text-xs text-red-600">{{ selectedDetail.error }}</dd>
              </template>
            </dl>
          </div>

          <div v-if="selectedDetail" class="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
            <button
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="closeDetail"
            >
              Tutup
            </button>
            <button
              class="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              :disabled="retryingIds.has(selectedDetail.id)"
              @click="retryOne(selectedDetail)"
            >
              <Loader2 v-if="retryingIds.has(selectedDetail.id)" class="h-3.5 w-3.5 animate-spin" />
              <Play v-else class="h-3.5 w-3.5" />
              {{ selectedDetail.status === 'done' ? 'Paksa Proses Ulang' : 'Proses Ulang' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
