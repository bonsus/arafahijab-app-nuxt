
<script setup lang="ts">
import { Filter, EllipsisVertical } from 'lucide-vue-next'
import { formatDate } from '@/utils/formatDate'
import { toast } from 'vue-sonner'

definePageMeta({
  middleware: 'admin'
})
useHead({
  title: 'Users Management - Admin',
})

const query = ref({
  page:1,
  perpage: 10,
  search: '',
  status: 'all',
})
const { data: users, pending, error, refresh } = await useFetch('/api/admin/users', {
  method: 'GET', params: query.value
})

const openDeleteDialog = ref(false)
const deleteItem = ref({} as any)
const deleteUser = async (id: string) => {
  try {
    await $fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    toast.success('User deleted successfully')
    openDeleteDialog.value = false
    refresh()
  } catch (err:any) {
    toast.error('Error deleting user')
  }
}

const pasw = ref({
  id: '',
  name:'',
  open: false,
})
</script>
<template>
  <NuxtLayout name="admin">
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Users Management</h1>
          <p class="text-gray-600">Manage user accounts and permissions</p>
        </div>
      </div>

      <AdminWidgetUser />

      <!-- Users Table -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <div class="flex flex-col md:flex-row items-start justify-start md:justify-between">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4 md:mb-0">All Users</h3>
            <div class="flex items-center space-x-3 mb-4 md:mb-0">
              <input type="text" v-model="query.search" placeholder="Search users..."
                class="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button @click="refresh()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm">
                <Filter class="w-4 h-4" />
              </button>
            </div>
          </div>
          <div class="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead class="text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="user in users.data" :key="user.id">
                  <TableCell @click="navigateTo(`/admin/users/${user.id}`)" class="cursor-pointer hover:underline">{{ user.name }}</TableCell>
                  <TableCell @click="navigateTo(`/admin/users/${user.id}`)" class="cursor-pointer hover:underline">{{ user.email }}</TableCell>
                  <TableCell>
                    <Badge :variant="user.status=='active' ? 'default' : 'destructive'" size="sm">
                      {{ user.status == 'active' ? 'Active' : 'Inactive' }}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <template v-for="item in user.subscriptions" :key="item.id">
                      {{ item.plan.name }}
                    </template>
                    <span v-if="user.subscriptions?.length === 0">No Subscription</span>
                  </TableCell>
                  <TableCell>
                    <template v-for="item in user.subscriptions" :key="item.id">
                      <div class="text-xs mt-2">{{ formatDate(item.start_date) }} - {{ formatDate(item.end_date) }}</div>
                    </template>
                    <span v-if="user.subscriptions?.length === 0">No Subscription</span>
                  </TableCell>
                  <TableCell class="text-end">
                    <ClientOnly>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="icon">
                            <EllipsisVertical class="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuGroup>
                            <DropdownMenuItem @click="navigateTo(`/admin/users/${user.id}`)">View</DropdownMenuItem>
                            <DropdownMenuItem @click="pasw={ id: user.id, name: user.name, open: true }">Change Password</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem @click="openDeleteDialog=true;deleteItem=user" class="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </ClientOnly>
                  </TableCell>
                </TableRow>
                <TableRow v-if="!users.data.length">
                  <TableCell colspan="5" class="text-center text-gray-500">No users found</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <MyPagination :data="users" :pending="pending" :query="query" @page-change="refresh" />
            <LoadingCard v-if="pending" />
          </div>
        </div>
      </div>
    </div>
    <AlertDialog v-model:open="openDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete User "{{deleteItem?.name}}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this user? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" @click="deleteUser(deleteItem.id)">Delete</AlertDialogAction> </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AdminUserChangePasswordForm :user="pasw" />

  </NuxtLayout>
</template>
