<script setup lang="ts">
import {
  Plus, Search, Pencil, Trash2, RefreshCw,
  ToggleLeft, ToggleRight, Tag, Calendar, Clock,
  Percent, Package, Box, AlertCircle, CheckCircle,
  Globe, Smartphone, Building2, Ticket, Users
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const toast = useToast()
const { confirm: showConfirm } = useConfirm()
const route = useRoute() 
const promoType = computed(() => route.params.type as string)

interface PromotionCheckout {
  id: string
  name: string
  date_start: string
  date_end: string
  discount_type: string
  item_type: string
  item_operator: string
  status: string
  status_label: string
  internal_visibility: string
  web_visibility: string
  app_visibility: string
  coupon_count: number
  max_use: number
  used: number
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

const promotions = ref<PromotionCheckout[]>([])

const statusOptions = [
  { label: 'Aktif', value: 'active', color: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  { label: 'Tidak Aktif', value: 'inactive', color: 'bg-gray-50 text-gray-700 ring-1 ring-gray-200' },
  { label: 'Draft', value: 'draft', color: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
]

const itemTypeConfig: Record<string, { label: string; bg: string; icon: any }> = {
  all: { label: 'Semua Produk', bg: 'bg-gray-50 text-gray-700 ring-1 ring-gray-200', icon: Package },
  category: { label: 'Kategori', bg: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', icon: Tag },
  product: { label: 'Produk', bg: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200', icon: Package },
  sku: { label: 'SKU', bg: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200', icon: Box },
}

const discountTypeConfig: Record<string, { label: string; icon: any }> = {
  percentage: { label: 'Persentase', icon: Percent },
  fixed: { label: 'Nominal', icon: null }, // Custom Rp icon
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

function statusLabel(promo: PromotionCheckout): string {
  if (promo.status === 'inactive') return 'Tidak Aktif'
  else if (promo.status === 'active') {
    if (new Date(promo.date_end) < new Date()) {
      return 'Berakhir'
    }
    else if (new Date(promo.date_start) > new Date()) {
      return 'Akan Datang'
    }
    else if (new Date(promo.date_start) <= new Date() && new Date(promo.date_end) >= new Date()) {
      return 'Berlangsung'
    }
  }
  return promo.status || '-'
}

async function fetchPromotions() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: page.value,
      per_page: perPage.value,
      type: promoType.value,
    }
    if (search.value) params.search = search.value
    if (filterStatus.value.length === 1) params.status = filterStatus.value[0]

    const res = await api.get<{ data: any }>('/promotions/checkouts/index', params)
    const data = res.data?.data || res.data || []
    promotions.value = Array.isArray(data) ? data : (data.data || [])
    
    // Set status_label untuk setiap promo
    promotions.value.forEach(promo => {
      promo.status_label = statusLabel(promo)
    })
    
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

async function toggleStatus(promo: PromotionCheckout) {
  try {
    const newStatus = promo.status === 'active' ? 'inactive' : 'active'
    await api.put(`/promotions/checkouts/${promo.id}/update-status`, { status: newStatus })
    toast.success('Status berhasil diubah')
    fetchPromotions()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status')
  }
}

async function handleDelete(promo: PromotionCheckout) {
  const confirmed = await showConfirm({
    title: 'Hapus Promosi',
    message: `Yakin ingin menghapus promosi "${promo.name}"? Aksi ini tidak dapat dibatalkan.`,
    confirmText: 'Hapus',
    cancelText: 'Batal',
    variant: 'danger'
  })
  
  if (!confirmed) return
  
  try {
    await api.delete(`/promotions/checkouts/${promo.id}`)
    toast.success('Promosi berhasil dihapus')
    fetchPromotions()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus promosi')
  }
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getRelativeTime(dateStr: string): string {
  if (!dateStr) return '-'
  
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24))
  const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60))
  
  if (diff > 0) {
    // Future
    if (days > 7) return `${Math.floor(days / 7)} minggu lagi`
    if (days > 0) return `${days} hari lagi`
    if (hours > 0) return `${hours} jam lagi`
    return 'Segera'
  } else {
    // Past
    if (days > 7) return `${Math.floor(days / 7)} minggu yang lalu`
    if (days > 0) return `${days} hari yang lalu`
    if (hours > 0) return `${hours} jam yang lalu`
    return 'Baru saja'
  }
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
        <template v-if="promoType === 'checkout'">
          <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Promosi Checkout</h1>
          <p class="mt-0.5 text-sm text-gray-500">Kelola promosi checkout dengan sistem kupon</p>
        </template>
        <template v-else-if="promoType === 'shipping'">
          <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Promosi Ongkir</h1>
          <p class="mt-0.5 text-sm text-gray-500">Kelola promosi ongkir untuk meningkatkan konversi</p>
        </template>
      </div>
      <NuxtLink
        :to="`/promotion/${promoType}/create`"
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
          placeholder="Cari nama promosi atau kupon..."
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
    <div class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200/60">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-50/50">
              <th class="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Promosi
              </th>
              <th class="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Periode
              </th>
              <th class="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                Kupon
              </th>
              <th class="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                Visibilitas
              </th>
              <th class="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                Status
              </th>
              <th class="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-gray-100">
              <td class="px-4 py-4">
                <div class="flex items-start gap-3">
                  <div class="h-11 w-11 animate-pulse rounded-xl bg-gray-200" />
                  <div class="flex-1 space-y-2">
                    <div class="h-4 w-48 animate-pulse rounded bg-gray-200" />
                    <div class="flex gap-2">
                      <div class="h-5 w-20 animate-pulse rounded bg-gray-200" />
                      <div class="h-5 w-16 animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-4">
                <div class="space-y-2">
                  <div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  <div class="h-4 w-28 animate-pulse rounded bg-gray-200" />
                </div>
              </td>
              <td class="px-4 py-4">
                <div class="mx-auto h-6 w-20 animate-pulse rounded bg-gray-200" />
              </td>
              <td class="px-4 py-4">
                <div class="mx-auto h-6 w-20 animate-pulse rounded-full bg-gray-200" />
              </td>
              <td class="px-4 py-4">
                <div class="mx-auto h-6 w-24 animate-pulse rounded bg-gray-200" />
              </td>
              <td class="px-4 py-4">
                <div class="flex justify-end gap-1">
                  <div class="h-8 w-8 animate-pulse rounded-lg bg-gray-200" />
                  <div class="h-8 w-8 animate-pulse rounded-lg bg-gray-200" />
                  <div class="h-8 w-8 animate-pulse rounded-lg bg-gray-200" />
                </div>
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="!promotions.length">
            <tr>
              <td colspan="6" class="px-4 py-20 text-center">
                <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                  <Ticket class="h-8 w-8 text-gray-400" />
                </div>
                <h3 class="mt-4 text-base font-semibold text-gray-900">Belum ada promosi</h3>
                <p class="mt-1 text-sm text-gray-500">Mulai buat promosi untuk meningkatkan konversi</p>
                <NuxtLink
                  :to="`/promotion/${promoType}/create`"
                  class="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
                >
                  <Plus class="h-4 w-4" />
                  Buat Promosi Pertama
                </NuxtLink>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr
              v-for="promo in promotions"
              :key="promo.id"
              class="group border-b border-gray-100 transition-all last:border-b-0 hover:bg-primary-50/30"
            >
              <!-- Promosi -->
              <td class="px-4 py-4">
                <div class="flex items-start gap-3">
                  <div 
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all"
                    :class="[
                      promo.status_label === 'Berakhir' ? 'bg-red-50 ring-1 ring-red-200' :
                      promo.status_label === 'Berlangsung' ? 'bg-green-50 ring-1 ring-green-200' :
                      promo.status_label === 'Akan Datang' ? 'bg-blue-50 ring-1 ring-blue-200' :
                      'bg-gray-50 ring-1 ring-gray-200'
                    ]"
                  >
                    <component 
                      v-if="discountTypeConfig[promo.discount_type]?.icon"
                      :is="discountTypeConfig[promo.discount_type]?.icon" 
                      class="h-5 w-5"
                      :class="[
                        promo.status_label === 'Berakhir' ? 'text-red-600' :
                        promo.status_label === 'Berlangsung' ? 'text-green-600' :
                        promo.status_label === 'Akan Datang' ? 'text-blue-600' :
                        'text-gray-500'
                      ]"
                    />
                    <span
                      v-else
                      class="text-sm font-bold"
                      :class="[
                        promo.status_label === 'Berakhir' ? 'text-red-600' :
                        promo.status_label === 'Berlangsung' ? 'text-green-600' :
                        promo.status_label === 'Akan Datang' ? 'text-blue-600' :
                        'text-gray-500'
                      ]"
                    >
                      Rp
                    </span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-start gap-2">
                      <NuxtLink
                        :to="`/promotion/${promoType}/${promo.id}`"
                        class="font-semibold text-gray-900 transition-colors group-hover:text-primary-600"
                      >
                        {{ promo.name }}
                      </NuxtLink>
                    </div>
                    <div class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                      <span>{{ itemTypeConfig[promo.item_type]?.label || promo.item_type }}</span>
                      <span v-if="promo.item_operator" class="text-gray-400">|</span>
                      <span v-if="promo.item_operator" class="capitalize">{{ promo.item_operator.toUpperCase() }}</span> 
                    </div>
                  </div>
                </div>
              </td> 

              <!-- Periode -->
              <td class="px-4 py-4">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <Calendar class="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <div class="text-xs">
                      <div class="font-medium text-gray-900">{{ formatDateTime(promo.date_start) }}</div>
                      <div class="text-gray-500">s/d {{ formatDateTime(promo.date_end) }}</div>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Kupon -->
              <td class="px-4 py-4 text-center">
                <div class="flex flex-col items-center gap-0.5">
                  <div class="flex items-center gap-1.5">
                    <Ticket class="h-3.5 w-3.5 text-primary-600" />
                    <span class="text-sm font-semibold text-gray-900">{{ promo.used }}/{{ promo.max_use > 0 ? promo.max_use : '∞' }}</span>
                  </div>
                  <span class="text-[10px] text-gray-500">{{promo.coupon_count}} kode kupon</span>
                </div>
              </td>

              <!-- Visibilitas -->
              <td class="px-4 py-4">
                <div class="flex items-center justify-center gap-1.5 text-[9px]">
                  <span
                    v-if="promo.internal_visibility === 'active'"
                    class="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1 py-0.5 font-medium text-gray-700"
                    title="Internal"
                  >
                    <Building2 class="h-3 w-3" />
                    INT
                  </span>
                  <span
                    v-if="promo.web_visibility === 'active'"
                    class="inline-flex items-center gap-1 rounded-md bg-blue-100 px-1 py-0.5 font-medium text-blue-700"
                    title="Website"
                  >
                    <Globe class="h-3 w-3" />
                    WEB
                  </span>
                  <span
                    v-if="promo.app_visibility === 'active'"
                    class="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-[10px] font-medium text-green-700"
                    title="Mobile App"
                  >
                    <Smartphone class="h-3 w-3" />
                    APP
                  </span>
                  <span v-if="promo.internal_visibility !== 'active' && promo.web_visibility !== 'active' && promo.app_visibility !== 'active'" class="text-xs text-gray-400">-</span>
                </div>
              </td>

              <!-- Status -->
              <td class="px-4 py-4 text-center">
                <div 
                  v-if="promo.status_label"
                  class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
                  :class="{
                    'bg-green-50 text-green-700 ring-1 ring-green-200': promo.status_label === 'Berlangsung',
                    'bg-red-50 text-red-700 ring-1 ring-red-200': promo.status_label === 'Berakhir',
                    'bg-blue-50 text-blue-700 ring-1 ring-blue-200': promo.status_label === 'Akan Datang',
                    'bg-gray-50 text-gray-700 ring-1 ring-gray-200': promo.status_label === 'Tidak Aktif'
                  }"
                >
                  <component 
                    :is="promo.status_label === 'Berlangsung' ? CheckCircle : promo.status_label === 'Berakhir' ? AlertCircle : promo.status_label === 'Akan Datang' ? Clock : AlertCircle" 
                    class="h-3 w-3" 
                  />
                  {{ promo.status_label }}
                  <span v-if="promo.status_label === 'Berlangsung' && promo.date_end" class="ml-0.5 text-[10px] opacity-75">
                    ({{ getRelativeTime(promo.date_end) }})
                  </span>
                  <span v-else-if="promo.status_label === 'Akan Datang' && promo.date_start" class="ml-0.5 text-[10px] opacity-75">
                    ({{ getRelativeTime(promo.date_start) }})
                  </span>
                </div>
              </td>

              <!-- Aksi -->
              <td class="px-4 py-4">
                <div class="flex items-center justify-end gap-1">
                  <NuxtLink
                    :to="`/promotion/${promoType}/create?edit=${promo.id}`"
                    class="rounded-lg p-2 text-gray-400 transition-all hover:bg-primary-50 hover:text-primary-600"
                    title="Edit"
                  >
                    <Pencil class="h-4 w-4" />
                  </NuxtLink>
                  <button
                    class="rounded-lg p-2 transition-all"
                    :class="promo.status === 'active' 
                      ? 'text-green-500 hover:bg-green-50 hover:text-green-600' 
                      : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'"
                    :title="promo.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'"
                    @click="toggleStatus(promo)"
                  >
                    <ToggleRight v-if="promo.status === 'active'" class="h-4 w-4" />
                    <ToggleLeft v-else class="h-4 w-4" />
                  </button>
                  <button
                    class="rounded-lg p-2 text-gray-400 transition-all hover:bg-red-50 hover:text-red-600"
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
