<script setup lang="ts">
const query = ref({
  start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
  end_date: new Date().toISOString().split('T')[0] || '',
})
const props = defineProps<{
  query: typeof query.value
}>()
const { data: widget, pending: widgetPending, refresh: widgetRefresh } = await useFetch('/api/admin/widget-invoice', {
  method: 'GET', params: props.query
})
</script>
<template>
  <div class="grid grid-cols-1 gap-5 sm:grid-cols-4">
    <div class="bg-white overflow-hidden shadow rounded-lg">
      <div class="p-5">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Badge variant="default" color="primary">
              {{ widget?.invoice_total }}
            </Badge>
          </div>
          <div class="ml-5 w-0 flex-1 relative">
            <dl>
              <dt class="text-sm font-medium text-gray-500 truncate">Total Invoices</dt>
              <dd class="text-lg font-medium text-gray-900">{{ formatCurrency(widget?.invoice_total_total) }}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white overflow-hidden shadow rounded-lg">
      <div class="p-5">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Badge class="bg-green-600 text-white">
              {{ widget?.invoice_paid }}
            </Badge>
          </div>
          <div class="ml-5 w-0 flex-1">
            <dl>
              <dt class="text-sm font-medium text-gray-500 truncate">Paid Invoices</dt>
              <dd class="text-lg font-medium text-gray-900">{{ formatCurrency(widget?.invoice_paid_total) }}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white overflow-hidden shadow rounded-lg">
      <div class="p-5">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Badge class="bg-amber-500 text-white">
              {{ widget?.invoice_unpaid }}
            </Badge>
          </div>
          <div class="ml-5 w-0 flex-1">
            <dl>
              <dt class="text-sm font-medium text-gray-500 truncate">Unpaid Invoices</dt>
              <dd class="text-lg font-medium text-gray-900">{{ formatCurrency(widget?.invoice_unpaid_total) }}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
    <div class="bg-white overflow-hidden shadow rounded-lg">
      <div class="p-5">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Badge class="bg-red-600 text-white">
              {{ widget?.invoice_canceled }}
            </Badge>
          </div>
          <div class="ml-5 w-0 flex-1">
            <dl>
              <dt class="text-sm font-medium text-gray-500 truncate">Canceled Invoices</dt>
              <dd class="text-lg font-medium text-gray-900">{{ formatCurrency(widget?.invoice_canceled_total) }}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
