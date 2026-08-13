<script setup lang="ts">
import { ArrowLeft, Loader2, CreditCard, ExternalLink, Copy, Check } from 'lucide-vue-next'
import type { Invoice, Transaction, Gateway, AdminResponse, PaymentGateway, GatewayMethod } from '~/types/admin'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const route = useRoute()
const api = useAdminApi()
const toast = useToast()
const invoiceId = route.params.id as string

const invoice = ref<Invoice | null>(null)
const loading = ref(false)

const statusBadge: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  open: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  void: 'bg-gray-100 text-gray-500',
  uncollectible: 'bg-red-50 text-red-700',
  expired: 'bg-orange-50 text-orange-700',
}

async function fetchInvoice() {
  loading.value = true
  try {
    const res = await api.get<AdminResponse<Invoice>>(`/admin/subscription/invoices/${invoiceId}`)
    invoice.value = res.data
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memuat invoice')
  }
  finally {
    loading.value = false
  }
}

onMounted(fetchInvoice)

// ---- Pay ----
const payOpen = ref(false)
const paying = ref(false)
const payErrors = ref<Record<string, string[]>>({})
const payForm = reactive({ gateway: 'midtrans' as Gateway, payment_method: '' })
const payResult = ref<Transaction | null>(null)

// Gateway aktif diambil dari pengaturan payment gateway admin (backend hanya
// menerima gateway yang aktif — lihat PLATFORM_BILLING_API.md A.7.4).
const gatewayOptions = ref<PaymentGateway[]>([])
const loadingGateways = ref(false)

async function fetchGateways() {
  loadingGateways.value = true
  try {
    const res = await api.get<AdminResponse<PaymentGateway[]>>('/admin/payment-gateways')
    gatewayOptions.value = (res.data || []).filter(g => g.is_active)
    // Set default ke gateway aktif pertama + metode aktif pertamanya.
    if (gatewayOptions.value.length) {
      const firstGw = gatewayOptions.value[0]!
      payForm.gateway = firstGw.code as Gateway
      applyDefaultMethod()
    }
  }
  catch (error: any) {
    gatewayOptions.value = []
    toast.error(error?.message || 'Gagal memuat daftar gateway')
  }
  finally {
    loadingGateways.value = false
  }
}

/** Metode aktif untuk gateway yang dipilih (mis. midtrans). */
const methodOptions = computed<GatewayMethod[]>(() => {
  const gw = gatewayOptions.value.find(g => g.code === payForm.gateway)
  return (gw?.methods || []).filter(m => m.is_active)
})

function applyDefaultMethod() {
  const first = methodOptions.value[0]
  payForm.payment_method = first?.code || ''
}

watch(() => payForm.gateway, applyDefaultMethod)

function openPay() {
  payForm.gateway = 'midtrans'
  payForm.payment_method = ''
  payErrors.value = {}
  payResult.value = null
  payOpen.value = true
  fetchGateways()
}

async function pay() {
  paying.value = true
  payErrors.value = {}
  const payload: Record<string, unknown> = { gateway: payForm.gateway }
  if (payForm.payment_method) payload.payment_method = payForm.payment_method
  try {
    const res = await api.post<AdminResponse<Transaction>>(`/admin/subscription/invoices/${invoiceId}/pay`, payload)
    payResult.value = res.data
    toast.success('Pembayaran diinisiasi')
    fetchInvoice()
  }
  catch (error: any) {
    if (error?.errors) payErrors.value = error.errors
    else toast.error(error?.message || 'Gagal memproses pembayaran')
  }
  finally {
    paying.value = false
  }
}

/** Label metode dari hasil transaksi (cari di semua gateway). */
const resultMethodLabel = computed(() => {
  const t = payResult.value
  if (!t) return ''
  for (const gw of gatewayOptions.value) {
    const m = (gw.methods || []).find(x => x.code === t.payment_method)
    if (m) return m.name
  }
  return t.payment_method || t.gateway || ''
})

const copiedVa = ref(false)
function copyText(text: string) {
  navigator.clipboard?.writeText(text)
  copiedVa.value = true
  setTimeout(() => { copiedVa.value = false }, 1500)
  toast.success('Disalin')
}

// ---- Tandai Lunas Manual (A.7.5) ----
const markPaidOpen = ref(false)
const markingPaid = ref(false)
const markPaidNote = ref('')
const markPaidErrors = ref<Record<string, string[]>>({})

function openMarkPaid() {
  markPaidNote.value = ''
  markPaidErrors.value = {}
  markPaidOpen.value = true
}

async function markPaid() {
  markingPaid.value = true
  markPaidErrors.value = {}
  try {
    const res = await api.post<AdminResponse<Invoice>>(`/admin/subscription/invoices/${invoiceId}/mark-paid`, {
      note: markPaidNote.value,
    })
    invoice.value = res.data
    toast.success('Invoice ditandai lunas')
    markPaidOpen.value = false
  }
  catch (error: any) {
    if (error?.errors) markPaidErrors.value = error.errors
    else toast.error(error?.message || 'Gagal menandai lunas')
  }
  finally {
    markingPaid.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <NuxtLink to="/admin/subscription/invoices" class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
      <ArrowLeft class="h-4 w-4" /> Kembali ke Invoice
    </NuxtLink>

    <div v-if="loading && !invoice" class="flex items-center justify-center py-20 text-gray-400">
      <Loader2 class="h-6 w-6 animate-spin" />
    </div>

    <template v-else-if="invoice">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="font-mono text-xl font-bold text-gray-900">{{ invoice.invoice_number }}</h1>
          <p class="mt-1 text-sm text-gray-500">{{ invoice.company_name || invoice.business_id }} · {{ invoice.plan_name || '-' }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-md px-2.5 py-1 text-sm font-medium" :class="statusBadge[invoice.status] || 'bg-gray-100 text-gray-600'">{{ invoice.status }}</span>
          <button
            v-if="invoice.status !== 'paid' && invoice.status !== 'void'"
            class="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            @click="openMarkPaid"
          >
            <Check class="h-4 w-4 text-emerald-600" /> Tandai Lunas
          </button>
          <button
            v-if="invoice.status !== 'paid' && invoice.status !== 'void'"
            class="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            @click="openPay"
          >
            <CreditCard class="h-4 w-4" /> Bayar
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <!-- Items -->
        <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm lg:col-span-2">
          <table class="w-full text-sm">
            <thead class="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th class="px-4 py-3">Item</th>
                <th class="px-4 py-3 text-center">Qty</th>
                <th class="px-4 py-3 text-right">Harga</th>
                <th class="px-4 py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="it in invoice.items" :key="it.id">
                <td class="px-4 py-3">
                  <p class="font-medium text-gray-900">{{ it.description }}</p>
                  <span class="text-xs text-gray-400">{{ it.type }}</span>
                </td>
                <td class="px-4 py-3 text-center text-gray-600">{{ it.quantity }}</td>
                <td class="px-4 py-3 text-right text-gray-600">{{ formatCurrency(it.unit_price) }}</td>
                <td class="px-4 py-3 text-right font-medium text-gray-900">{{ formatCurrency(it.subtotal) }}</td>
              </tr>
            </tbody>
            <tfoot class="border-t border-gray-100 text-sm">
              <tr><td colspan="3" class="px-4 py-2 text-right text-gray-500">Subtotal</td><td class="px-4 py-2 text-right text-gray-700">{{ formatCurrency(invoice.subtotal) }}</td></tr>
              <tr><td colspan="3" class="px-4 py-1 text-right text-gray-500">Diskon</td><td class="px-4 py-1 text-right text-gray-700">- {{ formatCurrency(invoice.discount) }}</td></tr>
              <tr><td colspan="3" class="px-4 py-1 text-right text-gray-500">Pajak</td><td class="px-4 py-1 text-right text-gray-700">+ {{ formatCurrency(invoice.tax) }}</td></tr>
              <tr class="font-semibold text-gray-900"><td colspan="3" class="px-4 py-2 text-right">Total</td><td class="px-4 py-2 text-right">{{ invoice.currency }} {{ formatCurrency(invoice.total) }}</td></tr>
            </tfoot>
          </table>
        </div>

        <!-- Meta -->
        <div class="space-y-4">
          <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p class="mb-3 text-sm font-semibold text-gray-900">Detail Penagihan</p>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between"><dt class="text-gray-500">Nama</dt><dd class="text-gray-900">{{ invoice.billing_name || '-' }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">Email</dt><dd class="text-gray-900">{{ invoice.billing_email || '-' }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">Cycle</dt><dd class="text-gray-900">{{ invoice.billing_cycle || '-' }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">Jatuh Tempo</dt><dd class="text-gray-900">{{ formatDate(invoice.due_date || '') }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500">Dibayar</dt><dd class="text-gray-900">{{ formatDate(invoice.paid_at || '') }}</dd></div>
            </dl>
          </div>
        </div>
      </div>

      <!-- Payments -->
      <div v-if="invoice.payments?.length" class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <p class="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-900">Pembayaran</p>
        <table class="w-full text-sm">
          <thead class="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th class="px-4 py-3">Gateway</th>
              <th class="px-4 py-3">Metode</th>
              <th class="px-4 py-3">VA / Ref</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Dibayar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <template v-for="p in invoice.payments" :key="p.id">
              <tr v-for="t in p.transactions" :key="t.id">
                <td class="px-4 py-3 text-gray-700">{{ t.gateway }}</td>
                <td class="px-4 py-3 text-gray-600">{{ t.payment_method || '-' }}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600">{{ t.va_number || t.transaction_id }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{{ t.status }}</span>
                </td>
                <td class="px-4 py-3 text-right text-gray-700">{{ formatCurrency(p.total_paid) }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Pay modal -->
    <AdminModal v-model="payOpen" title="Bayar Invoice" max-width="max-w-md">
      <div v-if="!payResult" class="space-y-4">
        <!-- Ringkasan invoice -->
        <div class="rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
          <div class="flex items-center justify-between">
            <span class="font-mono text-sm font-semibold text-gray-900">{{ invoice?.invoice_number || '-' }}</span>
            <span class="text-base font-bold text-gray-900">{{ formatCurrency(invoice?.total || 0) }}</span>
          </div>
          <p class="mt-0.5 text-xs text-gray-500">{{ invoice?.plan_name || '-' }} · {{ invoice?.billing_cycle || '-' }}</p>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Gateway</label>
          <div v-if="loadingGateways" class="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-400">
            <Loader2 class="h-4 w-4 animate-spin" /> Memuat gateway…
          </div>
          <select
            v-else
            v-model="payForm.gateway"
            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option v-for="g in gatewayOptions" :key="g.code" :value="g.code">{{ g.name }}</option>
          </select>
          <p v-if="payErrors.gateway" class="mt-1 text-xs text-red-600">{{ payErrors.gateway.join(', ') }}</p>
          <p v-if="!loadingGateways && !gatewayOptions.length" class="mt-1 text-xs text-amber-600">
            Tidak ada gateway aktif. Aktifkan gateway di menu Payment Gateway terlebih dahulu.
          </p>
        </div>

        <div v-if="methodOptions.length">
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Metode Pembayaran</label>
          <select v-model="payForm.payment_method" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option v-for="m in methodOptions" :key="m.code" :value="m.code">{{ m.name }}</option>
          </select>
          <p v-if="payErrors.payment_method" class="mt-1 text-xs text-red-600">{{ payErrors.payment_method.join(', ') }}</p>
        </div>
      </div>

      <!-- Result -->
      <div v-else class="space-y-3 text-sm">
        <div class="flex items-center justify-between gap-2">
          <p class="text-gray-600">Instruksi pembayaran</p>
          <span class="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{{ resultMethodLabel }}</span>
        </div>

        <!-- QRIS -->
        <div v-if="payResult.qr_string" class="flex flex-col items-center rounded-lg bg-gray-50 px-4 py-5 ring-1 ring-gray-100">
          <AppQrisCode :value="payResult.qr_string" />
          <p class="mt-3 text-lg font-bold text-gray-900">{{ formatCurrency(invoice?.total || 0) }}</p>
        </div>

        <!-- VA -->
        <div v-else-if="payResult.va_number" class="flex items-center justify-between rounded-lg bg-gray-50 p-3">
          <div>
            <p class="text-xs text-gray-500">Nomor Virtual Account</p>
            <p class="font-mono text-base font-semibold text-gray-900">{{ payResult.va_number }}</p>
          </div>
          <button class="inline-flex items-center gap-1 rounded-lg p-2 text-gray-500 hover:bg-gray-200" @click="copyText(payResult.va_number!)">
            <Check v-if="copiedVa" class="h-4 w-4 text-emerald-600" />
            <Copy v-else class="h-4 w-4" />
          </button>
        </div>

        <!-- Redirect -->
        <a v-if="payResult.payment_url" :href="payResult.payment_url" target="_blank" rel="noopener" class="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
          <ExternalLink class="h-4 w-4" /> Buka Halaman Pembayaran
        </a>

        <p v-if="payResult.expiry_at" class="text-xs text-gray-400">Kadaluarsa: {{ formatDateTime(payResult.expiry_at) }}</p>
      </div>

      <template #footer>
        <button class="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50" @click="payOpen = false">Tutup</button>
        <button
          v-if="!payResult"
          :disabled="paying || loadingGateways || !gatewayOptions.length"
          class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          @click="pay"
        >
          <Loader2 v-if="paying" class="h-4 w-4 animate-spin" /> Proses
        </button>
      </template>
    </AdminModal>

    <!-- Tandai Lunas Manual modal -->
    <AdminModal v-model="markPaidOpen" title="Tandai Lunas Manual" max-width="max-w-md">
      <div class="space-y-4">
        <div class="rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
          <div class="flex items-center justify-between">
            <span class="font-mono text-sm font-semibold text-gray-900">{{ invoice?.invoice_number || '-' }}</span>
            <span class="text-base font-bold text-gray-900">{{ formatCurrency(invoice?.total || 0) }}</span>
          </div>
          <p class="mt-0.5 text-xs text-gray-500">
            Menandai invoice lunas tanpa payment gateway (mis. pembayaran tunai / transfer langsung).
          </p>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan <span class="text-gray-400">(opsional)</span></label>
          <textarea
            v-model="markPaidNote"
            rows="3"
            placeholder="Contoh: Pembayaran tunai diterima"
            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <p v-if="markPaidErrors.note" class="mt-1 text-xs text-red-600">{{ markPaidErrors.note.join(', ') }}</p>
        </div>
      </div>

      <template #footer>
        <button class="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50" @click="markPaidOpen = false">Batal</button>
        <button
          :disabled="markingPaid"
          class="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          @click="markPaid"
        >
          <Loader2 v-if="markingPaid" class="h-4 w-4 animate-spin" /> Tandai Lunas
        </button>
      </template>
    </AdminModal>
  </div>
</template>
