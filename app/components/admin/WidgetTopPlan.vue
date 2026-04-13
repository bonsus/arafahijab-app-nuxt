<script setup lang="ts">
import { formatCurrency } from '@/utils/formatCurrency'
import { Package } from 'lucide-vue-next';
const query = ref({
  start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
  end_date: new Date().toISOString().split('T')[0] || '',
})
const props = defineProps<{
  query: typeof query.value
}>()
const { data: widgets, pending, refresh } = await useFetch('/api/admin/widget-top-plan', {
  method: 'GET', params: props.query
})
</script>
<template>
  <div class="bg-white shadow rounded-lg">
    <div class="px-4 py-5 sm:p-6">
      <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Top Products</h3>
      <div class="space-y-4">
        <div v-for="item in widgets" :key="item.plan_id" class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center">
              <Package class="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">{{ item.plan_name }}</p>
              <p class="text-xs text-gray-500">{{ item.total }} sales</p>
            </div>
          </div>
          <div class="text-sm font-medium text-gray-900">{{ formatCurrency(item.total_paid) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
