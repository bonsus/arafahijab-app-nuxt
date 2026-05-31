<script setup lang="ts">
const { setRef } = useConfirm()
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <AppToast />
    <AppConfirm :ref="(el: any) => setRef(el)" />
  </ClientOnly>
</template>
