<script setup lang="ts">
// /admin -> redirect to the dashboard.
definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

onMounted(() => {
  navigateTo('/admin/dashboard')
})
</script>

<template>
  <div class="flex h-full items-center justify-center text-sm text-gray-400">
    Mengalihkan…
  </div>
</template>
