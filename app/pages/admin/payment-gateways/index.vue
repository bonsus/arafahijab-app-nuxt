<script setup lang="ts">
import { Loader2, KeyRound, Save, CheckCircle2, XCircle } from 'lucide-vue-next'
import type { PaymentGateway, GatewayEnvironment, GatewayMethod, AdminResponse } from '~/types/admin'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const api = useAdminApi()
const toast = useToast()

const gateways = ref<PaymentGateway[]>([])
const loading = ref(false)
const activeTab = ref<string>('')
// Per-gateway busy flags keyed by code (e.g. 'midtrans:status', 'midtrans:methods')
const busy = reactive<Record<string, boolean>>({})
// Editable copy of method states per gateway code
const methodDraft = reactive<Record<string, Record<string, boolean>>>({})

const categoryLabel: Record<string, string> = {
  va: 'Virtual Account',
  ewallet: 'E-Wallet',
  qris: 'QRIS',
  card: 'Kartu',
  retail: 'Retail',
  paylater: 'Paylater',
  ebanking: 'Internet Banking',
  directdebit: 'Direct Debit',
  ecommerce: 'E-Commerce',
}

function syncDraft(g: PaymentGateway) {
  methodDraft[g.code] = Object.fromEntries(g.methods.map(m => [m.code, m.is_active]))
}

async function fetchGateways() {
  loading.value = true
  try {
    const res = await api.get<AdminResponse<PaymentGateway[]>>('/admin/payment-gateways')
    gateways.value = res.data || []
    gateways.value.forEach(syncDraft)
    if (!activeTab.value && gateways.value.length) activeTab.value = gateways.value[0]!.code
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memuat payment gateway')
  }
  finally {
    loading.value = false
  }
}

onMounted(fetchGateways)

const activeGateway = computed(() => gateways.value.find(g => g.code === activeTab.value) || null)

function applyGateway(updated: PaymentGateway) {
  const idx = gateways.value.findIndex(g => g.code === updated.code)
  if (idx !== -1) {
    gateways.value[idx] = updated
    syncDraft(updated)
  }
}

// ---- Toggle gateway active ----
async function toggleGateway(g: PaymentGateway) {
  const key = `${g.code}:status`
  busy[key] = true
  try {
    const res = await api.put<AdminResponse<PaymentGateway>>(`/admin/payment-gateways/${g.code}`, {
      is_active: !g.is_active,
    })
    applyGateway(res.data)
    toast.success(res.data.is_active ? `${g.name} diaktifkan` : `${g.name} dinonaktifkan`)
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memperbarui gateway')
  }
  finally {
    busy[key] = false
  }
}

// ---- Methods ----
function methodsDirty(g: PaymentGateway): boolean {
  const draft = methodDraft[g.code] || {}
  return g.methods.some(m => draft[m.code] !== m.is_active)
}

function groupedMethods(g: PaymentGateway): Record<string, GatewayMethod[]> {
  return g.methods.reduce((acc, m) => {
    const cat = m.category || 'lainnya'
    ;(acc[cat] ||= []).push(m)
    return acc
  }, {} as Record<string, GatewayMethod[]>)
}

async function saveMethods(g: PaymentGateway) {
  const key = `${g.code}:methods`
  busy[key] = true
  const draft = methodDraft[g.code] || {}
  const methods = g.methods
    .filter(m => draft[m.code] !== m.is_active)
    .map(m => ({ code: m.code, is_active: draft[m.code]! }))
  try {
    const res = await api.put<AdminResponse<PaymentGateway>>(`/admin/payment-gateways/${g.code}/methods`, { methods })
    applyGateway(res.data)
    toast.success('Metode pembayaran diperbarui')
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memperbarui metode')
  }
  finally {
    busy[key] = false
  }
}

// ---- Credentials modal ----
const credOpen = ref(false)
const credSaving = ref(false)
const credErrors = ref<Record<string, string[]>>({})
const credTarget = ref<PaymentGateway | null>(null)
const credEnv = ref<GatewayEnvironment>('sandbox')
const credActive = ref(false)
const credValues = reactive<Record<string, string>>({})

function openCredentials(g: PaymentGateway) {
  credTarget.value = g
  credEnv.value = g.environment
  credActive.value = g.is_active
  credErrors.value = {}
  // Reset inputs. Non-secret existing values are prefilled; secrets start empty.
  for (const k of Object.keys(credValues)) delete credValues[k]
  for (const c of g.credentials) {
    credValues[c.key] = c.secret ? '' : (c.value || '')
  }
  credOpen.value = true
}

async function saveCredentials() {
  if (!credTarget.value) return
  credSaving.value = true
  credErrors.value = {}
  // Only send credential fields the user actually filled in (partial merge on backend).
  const credentials: Record<string, string> = {}
  for (const c of credTarget.value.credentials) {
    const v = credValues[c.key]
    if (v !== undefined && v !== '') credentials[c.key] = v
  }
  const payload: Record<string, unknown> = {
    environment: credEnv.value,
    is_active: credActive.value,
  }
  if (Object.keys(credentials).length) payload.credentials = credentials
  try {
    const res = await api.put<AdminResponse<PaymentGateway>>(
      `/admin/payment-gateways/${credTarget.value.code}/credentials`,
      payload,
    )
    applyGateway(res.data)
    toast.success('Kredensial gateway diperbarui')
    credOpen.value = false
  }
  catch (error: any) {
    if (error?.errors) credErrors.value = error.errors
    else toast.error(error?.message || 'Gagal menyimpan kredensial')
  }
  finally {
    credSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-xl font-bold text-gray-900">Payment Gateway</h1>
      <p class="mt-1 text-sm text-gray-500">Aktifkan gateway, atur kredensial, dan kelola metode pembayaran.</p>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20 text-gray-400">
      <Loader2 class="h-6 w-6 animate-spin" />
    </div>

    <p v-else-if="!gateways.length" class="rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
      Belum ada payment gateway.
    </p>

    <div v-else class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <!-- Provider tabs -->
      <div class="flex gap-1 overflow-x-auto border-b border-gray-100 px-3 pt-3">
        <button
          v-for="g in gateways"
          :key="g.code"
          class="flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors"
          :class="activeTab === g.code
            ? 'border border-b-0 border-gray-100 bg-white text-indigo-700'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
          @click="activeTab = g.code"
        >
          <span
            class="h-2 w-2 rounded-full"
            :class="g.is_active ? 'bg-emerald-500' : 'bg-gray-300'"
          />
          {{ g.name }}
        </button>
      </div>

      <div v-if="activeGateway" class="-mt-px">
        <!-- Gateway header -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold uppercase text-indigo-700">
              {{ activeGateway.name.charAt(0) }}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <p class="text-sm font-semibold text-gray-900">{{ activeGateway.name }}</p>
                <span
                  class="rounded-md px-1.5 py-0.5 text-[11px] font-medium capitalize"
                  :class="activeGateway.environment === 'production' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
                >{{ activeGateway.environment }}</span>
              </div>
              <p class="font-mono text-xs text-gray-400">{{ activeGateway.code }}</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button
              class="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="openCredentials(activeGateway)"
            >
              <KeyRound class="h-4 w-4" /> Kredensial
            </button>
            <!-- Active toggle -->
            <button
              type="button"
              role="switch"
              :aria-checked="activeGateway.is_active"
              :disabled="busy[`${activeGateway.code}:status`]"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50"
              :class="activeGateway.is_active ? 'bg-indigo-600' : 'bg-gray-300'"
              @click="toggleGateway(activeGateway)"
            >
              <span
                class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                :class="activeGateway.is_active ? 'translate-x-5' : 'translate-x-0.5'"
              />
            </button>
          </div>
        </div>

        <!-- Methods -->
        <div class="px-5 py-4">
          <div class="mb-3 flex items-center justify-between">
            <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Metode Pembayaran</p>
            <button
              :disabled="!methodsDirty(activeGateway) || busy[`${activeGateway.code}:methods`]"
              class="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              @click="saveMethods(activeGateway)"
            >
              <Loader2 v-if="busy[`${activeGateway.code}:methods`]" class="h-3.5 w-3.5 animate-spin" />
              <Save v-else class="h-3.5 w-3.5" />
              Simpan Metode
            </button>
          </div>

          <p v-if="!activeGateway.methods.length" class="py-3 text-center text-xs text-gray-400">Tidak ada metode.</p>

          <div v-else class="space-y-4">
            <div v-for="(methods, cat) in groupedMethods(activeGateway)" :key="cat">
              <p class="mb-2 text-[11px] font-semibold uppercase text-gray-400">{{ categoryLabel[cat] || cat }}</p>
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <label
                  v-for="m in methods"
                  :key="m.code"
                  class="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors"
                  :class="methodDraft[activeGateway.code]?.[m.code] ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-200 hover:bg-gray-50'"
                >
                  <input
                    v-model="methodDraft[activeGateway.code]![m.code]"
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm text-gray-800">{{ m.name }}</p>
                    <p class="font-mono text-[11px] text-gray-400">{{ m.code }}</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Credentials modal -->
    <AdminModal v-model="credOpen" :title="`Kredensial — ${credTarget?.name || ''}`" max-width="max-w-lg">
      <div v-if="credTarget" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Environment</label>
            <select v-model="credEnv" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
            <p v-if="credErrors.environment" class="mt-1 text-xs text-red-600">{{ credErrors.environment.join(', ') }}</p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
            <label class="flex h-[42px] items-center gap-2 rounded-lg border border-gray-300 px-3 text-sm text-gray-700">
              <input v-model="credActive" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-indigo-600" />
              {{ credActive ? 'Aktif' : 'Nonaktif' }}
            </label>
          </div>
        </div>

        <div class="space-y-3 border-t border-gray-100 pt-3">
          <div v-for="c in credTarget.credentials" :key="c.key">
            <label class="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
              {{ c.label }}
              <CheckCircle2 v-if="c.is_set" class="h-3.5 w-3.5 text-emerald-500" title="Tersimpan" />
              <XCircle v-else class="h-3.5 w-3.5 text-gray-300" title="Belum diisi" />
            </label>
            <input
              v-model="credValues[c.key]"
              :type="c.secret ? 'password' : 'text'"
              :placeholder="c.secret && c.is_set ? '•••••••• (kosongkan jika tidak diubah)' : c.label"
              autocomplete="off"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p v-if="credErrors[c.key]" class="mt-1 text-xs text-red-600">{{ credErrors[c.key]?.join(', ') }}</p>
          </div>
          <p class="text-xs text-gray-400">
            Field rahasia tidak pernah ditampilkan. Kosongkan untuk mempertahankan nilai tersimpan.
          </p>
        </div>
      </div>

      <template #footer>
        <button class="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50" @click="credOpen = false">Batal</button>
        <button
          :disabled="credSaving"
          class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          @click="saveCredentials"
        >
          <Loader2 v-if="credSaving" class="h-4 w-4 animate-spin" /> Simpan
        </button>
      </template>
    </AdminModal>
  </div>
</template>
