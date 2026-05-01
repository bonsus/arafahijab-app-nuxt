<script setup lang="ts">
import {
  Plus, Search, Pencil, Trash2, Eye, RefreshCw,
  ToggleLeft, ToggleRight, Tag, Calendar, Ticket,
} from 'lucide-vue-next'

const props = defineProps<{
  type: 'discount' | 'checkout' | 'product_free' | 'shipping'
  title: string
  createRoute: string
}>()

interface Promotion {
  id: string
  type: string
  name: string
  description: string
  start_date: string
  end_date: string
  status: string
  coupon_code: string
  discount_type: string
  discount_value: number
  max_discount_value: number
  item_type: string
  customer_type: string
  min_spend: number
  max_use: number
  max_use_per_customer: number
  created_at: string
  updated_at: string
}

interface PaginatedPromotions {
  data: Promotion[]
  page: number
  per_page: number
  total_page: number
  total: number
}

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(true)
const promotions = ref<Promotion[]>([])
const page = ref(1)
const perPage = ref(20)
const totalPage = ref(1)
const total = ref(0)
const search = ref('')
const filterStatus = ref<string[]>([])

const statusOptions = [
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
  { value: 'draft', label: 'Draft' },
]

const statusConfig: Record<string, { label: string; bg: string }> = {
  active: { label: 'Aktif', bg: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  inactive: { label: 'Nonaktif', bg: 'bg-gray-50 text-gray-500 ring-1 ring-gray-200' },
  draft: { label: 'Draft', bg: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
}

async function fetchPromotions() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      per_page: String(perPage.value),
      type: props.type,
    }
    if (search.value) params.search = search.value
    if (filterStatus.value.length) params.status = filterStatus.value.join(',')

    const res = await api.get<{ data: PaginatedPromotions }>('/sales/promotions/index', params)
    promotions.value = res.data?.data || []
    totalPage.value = res.data?.total_page || 1
    total.value = res.data?.total || 0
  }
  catch {
    promotions.value = []
  }
  finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchPromotions()
  }, 300)
}

function onStatusFilter(val: string | string[]) {
  filterStatus.value = val as string[]
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

function formatPrice(val: number): string {
  return new Intl.NumberFormat('id-ID').format(val)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isExpired(promo: Promotion): boolean {
  return new Date(promo.end_date) < new Date()
}

function isUpcoming(promo: Promotion): boolean {
  return new Date(promo.start_date) > new Date()
}

// Delete
async function handleDelete(promo: Promotion) {
  const ok = await confirm({
    title: 'Hapus Promosi',
    message: `Hapus promosi "${promo.name}"? Data yang sudah dihapus tidak dapat dikembalikan.`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await api.delete(`/sales/promotions/${promo.id}`)
    toast.success('Promosi berhasil dihapus')
    await fetchPromotions()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus promosi')
  }
}

// Toggle status
async function toggleStatus(promo: Promotion) {
  const newStatus = promo.status === 'active' ? 'inactive' : 'active'
  try {
    await api.put(`/sales/promotions/${promo.id}/update-status`, { status: newStatus })
    promo.status = newStatus
    toast.success(`Status diubah ke ${statusConfig[newStatus]?.label || newStatus}`)
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status')
  }
}

onMounted(fetchPromotions)
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">{{ title }}</h1>
        <p class="mt-0.5 text-sm text-gray-500">Kelola promosi dan penawaran spesial</p>
      </div>
      <NuxtLink
        :to="createRoute"
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
          placeholder="Cari nama promosi, kode kupon..."
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
              <th class="px-4 py-3 text-left">Diskon</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr v-for="i in 8" :key="i" class="border-b border-gray-100">
              <td v-for="j in 5" :key="j" class="px-4 py-3">
                <div class="h-4 animate-pulse rounded bg-gray-200" :class="j === 1 ? 'w-48' : 'w-20'" />
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="!promotions.length">
            <tr>
              <td colspan="5" class="px-4 py-16 text-center">
                <Tag class="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p class="text-sm text-gray-500">Belum ada promosi</p>
                <NuxtLink
                  :to="createRoute"
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
                      :to="`/promotion/${promo.id}`"
                      class="font-semibold text-gray-900 hover:text-primary-600"
                    >
                      {{ promo.name }}
                    </NuxtLink>
                    <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                      <span v-if="promo.coupon_code" class="flex items-center gap-1">
                        <Ticket class="h-3 w-3" />
                        {{ promo.coupon_code }}
                      </span>
                      <span v-if="promo.min_spend">Min. Rp{{ formatPrice(promo.min_spend) }}</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Periode -->
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="flex items-center gap-1.5 text-gray-600">
                  <Calendar class="h-3.5 w-3.5 text-gray-400" />
                  <div class="text-xs">
                    <div>{{ formatDate(promo.start_date) }}</div>
                    <div class="text-gray-400">{{ formatDate(promo.end_date) }}</div>
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

              <!-- Diskon -->
              <td class="px-4 py-3 whitespace-nowrap text-gray-700">
                <span v-if="promo.discount_value" class="font-medium">
                  {{ promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `Rp${formatPrice(promo.discount_value)}` }}
                </span>
                <span v-else class="text-gray-400">-</span>
                <div
                  v-if="promo.max_discount_value && promo.discount_type === 'percentage'"
                  class="text-xs text-gray-500"
                >
                  Maks Rp{{ formatPrice(promo.max_discount_value) }}
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
                    :to="`/promotion/${promo.id}`"
                    class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Detail"
                  >
                    <Eye class="h-4 w-4" />
                  </NuxtLink>
                  <NuxtLink
                    :to="`/promotion/${promo.id}/edit`"
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