<script setup lang="ts">
import {
  ArrowLeft, RefreshCw, Loader2, Copy, Check, CreditCard, QrCode,
  Landmark, Inbox, Clock, FileText, Wallet,
} from 'lucide-vue-next'
import { formatCurrency, formatDate, formatDateTime } from '~/composables/useFormatters'
import { invoiceBadge, transactionBadge, billingCycleLabel } from '~/composables/useBilling'
import type { Invoice, PaymentMethod, BillingTransaction } from '~/types'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const api = useApi()
const toast = useToast()

const invoiceId = computed(() => String(route.params.id || ''))

const invoice = ref<Invoice | null>(null)
const loading = ref(true)

async function fetchInvoice() {
  loading.value = true
  try {
    const res = await api.get<{ data: Invoice }>(`/billing/invoices/${invoiceId.value}`)
    invoice.value = res.data || null
  }
  catch (e: any) {
    invoice.value = null
    toast.error(e?.message || 'Gagal memuat invoice')
  }
  finally {
    loading.value = false
  }
}

const isOpen = computed(() => invoice.value?.status === 'open')

/** All transactions across all payments, newest first. */
const transactions = computed<BillingTransaction[]>(() => {
  const list: BillingTransaction[] = []
  for (const p of invoice.value?.payments || []) {
    for (const t of p.transactions || []) list.push(t)
  }
  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
})

const hasPendingTransaction = computed(() => transactions.value.some(t => t.status === 'pending'))

// ---- Payment methods ----
const methods = ref<PaymentMethod[]>([])
const methodsLoading = ref(false)
const selectedMethod = ref('')

async function fetchMethods() {
  methodsLoading.value = true
  try {
    const res = await api.get<{ data: PaymentMethod[] }>('/billing/payment-methods', { gateway: '' })
    methods.value = res.data || []
  }
  catch (e: any) {
    methods.value = []
    toast.error(e?.message || 'Gagal memuat metode pembayaran')
  }
  finally {
    methodsLoading.value = false
  }
}

const methodIcon = (category: string) => {
  if (category === 'qris') return QrCode
  if (category === 'va') return Landmark
  return CreditCard
}

// ---- Payment flow ----
const creatingMethod = ref('')

function methodCategory(code: string): string {
  return methods.value.find(m => m.code === code)?.category || ''
}

/** The live (pending) transaction for the currently selected method, if any. */
const activeTransaction = computed<BillingTransaction | null>(() => {
  if (!selectedMethod.value) return null
  return transactions.value.find(
    t => t.payment_method === selectedMethod.value && t.status === 'pending',
  ) || null
})

async function selectMethod(gateway: string, code: string) {
  if (creatingMethod.value) return
  selectedMethod.value = code
  // Reuse an existing pending transaction for this method if one already exists.
  const existing = transactions.value.find(
    t => t.payment_method === code && t.status === 'pending',
  )
  if (existing) return
  await createPayment(gateway, code)
}

async function createPayment(gateway: string, code: string) {
  creatingMethod.value = code
  try {
    await api.post<{ message: string; data: BillingTransaction }>(
      `/billing/invoices/${invoiceId.value}/pay`,
      { gateway, payment_method: code },
    )
    await fetchInvoice()
  }
  catch (e: any) {
    toast.error(e?.message || 'Gagal membuat pembayaran')
    if (selectedMethod.value === code) selectedMethod.value = ''
  }
  finally {
    creatingMethod.value = ''
  }
}

function paymentGuide(t: BillingTransaction): string[] {
  const cat = methodCategory(t.payment_method)
  if (cat === 'qris' || t.qr_string) {
    return [
      'Buka aplikasi e-wallet atau mobile banking yang mendukung QRIS.',
      'Pilih menu Scan / QRIS, lalu pindai kode QR di samping.',
      'Pastikan nominal pembayaran sesuai, lalu konfirmasi.',
      'Pembayaran akan terverifikasi otomatis dalam beberapa saat.',
    ]
  }
  if (cat === 'va' || t.va_number) {
    return [
      'Buka aplikasi mobile banking atau ATM sesuai bank Anda.',
      'Pilih menu Transfer > Virtual Account.',
      'Masukkan nomor Virtual Account di atas.',
      'Periksa nominal dan nama penerima, lalu konfirmasi.',
      'Pembayaran akan terverifikasi otomatis dalam beberapa saat.',
    ]
  }
  return ['Klik tombol "Lanjutkan Pembayaran" untuk menyelesaikan transaksi.']
}

// ---- Copy ----
const copiedId = ref('')
async function copyText(text: string, id: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
    setTimeout(() => { if (copiedId.value === id) copiedId.value = '' }, 1500)
  }
  catch {
    toast.error('Gagal menyalin')
  }
}

function methodLabel(code: string): string {
  const m = methods.value.find(x => x.code === code)
  return m?.name || code
}

// ---- Auto refresh while pending ----
let pollTimer: ReturnType<typeof setInterval> | null = null
function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible' && isOpen.value && hasPendingTransaction.value) {
      fetchInvoice()
    }
  }, 8000)
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

onMounted(async () => {
  await fetchInvoice()
  if (isOpen.value) {
    await fetchMethods()
    // Pre-select a method that already has a pending instruction.
    const pending = transactions.value.find(t => t.status === 'pending')
    if (pending) selectedMethod.value = pending.payment_method
  }
  startPolling()
})

onBeforeUnmount(() => stopPolling())
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-start gap-3">
        <NuxtLink
          to="/billing/invoice"
          class="mt-0.5 rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-50"
        >
          <ArrowLeft class="h-4 w-4" />
        </NuxtLink>
        <div>
          <h1 class="flex items-center gap-2 text-xl font-bold text-gray-900">
            <FileText class="h-5 w-5 text-primary-600" />
            {{ invoice?.invoice_number || 'Detail Invoice' }}
          </h1>
          <p class="mt-0.5 text-sm text-gray-500">Rincian tagihan &amp; pembayaran langganan</p>
        </div>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
        :disabled="loading"
        @click="fetchInvoice"
      >
        <RefreshCw :class="['h-3.5 w-3.5', loading && 'animate-spin']" />
        Refresh
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="rounded-xl bg-white p-6 shadow-xs ring-1 ring-gray-200">
      <div class="h-6 w-40 animate-pulse rounded bg-gray-200" />
      <div class="mt-3 h-4 w-64 animate-pulse rounded bg-gray-100" />
    </div>

    <div v-else-if="!invoice" class="rounded-xl bg-white px-5 py-16 text-center shadow-xs ring-1 ring-gray-200">
      <Inbox class="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p class="text-sm text-gray-500">Invoice tidak ditemukan</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Left: payment method + instruction -->
      <div class="space-y-6 lg:col-span-2">
        <!-- Payment method -->
        <div v-if="isOpen" class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
          <div class="border-b border-gray-100 px-5 py-4">
            <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <CreditCard class="h-4 w-4 text-gray-400" /> Pilih Metode Pembayaran
            </h2>
          </div>

          <div class="px-5 py-4">
            <div v-if="methodsLoading" class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div v-for="i in 4" :key="i" class="h-11 w-full animate-pulse rounded-lg bg-gray-100" />
            </div>

            <div v-else-if="!methods.length" class="text-center text-sm text-gray-500">
              Tidak ada metode pembayaran tersedia
            </div>

            <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                v-for="m in methods"
                :key="m.code"
                type="button"
                :disabled="!!creatingMethod"
                class="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                :class="selectedMethod === m.code
                  ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-500/20'
                  : 'border-gray-200 hover:bg-gray-50'"
                @click="selectMethod(m.gateway,m.code)"
              >
                <component :is="methodIcon(m.category)" class="h-4 w-4 shrink-0 text-gray-400" />
                <span class="flex-1 text-left font-medium text-gray-800">{{ m.name }}</span>
                <Loader2 v-if="creatingMethod === m.code" class="h-4 w-4 animate-spin text-primary-500" />
                <Check v-else-if="selectedMethod === m.code" class="h-4 w-4 text-primary-500" />
              </button>
            </div>

            <p class="mt-3 text-xs text-gray-400">
              Pilih metode untuk langsung menampilkan instruksi pembayaran. Anda dapat berganti metode kapan saja.
            </p>
          </div>
        </div>

        <div v-else-if="invoice.status === 'paid'" class="flex items-center gap-3 rounded-xl bg-green-50 px-5 py-5 ring-1 ring-green-200">
          <Check class="h-7 w-7 text-green-600" />
          <div>
            <p class="text-sm font-semibold text-green-800">Invoice Lunas</p>
            <p class="text-xs text-green-600">Terima kasih, pembayaran telah diterima.</p>
          </div>
        </div>

        <!-- Active payment instruction -->
        <div v-if="isOpen && (creatingMethod || activeTransaction)" class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
            <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Wallet class="h-4 w-4 text-gray-400" /> Instruksi Pembayaran
            </h2>
            <span
              v-if="activeTransaction"
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="transactionBadge(activeTransaction.status).cls"
            >
              {{ transactionBadge(activeTransaction.status).label }}
            </span>
          </div>

          <!-- Generating -->
          <div v-if="creatingMethod && !activeTransaction" class="flex flex-col items-center px-5 py-12 text-center">
            <Loader2 class="h-8 w-8 animate-spin text-primary-500" />
            <p class="mt-3 text-sm text-gray-500">Membuat instruksi pembayaran…</p>
          </div>

          <div v-else-if="activeTransaction" class="px-5 py-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-medium text-gray-800">{{ methodLabel(activeTransaction.payment_method) }}</span>
              <span v-if="activeTransaction.expiry_at" class="flex items-center gap-1 text-xs text-gray-400">
                <Clock class="h-3.5 w-3.5" /> Bayar sebelum {{ formatDateTime(activeTransaction.expiry_at) }}
              </span>
            </div>

            <!-- QRIS -->
            <div v-if="activeTransaction.qr_string" class="mt-4 flex flex-col items-center rounded-lg bg-gray-50 px-4 py-5 ring-1 ring-gray-100">
              <img :src="activeTransaction.payment_url || activeTransaction.qr_string" alt="QRIS" class="h-56 w-56 object-contain" />
              <p class="mt-3 text-lg font-bold text-gray-900">{{ formatCurrency(invoice.total) }}</p>
            </div>

            <!-- VA -->
            <div v-else-if="activeTransaction.va_number" class="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
              <div>
                <p class="text-xs text-gray-400">Nomor Virtual Account</p>
                <p class="font-mono text-lg font-semibold tracking-wider text-gray-900">{{ activeTransaction.va_number }}</p>
                <p class="mt-1 text-sm font-medium text-gray-700">Total: {{ formatCurrency(invoice.total) }}</p>
              </div>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-white"
                @click="copyText(activeTransaction.va_number, activeTransaction.id)"
              >
                <Check v-if="copiedId === activeTransaction.id" class="h-3.5 w-3.5 text-green-500" />
                <Copy v-else class="h-3.5 w-3.5" />
                {{ copiedId === activeTransaction.id ? 'Tersalin' : 'Salin' }}
              </button>
            </div>

            <!-- Redirect URL -->
            <a
              v-else-if="activeTransaction.payment_url"
              :href="activeTransaction.payment_url"
              target="_blank"
              rel="noopener"
              class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Lanjutkan Pembayaran
            </a>

            <!-- Guide -->
            <div class="mt-5 border-t border-gray-100 pt-4">
              <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Panduan Pembayaran</p>
              <ol class="space-y-2 text-sm text-gray-600">
                <li v-for="(step, i) in paymentGuide(activeTransaction)" :key="i" class="flex gap-2">
                  <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-600">{{ i + 1 }}</span>
                  <span>{{ step }}</span>
                </li>
              </ol>
            </div>

            <p class="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
              <RefreshCw class="h-3 w-3" /> Status pembayaran diperbarui otomatis setelah Anda membayar.
            </p>
          </div>
        </div>
      </div>

      <!-- Right: order summary + billing -->
      <div class="space-y-6">
        <!-- Order summary -->
        <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
            <h2 class="text-sm font-semibold text-gray-800">Ringkasan Pesanan</h2>
            <span class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="invoiceBadge(invoice.status).cls">
              {{ invoiceBadge(invoice.status).label }}
            </span>
          </div>

          <div class="px-5 py-4">
            <dl class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt class="text-xs uppercase tracking-wider text-gray-400">Paket</dt>
                <dd class="mt-0.5 font-medium text-gray-800">{{ invoice.plan_name || '-' }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wider text-gray-400">Siklus</dt>
                <dd class="mt-0.5 font-medium text-gray-800">{{ billingCycleLabel(invoice.billing_cycle) }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wider text-gray-400">Jatuh Tempo</dt>
                <dd class="mt-0.5 font-medium text-gray-800">{{ formatDate(invoice.due_date) }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wider text-gray-400">Dibayar</dt>
                <dd class="mt-0.5 font-medium text-gray-800">{{ invoice.paid_at ? formatDateTime(invoice.paid_at) : '-' }}</dd>
              </div>
            </dl>

            <!-- Items -->
            <div class="mt-4 space-y-2.5 border-t border-gray-100 pt-4">
              <div
                v-for="it in invoice.items || []"
                :key="it.id"
                class="flex items-start justify-between gap-3 text-sm"
              >
                <div>
                  <p class="text-gray-800">{{ it.description }}</p>
                  <p class="text-xs text-gray-400">{{ it.quantity }} x {{ formatCurrency(it.unit_price) }}</p>
                </div>
                <span class="whitespace-nowrap font-medium text-gray-800">{{ formatCurrency(it.subtotal) }}</span>
              </div>
            </div>

            <!-- Totals -->
            <dl class="mt-4 space-y-1.5 border-t border-gray-100 pt-4 text-sm">
              <div class="flex justify-between text-gray-600">
                <dt>Subtotal</dt>
                <dd>{{ formatCurrency(invoice.subtotal) }}</dd>
              </div>
              <div v-if="invoice.discount" class="flex justify-between text-gray-600">
                <dt>Diskon</dt>
                <dd>-{{ formatCurrency(invoice.discount) }}</dd>
              </div>
              <div v-if="invoice.tax" class="flex justify-between text-gray-600">
                <dt>Pajak</dt>
                <dd>{{ formatCurrency(invoice.tax) }}</dd>
              </div>
              <div class="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                <dt>Total</dt>
                <dd>{{ formatCurrency(invoice.total) }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Billing detail -->
        <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
          <div class="border-b border-gray-100 px-5 py-4">
            <h2 class="text-sm font-semibold text-gray-800">Ditagihkan Kepada</h2>
          </div>
          <div class="space-y-1 px-5 py-4 text-sm">
            <p class="font-medium text-gray-900">{{ invoice.billing_name || invoice.company_name || '-' }}</p>
            <p class="text-gray-600">{{ invoice.billing_email || '-' }}</p>
            <p class="text-gray-600">{{ invoice.billing_address || '-' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
