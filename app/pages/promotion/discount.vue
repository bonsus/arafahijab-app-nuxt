<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>

<template>
  <PromotionList
    type="discount"
    title="Diskon Produk"
    create-route="/promotion/create?type=discount"
  />
</template>
