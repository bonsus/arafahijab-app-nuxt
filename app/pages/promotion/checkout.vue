<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>

<template>
  <PromotionList
    type="checkout"
    title="Diskon Checkout"
    create-route="/promotion/create?type=checkout"
  />
</template>
