<script setup lang="ts">
import { Truck, ChevronDown, ChevronUp, Search, ToggleLeft, ToggleRight } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface CourierService {
  id: string
  provider: string
  service_code: string
  service_name: string
  is_active: boolean
}

interface CourierEntry {
  id: string
  provider: string
  courier_code: string
  courier_name: string
  is_active: boolean
  services: CourierService[]
}

interface CourierGroup {
  courierName: string
  courierCode: string
  provider: string
  services: CourierService[]
  isActive: boolean
}

const api = useApi()
const toast = useToast()

const loading = ref(true)
const togglingIds = ref<Set<string>>(new Set())
const couriers = ref<CourierEntry[]>([])
const search = ref('')
const activeProvider = ref('')
const expandedKeys = ref<Set<string>>(new Set())

const providers = computed(() => {
  const seen = new Set<string>()
  for (const e of couriers.value) seen.add(e.provider)
  return Array.from(seen).sort()
})

async function fetchCouriers() {
  loading.value = true
  try {
    const res = await api.get<{ data: CourierEntry[] }>('/couriers/index')
    couriers.value = res.data || []
    if (!activeProvider.value && couriers.value.length) {
      activeProvider.value = couriers.value[0]!.provider
    }
  } catch {
    couriers.value = []
  } finally {
    loading.value = false
  }
}

function logoSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Group flat list by courier_name within the active provider
const grouped = computed<CourierGroup[]>(() => {
  const q = search.value.toLowerCase().trim()
  const map: Record<string, CourierGroup> = {}

  for (const entry of couriers.value) {
    if (entry.provider !== activeProvider.value) continue
    if (q && !entry.courier_name.toLowerCase().includes(q) && !entry.courier_code.toLowerCase().includes(q)) continue
    if (!map[entry.courier_name]) {
      map[entry.courier_name] = {
        courierName: entry.courier_name,
        courierCode: entry.courier_code,
        provider: entry.provider,
        services: [],
        isActive: false,
      }
    }
    const group = map[entry.courier_name]!
    group.services.push(...entry.services)
    if (entry.is_active) group.isActive = true
  }

  return Object.values(map).sort((a, b) => a.courierName.localeCompare(b.courierName))
})

const providerCounts = computed(() => {
  const counts: Record<string, Set<string>> = {}
  for (const e of couriers.value) {
    if (!counts[e.provider]) counts[e.provider] = new Set()
    counts[e.provider]!.add(e.courier_name)
  }
  return Object.fromEntries(Object.entries(counts).map(([p, s]) => [p, s.size]))
})

const totalGroups = computed(() => {
  const seen = new Set<string>()
  for (const e of couriers.value) seen.add(`${e.provider}::${e.courier_name}`)
  return seen.size
})

const totalServices = computed(() => couriers.value.reduce((s, e) => s + e.services.length, 0))

function expandKey(provider: string, name: string) {
  return `${provider}::${name}`
}

function toggleExpand(provider: string, name: string) {
  const key = expandKey(provider, name)
  if (expandedKeys.value.has(key)) expandedKeys.value.delete(key)
  else expandedKeys.value.add(key)
}

async function toggleServiceStatus(svc: CourierService, group: CourierGroup) {
  togglingIds.value.add(svc.id)
  const newStatus = svc.is_active ? 'inactive' : 'active'
  try {
    await api.put('/couriers/update-status', { courier_id: svc.id, status: newStatus })
    svc.is_active = !svc.is_active
    group.isActive = group.services.some(s => s.is_active)
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
          v-for="prov in providers"
          :key="prov"
          type="button"
          class="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors"
          :class="activeProvider === prov ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
          @click="activeProvider = prov"
        >
          {{ prov }}
          <span
            class="ml-1 inline-flex items-center justify-center rounded-full px-1.5 text-xs"
            :class="activeProvider === prov ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500'"
          >
            {{ providerCounts[prov] || 0 }}
          </span>
        </button>
      </div>
      <div v-if="!loading && couriers.length > 0" class="text-xs text-gray-500">
        Total {{ totalGroups }} kurir &middot; {{ totalServices }} layanan
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
      <div v-for="i in 9" :key="i" class="animate-pulse rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-lg bg-gray-200" />
          <div class="flex-1 space-y-2">
            <div class="h-4 w-28 rounded bg-gray-200" />
            <div class="h-3 w-16 rounded bg-gray-100" />
          </div>
          <div class="h-5 w-12 rounded-full bg-gray-100" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!grouped.length" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <Truck class="mx-auto h-12 w-12 text-gray-300" />
      <h3 class="mt-3 text-sm font-semibold text-gray-900">Tidak ada kurir ditemukan</h3>
      <p class="mt-1 text-sm text-gray-500">Coba ubah kata kunci pencarian.</p>
    </div>

    <!-- Courier cards grid -->
    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="group in grouped"
        :key="group.courierName"
        class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md"
      >
        <!-- Card header -->
        <div class="p-5">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50 ring-1 ring-gray-200">
              <img
                :src="`/images/couriers/${logoSlug(group.courierCode)}.png`"
                :alt="group.courierName"
                class="h-7 w-7 object-contain"
                @error="($event.target as HTMLImageElement).style.display='none'"
              />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="text-sm font-semibold text-gray-900">{{ group.courierName }}</h3>
              <p class="mt-0.5 text-xs text-gray-400">{{ group.services.length }} layanan</p>
            </div>
            <span
              class="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1"
              :class="group.isActive ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-gray-50 text-gray-500 ring-gray-200'"
            >
              {{ group.isActive ? 'Aktif' : 'Nonaktif' }}
            </span>
          </div>

          <!-- Expand toggle -->
          <div class="mt-3 flex justify-end">
            <button
              v-if="group.services.length > 0"
              type="button"
              class="flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-700"
              @click="toggleExpand(group.provider, group.courierName)"
            >
              {{ expandedKeys.has(expandKey(group.provider, group.courierName)) ? 'Sembunyikan' : 'Lihat layanan' }}
              <ChevronUp v-if="expandedKeys.has(expandKey(group.provider, group.courierName))" class="h-3.5 w-3.5" />
              <ChevronDown v-else class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <!-- Expandable services -->
        <div v-if="expandedKeys.has(expandKey(group.provider, group.courierName))" class="border-t border-gray-100 px-5 py-3">
          <p class="mb-2 text-xs font-medium text-gray-500">Layanan Tersedia</p>
          <div class="space-y-1.5">
            <div
              v-for="svc in group.services"
              :key="svc.id"
              class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
            >
              <div class="min-w-0 flex-1">
                <p class="text-xs text-gray-700">{{ svc.service_name || '—' }}</p>
                <p class="font-mono text-[10px] text-gray-400">{{ svc.service_code }}</p>
              </div>
              <button
                type="button"
                class="ml-2 flex shrink-0 items-center gap-1.5 transition-colors disabled:opacity-50"
                :disabled="togglingIds.has(svc.id)"
                @click="toggleServiceStatus(svc, group)"
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
  </div>
</template>
