<script setup lang="ts">
import { RefreshCcw, Filter, EllipsisVertical } from 'lucide-vue-next'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { toast } from 'vue-sonner'

useHead({
  title: 'Invoices',
})
definePageMeta({
  middleware: 'admin',
})

const query = ref({
  page: 1,
  perpage: 10,
  sort: 'created_at',
  order: 'desc',
  start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
  end_date: new Date().toISOString().split('T')[0] || '',
  status: '',
  search:'',
})

const { data: invoices, pending, error, refresh } = await useFetch('/api/admin/invoices', {
  method: 'GET', params: query.value
})
const { data: widget, pending: widgetPending, refresh: widgetRefresh } = await useFetch('/api/admin/widget-invoice', {
  method: 'GET', params: query.value
})

const deleteItem = ref({} as any)
const invoiceStatus = ref({} as any)
</script>
<template>
  <NuxtLayout name="admin">
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row items-start justify-start md:justify-between">
        <div class="mb-4 md:mb-0">
          <h1 class="text-2xl font-bold text-gray-900">Invoice Management</h1>
          <p class="text-gray-600">Manage invoices and billing</p>
        </div>
        <div>
          <Button @click="refresh" variant="outline" class="me-2">
            <RefreshCcw/>
          </Button>
          <DateRangeForm :date="query"/>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <Badge variant="default" color="primary">
                  {{ widget?.invoice_total }}
                </Badge>
              </div>
              <div class="ml-5 w-0 flex-1 relative">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Total Invoices</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ formatCurrency(widget?.invoice_total_total) }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <Badge class="bg-green-600 text-white">
                  {{ widget?.invoice_paid }}
                </Badge>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Paid Invoices</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ formatCurrency(widget?.invoice_paid_total) }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <Badge class="bg-amber-500 text-white">
                  {{ widget?.invoice_unpaid }}
                </Badge>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Unpaid Invoices</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ formatCurrency(widget?.invoice_unpaid_total) }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <Badge class="bg-red-600 text-white">
                  {{ widget?.invoice_canceled }}
                </Badge>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Canceled Invoices</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ formatCurrency(widget?.invoice_canceled_total) }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Invoices Table -->

      <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg leading-6 font-medium text-gray-900">All Users</h3>
            <div class="flex items-center space-x-3">
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
                  <TableHead>No</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead class="text-end" width="1%">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(item, index) in invoices.data" :key="index">
                  <TableCell @click="navigateTo('/admin/invoices/'+item.id)" class="hover:underline cursor-pointer">
                    <div>{{ item.no }}</div>
                    <div class="text-gray-600 text-xs">{{ formatDate(item.date) }}</div>
                  </TableCell>
                  <TableCell>
                    <div>{{ item.user.name }}</div>
                    <div class="text-gray-600 text-xs">{{ item.user.email }}</div>
                  </TableCell>
                  <TableCell>
                    {{ item.plan.name }}
                  </TableCell>
                  <TableCell>{{ formatCurrency(item.amount) }}</TableCell>
                  <TableCell>
                    <div v-if="item.payment_provider=='midtrans'">Midtrans</div>
                    <div v-if="item.payment_provider=='midtrans'" class="text-gray-600 text-xs">{{item.payment_method}}</div>
                    <div v-if="item.payment_provider=='default'">Transfer Bank</div>
                  </TableCell>
                  <TableCell>
                    <Badge v-if="item.status=='paid'" class="bg-green-600 text-white">Paid</Badge>
                    <Badge v-else-if="item.status=='unpaid'" class="bg-amber-600 text-white">Unpaid</Badge>
                    <Badge v-else-if="item.status=='canceled'" class="bg-red-600 text-white">Canceled</Badge>
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
                            <DropdownMenuItem @click="navigateTo(`/admin/invoices/${item.id}`)">View</DropdownMenuItem>
                            <DropdownMenuItem v-if="item.status=='unpaid'||item.status=='canceled'" @click="invoiceStatus = { id: item.id, no: item.no, open: true, status: item.status }">Change Status</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem @click="deleteItem={ id: item.id, no: item.no, open: true }" class="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </ClientOnly>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <MyPagination :data="invoices" :pending="pending" :query="query" @page-change="refresh" />
            <LoadingCard v-if="pending" />
          </div>
        </div>
      </div>
    </div>

    <AdminInvoiceDeleteDialog :invoice="deleteItem" @refresh="refresh" />
    <AdminInvoiceChangeStatusDialog :invoice="invoiceStatus" @refresh="refresh" />
  </NuxtLayout>
</template>
