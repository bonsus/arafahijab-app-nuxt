<script setup lang="ts">
import { get } from '@vueuse/core';
import { EllipsisVertical } from 'lucide-vue-next';
import { toast } from 'vue-sonner'
useHead({
  title: 'Profile',
})
definePageMeta({
  middleware: 'admin',
})

const { data: data } = await useFetch('/api/admin/admins', { method: 'GET', params:{perpage:50} })
// const data = ref({} as any)
const getData = async () => {
  try {
    const res = await $fetch('/api/admin/admins', { method: 'GET', params:{perpage:50} })
    data.value = res
  } catch (err) {
    toast.error('Error fetching admins')
  }
}

const dialogOpen = ref(false)
const loadingEdit = ref(false)
const errorEdit = ref({name:[],email:[],status:[]})
const edit = ref({
  id:'',
  name: '',
  email: '',
  status: '',
  role_id: ''
})
const editBtn = (item: any) => {
  dialogOpen.value = true
  edit.value = { ...item }
}
const editSave = async () => {
  try {
    loadingEdit.value = true
    errorEdit.value = { name: [], email: [], status: [] }
    await $fetch(`/api/admin/admins/${edit.value.id}`, {
      method: 'PUT',
      body: edit.value
    })
    toast.success('Admin updated successfully')
    getData()
    dialogOpen.value = false
  } catch (err: any) {
    toast.error('Error updating admin')
    errorEdit.value = err?.data?.errors || {}
  } finally {
    loadingEdit.value = false
  }
}

const pasw = ref({
  password: '',
  password_confirmation: '',
})
const dialogPaswOpen = ref(false)
const editPaswBtn = (item: any) => {
  dialogPaswOpen.value = true
  edit.value = { ...item }
  pasw.value = {
    password: '',
    password_confirmation: ''
  }
}
const loadingPasw = ref(false)
const errorPasw = ref({password:[],password_confirmation:[]})
const updatePasw = async () => {
  loadingPasw.value = true
  try {
    const res = await $fetch(`/api/admin/admins/${edit.value.id}/password`, {
      method: 'PUT',
      body: {
        password: pasw.value.password,
        password_confirmation: pasw.value.password_confirmation
      }
    })
    toast.success('Password updated successfully')
    pasw.value = {
      password: '',
      password_confirmation: ''
    }
  } catch (err:any) {
    toast.error('Error updating password')
    errorPasw.value = err?.data?.errors || {}
  } finally {
    loadingPasw.value = false
  }
}

</script>
<template>
  <NuxtLayout name="admin">
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Admin Management</h1>
          <p class="text-gray-600">Manage admin accounts</p>
        </div>
      </div>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead width="1%"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-for="item in data.data" :key="item.id">
                <TableRow>
                  <TableCell class="font-medium">
                    {{ item.name }}
                  </TableCell>
                  <TableCell>{{ item.email }}</TableCell>
                  <TableCell>{{ item.role?.name }}</TableCell>
                  <TableCell>
                    <Badge :variant="item.status == 'active' ? 'default' : 'destructive'">
                      {{ item.status == 'active' ? 'Active' : 'Inactive' }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" size="icon">
                          <EllipsisVertical class="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuGroup>
                          <DropdownMenuItem @click="editBtn(item)">Edit</DropdownMenuItem>
                          <DropdownMenuItem @click="editPaswBtn(item)">Change Password</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Delete</DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>

        </CardContent>
      </Card>
    </div>
    <Dialog v-model:open="dialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Admin</DialogTitle>
          <DialogDescription>
            Update the admin account details.
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="editSave">
          <div class="grid gap-4">
            <div class="flex flex-col space-y-1.5">
              <Label for="name">Name</Label>
              <Input v-model="edit.name" :aria-invalid="errorEdit.name" @input="errorEdit.name=[]" id="name" placeholder="Admin Name" />
              <p v-if="Array.isArray(errorEdit.name) && errorEdit.name" class="text-xs text-destructive">
                <span v-for="(msg, index) in errorEdit.name" :key="index">{{ msg }}</span>
              </p>
            </div>
            <div class="flex flex-col space-y-1.5">
              <Label for="email">Email</Label>
              <Input v-model="edit.email" :aria-invalid="errorEdit.email" @input="errorEdit.email=[]" id="email" type="email" placeholder="Admin Email" />
              <p v-if="Array.isArray(errorEdit.email) && errorEdit.email" class="text-xs text-destructive">
                <span v-for="(msg, index) in errorEdit.email" :key="index">{{ msg }}</span>
              </p>
            </div>
            <div class="flex flex-col space-y-1.5">
              <Label for="status">Status</Label>
              <Select v-model="edit.status" id="status">
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
        </form>
        <DialogFooter class="justify-end">
          <DialogClose as-child>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
          <Button @click="editSave" type="submit" class="ms-2">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="dialogPaswOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Update the admin account password.
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="updatePasw">
          <div class="grid gap-4">
            <div class="flex flex-col space-y-1.5">
              <Label for="name">Password</Label>
              <Input v-model="pasw.password" :aria-invalid="errorPasw.password" @input="errorPasw.password=[]" id="name" placeholder="New Password" />
              <p v-if="Array.isArray(errorPasw.password) && errorPasw.password" class="text-xs text-destructive">
                <span v-for="(msg, index) in errorPasw.password" :key="index">{{ msg }}</span>
              </p>
            </div>
            <div class="flex flex-col space-y-1.5">
              <Label for="email">Confirm Password</Label>
              <Input v-model="pasw.password_confirmation" :aria-invalid="errorPasw.password_confirmation" @input="errorPasw.password_confirmation=[]" id="email" type="email" placeholder="New Password Confirmation" />
              <p v-if="Array.isArray(errorPasw.password_confirmation) && errorPasw.password_confirmation" class="text-xs text-destructive">
                <span v-for="(msg, index) in errorPasw.password_confirmation" :key="index">{{ msg }}</span>
              </p>
            </div>
          </div>
        </form>
        <DialogFooter class="justify-end">
          <DialogClose as-child>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
          <Button @click="updatePasw" type="submit" class="ms-2">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </NuxtLayout>
</template>
