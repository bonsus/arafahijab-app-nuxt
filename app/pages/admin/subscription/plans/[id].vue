<script setup lang="ts">
import { ArrowLeft, Plus, Loader2, Trash2, Check, Pencil } from 'lucide-vue-next'
import type { Plan, PlanVersion, Feature, BillingCycle, AdminResponse, AdminPaginated } from '~/types/admin'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const route = useRoute()
const api = useAdminApi()
const toast = useToast()
const planId = route.params.id as string

const plan = ref<Plan | null>(null)
const versions = ref<PlanVersion[]>([])
const features = ref<Feature[]>([])
const loading = ref(false)

const billingCycles: BillingCycle[] = ['monthly', 'quarterly', 'semi_annual', 'yearly', 'custom']

async function fetchPlan() {
  loading.value = true
  try {
    const res = await api.get<AdminResponse<Plan>>(`/admin/subscription/plans/${planId}`)
    plan.value = res.data
    versions.value = res.data.versions || []
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memuat plan')
  }
  finally {
    loading.value = false
  }
}

async function fetchFeatures() {
  try {
    const res = await api.get<AdminResponse<AdminPaginated<Feature>>>('/admin/subscription/features', {
      page: '1', perpage: '200',
    })
    features.value = res.data.data || []
  }
  catch { /* handled globally */ }
}

onMounted(() => {
  fetchPlan()
  fetchFeatures()
})

const featureName = (id: string) => features.value.find(f => f.id === id)?.name || id

// ---- Create / Edit version ----
const modalOpen = ref(false)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})
const editingVersionId = ref<string | null>(null)
const form = reactive({
  billing_cycle: 'monthly' as BillingCycle,
  duration_month: 0,
  currency: 'IDR',
  price: 0,
  compare_price: 0,
  discount: 0,
  trial_days: 0,
  is_active: false,
  features: [] as { feature_id: string, value: string }[],
})

function openCreate() {
  editingVersionId.value = null
  Object.assign(form, { billing_cycle: 'monthly', duration_month: 0, currency: 'IDR', price: 0, compare_price: 0, discount: 0, trial_days: 0, is_active: false })
  form.features = []
  formErrors.value = {}
  modalOpen.value = true
}

function openEdit(v: PlanVersion) {
  editingVersionId.value = v.id
  Object.assign(form, {
    billing_cycle: v.billing_cycle,
    duration_month: v.duration_month || 0,
    currency: v.currency,
    price: v.price,
    compare_price: v.compare_price || 0,
    discount: v.discount || 0,
    trial_days: v.trial_days,
    is_active: v.is_active,
  })
  form.features = (v.features || []).map(pf => ({ feature_id: pf.feature_id, value: pf.value }))
  formErrors.value = {}
  modalOpen.value = true
}

function featureType(featureId: string) {
  return features.value.find(f => f.id === featureId)?.data_type
}

// Reset/normalize the value to fit the selected feature's data_type.
function onFeatureTypeChange(row: { feature_id: string, value: string }) {
  const type = featureType(row.feature_id)
  if (type === 'unlimited') row.value = 'unlimited'
  else if (type === 'boolean' && row.value !== 'true' && row.value !== 'false') row.value = 'false'
  else if (type === 'number' && !/^\d+$/.test(row.value)) row.value = '0'
  else if (type === 'string' && ['true', 'false', 'unlimited'].includes(row.value)) row.value = ''
}

function addFeatureRow() {
  const row = { feature_id: features.value[0]?.id || '', value: '' }
  onFeatureTypeChange(row)
  form.features.push(row)
}

function removeFeatureRow(idx: number) {
  form.features.splice(idx, 1)
}

async function save() {
  saving.value = true
  formErrors.value = {}
  const payload: Record<string, unknown> = {
    billing_cycle: form.billing_cycle,
    currency: form.currency,
    price: form.price,
    trial_days: form.trial_days,
    features: form.features.filter(f => f.feature_id),
  }
  if (form.duration_month) payload.duration_month = form.duration_month
  if (form.compare_price) payload.compare_price = form.compare_price
  if (form.discount) payload.discount = form.discount
  try {
    if (editingVersionId.value) {
      payload.is_active = form.is_active
      await api.put(`/admin/subscription/plans/${planId}/versions/${editingVersionId.value}`, payload)
      toast.success('Versi plan diperbarui')
    }
    else {
      await api.post(`/admin/subscription/plans/${planId}/versions`, payload)
      toast.success('Versi plan dibuat')
    }
    modalOpen.value = false
    fetchPlan()
  }
  catch (error: any) {
    if (error?.errors) formErrors.value = error.errors
    else toast.error(error?.message || (editingVersionId.value ? 'Gagal memperbarui versi' : 'Gagal membuat versi'))
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <NuxtLink to="/admin/subscription/plans" class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
      <ArrowLeft class="h-4 w-4" /> Kembali ke Plan
    </NuxtLink>

    <div v-if="loading && !plan" class="flex items-center justify-center py-20 text-gray-400">
      <Loader2 class="h-6 w-6 animate-spin" />
    </div>

    <template v-else-if="plan">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-xl font-bold text-gray-900">{{ plan.name }}</h1>
          <p class="mt-1 text-sm text-gray-500">
            <span class="font-mono">{{ plan.code }}</span> · {{ plan.description || 'Tanpa deskripsi' }}
          </p>
        </div>
        <button class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700" @click="openCreate">
          <Plus class="h-4 w-4" /> Tambah Versi
        </button>
      </div>

      <div class="space-y-4">
        <p v-if="!versions.length" class="rounded-xl border border-dashed border-gray-200 bg-white py-10 text-center text-sm text-gray-400">
          Belum ada versi harga. Tambahkan versi pertama.
        </p>

        <div
          v-for="v in versions"
          :key="v.id"
          class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="rounded-lg bg-indigo-50 px-2.5 py-1 text-sm font-semibold text-indigo-700">v{{ v.version }}</span>
              <span class="text-lg font-bold text-gray-900">{{ v.currency }} {{ formatCurrency(v.price) }}</span>
              <span v-if="v.compare_price" class="text-sm text-gray-400 line-through">{{ formatCurrency(v.compare_price) }}</span>
              <span v-if="v.discount" class="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">-{{ formatCurrency(v.discount) }}</span>
              <span class="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{{ v.billing_cycle }}</span>
              <span v-if="v.duration_month" class="text-xs text-gray-400">{{ v.duration_month }} bln</span>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span v-if="v.is_active" class="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                <Check class="h-3 w-3" /> Aktif
              </span>
              <span class="text-gray-400">Trial {{ v.trial_days }} hari</span>
              <button class="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50" @click="openEdit(v)">
                <Pencil class="h-3.5 w-3.5" /> Edit
              </button>
            </div>
          </div>

          <div v-if="v.features?.length" class="mt-4 border-t border-gray-50 pt-3">
            <p class="mb-2 text-xs font-medium uppercase text-gray-400">Fitur</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="pf in v.features"
                :key="pf.id"
                class="rounded-md bg-gray-50 px-2.5 py-1 text-xs text-gray-700"
              >
                {{ pf.feature?.name || featureName(pf.feature_id) }}:
                <span class="font-semibold">{{ pf.value }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Create / edit version modal -->
    <AdminModal v-model="modalOpen" :title="editingVersionId ? 'Edit Versi Plan' : 'Tambah Versi Plan'" max-width="max-w-2xl">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Billing Cycle</label>
          <select v-model="form.billing_cycle" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option v-for="c in billingCycles" :key="c" :value="c">{{ c }}</option>
          </select>
          <p v-if="formErrors.billing_cycle" class="mt-1 text-xs text-red-600">{{ formErrors.billing_cycle.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Durasi (bulan)</label>
          <input v-model.number="form.duration_month" type="number" min="0" placeholder="0 = default cycle" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Mata Uang</label>
          <input v-model="form.currency" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Harga</label>
          <input v-model.number="form.price" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.price" class="mt-1 text-xs text-red-600">{{ formErrors.price.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Harga Coret</label>
          <input v-model.number="form.compare_price" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Diskon</label>
          <input v-model.number="form.discount" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Trial (hari)</label>
          <input v-model.number="form.trial_days" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div v-if="editingVersionId" class="flex items-end">
          <label class="flex h-[42px] w-full items-center gap-2 rounded-lg border border-gray-300 px-3 text-sm text-gray-700">
            <input v-model="form.is_active" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-indigo-600" />
            Jadikan versi aktif
          </label>
        </div>
      </div>

      <div class="mt-5">
        <div class="mb-2 flex items-center justify-between">
          <label class="text-sm font-medium text-gray-700">Fitur & Nilai</label>
          <button class="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50" @click="addFeatureRow">
            <Plus class="h-3.5 w-3.5" /> Tambah Fitur
          </button>
        </div>
        <div v-if="!form.features.length" class="rounded-lg border border-dashed border-gray-200 py-4 text-center text-xs text-gray-400">
          Belum ada fitur ditambahkan.
        </div>
        <div v-for="(row, idx) in form.features" :key="idx" class="mb-2 flex items-center gap-2">
          <select
            v-model="row.feature_id"
            class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            @change="onFeatureTypeChange(row)"
          >
            <option v-for="f in features" :key="f.id" :value="f.id">{{ f.name }} ({{ f.data_type }})</option>
          </select>

          <!-- boolean: on/off toggle -->
          <button
            v-if="featureType(row.feature_id) === 'boolean'"
            type="button"
            role="switch"
            :aria-checked="row.value === 'true'"
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
            :class="row.value === 'true' ? 'bg-indigo-600' : 'bg-gray-300'"
            @click="row.value = row.value === 'true' ? 'false' : 'true'"
          >
            <span
              class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
              :class="row.value === 'true' ? 'translate-x-5' : 'translate-x-0.5'"
            />
          </button>

          <!-- unlimited: fixed, non-editable -->
          <span
            v-else-if="featureType(row.feature_id) === 'unlimited'"
            class="w-40 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center text-sm text-gray-500"
          >unlimited</span>

          <!-- number -->
          <input
            v-else-if="featureType(row.feature_id) === 'number'"
            v-model="row.value"
            type="number"
            min="0"
            placeholder="nilai"
            class="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />

          <!-- string / fallback -->
          <input
            v-else
            v-model="row.value"
            type="text"
            placeholder="nilai"
            class="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />

          <button class="rounded-lg p-1.5 text-red-500 hover:bg-red-50" @click="removeFeatureRow(idx)"><Trash2 class="h-4 w-4" /></button>
        </div>
      </div>

      <template #footer>
        <button class="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50" @click="modalOpen = false">Batal</button>
        <button :disabled="saving" class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60" @click="save">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" /> {{ editingVersionId ? 'Simpan Perubahan' : 'Simpan Versi' }}
        </button>
      </template>
    </AdminModal>
  </div>
</template>
