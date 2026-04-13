<script setup lang="ts">
import { PlusIcon, Trash } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
useHead({
  title: 'Admin Settings - Payment Gateway',
  meta: [
    { name: 'description', content: 'Halaman pengaturan gateway pembayaran untuk admin' }
  ]
})
definePageMeta({
  middleware: 'admin',
})
const defaultData = reactive({
  provider: 'midtrans',
  env: 'sandbox',
  midtrans: {
    merchant_id: '',
    client_key: '',
    server_key: '',
    merchant_id_sandbox: '',
    client_key_sandbox: '',
    server_key_sandbox: '',
  },
  xendit: {
    api_key: '',
    api_key_sandbox: '',
  },
  banks: [
    {
      name: 'BCA',
      account_name:'',
      account_number: '',
      is_active: false,
    },
  ],
  midtrans_banks:[
    {
      name: 'QRIS',
      code: 'qris',
      fee: 0,
      is_active: false,
    },
    {
      name: 'DANA',
      code: 'dana',
      fee: 0,
      is_active: false,
    },
    {
      name: 'OVO',
      code: 'ovo',
      fee: 0,
      is_active: false,
    },
    {
      name: 'ShopeePay',
      code: 'shopeepay',
      fee: 0,
      is_active: false,
    },
    {
      name: 'BCA Virtual Account',
      code: 'bca_va',
      fee: 0,
      is_active: false,
    },
    {
      name: 'Mandiri Virtual Account',
      code: 'mandiri_va',
      fee: 0,
      is_active: false,
    },
    {
      name: 'BRI Virtual Account',
      code: 'bri_va',
      fee: 0,
      is_active: false,
    },
    {
      name: 'BNI Virtual Account',
      code: 'bni_va',
      fee: 0,
      is_active: false,
    },
    {
      name: 'Permata Virtual Account',
      code: 'permata_va',
      fee: 0,
      is_active: false,
    },
  ],
  xendit_banks: [
    {
      name: 'QRIS',
      code: 'QRIS',
      type: 'QRIS',
      fee: 0,
      is_active: false,
    },
    {
      name: 'DANA',
      code: 'DANA',
      type: 'EWALLET',
      fee: 0,
      is_active: false,
    },
    {
      name: 'OVO',
      code: 'OVO',
      type: 'EWALLET',
      fee: 0,
      is_active: false,
    },
    {
      name: 'ShopeePay',
      code: 'SHOPEEPAY',
      type: 'EWALLET',
      fee: 0,
      is_active: false,
    },
    {
      name: 'BCA Virtual Account',
      code: 'BCA',
      type: 'va',
      fee: 0,
      is_active: false,
    },
    {
      name: 'BSI Virtual Account',
      code: 'BSI',
      type: 'va',
      fee: 0,
      is_active: false,
    },
    {
      name: 'Mandiri Virtual Account',
      code: 'MANDIRI',
      type: 'va',
      fee: 0,
      is_active: false,
    },
    {
      name: 'BRI Virtual Account',
      code: 'BRI',
      type: 'va',
      fee: 0,
      is_active: false,
    },
    {
      name: 'BNI Virtual Account',
      code: 'BNI',
      type: 'va',
      fee: 0,
      is_active: false,
    },
    {
      name: 'Permata Virtual Account',
      code: 'PERMATA',
      type: 'va',
      fee: 0,
      is_active: false,
    },
  ],
})

const { data: pg, refresh, pending } = await useFetch('/api/admin/options/payment-gateway', {
  method: 'GET',
  default: () => defaultData,
})


const setDefaultData = () => {
  pg.value = defaultData
  toast.success('Default data set successfully')
}

const updatePaymentGatewaySettings = async () => {
  try {
    await $fetch('/api/admin/options', {
      method: 'PUT',
      body: {
        name: 'payment-gateway',
        value: pg.value,
      }
    })
    toast.success('Payment gateway settings updated successfully')
    refresh()
  } catch (err:any) {
    toast.error('Error updating payment gateway settings')
  }
}
</script>
<template>
  <NuxtLayout name="admin">
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Payment Gateway Settings</h1>
          <p class="text-gray-600">Configure your payment gateway settings</p>
        </div>
      </div>

      <!-- Payment Gateway Settings Form -->
      <Card>
        <CardContent>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div class="space-y-1.5">
              <Label>Provider</Label>
              <Select v-model="pg.provider" class="w-full">
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="midtrans">Midtrans</SelectItem>
                  <SelectItem value="xendit">Xendit</SelectItem>
                  <SelectItem value="default">Manual Payment</SelectItem>
                </SelectContent>
              </Select>
              <p class="text-gray-500 text-sm">Select your payment gateway provider</p>
            </div>
            <div class="space-y-1.5">
              <Label>Environment</Label>
              <Select v-model="pg.env" class="w-full">
                <SelectTrigger>
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
              <p class="text-gray-500 text-sm">Choose the environment for your payment gateway</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Midtrans Configuration</CardTitle>
            <CardDescription>Set up your Midtrans payment gateway</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 gap-4">
              <div class="space-y-1.5">
                <Label>Merchant ID</Label>
                <Input v-model="pg.midtrans.merchant_id" type="text" placeholder="Your Midtrans Merchant ID" />
              </div>
              <div class="space-y-1.5">
                <Label>Client Key</Label>
                <Input v-model="pg.midtrans.client_key" type="text" placeholder="Your Midtrans Client Key" />
              </div>
              <div class="space-y-1.5">
                <Label>Server Key</Label>
                <Input v-model="pg.midtrans.server_key" type="text" placeholder="Your Midtrans Server Key" />
              </div>
              <div class="space-y-1.5">
                <Label>Sandbox Merchant ID</Label>
                <Input v-model="pg.midtrans.merchant_id_sandbox" type="text" placeholder="Your Midtrans Sandbox Merchant ID" />
              </div>
              <div class="space-y-1.5">
                <Label>Sandbox Client Key</Label>
                <Input v-model="pg.midtrans.client_key_sandbox" type="text" placeholder="Your Midtrans Sandbox Client Key" />
              </div>
              <div class="space-y-1.5">
                <Label>Sandbox Server Key</Label>
                <Input v-model="pg.midtrans.server_key_sandbox" type="text" placeholder="Your Midtrans Sandbox Server Key" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Xendit Configuration</CardTitle>
            <CardDescription>Set up your Xendit payment gateway</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 gap-4">
              <div class="space-y-1.5">
                <Label>API Key</Label>
                <Input v-model="pg.xendit.api_key" type="text" placeholder="Your Xendit API Key" />
              </div>
              <div class="space-y-1.5">
                <Label>Sandbox API Key</Label>
                <Input v-model="pg.xendit.api_key_sandbox" type="text" placeholder="Your Xendit Sandbox API Key" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Bank Accounts</CardTitle>
            <CardDescription>Configure your bank accounts for manual payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div v-for="(bank, index) in pg.banks" :key="index" class="space-x-1.5 flex items-center justify-between">
                <Input v-model="bank.account_name" type="text" placeholder="Account Name" />
                <Input v-model="bank.account_number" type="text" placeholder="Account Number" />
                <Switch v-model="bank.is_active" label="Active" />
                <Button @click="pg.banks.splice(index, 1)" variant="destructive" size="icon">
                  <Trash class="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button @click="pg.banks.push({ name: '', account_name: '', account_number: '', is_active: false })" variant="outline" class="mt-4 w-full">
              <PlusIcon class="me-2" /> Add Bank Account
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Midtrans Banks</CardTitle>
            <CardDescription>Configure Midtrans bank options</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div v-for="(bank, index) in pg.midtrans_banks" :key="index" class="space-x-1.5 flex items-center justify-between">
                <Label class="text-nowrap">{{ bank.name }}</Label>
                <div class="flex items-center space-x-2">
                  <Input v-model="bank.fee" type="number" placeholder="Fee" class="w-[80px]" />
                  <Switch v-model="bank.is_active" label="Active" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Xendit Banks</CardTitle>
            <CardDescription>Configure Xendit bank options</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div v-for="(bank, index) in pg.xendit_banks" :key="index" class="space-x-1.5 flex items-center justify-between">
                <Label class="text-nowrap">{{ bank.name }}</Label>
                <div class="flex items-center space-x-2">
                  <Input v-model="bank.fee" type="number" placeholder="Fee" class="w-[80px]" />
                  <Switch v-model="bank.is_active" label="Active" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <!-- Additional fields as needed -->
      <Button type="submit" @click="updatePaymentGatewaySettings" variant="default" :disabled="pending" class="w-full relative">
        <Spinner v-if="pending" size="medium" class-name="absolute left-2 top-2" />
        Save Settings
      </Button>
      <Button type="button" variant="secondary" @click="setDefaultData" class="mt-2 w-full">
        Set Default Data
      </Button>
    </div>
  </NuxtLayout>
</template>
