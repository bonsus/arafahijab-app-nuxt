<script setup lang="ts">
import { formatCurrency } from '@/utils/formatCurrency'
import { ArrowLeft, EditIcon } from 'lucide-vue-next'
interface Plan {
  id: string,
  name: string
  description: string
  days: number
  price: number
  recurring_price: number
  status: string
  limits: Array<{
    id?: number
    name: string
    key: string
    value: number
  }>
}

definePageMeta({
  middleware: 'admin',
})

const route = useRoute()

const { data: plan, pending, error } = await useFetch<Plan>('/api/admin/plans/' + route.params.id, {
  method: 'GET'
})

// Handle error or redirect if plan not found
if (error.value && !pending.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Plan not found'
  })
}


useHead({
  title: 'Plan Details' + (plan.value ? ` - ${plan.value.name}` : ''),
})
</script>
<template>
  <NuxtLayout name="admin">
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-top justify-between">
        <div class="flex-1">
          <Button variant="outline" class="mb-4" @click="navigateTo('/admin/plans')">
            <ArrowLeft class="me-2" />
            Back to Plans
          </Button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Plan Details</h1>
          </div>
        </div>
        <div>
          <Button variant="outline" class="ms-2">
            <NuxtLink :to="`/admin/plans/${plan?.id}/edit`" class="text-nowwrap flex items-center">
              <EditIcon class="me-2" /> Edit Plan
            </NuxtLink>
          </Button>
        </div>
      </div>
      <Card class="relative overflow-hidden">
        <CardContent>
          <div class="space-y-4">
            <h2 class="text-xl font-semibold">{{ plan?.name }}</h2>
            <p class="text-gray-600">{{ plan?.description }}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <strong>Duration:</strong> {{ plan?.days }} days
              </div>
              <div>
                <strong>Status: </strong>
                <Badge :variant="plan?.status === 'active' ? 'default' : 'destructive'">
                  {{ plan?.status }}
                </Badge>
              </div>
              <div>
                <strong>Price:</strong> {{ formatCurrency(plan?.price || 0) }}
              </div>
              <div>
                <span v-if="plan?.recurring_price && plan.recurring_price > 0">
                  <strong>Recurring Price:</strong> {{ formatCurrency(plan.recurring_price) }}
                </span>
                <span v-else class="text-gray-500">No recurring price</span>
              </div>
            </div>
            <div>
              <strong>Limits:</strong>
              <ul class="list-disc list-inside">
                <li v-for="item in plan?.limits" :key="item.id">
                  {{ item.name }}: {{ item.value }} ({{ item.key }})
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
        <LoadingCard v-if="pending" />
      </Card>
    </div>
  </NuxtLayout>
</template>
