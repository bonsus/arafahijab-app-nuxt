<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
</script>
<template>
  <div class="absolute inset-0 bg-white/80 flex items-center justify-center z-0">
    <Loader2 class="h-6 w-6 animate-spin text-gray-500" />
    <span class="ml-2 text-gray-500 text-sm">Loading...</span>
  </div>
</template>
