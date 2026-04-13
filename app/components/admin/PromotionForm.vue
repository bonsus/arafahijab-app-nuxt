<script setup lang="ts">

import { toast } from 'vue-sonner'
import { Search, Star, Trash } from 'lucide-vue-next'
import { formatDateToISOString, formatForDatetimeLocal, formatToAsiaJakarta } from '@/utils/formatDate'

const props = withDefaults(defineProps<{
  promotion?: any
}>(), {
  promotion: null,
})

const form = ref({
  id: props.promotion?.id || '',
  coupon: props.promotion?.coupon || '',
  name: props.promotion?.name || '',
  description: props.promotion?.description || '',
  type: props.promotion?.type || 'both',
  discount_type: props.promotion?.discount_type || 'fixed',
  value: props.promotion?.value || 0,
  value_fixed: props.promotion?.value && props.promotion?.discount_type === 'fixed' ? props.promotion?.value : 0,
  value_percentage: props.promotion?.value && props.promotion?.discount_type === 'percentage' ? props.promotion?.value : 0,
  start_date: props.promotion?.start_date ? formatForDatetimeLocal(props.promotion.start_date) : new Date().toISOString().slice(0, 16),
  end_date: props.promotion?.end_date ? formatForDatetimeLocal(props.promotion.end_date) : new Date().toISOString().slice(0, 16),
  status: props.promotion?.status || 'active',
  items: props.promotion?.items || [{
    plan_id: '',
    limit: 0,
  }],
})

const loading = ref(false)
const error = ref('')
const errors = ref({} as any)
const createPromotion = async () => {
  loading.value = true
  try {
    if(form.value.discount_type === 'fixed') {
      form.value.value = form.value.value_fixed
    } else if(form.value.discount_type === 'percentage') {
      form.value.value = form.value.value_percentage
    }
    form.value.value = parseFloat(form.value.value.toString())
    const myForm = {
      ...form.value,
      start_date: formatToAsiaJakarta(form.value.start_date),
      end_date: formatToAsiaJakarta(form.value.end_date),
    }
    if (form.value.id) {
      const res = await $fetch(`/api/admin/promotions/${form.value.id}`, {
        method: 'PUT',
        body: myForm
      })
      toast.success('Promotion updated successfully')
      navigateTo('/admin/promotions/' + form.value.id)
    } else {
      const res = await $fetch('/api/admin/promotions/create', {
        method: 'POST',
        body: myForm
      })
      toast.success('Promotion created successfully')
      navigateTo('/admin/promotions')
    }
  } catch (err:any) {
    error.value = err?.data?.error
    if (error.value){
      toast.error(error.value)
    } else {
      toast.error('Error creating promotion')
    }
    errors.value = err?.data?.errors || {}
  } finally {
    loading.value = false
  }
}

const { data: plans, refresh, pending } = await useFetch('/api/admin/plans', { method: 'GET', params: {perpage:1000} })
</script>
<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div class="flex flex-col space-y-1.5 mb-4">
            <Label for="name">Start Date</Label>
            <Input v-model="form.start_date" type="datetime-local" placeholder="Enter start date"/>
            <p v-if="errors.start_date" class="text-red-500 text-xs">{{ errors.start_date[0] }}</p>
          </div>
          <div class="flex flex-col space-y-1.5 mb-4">
            <Label for="name">End Date</Label>
            <Input v-model="form.end_date" type="datetime-local" placeholder="Enter end date"/>
            <p v-if="errors.end_date" class="text-red-500 text-xs">{{ errors.end_date[0] }}</p>
          </div>
        </div>
        <div class="flex flex-col space-y-1.5 mb-4">
          <Label for="name">Coupon</Label>
          <Input v-model="form.coupon" :aria-invalid="errors?.coupon?.length > 0" @input="errors.coupon=[]" type="text" placeholder="Enter coupon code" />
          <p v-if="errors.coupon" class="text-red-500 text-xs">{{ errors.coupon[0] }}</p>
        </div>

        <div class="flex flex-col space-y-1.5 mb-4">
          <Label for="name">Name</Label>
          <Input v-model="form.name" :aria-invalid="errors?.name?.length > 0" @input="errors.name=[]" type="text" placeholder="Enter promotion name" />
          <p v-if="errors.name" class="text-red-500 text-xs">{{ errors.name[0] }}</p>
        </div>
        <div class="flex flex-col space-y-1.5">
          <Label for="description">Description</Label>
          <Textarea v-model="form.description" placeholder="Enter promotion description" rows="3"></Textarea>
        </div>
      </div>
      <div class="grid gap-4 items-start w-full">
        <div class="flex flex-col space-y-1.5">
          <Label for="price">Type</Label>
          <Select v-model="form.type" id="type">
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="first">First</SelectItem>
              <SelectItem value="recurring">Recurring</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex flex-col space-y-1.5">
          <Label for="price">Discount Type</Label>
          <Select v-model="form.discount_type" id="discount_type">
            <SelectTrigger>
              <SelectValue placeholder="Select discount type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="fixed">Fixed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex flex-col space-y-1.5">
          <Label for="price">Discount Value</Label>
          <div v-if="form.discount_type=='fixed'" class="relative w-[160px] max-w-sm items-center">
            <Input v-model="form.value_fixed" id="value_fixed" type="number" placeholder="" class="pl-7" />
            <span class="absolute start-0 inset-y-0 flex items-center justify-center px-2 text-gray-500 text-xs">
              Rp
            </span>
          </div>
          <div v-else-if="form.discount_type=='percentage'" class="relative w-[160px] max-w-sm items-center">
            <Input v-model="form.value_percentage" max="100" min="0" id="value_percentage" type="number" placeholder="" class="pe-7" />
            <span class="absolute end-0 inset-y-0 flex items-center justify-center px-2 text-gray-500 text-xs">
              %
            </span>
          </div>
          <p v-if="errors.value" class="text-red-500 text-xs">{{ errors.value[0] }}</p>
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
        </div>
      </div>
    </div>

    <!-- Limits Section -->
    <h3 class="text-lg font-semibold mt-6">Plans</h3>
    <p v-if="errors.items" class="text-red-500 text-xs">{{ errors.items[0] }}</p>
    <div v-for="(item, index) in form.items" :key="'item-' + index" class="space-y-4">
      <div class="flex flex-col md:flex-row space-y-1.5 items-start md:space-y-0 md:space-x-4">
        <div class="flex flex-col space-y-1.5 w-full md:w-[300px]">
          <Label for="plan">Plan</Label>
          <Select v-model="item.plan_id" id="plan" class="w-full">
            <SelectTrigger>
              <SelectValue :placeholder="item.plan_id ? plans.data.find((p: any) => p.id === item.plan_id)?.name : 'Select plan'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="plan in plans.data" :key="plan.id" :value="plan.id">{{ plan.name }}</SelectItem>
            </SelectContent>
          </Select>
          <p v-if="errors['items.' + index + '.plan_id']" class="text-red-500 text-xs">{{ errors['items.' + index + '.plan_id'][0] }}</p>
        </div>
        <div class="flex flex-col space-y-1.5 w-full md:w-[160px]">
          <Label for="limit">Limit</Label>
          <Input :aria-invalid="!!errors['items.' + index + '.limit']" @input="errors['items.' + index + '.limit'] = []" v-model.number="item.limit" type="number" placeholder="Enter limit" />
          <p v-if="errors['items.' + index + '.limit']" class="text-red-500 text-xs">{{ errors['items.' + index + '.limit'][0] }}</p>
        </div>
        <div>
          <Button @click="form.items.splice(index, 1)" variant="destructive" class="self-end mt-5">
            <Trash class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
    <Button @click="form.items.push({ plan_id: '', limit: 0 })" variant="outline" class="mt-2">
      Add Plan
    </Button>
    <Button @click="createPromotion" type="submit" :disabled="loading" class="mt-6 w-full">
      <Spinner v-if="loading" size="medium" class-name="absolute left-2 top-2" />
      <span v-if="!form.id">Create Promotion</span>
      <span v-else>Save Changes</span>
    </Button>
    <p v-if="error" class="text-red-500 text-sm mt-2">{{ error }}</p>
  </div>
</template>
