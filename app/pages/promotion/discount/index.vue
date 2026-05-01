<script setup lang="ts">
import {
  Plus, Search, Pencil, Trash2, Eye, RefreshCw,
  ToggleLeft, ToggleRight, Tag, Calendar,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const toast = useToast()

interface PromotionDiscount {
  id: string
  name: string
  date_start: string
  date_end: string
  discount_type: string
  item_type: string
  status: string
  internal_visibility: boolean
  web_visibility: boolean
  app_visibility: boolean
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

const promotions = ref<PromotionDiscount[]>([])

const statusOptions = [
  { label: 'Aktif', value: 'active', color: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  { label: 'Tidak Aktif', value: 'inactive', color: 'bg-gray-50 text-gray-700 ring-1 ring-gray-200' },
  { label: 'Draft', value: 'draft', color: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
]

const statusConfig: Record<string, { label: string; bg: string }> = {
  active: { label: 'Aktif', bg: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  inactive: { label: 'Tidak Aktif', bg: 'bg-gray-50 text-gray-700 ring-1 ring-gray-200' },
  draft: { label: 'Draft', bg: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
}

const itemTypeConfig: Record<string, { label: string; bg: string }> = {
  product: { label: 'Produk', bg: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  sku: { label: 'SKU', bg: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' },
}

const discountTypeConfig: Record<string, string> = {
  percentage: 'Persentase',
  fixed: 'Nominal',
}

let searchTimer: ReturnType<typeof setTimeout>

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchPromotions()
  }, 300)
}

function onStatusFilter(selected: string | string[]) {
  filterStatus.value = Array.isArray(selected) ? selected : [selected]
  page.value = 1
  fetchPromotions()
}

function onPageChange(p: number) {
  page.value = p
  fetchPromotions()
}

function onPerPageChange(pp: number) {
  perPage.value = pp
  page.value = 1
  fetchPromotions()
}

async function fetchPromotions() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: page.value,
      per_page: perPage.value,
    }
    if (search.value) params.search = search.value
    if (filterStatus.value.length === 1) params.status = filterStatus.value[0]

    const res = await api.get<{ data: any }>('/promotions/discounts/index', params)
    const data = res.data?.data || res.data || []
    promotions.value = Array.isArray(data) ? data : (data.data || [])
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

async function toggleStatus(promo: PromotionDiscount) {
  try {
    const newStatus = promo.status === 'active' ? 'inactive' : 'active'
    await api.put(`/promotions/discounts/${promo.id}/update-status`, { status: newStatus })
    toast.success('Status berhasil diubah')
    fetchPromotions()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status')
  }
}

async function handleDelete(promo: PromotionDiscount) {
  if (!confirm(`Yakin ingin menghapus promosi "${promo.name}"?`)) return
  
  try {
    await api.delete(`/promotions/discounts/${promo.id}`)
    toast.success('Promosi berhasil dihapus')
    fetchPromotions()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus promosi')
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}

function isExpired(promo: PromotionDiscount): boolean {
  if (!promo.date_end) return false
  return new Date(promo.date_end) < new Date()
}

function isUpcoming(promo: PromotionDiscount): boolean {
  if (!promo.date_start) return false
  return new Date(promo.date_start) > new Date()
}

onMounted(() => {
  fetchPromotions()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Diskon Produk</h1>
        <p class="mt-0.5 text-sm text-gray-500">Kelola promosi diskon untuk produk dan SKU</p>
      </div>
      <NuxtLink
        to="/promotion/discount/create"
        class="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
      >
        <Plus class="h-4 w-4" />
        Buat Diskon
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
          class="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
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
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
              <th class="px-4 py-3 text-left">Promosi</th>
              <th class="px-4 py-3 text-left">Periode</th>
              <th class="px-4 py-3 text-center">Tipe</th>
              <th class="px-4 py-3 text-center">Visibilitas</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr v-for="i in 8" :key="i" class="border-b border-gray-100">
              <td v-for="j in 6" :key="j" class="px-4 py-3">
                <div class="h-4 animate-pulse rounded bg-gray-200" :class="j === 1 ? 'w-48' : 'w-20'" />
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="!promotions.length">
            <tr>
              <td colspan="6" class="px-4 py-16 text-center">
                <Tag class="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p class="text-sm text-gray-500">Belum ada promosi diskon</p>
                <NuxtLink
                  to="/promotion/discount/create"
                  class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                >
                  <Plus class="h-3.5 w-3.5" />
                  Buat Pertama
                </NuxtLink>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr
              v-for="promo in promotions"
              :key="promo.id"
              class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/50"
            >
              <!-- Promosi -->
              <td class="px-4 py-3">
                <div class="flex items-start gap-3">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 ring-1 ring-primary-100">
                    <Tag class="h-4 w-4 text-primary-600" />
                  </div>
                  <div class="min-w-0">
                    <NuxtLink
                      :to="`/promotion/discount/${promo.id}`"
                      class="font-semibold text-gray-900 hover:text-primary-600"
                    >
                      {{ promo.name }}
                    </NuxtLink>
                    <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                      <span class="inline-flex rounded px-1.5 py-0.5" :class="discountTypeConfig[promo.discount_type] ? 'bg-gray-100 text-gray-600' : ''">
                        {{ discountTypeConfig[promo.discount_type] || promo.discount_type }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Periode -->
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="flex items-center gap-1.5 text-gray-600">
                  <Calendar class="h-3.5 w-3.5 text-gray-400" />
                  <div class="text-xs">
                    <div>{{ formatDate(promo.date_start) }}</div>
                    <div class="text-gray-400">{{ formatDate(promo.date_end) }}</div>
                  </div>
                </div>
                <div class="mt-1">
                  <span
                    v-if="isExpired(promo) && promo.status === 'active'"
                    class="inline-flex rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-red-200"
                  >
                    Expired
                  </span>
                  <span
                    v-else-if="isUpcoming(promo)"
                    class="inline-flex rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-blue-200"
                  >
                    Upcoming
                  </span>
                </div>
              </td>

              <!-- Tipe -->
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="itemTypeConfig[promo.item_type]?.bg || 'bg-gray-50 text-gray-500'"
                >
                  {{ itemTypeConfig[promo.item_type]?.label || promo.item_type }}
                </span>
              </td>

              <!-- Visibilitas -->
              <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-1">
                  <span
                    v-if="promo.internal_visibility"
                    class="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
                    title="Internal"
                  >
                    INT
                  </span>
                  <span
                    v-if="promo.web_visibility"
                    class="inline-flex rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600"
                    title="Website"
                  >
                    WEB
                  </span>
                  <span
                    v-if="promo.app_visibility"
                    class="inline-flex rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-600"
                    title="Mobile App"
                  >
                    APP
                  </span>
                  <span v-if="!promo.internal_visibility && !promo.web_visibility && !promo.app_visibility" class="text-xs text-gray-400">-</span>
                </div>
              </td>

              <!-- Status -->
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="statusConfig[promo.status]?.bg || 'bg-gray-50 text-gray-500'"
                >
                  {{ statusConfig[promo.status]?.label || promo.status }}
                </span>
              </td>

              <!-- Aksi -->
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <NuxtLink
                    :to="`/promotion/discount/${promo.id}`"
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Detail"
                  >
                    <Eye class="h-4 w-4" />
                  </NuxtLink>
                  <NuxtLink
                    :to="`/promotion/discount/${promo.id}/edit`"
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    title="Edit"
                  >
                    <Pencil class="h-4 w-4" />
                  </NuxtLink>
                  <button
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    :title="promo.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'"
                    @click="toggleStatus(promo)"
                  >
                    <ToggleRight v-if="promo.status === 'active'" class="h-4 w-4 text-green-500" />
                    <ToggleLeft v-else class="h-4 w-4" />
                  </button>
                  <button
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
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
      <AppPagination
        :page="page"
        :total-page="totalPage"
        :total="total"
        :per-page="perPage"
        :loading="loading"
        @update:page="onPageChange"
        @update:per-page="onPerPageChange"
      />
    </div>
  </div>
</template>
