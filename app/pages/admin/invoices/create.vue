<script setup lang="ts">
useHead({
  title: 'Create Invoice',
})
definePageMeta({
  middleware: 'admin',
})

const props = defineProps<{
  invoice?: {
    id: string
    user_id: string
    plan_id: string
    promotion_id?: string
    no: string
    date: string
    amount: number
    status: string
    dueDate: string
  }
}>()

</script>

<template>
  <div>Create Invoice</div>
</template>
