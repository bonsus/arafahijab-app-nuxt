<script setup lang="ts">
useHead({
  title: 'Admin Settings - SMS Gateway',
  meta: [
    { name: 'description', content: 'Halaman pengaturan gateway SMS untuk admin' }
  ]
})
definePageMeta({
  middleware: 'admin',
})
import { toast } from 'vue-sonner'

const {data: smsGateway, refresh, pending} = await useFetch('/api/admin/options/sms-gateway', {
  method: 'GET',
  default: () => ({
    provider: 'zenziva',
    zenziva_user_key: '',
    zenziva_api_key: '',
  }),
})
const saveSettings = async () => {
  try {
    await $fetch('/api/admin/options', {
      method: 'PUT',
      body: {
        name: 'sms-gateway',
        value: smsGateway.value,
      }
    })
    toast.success('SMS Gateway settings saved successfully')
    refresh()
  } catch (err:any) {
    toast.error('Error saving SMS Gateway settings')
  }
}
</script>
<template>
  <NuxtLayout name="admin">
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">SMS Gateway Settings</h1>
          <p class="text-gray-600">Configure your SMS gateway settings</p>
        </div>
      </div>

      <!-- SMS Gateway Settings Form -->
      <div class="bg-white shadow rounded-lg p-6 max-w-2xl">
        <form @submit.prevent="saveSettings">
          <div class="grid grid-cols-1 sm:grid-cols-1 gap-4 mb-4">
            <div class="space-y-1.5">
              <Label>Provider</Label>
              <Select v-model="smsGateway.provider">
                <SelectTrigger>
                  <SelectValue placeholder="Select SMS Gateway Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zenziva">Zenziva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div v-if="smsGateway.provider === 'zenziva'" class="space-y-1.5">
              <Label>Zenziva User Key</Label>
              <Input v-model="smsGateway.zenziva_user_key" type="text" placeholder="Enter Zenziva User Key" />
            </div>
            <div v-if="smsGateway.provider === 'zenziva'" class="space-y-1.5">
              <Label>Zenziva API Key</Label>
              <Input v-model="smsGateway.zenziva_api_key" type="text" placeholder="Enter Zenziva API Key" />
            </div>
          </div>
          <Button type="submit" class="relative px-10" variant="default" :disabled="pending">
            <Spinner v-if="pending" class="mr-2 absolute left-4" />
            Save Settings
          </Button>
        </form>
      </div>
    </div>
  </NuxtLayout>
</template>

