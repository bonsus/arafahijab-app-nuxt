<script setup lang="ts">
useHead({
  title: 'Edit User',
})
definePageMeta({
  middleware: 'admin'
})
</script>
<template>
  <NuxtLayout name="admin">
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-top justify-between">
        <div class="flex-1">
          <Button variant="outline" class="mb-4" @click="navigateTo('/admin/users')">
            <ArrowLeft class="me-2" />
            Back to Users
          </Button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Edit User</h1>
          </div>
        </div>
      </div>

      <!-- User Edit Form -->
      <!-- <UserEditForm :userId="useRoute().params.id" /> -->
    </div>
  </NuxtLayout>
</template>
