<script setup lang="ts">
useHead({
  title: 'User Details',
})
definePageMeta({
  middleware: 'admin'
})
import { ArrowLeft, EditIcon, KeyRound, Phone } from 'lucide-vue-next'
import { formatDate } from '@/utils/formatDate'
import { formatCurrency } from '@/utils/formatCurrency'

const { data: user, pending, refresh } = await useFetch(`/api/admin/users/${useRoute().params.id}`, { method: 'GET' })

const pasw = ref({
  id: '',
  name:'',
  open: false,
})

const edit = ref({
  open: false,
  id: '',
  name: '',
  phone: '',
  email: '',
  company: '',
  status: ''
})
</script>
<template>
  <NuxtLayout name="admin">

    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-top justify-between">
        <div class="flex-1">
          <Button variant="outline" @click="navigateTo('/admin/users')">
            <ArrowLeft class="me-2" />
            Back to Users
          </Button>
          <!-- <div>
            <h1 class="text-2xl font-bold text-gray-900">User Details</h1>
          </div> -->
        </div>
        <div class="flex items-center">
          <Button variant="outline" class="ms-2 text-nowwrap flex items-center" @click="edit={ open:true, id: user.id, name: user.name, phone:user.phone, email: user.email, company: user.company, status: user.status }">
            <EditIcon/>
            Edit User
          </Button>
          <Button variant="outline" class="ms-2 text-nowwrap flex items-center" @click="pasw={ id: user.id, name: user.name, open: true }">
            <KeyRound/>
            Change Password
          </Button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- User Information Card -->
        <Card class="relative overflow-hidden">
          <CardHeader>
            <CardTitle class="text-lg font-semibold">User Information</CardTitle>
            <CardDescription>Details about the user</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div>
                <label class="font-semibold">Company</label>
                <p class="text-gray-700">{{ user?.company }}</p>
              </div>
              <div>
                <label class="font-semibold">Name</label>
                <p class="text-gray-700">{{ user?.name }}</p>
              </div>
              <div>
                <label class="font-semibold">Email</label>
                <p class="text-gray-700">{{ user?.email }}</p>
              </div>
              <div>
                <label class="font-semibold">Phone</label>
                <p class="text-gray-700">{{ user?.phone }}</p>
              </div>
              <div>
                <label class="font-semibold">Account Status</label>
                <div>
                  <Badge :variant="user?.status === 'active' ? 'default' : 'destructive'" class="capitalize">
                    {{ user?.status }}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card class="relative overflow-hidden">
          <CardHeader>
            <CardTitle class="text-lg font-semibold">Account Details</CardTitle>
            <CardDescription>Information about the user's account</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div>
                <label class="font-semibold">Created At</label>
                <p class="text-gray-700">{{ formatDate(user?.CreatedAt) }}</p>
              </div>
              <div>
                <label class="font-semibold">Updated At</label>
                <p class="text-gray-700">{{ formatDate(user?.UpdatedAt) }}</p>
              </div>
              <div>
                <label class="font-semibold">Role</label>
                <p class="text-gray-700">{{ user?.role }}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card class="relative overflow-hidden">
          <CardHeader>
            <CardTitle class="text-lg font-semibold">Subscription Details</CardTitle>
            <CardDescription>Information about the user's subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div v-if="user?.subscriptions?.length > 0">
                <div v-for="subscription in user.subscriptions" :key="subscription.id" class="py-3 flex items-center justify-between border-b last:border-0">
                  <Badge :variant="subscription.status === 'active' ? 'default' : 'destructive'">
                    {{ subscription.plan.name }}
                  </Badge>
                  <div class="text-xs text-gray-500">
                    {{ formatDate(subscription.start_date) }} - {{ formatDate(subscription.end_date) }}
                  </div>
                </div>
              </div>
              <div v-else>
                <p class="text-gray-500">No active subscriptions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card class="relative overflow-hidden">
          <CardHeader>
            <CardTitle class="text-lg font-semibold">Invoice Details</CardTitle>
            <CardDescription>Information about the user's invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div v-if="user?.invoices?.length > 0">
                <div v-for="invoice in user.invoices" :key="invoice.id" class="py-3 flex items-center justify-between border-b last:border-0">
                  <div @click="navigateTo(`/admin/invoices/${invoice.id}`)" class="cursor-pointer hover:underline">
                    <p class="text-sm font-semibold">{{ invoice.no }}</p>
                    <p class="text-xs text-gray-500">{{ formatDate(invoice.date) }}</p>
                  </div>
                  <div>
                  </div>
                  <div class="flex flex-col items-end">
                    <div>
                      <span class="text-sm font-medium me-2">{{ formatCurrency(invoice.amount) }}</span>
                      <Badge :variant="invoice.status === 'paid' ? 'default' : 'destructive'" class="capitalize">
                        {{ invoice.status }}
                      </Badge>
                    </div>
                    <span class="text-xs text-gray-500">
                      <span v-if="invoice.payment_provider=='midtrans'">Midtrans - {{ invoice.payment_method }}</span>
                      <span v-else>Transfer Manual</span>
                      - <span v-if="invoice.status=='paid'"> {{ invoice.paid_at ? formatDate(invoice.paid_at) : 'Not Paid' }}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div v-else>
                <p class="text-gray-500">No invoices available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    <AdminUserChangePasswordForm :user="pasw" />
    <AdminUserUpdateProfileDialog :user="edit" @refresh="refresh()" />
  </NuxtLayout>
</template>
