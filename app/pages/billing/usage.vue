<script setup lang="ts">
import { RefreshCw, Loader2, Inbox, Gauge, CheckCircle2, AlertTriangle } from 'lucide-vue-next'
import type { FeatureUsage, Subscription } from '~/types'

definePageMeta({ middleware: 'auth', redirect: '/billing/subscription' })

const api = useApi()
const toast = useToast()

const usages = ref<FeatureUsage[]>([])
const subscription = ref<Subscription | null>(null)
const loading = ref(true)

async function fetchData() {
  loading.value = true
  try {
    const [subRes, usageRes] = await Promise.all([
      api.get<{ data: Subscription | null }>('/billing/subscription'),
      api.get<{ data: FeatureUsage[] }>('/billing/subscription/usage'),
    ])
    subscription.value = subRes.data || null
    usages.value = usageRes.data || []
  }
  catch (e: any) {
    usages.value = []
    toast.error(e?.message || 'Gagal memuat pemakaian')
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

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Gauge class="h-5 w-5 text-primary-600" />
          Pemakaian Fitur
        </h1>
        <p class="mt-0.5 text-sm text-gray-500">Limit vs pemakaian paket langganan Anda pada periode berjalan</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
        :disabled="loading"
        @click="fetchData"
      >
        <RefreshCw :class="['h-3.5 w-3.5', loading && 'animate-spin']" />
        Refresh
      </button>
    </div>

    <BillingTabs />

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div v-for="i in 4" :key="i" class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200">
        <div class="h-4 w-32 animate-pulse rounded bg-gray-200" />
        <div class="mt-3 h-2.5 w-full animate-pulse rounded-full bg-gray-100" />
        <div class="mt-2 h-3 w-24 animate-pulse rounded bg-gray-100" />
      </div>
    </div>

    <!-- No subscription -->
    <div v-else-if="!hasActiveSubscription" class="rounded-xl bg-white px-5 py-16 text-center shadow-xs ring-1 ring-gray-200">
      <Inbox class="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p class="text-sm text-gray-500">Belum ada langganan aktif. Pemakaian fitur tidak dibatasi.</p>
    </div>

    <!-- Usage bars -->
    <div v-else-if="!usages.length" class="rounded-xl bg-white px-5 py-16 text-center shadow-xs ring-1 ring-gray-200">
      <Inbox class="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p class="text-sm text-gray-500">Belum ada data pemakaian.</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div
        v-for="u in usages"
        :key="u.feature_code"
        class="rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-200"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-sm font-semibold text-gray-900">{{ u.feature_name || u.feature_code }}</p>
            <p class="mt-0.5 text-xs text-gray-400">{{ u.category || 'fitur' }}</p>
          </div>
          <AlertTriangle
            v-if="usagePercent(u) >= 90"
            class="h-4 w-4 shrink-0 text-amber-500"
          />
          <CheckCircle2
            v-else-if="usagePercent(u) < 70"
            class="h-4 w-4 shrink-0 text-green-500"
          />
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

    <!-- Feature limit note -->
    <p v-if="hasActiveSubscription" class="flex items-center gap-1.5 text-xs text-gray-400">
      <Loader2 class="h-3 w-3" />
      Pemakaian diperbarui otomatis. Saat limit habis, fitur terkait akan diblokir hingga periode berikutnya.
    </p>
  </div>
</template>
