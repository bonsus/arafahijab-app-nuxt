<script setup lang="ts">
import { Truck, ChevronDown, ChevronUp, Search, Package, Zap, CreditCard, ToggleLeft, ToggleRight } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface CourierService {
  id: number
  type: string
  code: string
  name: string
  is_active: boolean
}

interface Courier {
  id: number
  type: string
  code: string
  name: string
  is_active: boolean
  services: CourierService[]
}

const api = useApi()
const toast = useToast()

const loading = ref(true)
const togglingIds = ref<Set<number>>(new Set())
const couriers = ref<Courier[]>([])
const search = ref('')
const activeTab = ref('standard')
const expandedCodes = ref<Set<string>>(new Set())

const tabs = [
  { key: 'all', label: 'Semua' },
  { key: 'standard', label: 'Standard' },
  { key: 'cashless', label: 'Cashless' },
  { key: 'instant', label: 'Instan' },
]

const typeConfig: Record<string, { label: string; color: string; icon: any }> = {
  standard: { label: 'Standard', color: 'bg-blue-50 text-blue-700 ring-blue-200', icon: Package },
  cashless: { label: 'Cashless', color: 'bg-purple-50 text-purple-700 ring-purple-200', icon: CreditCard },
  instant: { label: 'Instan', color: 'bg-amber-50 text-amber-700 ring-amber-200', icon: Zap },
}

async function fetchCouriers() {
  loading.value = true
  try {
    const res = await api.get<{ data: Courier[] }>('/couriers/index')
    couriers.value = res.data || []
  } catch {
    couriers.value = []
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => {
  let list = couriers.value
  if (activeTab.value !== 'all') {
    list = list.filter(c => c.type === activeTab.value)
  }
  const q = search.value.toLowerCase().trim()
  if (q) {
    list = list.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
  }
  return list
})

const tabCounts = computed(() => {
  const counts: Record<string, number> = { all: couriers.value.length }
  for (const c of couriers.value) {
    counts[c.type] = (counts[c.type] || 0) + 1
  }
  return counts
})

function toggleExpand(code: string) {
  if (expandedCodes.value.has(code)) {
    expandedCodes.value.delete(code)
  } else {
    expandedCodes.value.add(code)
  }
}

async function toggleServiceStatus(svc: CourierService) {
  togglingIds.value.add(svc.id)
  const newStatus = svc.is_active ? 'inactive' : 'active'
  try {
    await api.put('/couriers/update-status', {
      courier_id: svc.id,
      status: newStatus,
    })
    svc.is_active = !svc.is_active
    // Update parent courier status based on services
    const parent = couriers.value.find(c => c.services.some(s => s.id === svc.id))
    if (parent) {
      parent.is_active = parent.services.some(s => s.is_active)
    }
    toast.success(`Layanan berhasil di${svc.is_active ? 'aktifkan' : 'nonaktifkan'}`)
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status')
  } finally {
    togglingIds.value.delete(svc.id)
  }
}

onMounted(() => fetchCouriers())
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Kurir</h1>
      <p class="mt-1 text-sm text-gray-500">Daftar kurir dan layanan pengiriman yang tersedia.</p>
    </div>

    <!-- Tabs & Search -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          :class="activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <span
            class="ml-1 inline-flex items-center justify-center rounded-full px-1.5 text-xs"
            :class="activeTab === tab.key ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500'"
          >
            {{ tabCounts[tab.key] || 0 }}
          </span>
        </button>
      </div>
      <!-- <div class="relative w-full sm:w-64">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari kurir..."
          class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div> -->
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="animate-pulse rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-lg bg-gray-200" />
          <div class="flex-1 space-y-2">
            <div class="h-4 w-28 rounded bg-gray-200" />
            <div class="h-3 w-20 rounded bg-gray-100" />
          </div>
          <div class="h-6 w-16 rounded-full bg-gray-100" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="filtered.length === 0" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <Truck class="mx-auto h-12 w-12 text-gray-300" />
      <h3 class="mt-3 text-sm font-semibold text-gray-900">Tidak ada kurir ditemukan</h3>
      <p class="mt-1 text-sm text-gray-500">Coba ubah filter atau kata kunci pencarian.</p>
    </div>

    <!-- Courier list -->
    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="courier in filtered"
        :key="courier.code"
        class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md"
      >
        <!-- Courier header -->
        <div class="p-5">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50 ring-1 ring-gray-200">
              <img :src="`/images/couriers/${courier.code}.png`" :alt="courier.name" class="h-7 w-7 object-contain" @error="($event.target as HTMLImageElement).style.display='none'" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="text-sm font-semibold text-gray-900">{{ courier.name }}</h3>
              <p class="mt-0.5 font-mono text-xs text-gray-400">{{ courier.code }}</p>
            </div>
            <span
              class="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1"
              :class="courier.is_active ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-gray-50 text-gray-500 ring-gray-200'"
            >
              {{ courier.is_active ? 'Aktif' : 'Nonaktif' }}
            </span>
          </div>

          <!-- Type badge & services count -->
          <div class="mt-3 flex items-center justify-between">
            <span
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1"
              :class="typeConfig[courier.type]?.color || 'bg-gray-50 text-gray-600 ring-gray-200'"
            >
              <component :is="typeConfig[courier.type]?.icon || Package" class="h-3 w-3" />
              {{ typeConfig[courier.type]?.label || courier.type }}
            </span>
            <button
              v-if="courier.services.length > 0"
              type="button"
              class="flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-700"
              @click="toggleExpand(courier.code)"
            >
              {{ courier.services.length }} layanan
              <ChevronUp v-if="expandedCodes.has(courier.code)" class="h-3.5 w-3.5" />
              <ChevronDown v-else class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <!-- Expandable services -->
        <div v-if="expandedCodes.has(courier.code)" class="border-t border-gray-100 px-5 py-3">
          <p class="mb-2 text-xs font-medium text-gray-500">Layanan Tersedia</p>
          <div class="space-y-1.5">
            <div
              v-for="svc in courier.services"
              :key="svc.id"
              class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
            >
              <span class="text-xs text-gray-700">{{ svc.name }}</span>
              <button
                type="button"
                class="flex items-center gap-1.5 transition-colors disabled:opacity-50"
                :disabled="togglingIds.has(svc.id)"
                @click="toggleServiceStatus(svc)"
              >
                <span
                  class="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                  :class="svc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                >
                  {{ svc.is_active ? 'Aktif' : 'Nonaktif' }}
                </span>
                <ToggleRight v-if="svc.is_active" class="h-5 w-5 text-green-600" />
                <ToggleLeft v-else class="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div v-if="!loading && couriers.length > 0" class="text-xs text-gray-400">
      Total {{ couriers.length }} kurir &middot;
      {{ couriers.reduce((sum, c) => sum + c.services.length, 0) }} layanan
    </div>
  </div>
</template>
