<script setup lang="ts">
import {
  AlertTriangle, RefreshCw, Search, X, Inbox, Hash,
} from 'lucide-vue-next'
import { formatDateTime } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

interface ErrorLogItem {
  id: string
  scope: string
  level: string
  message: string
  error: string
  context: Record<string, any> | null
  created_at: string
}

interface ErrorLogList {
  data: ErrorLogItem[]
  page: number
  per_page: number
  total_page: number
  total: number
}

interface StatBucket {
  name?: string
  bucket?: string
  count: number
}

interface ErrorLogStats {
  total: number
  by_level: StatBucket[]
  by_scope: StatBucket[]
  per_day: StatBucket[]
  per_hour: StatBucket[]
  date_from: string | null
  date_to: string | null
}

const api = useApi()
const toast = useToast()

// ---- List state ----
const items = ref<ErrorLogItem[]>([])
const listLoading = ref(true)
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

const fSearch = ref('')
const fDate = ref({ from: '', to: '' })

const levelConfig: Record<string, { label: string; cls: string }> = {
  error: { label: 'Error', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  warn: { label: 'Warning', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  warning: { label: 'Warning', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  info: { label: 'Info', cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  debug: { label: 'Debug', cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
}

async function fetchList() {
  listLoading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (fSearch.value) params.search = fSearch.value
    if (fDate.value.from) params.date_from = formatDateFromForApi(fDate.value.from)
    if (fDate.value.to) params.date_to = formatDateToForApi(fDate.value.to)

    const res = await api.get<{ data: ErrorLogList }>('/worker/error-logs', params)
    items.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch (e: any) {
    items.value = []
    toast.error(e?.message || 'Gagal memuat error logs')
  }
  finally {
    listLoading.value = false
  }
}

// ---- Stats state ----
const stats = ref<ErrorLogStats | null>(null)
const statsLoading = ref(true)

async function fetchStats() {
  statsLoading.value = true
  try {
    const params: Record<string, string> = {}
    if (fSearch.value) params.search = fSearch.value
    if (fDate.value.from) params.date_from = formatDateFromForApi(fDate.value.from)
    if (fDate.value.to) params.date_to = formatDateToForApi(fDate.value.to)

    const res = await api.get<{ data: ErrorLogStats }>('/worker/error-logs/stats', params)
    stats.value = res.data || null
  }
  catch {
    stats.value = null
  }
  finally {
    statsLoading.value = false
  }
}

const perDayChart = computed(() => {
  const rows = stats.value?.per_day || []
  return {
    labels: rows.map(r => r.bucket || ''),
    series: [{ name: 'Error', color: '#ef4444', data: rows.map(r => r.count) }],
  }
})

const perHourChart = computed(() => {
  const rows = stats.value?.per_hour || []
  return {
    labels: rows.map(r => `${String(r.bucket ?? '').padStart(2, '0')}:00`),
    series: [{ name: 'Error', color: '#f59e0b', data: rows.map(r => r.count) }],
  }
})

function countFmt(v: number): string {
  return Math.round(v).toLocaleString('id-ID')
}


let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchList() }, 350)
}

function applyFilter() {
  page.value = 1
  fetchList()
  fetchStats()
}

function clearFilters() {
  fSearch.value = ''
  fDate.value = { from: '', to: '' }
  applyFilter()
}

const hasActiveFilter = computed(() =>
  !!(fSearch.value || fDate.value.from || fDate.value.to),
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

function contextEntries(ctx: Record<string, any> | null): { key: string; value: string }[] {
  if (!ctx || typeof ctx !== 'object') return []
  return Object.entries(ctx)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([key, v]) => ({ key, value: typeof v === 'object' ? JSON.stringify(v) : String(v) }))
}

// ---- Detail modal ----
const selectedDetail = ref<ErrorLogItem | null>(null)
const showDetail = ref(false)

function openDetail(item: ErrorLogItem) {
  selectedDetail.value = item
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
  selectedDetail.value = null
}

const selectedContextJson = computed(() => {
  if (!selectedDetail.value?.context) return ''
  try {
    return JSON.stringify(selectedDetail.value.context, null, 2)
  }
  catch {
    return String(selectedDetail.value.context)
  }
})

function refreshAll() {
  fetchList()
  fetchStats()
}

onMounted(() => {
  fetchList()
  fetchStats()
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
          <AlertTriangle class="h-5 w-5 text-red-500" />
          Error Logs
        </h1>
        <p class="mt-0.5 text-sm text-gray-500">Riwayat error dari worker &amp; proses background</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
        :disabled="listLoading"
        @click="refreshAll"
      >
        <RefreshCw :class="['h-3.5 w-3.5', listLoading && 'animate-spin']" />
        Refresh
      </button>
    </div>

    <MonitorTabs />

    <!-- Summary -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs font-medium uppercase tracking-wider text-gray-400">Total Error</p>
        <p class="mt-1 text-2xl font-bold text-red-600">
          <span v-if="statsLoading" class="inline-block h-7 w-16 animate-pulse rounded bg-gray-200" />
          <span v-else>{{ countFmt(stats?.total || 0) }}</span>
        </p>
      </div>
      <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs font-medium uppercase tracking-wider text-gray-400">Per Level</p>
        <div v-if="statsLoading" class="mt-2 h-6 w-full animate-pulse rounded bg-gray-200" />
        <div v-else-if="stats?.by_level?.length" class="mt-1.5 flex flex-wrap gap-1.5">
          <span
            v-for="l in stats.by_level"
            :key="l.name"
            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            :class="levelConfig[l.name || '']?.cls || 'bg-gray-100 text-gray-600'"
          >
            {{ levelConfig[l.name || '']?.label || l.name }}
            <span class="font-semibold">{{ countFmt(l.count) }}</span>
          </span>
        </div>
        <p v-else class="mt-2 text-sm text-gray-400">-</p>
      </div>
      <div class="col-span-2 rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <p class="text-xs font-medium uppercase tracking-wider text-gray-400">Per Scope</p>
        <div v-if="statsLoading" class="mt-2 h-6 w-full animate-pulse rounded bg-gray-200" />
        <div v-else-if="stats?.by_scope?.length" class="mt-1.5 flex flex-wrap gap-1.5">
          <span
            v-for="s in stats.by_scope"
            :key="s.name"
            class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600"
          >
            {{ s.name }}
            <span class="font-semibold text-gray-800">{{ countFmt(s.count) }}</span>
          </span>
        </div>
        <p v-else class="mt-2 text-sm text-gray-400">-</p>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <h2 class="mb-2 text-sm font-semibold text-gray-800">Error per Hari</h2>
        <DashboardLineChart
          :labels="perDayChart.labels"
          :series="perDayChart.series"
          :height="240"
          :loading="statsLoading"
          :left-format="countFmt"
        />
      </div>
      <div class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <h2 class="mb-2 text-sm font-semibold text-gray-800">Error per Jam</h2>
        <DashboardLineChart
          :labels="perHourChart.labels"
          :series="perHourChart.series"
          :height="240"
          :loading="statsLoading"
          :left-format="countFmt"
        />
      </div>
    </div>


    <!-- Records -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
        <div class="relative min-w-[240px] flex-1">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="fSearch"
            type="text"
            placeholder="Cari scope / message / error"
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
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
              <th class="px-4 py-3 text-left">Level</th>
              <th class="px-4 py-3 text-left">Scope</th>
              <th class="px-4 py-3 text-left">Message</th>
              <th class="px-4 py-3 text-left">Error</th>
              <th class="px-4 py-3 text-left">Context</th>
              <th class="px-4 py-3 text-left">Waktu</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody v-if="listLoading">
            <tr v-for="i in 8" :key="i" class="border-b border-gray-100">
              <td v-for="j in 7" :key="j" class="px-4 py-3">
                <div class="h-4 animate-pulse rounded bg-gray-200" :class="j === 3 || j === 4 ? 'w-40' : 'w-20'" />
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="!items.length">
            <tr>
              <td colspan="7" class="px-4 py-16 text-center">
                <Inbox class="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p class="text-sm text-gray-500">Tidak ada error log</p>
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
                <span
                  class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="levelConfig[item.level]?.cls || 'bg-gray-100 text-gray-600'"
                >
                  {{ levelConfig[item.level]?.label || item.level }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="font-mono text-xs text-gray-700">{{ item.scope || '-' }}</span>
              </td>
              <td class="px-4 py-3">
                <p class="max-w-[240px] truncate text-gray-800" :title="item.message">{{ item.message || '-' }}</p>
              </td>
              <td class="px-4 py-3">
                <p class="max-w-[240px] truncate text-red-600" :title="item.error">{{ item.error || '-' }}</p>
              </td>
              <td class="px-4 py-3">
                <div v-if="contextEntries(item.context).length" class="flex flex-wrap gap-1">
                  <span
                    v-for="c in contextEntries(item.context)"
                    :key="c.key"
                    class="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                  >
                    <span class="text-gray-400">{{ c.key }}:</span>{{ c.value }}
                  </span>
                </div>
                <span v-else class="text-xs text-gray-400">-</span>
              </td>
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
        v-if="showDetail && selectedDetail"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        @click.self="closeDetail"
      >
        <div class="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Hash class="h-4 w-4 text-gray-400" /> Detail Error Log
            </h3>
            <button class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="closeDetail">
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="max-h-[70vh] overflow-y-auto px-5 py-4">
            <dl class="grid grid-cols-3 gap-y-3 text-sm">
              <dt class="text-gray-400">ID</dt>
              <dd class="col-span-2 break-all font-mono text-xs text-gray-800">{{ selectedDetail.id }}</dd>

              <dt class="text-gray-400">Level</dt>
              <dd class="col-span-2">
                <span
                  class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="levelConfig[selectedDetail.level]?.cls || 'bg-gray-100 text-gray-600'"
                >
                  {{ levelConfig[selectedDetail.level]?.label || selectedDetail.level }}
                </span>
              </dd>

              <dt class="text-gray-400">Scope</dt>
              <dd class="col-span-2 font-mono text-xs text-gray-800">{{ selectedDetail.scope || '-' }}</dd>

              <dt class="text-gray-400">Message</dt>
              <dd class="col-span-2 text-gray-800">{{ selectedDetail.message || '-' }}</dd>

              <dt class="text-gray-400">Error</dt>
              <dd class="col-span-2 rounded-md bg-red-50 px-2 py-1 font-mono text-xs text-red-600">{{ selectedDetail.error || '-' }}</dd>

              <dt class="text-gray-400">Waktu</dt>
              <dd class="col-span-2 text-gray-800">{{ formatDateTime(selectedDetail.created_at) }}</dd>

              <template v-if="selectedContextJson">
                <dt class="col-span-3 mt-1 border-t border-gray-100 pt-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Context</dt>
                <dd class="col-span-3">
                  <pre class="overflow-x-auto rounded-md bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700 ring-1 ring-gray-100">{{ selectedContextJson }}</pre>
                </dd>
              </template>
            </dl>
          </div>

          <div class="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
            <button
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="closeDetail"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
