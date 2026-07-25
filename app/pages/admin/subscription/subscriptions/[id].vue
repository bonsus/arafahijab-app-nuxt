<script setup lang="ts">
import { ArrowLeft, Loader2, Play, Pause, RotateCw, XCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-vue-next'
import type { Subscription, SubscriptionEvent, Plan, AdminResponse, AdminPaginated } from '~/types/admin'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const route = useRoute()
const api = useAdminApi()
const toast = useToast()
const subId = route.params.id as string

const sub = ref<Subscription | null>(null)
const events = ref<SubscriptionEvent[]>([])
const plans = ref<Plan[]>([])
const loading = ref(false)
const acting = ref('')

const statusBadge: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  trial: 'bg-blue-50 text-blue-700',
  grace_period: 'bg-amber-50 text-amber-700',
  past_due: 'bg-orange-50 text-orange-700',
  expired: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-50 text-red-700',
  suspended: 'bg-red-50 text-red-700',
  paused: 'bg-gray-100 text-gray-600',
  pending_activation: 'bg-indigo-50 text-indigo-700',
}

async function fetchSub() {
  loading.value = true
  try {
    const res = await api.get<AdminResponse<Subscription>>(`/admin/subscription/subscriptions/${subId}`)
    sub.value = res.data
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memuat subscription')
  }
  finally {
    loading.value = false
  }
}

async function fetchEvents() {
  try {
    const res = await api.get<AdminResponse<AdminPaginated<SubscriptionEvent>>>(`/admin/subscription/subscriptions/${subId}/events`, { page: '1', perpage: '50' })
    events.value = res.data.data || []
  }
  catch { /* handled globally */ }
}

async function fetchPlans() {
  try {
    const res = await api.get<AdminResponse<AdminPaginated<Plan>>>('/admin/subscription/plans', { page: '1', perpage: '200' })
    plans.value = res.data.data || []
  }
  catch { /* handled globally */ }
}

onMounted(() => {
  fetchSub()
  fetchEvents()
  fetchPlans()
})

const versionOptions = computed(() => {
  const opts: { id: string, label: string }[] = []
  for (const p of plans.value) {
    for (const v of p.versions || []) {
      opts.push({ id: v.id, label: `${p.name} v${v.version} — ${v.currency} ${formatCurrency(v.price)}` })
    }
  }
  return opts
})

async function doAction(action: string, body?: unknown, successMsg?: string) {
  acting.value = action
  try {
    const res = await api.post<AdminResponse<any>>(`/admin/subscription/subscriptions/${subId}/${action}`, body)
    toast.success(successMsg || res.message || 'Berhasil')
    await fetchSub()
    await fetchEvents()
    return res
  }
  catch (error: any) {
    toast.error(error?.message || 'Aksi gagal')
  }
  finally {
    acting.value = ''
  }
}

function activate() { doAction('activate', undefined, 'Subscription diaktifkan') }
function suspend() { doAction('suspend', undefined, 'Subscription disuspend') }
function resume() { doAction('resume', undefined, 'Subscription dilanjutkan') }

// Cancel
const cancelOpen = ref(false)
const cancelImmediately = ref(false)
async function confirmCancel() {
  await doAction('cancel', { immediately: cancelImmediately.value }, 'Subscription dibatalkan')
  cancelOpen.value = false
}

// Upgrade / Downgrade
const changeOpen = ref(false)
const changeType = ref<'upgrade' | 'downgrade'>('upgrade')
const changeTarget = ref('')
function openChange(type: 'upgrade' | 'downgrade') {
  changeType.value = type
  changeTarget.value = ''
  changeOpen.value = true
}
async function confirmChange() {
  if (!changeTarget.value) {
    toast.warning('Pilih plan version tujuan')
    return
  }
  const res = await doAction(changeType.value, { to_plan_version_id: changeTarget.value })
  changeOpen.value = false
  // Upgrade returns a generated invoice — offer to open it.
  if (res && changeType.value === 'upgrade' && res.data?.id) {
    navigateTo(`/admin/subscription/invoices/${res.data.id}`)
  }
}
</script>

<template>
  <div class="space-y-5">
    <NuxtLink to="/admin/subscription/subscriptions" class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
      <ArrowLeft class="h-4 w-4" /> Kembali ke Subscription
    </NuxtLink>

    <div v-if="loading && !sub" class="flex items-center justify-center py-20 text-gray-400">
      <Loader2 class="h-6 w-6 animate-spin" />
    </div>

    <template v-else-if="sub">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold text-gray-900">{{ sub.business?.name || sub.business_id }}</h1>
          <p class="mt-1 text-sm text-gray-500">
            {{ sub.plan_version?.plan?.name || '-' }}
            <span v-if="sub.plan_version">v{{ sub.plan_version.version }}</span> · {{ sub.billing_cycle }}
          </p>
        </div>
        <span class="rounded-md px-2.5 py-1 text-sm font-medium" :class="statusBadge[sub.status] || 'bg-gray-100 text-gray-600'">{{ sub.status }}</span>
      </div>

      <!-- Info -->
      <div class="grid grid-cols-2 gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:grid-cols-4">
        <div>
          <p class="text-xs text-gray-500">Mulai</p>
          <p class="mt-0.5 text-sm font-medium text-gray-900">{{ formatDate(sub.starts_at || '') }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500">Berakhir</p>
          <p class="mt-0.5 text-sm font-medium text-gray-900">{{ formatDate(sub.ends_at || '') }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500">Trial Berakhir</p>
          <p class="mt-0.5 text-sm font-medium text-gray-900">{{ formatDate(sub.trial_ends_at || '') }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500">Auto Renew</p>
          <p class="mt-0.5 text-sm font-medium text-gray-900">{{ sub.auto_renew ? 'Ya' : 'Tidak' }}</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <p class="mb-3 text-sm font-semibold text-gray-900">Aksi Lifecycle</p>
        <div class="flex flex-wrap gap-2">
          <button :disabled="!!acting" class="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50" @click="activate">
            <Loader2 v-if="acting === 'activate'" class="h-4 w-4 animate-spin" /><Play v-else class="h-4 w-4" /> Aktifkan
          </button>
          <button :disabled="!!acting" class="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50" @click="suspend">
            <Loader2 v-if="acting === 'suspend'" class="h-4 w-4 animate-spin" /><Pause v-else class="h-4 w-4" /> Suspend
          </button>
          <button :disabled="!!acting" class="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50" @click="resume">
            <Loader2 v-if="acting === 'resume'" class="h-4 w-4 animate-spin" /><RotateCw v-else class="h-4 w-4" /> Resume
          </button>
          <button :disabled="!!acting" class="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50" @click="openChange('upgrade')">
            <ArrowUpCircle class="h-4 w-4" /> Upgrade
          </button>
          <button :disabled="!!acting" class="flex items-center gap-1.5 rounded-lg bg-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50" @click="openChange('downgrade')">
            <ArrowDownCircle class="h-4 w-4" /> Downgrade
          </button>
          <button :disabled="!!acting" class="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50" @click="cancelOpen = true">
            <XCircle class="h-4 w-4" /> Batalkan
          </button>
        </div>
      </div>

      <!-- Events -->
      <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <p class="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-900">Audit Trail</p>
        <table class="w-full text-sm">
          <thead class="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th class="px-4 py-3">Event</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Oleh</th>
              <th class="px-4 py-3">Waktu</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="!events.length">
              <td colspan="4" class="px-4 py-8 text-center text-gray-400">Belum ada event.</td>
            </tr>
            <tr v-for="e in events" :key="e.id">
              <td class="px-4 py-3 font-medium text-gray-900">{{ e.event }}</td>
              <td class="px-4 py-3 text-gray-600">
                <span v-if="e.old_status">{{ e.old_status }} → </span>{{ e.new_status || '-' }}
              </td>
              <td class="px-4 py-3 text-xs text-gray-500">{{ e.created_by }}</td>
              <td class="px-4 py-3 text-gray-600">{{ formatDateTime(e.created_at || '') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Cancel modal -->
    <AdminModal v-model="cancelOpen" title="Batalkan Subscription" max-width="max-w-md">
      <p class="text-sm text-gray-600">Pilih waktu pembatalan.</p>
      <label class="mt-3 flex items-center gap-2 text-sm text-gray-700">
        <input v-model="cancelImmediately" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-indigo-600" />
        Batalkan segera (jika tidak, batal di akhir periode)
      </label>
      <template #footer>
        <button class="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50" @click="cancelOpen = false">Batal</button>
        <button :disabled="acting === 'cancel'" class="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60" @click="confirmCancel">
          <Loader2 v-if="acting === 'cancel'" class="h-4 w-4 animate-spin" /> Konfirmasi
        </button>
      </template>
    </AdminModal>

    <!-- Upgrade / Downgrade modal -->
    <AdminModal v-model="changeOpen" :title="changeType === 'upgrade' ? 'Upgrade Plan' : 'Downgrade Plan'" max-width="max-w-md">
      <p class="mb-3 text-sm text-gray-600">
        {{ changeType === 'upgrade' ? 'Upgrade akan langsung membuat invoice tagihan.' : 'Downgrade dijadwalkan pada periode berikutnya.' }}
      </p>
      <label class="mb-1.5 block text-sm font-medium text-gray-700">Plan Version Tujuan</label>
      <select v-model="changeTarget" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
        <option value="" disabled>Pilih plan version</option>
        <option v-for="o in versionOptions" :key="o.id" :value="o.id">{{ o.label }}</option>
      </select>
      <template #footer>
        <button class="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50" @click="changeOpen = false">Batal</button>
        <button :disabled="!!acting" class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60" @click="confirmChange">
          <Loader2 v-if="!!acting" class="h-4 w-4 animate-spin" /> Konfirmasi
        </button>
      </template>
    </AdminModal>
  </div>
</template>
