<script setup lang="ts">
import { ChevronDown, X, Search, Loader2 } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue: string
  options: string[]
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  allowCustom?: boolean
}>(), {
  placeholder: 'Pilih...',
  disabled: false,
  loading: false,
  allowCustom: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [query: string]
}>()

const open = ref(false)
const query = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const highlightIndex = ref(-1)

const filtered = computed(() => {
  if (!query.value) return props.options
  const q = query.value.toLowerCase()
  const matched = props.options.filter(o => o.toLowerCase().includes(q))
  // When allowCustom and typed value doesn't exist in options, append it as a selectable item
  if (props.allowCustom && q && !matched.some(o => o.toLowerCase() === q)) {
    matched.push(query.value)
  }
  return matched
})

function openDropdown() {
  if (props.disabled) return
  open.value = true
  query.value = ''
  highlightIndex.value = -1
  nextTick(() => inputRef.value?.focus())
}

function closeDropdown() {
  if (props.allowCustom && query.value && !props.options.includes(query.value)) {
    emit('update:modelValue', query.value)
  }
  open.value = false
  query.value = ''
}

function select(value: string) {
  emit('update:modelValue', value)
  open.value = false
  query.value = ''
}

function clear() {
  emit('update:modelValue', '')
}

function onKeydown(e: KeyboardEvent) {
  const list = filtered.value
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlightIndex.value = Math.min(highlightIndex.value + 1, list.length - 1)
    scrollToHighlighted()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightIndex.value = Math.max(highlightIndex.value - 1, 0)
    scrollToHighlighted()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const selected = list[highlightIndex.value]
    if (highlightIndex.value >= 0 && selected) {
      select(selected)
    } else if (props.allowCustom && query.value) {
      select(query.value)
    }
  } else if (e.key === 'Escape') {
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

function onQueryInput(e: Event) {
  query.value = (e.target as HTMLInputElement).value
  highlightIndex.value = -1
  emit('search', query.value)
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
      class="search-select-trigger"
      :class="{ 'opacity-50 cursor-not-allowed': disabled, 'ring-2 ring-primary-500/20 border-primary-500': open }"
      @click="openDropdown"
    >
      <span v-if="modelValue" class="truncate text-gray-900">{{ modelValue }}</span>
      <span v-else class="truncate text-gray-400">{{ placeholder }}</span>
      <span class="ml-auto flex items-center gap-1 shrink-0">
        <button
          v-if="modelValue && !disabled"
          type="button"
          class="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
          @click.stop="clear"
        >
          <X class="h-3.5 w-3.5" />
        </button>
        <Loader2 v-if="loading" class="h-4 w-4 text-gray-400 animate-spin" />
        <ChevronDown v-else class="h-4 w-4 text-gray-400 transition-transform" :class="{ 'rotate-180': open }" />
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
          :placeholder="allowCustom ? 'Cari atau ketik...' : 'Cari...'"
          @input="onQueryInput"
          @keydown="onKeydown"
        />
      </div>
      <!-- Options list -->
      <ul class="max-h-48 overflow-y-auto py-1">
        <li
          v-for="(option, i) in filtered"
          :key="option"
          :data-highlighted="highlightIndex === i"
          class="cursor-pointer select-none px-3 py-2 text-sm transition-colors"
          :class="[
            highlightIndex === i ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50',
            option === modelValue ? 'font-medium' : ''
          ]"
          @click="select(option)"
          @mouseenter="highlightIndex = i"
        >
          {{ option }}
        </li>
        <li v-if="!filtered.length && !loading" class="px-3 py-4 text-center text-sm text-gray-400">
          {{ allowCustom && query ? 'Tekan Enter untuk menggunakan nilai ini' : 'Tidak ditemukan' }}
        </li>
        <li v-if="loading" class="flex items-center justify-center gap-2 px-3 py-4 text-sm text-gray-400">
          <Loader2 class="h-4 w-4 animate-spin" />
          Memuat...
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.search-select-trigger {
  @apply flex w-full items-center rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-left transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
