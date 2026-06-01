<script setup lang="ts">
import { TrendingUp, TrendingDown, Minus } from 'lucide-vue-next'
import { formatCurrency } from '~/composables/useFormatters'
import type { Component } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  value: number
  growth: number
  icon: Component
  iconBg?: string
  iconColor?: string
  /** 'currency' | 'number' | 'percent' */
  format?: 'currency' | 'number' | 'percent'
  /** For percent growth, treat growth as absolute pp instead of % */
  growthAsPoints?: boolean
  loading?: boolean
}>(), {
  format: 'number',
  iconBg: 'bg-primary-50',
  iconColor: 'text-primary-600',
  growthAsPoints: false,
  loading: false,
})

const displayValue = computed(() => {
  if (props.loading) return '...'
  if (props.format === 'currency') return `Rp ${formatCurrency(props.value)}`
  if (props.format === 'percent') return `${formatCurrency(props.value)}%`
  return formatCurrency(props.value)
})

const isUp = computed(() => props.growth > 0)
const isDown = computed(() => props.growth < 0)
const growthLabel = computed(() => {
  const g = props.growth
  const sign = g > 0 ? '+' : ''
  return props.growthAsPoints
    ? `${sign}${g.toFixed(1)} pp`
    : `${sign}${g.toFixed(1)}%`
})
const growthColor = computed(() => {
  if (isUp.value) return 'text-green-600 bg-green-50 ring-green-200'
  if (isDown.value) return 'text-red-600 bg-red-50 ring-red-200'
  return 'text-gray-500 bg-gray-50 ring-gray-200'
})
</script>

<template>
  <div class="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm">
    <div class="flex items-center justify-between">
      <div
        class="flex h-9 w-9 items-center justify-center rounded-lg"
        :class="iconBg"
      >
        <component :is="icon" class="h-5 w-5" :class="iconColor" />
      </div>
      <span
        class="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1"
        :class="growthColor"
      >
        <TrendingUp v-if="isUp" class="h-3 w-3" />
        <TrendingDown v-else-if="isDown" class="h-3 w-3" />
        <Minus v-else class="h-3 w-3" />
        {{ growthLabel }}
      </span>
    </div>
    <p class="mt-3 text-xl font-bold text-gray-900">{{ displayValue }}</p>
    <p class="mt-0.5 text-xs text-gray-500">{{ label }}</p>
    <p class="mt-0.5 text-[10px] text-gray-400">vs periode sebelumnya</p>
  </div>
</template>
