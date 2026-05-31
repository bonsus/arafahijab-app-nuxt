<script setup lang="ts">
import { Search, X, Loader2, MapPin, ChevronRight } from 'lucide-vue-next'

export interface AreaCity {
  city: string
}

export interface AreaProvince {
  country: string
  province: string
  cities: AreaCity[]
}

export interface SelectedArea {
  province: string
  city: string
}

const props = defineProps<{
  addedAreas?: SelectedArea[]
}>()

const emit = defineEmits<{
  'select': [area: SelectedArea]
}>()

const api = useApi()

const containerRef = ref<HTMLDivElement | null>(null)
const open = ref(false)
const query = ref('')
const loading = ref(false)
const allAreas = ref<AreaProvince[]>([])
const expandedProvinces = ref<Set<string>>(new Set())

const filteredAreas = computed(() => {
  if (!query.value.trim()) return allAreas.value
  const q = query.value.toLowerCase()
  return allAreas.value
    .map(p => ({
      ...p,
      cities: p.cities.filter(c => c.city.toLowerCase().includes(q)),
      _provinceMatch: p.province.toLowerCase().includes(q),
    }))
    .filter(p => p._provinceMatch || p.cities.length > 0)
})

async function loadAreas() {
  loading.value = true
  try {
    const res = await api.get<{ data: AreaProvince[] }>('/addresses/province-city')
    allAreas.value = res.data || []
  }
  catch {
    allAreas.value = []
  }
  finally {
    loading.value = false
  }
}

function onSearch(val: string) {
  query.value = val
  // expand all provinces when searching so results are visible
  if (val.trim()) {
    filteredAreas.value.forEach(p => expandedProvinces.value.add(p.province))
  }
}

function openDropdown() {
  open.value = true
  if (!allAreas.value.length && !loading.value) loadAreas()
}

function closeDropdown() {
  open.value = false
  query.value = ''
  expandedProvinces.value = new Set()
}

function toggleProvince(e: Event, province: string) {
  e.stopPropagation()
  if (expandedProvinces.value.has(province)) {
    expandedProvinces.value.delete(province)
  }
  else {
    expandedProvinces.value.add(province)
  }
}

function isProvinceAdded(province: string): boolean {
  return props.addedAreas?.some(a => a.province === province && a.city === '') ?? false
}

function isCityAdded(province: string, city: string): boolean {
  return props.addedAreas?.some(a => a.province === province && a.city === city) ?? false
}

function selectProvince(province: string) {
  if (isProvinceAdded(province)) return
  emit('select', { province, city: '' })
  closeDropdown()
}

function selectCity(province: string, city: string) {
  if (isCityAdded(province, city)) return
  emit('select', { province, city })
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
        placeholder="Cari provinsi atau kota..."
        class="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-9 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
        @input="onSearch(query)"
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
        <span class="text-xs text-gray-400">Klik provinsi untuk pilih provinsi · klik ▶ untuk lihat kota</span>
        <button class="text-xs text-gray-400 hover:text-gray-600" @click="closeDropdown">Tutup</button>
      </div>

      <div v-if="loading" class="flex items-center justify-center gap-2 px-3 py-6 text-sm text-gray-400">
        <Loader2 class="h-4 w-4 animate-spin" /> Memuat...
      </div>

      <div v-else-if="!filteredAreas.length" class="px-3 py-6 text-center text-sm text-gray-400">
        Tidak ada area ditemukan
      </div>

      <div v-else class="max-h-72 overflow-y-auto">
        <template v-for="province in filteredAreas" :key="province.province">
          <!-- Province row -->
          <div
            class="flex items-center gap-3 border-b border-gray-100 px-3 py-2.5 transition-colors"
            :class="isProvinceAdded(province.province) ? 'opacity-40' : 'hover:bg-primary-50'"
          >
            <div
              class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-blue-50"
              @click="!isProvinceAdded(province.province) && selectProvince(province.province)"
            >
              <MapPin class="h-4 w-4 text-blue-500" />
            </div>
            <div
              class="min-w-0 flex-1 cursor-pointer"
              @click="!isProvinceAdded(province.province) && selectProvince(province.province)"
            >
              <p class="truncate text-sm font-medium text-gray-900">{{ province.province }}</p>
              <p class="text-xs text-gray-400">{{ province.cities.length }} kota</p>
            </div>
            <span v-if="isProvinceAdded(province.province)" class="text-[10px] text-gray-400">Ditambahkan</span>
            <button
              v-else
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              @click="toggleProvince($event, province.province)"
            >
              <ChevronRight
                class="h-4 w-4 transition-transform"
                :class="expandedProvinces.has(province.province) ? 'rotate-90' : ''"
              />
            </button>
          </div>

          <!-- Cities (expanded) -->
          <template v-if="expandedProvinces.has(province.province)">
            <div
              v-for="cityItem in province.cities"
              :key="cityItem.city"
              class="flex cursor-pointer items-center gap-3 border-b border-gray-100 bg-gray-50 py-2 pl-12 pr-3 transition-colors"
              :class="isCityAdded(province.province, cityItem.city) ? 'cursor-not-allowed opacity-40' : 'hover:bg-primary-50'"
              @click="selectCity(province.province, cityItem.city)"
            >
              <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-100">
                <MapPin class="h-3 w-3 text-gray-400" />
              </div>
              <p class="truncate text-sm text-gray-700">{{ cityItem.city }}</p>
              <span v-if="isCityAdded(province.province, cityItem.city)" class="ml-auto text-[10px] text-gray-400">Ditambahkan</span>
            </div>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>
