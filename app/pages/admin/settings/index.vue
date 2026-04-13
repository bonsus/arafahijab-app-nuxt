<script setup lang="ts">
import { toast } from 'vue-sonner'

useHead({
  title: 'Settings',
})
definePageMeta({
  middleware: 'admin',
})

interface General {
  url: string
  title: string
  description: string
  keywords: string
  logo: string
  favicon: string
  email: string
  phone: string
  address: string
  currency: string
  timezone: string
}

const { data: general, pending, refresh } = await useFetch('/api/admin/options/general', {
  method: 'GET'
})
const updateGeneralSettings = async () => {
  try {
    await $fetch('/api/admin/options', {
      method: 'PUT',
      body: {
        name:'general',
        value: general.value,
      }
    })
    toast.success('Settings updated successfully')
    refresh()
  } catch (err:any) {
    toast.error('Error updating settings')
  }
}
</script>
<template>
  <NuxtLayout name="admin">
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">General Settings</h1>
          <p class="text-gray-600">Configure your application settings</p>
        </div>
      </div>

      <!-- General Settings Form -->
      <div class="bg-white shadow rounded-lg p-6">
        <form @submit.prevent="updateGeneralSettings">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div class="space-y-1.5">
              <Label>Website URL</Label>
              <Input v-model="general.url" type="text"/>
            </div>
            <div class="space-y-1.5">
              <Label>Website Title</Label>
              <Input v-model="general.title" type="text"/>
            </div>
            <div class="space-y-1.5">
              <Label>Description</Label>
              <Textarea v-model="general.description" rows="3"></Textarea>
            </div>
            <div class="space-y-1.5">
              <Label>Keywords</Label>
              <Input v-model="general.keywords" type="text" placeholder="keyword1, keyword2"/>
            </div>
            <div class="space-y-1.5">
              <Label>Logo URL</Label>
              <Input v-model="general.logo" type="text" placeholder="https://example.com/logo.png"/>
            </div>
            <div class="space-y-1.5">
              <Label>Favicon URL</Label>
              <Input v-model="general.favicon" type="text" placeholder="https://example.com/favicon.ico"/>
            </div>
            <div class="space-y-1.5">
              <Label>Email</Label>
              <Input v-model="general.email" type="email" placeholder="you@example.com"/>
            </div>
            <div class="space-y-1.5">
              <Label>Phone</Label>
              <Input v-model="general.phone" type="text" placeholder="+1234567890"/>
            </div>
            <div class="space-y-1.5">
              <Label>Address</Label>
              <Input v-model="general.address" type="text" placeholder="123 Main St, City, Country"/>
            </div>
            <div class="space-y-1.5">
              <Label>Currency</Label>
              <Input v-model="general.currency" type="text" placeholder="IDR"/>
            </div>
            <div class="space-y-1.5">
              <Label>Timezone</Label>
              <Input v-model="general.timezone" type="text" placeholder="Asia/Jakarta"/>
            </div>
          </div>
          <!-- Example: URL, Title, Description, etc. -->
          <Button type="submit" variant="default" :disabled="pending" class="w-full relative">
            <Spinner v-if="pending" size="medium" class-name="absolute left-2 top-2" />
            Save Settings
          </Button>
        </form>
      </div>
    </div>
  </NuxtLayout>
</template>
