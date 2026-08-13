<script setup lang="ts">
import { ArrowLeft, Loader2, Check, X, Landmark, ExternalLink } from 'lucide-vue-next'
import type { ManualPayment, AdminResponse } from '~/types/admin'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const route = useRoute()
const api = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()
const paymentId = route.params.id as string

const payment = ref<ManualPayment | null>(null)
const loading = ref(false)

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

const rejectReasons = ['amount_mismatch', 'invalid_proof', 'unreadable_proof', 'not_found', 'wrong_account', 'already_used', 'expired', 'other']

const reasonLabel: Record<string, string> = {
  amount_mismatch: 'Nominal tidak sesuai',
  invalid_proof: 'Bukti tidak valid',
  unreadable_proof: 'Bukti tidak terbaca',
  not_found: 'Transfer tidak ditemukan',
  wrong_account: 'Rekening tujuan salah',
  already_used: 'Bukti sudah dipakai',
  expired: 'Kedaluwarsa',
  other: 'Lainnya',
}

async function fetchPayment() {
  loading.value = true
  try {
    const res = await api.get<AdminResponse<ManualPayment>>(`/admin/subscription/manual-payments/${paymentId}`)
    payment.value = res.data
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memuat pembayaran')
  }
  finally {
    loading.value = false
  }
}

onMounted(fetchPayment)

// ---- Approve ----
const approving = ref(false)
async function approve() {
  const ok = await confirm({
    title: 'Setujui Pembayaran',
    message: 'Setujui pembayaran ini? Invoice akan ditandai lunas dan subscription diaktifkan.',
    confirmText: 'Setujui',
  })
  if (!ok) return
  approving.value = true
  try {
    const res = await api.post<AdminResponse<unknown>>(`/admin/subscription/manual-payments/${paymentId}/approve`)
    toast.success(res.message || 'Pembayaran disetujui')
    await fetchPayment()
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal menyetujui pembayaran')
  }
  finally {
    approving.value = false
  }
}

// ---- Reject ----
const rejectOpen = ref(false)
const rejecting = ref(false)
const rejectForm = reactive({ reason: 'amount_mismatch', note: '' })
const rejectErrors = ref<Record<string, string[]>>({})

async function reject() {
  rejecting.value = true
  rejectErrors.value = {}
  try {
    const res = await api.post<AdminResponse<unknown>>(`/admin/subscription/manual-payments/${paymentId}/reject`, {
      reason: rejectForm.reason,
      note: rejectForm.note,
    })
    toast.success(res.message || 'Pembayaran ditolak')
    rejectOpen.value = false
    await fetchPayment()
  }
  catch (error: any) {
    if (error?.errors) rejectErrors.value = error.errors
    else toast.error(error?.message || 'Gagal menolak pembayaran')
  }
  finally {
    rejecting.value = false
  }
}

const confirmation = computed(() => payment.value?.confirmations?.[0] || null)
</script>

<template>
  <div class="space-y-5">
    <NuxtLink to="/admin/subscription/manual-payments" class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
      <ArrowLeft class="h-4 w-4" /> Kembali ke Pembayaran Manual
    </NuxtLink>

    <div v-if="loading && !payment" class="flex items-center justify-center py-20 text-gray-400">
      <Loader2 class="h-6 w-6 animate-spin" />
    </div>

    <template v-else-if="payment">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="font-mono text-xl font-bold text-gray-900">{{ payment.id }}</h1>
          <p class="mt-1 text-sm text-gray-500">
            {{ payment.invoice?.invoice_number || payment.invoice_id }}
            · {{ formatCurrency(payment.invoice?.total || payment.total_paid || 0) }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-md px-2.5 py-1 text-sm font-medium" :class="statusBadge[payment.status] || 'bg-gray-100 text-gray-600'">
            {{ statusLabel[payment.status] || payment.status }}
          </span>
          <template v-if="payment.status === 'waiting_verification'">
            <button class="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50" @click="rejectOpen = true">
              <X class="h-4 w-4" /> Tolak
            </button>
            <button class="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700" :disabled="approving" @click="approve">
              <Loader2 v-if="approving" class="h-4 w-4 animate-spin" />
              <Check v-else class="h-4 w-4" /> Setujui
            </button>
          </template>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <!-- Detail payment -->
        <div class="space-y-4 lg:col-span-1">
          <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p class="mb-3 text-sm font-semibold text-gray-900">Detail Pembayaran</p>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between"><dt class="text-gray-500">Metode</dt><dd class="text-gray-900">{{ payment.payment_method || 'manual_bank_transfer' }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">Total Invoice</dt><dd class="font-medium text-gray-900">{{ formatCurrency(payment.invoice?.total || 0) }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">Kedaluwarsa</dt><dd class="text-gray-900">{{ formatDateTime(payment.expired_at || '') }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">Dibuat</dt><dd class="text-gray-900">{{ formatDateTime(payment.created_at || '') }}</dd></div>
            </dl>
          </div>

          <!-- Rejection info -->
          <div v-if="payment.status === 'rejected'" class="rounded-xl border border-red-100 bg-red-50 p-5">
            <p class="text-sm font-semibold text-red-800">Alasan Penolakan</p>
            <p class="mt-1 text-sm text-red-700">{{ reasonLabel[payment.rejection_reason] || payment.rejection_reason }}</p>
            <p v-if="payment.rejection_note" class="mt-1 text-xs text-red-600">{{ payment.rejection_note }}</p>
          </div>
        </div>

        <!-- Konfirmasi transfer -->
        <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
          <p class="mb-4 text-sm font-semibold text-gray-900">Bukti Transfer</p>

          <div v-if="!confirmation" class="py-8 text-center text-sm text-gray-400">
            Belum ada konfirmasi transfer.
          </div>

          <template v-else>
            <div class="flex flex-wrap items-start gap-6">
              <div class="min-w-0 flex-1 space-y-3">
                <div>
                  <p class="text-xs uppercase tracking-wider text-gray-400">Bank Pengirim</p>
                  <p class="mt-0.5 font-medium text-gray-900">{{ confirmation.sender_bank_name || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs uppercase tracking-wider text-gray-400">Atas Nama Pengirim</p>
                  <p class="mt-0.5 font-medium text-gray-900">{{ confirmation.sender_account_name || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs uppercase tracking-wider text-gray-400">Nominal Transfer</p>
                  <p class="mt-0.5 text-lg font-bold text-gray-900">{{ formatCurrency(confirmation.transfer_amount || 0) }}</p>
                </div>
                <div v-if="confirmation.transfer_date">
                  <p class="text-xs uppercase tracking-wider text-gray-400">Tanggal Transfer</p>
                  <p class="mt-0.5 font-medium text-gray-900">{{ formatDateTime(confirmation.transfer_date) }}</p>
                </div>
                <div v-if="confirmation.note">
                  <p class="text-xs uppercase tracking-wider text-gray-400">Catatan</p>
                  <p class="mt-0.5 font-medium text-gray-900">{{ confirmation.note }}</p>
                </div>
                <div v-if="confirmation.bank_account">
                  <p class="text-xs uppercase tracking-wider text-gray-400">Rekening Tujuan</p>
                  <p class="mt-0.5 flex items-center gap-1.5 font-medium text-gray-900">
                    <Landmark class="h-4 w-4 text-gray-400" />
                    {{ confirmation.bank_account.bank_name }} · {{ confirmation.bank_account.account_number }}
                  </p>
                </div>
              </div>

              <div class="w-full max-w-xs shrink-0">
                <a
                  v-if="confirmation.proof_file_url"
                  :href="confirmation.proof_file_url"
                  target="_blank"
                  rel="noopener"
                  class="group flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30"
                >
                  <img
                    v-if="confirmation.proof_file_url"
                    :src="confirmation.proof_file_url"
                    :alt="'Bukti transfer'"
                    class="h-32 w-full rounded-lg object-cover ring-1 ring-gray-100"
                    @error="($event.target as HTMLImageElement).style.display = 'none'"
                  >
                  <span class="flex items-center gap-1.5 text-xs font-medium text-indigo-600">
                    <ExternalLink class="h-3.5 w-3.5" /> Lihat Bukti
                  </span>
                </a>
              </div>
            </div>

            <div class="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
              Status konfirmasi: <span class="font-medium" :class="confirmation.status === 'approved' ? 'text-emerald-600' : confirmation.status === 'rejected' ? 'text-red-600' : 'text-amber-600'">{{ statusLabel[confirmation.status] || confirmation.status }}</span>
            </div>
          </template>
        </div>
      </div>
    </template>

    <!-- Reject modal -->
    <AdminModal v-model="rejectOpen" title="Tolak Pembayaran" max-width="max-w-md">
      <div class="space-y-4">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Alasan</label>
          <select v-model="rejectForm.reason" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option v-for="r in rejectReasons" :key="r" :value="r">{{ reasonLabel[r] || r }}</option>
          </select>
          <p v-if="rejectErrors.reason" class="mt-1 text-xs text-red-600">{{ rejectErrors.reason.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan</label>
          <textarea v-model="rejectForm.note" rows="3" placeholder="Contoh: Transfer yang diterima hanya Rp300.000" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="rejectErrors.note" class="mt-1 text-xs text-red-600">{{ rejectErrors.note.join(', ') }}</p>
        </div>
      </div>

      <template #footer>
        <button class="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50" @click="rejectOpen = false">Batal</button>
        <button :disabled="rejecting" class="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60" @click="reject">
          <Loader2 v-if="rejecting" class="h-4 w-4 animate-spin" /> Tolak
        </button>
      </template>
    </AdminModal>
  </div>
</template>
