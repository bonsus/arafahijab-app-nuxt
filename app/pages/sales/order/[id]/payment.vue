<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CreditCard, CheckCircle2 } from 'lucide-vue-next'
import { formatCurrency } from '~/composables/useFormatters'

const route = useRoute()
const router = useRouter()
const orderId = route.params.id as string

const api = useApi()
const toast = useToast()

const loading = ref(true)
const order = ref<any>(null)
const bankAccounts = ref<any[]>([])

onMounted(async () => {
  loading.value = true
  try {
    // Fetch order detail
    const res = await api.get<{ data: any }>(`/sales/orders/${orderId}`)
    order.value = res.data
    // Fetch bank accounts
    const bankRes = await api.get<{ data: any[] }>('/banks/index')
    // Filter only active banks
    bankAccounts.value = (bankRes.data || []).filter((bank: any) => bank.status === 'active')
  } catch (err: any) {
    toast.error(err.message || 'Gagal memuat data')
    router.push('/sales/order')
  } finally {
    loading.value = false
  }
})

function handleConfirmPayment() {
  router.push(`/sales/order/${orderId}/confirm`)
}
</script>

<template>
  <div class="max-w-xl mx-auto py-8 px-4">
    <div v-if="loading" class="text-center py-12 text-gray-400">Memuat data...</div>
    <template v-else>
      <div class="mb-6 flex flex-col items-center">
        <CheckCircle2 class="h-10 w-10 text-green-500 mb-2" />
        <h1 class="text-2xl font-bold text-gray-900 mb-1">Pembayaran Bank Transfer</h1>
        <p class="text-gray-500 text-sm">Silakan transfer ke rekening berikut dan lakukan konfirmasi pembayaran.</p>
      </div>
      <div class="mb-6 rounded-xl bg-white p-5 shadow ring-1 ring-gray-200">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm text-gray-600">No. Order</span>
          <span class="font-mono text-sm font-bold text-primary-600">{{ order.no }}</span>
        </div>
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm text-gray-600">Total Pembayaran</span>
          <span class="text-base font-bold text-gray-900">Rp{{ formatCurrency(Number(order.total)) }}</span>
        </div>
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm text-gray-600">Status Order</span>
          <span class="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">{{ order.status }}</span>
        </div>
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm text-gray-600">Status Pembayaran</span>
          <span class="rounded-full px-2 py-1 text-xs font-medium"
            :class="{
              'bg-yellow-100 text-yellow-700': order.payment_status === 'waiting_confirmation',
              'bg-green-100 text-green-700': order.payment_status === 'paid',
              'bg-red-100 text-red-700': order.payment_status === 'unpaid',
            }"
          >
            <span v-if="order.payment_status=='unpaid'">Belum Dibayar</span>
            <span v-if="order.payment_status=='waiting_confirmation'">Menunggu Konfirmasi</span>
            <span v-if="order.payment_status=='paid'">Sudah Dibayar</span>
          </span>
        </div>
      </div>
      <div class="mb-6 rounded-xl bg-white p-5 shadow ring-1 ring-gray-200">
        <h2 class="mb-3 text-sm font-semibold text-gray-900 flex items-center gap-2">
          <CreditCard class="h-4 w-4 text-primary-500" />
          Rekening Tujuan
        </h2> 
        <div v-if="bankAccounts.length === 0" class="text-xs text-gray-400">Tidak ada rekening bank transfer aktif.</div>
        <div v-else class="space-y-3">
          <div v-for="acc in bankAccounts" :key="acc.id" class="rounded-lg border border-gray-200 p-3 flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <img :src="`/images/banks/${acc.bank_name}.svg`" :alt="acc.bank_name" class="h-5 w-5 object-contain" @error="($event.target as HTMLImageElement).style.display='none'" />
              <span class="font-semibold text-gray-900">{{ acc.bank_name }}</span>
              <span class="ml-auto text-xs text-gray-500">({{ acc.bank_id }})</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <span class="font-mono">{{ acc.account_number || '-' }}</span>
              <span class="text-xs text-gray-500">a.n. {{ acc.account_name || '-' }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="mb-6 rounded-xl bg-white p-5 shadow ring-1 ring-gray-200">
        <h2 class="mb-3 text-sm font-semibold text-gray-900">Instruksi Transfer</h2>
        <ol class="list-decimal pl-5 text-sm text-gray-700 space-y-1">
          <li>Transfer sesuai nominal ke salah satu rekening di atas.</li>
          <li>Gunakan nomor order sebagai berita transfer (jika ada).</li>
          <li>Setelah transfer, lakukan konfirmasi pembayaran.</li>
        </ol>
      </div>
      <div class="flex gap-2">
        <button v-if="order.payment_status=='unpaid'" type="button" class="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700" @click="handleConfirmPayment">
          Konfirmasi Pembayaran
        </button>
        <NuxtLink to="/sales/order" class="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 text-center">
          Kembali
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
