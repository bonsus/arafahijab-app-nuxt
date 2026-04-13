<script setup lang="ts">
import { toast } from 'vue-sonner'
import 'vue-sonner/style.css'

useHead({
  title: 'Profile',
})
definePageMeta({
  middleware: 'admin',
})
const { data: user } = await useFetch('/api/admin/auth/me', { method: 'POST' })

const pasw = ref({
  password: '',
  newPassword: '',
  newPasswordConfirmation: '',
})
const loadingUpdate = ref(false)
const error = ref('')
const errors = ref({email:[],name:[]})
const updateProfile = async () => {
  loadingUpdate.value = true
  try {
    const res = await $fetch('/api/admin/auth/me', {
      method: 'PUT',
      body: {
        name: user.value.name,
        email: user.value.email
      }
    })
    toast.success('Profile updated successfully')
  } catch (err:any) {
    toast.error('Error updating profile')
    error.value = err?.data?.error
    errors.value = err?.data?.errors || {}
    loadingUpdate.value = false
  } finally {
    loadingUpdate.value = false
  }
}

const loadingPasw = ref(false)
const errorPasw = ref('')
const errorsPasw = ref({password:[],new_password:[],new_password_confirmation:[]})
const updatePasw = async () => {
  loadingPasw.value = true
  try{
    const res = await $fetch('/api/admin/auth/update-password', {
      method: 'PUT',
      body: {
        password: pasw.value.password,
        new_password: pasw.value.newPassword,
        new_password_confirmation: pasw.value.newPasswordConfirmation
      }
    })
    toast.success('Password updated successfully')
    pasw.value = {
      password: '',
      newPassword: '',
      newPasswordConfirmation: ''
    }
  } catch (err:any) {
    toast.error('Error updating password')
    errorPasw.value = err?.data?.error
    errorsPasw.value = err?.data?.errors || {}
  } finally {
    loadingPasw.value = false
  }
}
</script>
<template>
  <NuxtLayout name="admin">
    <div class="space-y-6">
      <Toaster position="top-center" />
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Profile</h1>
          <p class="text-gray-600">Manage your profile settings</p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-6 sm:grid-cols-2">
      <!-- Edit Profile Card -->
        <Card>
          <CardHeader>
            <CardTitle>Update Profile</CardTitle>
            <CardDescription>Update your profile information.</CardDescription>
          </CardHeader>
          <CardContent>
            <form @submit.prevent="updateProfile">
              <div class="grid items-center w-full gap-4 w-[400px]">
                <div class="flex flex-col space-y-1.5">
                  <Label for="name">Name</Label>
                  <Input v-model="user.name" :aria-invalid="errors.name" @input="errors.name=[]" id="name" placeholder="Name" />
                  <p v-if="Array.isArray(errors.name) && errors.name" class="text-xs text-destructive">
                    <span v-for="(msg, index) in errors.name" :key="index">{{ msg }}</span>
                  </p>
                </div>
                <div class="flex flex-col space-y-1.5">
                  <Label for="email">Email</Label>
                  <Input v-model="user.email" :aria-invalid="errors.email" @input="errors.email = []" id="email" type="email" placeholder="Email" />
                  <p v-if="Array.isArray(errors.email) && errors.email" class="text-xs text-destructive">
                    <span v-for="(msg, index) in errors.email" :key="index">{{ msg }}</span>
                  </p>
                </div>
              </div>
              <Button @click="updateProfile" :disabled="loadingUpdate" class="mt-4 w-full relative">
                <Spinner v-if="loadingUpdate" size="medium" class-name="absolute left-2 top-2" />
                <span>Update Profile</span>
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form @submit.prevent="updatePasw">
              <div class="grid items-center w-full gap-4 w-[400px]">
                <div class="flex flex-col space-y-1.5">
                  <Label for="current-password">Current Password</Label>
                  <Input v-model="pasw.password" :aria-invalid="errorsPasw.password" @input="errorsPasw.password=[]" id="current-password" type="password" placeholder="Current Password" />
                  <template v-if="Array.isArray(errorsPasw.password) && errorsPasw.password">
                    <p v-for="msg of errorsPasw.password" class="text-xs text-destructive">{{ msg }}</p>
                  </template>
                </div>
                <div class="flex flex-col space-y-1.5">
                  <Label for="new-password">New Password</Label>
                  <Input v-model="pasw.newPassword" :aria-invalid="errorsPasw.new_password" @input="errorsPasw.new_password=[]" id="new-password" type="password" placeholder="New Password" />
                  <template v-if="Array.isArray(errorsPasw.new_password) && errorsPasw.new_password">
                    <p v-for="msg of errorsPasw.new_password" class="text-xs text-destructive">{{ msg }}</p>
                  </template>
                </div>
                <div class="flex flex-col space-y-1.5">
                  <Label for="confirm-password">Confirm Password</Label>
                  <Input v-model="pasw.newPasswordConfirmation" :aria-invalid="errorsPasw.new_password_confirmation" @input="errorsPasw.new_password_confirmation=[]" id="confirm-password" type="password" placeholder="Confirm Password" />
                  <template v-if="Array.isArray(errorsPasw.new_password_confirmation) && errorsPasw.new_password_confirmation">
                    <p v-for="msg of errorsPasw.new_password_confirmation" class="text-xs text-destructive">{{ msg }}</p>
                  </template>
                </div>
              </div>
              <Button :disabled="loadingPasw" class="mt-4 w-full relative">
                <Spinner v-if="loadingPasw" size="medium" class-name="absolute left-2 top-2" />
                <span>Update Password</span>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  </NuxtLayout>
</template>
