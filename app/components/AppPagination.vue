<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

interface Props {
  /** Current page number (1-indexed) */
  page: number
  /** Total number of pages */
  totalPage: number
  /** Total number of items */
  total: number
  /** Current items per page */
  perPage: number
  /** Loading state */
  loading?: boolean
  /** Show per page selector */
  showPerPage?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showPerPage: true,
})

const emit = defineEmits<{
  'update:page': [page: number]
  'update:perPage': [perPage: number]
}>()

const perPageOptions = [
  { value: 1, label: '1' },
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 200, label: '200' },
]

const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, props.page - 2)
  const end = Math.min(props.totalPage, props.page + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

function goPage(p: number) {
  if (p < 1 || p > props.totalPage || p === props.page) return
  emit('update:page', p)
}

function changePerPage(value: number) {
  emit('update:perPage', value)
  // Reset to page 1 when changing per page
  if (props.page !== 1) {
    emit('update:page', 1)
  }
}
</script>

<template>
  <div
    v-if="!loading && totalPage > 0"
    class="flex flex-col items-start justify-between gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center"
  >
    <!-- Left: Total + Per Page -->
    <div class="flex items-center gap-3">
      <div v-if="showPerPage" class="flex items-center gap-2">
        <span class="text-xs text-gray-500">Tampilkan:</span>
        <select
          :value="perPage"
          class="rounded-lg border border-gray-200 py-1 pl-2 pr-7 text-xs text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          @change="changePerPage(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="opt in perPageOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
      <p class="text-xs text-gray-500">
        {{ total.toLocaleString() }} data total
      </p>
    </div>

    <!-- Right: Page Navigation -->
    <div class="flex items-center gap-1">
      <button
        :disabled="page === 1"
        class="rounded-lg border border-gray-200 p-1.5 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        @click="goPage(page - 1)"
      >
        <ChevronLeft class="h-3.5 w-3.5" />
      </button>
      <button
        v-for="p in visiblePages"
        :key="p"
        class="rounded-lg border px-2.5 py-1 text-xs transition-colors"
        :class="p === page ? 'border-primary-500 bg-primary-50 text-primary-600 font-semibold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
        @click="goPage(p)"
      >
        {{ p }}
      </button>
      <button
        :disabled="page === totalPage"
        class="rounded-lg border border-gray-200 p-1.5 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        @click="goPage(page + 1)"
      >
        <ChevronRight class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>
