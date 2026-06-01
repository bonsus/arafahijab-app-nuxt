<script setup lang="ts">
import { formatCurrency } from '~/composables/useFormatters'

interface Series {
  name: string
  color: string
  data: number[]
  /** Optional secondary y-axis (right). Default 'left'. */
  axis?: 'left' | 'right'
  /** Render as dashed line */
  dashed?: boolean
}

const props = withDefaults(defineProps<{
  labels: string[]
  series: Series[]
  height?: number
  /** Number formatter for left axis tooltip */
  leftFormat?: (v: number) => string
  /** Number formatter for right axis tooltip */
  rightFormat?: (v: number) => string
  loading?: boolean
}>(), {
  height: 240,
  leftFormat: (v: number) => formatCurrency(v),
  rightFormat: (v: number) => formatCurrency(v),
  loading: false,
})

const padding = { top: 16, right: 44, bottom: 28, left: 44 }
const viewW = 800
const viewH = computed(() => props.height)

const hoverIndex = ref<number | null>(null)

const leftSeries = computed(() => props.series.filter(s => (s.axis ?? 'left') === 'left'))
const rightSeries = computed(() => props.series.filter(s => s.axis === 'right'))

function maxOf(seriesList: Series[]) {
  let m = 0
  for (const s of seriesList) for (const v of s.data) if (v > m) m = v
  return m === 0 ? 1 : m
}

const maxLeft = computed(() => maxOf(leftSeries.value))
const maxRight = computed(() => maxOf(rightSeries.value))

const chartW = computed(() => viewW - padding.left - padding.right)
const chartH = computed(() => viewH.value - padding.top - padding.bottom)

function xAt(i: number, total: number) {
  if (total <= 1) return padding.left + chartW.value / 2
  return padding.left + (i * chartW.value) / (total - 1)
}
function yAt(v: number, max: number) {
  return padding.top + chartH.value - (v / max) * chartH.value
}

function pathFor(s: Series) {
  const max = (s.axis === 'right') ? maxRight.value : maxLeft.value
  const total = s.data.length
  return s.data
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i, total).toFixed(2)} ${yAt(v, max).toFixed(2)}`)
    .join(' ')
}

function areaFor(s: Series) {
  const max = (s.axis === 'right') ? maxRight.value : maxLeft.value
  const total = s.data.length
  if (!total) return ''
  const first = `M ${xAt(0, total).toFixed(2)} ${(padding.top + chartH.value).toFixed(2)}`
  const line = s.data
    .map((v, i) => `L ${xAt(i, total).toFixed(2)} ${yAt(v, max).toFixed(2)}`)
    .join(' ')
  const close = `L ${xAt(total - 1, total).toFixed(2)} ${(padding.top + chartH.value).toFixed(2)} Z`
  return `${first} ${line} ${close}`
}

// Generate ~4 gridlines
const gridLines = computed(() => {
  const lines = []
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH.value * i) / 4
    const valLeft = maxLeft.value * (1 - i / 4)
    const valRight = maxRight.value * (1 - i / 4)
    lines.push({ y, valLeft, valRight })
  }
  return lines
})

const xLabels = computed(() => {
  const total = props.labels.length
  if (!total) return []
  // show ~6 labels evenly
  const step = Math.max(1, Math.ceil(total / 6))
  return props.labels.map((label, i) => ({
    show: i % step === 0 || i === total - 1,
    x: xAt(i, total),
    label,
  }))
})

function onMove(e: MouseEvent) {
  const svg = e.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * viewW
  const total = props.labels.length
  if (total === 0 || x < padding.left || x > viewW - padding.right) {
    hoverIndex.value = null
    return
  }
  const ratio = (x - padding.left) / chartW.value
  const idx = Math.round(ratio * (total - 1))
  hoverIndex.value = Math.max(0, Math.min(total - 1, idx))
}
function onLeave() { hoverIndex.value = null }

const hoverX = computed(() => {
  if (hoverIndex.value == null) return 0
  return xAt(hoverIndex.value, props.labels.length)
})
</script>

<template>
  <div class="relative">
    <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
      <div class="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
    </div>

    <svg
      :viewBox="`0 0 ${viewW} ${viewH}`"
      class="w-full"
      :style="{ height: `${viewH}px` }"
      preserveAspectRatio="none"
      @mousemove="onMove"
      @mouseleave="onLeave"
    >
      <!-- Gradients -->
      <defs>
        <linearGradient
          v-for="(s, i) in series"
          :id="`grad-${i}`"
          :key="`grad-${i}`"
          x1="0" y1="0" x2="0" y2="1"
        >
          <stop offset="0%" :stop-color="s.color" stop-opacity="0.25" />
          <stop offset="100%" :stop-color="s.color" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- Gridlines -->
      <g>
        <line
          v-for="(g, i) in gridLines"
          :key="`gl-${i}`"
          :x1="padding.left" :x2="viewW - padding.right"
          :y1="g.y" :y2="g.y"
          stroke="#f1f5f9" stroke-width="1"
        />
        <text
          v-for="(g, i) in gridLines"
          :key="`yl-${i}`"
          :x="padding.left - 6" :y="g.y + 3"
          text-anchor="end"
          class="fill-gray-400"
          style="font-size: 9px"
        >{{ leftFormat(g.valLeft) }}</text>
        <template v-if="rightSeries.length">
          <text
            v-for="(g, i) in gridLines"
            :key="`yr-${i}`"
            :x="viewW - padding.right + 6" :y="g.y + 3"
            text-anchor="start"
            class="fill-gray-400"
            style="font-size: 9px"
          >{{ rightFormat(g.valRight) }}</text>
        </template>
      </g>

      <!-- X labels -->
      <g>
        <template v-for="(l, i) in xLabels" :key="`xl-${i}`">
          <text
            v-if="l.show"
            :x="l.x" :y="viewH - 8"
            text-anchor="middle"
            class="fill-gray-400"
            style="font-size: 9px"
          >{{ l.label }}</text>
        </template>
      </g>

      <!-- Series -->
      <g v-for="(s, i) in series" :key="`s-${i}`">
        <path
          v-if="!s.dashed"
          :d="areaFor(s)"
          :fill="`url(#grad-${i})`"
        />
        <path
          :d="pathFor(s)"
          fill="none"
          :stroke="s.color"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          :stroke-dasharray="s.dashed ? '4 4' : undefined"
        />
      </g>

      <!-- Hover -->
      <g v-if="hoverIndex !== null">
        <line
          :x1="hoverX" :x2="hoverX"
          :y1="padding.top" :y2="viewH - padding.bottom"
          stroke="#94a3b8" stroke-dasharray="3 3" stroke-width="1"
        />
        <circle
          v-for="(s, i) in series"
          :key="`pt-${i}`"
          :cx="hoverX"
          :cy="yAt(s.data[hoverIndex] ?? 0, (s.axis === 'right' ? maxRight : maxLeft))"
          r="3.5"
          :fill="s.color"
          stroke="white" stroke-width="1.5"
        />
      </g>
    </svg>

    <!-- Tooltip -->
    <div
      v-if="hoverIndex !== null"
      class="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md"
    >
      <p class="font-semibold text-gray-900">{{ labels[hoverIndex] }}</p>
      <div
        v-for="(s, i) in series"
        :key="`tt-${i}`"
        class="mt-1 flex items-center gap-2"
      >
        <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: s.color }" />
        <span class="text-gray-600">{{ s.name }}:</span>
        <span class="font-medium text-gray-900">
          {{ (s.axis === 'right' ? rightFormat : leftFormat)(s.data[hoverIndex] ?? 0) }}
        </span>
      </div>
    </div>
  </div>
</template>
