<script setup lang="ts">
useHead({
  title: 'Login',
})
definePageMeta({
  middleware: 'user-guest',
})
</script>

<template>
  <nuxt-layout>
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-6">
      <UserLoginForm />
    </div>
  </nuxt-layout>
</template>
