<script setup lang="ts">
import { Loader2, ChevronRight, Landmark } from 'lucide-vue-next'
import type { ManualPayment, AdminResponse, AdminPaginated } from '~/types/admin'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const api = useAdminApi()
const toast = useToast()

const items = ref<ManualPayment[]>([])
const loading = ref(false)
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const totalPage = ref(0)
const statusFilter = ref('')

const statuses = ['pending', 'waiting_verification', 'approved', 'rejected', 'expired', 'cancelled']

const statusBadge: Record<string, string> = {
  pending: 'bg-blue-50 text-blue-700',
  waiting_verification: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  expired: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-100 text-gray-500',
}

const statusLabel: Record<string, string> = {
  pending: 'Menunggu Transfer',
  waiting_verification: 'Menunggu Verifikasi',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  expired: 'Kedaluwarsa',
  cancelled: 'Dibatalkan',
}

async function fetchList() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      perpage: String(perPage.value),
    }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await api.get<AdminResponse<AdminPaginated<ManualPayment>>>('/admin/subscription/manual-payments', params)
    items.value = res.data.data || []
    total.value = res.data.total
    totalPage.value = res.data.total_page
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memuat pembayaran manual')
  }
  finally {
    loading.value = false
  }
}

onMounted(fetchList)
watch([page, perPage, statusFilter], fetchList)
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-xl font-bold text-gray-900">Pembayaran Manual</h1>
      <p class="mt-1 text-sm text-gray-500">Verifikasi bukti Transfer Bank Manual (A.11).</p>
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div class="border-b border-gray-100 p-3">
        <select v-model="statusFilter" class="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
          <option value="">Semua status</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ statusLabel[s] || s }}</option>
        </select>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-16 text-gray-400">
        <Loader2 class="h-6 w-6 animate-spin" />
      </div>

      <table v-else class="w-full text-sm">
        <thead class="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
          <tr>
            <th class="px-4 py-3">ID Pembayaran</th>
            <th class="px-4 py-3">Invoice</th>
            <th class="px-4 py-3 text-right">Total</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Kedaluwarsa</th>
            <th class="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-if="!items.length">
            <td colspan="6" class="px-4 py-10 text-center text-gray-400">Belum ada pembayaran manual.</td>
          </tr>
          <tr v-for="p in items" :key="p.id" class="cursor-pointer hover:bg-gray-50/50" @click="$router.push(`/admin/subscription/manual-payments/${p.id}`)">
            <td class="px-4 py-3">
              <span class="flex items-center gap-2 font-mono text-xs text-gray-600">
                <Landmark class="h-4 w-4 text-gray-400" /> {{ p.id }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span class="font-mono text-xs text-indigo-600">{{ p.invoice?.invoice_number || p.invoice_id }}</span>
            </td>
            <td class="px-4 py-3 text-right font-medium text-gray-900">{{ formatCurrency(p.invoice?.total || p.total_paid || 0) }}</td>
            <td class="px-4 py-3">
              <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="statusBadge[p.status] || 'bg-gray-100 text-gray-600'">
                {{ statusLabel[p.status] || p.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-600">{{ formatDateTime(p.expired_at || '') }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end">
                <ChevronRight class="h-4 w-4 text-gray-300" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <AdminPagination v-model:page="page" v-model:per-page="perPage" :total-page="totalPage" :total="total" :per-page="perPage" :loading="loading" />
    </div>
  </div>
</template>
