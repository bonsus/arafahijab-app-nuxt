<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <UiCard class="w-full max-w-md">
      <UiCardHeader class="text-center">
        <UiCardTitle>Welcome</UiCardTitle>
        <UiCardDescription>Selamat datang di aplikasi</UiCardDescription>
      </UiCardHeader>
      <UiCardContent class="space-y-4">
        <Button @click="navigateTo('/login')" class="w-full">
          Login
        </Button>
        <Button @click="navigateTo('/register')" class="w-full">
          Register
        </Button>
        <Button @click="navigateTo('/dashboard')" variant="outline" class="w-full">
          Dashboard
        </Button>
      </UiCardContent>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
// Meta tags
useHead({
  title: 'Home',
  meta: [
    { name: 'description', content: 'Halaman utama aplikasi' }
  ]
})
</script>
