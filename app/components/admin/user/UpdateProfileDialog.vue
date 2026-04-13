<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Loader2 } from 'lucide-vue-next'
const props = defineProps<{
  user: {
    open: boolean,
    id: string,
    name: string,
    phone: string,
    email: string,
    company: string,
    status: string,
  }
}>()
const emit = defineEmits(['refresh'])
const errors = reactive({
  name: [],
  phone: [],
  email: [],
  company: [],
  status: []
})
const loading = ref(false)
const updateProfile = async () => {
  loading.value = true
  try {
    await $fetch('/api/admin/users/' + props.user.id, {
      method: 'PUT',
      body: {
        name: props.user.name,
        phone: props.user.phone,
        email: props.user.email,
        company: props.user.company,
        status: props.user.status,
      }
    })
    props.user.open = false
    toast.success('User updated successfully')
    emit('refresh')
  } catch (err:any) {
    toast.error('Error updating user')
    errors.name = err?.data?.errors?.name || []
    errors.phone = err?.data?.errors?.phone || []
    errors.email = err?.data?.errors?.email || []
    errors.company = err?.data?.errors?.company || []
    errors.status = err?.data?.errors?.status || []
  } finally {
    loading.value = false
  }
}
</script>
<template>
  <Dialog v-model:open="user.open" class="relative">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Update Profile</DialogTitle>
        <DialogDescription>
          Update your profile information.
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-4">
        <div class="flex flex-col space-y-1.5">
          <Label for="company">Company</Label>
          <Input v-model="user.company" :aria-invalid="errors.company?.length > 0" @input="errors.company = []" id="company" placeholder="Company" />
          <p v-if="Array.isArray(errors.company) && errors.company" class="text-xs text-destructive">
            <span v-for="(msg, index) in errors.company" :key="index">{{ msg }}</span>
          </p>
        </div>
        <div class="flex flex-col space-y-1.5">
          <Label for="name">Name</Label>
          <Input v-model="user.name" :aria-invalid="errors.name?.length > 0" @input="errors.name = []" id="name" placeholder="Name" />
          <p v-if="Array.isArray(errors.name) && errors.name" class="text-xs text-destructive">
            <span v-for="(msg, index) in errors.name" :key="index">{{ msg }}</span>
          </p>
        </div>
        <div class="flex flex-col space-y-1.5">
          <Label for="phone">Phone</Label>
          <Input v-model="user.phone" :aria-invalid="errors.phone?.length > 0" @input="errors.phone = []" id="phone" placeholder="Phone" />
          <p v-if="Array.isArray(errors.phone) && errors.phone" class="text-xs text-destructive">
            <span v-for="(msg, index) in errors.phone" :key="index">{{ msg }}</span>
          </p>
        </div>
        <div class="flex flex-col space-y-1.5">
          <Label for="email">Email</Label>
          <Input v-model="user.email" :aria-invalid="errors.email?.length > 0" @input="errors.email = []" id="email" type="email" placeholder="Email" />
          <p v-if="Array.isArray(errors.email) && errors.email" class="text-xs text-destructive">
            <span v-for="(msg, index) in errors.email" :key="index">{{ msg }}</span>
          </p>
        </div>
        <div class="flex flex-col space-y-1.5">
          <Label for="status">Status</Label>
          <Select v-model="user.status" id="status">
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
      <DialogFooter>
        <Button variant="default" :disabled="loading" @click="updateProfile">
          <Loader2 class="h-6 w-6 animate-spin text-gray-500" v-if="loading" />
          Update Profile</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
