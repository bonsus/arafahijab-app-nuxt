<script setup lang="ts">
useHead({
  title: 'Promotions',
})
definePageMeta({
  middleware: 'admin',
})
import { RefreshCcw, Plus, Loader2,EllipsisVertical, Filter } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { formatCurrency } from '~/utils/formatCurrency'
const query = ref({
  page:1,
  perpage: 10,
  search: '',
  status: '',
})
const { data: promotions, refresh, pending } = await useFetch('/api/admin/promotions', { method: 'GET', params: query.value })
const deletePromotion = async (id: string) => {
  try {
    await $fetch(`/api/admin/promotions/${id}`, { method: 'DELETE' })
    toast.success('Promotion deleted successfully')
    refresh()
  } catch (err:any) {
    toast.error('Error deleting promotion')
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
      <div class="flex items-center justify-between sm:flex-row flex-col">
        <div class="mb-4 lg:mb-0">
          <h1 class="text-2xl font-bold text-gray-900">Promotions Management</h1>
          <p class="text-gray-600">
            Manage your promotions and discounts here. Create, edit, or delete promotions as needed.
          </p>
        </div>
        <div>
          <Button @click="refresh" variant="outline">
            <RefreshCcw/>
          </Button>
          <Button variant="default" class="ms-2">
            <NuxtLink to="/admin/promotions/create" variant="default" class="text-nowwrap flex items-center">
              <Plus/> Create Promotion
            </NuxtLink>
          </Button>
        </div>
      </div>
      <Card class="relative overflow-hidden">
        <CardContent>
          <div class="flex flex-col md:flex-row items-start justify-start md:justify-between">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4 md:mb-0">All Promotions</h3>
            <div class="flex items-center space-x-3 mb-4 md:mb-0">
              <input type="text" v-model="query.search" placeholder="Search promotions..."
                class="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Select v-model="query.status" id="status">
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <button @click="refresh()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm">
                <Filter class="w-4 h-4" />
              </button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Coupon</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Valid Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead class="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in promotions.data" :key="item.id">
                <TableCell @click="navigateTo(`/admin/promotions/${item.id}`)" class="cursor-pointer hover:underline">
                  {{ item.name }}
                  <div class="text-muted-foreground text-xs">{{ item.description }}</div>
                </TableCell>
                <TableCell class="truncate max-w-xs">{{ item.coupon }}</TableCell>
                <TableCell>{{ item.type }}</TableCell>
                <TableCell>
                  <template v-if="item.discount_type === 'percentage'">
                    {{ item.value }}%
                  </template>
                  <template v-else>
                    {{ formatCurrency(item.value) }}
                  </template>
                </TableCell>
                <TableCell>
                  <div class="text-muted-foreground">
                    <span v-if="item.start_date">{{ formatDate(item.start_date) }}</span>
                    <span v-if="item.end_date"> - {{ formatDate(item.end_date) }}</span>
                  </div>
                </TableCell>
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
                          <DropdownMenuItem @click="navigateTo(`/admin/promotions/${item.id}`)">View</DropdownMenuItem>
                          <DropdownMenuItem @click="navigateTo(`/admin/promotions/${item.id}/edit`)">Edit</DropdownMenuItem>
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
          <MyPagination :data="promotions" :pending="pending" :query="query" @page-change="refresh" />
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
          <AlertDialogAction @click="deletePromotion(deleteId)">Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </NuxtLayout>
</template>
