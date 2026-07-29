<script setup lang="ts">
import {
  ScrollText, RefreshCw, Search, X, Inbox, ChevronDown,
} from 'lucide-vue-next'
import { formatDateTime, formatDateFromForApi, formatDateToForApi } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'DELETE']

interface ApiLog {
  id: string
  business_id: string
  method: string
  path: string
  ip: string
  status_code: number
  created_at: string
}

interface ApiLogList {
  data: ApiLog[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const toast = useToast()

const methodClass: Record<string, string> = {
  GET: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  POST: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  PUT: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  DELETE: 'bg-red-50 text-red-700 ring-1 ring-red-200',
}

const items = ref<ApiLog[]>([])
const listLoading = ref(true)
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)

const fSearch = ref('')
const fMethod = ref('')
const fDate = ref({ from: '', to: '' })

async function fetchList() {
  listLoading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
    }
    if (fSearch.value) params.search = fSearch.value
    if (fMethod.value) params.method = fMethod.value
    if (fDate.value.from) params.date_from = formatDateFromForApi(fDate.value.from)
    if (fDate.value.to) params.date_to = formatDateToForApi(fDate.value.to)

    const res = await api.get<{ data: ApiLogList }>('/external/api-logs', params)
    items.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch (e: any) {
    items.value = []
    toast.error(e?.message || 'Gagal memuat API logs')
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
  fMethod.value = ''
  fDate.value = { from: '', to: '' }
  applyFilter()
}

const hasActiveFilter = computed(() =>
  !!(fSearch.value || fMethod.value || fDate.value.from || fDate.value.to),
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
        class="border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-700"
      >
        Webhook History
      </NuxtLink>
      <NuxtLink
        to="/developer/api-logs"
        class="border-b-2 border-primary-600 px-4 py-2.5 text-sm font-semibold text-primary-600"
      >
        API Logs
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
            placeholder="Cari path / IP"
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
            v-model="fMethod"
            class="appearance-none rounded-lg border border-gray-300 py-1.5 pl-3 pr-8 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
            @change="applyFilter"
          >
            <option value="">Semua Method</option>
            <option v-for="m in METHOD_OPTIONS" :key="m" :value="m">{{ m }}</option>
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
        <table class="w-full min-w-[720px] text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
              <th class="px-4 py-3 text-left">Method</th>
              <th class="px-4 py-3 text-left">Path</th>
              <th class="px-4 py-3 text-left">IP</th>
              <th class="px-4 py-3 text-center">Kode</th>
              <th class="px-4 py-3 text-left">Waktu</th>
            </tr>
          </thead>
          <tbody v-if="listLoading">
            <tr v-for="i in 8" :key="i" class="border-b border-gray-100">
              <td v-for="j in 5" :key="j" class="px-4 py-3">
                <div class="h-4 animate-pulse rounded bg-gray-200" :class="j === 2 ? 'w-40' : 'w-16'" />
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="!items.length">
            <tr>
              <td colspan="5" class="px-4 py-16 text-center">
                <Inbox class="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p class="text-sm text-gray-500">Belum ada API log</p>
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
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold"
                  :class="methodClass[item.method] || 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'"
                >{{ item.method }}</span>
              </td>
              <td class="max-w-[320px] px-4 py-3">
                <span class="block truncate font-mono text-xs text-gray-700" :title="item.path">{{ item.path }}</span>
              </td>
              <td class="px-4 py-3">
                <span class="font-mono text-xs text-gray-600">{{ item.ip }}</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="font-mono text-xs font-semibold"
                  :class="item.status_code >= 200 && item.status_code < 300 ? 'text-emerald-600' : item.status_code ? 'text-red-600' : 'text-gray-400'"
                >{{ item.status_code || '-' }}</span>
              </td>
              <td class="px-4 py-3 text-xs text-gray-500">{{ formatDateTime(item.created_at) }}</td>
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
