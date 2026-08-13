<script setup lang="ts">
import {
  Receipt, RefreshCw, Loader2, Check, Crown, CalendarClock, XCircle,
  Inbox, AlertTriangle, PackagePlus, Gauge, FileText, ChevronRight,
  ArrowRight, Plus, Eye, Sparkles,
} from 'lucide-vue-next'
import { formatCurrency, formatDate } from '~/composables/useFormatters'
import { subscriptionBadge, invoiceBadge, billingCycleLabel } from '~/composables/useBilling'
import type { Subscription, Paginated, SubscriptionAddon, FeatureUsage, Invoice } from '~/types'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

// ---- Current subscription ----
const subscription = ref<Subscription | null>(null)
const subLoading = ref(true)

async function fetchSubscription() {
  subLoading.value = true
  try {
    const res = await api.get<{ data: Subscription | null }>('/billing/subscription')
    subscription.value = res.data || null
  }
  catch (e: any) {
    subscription.value = null
    toast.error(e?.message || 'Gagal memuat langganan')
  }
  finally {
    subLoading.value = false
  }
}

const hasActiveSubscription = computed(() => {
  const s = subscription.value
  if (!s) return false
  return ['trial', 'active', 'grace_period', 'past_due', 'pending_activation'].includes(s.status)
})

/** Banner status sesuai PRD §11.3 — trial / grace_period / past_due / pending_activation. */
const statusBanner = computed<{ type: 'info' | 'warning' | 'danger'; title: string; message: string } | null>(() => {
  const s = subscription.value
  if (!s) return null
  switch (s.status) {
    case 'trial':
      return {
        type: 'info',
        title: 'Masa percobaan (Trial)',
        message: `Trial berakhir ${formatDate(s.trial_ends_at || '')}. Pilih paket dan lakukan checkout untuk terus menggunakan layanan.`,
      }
    case 'grace_period':
      return {
        type: 'warning',
        title: 'Masa tenggang (Grace Period)',
        message: `Perpanjang segera sebelum ${formatDate(s.grace_ends_at || '')} agar layanan tidak ditangguhkan.`,
      }
    case 'past_due':
      return {
        type: 'danger',
        title: 'Tagihan Jatuh Tempo',
        message: 'Langganan Anda telah melewati jatuh tempo. Segera lakukan pembayaran invoice untuk melanjutkan layanan.',
      }
    case 'pending_activation':
      return {
        type: 'info',
        title: 'Menunggu Aktivasi',
        message: 'Pembayaran sedang diverifikasi. Langganan akan aktif otomatis setelah invoice lunas.',
      }
    case 'suspended':
      return {
        type: 'danger',
        title: 'Langganan Ditangguhkan',
        message: 'Akses layanan dibatasi. Silakan hubungi dukungan atau lakukan checkout ulang.',
      }
    case 'expired':
      return {
        type: 'danger',
        title: 'Langganan Kedaluwarsa',
        message: 'Masa langganan telah habis. Pilih paket untuk berlangganan kembali.',
      }
    default:
      return null
  }
})

const bannerCls: Record<string, string> = {
  info: 'bg-blue-50 text-blue-800 ring-blue-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-red-50 text-red-800 ring-red-200',
}
const bannerIconCls: Record<string, string> = {
  info: 'text-blue-500',
  warning: 'text-amber-500',
  danger: 'text-red-500',
}

// ---- Active add-ons ----
const addons = ref<SubscriptionAddon[]>([])
const addonLoading = ref(true)

const featureName: Record<string, string> = {
  order_per_month: 'Order per bulan',
  marketplace_channel: 'Channel marketplace',
  warehouse_count: 'Jumlah gudang',
  product_count: 'Jumlah produk',
  staff_count: 'Jumlah staff',
  fifo_multi_warehouse: 'FIFO & multi-gudang',
  cod_reconciliation: 'Rekonsiliasi COD',
  analytics_finance: 'Analytics & finance',
  team_role_permission: 'Role & permission tim',
  api_webhook: 'API & webhook',
  support_level: 'Dukungan',
}

async function fetchAddons() {
  addonLoading.value = true
  try {
    const res = await api.get<{ data: SubscriptionAddon[] }>('/billing/subscription/addons')
    addons.value = res.data || []
  }
  catch (e: any) {
    addons.value = []
    toast.error(e?.message || 'Gagal memuat add-on')
  }
  finally {
    addonLoading.value = false
  }
}

const activeAddons = computed(() =>
  addons.value.filter(a => !a.expires_at || new Date(a.expires_at).getTime() > Date.now()),
)

// ---- Usage ----
const usages = ref<FeatureUsage[]>([])
const usageLoading = ref(true)

async function fetchUsage() {
  usageLoading.value = true
  try {
    const res = await api.get<{ data: FeatureUsage[] }>('/billing/subscription/usage')
    usages.value = res.data || []
  }
  catch (e: any) {
    usages.value = []
    toast.error(e?.message || 'Gagal memuat pemakaian')
  }
  finally {
    usageLoading.value = false
  }
}

/** Persentase pemakaian, 0 jika unlimited. */
function usagePercent(u: FeatureUsage): number {
  if (u.unlimited || u.limit_value === '-1' || u.limit_value === 'unlimited') return 0
  const limit = Number(u.limit_value) || 0
  if (limit <= 0) return 0
  return Math.min(100, Math.round((u.usage / limit) * 100))
}

function barColor(u: FeatureUsage): string {
  const pct = usagePercent(u)
  if (pct >= 90) return 'bg-red-500'
  if (pct >= 70) return 'bg-amber-500'
  return 'bg-primary-600'
}

function usageText(u: FeatureUsage): string {
  if (u.unlimited || u.limit_value === '-1' || u.limit_value === 'unlimited') {
    return `${u.usage.toLocaleString()} / tanpa batas`
  }
  return `${u.usage.toLocaleString()} / ${Number(u.limit_value).toLocaleString()}`
}

// Popup detail pemakaian
const showUsageModal = ref(false)

// ---- Invoices ----
const invoices = ref<Invoice[]>([])
const invoiceLoading = ref(true)

async function fetchInvoices() {
  invoiceLoading.value = true
  try {
    const res = await api.get<{ data: Paginated<Invoice> }>('/billing/invoices', { page: '1', perpage: '5' })
    invoices.value = res.data?.data || []
  }
  catch (e: any) {
    invoices.value = []
    toast.error(e?.message || 'Gagal memuat invoice')
  }
  finally {
    invoiceLoading.value = false
  }
}

// ---- Cancel subscription ----
const cancelling = ref(false)

async function cancelSubscription(immediately: boolean) {
  const ok = await confirm({
    title: immediately ? 'Batalkan Langganan Sekarang' : 'Batalkan di Akhir Periode',
    message: immediately
      ? 'Langganan akan dibatalkan segera dan akses fitur berbayar berhenti. Lanjutkan?'
      : 'Langganan tetap aktif sampai akhir periode berjalan, lalu tidak diperpanjang. Lanjutkan?',
    confirmText: 'Batalkan Langganan',
  })
  if (!ok) return
  cancelling.value = true
  try {
    const res = await api.post<{ message: string; data: Subscription }>('/billing/subscription/cancel', { immediately })
    subscription.value = res.data
    toast.success(res.message || 'Langganan dibatalkan')
  }
  catch (e: any) {
    toast.error(e?.message || 'Gagal membatalkan langganan')
  }
  finally {
    cancelling.value = false
  }
}

function refreshAll() {
  fetchSubscription()
  fetchAddons()
  fetchUsage()
  fetchInvoices()
}

onMounted(() => {
  fetchSubscription()
  fetchAddons()
  fetchUsage()
  fetchInvoices()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Receipt class="h-5 w-5 text-primary-600" />
          Langganan
        </h1>
        <p class="mt-0.5 text-sm text-gray-500">Pusat informasi paket, add-on, pemakaian, dan tagihan Anda</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
        :disabled="subLoading || addonLoading || usageLoading || invoiceLoading"
        @click="refreshAll"
      >
        <RefreshCw :class="['h-3.5 w-3.5', (subLoading || addonLoading || usageLoading || invoiceLoading) && 'animate-spin']" />
        Refresh
      </button>
    </div>

    <BillingTabs />

    <!-- Status banner (PRD §11.3) -->
    <div
      v-if="statusBanner"
      class="flex items-start gap-3 rounded-xl px-4 py-3 ring-1"
      :class="bannerCls[statusBanner.type]"
    >
      <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0" :class="bannerIconCls[statusBanner.type]" />
      <div>
        <p class="text-sm font-semibold">{{ statusBanner.title }}</p>
        <p class="mt-0.5 text-xs opacity-80">{{ statusBanner.message }}</p>
      </div>
    </div>

    <!-- No subscription CTA -->
    <div v-if="subLoading" class="rounded-xl bg-white p-6 shadow-xs ring-1 ring-gray-200">
      <div class="h-6 w-48 animate-pulse rounded bg-gray-200" />
      <div class="mt-3 h-4 w-72 animate-pulse rounded bg-gray-100" />
    </div>

    <div v-else-if="!subscription" class="rounded-xl bg-white px-5 py-12 text-center shadow-xs ring-1 ring-gray-200">
      <Inbox class="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p class="text-sm font-medium text-gray-700">Belum ada langganan aktif</p>
      <p class="mt-1 text-sm text-gray-500">Pilih paket yang sesuai untuk mulai menggunakan layanan.</p>
      <NuxtLink
        to="/billing/pricing"
        class="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
      >
        <Sparkles class="h-4 w-4" /> Lihat Paket &amp; Harga
      </NuxtLink>
    </div>

    <template v-else>
      <!-- Paket aktif -->
      <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="border-b border-gray-100 px-5 py-4">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Crown class="h-4 w-4 text-amber-500" /> Paket Aktif
          </h2>
        </div>

        <div class="px-5 py-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-lg font-bold text-gray-900">{{ subscription.plan_version?.plan?.name || '-' }}</span>
              <span
                class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="subscriptionBadge(subscription.status).cls"
              >
                {{ subscriptionBadge(subscription.status).label }}
              </span>
            </div>
            <p class="text-sm text-gray-600">
              {{ formatCurrency(subscription.plan_version?.price || 0) }}
              <span class="text-gray-400">/ {{ billingCycleLabel(subscription.billing_cycle) }}</span>
            </p>
          </div>

          <div class="flex flex-col items-end gap-2">
            <div v-if="subscription.cancel_at_period_end" class="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
              <AlertTriangle class="h-3.5 w-3.5" /> Akan berhenti di akhir periode
            </div>
          </div>
        </div>

        <dl class="mt-5 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <dt class="text-xs uppercase tracking-wider text-gray-400">Mulai</dt>
            <dd class="mt-0.5 font-medium text-gray-800">{{ formatDate(subscription.starts_at || '') }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wider text-gray-400">Berakhir</dt>
            <dd class="mt-0.5 font-medium text-gray-800">{{ formatDate(subscription.ends_at || '') }}</dd>
          </div>
          <div v-if="subscription.trial_ends_at">
            <dt class="text-xs uppercase tracking-wider text-gray-400">Trial Berakhir</dt>
            <dd class="mt-0.5 font-medium text-gray-800">{{ formatDate(subscription.trial_ends_at) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wider text-gray-400">Perpanjang Otomatis</dt>
            <dd class="mt-0.5 font-medium" :class="subscription.auto_renew ? 'text-green-600' : 'text-gray-500'">
              {{ subscription.auto_renew ? 'Aktif' : 'Nonaktif' }}
            </dd>
          </div>
        </dl>

        <div v-if="hasActiveSubscription && subscription.status !== 'cancelled'" class="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          <NuxtLink
            to="/billing/pricing"
            class="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <ArrowRight class="h-4 w-4" /> Ubah / Perpanjang Paket
          </NuxtLink>
          <button
            v-if="!subscription.cancel_at_period_end"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
            :disabled="cancelling"
            @click="cancelSubscription(false)"
          >
            <CalendarClock class="h-4 w-4" /> Batalkan di Akhir Periode
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
            :disabled="cancelling"
            @click="cancelSubscription(true)"
          >
            <Loader2 v-if="cancelling" class="h-4 w-4 animate-spin" />
            <XCircle v-else class="h-4 w-4" /> Batalkan Sekarang
          </button>
        </div>
        </div>
      </div>

      <!-- Add-on aktif -->
      <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <PackagePlus class="h-4 w-4 text-primary-600" /> Add-on Aktif
          </h2>
          <NuxtLink
            to="/billing/pricing"
            class="inline-flex items-center gap-1 rounded-lg text-xs font-medium text-primary-600 transition-colors hover:text-primary-700"
          >
            <Plus class="h-3.5 w-3.5" /> Beli Add-on
          </NuxtLink>
        </div>

        <div v-if="addonLoading" class="space-y-2 px-5 py-4">
          <div v-for="i in 2" :key="i" class="h-12 animate-pulse rounded-lg bg-gray-100" />
        </div>

        <div v-else-if="!activeAddons.length" class="px-5 py-8 text-center">
          <Inbox class="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p class="text-sm text-gray-500">Belum ada add-on aktif.</p>
        </div>

        <div v-else class="divide-y divide-gray-100">
          <div v-for="a in activeAddons" :key="a.id" class="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900">{{ a.addon?.name || a.feature_code }}</p>
              <p class="text-xs text-gray-400">{{ featureName[a.feature_code] || a.feature_code }} · berlaku hingga {{ formatDate(a.expires_at || '') }}</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-600 ring-1 ring-primary-200">+{{ a.limit_value }}</span>
              <span class="text-sm font-medium text-gray-900">{{ formatCurrency(a.price) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pemakaian (compact) -->
      <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Gauge class="h-4 w-4 text-primary-600" /> Pemakaian
          </h2>
          <button
            v-if="usages.length"
            type="button"
            class="inline-flex items-center gap-1 rounded-lg text-xs font-medium text-primary-600 transition-colors hover:text-primary-700"
            @click="showUsageModal = true"
          >
            <Eye class="h-3.5 w-3.5" /> Detail
          </button>
        </div>

        <div v-if="usageLoading" class="space-y-2 px-5 py-4">
          <div v-for="i in 3" :key="i" class="h-9 animate-pulse rounded-lg bg-gray-100" />
        </div>

        <div v-else-if="!usages.length" class="px-5 py-8 text-center">
          <p class="text-sm text-gray-500">Belum ada data pemakaian.</p>
        </div>

        <div v-else class="grid grid-cols-1 gap-x-6 gap-y-3 px-5 py-4 md:grid-cols-2">
          <div v-for="u in usages" :key="u.feature_code">
            <div class="flex items-center justify-between gap-2 text-xs">
              <span class="truncate font-medium text-gray-700">{{ u.feature_name || u.feature_code }}</span>
              <span class="shrink-0 text-gray-500">{{ usageText(u) }}</span>
            </div>
            <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                class="h-full rounded-full transition-all"
                :class="barColor(u)"
                :style="{ width: `${usagePercent(u)}%` }"
              />
            </div>
          </div>
        </div>
      </div>

    </template>
      <!-- Invoice terbaru -->
      <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
        <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <FileText class="h-4 w-4 text-primary-600" /> Invoice Terbaru
          </h2>
          <NuxtLink
            to="/billing/invoice"
            class="inline-flex items-center gap-1 rounded-lg text-xs font-medium text-primary-600 transition-colors hover:text-primary-700"
          >
            Lihat Semua <ChevronRight class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>

        <div v-if="invoiceLoading" class="space-y-2 px-5 py-4">
          <div v-for="i in 3" :key="i" class="h-10 animate-pulse rounded-lg bg-gray-100" />
        </div>

        <div v-else-if="!invoices.length" class="px-5 py-8 text-center">
          <Inbox class="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p class="text-sm text-gray-500">Belum ada invoice.</p>
        </div>

        <div v-else class="divide-y divide-gray-100">
          <NuxtLink
            v-for="inv in invoices"
            :key="inv.id"
            :to="`/billing/invoice/${inv.id}`"
            class="flex flex-wrap items-center justify-between gap-2 px-5 py-3 transition-colors hover:bg-gray-50/50"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900">{{ inv.invoice_number }}</p>
              <p class="text-xs text-gray-400">{{ inv.plan_name || '-' }} · jatuh tempo {{ formatDate(inv.due_date) }}</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="invoiceBadge(inv.status).cls">
                {{ invoiceBadge(inv.status).label }}
              </span>
              <span class="text-sm font-semibold text-gray-900">{{ formatCurrency(inv.total) }}</span>
              <ChevronRight class="h-4 w-4 text-gray-300" />
            </div>
          </NuxtLink>
        </div>
      </div>

    <!-- Popup detail pemakaian -->
    <Teleport to="body">
      <div
        v-if="showUsageModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        @click.self="showUsageModal = false"
      >
        <div class="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Gauge class="h-4 w-4 text-primary-600" /> Detail Pemakaian Fitur
            </h3>
            <button class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="showUsageModal = false">
              <XCircle class="h-4 w-4" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-5 py-4">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div
                v-for="u in usages"
                :key="u.feature_code"
                class="rounded-lg border border-gray-100 bg-gray-50/50 p-4"
              >
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="text-sm font-semibold text-gray-900">{{ u.feature_name || u.feature_code }}</p>
                    <p class="mt-0.5 text-xs text-gray-400">{{ u.category || 'fitur' }}</p>
                  </div>
                  <AlertTriangle v-if="usagePercent(u) >= 90" class="h-4 w-4 shrink-0 text-amber-500" />
                  <Check v-else-if="usagePercent(u) < 70" class="h-4 w-4 shrink-0 text-green-500" />
                </div>

                <div class="mt-3">
                  <div class="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="barColor(u)"
                      :style="{ width: `${usagePercent(u)}%` }"
                    />
                  </div>
                  <div class="mt-2 flex items-center justify-between text-xs">
                    <span class="font-medium text-gray-700">{{ usageText(u) }}</span>
                    <span v-if="!u.unlimited" :class="usagePercent(u) >= 90 ? 'font-semibold text-red-600' : 'text-gray-400'">
                      sisa {{ u.remaining >= 0 ? u.remaining.toLocaleString() : 0 }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p class="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
              Pemakaian diperbarui otomatis. Saat limit habis, fitur terkait akan diblokir hingga periode berikutnya.
            </p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
