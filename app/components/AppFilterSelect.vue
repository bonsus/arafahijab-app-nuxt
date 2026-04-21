<script setup lang="ts">
import { Search, X, ChevronDown, Loader2, Check } from 'lucide-vue-next'

export interface FilterOption {
  value: string
  label: string
  description?: string
}

const props = withDefaults(defineProps<{
  modelValue: string | string[]
  options: FilterOption[]
  placeholder?: string
  searchPlaceholder?: string
  loading?: boolean
  multiple?: boolean
  searchable?: boolean
}>(), {
  placeholder: 'Pilih...',
  searchPlaceholder: 'Cari...',
  loading: false,
  multiple: false,
  searchable: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | string[]]
  'search': [query: string]
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const open = ref(false)
const query = ref('')

const selectedArray = computed(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue
  return props.modelValue ? [props.modelValue] : []
})

const displayLabel = computed(() => {
  const sel = selectedArray.value
  if (!sel.length) return ''
  if (sel.length === 1) {
    return props.options.find(o => o.value === sel[0])?.label || sel[0]
  }
  return `${sel.length} ${props.placeholder} dipilih`
})

const hasValue = computed(() => selectedArray.value.length > 0)

const filteredOptions = computed(() => {
  if (!query.value) return props.options
  const q = query.value.toLowerCase()
  return props.options.filter(o =>
    o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q),
  )
})

function isSelected(val: string) {
  return selectedArray.value.includes(val)
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    emit('search', query.value)
  }, 300)
}

function toggle() {
  open.value = !open.value
  if (open.value) {
    query.value = ''
    if (props.searchable) {
      emit('search', '')
      nextTick(() => searchInputRef.value?.focus())
    }
  }
}

function select(val: string) {
  if (props.multiple) {
    const current = [...selectedArray.value]
    const idx = current.indexOf(val)
    if (idx >= 0) current.splice(idx, 1)
    else current.push(val)
    emit('update:modelValue', current)
  }
  else {
    emit('update:modelValue', val)
    open.value = false
    query.value = ''
  }
}

function clear() {
  emit('update:modelValue', props.multiple ? [] : '')
  open.value = false
  query.value = ''
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
    <!-- Trigger -->
    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-gray-50"
      :class="hasValue ? 'text-gray-900' : 'text-gray-500'"
      @click="toggle"
    >
      <span class="max-w-[160px] truncate">{{ displayLabel || placeholder }}</span>
      <X
        v-if="hasValue"
        class="h-3.5 w-3.5 shrink-0 text-gray-400 hover:text-gray-600"
        @click.stop="clear"
      />
      <ChevronDown v-else class="h-3.5 w-3.5 shrink-0 text-gray-400" />
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="scale-95 opacity-0"
      enter-to-class="scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="scale-100 opacity-100"
      leave-to-class="scale-95 opacity-0"
    >
      <div v-if="open" class="absolute left-0 z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
        <!-- Search input -->
        <div v-if="searchable" class="border-b border-gray-100 p-2">
          <div class="relative">
            <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              ref="searchInputRef"
              v-model="query"
              type="text"
              :placeholder="searchPlaceholder"
              class="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              @input="onSearchInput"
            />
          </div>
        </div>

        <!-- Options -->
        <div class="max-h-48 overflow-y-auto py-1">
          <div v-if="loading" class="flex items-center justify-center gap-2 py-4 text-sm text-gray-400">
            <Loader2 class="h-4 w-4 animate-spin" /> Memuat...
          </div>
          <template v-else-if="filteredOptions.length">
            <button
              v-for="opt in filteredOptions"
              :key="opt.value"
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-primary-50"
              :class="isSelected(opt.value) ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'"
              @click="select(opt.value)"
            >
              <span v-if="multiple" class="flex h-4 w-4 shrink-0 items-center justify-center rounded border" :class="isSelected(opt.value) ? 'border-primary-600 bg-primary-600' : 'border-gray-300'">
                <Check v-if="isSelected(opt.value)" class="h-3 w-3 text-white" />
              </span>
              <span class="flex-1 truncate">{{ opt.label }}</span>
              <span v-if="opt.description" class="shrink-0 text-xs text-gray-400">{{ opt.description }}</span>
            </button>
          </template>
          <p v-else class="py-4 text-center text-sm text-gray-400">Tidak ditemukan</p>
        </div>
      </div>
    </Transition>
  </div>
</template>
