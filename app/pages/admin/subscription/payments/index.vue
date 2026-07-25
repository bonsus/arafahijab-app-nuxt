<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import type { Payment, PaymentStatus, AdminResponse, AdminPaginated } from '~/types/admin'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const api = useAdminApi()
const toast = useToast()

const payments = ref<Payment[]>([])
const loading = ref(false)
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const totalPage = ref(0)
const statusFilter = ref('')

const statuses: PaymentStatus[] = ['pending', 'paid', 'failed', 'expired', 'refunded']

const statusBadge: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-blue-50 text-blue-700',
  failed: 'bg-red-50 text-red-700',
  expired: 'bg-gray-100 text-gray-600',
  refunded: 'bg-amber-50 text-amber-700',
}

async function fetchPayments() {
  loading.value = true
  try {
    const params: Record<string, string> = { page: String(page.value), perpage: String(perPage.value) }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await api.get<AdminResponse<AdminPaginated<Payment>>>('/admin/subscription/payments', params)
    payments.value = res.data.data || []
    total.value = res.data.total
    totalPage.value = res.data.total_page
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memuat payment')
  }
  finally {
    loading.value = false
  }
}

onMounted(fetchPayments)
watch([page, perPage, statusFilter], fetchPayments)
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-xl font-bold text-gray-900">Payment</h1>
      <p class="mt-1 text-sm text-gray-500">Riwayat pembayaran invoice langganan.</p>
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div class="border-b border-gray-100 p-3">
        <select v-model="statusFilter" class="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
          <option value="">Semua status</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-16 text-gray-400">
        <Loader2 class="h-6 w-6 animate-spin" />
      </div>
      <table v-else class="w-full text-sm">
        <thead class="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
          <tr>
            <th class="px-4 py-3">Payment ID</th>
            <th class="px-4 py-3">Invoice</th>
            <th class="px-4 py-3">Metode</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3 text-right">Dibayar</th>
            <th class="px-4 py-3">Waktu</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-if="!payments.length">
            <td colspan="6" class="px-4 py-10 text-center text-gray-400">Belum ada payment.</td>
          </tr>
          <tr v-for="p in payments" :key="p.id" class="hover:bg-gray-50/50">
            <td class="px-4 py-3 font-mono text-xs text-gray-600">{{ p.id }}</td>
            <td class="px-4 py-3">
              <NuxtLink :to="`/admin/subscription/invoices/${p.invoice_id}`" class="font-mono text-xs text-indigo-600 hover:underline">
                {{ p.invoice_id }}
              </NuxtLink>
            </td>
            <td class="px-4 py-3 text-gray-600">
              {{ p.transactions?.[0]?.gateway || '-' }}
              <span v-if="p.transactions?.[0]?.payment_method" class="text-xs text-gray-400">/ {{ p.transactions[0].payment_method }}</span>
            </td>
            <td class="px-4 py-3">
              <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="statusBadge[p.status] || 'bg-gray-100 text-gray-600'">{{ p.status }}</span>
            </td>
            <td class="px-4 py-3 text-right font-medium text-gray-900">{{ formatCurrency(p.total_paid) }}</td>
            <td class="px-4 py-3 text-gray-600">{{ formatDateTime(p.updated_at || p.created_at || '') }}</td>
          </tr>
        </tbody>
      </table>

      <AdminPagination v-model:page="page" v-model:per-page="perPage" :total-page="totalPage" :total="total" :per-page="perPage" :loading="loading" />
    </div>
  </div>
</template>
