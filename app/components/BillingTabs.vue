<script setup lang="ts">
const route = useRoute()

const tabs = [
  { label: 'Langganan', to: '/billing/subscription' },
  { label: 'Invoice', to: '/billing/invoice' },
]

function isActive(to: string): boolean {
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <div class="flex border-b border-gray-200">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
      :class="isActive(tab.to)
        ? 'border-primary-600 text-primary-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'"
    >
      {{ tab.label }}
    </NuxtLink>
  </div>
</template>
