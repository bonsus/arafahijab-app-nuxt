<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'

useHead({
  title: 'Pay Invoice',
})
definePageMeta({
  middleware: 'admin',
})
const route = useRoute()
const {data: invoice, pending, refresh} = await useFetch(`/api/admin/invoices/${route.params.id}`, { method: 'GET' })
</script>
<template>
  <NuxtLayout name="admin">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <Button variant="outline" class="mb-4" @click="navigateTo('/admin/invoices')">
            <ArrowLeft class="me-2" />
            Back to Invoices
          </Button>
          <h1 class="text-2xl font-bold text-gray-900">Pay Invoice</h1>
        </div>
      </div>
      <AdminPayInvoiceForm :invoice="invoice"/>
    </div>
  </NuxtLayout>
</template>
