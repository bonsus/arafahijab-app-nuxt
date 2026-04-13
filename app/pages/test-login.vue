<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
    <LoginForm />
  </div>
</template>

<script setup lang="ts">
import LoginForm from '~/components/LoginForm.vue'

useHead({
  title: 'Test Login Form'
})
</script>
