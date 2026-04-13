<script setup lang="ts">
useHead({
  title: 'Edit Promotion',
})
definePageMeta({
  middleware: 'admin',
})
import { ArrowLeft } from 'lucide-vue-next'
const route = useRoute()
const { data: promotion } = await useFetch(`/api/admin/promotions/${route.params.id}`, {
  method: 'GET',
})
</script>
<template>
  <NuxtLayout name="admin">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <Button variant="outline" class="mb-4" @click="navigateTo('/admin/promotions')">
            <ArrowLeft class="me-2" />
            Back to Promotions
          </Button>
          <h1 class="text-2xl font-bold text-gray-900">Edit Promotion</h1>
        </div>
      </div>
      <Card>
        <CardContent>
          <AdminPromotionForm :promotion="promotion" />
        </CardContent>
      </Card>
    </div>
  </NuxtLayout>
</template>
