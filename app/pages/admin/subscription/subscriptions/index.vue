<script setup lang="ts">
import { Plus, Loader2, Eye } from 'lucide-vue-next'
import type { Subscription, Plan, BillingCycle, SubscriptionStatus, AdminResponse, AdminPaginated } from '~/types/admin'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const api = useAdminApi()
const toast = useToast()

const subs = ref<Subscription[]>([])
const plans = ref<Plan[]>([])
const loading = ref(false)
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const totalPage = ref(0)
const statusFilter = ref('')

const statuses: SubscriptionStatus[] = ['trial', 'active', 'grace_period', 'past_due', 'expired', 'cancelled', 'suspended', 'paused', 'pending_activation']
const billingCycles: BillingCycle[] = ['monthly', 'quarterly', 'semi_annual', 'yearly', 'custom']

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

async function fetchSubs() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      perpage: String(perPage.value),
    }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await api.get<AdminResponse<AdminPaginated<Subscription>>>('/admin/subscription/subscriptions', params)
    subs.value = res.data.data || []
    total.value = res.data.total
    totalPage.value = res.data.total_page
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memuat subscription')
  }
  finally {
    loading.value = false
  }
}

async function fetchPlans() {
  try {
    const res = await api.get<AdminResponse<AdminPaginated<Plan>>>('/admin/subscription/plans', { page: '1', perpage: '200' })
    plans.value = res.data.data || []
  }
  catch { /* handled globally */ }
}

onMounted(() => {
  fetchSubs()
  fetchPlans()
})
watch([page, perPage, statusFilter], () => {
  if (page.value !== 1 && statusFilter.value) page.value = 1
  fetchSubs()
})

// Flatten plan versions for the picker
const versionOptions = computed(() => {
  const opts: { id: string, label: string }[] = []
  for (const p of plans.value) {
    for (const v of p.versions || []) {
      opts.push({ id: v.id, label: `${p.name} v${v.version} — ${v.currency} ${formatCurrency(v.price)} (${v.billing_cycle})` })
    }
  }
  return opts
})

// ---- Create ----
const modalOpen = ref(false)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})
const form = reactive({
  business_id: '',
  plan_version_id: '',
  billing_cycle: '' as BillingCycle | '',
  trial_days: 0,
  auto_renew: true,
})

function openCreate() {
  Object.assign(form, { business_id: '', plan_version_id: '', billing_cycle: '', trial_days: 0, auto_renew: true })
  formErrors.value = {}
  modalOpen.value = true
}

async function save() {
  saving.value = true
  formErrors.value = {}
  const payload: Record<string, unknown> = {
    business_id: form.business_id,
    plan_version_id: form.plan_version_id,
    trial_days: form.trial_days,
    auto_renew: form.auto_renew,
  }
  if (form.billing_cycle) payload.billing_cycle = form.billing_cycle
  try {
    await api.post('/admin/subscription/subscriptions/create', payload)
    toast.success('Subscription dibuat')
    modalOpen.value = false
    fetchSubs()
  }
  catch (error: any) {
    if (error?.errors) formErrors.value = error.errors
    else toast.error(error?.message || 'Gagal membuat subscription')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Subscription</h1>
        <p class="mt-1 text-sm text-gray-500">Langganan aktif per tenant (business).</p>
      </div>
      <button class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700" @click="openCreate">
        <Plus class="h-4 w-4" /> Tambah Subscription
      </button>
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div class="border-b border-gray-100 p-3">
        <select v-model="statusFilter" class="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
          <option value="">Semua status</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-16 text-gray-400">
        <Loader2 class="h-6 w-6 animate-spin" />
      </div>
      <table v-else class="w-full text-sm">
        <thead class="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
          <tr>
            <th class="px-4 py-3">Business</th>
            <th class="px-4 py-3">Plan</th>
            <th class="px-4 py-3">Cycle</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Berakhir</th>
            <th class="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-if="!subs.length">
            <td colspan="6" class="px-4 py-10 text-center text-gray-400">Belum ada subscription.</td>
          </tr>
          <tr v-for="s in subs" :key="s.id" class="hover:bg-gray-50/50">
            <td class="px-4 py-3 font-medium text-gray-900">{{ s.business?.name || s.business_id }}</td>
            <td class="px-4 py-3 text-gray-600">
              {{ s.plan_version?.plan?.name || '-' }}
              <span v-if="s.plan_version" class="text-xs text-gray-400">v{{ s.plan_version.version }}</span>
            </td>
            <td class="px-4 py-3 text-gray-600">{{ s.billing_cycle }}</td>
            <td class="px-4 py-3">
              <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="statusBadge[s.status] || 'bg-gray-100 text-gray-600'">{{ s.status }}</span>
            </td>
            <td class="px-4 py-3 text-gray-600">{{ formatDate(s.ends_at || '') }}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end">
                <NuxtLink :to="`/admin/subscription/subscriptions/${s.id}`" class="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50" title="Detail">
                  <Eye class="h-4 w-4" />
                </NuxtLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <AdminPagination v-model:page="page" v-model:per-page="perPage" :total-page="totalPage" :total="total" :per-page="perPage" :loading="loading" />
    </div>

    <AdminModal v-model="modalOpen" title="Tambah Subscription">
      <div class="space-y-4">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Business ID</label>
          <input v-model="form.business_id" type="text" placeholder="01JBUSINESS..." class="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.business_id" class="mt-1 text-xs text-red-600">{{ formErrors.business_id.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Plan Version</label>
          <select v-model="form.plan_version_id" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option value="" disabled>Pilih plan version</option>
            <option v-for="o in versionOptions" :key="o.id" :value="o.id">{{ o.label }}</option>
          </select>
          <p v-if="formErrors.plan_version_id" class="mt-1 text-xs text-red-600">{{ formErrors.plan_version_id.join(', ') }}</p>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Billing Cycle</label>
            <select v-model="form.billing_cycle" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="">Default plan</option>
              <option v-for="c in billingCycles" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Trial (hari)</label>
            <input v-model.number="form.trial_days" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-700">
          <input v-model="form.auto_renew" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-indigo-600" /> Perpanjang otomatis
        </label>
      </div>
      <template #footer>
        <button class="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50" @click="modalOpen = false">Batal</button>
        <button :disabled="saving" class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60" @click="save">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" /> Simpan
        </button>
      </template>
    </AdminModal>
  </div>
</template>
