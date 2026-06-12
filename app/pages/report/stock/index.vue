<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const router = useRouter()
onMounted(() => { router.replace('/report/stock/stock-report') })
</script>
<template><div /></template>
