<script setup lang="ts">
import { formatCurrency } from '@/utils/formatCurrency'
import { ArrowLeft, EditIcon } from 'lucide-vue-next'

import { formatDate } from '@/utils/formatDate'

definePageMeta({
  middleware: 'admin',
})
interface Promotion {
  id: string
  coupon: string
  name: string
  description: string
  type: 'first' | 'both' | 'recurring'
  discount_type: 'fixed' | 'percentage'
  value: number
  start_date: string
  end_date: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
  items: Array<{
    plan_id: string
    limit: number
    plan?: {
      id: string
      name: string
    }
  }>
}

const route = useRoute()

const { data: promotion, pending, error } = await useFetch<Promotion>('/api/admin/promotions/' + route.params.id, {
  method: 'GET'
})

// Handle error or redirect if plan not found
if (error.value && !pending.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Promotion not found'
  })
}


useHead({
  title: 'Promotion Details' + (promotion.value ? ` - ${promotion.value.name}` : ''),
})
</script>
<template>
  <NuxtLayout name="admin">
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-top justify-between">
        <div class="flex-1">
          <Button variant="outline" class="mb-4" @click="navigateTo('/admin/promotions')">
            <ArrowLeft class="me-2" />
            Back to Promotions
          </Button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Promotion Details</h1>
          </div>
        </div>
        <div>
          <Button variant="outline" class="ms-2">
            <NuxtLink :to="`/admin/promotions/${promotion?.id}/edit`" class="text-nowwrap flex items-center">
              <EditIcon class="me-2" /> Edit Promotion
            </NuxtLink>
          </Button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Basic Information Card -->
          <Card>
            <CardHeader>
              <div class="flex items-center space-x-2">
                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span class="text-blue-600 font-semibold text-sm">P</span>
                </div>
                <div>
                  <h2 class="text-xl font-semibold text-gray-900">{{ promotion?.name }}</h2>
                </div>
              </div>
            </CardHeader>
            <CardContent class="space-y-4">
              <p class="text-sm text-gray-700 leading-relaxed">{{ promotion?.description }}</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Coupon Code</p>
                  <div class="flex items-center space-x-2">
                    <Badge variant="outline" class="font-mono">{{ promotion?.coupon }}</Badge>
                  </div>
                </div>
                <div class="space-y-1">
                  <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</p>
                  <div class="flex items-center space-x-2">
                    <Badge :variant="promotion?.status === 'active' ? 'default' : 'destructive'" class="capitalize">
                      {{ promotion?.status }}
                    </Badge>
                  </div>
                </div>
                <div class="space-y-1">
                  <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</p>
                  <div class="flex items-center space-x-2">
                    <Badge :variant="promotion?.type === 'first' ? 'default' : promotion?.type === 'both' ? 'secondary' : 'outline'" class="capitalize">
                      {{ promotion?.type }}
                    </Badge>
                  </div>
                </div>
                <div class="space-y-1">
                  <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Discount Type</p>
                  <div class="flex items-center space-x-2">
                    <Badge :variant="promotion?.discount_type === 'percentage' ? 'default' : 'secondary'" class="capitalize">
                      {{ promotion?.discount_type }}
                    </Badge>
                  </div>
                </div>
                <div class="space-y-1">
                  <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Date</p>
                  <div class="flex items-center space-x-2 text-sm text-gray-900">
                    {{ promotion?.start_date ? formatDate(promotion.start_date) : 'Not Set' }}
                  </div>
                </div>
                <div class="space-y-1">
                  <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">End Date</p>
                  <div class="flex items-center space-x-2 text-sm text-gray-900">
                    {{ promotion?.end_date ? formatDate(promotion.end_date) : 'Not Set' }}
                  </div>
                </div>
              </div>
              <div class="text-center pt-6">
                <p class="text-sm font-medium text-gray-600 mb-2">Discount Value</p>
                <div class="text-3xl font-bold text-green-600">
                  {{ promotion?.discount_type === 'percentage' ? `${promotion?.value}%` : formatCurrency(promotion?.value || 0) }}
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Promotion Items Card -->
          <Card v-if="promotion?.items && promotion.items.length > 0">
            <CardHeader>
              <h3 class="text-lg font-semibold text-gray-900">Applicable Plans</h3>
            </CardHeader>
            <CardContent>
              <div class="space-y-3">
                <div v-for="item in promotion.items" :key="item.plan_id" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span class="text-green-600 font-semibold text-sm">{{ item.plan?.name?.charAt(0) || 'P' }}</span>
                </div>
                <div>
                  <p class="font-medium text-gray-900">{{ item.plan?.name || 'Unknown Plan' }}</p>
                  <p class="text-xs text-gray-500">Plan ID: {{ item.plan_id }}</p>
                </div>
              </div>
              <Badge variant="secondary">Limit: {{ item.limit }}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <LoadingCard v-if="pending" class="lg:col-span-3" />
      </div>
    </div>
  </NuxtLayout>
</template>
