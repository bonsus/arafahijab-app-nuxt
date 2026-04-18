<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>

<template>
  <PromotionList
    type="product_free"
    title="Produk Gratis"
    create-route="/promotion/create?type=product_free"
  />
</template>
