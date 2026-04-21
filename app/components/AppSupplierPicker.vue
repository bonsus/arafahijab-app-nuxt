<script setup lang="ts">
import { Search, X, Loader2 } from 'lucide-vue-next'

interface Supplier {
  id: string
  name: string
  phone: string
}

const props = defineProps<{
  modelValue: Supplier | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Supplier | null]
}>()

const api = useApi()

const containerRef = ref<HTMLDivElement | null>(null)
const open = ref(false)
const query = ref('')
const loading = ref(false)
const results = ref<Supplier[]>([])

let timer: ReturnType<typeof setTimeout>

function onSearch(val: string) {
  query.value = val
  clearTimeout(timer)
  timer = setTimeout(() => fetchSuppliers(val), 300)
}

async function fetchSuppliers(search: string) {
  loading.value = true
  try {
    const params: Record<string, string> = { type: 'supplier' }
    if (search) params.search = search
    const res = await api.get<{ data: any }>('/customers/public/index', params)
    results.value = (res.data?.data || res.data || []) as Supplier[]
  }
  catch {
    results.value = []
  }
  finally {
    loading.value = false
  }
}

function select(s: Supplier) {
  emit('update:modelValue', s)
  open.value = false
  query.value = ''
}

function clear() {
  emit('update:modelValue', null)
}

function openDropdown() {
  open.value = true
  fetchSuppliers(query.value)
}

function onClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    open.value = false
    query.value = ''
  }
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div ref="containerRef" class="relative">
    <!-- Selected -->
    <div v-if="modelValue" class="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm">
      <span class="flex-1 truncate text-gray-900">{{ modelValue.name }}</span>
      <button type="button" class="shrink-0 text-gray-400 hover:text-gray-600" @click="clear">
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- Search input -->
    <div v-else class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        v-model="query"
        type="text"
        placeholder="Cari supplier..."
        class="input-base pl-10 pr-4"
        @input="onSearch(query)"
        @focus="openDropdown"
      />
    </div>

    <!-- Dropdown -->
    <div v-if="open && !modelValue" class="absolute z-40 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
      <div v-if="loading" class="flex items-center justify-center gap-2 px-3 py-4 text-sm text-gray-400">
        <Loader2 class="h-4 w-4 animate-spin" /> Memuat...
      </div>
      <ul v-else class="max-h-48 overflow-y-auto py-1">
        <li
          v-for="s in results"
          :key="s.id"
          class="cursor-pointer px-3 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700"
          @click="select(s)"
        >
          <span class="font-medium">{{ s.name }}</span>
          <span v-if="s.phone" class="ml-2 text-xs text-gray-400">{{ s.phone }}</span>
        </li>
        <li v-if="!results.length" class="px-3 py-3 text-center text-sm text-gray-400">Tidak ditemukan</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.input-base {
  @apply w-full rounded-lg border border-gray-300 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
