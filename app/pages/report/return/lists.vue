<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const router = useRouter()
onMounted(() => { router.replace('/report/return/problem-lists') })
</script>
<template><div /></template>
