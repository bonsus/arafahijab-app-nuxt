<script setup lang="ts">
import { Construction } from 'lucide-vue-next'

defineProps<{
  title: string
}>()
</script>
<template>
  <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
    <div class="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
      <Construction class="h-7 w-7 text-gray-400" />
    </div>
    <h2 class="mt-4 text-lg font-semibold text-gray-900">{{ title }}</h2>
    <p class="mt-1 text-sm text-gray-500">Halaman ini sedang dalam pengembangan.</p>
  </div>
</template>
