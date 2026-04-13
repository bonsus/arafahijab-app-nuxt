<script setup lang="ts">
useHead({
  title: 'Register',
})

definePageMeta({
  middleware: 'user-guest',
})

</script>
<template>
  <NuxtLayout>
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-6">
      <UserRegisterForm />
    </div>
  </NuxtLayout>
</template>
