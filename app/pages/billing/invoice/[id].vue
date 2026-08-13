<script setup lang="ts">
import {
  ArrowLeft, RefreshCw, Loader2, Copy, Check, CreditCard, QrCode,
  Landmark, Inbox, Clock, FileText, AlertTriangle, X, Download,
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
//   loading.value = true
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
  if (category === 'va' || category === 'manual') return Landmark
  return CreditCard
}

// ---- Pengelompokan & logo metode ----
const CATEGORY_ORDER = ['va', 'qris', 'ewallet', 'manual', 'card', 'retail']

const categoryLabels: Record<string, string> = {
  va: 'Virtual Account',
  qris: 'QRIS',
  ewallet: 'E-Wallet',
  manual: 'Transfer Bank Manual',
  card: 'Kartu',
  retail: 'Retail',
  other: 'Lainnya',
}

const groupedMethods = computed<Record<string, PaymentMethod[]>>(() => {
  const groups: Record<string, PaymentMethod[]> = {}
  for (const m of methods.value) {
    const cat = m.category || 'other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(m)
  }
  return groups
})

/** Nama file logo yang tersedia di /public/images/banks/. */
const BANK_ICONS = new Set([
  'alfamart', 'bank_transfer', 'bca', 'bcas', 'bni', 'bnis', 'bri', 'bris',
  'bsi', 'bsm', 'cimb', 'cod', 'dana', 'indomaret', 'jcb', 'linkaja', 'mandiri',
  'mastercard', 'muamalat', 'other', 'ovo', 'permata', 'qris', 'visa','ocbc','bnc','danamon','maybank',
  'ewalletdana','ewalletovo','ewalletshopeepay'
])

function logoBase(code: string): string {
  const c = (code || '').toLowerCase()
  if (c.includes('manual')) return 'bank_transfer'
  return c.replace(/_(va|ewallet)$/i, '').replace(/[^a-z0-9]/g, '')
}

function logoPath(code: string): string {
  const base = logoBase(code)
  return BANK_ICONS.has(base) ? `/images/banks/${base}.svg` : '/images/banks/other.svg'
}

const brokenIcons = ref<Set<string>>(new Set())
function onIconError(code: string) {
  brokenIcons.value = new Set([...brokenIcons.value, code])
}
function hasIcon(code: string): boolean {
  return !brokenIcons.value.has(code)
}

// ---- Payment flow ----
const creatingMethod = ref('')
const showMethodModal = ref(false)

function openMethodModal() {
  showMethodModal.value = true
}

function methodCategory(code: string): string {
  return methods.value.find(m => m.code === code)?.category || ''
}

/** Label metode yang sedang dipilih untuk tombol pemilih. */
const selectedMethodLabel = computed(() => {
  if (!selectedMethod.value) return ''
  return methods.value.find(m => m.code === selectedMethod.value)?.name || selectedMethod.value
})

const selectedMethodCategory = computed(() => {
  if (!selectedMethod.value) return ''
  return methods.value.find(m => m.code === selectedMethod.value)?.category || ''
})

const selectedMethodCategoryLabel = computed(() => {
  const cat = selectedMethodCategory.value
  return categoryLabels[cat] || cat
})

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
  showMethodModal.value = false
  // Manual bank transfer → buat payment manual (bukan charge gateway).
  if (code === 'manual_bank_transfer') {
    await payManual()
    return
  }
  // Reuse an existing pending transaction for this method if one already exists.
  const existing = transactions.value.find(
    t => t.payment_method === code && t.status === 'pending',
  )
  if (existing) return
  await createPayment(gateway, code)
}

// ---- Manual Bank Transfer (B.8) ----
const manualPayment = ref<any>(null)
const manualAccounts = ref<any[]>([])
const manualAccountsLoading = ref(false)
const manualConfirmation = ref<any>(null)
const manualConfirmationLoading = ref(false)

/** Payment manual aktif (pending / waiting_verification) untuk invoice ini. */
const activeManualPayment = computed(() => manualPayment.value || null)

async function payManual() {
  creatingMethod.value = 'manual_bank_transfer'
  try {
    const res = await api.post<{ message: string; data: any }>(`/billing/invoices/${invoiceId.value}/pay-manual`)
    manualPayment.value = res.data
    await fetchManualAccounts()
    await fetchManualConfirmation()
    await fetchInvoice()
  }
  catch (e: any) {
    toast.error(e?.message || 'Gagal membuat pembayaran manual')
    if (selectedMethod.value === 'manual_bank_transfer') selectedMethod.value = ''
  }
  finally {
    creatingMethod.value = ''
  }
}

async function fetchManualAccounts() {
  manualAccountsLoading.value = true
  try {
    const res = await api.get<{ data: any[] }>('/billing/payment-methods/manual-bank-transfer/accounts')
    manualAccounts.value = res.data || []
  }
  catch (e: any) {
    manualAccounts.value = []
    toast.error(e?.message || 'Gagal memuat rekening tujuan')
  }
  finally {
    manualAccountsLoading.value = false
  }
}

async function fetchManualConfirmation() {
  if (!activeManualPayment.value?.id) return
  manualConfirmationLoading.value = true
  try {
    const res = await api.get<{ data: any }>(`/billing/payments/${activeManualPayment.value.id}/confirmation`)
    manualConfirmation.value = res.data || null
  }
  catch (e: any) {
    manualConfirmation.value = null
  }
  finally {
    manualConfirmationLoading.value = false
  }
}

// ---- Form konfirmasi manual ----
const confirmForm = reactive({
  sender_bank_name: '',
  sender_account_name: '',
  transfer_amount: 0,
  transfer_date: '',
  transfer_time: '',
  bank_account_id: '',
  note: '',
})
const confirmFile = ref<File | null>(null)
const submittingConfirm = ref(false)
const confirmErrors = ref<Record<string, string[]>>({})

function onConfirmFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  confirmFile.value = target.files?.[0] || null
}

function resetConfirmForm() {
  Object.assign(confirmForm, {
    sender_bank_name: '', sender_account_name: '', transfer_amount: 0,
    transfer_date: '', transfer_time: '', bank_account_id: '', note: '',
  })
  confirmFile.value = null
  confirmErrors.value = {}
}

async function submitConfirmation() {
  if (!activeManualPayment.value?.id) return
  submittingConfirm.value = true
  confirmErrors.value = {}
  try {
    const fd = new FormData()
    if (confirmForm.sender_bank_name) fd.append('sender_bank_name', confirmForm.sender_bank_name)
    if (confirmForm.sender_account_name) fd.append('sender_account_name', confirmForm.sender_account_name)
    if (confirmForm.transfer_amount > 0) fd.append('transfer_amount', String(confirmForm.transfer_amount))
    if (confirmForm.transfer_date) fd.append('transfer_date', confirmForm.transfer_date)
    if (confirmForm.transfer_time) fd.append('transfer_time', confirmForm.transfer_time)
    if (confirmForm.bank_account_id) fd.append('bank_account_id', confirmForm.bank_account_id)
    if (confirmForm.note) fd.append('note', confirmForm.note)
    if (confirmFile.value) fd.append('proof', confirmFile.value)

    await api.post(`/billing/payments/${activeManualPayment.value.id}/confirmation`, fd)
    toast.success('Konfirmasi pembayaran dikirim. Menunggu verifikasi admin.')
    resetConfirmForm()
    await fetchManualConfirmation()
  }
  catch (e: any) {
    if (e?.errors) confirmErrors.value = e.errors
    else toast.error(e?.message || 'Gagal mengirim konfirmasi')
  }
  finally {
    submittingConfirm.value = false
  }
}

/** Nominal invoice untuk form konfirmasi default. */
watch(() => invoice.value?.total, (val) => {
  if (val && !confirmForm.transfer_amount) confirmForm.transfer_amount = val
})

const manualStatusBadge = (status: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Menunggu Transfer', cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
    waiting_verification: { label: 'Menunggu Verifikasi', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
    approved: { label: 'Disetujui', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
    rejected: { label: 'Ditolak', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
    expired: { label: 'Kedaluwarsa', cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
    cancelled: { label: 'Dibatalkan', cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
  }
  return map[status] || { label: status, cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' }
}

const manualRejectReasonLabel: Record<string, string> = {
  amount_mismatch: 'Nominal tidak sesuai',
  invalid_proof: 'Bukti tidak valid',
  unreadable_proof: 'Bukti tidak terbaca',
  not_found: 'Transfer tidak ditemukan',
  wrong_account: 'Rekening tujuan salah',
  already_used: 'Bukti sudah dipakai',
  expired: 'Kedaluwarsa',
  other: 'Lainnya',
}

const bankLogoUrl = (code: string) => `/images/banks/${(code || 'other').toLowerCase()}.svg`

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

/** Nama pemilik / penerima Virtual Account — dari respons gateway bila ada, fallback ke nama bisnis pada invoice. */
function vaName(t: BillingTransaction): string {
  const p = t.response_payload || {}
  const candidate = p.va_name || p.recipient_name || p.bill_name || p.merchant_name || p.bank_name
  if (candidate) return String(candidate)
  return invoice.value?.billing_name || invoice.value?.company_name || ''
}

const activeVaName = computed(() => activeTransaction.value ? vaName(activeTransaction.value) : '')

/** Ref ke komponen QRIS untuk mengambil dataUrl saat download. */
const qrisCodeRef = ref<{ dataUrl: string } | null>(null)

async function downloadQris() {
  const dataUrl = qrisCodeRef.value?.dataUrl
  if (!dataUrl) {
    toast.error('Kode QR belum tersedia')
    return
  }
  try {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `qris-${invoice.value?.invoice_number || 'invoice'}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Kode QR diunduh')
  }
  catch {
    toast.error('Gagal mengunduh kode QR')
  }
}

/** Transaksi pending pertama — untuk countdown meski metode belum dipilih. */
const pendingTransaction = computed<BillingTransaction | null>(() =>
  transactions.value.find(t => t.status === 'pending') || null,
)

/** Batas waktu aktif: transaksi gateway atau payment manual. */
const activeExpiry = computed(() =>
  activeManualPayment.value?.expired_at || pendingTransaction.value?.expiry_at || '',
)

// ---- Countdown expired ----
const countdown = ref('00:00:00')
let countdownTimer: ReturnType<typeof setInterval> | null = null

function updateCountdown() {
  const expiry = activeExpiry.value
  if (!expiry) {
    countdown.value = ''
    return
  }
  const diff = new Date(expiry).getTime() - Date.now()
  if (diff <= 0) {
    countdown.value = '00:00:00'
    return
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  countdown.value = `${pad(h)}:${pad(m)}:${pad(s)}`
}

function startCountdown() {
  stopCountdown()
  updateCountdown()
  countdownTimer = setInterval(updateCountdown, 1000)
}
function stopCountdown() {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null }
}

watch(pendingTransaction, () => updateCountdown())

// ---- Auto refresh while pending ----
let pollTimer: ReturnType<typeof setInterval> | null = null
function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return
    // Manual bank transfer: polling status konfirmasi.
    if (activeManualPayment.value?.id) {
      fetchManualConfirmation()
      fetchInvoice()
      return
    }
    if (isOpen.value && hasPendingTransaction.value) {
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
  startCountdown()
})

onBeforeUnmount(() => {
  stopPolling()
  stopCountdown()
})
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
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

    <!-- Expired banner (PRD §11.3) -->
    <div
      v-else-if="invoice.status === 'expired'"
      class="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200"
    >
      <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
      <div class="flex-1">
        <p class="text-sm font-semibold text-red-800">Invoice Kedaluwarsa</p>
        <p class="mt-0.5 text-xs text-red-600">
          Invoice ini telah lewat jatuh tempo dan tidak dapat dibayar lagi. Silakan lakukan checkout ulang.
        </p>
      </div>
      <NuxtLink
        to="/billing/subscription"
        class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700"
      >
        Checkout Ulang
      </NuxtLink>
    </div>

    <div v-else class="space-y-6">
      <!-- Informasi invoice -->
      <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
          <h2 class="font-semibold text-gray-800">Informasi Invoice</h2>
          <span class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="invoiceBadge(invoice.status).cls">
            {{ invoiceBadge(invoice.status).label }}
          </span>
        </div>

        <dl class="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 text-sm sm:grid-cols-3">
          <div>
            <dt class="text-xs uppercase tracking-wider text-gray-400">Paket</dt>
            <dd class="mt-0.5 font-medium text-gray-800">{{ invoice.plan_name || '-' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wider text-gray-400">Siklus</dt>
            <dd class="mt-0.5 font-medium text-gray-800">{{ billingCycleLabel(invoice.billing_cycle) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wider text-gray-400">Diterbitkan</dt>
            <dd class="mt-0.5 font-medium text-gray-800">{{ formatDate(invoice.created_at) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wider text-gray-400">Jatuh Tempo</dt>
            <dd class="mt-0.5 font-medium text-gray-800">{{ formatDate(invoice.due_date) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wider text-gray-400">Dibayar</dt>
            <dd class="mt-0.5 font-medium text-gray-800">{{ invoice.paid_at ? formatDateTime(invoice.paid_at) : '-' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wider text-gray-400">Total</dt>
            <dd class="mt-0.5 text-base font-bold text-gray-900">{{ formatCurrency(invoice.total) }}</dd>
          </div>
        </dl>
      </div>

      <!-- Status pembayaran: countdown & langkah memilih metode -->
      <div v-if="isOpen" class="overflow-hidden rounded-xl shadow-md ring-1 ring-amber-200">
        <!-- Countdown -->
        <div class="flex flex-wrap items-center gap-4 bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 text-white">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Clock class="h-6 w-6" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold uppercase tracking-wide">Waktu Pembayaran</p>
            <p class="text-xs text-amber-100">
              {{ activeExpiry
                ? 'Selesaikan pembayaran sebelum waktu berakhir.'
                : 'Pilih metode pembayaran di bawah.' }}
            </p>
          </div>
          <div
            v-if="activeExpiry"
            class="shrink-0 rounded-lg bg-black/20 px-3 py-1.5 font-mono text-2xl font-bold tabular-nums tracking-wider"
          >
            {{ countdown }}
          </div>
        </div>

        <!-- Langkah pembayaran -->
        <div class="bg-white px-5 py-4" v-if="!selectedMethod">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400">Langkah Pembayaran</p>
          <ol class="mt-2 space-y-2.5">
            <li class="flex items-start gap-3 text-sm text-gray-700">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">1</span>
              <span>Pilih metode pembayaran dari daftar di bawah (Virtual Account, QRIS, E-Wallet, atau Transfer Bank Manual).</span>
            </li>
            <li class="flex items-start gap-3 text-sm text-gray-700">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">2</span>
              <span>Ikuti instruksi yang muncul (nomor Virtual Account / kode QRIS / lanjut ke payment gateway).</span>
            </li>
            <li class="flex items-start gap-3 text-sm text-gray-700">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">3</span>
              <span>Lakukan pembayaran sebelum waktu habis. Status akan diperbarui otomatis.</span>
            </li>
          </ol>
        </div>
      </div>

      <!-- Pembayaran -->
      <div v-if="isOpen" class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="border-b border-gray-100 px-5 py-4">
          <h2 class="flex items-center gap-2  font-semibold text-gray-800">
            <CreditCard class="h-6 w-6 text-gray-400" /> Pembayaran
          </h2>
        </div>

        <div class="px-5 py-4">
          <!-- Loading metode -->
          <div v-if="methodsLoading" class="grid grid-cols-3 gap-2 sm:grid-cols-4">
            <div v-for="i in 8" :key="i" class="h-16 animate-pulse rounded-lg bg-gray-100" />
          </div>

          <p v-else-if="!methods.length" class="text-center text-sm text-gray-500">
            Tidak ada metode pembayaran tersedia
          </p>

          <!-- Belum pilih metode → grid logo -->
          <template v-else-if="!selectedMethod && !creatingMethod"> 
            <div v-for="cat in CATEGORY_ORDER" :key="cat">
              <div v-if="groupedMethods[cat]?.length" class="mb-4">
                <p class="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400 first:mt-0">
                  {{ categoryLabels[cat] || cat }}
                </p>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="m in groupedMethods[cat]"
                    :key="m.code"
                    type="button"
                    class="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-left transition-colors hover:border-primary-300 hover:bg-primary-50/40"
                    @click="selectMethod(m.gateway || '', m.code)"
                  >
                    <span class="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-gray-100">
                      <img
                        v-if="hasIcon(m.code)"
                        :src="logoPath(m.code)"
                        :alt="m.name"
                        class="h-7 w-14 object-contain rounded-sm"
                        @error="onIconError(m.code)"
                      />
                      <component :is="methodIcon(m.category)" v-else class="h-4 w-4 text-gray-300" />
                    </span>
                    <span class="min-w-0">
                      <span class="line-clamp-2 text-sm font-medium leading-tight text-gray-800">{{ m.name }}</span>
                      <span class="mt-0.5 block text-xs text-gray-400">{{ categoryLabels[m.category] || m.category }}</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- Metode terpilih -->
          <template v-else>
            <div class="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2.5">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-gray-100">
                <img
                  v-if="hasIcon(selectedMethod)"
                  :src="logoPath(selectedMethod)"
                  :alt="selectedMethodLabel"
                  class="h-8 w-8 object-contain"
                  @error="onIconError(selectedMethod)"
                />
                <component :is="methodIcon(selectedMethodCategory)" v-else class="h-5 w-5 text-gray-300" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-gray-900">{{ selectedMethodLabel || 'Pilih Metode' }}</p>
                <p class="text-xs text-gray-400">{{ selectedMethodCategoryLabel || '—' }}</p>
              </div>
              <button
                type="button"
                class="shrink-0 text-xs font-semibold text-primary-600 transition-colors hover:text-primary-700 disabled:opacity-60"
                :disabled="!!creatingMethod"
                @click="openMethodModal"
              >
                Ganti Metode
              </button>
            </div>

            <!-- Instruksi manual bank transfer -->
            <div v-if="selectedMethodCategory === 'manual' && (creatingMethod || activeManualPayment)" class="mt-4 border-gray-100">
              <div v-if="creatingMethod && !activeManualPayment" class="flex flex-col items-center py-8 text-center">
                <Loader2 class="h-8 w-8 animate-spin text-primary-500" />
                <p class="mt-3 text-sm text-gray-500">Membuat pembayaran manual…</p>
              </div>

              <template v-else-if="activeManualPayment">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="font-medium text-gray-800">Transfer Bank Manual</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="manualStatusBadge(activeManualPayment.status).cls">
                    {{ manualStatusBadge(activeManualPayment.status).label }}
                  </span>
                </div>

                <!-- Rekening tujuan -->
                <div class="mt-4 space-y-2">
                  <p class="text-xs font-semibold uppercase tracking-wider text-gray-400">Transfer ke Rekening</p>
                  <div v-if="manualAccountsLoading" class="space-y-2">
                    <div v-for="i in 2" :key="i" class="h-14 animate-pulse rounded-lg bg-gray-100" />
                  </div>
                  <div v-else class="space-y-2">
                    <div
                      v-for="acc in manualAccounts"
                      :key="acc.id"
                      class="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5 ring-1 ring-gray-100"
                    >
                      <span class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-gray-100">
                        <img
                          :src="bankLogoUrl(acc.bank_code || acc.bank_name)"
                          :alt="acc.bank_name"
                          class="h-7 w-7 object-contain"
                          @error="($event.target as HTMLImageElement).src = '/images/banks/other.svg'"
                        >
                      </span>
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-semibold text-gray-900">{{ acc.bank_name }}</p>
                        <p class="font-mono text-sm text-gray-700">{{ acc.account_number }}</p>
                        <p class="text-xs text-gray-400">a.n. {{ acc.account_name }}</p>
                      </div>
                      <button
                        type="button"
                        class="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-white"
                        @click="copyText(acc.account_number, `acc-${acc.id}`)"
                      >
                        <Check v-if="copiedId === `acc-${acc.id}`" class="h-3.5 w-3.5 text-green-500" />
                        <Copy v-else class="h-3.5 w-3.5" />
                        {{ copiedId === `acc-${acc.id}` ? 'Tersalin' : 'Salin' }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Total -->
                <div class="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
                  <span class="text-sm text-gray-600">Total yang ditransfer</span>
                  <span class="text-lg font-bold text-gray-900">{{ formatCurrency(invoice.total) }}</span>
                </div>

                <!-- Menunggu verifikasi -->
                <div v-if="activeManualPayment.status === 'waiting_verification'" class="mt-4 rounded-lg bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
                  <p class="text-sm font-semibold text-amber-800">Menunggu Verifikasi Admin</p>
                  <p class="mt-0.5 text-xs text-amber-700">
                    Bukti transfer Anda sedang diverifikasi. Invoice akan ditandai lunas setelah disetujui.
                  </p>
                </div>

                <!-- Ditolak -->
                <div v-else-if="activeManualPayment.status === 'rejected'" class="mt-4 rounded-lg bg-red-50 px-4 py-3 ring-1 ring-red-200">
                  <p class="text-sm font-semibold text-red-800">Pembayaran Ditolak</p>
                  <p v-if="manualConfirmation" class="mt-0.5 text-xs text-red-700">
                    {{ manualRejectReasonLabel[manualConfirmation.rejection_reason] || manualConfirmation.rejection_reason }}
                    <span v-if="manualConfirmation.rejection_note"> — {{ manualConfirmation.rejection_note }}</span>
                  </p>
                </div>

                <!-- Form konfirmasi (pending) -->
                <template v-else-if="activeManualPayment.status === 'pending'">
                  <div class="mt-4 border-t border-gray-100 pt-4">
                    <p class="mb-1 text-sm font-semibold text-gray-900">Konfirmasi Transfer</p>
                    <p class="mb-3 text-xs text-gray-400">Setelah transfer selesai, kirim bukti transfer untuk diverifikasi admin.</p>

                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="mb-1 block text-xs font-medium text-gray-600">Bank Pengirim</label>
                        <input v-model="confirmForm.sender_bank_name" type="text" placeholder="BCA" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20" />
                        <p v-if="confirmErrors.sender_bank_name" class="mt-1 text-xs text-red-600">{{ confirmErrors.sender_bank_name.join(', ') }}</p>
                      </div>
                      <div>
                        <label class="mb-1 block text-xs font-medium text-gray-600">Atas Nama Pengirim</label>
                        <input v-model="confirmForm.sender_account_name" type="text" placeholder="Budi Santoso" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20" />
                        <p v-if="confirmErrors.sender_account_name" class="mt-1 text-xs text-red-600">{{ confirmErrors.sender_account_name.join(', ') }}</p>
                      </div>
                    </div>

                    <div class="mt-3">
                      <label class="mb-1 block text-xs font-medium text-gray-600">Nominal Transfer</label>
                      <input v-model.number="confirmForm.transfer_amount" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20" />
                      <p v-if="confirmErrors.transfer_amount" class="mt-1 text-xs text-red-600">{{ confirmErrors.transfer_amount.join(', ') }}</p>
                    </div>

                    <div class="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <label class="mb-1 block text-xs font-medium text-gray-600">Tanggal Transfer</label>
                        <input v-model="confirmForm.transfer_date" type="date" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20" />
                        <p v-if="confirmErrors.transfer_date" class="mt-1 text-xs text-red-600">{{ confirmErrors.transfer_date.join(', ') }}</p>
                      </div>
                      <div>
                        <label class="mb-1 block text-xs font-medium text-gray-600">Jam Transfer</label>
                        <input v-model="confirmForm.transfer_time" type="time" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20" />
                        <p v-if="confirmErrors.transfer_time" class="mt-1 text-xs text-red-600">{{ confirmErrors.transfer_time.join(', ') }}</p>
                      </div>
                    </div>

                    <div class="mt-3">
                      <label class="mb-1 block text-xs font-medium text-gray-600">Rekening Tujuan</label>
                      <select v-model="confirmForm.bank_account_id" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20">
                        <option value="">Pilih rekening tujuan</option>
                        <option v-for="acc in manualAccounts" :key="acc.id" :value="acc.id">{{ acc.bank_name }} - {{ acc.account_number }}</option>
                      </select>
                    </div>

                    <div class="mt-3">
                      <label class="mb-1 block text-xs font-medium text-gray-600">Bukti Transfer <span class="text-gray-400">(jpg/jpeg/png/webp/pdf, maks 5MB)</span></label>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-600 hover:file:bg-primary-100"
                        @change="onConfirmFileChange"
                      />
                      <p v-if="confirmErrors.proof" class="mt-1 text-xs text-red-600">{{ confirmErrors.proof.join(', ') }}</p>
                    </div>

                    <div class="mt-3">
                      <label class="mb-1 block text-xs font-medium text-gray-600">Catatan</label>
                      <textarea v-model="confirmForm.note" rows="2" placeholder="Opsional" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20" />
                    </div>

                    <p v-if="confirmErrors.payment" class="mt-2 text-xs text-red-600">{{ confirmErrors.payment.join(', ') }}</p>

                    <button
                      type="button"
                      class="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
                      :disabled="submittingConfirm"
                      @click="submitConfirmation"
                    >
                      <Loader2 v-if="submittingConfirm" class="h-4 w-4 animate-spin" />
                      Kirim Bukti Transfer
                    </button>
                  </div>
                </template>
              </template>
            </div>

            <!-- Instruksi pembayaran gateway -->
            <div v-else-if="creatingMethod || activeTransaction" class="mt-4 border-gray-100">
            <div v-if="creatingMethod && !activeTransaction" class="flex flex-col items-center py-8 text-center">
              <Loader2 class="h-8 w-8 animate-spin text-primary-500" />
              <p class="mt-3 text-sm text-gray-500">Membuat instruksi pembayaran…</p>
            </div>

            <div v-else-if="activeTransaction">
              <!-- <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="font-medium text-gray-800">{{ methodLabel(activeTransaction.payment_method) }}</span>
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="transactionBadge(activeTransaction.status).cls"
                >
                  {{ transactionBadge(activeTransaction.status).label }}
                </span>
              </div> -->
              <!-- <p v-if="activeTransaction.expiry_at" class="mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-400">
                <Clock class="h-3.5 w-3.5" /> Bayar sebelum
                <span class="font-mono text-sm font-bold tabular-nums text-red-600">{{ countdown }}</span>
                <span>({{ formatDateTime(activeTransaction.expiry_at) }})</span>
              </p> -->

              <!-- QRIS -->
              <div v-if="activeTransaction.qr_string" class="mt-4 rounded-lg bg-gray-50 px-4 py-5 ring-1 ring-gray-100">
                <div class="flex items-center justify-between gap-2">
                  <div>
                    <p class="text-sm font-semibold text-gray-900">{{ methodLabel(activeTransaction.payment_method) }}</p>
                    <p class="text-xs text-gray-400">Scan kode QR untuk membayar</p>
                  </div>
                  <button
                    type="button"
                    class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-white"
                    @click="downloadQris"
                  >
                    <Download class="h-3.5 w-3.5" /> Download QR
                  </button>
                </div>

                <div class="mt-4 flex flex-col items-center rounded-lg bg-white px-5 py-5 ring-1 ring-gray-100">
                  <AppQrisCode ref="qrisCodeRef" :value="activeTransaction.qr_string" />
                </div>

                <div class="mt-4 flex flex-col items-center border-t border-gray-200 pt-4">
                  <p class="text-xs text-gray-400">Total Pembayaran</p>
                  <p class="mt-0.5 text-2xl font-bold text-gray-900">{{ formatCurrency(invoice.total) }}</p>
                </div>
              </div>

              <!-- VA -->
              <div v-else-if="activeTransaction.va_number" class="mt-4 rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-xs text-gray-400">{{ methodLabel(activeTransaction.payment_method) }}</p>
                    <p class="mt-0.5 font-mono text-lg font-semibold tracking-wider text-gray-900">{{ activeTransaction.va_number }}</p>
                    <p v-if="activeVaName" class="mt-0.5 text-sm font-medium text-gray-700">a.n. {{ activeVaName }}</p>
                    <p class="mt-0.5 text-sm font-medium text-gray-700">Total: {{ formatCurrency(invoice.total) }}</p>
                  </div>
                  <button
                    type="button"
                    class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-white"
                    @click="copyText(activeTransaction.va_number, activeTransaction.id)"
                  >
                    <Check v-if="copiedId === activeTransaction.id" class="h-3.5 w-3.5 text-green-500" />
                    <Copy v-else class="h-3.5 w-3.5" />
                    {{ copiedId === activeTransaction.id ? 'Tersalin' : 'Salin' }}
                  </button>
                </div>
              </div>

              <!-- Redirect URL -->
              <a
                v-else-if="activeTransaction.payment_url"
                :href="activeTransaction.payment_url"
                target="_blank"
                rel="noopener"
                class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                <CreditCard class="h-4 w-4" /> Lanjutkan Pembayaran
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
          <p v-else class="mt-3 text-xs text-gray-400">Instruksi pembayaran akan tampil setelah metode dipilih.</p>
          </template>
        </div>
      </div>

      <!-- Lunas -->
      <div v-else-if="invoice.status === 'paid'" class="flex items-center gap-3 rounded-xl bg-green-50 px-5 py-5 ring-1 ring-green-200">
        <Check class="h-7 w-7 text-green-600" />
        <div>
          <p class="text-sm font-semibold text-green-800">Invoice Lunas</p>
          <p class="text-xs text-green-600">Terima kasih, pembayaran telah diterima.</p>
        </div>
      </div>

      <!-- Ringkasan pesanan -->
      <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="border-b border-gray-100 px-5 py-4">
          <h2 class="font-semibold text-gray-800">Ringkasan Pesanan</h2>
        </div>

        <div class="px-5 py-4">
          <div class="space-y-2.5">
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

      <!-- Ditagihkan kepada -->
      <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="border-b border-gray-100 px-5 py-4">
          <h2 class="font-semibold text-gray-800">Ditagihkan Kepada</h2>
        </div>
        <div class="space-y-1 px-5 py-4 text-sm">
          <p class="font-medium text-gray-900">{{ invoice.billing_name || invoice.company_name || '-' }}</p>
          <p class="text-gray-600">{{ invoice.billing_email || '-' }}</p>
          <p class="text-gray-600">{{ invoice.billing_address || '-' }}</p>
        </div>
      </div>
 
    </div>
  </div>

  <!-- Popup ganti metode pembayaran -->
  <Teleport to="body">
    <div
      v-if="showMethodModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="showMethodModal = false"
    >
      <div class="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 class="flex items-center gap-2 font-semibold text-gray-800">
            <CreditCard class="h-6 w-6 text-gray-400" /> Ganti Metode Pembayaran
          </h3>
          <button class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="showMethodModal = false">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-4">
          <p v-if="!methods.length" class="px-4 py-8 text-center text-sm text-gray-500">
            Tidak ada metode pembayaran tersedia
          </p>

          <div v-for="cat in CATEGORY_ORDER" :key="cat">
            <div v-if="groupedMethods[cat]?.length" class="mb-4">
              <p class="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400 first:mt-0">
                {{ categoryLabels[cat] || cat }}
              </p>
              <div class="grid grid-cols-1 gap-2">
                <button
                  v-for="m in groupedMethods[cat]"
                  :key="m.code"
                  type="button"
                  class="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors"
                  :class="selectedMethod === m.code
                    ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-500/20'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/40'"
                  @click="selectMethod(m.gateway || '', m.code)"
                >
                  <span class="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-gray-100">
                    <img
                      v-if="hasIcon(m.code)"
                      :src="logoPath(m.code)"
                      :alt="m.name"
                      class="h-8 w-14 object-contain rounded-sm"
                      @error="onIconError(m.code)"
                    />
                    <component :is="methodIcon(m.category)" v-else class="h-4 w-4 text-gray-300" />
                  </span>
                  <span class="min-w-0">
                    <span class="line-clamp-2 text-sm font-medium leading-tight text-gray-800">{{ m.name }}</span>
                    <span class="mt-0.5 block text-xs text-gray-400">{{ categoryLabels[m.category] || m.category }}</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
