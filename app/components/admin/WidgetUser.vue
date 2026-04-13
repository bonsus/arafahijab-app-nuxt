<script setup lang="ts">
import { UserCheck, Users, UserX } from 'lucide-vue-next';


const {data: widget, pending: widgetPending, refresh: widgetRefresh} = await useFetch(`/api/admin/widget-user`, { method: 'GET' })

</script>
<template>
  <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
    <div class="bg-white overflow-hidden shadow rounded-lg">
      <div class="p-5">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Users class="h-6 w-6 text-gray-400" />
          </div>
          <div class="ml-5 w-0 flex-1">
            <dl>
              <dt class="text-sm font-medium text-gray-500 truncate">Total Users</dt>
              <dd class="text-lg font-medium text-gray-900">{{ widget?.user_total }}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white overflow-hidden shadow rounded-lg">
      <div class="p-5">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <UserCheck class="h-6 w-6 text-green-400" />
          </div>
          <div class="ml-5 w-0 flex-1">
            <dl>
              <dt class="text-sm font-medium text-gray-500 truncate">Active Users</dt>
              <dd class="text-lg font-medium text-gray-900">{{ widget?.user_active }}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white overflow-hidden shadow rounded-lg">
      <div class="p-5">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <UserX class="h-6 w-6 text-red-400" />
          </div>
          <div class="ml-5 w-0 flex-1">
            <dl>
              <dt class="text-sm font-medium text-gray-500 truncate">Inactive Users</dt>
              <dd class="text-lg font-medium text-gray-900">{{ widget?.user_inactive }}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
