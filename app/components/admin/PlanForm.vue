<script setup lang="ts">

import { toast } from 'vue-sonner'
import { Trash } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  plan?: any
}>(), {
  plan: null,
})

const form = ref({
  id: props.plan?.id || '',
  name: props.plan?.name || '',
  slug: props.plan?.slug || '',
  description: props.plan?.description || '',
  price: props.plan?.price || 0,
  recurring_price: props.plan?.recurring_price || 0,
  recurring: props.plan?.recurring || true,
  status: props.plan?.status || 'active',
  days: props.plan?.days || 30,
  limits: props.plan?.limits || [
    { id: 0, name: '', key: '', value: 0 }
  ],
})

const loading = ref(false)
const error = ref('')
const errors = ref({} as any)
const createPlan = async () => {
  loading.value = true
  try {
    form.value.price = parseFloat(form.value.price.toString())
    form.value.recurring_price = parseFloat(form.value.recurring_price.toString())
    form.value.days = parseInt(form.value.days.toString())
    form.value.limits = form.value.limits.map((limit: any) => ({
      name: limit.name.trim(),
      key: limit.key.trim(),
      value: parseFloat(limit.value.toString())
    }))
    if (form.value.id) {
      const res = await $fetch(`/api/admin/plans/${form.value.id}`, {
        method: 'PUT',
        body: form.value
      })
      toast.success('Plan updated successfully')
      navigateTo('/admin/plans/' + form.value.id)
    } else {
      const res = await $fetch('/api/admin/plans/create', {
        method: 'POST',
        body: form.value
      })
      toast.success('Plan created successfully')
      navigateTo('/admin/plans')
    }
  } catch (err:any) {
    toast.error('Error creating plan')
    error.value = err?.data?.error
    errors.value = err?.data?.errors || {}
  } finally {
    loading.value = false
  }
}
</script>
<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div>
        <div class="flex flex-col space-y-1.5 mb-4">
          <Label for="name">Plan Name</Label>
          <Input v-model="form.name" :aria-invalid="errors?.name?.length > 0" @input="errors.name=[]" type="text" placeholder="Enter plan name" />
          <p v-if="errors.name" class="text-red-500 text-xs">{{ errors.name[0] }}</p>
        </div>
        <div class="flex flex-col space-y-1.5 mb-4">
          <Label for="slug">Plan Slug</Label>
          <Input v-model="form.slug" type="text" placeholder="Enter plan slug" />
        </div>
        <div class="flex flex-col space-y-1.5">
          <Label for="description">Description</Label>
          <Textarea v-model="form.description" placeholder="Enter plan description" rows="3"></Textarea>
        </div>
      </div>
      <div class="grid gap-4 items-start w-full">
        <div class="flex flex-col space-y-1.5">
          <Label for="price">Price</Label>
          <Input v-model.number="form.price" :aria-invalid="errors?.price?.length > 0" @input="errors.price=[]" type="number" placeholder="Enter price" />
          <p v-if="errors.price" class="text-red-500 text-xs">{{ errors.price[0] }}</p>
        </div>
        <div class="flex flex-col space-y-1.5">
          <Label for="recurring_price">Recurring Price</Label>
          <Input v-model.number="form.recurring_price" :aria-invalid="errors?.recurring_price?.length > 0" @input="errors.recurring_price=[]" type="number" placeholder="Enter recurring price" />
          <p v-if="errors.recurring_price" class="text-red-500 text-xs">{{ errors.recurring_price[0] }}</p>
        </div>
        <div class="flex flex-col space-y-1.5">
          <Label for="days">Duration (days)</Label>
          <Input v-model.number="form.days" :aria-invalid="errors?.days?.length > 0" @input="errors.days=[]" type="number" placeholder="Enter duration in days" />
          <p v-if="errors.days" class="text-red-500 text-xs">{{ errors.days[0] }}</p>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col space-y-1.5">
            <Label for="status">Status</Label>
            <Select v-model="form.status" id="status">
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex flex-col space-y-1.5">
            <Label for="recurring">Recurring</Label>
            <Switch v-model="form.recurring" id="recurring" />
          </div>
        </div>
      </div>
    </div>

    <!-- Limits Section -->
    <h3 class="text-lg font-semibold mt-6">Limits</h3>
    <div v-for="(limit, index) in form.limits" :key="'limit-' + index" class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div class="flex flex-col space-y-1.5">
          <Input v-model="limit.name" :aria-invalid="errors['limits.' + index + '.name']?.length > 0" type="text" placeholder="Limit Name"  />
          <p v-if="errors['limits.' + index + '.name']" class="text-red-500 text-xs">{{ errors['limits.' + index + '.name'][0] }}</p>
        </div>
        <div class="flex flex-col space-y-1.5">
          <Input v-model="limit.key" :aria-invalid="errors['limits.' + index + '.key']?.length > 0" type="text" placeholder="Limit Key"  />
          <p v-if="errors['limits.' + index + '.key']" class="text-red-500 text-xs">{{ errors['limits.' + index + '.key'][0] }}</p>
        </div>
        <div class="flex flex-col space-y-1.5">
          <Input v-model.number="limit.value" :aria-invalid="errors['limits.' + index + '.value']?.length > 0" type="number" placeholder="Limit Value"  />
          <p v-if="errors['limits.' + index + '.value']" class="text-red-500 text-xs">{{ errors['limits.' + index + '.value'][0] }}</p>
        </div>
        <Button class="w-8 h-8" @click="form.limits.splice(index, 1)" variant="destructive"><Trash /></Button>
      </div>
    </div>
    <Button @click="form.limits.push({ name: '', key: '', value: 0 })" variant="outline" class="mt-2">
      Add Limit
    </Button>
    <Button @click="createPlan" type="submit" :disabled="loading" class="mt-6 w-full">
      <Spinner v-if="loading" size="medium" class-name="absolute left-2 top-2" />
      <span v-if="!form.id">Create Plan</span>
      <span v-else>Save Changes</span>
    </Button>
    <p v-if="error" class="text-red-500 text-sm mt-2">{{ error }}</p>
  </div>
</template>
