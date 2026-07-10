<script setup lang="ts">
import { Menu, Globe } from 'lucide-vue-next'

const sidebar = useSidebar()
const { selectedStore } = useWebsiteStore()
</script>

<template>
  <header class="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
    <div class="flex items-center gap-3">
      <button
        class="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
        @click="sidebar.toggle()"
      >
        <Menu class="h-5 w-5" />
      </button>
      <div class="flex items-center gap-2">
        <div class="flex h-7 w-7 items-center justify-center rounded-md bg-primary-600 text-white">
          <Globe class="h-3.5 w-3.5" />
        </div>
        <span class="text-base font-semibold text-gray-900">Website</span>
      </div>
    </div>
    <span v-if="selectedStore" class="max-w-[45%] truncate text-xs text-gray-500">
      {{ selectedStore.shop_name }}
    </span>
  </header>
</template>
