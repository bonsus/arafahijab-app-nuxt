<script setup lang="ts">
useHead({
  title: 'Edit Plan',
})
definePageMeta({
  middleware: 'admin',
})
import { ArrowLeft } from 'lucide-vue-next'
const route = useRoute()
const { data: plan } = await useFetch(`/api/admin/plans/${route.params.id}`, {
  method: 'GET',
})
</script>
<template>
  <NuxtLayout name="admin">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <Button variant="outline" class="mb-4" @click="navigateTo('/admin/plans')">
            <ArrowLeft class="me-2" />
            Back to Plans
          </Button>
          <h1 class="text-2xl font-bold text-gray-900">Edit Plan</h1>
        </div>
      </div>
      <Card>
        <CardContent>
          <AdminPlanForm :plan="plan"/>
        </CardContent>
      </Card>
    </div>
  </NuxtLayout>
</template>
