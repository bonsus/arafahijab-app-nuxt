<script setup lang="ts">
import {
  Plus, Search, Pencil, Trash2, Eye,
  ChevronLeft, ChevronRight, Loader2, EllipsisVertical,
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
const filterStatus = ref('')

const statusTabs = [
  { key: '', label: 'Semua' },
  { key: 'active', label: 'Aktif' },
  { key: 'inactive', label: 'Nonaktif' },
  { key: 'draft', label: 'Draft' },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Aktif', color: 'bg-green-100 text-green-700' },
  inactive: { label: 'Nonaktif', color: 'bg-gray-100 text-gray-500' },
  draft: { label: 'Draft', color: 'bg-yellow-100 text-yellow-700' },
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
    if (filterStatus.value) params.status = filterStatus.value

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

function onStatusFilter(status: string) {
  filterStatus.value = status
  page.value = 1
  fetchPromotions()
}

function goPage(p: number) {
  if (p < 1 || p > totalPage.value) return
  page.value = p
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

// Action menu
const openMenuId = ref<string | null>(null)
function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id
}
function closeMenu() {
  openMenuId.value = null
}

// Pagination
const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, page.value - 2)
  const end = Math.min(totalPage.value, page.value + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

onMounted(() => {
  fetchPromotions()
  document.addEventListener('click', closeMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{{ title }}</h1>
        <p class="mt-1 text-sm text-gray-500">{{ total }} promosi</p>
      </div>
      <NuxtLink
        :to="createRoute"
        class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
      >
        <Plus class="h-4 w-4" />
        Tambah Promosi
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="space-y-3">
      <!-- Status tabs -->
      <div class="flex gap-1 overflow-x-auto pb-1">
        <button
          v-for="tab in statusTabs"
          :key="tab.key"
          class="shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="filterStatus === tab.key
            ? 'bg-primary-600 text-white'
            : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'"
          @click="onStatusFilter(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Search -->
      <div class="relative">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari nama promosi, kode kupon..."
          class="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:max-w-md"
          @input="onSearch"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <div v-for="i in 5" :key="i" class="flex animate-pulse items-center gap-4 border-b border-gray-100 px-4 py-3.5 last:border-b-0">
        <div class="h-10 w-10 rounded-lg bg-gray-200" />
        <div class="flex-1 space-y-2">
          <div class="h-4 w-48 rounded bg-gray-200" />
          <div class="h-3 w-32 rounded bg-gray-200" />
        </div>
        <div class="h-6 w-16 rounded-full bg-gray-200" />
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!promotions.length" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <Tag class="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p class="text-gray-500">
        {{ search || filterStatus ? 'Tidak ada promosi yang cocok' : 'Belum ada promosi.' }}
      </p>
    </div>

    <!-- Promotion list -->
    <div v-else class="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <div
        v-for="promo in promotions"
        :key="promo.id"
        class="border-b border-gray-100 last:border-b-0"
      >
        <div class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50/50 sm:gap-4">
          <!-- Icon -->
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 ring-1 ring-primary-100">
            <Tag class="h-5 w-5 text-primary-600" />
          </div>

          <!-- Info -->
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <NuxtLink
                :to="`/promotion/${promo.id}`"
                class="text-sm font-semibold text-gray-900 hover:text-primary-600 sm:truncate"
              >
                {{ promo.name }}
              </NuxtLink>
              <span
                class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                :class="statusConfig[promo.status]?.color || 'bg-gray-100 text-gray-500'"
              >
                {{ statusConfig[promo.status]?.label || promo.status }}
              </span>
              <span
                v-if="isExpired(promo) && promo.status === 'active'"
                class="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
              >
                Expired
              </span>
              <span
                v-else-if="isUpcoming(promo)"
                class="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
              >
                Upcoming
              </span>
            </div>
            <div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
              <span v-if="promo.coupon_code" class="flex items-center gap-1">
                <Ticket class="h-3 w-3" />
                {{ promo.coupon_code }}
              </span>
              <span class="flex items-center gap-1">
                <Calendar class="h-3 w-3" />
                {{ formatDate(promo.start_date) }} – {{ formatDate(promo.end_date) }}
              </span>
              <span v-if="promo.discount_value">
                {{ promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `Rp ${formatPrice(promo.discount_value)}` }}
                <template v-if="promo.max_discount_value && promo.discount_type === 'percentage'">
                  (maks Rp {{ formatPrice(promo.max_discount_value) }})
                </template>
              </span>
              <span v-if="promo.min_spend">Min. Rp {{ formatPrice(promo.min_spend) }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title="Toggle Status"
              @click="toggleStatus(promo)"
            >
              <ToggleRight v-if="promo.status === 'active'" class="h-5 w-5 text-green-500" />
              <ToggleLeft v-else class="h-5 w-5 text-gray-400" />
            </button>
            <div class="relative">
              <button
                class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                @click.stop="toggleMenu(promo.id)"
              >
                <EllipsisVertical class="h-4 w-4" />
              </button>
              <Transition
                enter-active-class="transition duration-100 ease-out"
                enter-from-class="scale-95 opacity-0"
                enter-to-class="scale-100 opacity-100"
                leave-active-class="transition duration-75 ease-in"
                leave-from-class="scale-100 opacity-100"
                leave-to-class="scale-95 opacity-0"
              >
                <div
                  v-if="openMenuId === promo.id"
                  class="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg bg-white py-1 shadow-lg ring-1 ring-gray-200"
                >
                  <NuxtLink
                    :to="`/promotion/${promo.id}`"
                    class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    @click="closeMenu"
                  >
                    <Eye class="h-3.5 w-3.5" />
                    Lihat Detail
                  </NuxtLink>
                  <NuxtLink
                    :to="`/promotion/${promo.id}/edit`"
                    class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    @click="closeMenu"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                    Edit
                  </NuxtLink>
                  <button
                    class="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    @click="handleDelete(promo); closeMenu()"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                    Hapus
                  </button>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="totalPage > 1"
      class="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
    >
      <p class="text-sm text-gray-500">
        Halaman {{ page }} dari {{ totalPage }} ({{ total }} promosi)
      </p>
      <div class="flex items-center gap-1">
        <button
          :disabled="page <= 1"
          class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 disabled:opacity-40"
          @click="goPage(page - 1)"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <button
          v-for="p in visiblePages"
          :key="p"
          class="min-w-[36px] rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="p === page ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
          @click="goPage(p)"
        >
          {{ p }}
        </button>
        <button
          :disabled="page >= totalPage"
          class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 disabled:opacity-40"
          @click="goPage(page + 1)"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>
