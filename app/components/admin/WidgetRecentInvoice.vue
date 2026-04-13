<script setup lang="ts">
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'

const { data: invoices, pending, refresh } = await useFetch('/api/admin/invoices', {
  method: 'GET', params: {perpage:6}
})
</script>
<template>
  <div class="bg-white shadow rounded-lg">
    <div class="px-4 py-5 sm:p-6">
      <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Invoices</h3>
      <div v-if="pending" class="text-center py-4">
        <Spinner />
      </div>
      <div v-else>
        <ul class="divide-y divide-gray-200">
          <li v-for="invoice in invoices?.data" :key="invoice.id" class="py-3 flex items-center justify-between">
            <div @click="navigateTo(`/admin/invoices/${invoice.id}`)" class="cursor-pointer hover:underline">
              <p class="text-sm font-medium text-gray-900">{{ invoice.no }}</p>
              <p class="text-xs text-gray-500">{{ formatDate(invoice.date) }}</p>
            </div>
            <div>
              <span class="text-sm font-medium text-gray-900">{{ formatCurrency(invoice.amount) }}</span>
              <Badge class="ms-2" :class="{
                'bg-green-600 text-white': invoice.status === 'paid',
                'bg-yellow-500 text-white': invoice.status === 'unpaid',
                'bg-red-600 text-white': invoice.status === 'canceled'
              }">
                {{ invoice.status }}
              </Badge>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
