<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>

<template>
  <PromotionList
    type="shipping"
    title="Diskon Ongkir"
    create-route="/promotion/create?type=shipping"
  />
</template>
