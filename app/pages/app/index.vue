<script setup lang="ts">
useHead({
  title: 'Dashboard',
})
definePageMeta({
  middleware: 'user',
})

const authStore = useAuthUserStore()
const { user } = storeToRefs(authStore)

// Redirect to CRM dashboard by default
await navigateTo('/app/crm')
</script>
<template>
  <NuxtLayout name="user">
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <header class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <h1 class="text-2xl font-bold text-gray-900">Welcome, {{ user?.name || 'User' }}</h1>
            </div>
            <div class="flex items-center space-x-4">
              <NuxtLink to="/profile" class="text-gray-600 hover:text-gray-900">Profile</NuxtLink>
              <NuxtLink to="/settings" class="text-gray-600 hover:text-gray-900">Settings</NuxtLink>
              <button @click="authStore.logout" class="text-red-600 hover:text-red-900">Logout</button>
            </div>
          </div>
        </div>
      </header>
      <div class="flex-1 p-6">
        <div class="max-w-7xl mx-auto">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Dashboard</h2>
          <p class="text-gray-600">This is your user dashboard.</p>
        </div>
      </div>
      <footer class="bg-white shadow mt-6">
        <div class="max-w-7xl mx-auto px-4 py-4 text
-center text-gray-600">
          &copy; {{ new Date().getFullYear() }} MyApp. All rights reserved.
        </div>
      </footer>
    </div>
  </NuxtLayout>
</template>
