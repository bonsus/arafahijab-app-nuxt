<script setup lang="ts">
definePageMeta({ layout: 'website', middleware: 'auth' })

await navigateTo('/website/settings', { replace: true })
</script>

<template>
  <div />
</template>
