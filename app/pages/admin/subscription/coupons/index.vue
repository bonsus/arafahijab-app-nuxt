<script setup lang="ts">
import { Plus, Pencil, Trash2, Loader2, Search } from 'lucide-vue-next'
import type { Coupon, DiscountType, BillingCycle, Plan, AdminResponse, AdminPaginated } from '~/types/admin'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const api = useAdminApi()
const toast = useToast()

const coupons = ref<Coupon[]>([])
const plans = ref<Plan[]>([])
const loading = ref(false)
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const totalPage = ref(0)
const search = ref('')
const statusFilter = ref('') // active | inactive

const billingCycles: BillingCycle[] = ['monthly', 'quarterly', 'semi_annual', 'yearly', 'custom']
const discountTypes: DiscountType[] = ['nominal', 'percentage']

async function fetchCoupons() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      perpage: String(perPage.value),
      search: search.value,
    }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await api.get<AdminResponse<AdminPaginated<Coupon>>>('/admin/subscription/coupons', params)
    coupons.value = res.data.data || []
    total.value = res.data.total
    totalPage.value = res.data.total_page
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memuat kupon')
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
  fetchCoupons()
  fetchPlans()
})
watch([page, perPage, statusFilter], () => {
  if (statusFilter.value && page.value !== 1) page.value = 1
  fetchCoupons()
})

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchCoupons()
  }, 400)
}

const planName = (id?: string) => plans.value.find(p => p.id === id)?.name || id || 'Semua plan'

// ---- Create / Edit ----
const modalOpen = ref(false)
const editing = ref<Coupon | null>(null)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})
const form = reactive({
  code: '',
  name: '',
  discount_type: 'percentage' as DiscountType,
  value: 0,
  max_discount: 0,
  plan_id: '',
  billing_cycle: '',
  valid_from: '',
  valid_until: '',
  max_uses: 0,
  is_active: true,
})

function openCreate() {
  editing.value = null
  Object.assign(form, {
    code: '', name: '', discount_type: 'percentage', value: 0, max_discount: 0,
    plan_id: '', billing_cycle: '', valid_from: '', valid_until: '',
    max_uses: 0, is_active: true,
  })
  formErrors.value = {}
  modalOpen.value = true
}

function openEdit(c: Coupon) {
  editing.value = c
  Object.assign(form, {
    code: c.code,
    name: c.name,
    discount_type: c.discount_type,
    value: c.value,
    max_discount: c.max_discount || 0,
    plan_id: c.plan_id || '',
    billing_cycle: c.billing_cycle || '',
    valid_from: c.valid_from ? convertIsoToDatetimeLocal(c.valid_from) : '',
    valid_until: c.valid_until ? convertIsoToDatetimeLocal(c.valid_until) : '',
    max_uses: c.max_uses || 0,
    is_active: c.is_active,
  })
  formErrors.value = {}
  modalOpen.value = true
}

async function save() {
  saving.value = true
  formErrors.value = {}
  const payload: Record<string, unknown> = {
    code: form.code,
    name: form.name,
    discount_type: form.discount_type,
    value: form.value,
    max_discount: form.discount_type === 'percentage' ? form.max_discount : 0,
    plan_id: form.plan_id,
    billing_cycle: form.billing_cycle,
    max_uses: form.max_uses,
    is_active: form.is_active,
  }
  if (form.valid_from) payload.valid_from = formatDateTimeForApi(form.valid_from)
  if (form.valid_until) payload.valid_until = formatDateTimeForApi(form.valid_until)
  try {
    if (editing.value) {
      await api.put(`/admin/subscription/coupons/${editing.value.id}`, payload)
      toast.success('Kupon diperbarui')
    }
    else {
      await api.post('/admin/subscription/coupons/create', payload)
      toast.success('Kupon dibuat')
    }
    modalOpen.value = false
    fetchCoupons()
  }
  catch (error: any) {
    if (error?.errors) formErrors.value = error.errors
    else toast.error(error?.message || 'Gagal menyimpan kupon')
  }
  finally {
    saving.value = false
  }
}

async function remove(c: Coupon) {
  if (!confirm(`Hapus kupon "${c.code}"?`)) return
  try {
    await api.delete(`/admin/subscription/coupons/${c.id}`)
    toast.success('Kupon dihapus')
    fetchCoupons()
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal menghapus kupon')
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Coupon</h1>
        <p class="mt-1 text-sm text-gray-500">Voucher diskon langganan (nominal/persen) dengan syarat & kuota.</p>
      </div>
      <button class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700" @click="openCreate">
        <Plus class="h-4 w-4" /> Tambah Coupon
      </button>
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div class="flex flex-wrap gap-2 border-b border-gray-100 p-3">
        <div class="relative max-w-xs">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input v-model="search" type="text" placeholder="Cari kode/nama..." class="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" @input="onSearch" />
        </div>
        <select v-model="statusFilter" class="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
          <option value="">Semua status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-16 text-gray-400">
        <Loader2 class="h-6 w-6 animate-spin" />
      </div>
      <table v-else class="w-full text-sm">
        <thead class="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
          <tr>
            <th class="px-4 py-3">Kode</th>
            <th class="px-4 py-3">Diskon</th>
            <th class="px-4 py-3">Syarat</th>
            <th class="px-4 py-3">Kuota</th>
            <th class="px-4 py-3">Berlaku Sampai</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-if="!coupons.length">
            <td colspan="7" class="px-4 py-10 text-center text-gray-400">Belum ada coupon.</td>
          </tr>
          <tr v-for="c in coupons" :key="c.id" class="hover:bg-gray-50/50">
            <td class="px-4 py-3">
              <p class="font-mono text-xs font-semibold text-gray-900">{{ c.code }}</p>
              <p class="text-xs text-gray-400">{{ c.name }}</p>
            </td>
            <td class="px-4 py-3 font-medium text-gray-900">
              {{ c.discount_type === 'percentage' ? `${c.value}%` : `Rp ${formatCurrency(c.value)}` }}
              <span v-if="c.discount_type === 'percentage' && c.max_discount" class="text-xs text-gray-400">(maks {{ formatCurrency(c.max_discount) }})</span>
            </td>
            <td class="px-4 py-3 text-xs text-gray-600">
              <span v-if="c.plan_id">{{ planName(c.plan_id) }}</span>
              <span v-if="c.billing_cycle" class="text-gray-400"> · {{ c.billing_cycle }}</span>
              <span v-if="!c.plan_id && !c.billing_cycle" class="text-gray-400">Semua</span>
            </td>
            <td class="px-4 py-3">
              <span class="text-gray-700">{{ c.used_count }}</span>
              <span class="text-gray-400">/ {{ c.max_uses === 0 ? '∞' : c.max_uses }}</span>
            </td>
            <td class="px-4 py-3 text-gray-600">{{ formatDate(c.valid_until || '') }}</td>
            <td class="px-4 py-3">
              <span class="rounded-md px-2 py-0.5 text-xs" :class="c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'">
                {{ c.is_active ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-1">
                <button class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" @click="openEdit(c)"><Pencil class="h-4 w-4" /></button>
                <button class="rounded-lg p-1.5 text-red-500 hover:bg-red-50" @click="remove(c)"><Trash2 class="h-4 w-4" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <AdminPagination v-model:page="page" v-model:per-page="perPage" :total-page="totalPage" :total="total" :per-page="perPage" :loading="loading" />
    </div>

    <AdminModal v-model="modalOpen" :title="editing ? 'Edit Coupon' : 'Tambah Coupon'" max-width="max-w-2xl">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Kode</label>
          <input v-model="form.code" type="text" placeholder="WELCOME10" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.code" class="mt-1 text-xs text-red-600">{{ formErrors.code.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama</label>
          <input v-model="form.name" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.name" class="mt-1 text-xs text-red-600">{{ formErrors.name.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Tipe Diskon</label>
          <select v-model="form.discount_type" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option v-for="t in discountTypes" :key="t" :value="t">{{ t }}</option>
          </select>
          <p v-if="formErrors.discount_type" class="mt-1 text-xs text-red-600">{{ formErrors.discount_type.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">{{ form.discount_type === 'percentage' ? 'Nilai (%)' : 'Nilai (nominal)' }}</label>
          <input v-model.number="form.value" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.value" class="mt-1 text-xs text-red-600">{{ formErrors.value.join(', ') }}</p>
        </div>
        <div v-if="form.discount_type === 'percentage'">
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Maks Diskon</label>
          <input v-model.number="form.max_discount" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Plan (opsional)</label>
          <select v-model="form.plan_id" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option value="">Semua plan</option>
            <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Billing Cycle (opsional)</label>
          <select v-model="form.billing_cycle" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option value="">Semua cycle</option>
            <option v-for="c in billingCycles" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Kuota (0 = tanpa batas)</label>
          <input v-model.number="form.max_uses" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Berlaku Dari</label>
          <input v-model="form.valid_from" type="datetime-local" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Berlaku Sampai</label>
          <input v-model="form.valid_until" type="datetime-local" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div class="flex items-end">
          <label class="flex h-[42px] w-full items-center gap-2 rounded-lg border border-gray-300 px-3 text-sm text-gray-700">
            <input v-model="form.is_active" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-indigo-600" /> Aktif
          </label>
        </div>
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
