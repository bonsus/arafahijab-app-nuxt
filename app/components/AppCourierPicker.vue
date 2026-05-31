<script setup lang="ts">
import { Search, X, Loader2, Truck } from 'lucide-vue-next'

export interface CourierService {
  id: string
  type: string
  service_code: string
  service_name: string
  is_active: boolean
}

export interface Courier {
  id: string
  type: string
  courier_code: string
  courier_name: string
  is_active: boolean
  services: CourierService[]
}

export interface SelectedCourierService {
  courier_code: string
  courier_service_code: string
  status: 'active' | 'inactive'
}

const props = defineProps<{
  addedCourierCodes?: string[]
}>()

const emit = defineEmits<{
  'select': [courier: Courier]
}>()

const api = useApi()

const containerRef = ref<HTMLDivElement | null>(null)
const open = ref(false)
const query = ref('')
const loading = ref(false)
const allCouriers = ref<Courier[]>([])

const filteredCouriers = computed(() => {
  if (!query.value.trim()) return allCouriers.value
  const q = query.value.toLowerCase()
  return allCouriers.value.filter(
    c => c.courier_name.toLowerCase().includes(q) || c.courier_code.toLowerCase().includes(q),
  )
})

async function loadCouriers() {
  loading.value = true
  try {
    const res = await api.get<{ data: Courier[] }>('/couriers/index')
    allCouriers.value = res.data || []
  }
  catch {
    allCouriers.value = []
  }
  finally {
    loading.value = false
  }
}

function openDropdown() {
  open.value = true
  if (!allCouriers.value.length && !loading.value) loadCouriers()
}

function closeDropdown() {
  open.value = false
  query.value = ''
}

function selectCourier(courier: Courier) {
  if (props.addedCourierCodes?.includes(courier.courier_code)) return
  emit('select', courier)
  closeDropdown()
}

function onClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div ref="containerRef" class="relative">
    <!-- Search input -->
    <div class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        v-model="query"
        type="text"
        placeholder="Cari atau pilih kurir..."
        class="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-9 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
        @focus="openDropdown"
      >
      <button
        v-if="query"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        @click="query = ''"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- Dropdown -->
    <div v-if="open" class="absolute z-40 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
      <div class="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <span class="text-xs text-gray-400">Pilih kurir</span>
        <button class="text-xs text-gray-400 hover:text-gray-600" @click="closeDropdown">Tutup</button>
      </div>

      <div v-if="loading" class="flex items-center justify-center gap-2 px-3 py-6 text-sm text-gray-400">
        <Loader2 class="h-4 w-4 animate-spin" /> Memuat...
      </div>

      <div v-else-if="!filteredCouriers.length" class="px-3 py-6 text-center text-sm text-gray-400">
        Tidak ada kurir ditemukan
      </div>

      <div v-else class="max-h-72 overflow-y-auto">
        <div
          v-for="courier in filteredCouriers"
          :key="courier.id"
          class="flex items-center gap-3 border-b border-gray-100 px-3 py-2.5 transition-colors last:border-b-0"
          :class="addedCourierCodes?.includes(courier.courier_code) ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-primary-50'"
          @click="selectCourier(courier)"
        >
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50">
            <Truck class="h-4 w-4 text-orange-500" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-gray-900">{{ courier.courier_name }}</p>
            <p class="truncate text-xs text-gray-500">{{ courier.services.length }} layanan · {{ courier.type }}</p>
          </div>
          <span v-if="addedCourierCodes?.includes(courier.courier_code)" class="text-[10px] text-gray-400">Ditambahkan</span>
        </div>
      </div>
    </div>
  </div>
</template>
