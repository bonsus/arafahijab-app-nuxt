<script setup lang="ts">
import { ChevronDown, X, Search, Loader2, MapPin } from 'lucide-vue-next'

export interface DistrictResult {
  province: string
  city: string
  district: string
}

const props = withDefaults(defineProps<{
  province?: string
  city?: string
  district?: string
  placeholder?: string
  disabled?: boolean
}>(), {
  province: '',
  city: '',
  district: '',
  placeholder: 'Cari kecamatan...',
  disabled: false,
})

const emit = defineEmits<{
  select: [value: DistrictResult]
  clear: []
}>()

const api = useApi()

const open = ref(false)
const query = ref('')
const results = ref<DistrictResult[]>([])
const loading = ref(false)
const highlightIndex = ref(-1)
const inputRef = ref<HTMLInputElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
let debounceTimer: ReturnType<typeof setTimeout>

const hasValue = computed(() => !!props.district)
const displayLabel = computed(() => {
  if (!props.district) return ''
  return [props.district, props.city, props.province].filter(Boolean).join(', ')
})

function openDropdown() {
  if (props.disabled) return
  open.value = true
  query.value = ''
  results.value = []
  highlightIndex.value = -1
  nextTick(() => inputRef.value?.focus())
}

function closeDropdown() {
  open.value = false
  query.value = ''
}

function onQueryInput(e: Event) {
  query.value = (e.target as HTMLInputElement).value
  highlightIndex.value = -1
  clearTimeout(debounceTimer)
  if (query.value.trim().length < 2) {
    results.value = []
    loading.value = false
    return
  }
  debounceTimer = setTimeout(search, 300)
}

async function search() {
  loading.value = true
  try {
    const res = await api.get<{ data: DistrictResult[] }>('/addresses/search', {
      search: query.value.trim(),
    })
    results.value = res.data || []
  }
  catch {
    results.value = []
  }
  finally {
    loading.value = false
  }
}

function select(result: DistrictResult) {
  emit('select', result)
  open.value = false
  query.value = ''
  results.value = []
}

function clear() {
  emit('clear')
}

function onKeydown(e: KeyboardEvent) {
  const list = results.value
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlightIndex.value = Math.min(highlightIndex.value + 1, list.length - 1)
    scrollToHighlighted()
  }
  else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightIndex.value = Math.max(highlightIndex.value - 1, 0)
    scrollToHighlighted()
  }
  else if (e.key === 'Enter') {
    e.preventDefault()
    const selected = list[highlightIndex.value]
    if (highlightIndex.value >= 0 && selected) select(selected)
  }
  else if (e.key === 'Escape') {
    closeDropdown()
  }
}

function scrollToHighlighted() {
  nextTick(() => {
    containerRef.value
      ?.querySelector('[data-highlighted="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  })
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
    <!-- Trigger -->
    <button
      type="button"
      :disabled="disabled"
      class="district-select-trigger"
      :class="{ 'opacity-50 cursor-not-allowed': disabled, 'ring-2 ring-primary-500/20 border-primary-500': open }"
      @click="openDropdown"
    >
      <span v-if="hasValue" class="truncate text-gray-900">{{ displayLabel }}</span>
      <span v-else class="truncate text-gray-400">{{ placeholder }}</span>
      <span class="ml-auto flex items-center gap-1 shrink-0">
        <button
          v-if="hasValue && !disabled"
          type="button"
          class="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
          @click.stop="clear"
        >
          <X class="h-3.5 w-3.5" />
        </button>
        <ChevronDown class="h-4 w-4 text-gray-400 transition-transform" :class="{ 'rotate-180': open }" />
      </span>
    </button>

    <!-- Dropdown -->
    <div
      v-if="open"
      class="absolute z-[80] mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg"
    >
      <!-- Search input -->
      <div class="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
        <Search class="h-4 w-4 text-gray-400 shrink-0" />
        <input
          ref="inputRef"
          :value="query"
          type="text"
          class="w-full border-0 bg-transparent p-0 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
          placeholder="Ketik nama kecamatan..."
          @input="onQueryInput"
          @keydown="onKeydown"
        />
      </div>
      <!-- Results list -->
      <ul class="max-h-56 overflow-y-auto py-1">
        <li
          v-for="(result, i) in results"
          :key="`${result.province}-${result.city}-${result.district}`"
          :data-highlighted="highlightIndex === i"
          class="flex cursor-pointer select-none items-start gap-2 px-3 py-2 text-sm transition-colors"
          :class="highlightIndex === i ? 'bg-primary-50' : 'hover:bg-gray-50'"
          @click="select(result)"
          @mouseenter="highlightIndex = i"
        >
          <MapPin class="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
          <div class="min-w-0">
            <p class="font-medium text-gray-900">{{ result.district }}</p>
            <p class="truncate text-xs text-gray-500">{{ result.city }}, {{ result.province }}</p>
          </div>
        </li>
        <li v-if="loading" class="flex items-center justify-center gap-2 px-3 py-4 text-sm text-gray-400">
          <Loader2 class="h-4 w-4 animate-spin" />
          Mencari...
        </li>
        <li v-else-if="query.trim().length >= 2 && !results.length" class="px-3 py-4 text-center text-sm text-gray-400">
          Kecamatan tidak ditemukan
        </li>
        <li v-else-if="query.trim().length < 2" class="px-3 py-4 text-center text-sm text-gray-400">
          Ketik minimal 2 karakter
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.district-select-trigger {
  @apply flex w-full items-center rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-left transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
