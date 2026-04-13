<script setup lang="ts">
useHead({
  title: 'Plans',
})
definePageMeta({
  middleware: 'admin',
})
import { RefreshCcw, Plus, Loader2,EllipsisVertical } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { formatCurrency } from '~/utils/formatCurrency'
const query = ref({
  page:1,
  perpage: 10,
  search: '',
})
const { data: plans, refresh, pending } = await useFetch('/api/admin/plans', { method: 'GET', params: query.value })
const deletePlan = async (id: string) => {
  try {
    await $fetch(`/api/admin/plans/${id}`, { method: 'DELETE' })
    toast.success('Plan deleted successfully')
    refresh()
  } catch (err:any) {
    toast.error('Error deleting plan')
  }
}
const deleteId = ref('')
const openDeleteDialog = ref(false)
const confirmDelete = (id: string) => {
  deleteId.value = id
  openDeleteDialog.value = true
}

</script>
<template>
  <NuxtLayout name="admin">

    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row items-start justify-start md:justify-between">
        <div class="mb-4 md:mb-0">
          <h1 class="text-2xl font-bold text-gray-900">Plans</h1>
          <p class="text-gray-600">Manage your subscription plans</p>
        </div>
        <div>
          <Button @click="refresh" variant="outline">
            <RefreshCcw/>
          </Button>
          <Button variant="default" class="ms-2">
            <NuxtLink to="/admin/plans/create" variant="default" class="text-nowwrap flex items-center">
              <Plus/> Create Plan
            </NuxtLink>
          </Button>
        </div>
      </div>
      <Card class="relative overflow-hidden">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Recurring Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead class="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in plans.data" :key="item.id">
                <TableCell @click="navigateTo(`/admin/plans/${item.id}`)" class="cursor-pointer">{{ item.name }}</TableCell>
                <TableCell class="truncate max-w-xs">{{ item.description }}</TableCell>
                <TableCell>{{ item.days }} days</TableCell>
                <TableCell>{{ formatCurrency(item.price) }}</TableCell>
                <TableCell>{{ formatCurrency(item.recurring_price) }}</TableCell>
                <TableCell>
                  <Badge :variant="item.status === 'active' ? 'default' : 'destructive'">
                    {{ item.status }}
                  </Badge>
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
                          <DropdownMenuItem @click="navigateTo(`/admin/plans/${item.id}`)">View</DropdownMenuItem>
                          <DropdownMenuItem @click="navigateTo(`/admin/plans/${item.id}/edit`)">Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem class="text-destructive" @click="confirmDelete(item.id)">Delete</DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </ClientOnly>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <MyPagination :data="plans" :pending="pending" :query="query" @page-change="refresh" />
        </CardContent>
        <div v-if="pending" class="absolute inset-0 bg-white/80 flex items-center justify-center">
          <Loader2 class="w-6 h-6 animate-spin text-gray-600" />
        </div>
      </Card>
    </div>
    <AlertDialog v-model:open="openDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently Delete the plan and remove all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction @click="deletePlan(deleteId)">Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </NuxtLayout>
</template>
