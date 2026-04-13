<script setup lang="ts">
import { toast } from 'vue-sonner'

const props = defineProps<{
  user: { id: string, name: string, open: boolean }
}>()

const pasw = reactive({
  password: '',
  password_confirm: ''
})
const errorPasw = reactive({
  password: [],
  password_confirm: []
})
const loading = ref(false)
const updatePasw = async () => {
  loading.value = true
  try {
    await $fetch('/api/admin/users/' + props.user.id + '/password', {
      method: 'PUT',
      body: {
        password: pasw.password,
        password_confirm: pasw.password_confirm,
      }
    })
    toast.success('Password updated successfully')
    pasw.password = ''
    pasw.password_confirm = ''
    props.user.open = false
  } catch (err:any) {
    toast.error('Error updating password')
    errorPasw.password = err?.data?.errors?.password || []
    errorPasw.password_confirm = err?.data?.errors?.password_confirm || []
  } finally {
    loading.value = false
  }
}
</script>
<template>
  <Dialog v-model:open="user.open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Change Password</DialogTitle>
        <DialogDescription>
          Update the password for user "{{ props.user.name }}".
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-4">
        <div class="flex flex-col space-y-1.5">
          <Label for="name">Password</Label>
          <Input v-model="pasw.password" :aria-invalid="errorPasw.password?.length >0 " @input="errorPasw.password=[]" id="name" placeholder="New Password" />
          <p v-if="Array.isArray(errorPasw.password) && errorPasw.password" class="text-xs text-destructive">
            <span v-for="(msg, index) in errorPasw.password" :key="index">{{ msg }}</span>
          </p>
        </div>
        <div class="flex flex-col space-y-1.5">
          <Label for="email">Confirm Password</Label>
          <Input v-model="pasw.password_confirm" :aria-invalid="errorPasw.password_confirm?.length >0 " @input="errorPasw.password_confirm=[]" id="email" type="email" placeholder="New Password Confirmation" />
          <p v-if="Array.isArray(errorPasw.password_confirm) && errorPasw.password_confirm" class="text-xs text-destructive">
            <span v-for="(msg, index) in errorPasw.password_confirm" :key="index">{{ msg }}</span>
          </p>
        </div>
      </div>
      <DialogFooter class="justify-end">
        <DialogClose as-child>
          <Button type="button" variant="secondary">
            Close
          </Button>
        </DialogClose>
        <Button @click="updatePasw()" :disabled="loading" type="submit" class="ms-2">
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
