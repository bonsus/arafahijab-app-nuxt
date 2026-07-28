<script setup lang="ts">
import {
  Receipt, RefreshCw, Loader2, Check, Crown, CalendarClock, XCircle,
  Sparkles, ArrowUpCircle, ArrowDownCircle, RotateCw, Inbox, AlertTriangle,
} from 'lucide-vue-next'
import { formatCurrency, formatDate } from '~/composables/useFormatters'
import { subscriptionBadge, billingCycleLabel } from '~/composables/useBilling'
import type { Plan, PlanVersion, Subscription, CheckoutResult, Paginated } from '~/types'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const router = useRouter()

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

// ---- Plan catalog ----
const plans = ref<Plan[]>([])
const plansLoading = ref(true)

async function fetchPlans() {
  plansLoading.value = true
  try {
    const res = await api.get<{ data: Paginated<Plan> }>('/billing/plans', { perpage: '100' })
    plans.value = res.data?.data || []
  }
  catch (e: any) {
    plans.value = []
    toast.error(e?.message || 'Gagal memuat daftar paket')
  }
  finally {
    plansLoading.value = false
  }
}

/** Flatten each plan into its active version(s) for display. */
interface PlanOffer {
  plan: Plan
  version: PlanVersion
}

const offers = computed<PlanOffer[]>(() => {
  const list: PlanOffer[] = []
  for (const plan of plans.value) {
    const versions = (plan.versions || []).filter(v => v.is_active)
    for (const version of versions) {
      list.push({ plan, version })
    }
  }
  return list
})

const currentVersionId = computed(() => subscription.value?.plan_version_id || '')
const currentPrice = computed(() => subscription.value?.plan_version?.price ?? 0)

function isCurrent(offer: PlanOffer): boolean {
  return offer.version.id === currentVersionId.value
}

/** Determine the checkout action for a given offer relative to the current subscription. */
function offerAction(offer: PlanOffer): 'new' | 'renew' | 'upgrade' | 'downgrade' {
  if (!hasActiveSubscription.value) return 'new'
  if (isCurrent(offer)) return 'renew'
  return offer.version.price >= currentPrice.value ? 'upgrade' : 'downgrade'
}

const actionMeta: Record<string, { label: string; icon: any; cls: string }> = {
  new: { label: 'Berlangganan', icon: Sparkles, cls: 'bg-primary-600 text-white hover:bg-primary-700' },
  renew: { label: 'Perpanjang', icon: RotateCw, cls: 'bg-primary-600 text-white hover:bg-primary-700' },
  upgrade: { label: 'Upgrade', icon: ArrowUpCircle, cls: 'bg-primary-600 text-white hover:bg-primary-700' },
  downgrade: { label: 'Downgrade', icon: ArrowDownCircle, cls: 'border border-gray-300 text-gray-700 hover:bg-gray-50' },
}

// ---- Checkout ----
const checkoutTarget = ref<PlanOffer | null>(null)
const checkoutAutoRenew = ref(true)
const checkingOut = ref(false)
const showCheckout = ref(false)

function openCheckout(offer: PlanOffer) {
  checkoutTarget.value = offer
  checkoutAutoRenew.value = true
  showCheckout.value = true
}

function closeCheckout() {
  if (checkingOut.value) return
  showCheckout.value = false
  checkoutTarget.value = null
}

const checkoutAction = computed(() => checkoutTarget.value ? offerAction(checkoutTarget.value) : 'new')

async function submitCheckout() {
  if (!checkoutTarget.value) return
  const action = checkoutAction.value
  checkingOut.value = true
  try {
    const body: Record<string, unknown> = {
      type: action,
      plan_version_id: checkoutTarget.value.version.id,
    }
    if (action === 'new') body.auto_renew = checkoutAutoRenew.value

    const res = await api.post<{ message: string; data: CheckoutResult }>('/billing/checkout', body)
    const result = res.data
    toast.success(res.message || 'Checkout berhasil')
    showCheckout.value = false
    checkoutTarget.value = null

    if (result?.invoice?.id) {
      router.push(`/billing/invoice/${result.invoice.id}`)
      return
    }
    // Downgrade: no invoice, effective at period end
    await fetchSubscription()
  }
  catch (e: any) {
    toast.error(e?.message || 'Checkout gagal')
  }
  finally {
    checkingOut.value = false
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

function featureLabel(value: string, dataType: string): string {
  if (dataType === 'boolean') return value === 'true' ? 'Ya' : 'Tidak'
  return value
}

function refreshAll() {
  fetchSubscription()
  fetchPlans()
}

onMounted(() => {
  fetchSubscription()
  fetchPlans()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Receipt class="h-5 w-5 text-primary-600" />
          Billing &amp; Langganan
        </h1>
        <p class="mt-0.5 text-sm text-gray-500">Kelola paket langganan, perpanjangan, dan pembatalan</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
        :disabled="subLoading || plansLoading"
        @click="refreshAll"
      >
        <RefreshCw :class="['h-3.5 w-3.5', (subLoading || plansLoading) && 'animate-spin']" />
        Refresh
      </button>
    </div>

    <BillingTabs />

    <!-- Current subscription -->
    <div class="rounded-xl bg-white shadow-xs ring-1 ring-gray-200">
      <div class="border-b border-gray-100 px-5 py-4">
        <h2 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Crown class="h-4 w-4 text-amber-500" /> Langganan Saat Ini
        </h2>
      </div>

      <div v-if="subLoading" class="px-5 py-6">
        <div class="h-6 w-40 animate-pulse rounded bg-gray-200" />
        <div class="mt-3 h-4 w-64 animate-pulse rounded bg-gray-100" />
      </div>

      <div v-else-if="!subscription" class="px-5 py-10 text-center">
        <Inbox class="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p class="text-sm text-gray-500">Belum ada langganan aktif. Pilih paket di bawah untuk mulai berlangganan.</p>
      </div>

      <div v-else class="px-5 py-5">
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

    <!-- Plan catalog -->
    <div>
      <h2 class="mb-3 text-sm font-semibold text-gray-800">Pilihan Paket</h2>

      <div v-if="plansLoading" class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div v-for="i in 3" :key="i" class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
          <div class="h-5 w-24 animate-pulse rounded bg-gray-200" />
          <div class="mt-3 h-8 w-32 animate-pulse rounded bg-gray-100" />
          <div class="mt-5 space-y-2">
            <div v-for="j in 3" :key="j" class="h-4 w-full animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>

      <div v-else-if="!offers.length" class="rounded-xl bg-white px-5 py-10 text-center shadow-xs ring-1 ring-gray-200">
        <Inbox class="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p class="text-sm text-gray-500">Tidak ada paket tersedia</p>
      </div>

      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="offer in offers"
          :key="offer.version.id"
          class="relative flex flex-col rounded-xl bg-white p-5 shadow-xs ring-1 transition-shadow hover:shadow-md"
          :class="isCurrent(offer) ? 'ring-2 ring-primary-500' : 'ring-gray-200'"
        >
          <span
            v-if="isCurrent(offer)"
            class="absolute right-4 top-4 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-600 ring-1 ring-primary-200"
          >
            Paket Aktif
          </span>

          <div>
            <h3 class="text-base font-bold text-gray-900">{{ offer.plan.name }}</h3>
            <p v-if="offer.plan.description" class="mt-0.5 text-xs text-gray-500">{{ offer.plan.description }}</p>
          </div>

          <div class="mt-3">
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-bold text-gray-900">{{ formatCurrency(offer.version.price) }}</span>
              <span
                v-if="offer.version.compare_price > offer.version.price"
                class="text-sm text-gray-400 line-through"
              >{{ formatCurrency(offer.version.compare_price) }}</span>
            </div>
            <p class="text-xs text-gray-400">per {{ billingCycleLabel(offer.version.billing_cycle) }}</p>
            <p v-if="offer.version.trial_days > 0" class="mt-1 text-xs font-medium text-indigo-600">
              Trial {{ offer.version.trial_days }} hari
            </p>
          </div>

          <ul v-if="offer.version.features?.length" class="mt-4 flex-1 space-y-2 border-t border-gray-100 pt-4">
            <li
              v-for="f in offer.version.features"
              :key="f.id"
              class="flex items-start gap-2 text-sm text-gray-600"
            >
              <Check class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              <span>
                {{ f.feature.name }}:
                <span class="font-medium text-gray-800">{{ featureLabel(f.value, f.feature.data_type) }}</span>
              </span>
            </li>
          </ul>
          <div v-else class="mt-4 flex-1" />

          <button
            v-if="!isCurrent(offer) || hasActiveSubscription"
            type="button"
            class="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            :class="actionMeta[offerAction(offer)].cls"
            @click="openCheckout(offer)"
          >
            <component :is="actionMeta[offerAction(offer)].icon" class="h-4 w-4" />
            {{ actionMeta[offerAction(offer)].label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Checkout modal -->
    <Teleport to="body">
      <div
        v-if="showCheckout && checkoutTarget"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        @click.self="closeCheckout"
      >
        <div class="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <component :is="actionMeta[checkoutAction].icon" class="h-4 w-4 text-primary-600" />
              {{ actionMeta[checkoutAction].label }} Paket
            </h3>
            <button class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" :disabled="checkingOut" @click="closeCheckout">
              <XCircle class="h-4 w-4" />
            </button>
          </div>

          <div class="space-y-4 px-5 py-4">
            <div class="rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-gray-900">{{ checkoutTarget.plan.name }}</span>
                <span class="text-lg font-bold text-gray-900">{{ formatCurrency(checkoutTarget.version.price) }}</span>
              </div>
              <p class="text-xs text-gray-500">per {{ billingCycleLabel(checkoutTarget.version.billing_cycle) }}</p>
            </div>

            <label v-if="checkoutAction === 'new'" class="flex items-center gap-2 text-sm text-gray-700">
              <input v-model="checkoutAutoRenew" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              Aktifkan perpanjangan otomatis
            </label>

            <p v-if="checkoutAction === 'downgrade'" class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
              Downgrade berlaku di akhir periode berjalan dan tidak menerbitkan tagihan.
            </p>
            <p v-else class="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 ring-1 ring-blue-200">
              Tagihan akan diterbitkan. Anda akan diarahkan ke halaman pembayaran.
            </p>
          </div>

          <div class="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
            <button
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              :disabled="checkingOut"
              @click="closeCheckout"
            >
              Batal
            </button>
            <button
              class="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
              :disabled="checkingOut"
              @click="submitCheckout"
            >
              <Loader2 v-if="checkingOut" class="h-4 w-4 animate-spin" />
              Konfirmasi
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
