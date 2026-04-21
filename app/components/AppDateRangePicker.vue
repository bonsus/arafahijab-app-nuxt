<script setup lang="ts">
import { ChevronLeft, ChevronRight, Calendar, X as XIcon } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: { from: string; to: string }
}>()

const emit = defineEmits<{
  'update:modelValue': [val: { from: string; to: string }]
}>()

const open = ref(false)
const pickerRef = ref<HTMLElement>()
const triggerRef = ref<HTMLElement>()
const desktopDropdownRef = ref<HTMLElement>()
const dropdownPos = ref({ top: '0px', left: '0px' })

// Internal selection state
const selecting = ref<{ from: string; to: string }>({ from: '', to: '' })
const hoverDate = ref('')
const pickStep = ref<'from' | 'to'>('from')

// Calendar navigation: show 2 months
const today = new Date()
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth()) // 0-indexed

const leftMonth = computed(() => ({ year: viewYear.value, month: viewMonth.value }))
const rightMonth = computed(() => {
  const m = viewMonth.value + 1
  return m > 11
    ? { year: viewYear.value + 1, month: 0 }
    : { year: viewYear.value, month: m }
})

// Month/Year picker mode: null = day view, 'left' | 'right' = which calendar is picking
const monthPickerSide = ref<'left' | 'right' | null>(null)
const yearPickerSide = ref<'left' | 'right' | null>(null)
// Separate year view offset for year grid
const yearGridStart = ref(Math.floor(today.getFullYear() / 12) * 12)

function openMonthPicker(side: 'left' | 'right') {
  yearPickerSide.value = null
  monthPickerSide.value = monthPickerSide.value === side ? null : side
}

function openYearPicker(side: 'left' | 'right') {
  monthPickerSide.value = null
  yearGridStart.value = Math.floor(viewYear.value / 12) * 12
  yearPickerSide.value = yearPickerSide.value === side ? null : side
}

function selectMonth(m: number) {
  viewMonth.value = m
  monthPickerSide.value = null
}

function selectYear(y: number) {
  viewYear.value = y
  yearPickerSide.value = null
}

function prevMonth() {
  if (viewMonth.value === 0) { viewYear.value--; viewMonth.value = 11 }
  else viewMonth.value--
}
function nextMonth() {
  if (viewMonth.value === 11) { viewYear.value++; viewMonth.value = 0 }
  else viewMonth.value++
}

function pad(n: number) { return n < 10 ? '0' + n : String(n) }
function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  // Monday = 0
  let startDow = first.getDay() - 1
  if (startDow < 0) startDow = 6

  const days: { date: string; day: number; current: boolean }[] = []

  // Previous month fill
  const prevLastDay = new Date(year, month, 0).getDate()
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevLastDay - i
    const pm = month === 0 ? 11 : month - 1
    const py = month === 0 ? year - 1 : year
    days.push({ date: toDateStr(py, pm, d), day: d, current: false })
  }

  // Current month
  for (let d = 1; d <= lastDay; d++) {
    days.push({ date: toDateStr(year, month, d), day: d, current: true })
  }

  // Next month fill to 42
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    const nm = month === 11 ? 0 : month + 1
    const ny = month === 11 ? year + 1 : year
    days.push({ date: toDateStr(ny, nm, d), day: d, current: false })
  }

  return days
}

const leftDays = computed(() => getCalendarDays(leftMonth.value.year, leftMonth.value.month))
const rightDays = computed(() => getCalendarDays(rightMonth.value.year, rightMonth.value.month))

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const dayHeaders = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function todayStr() {
  const t = new Date()
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate())
}

function isInRange(date: string) {
  const from = selecting.value.from
  const to = selecting.value.to || hoverDate.value
  if (!from || !to) return false
  const min = from < to ? from : to
  const max = from < to ? to : from
  return date >= min && date <= max
}

function isRangeStart(date: string) {
  const from = selecting.value.from
  const to = selecting.value.to || hoverDate.value
  if (!from) return false
  if (!to) return date === from
  return date === (from < to ? from : to)
}

function isRangeEnd(date: string) {
  const from = selecting.value.from
  const to = selecting.value.to || hoverDate.value
  if (!from || !to) return false
  return date === (from < to ? to : from)
}

function onDayClick(date: string) {
  if (pickStep.value === 'from') {
    selecting.value = { from: date, to: '' }
    pickStep.value = 'to'
  } else {
    const from = selecting.value.from
    if (date < from) {
      selecting.value = { from: date, to: from }
    } else {
      selecting.value.to = date
    }
    applySelection()
  }
}

function onDayHover(date: string) {
  if (pickStep.value === 'to') hoverDate.value = date
}

function applySelection() {
  emit('update:modelValue', { from: selecting.value.from, to: selecting.value.to })
  pickStep.value = 'from'
  hoverDate.value = ''
  open.value = false
}

// Presets
function daysAgo(n: number) {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - n)
  return {
    from: toDateStr(from.getFullYear(), from.getMonth(), from.getDate()),
    to: toDateStr(to.getFullYear(), to.getMonth(), to.getDate()),
  }
}

const presets = [
  { label: 'Hari ini', fn: () => { const t = todayStr(); return { from: t, to: t } } },
  { label: 'Kemarin', fn: () => { const d = daysAgo(1); return { from: d.from, to: d.from } } },
//   { label: '3 Hari terakhir', fn: () => daysAgo(2) },
  { label: '7 Hari terakhir', fn: () => daysAgo(6) },
  { label: '14 Hari terakhir', fn: () => daysAgo(13) },
//   { label: '30 Hari terakhir', fn: () => daysAgo(29) },
  {
    label: 'Bulan ini', fn: () => {
      const t = new Date()
      return {
        from: toDateStr(t.getFullYear(), t.getMonth(), 1),
        to: toDateStr(t.getFullYear(), t.getMonth(), t.getDate()),
      }
    },
  },
  {
    label: 'Bulan lalu', fn: () => {
      const t = new Date()
      const pm = t.getMonth() === 0 ? 11 : t.getMonth() - 1
      const py = t.getMonth() === 0 ? t.getFullYear() - 1 : t.getFullYear()
      const lastDay = new Date(py, pm + 1, 0).getDate()
      return { from: toDateStr(py, pm, 1), to: toDateStr(py, pm, lastDay) }
    },
  },
  {
    label: 'Tahun ini', fn: () => {
      const t = new Date()
      return {
        from: toDateStr(t.getFullYear(), 0, 1),
        to: toDateStr(t.getFullYear(), t.getMonth(), t.getDate()),
      }
    },
  },
  {
    label: 'Tahun lalu', fn: () => {
      const y = new Date().getFullYear() - 1
      return { from: toDateStr(y, 0, 1), to: toDateStr(y, 11, 31) }
    },
  },
]

function applyPreset(preset: (typeof presets)[number]) {
  const val = preset.fn()
  selecting.value = { from: val.from, to: val.to }
  emit('update:modelValue', val)
  pickStep.value = 'from'
  hoverDate.value = ''
  open.value = false
}

function clearFilter() {
  selecting.value = { from: '', to: '' }
  emit('update:modelValue', { from: '', to: '' })
  pickStep.value = 'from'
  hoverDate.value = ''
  open.value = false
}

// Display label
const displayLabel = computed(() => {
  const { from, to } = props.modelValue
  if (!from && !to) return ''
  const fmt = (s: string) => {
    const d = new Date(s + 'T00:00:00')
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  if (from && to && from === to) return fmt(from)
  if (from && to) return `${fmt(from)} – ${fmt(to)}`
  if (from) return `Dari ${fmt(from)}`
  return ''
})

// Open handler
function openPicker() {
  selecting.value = { from: props.modelValue.from, to: props.modelValue.to }
  pickStep.value = 'from'
  hoverDate.value = ''
  monthPickerSide.value = null
  yearPickerSide.value = null
  // Navigate calendar to show the 'from' date or today
  const ref = props.modelValue.from || todayStr()
  const d = new Date(ref + 'T00:00:00')
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
  open.value = true
  // Position desktop dropdown
  nextTick(() => {
    if (triggerRef.value) {
      const rect = triggerRef.value.getBoundingClientRect()
      dropdownPos.value = {
        top: `${rect.bottom + 8}px`,
        left: `${Math.max(8, rect.right - 680)}px`,
      }
    }
  })
}

// Click outside
function onClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (
    pickerRef.value && !pickerRef.value.contains(target)
    && (!desktopDropdownRef.value || !desktopDropdownRef.value.contains(target))
  ) {
    open.value = false
  }
}
onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div ref="pickerRef" class="relative">
    <!-- Trigger -->
    <button
      ref="triggerRef"
      type="button"
      class="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs whitespace-nowrap transition-colors hover:bg-gray-50"
      :class="displayLabel ? 'text-gray-900' : 'text-gray-400'"
      @click="openPicker"
    >
      <Calendar class="h-4 w-4 text-gray-400" />
      <span>{{ displayLabel || 'Pilih tanggal' }}</span>
    </button>

    <!-- Mobile: fullscreen modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:hidden" @mousedown.self="open = false">
          <div class="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white pb-safe" @mousedown.stop>
            <!-- Header -->
            <div class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
              <span class="text-sm font-semibold text-gray-900">Pilih Tanggal</span>
              <button type="button" class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="open = false">
                <XIcon class="h-5 w-5" />
              </button>
            </div>

            <!-- Presets -->
            <div class="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-3">
              <button
                v-for="preset in presets"
                :key="preset.label"
                type="button"
                class="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-50"
                @click="applyPreset(preset)"
              >
                {{ preset.label }}
              </button>
              <button
                type="button"
                class="rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-50"
                @click="clearFilter"
              >
                Hapus filter
              </button>
            </div>

            <!-- Calendar (single month on mobile) -->
            <div class="px-4 py-3">
              <div class="mb-2 flex items-center justify-between">
                <button type="button" class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="prevMonth">
                  <ChevronLeft class="h-5 w-5" />
                </button>
                <div class="flex items-center gap-1">
                  <button type="button" class="rounded px-2 py-1 text-sm font-semibold text-gray-900 hover:bg-gray-100" @click="openMonthPicker('left')">{{ monthNames[leftMonth.month] }}</button>
                  <button type="button" class="rounded px-2 py-1 text-sm font-semibold text-gray-900 hover:bg-gray-100" @click="openYearPicker('left')">{{ leftMonth.year }}</button>
                </div>
                <button type="button" class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="nextMonth">
                  <ChevronRight class="h-5 w-5" />
                </button>
              </div>

              <!-- Month picker -->
              <div v-if="monthPickerSide === 'left'" class="grid grid-cols-3 gap-2 pb-2">
                <button
                  v-for="(mn, mi) in monthNames"
                  :key="mi"
                  type="button"
                  class="rounded-lg py-3 text-sm font-medium transition-colors"
                  :class="mi === viewMonth ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
                  @click="selectMonth(mi)"
                >{{ mn }}</button>
              </div>

              <!-- Year picker -->
              <div v-else-if="yearPickerSide === 'left'" class="pb-2">
                <div class="mb-2 flex items-center justify-between">
                  <button type="button" class="rounded p-1 text-gray-400 hover:bg-gray-100" @click="yearGridStart -= 12"><ChevronLeft class="h-4 w-4" /></button>
                  <span class="text-xs font-medium text-gray-500">{{ yearGridStart }} – {{ yearGridStart + 11 }}</span>
                  <button type="button" class="rounded p-1 text-gray-400 hover:bg-gray-100" @click="yearGridStart += 12"><ChevronRight class="h-4 w-4" /></button>
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="yi in 12"
                    :key="yi"
                    type="button"
                    class="rounded-lg py-3 text-sm font-medium transition-colors"
                    :class="yearGridStart + yi - 1 === viewYear ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
                    @click="selectYear(yearGridStart + yi - 1)"
                  >{{ yearGridStart + yi - 1 }}</button>
                </div>
              </div>

              <!-- Day grid -->
              <div v-else class="grid grid-cols-7 text-center">
                <span v-for="dh in dayHeaders" :key="dh" class="py-2 text-xs font-medium text-gray-400">{{ dh }}</span>
                <button
                  v-for="d in leftDays"
                  :key="d.date"
                  type="button"
                  class="relative h-10 text-sm transition-colors"
                  :class="[
                    !d.current && 'text-gray-300',
                    d.current && !isInRange(d.date) && 'text-gray-700 hover:bg-gray-100',
                    isInRange(d.date) && !isRangeStart(d.date) && !isRangeEnd(d.date) && 'bg-blue-50 text-blue-700',
                    isRangeStart(d.date) && 'bg-blue-600 text-white rounded-l-md',
                    isRangeEnd(d.date) && 'bg-blue-600 text-white rounded-r-md',
                    d.date === todayStr() && !isRangeStart(d.date) && !isRangeEnd(d.date) && 'font-bold',
                  ]"
                  @click="d.current && onDayClick(d.date)"
                  @mouseenter="d.current && onDayHover(d.date)"
                >
                  {{ d.day }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Desktop: teleported dropdown -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="scale-95 opacity-0"
        enter-to-class="scale-100 opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="scale-100 opacity-100"
        leave-to-class="scale-95 opacity-0"
      >
        <div
          v-if="open"
          ref="desktopDropdownRef"
          class="fixed z-50 hidden origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-gray-200 lg:flex"
          :style="{ top: dropdownPos.top, left: dropdownPos.left }"
      >
        <!-- Presets -->
        <div class="w-36 shrink-0 border-r border-gray-100 py-2">
          <button
            v-for="preset in presets"
            :key="preset.label"
            type="button"
            class="block w-full px-4 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            @click="applyPreset(preset)"
          >
            {{ preset.label }}
          </button>
          <div class="my-1 border-t border-gray-100" />
          <button
            type="button"
            class="block w-full px-4 py-1.5 text-left text-xs text-red-500 hover:bg-red-50"
            @click="clearFilter"
          >
            Hapus filter
          </button>
        </div>

        <!-- Calendars -->
        <div class="p-3">
          <div class="flex gap-4">
            <!-- Left Calendar -->
            <div class="w-[252px]">
              <div class="mb-2 flex items-center justify-between">
                <button type="button" class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="prevMonth">
                  <ChevronLeft class="h-4 w-4" />
                </button>
                <div class="flex items-center gap-1">
                  <button type="button" class="rounded px-1.5 py-0.5 text-sm font-semibold text-gray-900 hover:bg-gray-100" @click="openMonthPicker('left')">{{ monthNames[leftMonth.month] }}</button>
                  <button type="button" class="rounded px-1.5 py-0.5 text-sm font-semibold text-gray-900 hover:bg-gray-100" @click="openYearPicker('left')">{{ leftMonth.year }}</button>
                </div>
                <span class="w-6" />
              </div>

              <!-- Month picker overlay -->
              <div v-if="monthPickerSide === 'left'" class="grid grid-cols-3 gap-1 pb-2">
                <button
                  v-for="(mn, mi) in monthNames"
                  :key="mi"
                  type="button"
                  class="rounded-md py-2 text-xs font-medium transition-colors"
                  :class="mi === viewMonth ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
                  @click="selectMonth(mi)"
                >{{ mn }}</button>
              </div>

              <!-- Year picker overlay -->
              <div v-else-if="yearPickerSide === 'left'" class="pb-2">
                <div class="mb-2 flex items-center justify-between">
                  <button type="button" class="rounded p-1 text-gray-400 hover:bg-gray-100" @click="yearGridStart -= 12"><ChevronLeft class="h-3.5 w-3.5" /></button>
                  <span class="text-xs font-medium text-gray-500">{{ yearGridStart }} – {{ yearGridStart + 11 }}</span>
                  <button type="button" class="rounded p-1 text-gray-400 hover:bg-gray-100" @click="yearGridStart += 12"><ChevronRight class="h-3.5 w-3.5" /></button>
                </div>
                <div class="grid grid-cols-3 gap-1">
                  <button
                    v-for="yi in 12"
                    :key="yi"
                    type="button"
                    class="rounded-md py-2 text-xs font-medium transition-colors"
                    :class="yearGridStart + yi - 1 === viewYear ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
                    @click="selectYear(yearGridStart + yi - 1)"
                  >{{ yearGridStart + yi - 1 }}</button>
                </div>
              </div>

              <!-- Day grid -->
              <div v-else class="grid grid-cols-7 text-center">
                <span v-for="dh in dayHeaders" :key="dh" class="py-1.5 text-[11px] font-medium text-gray-400">{{ dh }}</span>
                <button
                  v-for="d in leftDays"
                  :key="d.date"
                  type="button"
                  class="relative h-8 w-9 text-xs transition-colors"
                  :class="[
                    !d.current && 'text-gray-300',
                    d.current && !isInRange(d.date) && 'text-gray-700 hover:bg-gray-100',
                    isInRange(d.date) && !isRangeStart(d.date) && !isRangeEnd(d.date) && 'bg-blue-50 text-blue-700',
                    isRangeStart(d.date) && 'bg-blue-600 text-white rounded-l-md',
                    isRangeEnd(d.date) && 'bg-blue-600 text-white rounded-r-md',
                    d.date === todayStr() && !isRangeStart(d.date) && !isRangeEnd(d.date) && 'font-bold',
                  ]"
                  @click="d.current && onDayClick(d.date)"
                  @mouseenter="d.current && onDayHover(d.date)"
                >
                  {{ d.day }}
                </button>
              </div>
            </div>

            <!-- Right Calendar -->
            <div class="w-[252px]">
              <div class="mb-2 flex items-center justify-between">
                <span class="w-6" />
                <div class="flex items-center gap-1">
                  <button type="button" class="rounded px-1.5 py-0.5 text-sm font-semibold text-gray-900 hover:bg-gray-100" @click="openMonthPicker('right')">{{ monthNames[rightMonth.month] }}</button>
                  <button type="button" class="rounded px-1.5 py-0.5 text-sm font-semibold text-gray-900 hover:bg-gray-100" @click="openYearPicker('right')">{{ rightMonth.year }}</button>
                </div>
                <button type="button" class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="nextMonth">
                  <ChevronRight class="h-4 w-4" />
                </button>
              </div>

              <!-- Month picker overlay -->
              <div v-if="monthPickerSide === 'right'" class="grid grid-cols-3 gap-1 pb-2">
                <button
                  v-for="(mn, mi) in monthNames"
                  :key="mi"
                  type="button"
                  class="rounded-md py-2 text-xs font-medium transition-colors"
                  :class="mi === rightMonth.month ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
                  @click="selectMonth(mi > 0 ? mi - 1 : 11); if (mi === 0) viewYear--"
                >{{ mn }}</button>
              </div>

              <!-- Year picker overlay -->
              <div v-else-if="yearPickerSide === 'right'" class="pb-2">
                <div class="mb-2 flex items-center justify-between">
                  <button type="button" class="rounded p-1 text-gray-400 hover:bg-gray-100" @click="yearGridStart -= 12"><ChevronLeft class="h-3.5 w-3.5" /></button>
                  <span class="text-xs font-medium text-gray-500">{{ yearGridStart }} – {{ yearGridStart + 11 }}</span>
                  <button type="button" class="rounded p-1 text-gray-400 hover:bg-gray-100" @click="yearGridStart += 12"><ChevronRight class="h-3.5 w-3.5" /></button>
                </div>
                <div class="grid grid-cols-3 gap-1">
                  <button
                    v-for="yi in 12"
                    :key="yi"
                    type="button"
                    class="rounded-md py-2 text-xs font-medium transition-colors"
                    :class="yearGridStart + yi - 1 === rightMonth.year ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
                    @click="selectYear(yearGridStart + yi - 1 - 1)"
                  >{{ yearGridStart + yi - 1 }}</button>
                </div>
              </div>

              <!-- Day grid -->
              <div v-else class="grid grid-cols-7 text-center">
                <span v-for="dh in dayHeaders" :key="dh" class="py-1.5 text-[11px] font-medium text-gray-400">{{ dh }}</span>
                <button
                  v-for="d in rightDays"
                  :key="d.date"
                  type="button"
                  class="relative h-8 w-9 text-xs transition-colors"
                  :class="[
                    !d.current && 'text-gray-300',
                    d.current && !isInRange(d.date) && 'text-gray-700 hover:bg-gray-100',
                    isInRange(d.date) && !isRangeStart(d.date) && !isRangeEnd(d.date) && 'bg-blue-50 text-blue-700',
                    isRangeStart(d.date) && 'bg-blue-600 text-white rounded-l-md',
                    isRangeEnd(d.date) && 'bg-blue-600 text-white rounded-r-md',
                    d.date === todayStr() && !isRangeStart(d.date) && !isRangeEnd(d.date) && 'font-bold',
                  ]"
                  @click="d.current && onDayClick(d.date)"
                  @mouseenter="d.current && onDayHover(d.date)"
                >
                  {{ d.day }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
    </Teleport>
  </div>
</template>
