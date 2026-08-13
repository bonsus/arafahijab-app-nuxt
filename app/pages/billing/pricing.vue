<script setup lang="ts">
import {
  RefreshCw, Loader2, Check, XCircle, Sparkles, ArrowUpCircle,
  ArrowDownCircle, RotateCw, PackagePlus, Inbox, Info,
} from 'lucide-vue-next'
import { formatCurrency } from '~/composables/useFormatters'
import { billingCycleLabel } from '~/composables/useBilling'
import type { Plan, PlanVersion, Subscription, CheckoutResult, Paginated, BillingAddon } from '~/types'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const toast = useToast()
const router = useRouter()

// ---- Current subscription (untuk menandai paket aktif & menentukan aksi) ----
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
    console.warn('Gagal memuat langganan', e)
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

// ---- Add-on catalog (PRD §15) ----
const addonCatalog = ref<BillingAddon[]>([])
const addonLoading = ref(true)

async function fetchAddons() {
  addonLoading.value = true
  try {
    const res = await api.get<{ data: BillingAddon[] }>('/billing/addons')
    addonCatalog.value = res.data || []
  }
  catch (e: any) {
    addonCatalog.value = []
    // Non-fatal: katalog add-on opsional.
    console.warn('Gagal memuat katalog add-on', e)
  }
  finally {
    addonLoading.value = false
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
function offerAction(offer: PlanOffer): PlanAction {
  if (!hasActiveSubscription.value) return 'new'
  if (isCurrent(offer)) return 'renew'
  return offer.version.price >= currentPrice.value ? 'upgrade' : 'downgrade'
}

type PlanAction = 'new' | 'renew' | 'upgrade' | 'downgrade'

const actionMeta: Record<PlanAction, { label: string; icon: any; cls: string }> = {
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
const selectedAddons = ref<string[]>([])
const couponCode = ref('')
const checkoutErrors = ref<Record<string, string[]>>({})

function openCheckout(offer: PlanOffer) {
  checkoutTarget.value = offer
  checkoutAutoRenew.value = true
  selectedAddons.value = []
  couponCode.value = ''
  checkoutErrors.value = {}
  showCheckout.value = true
}

function closeCheckout() {
  if (checkingOut.value) return
  showCheckout.value = false
  checkoutTarget.value = null
}

const checkoutAction = computed(() => checkoutTarget.value ? offerAction(checkoutTarget.value) : 'new')

const selectedAddonTotal = computed(() =>
  addonCatalog.value
    .filter(a => selectedAddons.value.includes(a.code))
    .reduce((sum, a) => sum + a.price, 0),
)

function toggleAddon(code: string) {
  const i = selectedAddons.value.indexOf(code)
  if (i >= 0) selectedAddons.value.splice(i, 1)
  else selectedAddons.value.push(code)
}

async function submitCheckout() {
  if (!checkoutTarget.value) return
  const action = checkoutAction.value
  checkingOut.value = true
  checkoutErrors.value = {}
  try {
    const body: Record<string, unknown> = {
      type: action,
      plan_version_id: checkoutTarget.value.version.id,
    }
    if (action === 'new') body.auto_renew = checkoutAutoRenew.value
    if (selectedAddons.value.length) body.addons = [...selectedAddons.value]
    if (couponCode.value.trim()) body.coupon = couponCode.value.trim()

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
    // 422: kupon / addon tidak valid -> tampilkan per field.
    if (e?.errors) checkoutErrors.value = e.errors
    toast.error(e?.message || 'Checkout gagal')
  }
  finally {
    checkingOut.value = false
  }
}

function featureLabel(value: string, dataType: string): string {
  if (dataType === 'boolean') return value === 'true' ? 'Ya' : 'Tidak'
  return value
}

function refreshAll() {
  fetchSubscription()
  fetchPlans()
  fetchAddons()
}

onMounted(() => {
  fetchSubscription()
  fetchPlans()
  fetchAddons()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Sparkles class="h-5 w-5 text-primary-600" />
          Harga Paket
        </h1>
        <p class="mt-0.5 text-sm text-gray-500">Pilih paket langganan &amp; add-on yang sesuai kebutuhan bisnis Anda</p>
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

    <!-- Plan catalog -->
    <div>
      <h2 class="mb-3 text-sm font-semibold text-gray-800">Pilihan Paket</h2>

      <div v-if="subLoading || plansLoading" class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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

    <!-- Add-on catalog -->
    <div v-if="addonCatalog.length">
      <h2 class="mb-3 text-sm font-semibold text-gray-800">Add-on Tersedia</h2>

      <div v-if="addonLoading" class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div v-for="i in 3" :key="i" class="h-28 animate-pulse rounded-xl bg-gray-200/60" />
      </div>

      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="a in addonCatalog"
          :key="a.id"
          class="flex flex-col rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <PackagePlus class="h-4 w-4 shrink-0 text-primary-600" /> {{ a.name }}
              </p>
              <p v-if="a.description" class="mt-0.5 text-xs text-gray-400">{{ a.description }}</p>
            </div>
            <span class="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-600 ring-1 ring-primary-200">
              +{{ a.limit_value }}
            </span>
          </div>
          <p class="mt-3 text-sm text-gray-600">
            <span class="font-medium text-gray-900">{{ formatCurrency(a.price) }}</span>
            <span class="text-gray-400"> / periode</span>
          </p>
        </div>
      </div>

      <p class="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
        <Info class="h-3.5 w-3.5" /> Add-on dapat ditambahkan saat checkout paket.
      </p>
    </div>

    <!-- Checkout modal -->
    <Teleport to="body">
      <div
        v-if="showCheckout && checkoutTarget"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        @click.self="closeCheckout"
      >
        <div class="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl">
          <div class="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <component :is="actionMeta[checkoutAction].icon" class="h-4 w-4 text-primary-600" />
              {{ actionMeta[checkoutAction].label }} Paket
            </h3>
            <button class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" :disabled="checkingOut" @click="closeCheckout">
              <XCircle class="h-4 w-4" />
            </button>
          </div>

          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div class="rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-gray-900">{{ checkoutTarget.plan.name }}</span>
                <span class="text-lg font-bold text-gray-900">{{ formatCurrency(checkoutTarget.version.price) }}</span>
              </div>
              <p class="text-xs text-gray-500">per {{ billingCycleLabel(checkoutTarget.version.billing_cycle) }}</p>
            </div>

            <!-- Add-ons (PRD §15) -->
            <div v-if="addonCatalog.length">
              <p class="mb-2 text-sm font-medium text-gray-700">Add-on (opsional)</p>
              <div v-if="addonLoading" class="h-10 animate-pulse rounded-lg bg-gray-100" />
              <div v-else class="space-y-2">
                <label
                  v-for="a in addonCatalog"
                  :key="a.id"
                  class="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors"
                  :class="selectedAddons.includes(a.code)
                    ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-500/20'
                    : 'border-gray-200 hover:bg-gray-50'"
                >
                  <input
                    type="checkbox"
                    :checked="selectedAddons.includes(a.code)"
                    class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    @change="toggleAddon(a.code)"
                  />
                  <span class="flex-1">
                    <span class="font-medium text-gray-800">{{ a.name }}</span>
                    <span v-if="a.description" class="block text-xs text-gray-400">{{ a.description }}</span>
                  </span>
                  <span class="text-sm font-semibold text-gray-900">+{{ formatCurrency(a.price) }}</span>
                </label>
              </div>
              <p v-if="checkoutErrors.addons" class="mt-1 text-xs text-red-600">{{ checkoutErrors.addons.join(', ') }}</p>
            </div>

            <!-- Coupon (PRD §16) -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Kupon Diskon</label>
              <input
                v-model="couponCode"
                type="text"
                placeholder="Masukkan kode kupon"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              />
              <p v-if="checkoutErrors.coupon" class="mt-1 text-xs text-red-600">{{ checkoutErrors.coupon.join(', ') }}</p>
            </div>

            <!-- Total summary -->
            <div v-if="selectedAddonTotal > 0" class="rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
              <div class="flex justify-between text-sm text-gray-600">
                <span>Harga paket</span>
                <span>{{ formatCurrency(checkoutTarget.version.price) }}</span>
              </div>
              <div class="mt-1 flex justify-between text-sm text-gray-600">
                <span>Add-on ({{ selectedAddons.length }})</span>
                <span>+ {{ formatCurrency(selectedAddonTotal) }}</span>
              </div>
              <div class="mt-1.5 flex justify-between border-t border-gray-200 pt-1.5 text-sm font-semibold text-gray-900">
                <span>Estimasi total</span>
                <span>{{ formatCurrency(checkoutTarget.version.price + selectedAddonTotal) }}</span>
              </div>
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

          <div class="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-5 py-3">
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
