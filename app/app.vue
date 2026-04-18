<script setup lang="ts">
const { setRef } = useConfirm()
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <AppToast />
  <AppConfirm :ref="(el: any) => setRef(el)" />
</template>
