<script setup lang="ts">
import { set } from '@vueuse/core'

// Middleware untuk redirect jika sudah login
definePageMeta({
  middleware: 'admin-guest',
})

useHead({
  title: 'Admin Login',
  meta: [
    { name: 'description', content: 'Halaman login untuk admin' }
  ]
})
onMounted(() => {
  // Set Cookie untuk sidebar state jika belum ada
  const sidebarCookie = useCookie('admin-sidebar-collapsed', {
    default: () => 'false',
    maxAge: 60 * 60 * 24 * 7 // 1 week
  })
  if (!sidebarCookie.value) {
    sidebarCookie.value = 'false'
  }
})
</script>
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <AdminLogin/>
  </div>
</template>
