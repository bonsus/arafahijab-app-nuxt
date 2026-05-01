<script setup lang="ts">
import { Search, X, Loader2, Tag } from 'lucide-vue-next'

export interface CustomerCategory {
  id: string
  name: string
  description: string
}

const props = defineProps<{
  addedIds?: string[]
}>()

const emit = defineEmits<{
  'select': [category: CustomerCategory]
}>()

const api = useApi()

const containerRef = ref<HTMLDivElement | null>(null)
const open = ref(false)
const query = ref('')
const loading = ref(false)
const results = ref<CustomerCategory[]>([])

let timer: ReturnType<typeof setTimeout>

function onSearch(val: string) {
  query.value = val
  clearTimeout(timer)
  timer = setTimeout(() => fetchCategories(val), 300)
}

async function fetchCategories(search: string = '') {
  loading.value = true
  try {
    const res = await api.get<{ data: CustomerCategory[] }>('/customers/categories/index', { search })
    results.value = res.data || []
    open.value = true
  }
  catch {
    results.value = []
  }
  finally {
    loading.value = false
  }
}

function closeDropdown() {
  open.value = false
  query.value = ''
  results.value = []
}

function selectCategory(category: CustomerCategory) {
  if (props.addedIds?.includes(category.id)) return
  emit('select', category)
  closeDropdown()
}

function onClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    closeDropdown()
  }
}

function onFocus() {
  if (!results.value.length && !loading.value) {
    fetchCategories(query.value)
  } else if (results.value.length) {
    open.value = true
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
        placeholder="Cari atau pilih kategori customer..."
        class="input-base pl-10 pr-10"
        @input="onSearch(query)"
        @focus="onFocus"
      />
      <button
        v-if="query"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        @click="closeDropdown"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- Dropdown -->
    <div v-if="open && (results.length || loading)" class="absolute z-40 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
      <div class="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <span class="text-xs text-gray-400">Pilih kategori customer</span>
        <button class="text-xs text-gray-400 hover:text-gray-600" @click="closeDropdown">Tutup</button>
      </div>

      <div v-if="loading" class="flex items-center justify-center gap-2 px-3 py-6 text-sm text-gray-400">
        <Loader2 class="h-4 w-4 animate-spin" /> Memuat...
      </div>

      <div v-else-if="!results.length" class="px-3 py-6 text-center text-sm text-gray-400">
        Tidak ada kategori ditemukan
      </div>

      <div v-else class="max-h-80 overflow-y-auto">
        <div
          v-for="category in results"
          :key="category.id"
          class="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-primary-50"
          :class="addedIds?.includes(category.id) ? 'opacity-40 cursor-not-allowed' : ''"
          @click="selectCategory(category)"
        >
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
            <Tag class="h-4 w-4 text-blue-600" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-gray-900">{{ category.name }}</p>
            <p v-if="category.description" class="truncate text-xs text-gray-500">{{ category.description }}</p>
          </div>
          <span v-if="addedIds?.includes(category.id)" class="text-[10px] text-gray-400">Ditambahkan</span>
        </div>
      </div>
    </div>
  </div>
</template>
