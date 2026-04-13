<script setup lang="ts">
useHead({
  title: 'Admin Settings - Email',
  meta: [
    { name: 'description', content: 'Halaman pengaturan email untuk admin' }
  ]
})
definePageMeta({
  middleware: 'admin',
})
import { toast } from 'vue-sonner'

const {data: emailSettings, refresh, pending} = await useFetch('/api/admin/options/email', {
  method: 'GET',
  default: () => ({
    provider: 'smtp',
    smtp_host: '',
    smtp_port: '',
    smtp_user: '',
    smtp_pass: '',
  }),
})
const saveSettings = async () => {
  try {
    await $fetch('/api/admin/options', {
      method: 'PUT',
      body: {
        name: 'email',
        value: emailSettings.value,
      }
    })
    toast.success('Email settings saved successfully')
    refresh()
  } catch (err:any) {
    toast.error('Error saving email settings')
  }
}
</script>
<template>
  <NuxtLayout name="admin">
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Email Settings</h1>
          <p class="text-gray-600">Configure your email settings</p>
        </div>
      </div>

      <!-- Email Settings Form -->
      <div class="bg-white shadow rounded-lg p-6 max-w-2xl">
        <form @submit.prevent="saveSettings">
          <div class="grid grid-cols-1 sm:grid-cols-1 gap-4 mb-4">
            <div class="space-y-1.5">
              <Label>Provider</Label>
              <Select v-model="emailSettings.provider">
                <SelectTrigger>
                  <SelectValue placeholder="Select Email Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smtp">SMTP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Label>SMTP Host</Label>
              <Input v-model="emailSettings.smtp_host" type="text" placeholder="smtp.example.com" />
            </div>
            <div class="space-y-1.5">
              <Label>SMTP Port</Label>
              <Input v-model="emailSettings.smtp_port" type="number" placeholder="587" />
            </div>
            <div class="space-y-1.5">
              <Label>SMTP User</Label>
              <Input v-model="emailSettings.smtp_user" type="text" placeholder="user@example.com" />
            </div>
            <div class="space-y-1.5">
              <Label>SMTP Password</Label>
              <Input v-model="emailSettings.smtp_pass" type="password" placeholder="Enter SMTP Password" />
            </div>
          </div>
          <Button type="submit" class="relative px-10" variant="default" :disabled="pending">
            <Spinner v-if="pending" class="mr-2 absolute left-4" />
            Save Settings
          </Button>
          <Button @click="refresh" class="ml-2 px-4" variant="secondary" :disabled="pending">
            <Spinner v-if="pending" class="mr-2 absolute left-4" />
            Check Connection
          </Button>
        </form>
      </div>
    </div>
  </NuxtLayout>
</template>
