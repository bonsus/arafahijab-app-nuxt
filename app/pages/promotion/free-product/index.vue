<script setup lang="ts">
import {
  Plus, Search, Pencil, Trash2, RefreshCw,
  ToggleLeft, ToggleRight, Calendar, Package, Box, Tag,
  Gift, Building2, Smartphone, Globe, Users
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const toast = useToast()
const { confirm: showConfirm } = useConfirm()

interface PromotionFree {
  id: string
  name: string
  note: string
  date_start: string
  date_end: string
  status: string
  status_label: string
  tags: string
  min_spend: number
  max_use: number
  max_use_per_customer: number
  item_type: string
  item_operator: string
  is_multiple: string
  used: number
  internal_visibility: string
  web_visibility: string
  app_visibility: string
  created_at: string
  updated_at: string
}

const loading = ref(false)
const search = ref('')
const filterStatus = ref<string[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(0)
const total = ref(0)
const promotions = ref<PromotionFree[]>([])

const statusOptions = [
  { label: 'Aktif', value: 'active', color: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  { label: 'Tidak Aktif', value: 'inactive', color: 'bg-gray-50 text-gray-700 ring-1 ring-gray-200' },
  { label: 'Draft', value: 'draft', color: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
]

const itemTypeConfig: Record<string, { label: string; bg: string }> = {
  all: { label: 'Semua Produk', bg: 'bg-gray-100 text-gray-700' },
  category: { label: 'Kategori', bg: 'bg-blue-100 text-blue-700' },
  product: { label: 'Produk', bg: 'bg-purple-100 text-purple-700' },
  sku: { label: 'SKU', bg: 'bg-indigo-100 text-indigo-700' },
}

let searchTimer: ReturnType<typeof setTimeout>

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchPromotions() }, 300)
}

function onStatusFilter(selected: string | string[]) {
  filterStatus.value = Array.isArray(selected) ? selected : [selected]
  page.value = 1
  fetchPromotions()
}

function onPageChange(p: number) { page.value = p; fetchPromotions() }
function onPerPageChange(pp: number) { perPage.value = pp; page.value = 1; fetchPromotions() }

function statusLabel(promo: PromotionFree): string {
  if (promo.status === 'inactive') return 'Tidak Aktif'
  if (promo.status === 'draft') return 'Draft'
  if (promo.status === 'active') {
    if (new Date(promo.date_end) < new Date()) return 'Berakhir'
    if (new Date(promo.date_start) > new Date()) return 'Akan Datang'
    return 'Berlangsung'
  }
  return promo.status || '-'
}

function statusBadgeClass(label: string) {
  if (label === 'Berlangsung') return 'bg-green-100 text-green-700'
  if (label === 'Berakhir') return 'bg-red-100 text-red-700'
  if (label === 'Akan Datang') return 'bg-blue-100 text-blue-700'
  if (label === 'Draft') return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-700'
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date)
}

async function fetchPromotions() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: page.value,
      per_page: perPage.value,
      type: 'product_free',
    }
    if (search.value) params.search = search.value
    if (filterStatus.value.length === 1) params.status = filterStatus.value[0]

    const res = await api.get<{ data: any }>('/promotions/product-frees/index', params)
    const data = res.data?.data || res.data || []
    promotions.value = Array.isArray(data) ? data : (data.data || [])
    promotions.value.forEach(p => { p.status_label = statusLabel(p) })
    page.value = res.data?.page || 1
    perPage.value = res.data?.per_page || 20
    totalPage.value = res.data?.total_page || 0
    total.value = res.data?.total || 0
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memuat data promosi')
  }
  finally {
    loading.value = false
  }
}

async function toggleStatus(promo: PromotionFree) {
  try {
    const newStatus = promo.status === 'active' ? 'inactive' : 'active'
    await api.put(`/promotions/product-frees/${promo.id}/update-status`, { status: newStatus })
    toast.success('Status berhasil diubah')
    fetchPromotions()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status')
  }
}

async function handleDelete(promo: PromotionFree) {
  const confirmed = await showConfirm({
    title: 'Hapus Promosi',
    message: `Yakin ingin menghapus promosi "${promo.name}"? Aksi ini tidak dapat dibatalkan.`,
    confirmText: 'Hapus',
    cancelText: 'Batal',
    variant: 'danger',
  })
  if (!confirmed) return
  try {
    await api.delete(`/promotions/product-frees/${promo.id}`)
    toast.success('Promosi berhasil dihapus')
    fetchPromotions()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus promosi')
  }
}

onMounted(() => { fetchPromotions() })
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Promosi Produk Gratis</h1>
        <p class="mt-0.5 text-sm text-gray-500">Kelola promosi beli X dapat produk gratis</p>
      </div>
      <NuxtLink
        to="/promotion/free-product/create"
        class="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
      >
        <Plus class="h-4 w-4" />
        Buat Promosi
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative min-w-[220px] flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari nama promosi..."
          class="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          @input="onSearch"
        />
      </div>
      <AppFilterSelect
        :model-value="filterStatus"
        :options="statusOptions"
        :searchable="false"
        multiple
        placeholder="Status"
        @update:model-value="onStatusFilter"
      />
      <button
        class="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-2 text-gray-500 transition-colors hover:bg-gray-50"
        :disabled="loading"
        @click="fetchPromotions()"
      >
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <!-- Table -->
    <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200/60">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[800px] text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50/70">
              <th class="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Promosi</th>
              <th class="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Periode</th>
              <th class="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Penggunaan</th>
              <th class="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Visibilitas</th>
              <th class="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Status</th>
              <th class="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Aksi</th>
            </tr>
          </thead>

          <!-- Loading skeleton -->
          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-gray-100">
              <td class="px-4 py-4"><div class="h-10 w-48 animate-pulse rounded-lg bg-gray-200" /></td>
              <td class="px-4 py-4"><div class="h-8 w-32 animate-pulse rounded-lg bg-gray-200" /></td>
              <td class="px-4 py-4"><div class="mx-auto h-6 w-16 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-4"><div class="mx-auto h-6 w-20 animate-pulse rounded-full bg-gray-200" /></td>
              <td class="px-4 py-4"><div class="mx-auto h-6 w-24 animate-pulse rounded bg-gray-200" /></td>
              <td class="px-4 py-4"><div class="flex justify-end gap-1"><div class="h-8 w-8 animate-pulse rounded-lg bg-gray-200" /><div class="h-8 w-8 animate-pulse rounded-lg bg-gray-200" /><div class="h-8 w-8 animate-pulse rounded-lg bg-gray-200" /></div></td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="!promotions.length">
            <tr>
              <td colspan="6" class="px-4 py-20 text-center">
                <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                  <Gift class="h-8 w-8 text-gray-400" />
                </div>
                <h3 class="mt-4 text-base font-semibold text-gray-900">Belum ada promosi produk gratis</h3>
                <p class="mt-1 text-sm text-gray-500">Mulai buat promosi untuk meningkatkan konversi</p>
                <NuxtLink
                  to="/promotion/free-product/create"
                  class="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
                >
                  <Plus class="h-4 w-4" />Buat Promosi Pertama
                </NuxtLink>
              </td>
            </tr>
          </tbody>

          <!-- Data -->
          <tbody v-else>
            <tr
              v-for="promo in promotions"
              :key="promo.id"
              class="group border-b border-gray-100 transition-all last:border-b-0 hover:bg-primary-50/30"
            >
              <!-- Promosi -->
              <td class="px-4 py-4">
                <div class="flex items-start gap-3">
                  <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 ring-1 ring-green-200">
                    <Gift class="h-5 w-5 text-green-600" />
                  </div>
                  <div class="min-w-0">
                    <NuxtLink
                      :to="`/promotion/free-product/${promo.id}`"
                      class="font-semibold text-gray-900 transition-colors group-hover:text-primary-600"
                    >
                      {{ promo.name }}
                    </NuxtLink>
                    <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        v-if="itemTypeConfig[promo.item_type]"
                        class="rounded-md px-1.5 py-0.5 text-xs font-medium"
                        :class="itemTypeConfig[promo.item_type]!.bg"
                      >
                        {{ itemTypeConfig[promo.item_type]!.label }}
                      </span>
                      <span v-if="promo.is_multiple === 'active'" class="rounded-md bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                        Multiple
                      </span>
                      <span v-if="promo.min_spend > 0" class="text-xs text-gray-500">
                        Min Rp {{ new Intl.NumberFormat('id-ID').format(promo.min_spend) }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Periode -->
              <td class="px-4 py-4">
                <div class="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar class="h-3.5 w-3.5 shrink-0" />
                  <div>
                    <p class="font-medium text-gray-700">{{ formatDateTime(promo.date_start) }}</p>
                    <p>s/d {{ formatDateTime(promo.date_end) }}</p>
                  </div>
                </div>
              </td>

              <!-- Penggunaan -->
              <td class="px-4 py-4 text-center">
                <p class="text-sm font-medium text-gray-900">{{ promo.used || 0 }} / {{ promo.max_use > 0 ? promo.max_use : '∞' }}</p>
                <p class="text-xs text-gray-400">per customer: {{ promo.max_use_per_customer > 0 ? promo.max_use_per_customer : '∞' }}</p>
              </td>

              <!-- Visibilitas -->
              <td class="px-4 py-4">
                <div class="flex items-center justify-center gap-1">
                  <span v-if="promo.internal_visibility === 'active'" title="Internal" class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">INT</span>
                  <span v-if="promo.web_visibility === 'active'" title="Web" class="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">WEB</span>
                  <span v-if="promo.app_visibility === 'active'" title="App" class="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">APP</span>
                  <span v-if="promo.internal_visibility !== 'active' && promo.web_visibility !== 'active' && promo.app_visibility !== 'active'" class="text-xs text-gray-400">-</span>
                </div>
              </td>

              <!-- Status -->
              <td class="px-4 py-4 text-center">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="statusBadgeClass(promo.status_label)"
                >
                  {{ promo.status_label }}
                </span>
              </td>

              <!-- Aksi -->
              <td class="px-4 py-4">
                <div class="flex items-center justify-end gap-1">
                  <NuxtLink
                    :to="`/promotion/free-product/create?edit=${promo.id}`"
                    class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Detail"
                  >
                    <Pencil class="h-4 w-4" />
                  </NuxtLink>
                  <button
                    class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    :title="promo.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'"
                    @click="toggleStatus(promo)"
                  >
                    <ToggleRight v-if="promo.status === 'active'" class="h-4 w-4 text-green-500" />
                    <ToggleLeft v-else class="h-4 w-4" />
                  </button>
                  <button
                    class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Hapus"
                    @click="handleDelete(promo)"
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
      <div v-if="totalPage > 1" class="flex items-center justify-between border-t border-gray-200 px-4 py-3">
        <p class="text-sm text-gray-500">Total {{ total }} promosi</p>
        <AppPagination
          :page="page"
          :total-page="totalPage"
          :total="total"
          :per-page="perPage"
          @update:page="onPageChange"
          @update:per-page="onPerPageChange"
        />
      </div>
    </div>
  </div>
</template>

