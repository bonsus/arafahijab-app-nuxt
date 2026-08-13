<script setup lang="ts">
import { RefreshCw, Inbox, PackagePlus, CalendarClock, Plus } from 'lucide-vue-next'
import { formatCurrency, formatDate } from '~/composables/useFormatters'
import type { SubscriptionAddon, Subscription } from '~/types'

definePageMeta({ middleware: 'auth', redirect: '/billing/subscription' })

const api = useApi()
const toast = useToast()
const router = useRouter()

const addons = ref<SubscriptionAddon[]>([])
const subscription = ref<Subscription | null>(null)
const loading = ref(true)

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

async function fetchData() {
  loading.value = true
  try {
    const [subRes, addonRes] = await Promise.all([
      api.get<{ data: Subscription | null }>('/billing/subscription'),
      api.get<{ data: SubscriptionAddon[] }>('/billing/subscription/addons'),
    ])
    subscription.value = subRes.data || null
    addons.value = addonRes.data || []
  }
  catch (e: any) {
    addons.value = []
    toast.error(e?.message || 'Gagal memuat add-on')
  }
  finally {
    loading.value = false
  }
}

const hasActiveSubscription = computed(() => {
  const s = subscription.value
  if (!s) return false
  return ['trial', 'active', 'grace_period', 'past_due', 'pending_activation'].includes(s.status)
})

const activeAddons = computed(() =>
  addons.value.filter(a => !a.expires_at || new Date(a.expires_at).getTime() > Date.now()),
)

const expiredAddons = computed(() =>
  addons.value.filter(a => a.expires_at && new Date(a.expires_at).getTime() <= Date.now()),
)

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="flex items-center gap-2 text-xl font-bold text-gray-900">
          <PackagePlus class="h-5 w-5 text-primary-600" />
          Add-on Saya
        </h1>
        <p class="mt-0.5 text-sm text-gray-500">Paket tambahan limit yang dibeli untuk langganan Anda</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          :disabled="loading"
          @click="fetchData"
        >
          <RefreshCw :class="['h-3.5 w-3.5', loading && 'animate-spin']" />
          Refresh
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-700"
          @click="router.push('/billing/subscription')"
        >
          <Plus class="h-3.5 w-3.5" /> Beli Add-on
        </button>
      </div>
    </div>

    <BillingTabs />

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 3" :key="i" class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <div class="h-5 w-24 animate-pulse rounded bg-gray-200" />
        <div class="mt-3 h-4 w-40 animate-pulse rounded bg-gray-100" />
        <div class="mt-5 h-4 w-32 animate-pulse rounded bg-gray-100" />
      </div>
    </div>

    <!-- No subscription -->
    <div v-else-if="!hasActiveSubscription" class="rounded-xl bg-white px-5 py-16 text-center shadow-xs ring-1 ring-gray-200">
      <Inbox class="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p class="text-sm text-gray-500">Belum ada langganan aktif. Pilih paket terlebih dahulu untuk membeli add-on.</p>
      <button
        type="button"
        class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        @click="router.push('/billing/subscription')"
      >
        Lihat Paket
      </button>
    </div>

    <!-- Active add-ons -->
    <template v-else>
      <div v-if="!addons.length" class="rounded-xl bg-white px-5 py-16 text-center shadow-xs ring-1 ring-gray-200">
        <Inbox class="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p class="text-sm text-gray-500">Belum ada add-on. Tambah limit dengan membeli add-on saat checkout.</p>
      </div>

      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="a in activeAddons"
          :key="a.id"
          class="flex flex-col rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-sm font-semibold text-gray-900">{{ a.addon?.name || a.feature_code }}</p>
              <p class="mt-0.5 text-xs text-gray-400">{{ featureName[a.feature_code] || a.feature_code }}</p>
            </div>
            <span class="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-600 ring-1 ring-primary-200">
              +{{ a.limit_value }}
            </span>
          </div>

          <p class="mt-3 text-sm text-gray-600">
            <span class="font-medium text-gray-900">{{ formatCurrency(a.price) }}</span>
            <span class="text-gray-400"> / periode</span>
          </p>

          <div class="mt-4 flex items-center gap-1.5 border-t border-gray-100 pt-3 text-xs text-gray-500">
            <CalendarClock class="h-3.5 w-3.5" />
            Berlaku hingga {{ formatDate(a.expires_at || '') }}
          </div>
        </div>
      </div>

      <!-- Expired add-ons -->
      <div v-if="expiredAddons.length">
        <h2 class="mb-3 mt-6 text-sm font-semibold text-gray-800">Add-on Berakhir</h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="a in expiredAddons"
            :key="a.id"
            class="rounded-xl bg-gray-50 p-5 ring-1 ring-gray-200"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-sm font-medium text-gray-500 line-through">{{ a.addon?.name || a.feature_code }}</p>
                <p class="mt-0.5 text-xs text-gray-400">{{ featureName[a.feature_code] || a.feature_code }}</p>
              </div>
              <span class="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">Berakhir</span>
            </div>
            <p class="mt-3 text-xs text-gray-400">Berlaku hingga {{ formatDate(a.expires_at || '') }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
