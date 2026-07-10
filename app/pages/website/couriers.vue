<script setup lang="ts">
import { Truck, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Store } from 'lucide-vue-next'

definePageMeta({ layout: 'website', middleware: 'auth' })

interface CourierService {
  id: string
  provider: string
  service_code: string
  service_name: string
  status: string
  sort: number
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

const api = useApi()
const toast = useToast()
const { selectedStoreId, fetchStores } = useWebsiteStore()

const loading = ref(false)
const couriers = ref<CourierEntry[]>([])
const togglingIds = ref<Set<string>>(new Set())
const expandedKeys = ref<Set<string>>(new Set())

async function fetchCouriers() {
  if (!selectedStoreId.value) return
  loading.value = true
  try {
    const res = await api.get<{ data: { data: CourierEntry[] } }>('/website/couriers/index', { store_id: selectedStoreId.value })
    couriers.value = res.data?.data || []
  }
  catch {
    couriers.value = []
  }
  finally {
    loading.value = false
  }
}

function logoSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function toggleExpand(key: string) {
  if (expandedKeys.value.has(key)) expandedKeys.value.delete(key)
  else expandedKeys.value.add(key)
}

async function toggleServiceStatus(svc: CourierService, entry: CourierEntry) {
  togglingIds.value.add(svc.id)
  const newStatus = svc.is_active ? 'inactive' : 'active'
  try {
    await api.put('/website/couriers/update-status', {
      store_id: selectedStoreId.value,
      courier_id: svc.id,
      status: newStatus,
    })
    svc.is_active = !svc.is_active
    svc.status = newStatus
    entry.is_active = entry.services.some(s => s.is_active)
    toast.success(`Layanan berhasil di${svc.is_active ? 'aktifkan' : 'nonaktifkan'}`)
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status')
  }
  finally {
    togglingIds.value.delete(svc.id)
  }
}

onMounted(async () => {
  await fetchStores()
  await fetchCouriers()
})

watch(selectedStoreId, () => fetchCouriers())
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Kurir</h1>
      <p class="mt-1 text-sm text-gray-500">Aktifkan layanan kurir yang tersedia untuk website store.</p>
    </div>

    <div v-if="!selectedStoreId" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <Store class="mx-auto h-12 w-12 text-gray-300" />
      <h3 class="mt-3 text-sm font-semibold text-gray-900">Belum ada store web dipilih</h3>
      <p class="mt-1 text-sm text-gray-500">Pilih store web pada menu di sebelah kiri.</p>
    </div>

    <div v-else-if="loading" class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="h-28 animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-gray-200" />
    </div>

    <div v-else-if="!couriers.length" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <Truck class="mx-auto h-12 w-12 text-gray-300" />
      <h3 class="mt-3 text-sm font-semibold text-gray-900">Tidak ada kurir</h3>
      <p class="mt-1 text-sm text-gray-500">Belum ada data kurir tersedia.</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div v-for="entry in couriers" :key="entry.id" class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md">
        <div class="p-5">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50 ring-1 ring-gray-200">
              <img
                :src="`/images/couriers/${logoSlug(entry.courier_code)}.png`"
                :alt="entry.courier_name"
                class="h-7 w-7 object-contain"
                @error="($event.target as HTMLImageElement).style.display = 'none'"
              />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="text-sm font-semibold text-gray-900">{{ entry.courier_name }}</h3>
              <p class="mt-0.5 text-xs text-gray-400">{{ entry.services.length }} layanan</p>
            </div>
            <span
              class="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1"
              :class="entry.is_active ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-gray-50 text-gray-500 ring-gray-200'"
            >
              {{ entry.is_active ? 'Aktif' : 'Nonaktif' }}
            </span>
          </div>

          <div v-if="entry.services.length" class="mt-3 flex justify-end">
            <button type="button" class="flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-700" @click="toggleExpand(entry.id)">
              {{ expandedKeys.has(entry.id) ? 'Sembunyikan' : 'Lihat layanan' }}
              <ChevronUp v-if="expandedKeys.has(entry.id)" class="h-3.5 w-3.5" />
              <ChevronDown v-else class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div v-if="expandedKeys.has(entry.id)" class="border-t border-gray-100 px-5 py-3">
          <p class="mb-2 text-xs font-medium text-gray-500">Layanan Tersedia</p>
          <div class="space-y-1.5">
            <div v-for="svc in entry.services" :key="svc.id" class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <div class="min-w-0 flex-1">
                <p class="text-xs text-gray-700">{{ svc.service_name || '—' }}</p>
                <p class="font-mono text-[10px] text-gray-400">{{ svc.service_code }}</p>
              </div>
              <button type="button" class="ml-2 flex shrink-0 items-center gap-1.5 transition-colors disabled:opacity-50" :disabled="togglingIds.has(svc.id)" @click="toggleServiceStatus(svc, entry)">
                <span class="rounded-full px-1.5 py-0.5 text-[10px] font-medium" :class="svc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
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
