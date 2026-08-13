<script setup lang="ts">
import { Plus, Pencil, Trash2, Loader2, Search } from 'lucide-vue-next'
import type { Addon, AdminResponse, AdminPaginated } from '~/types/admin'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const api = useAdminApi()
const toast = useToast()

const addons = ref<Addon[]>([])
const loading = ref(false)
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const totalPage = ref(0)
const search = ref('')

// Kode fitur kanonik (PRD §7) — dipakai sebagai pilihan feature_code.
const featureCodes = [
  'order_per_month',
  'marketplace_channel',
  'warehouse_count',
  'product_count',
  'staff_count',
  'fifo_multi_warehouse',
  'cod_reconciliation',
  'analytics_finance',
  'team_role_permission',
  'api_webhook',
  'support_level',
]

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
  loading.value = true
  try {
    const res = await api.get<AdminResponse<AdminPaginated<Addon>>>('/admin/subscription/addons', {
      page: String(page.value),
      perpage: String(perPage.value),
      search: search.value,
    })
    addons.value = res.data.data || []
    total.value = res.data.total
    totalPage.value = res.data.total_page
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memuat add-on')
  }
  finally {
    loading.value = false
  }
}

onMounted(fetchAddons)
watch([page, perPage], fetchAddons)

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchAddons()
  }, 400)
}

const modalOpen = ref(false)
const editing = ref<Addon | null>(null)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})
const form = reactive({
  code: '',
  name: '',
  description: '',
  feature_code: 'order_per_month',
  limit_value: 0,
  price: 0,
  currency: 'IDR',
  is_active: true,
})

function openCreate() {
  editing.value = null
  Object.assign(form, {
    code: '', name: '', description: '', feature_code: 'order_per_month',
    limit_value: 0, price: 0, currency: 'IDR', is_active: true,
  })
  formErrors.value = {}
  modalOpen.value = true
}

function openEdit(a: Addon) {
  editing.value = a
  Object.assign(form, {
    code: a.code,
    name: a.name,
    description: a.description || '',
    feature_code: a.feature_code,
    limit_value: a.limit_value,
    price: a.price,
    currency: a.currency || 'IDR',
    is_active: a.is_active,
  })
  formErrors.value = {}
  modalOpen.value = true
}

async function save() {
  saving.value = true
  formErrors.value = {}
  try {
    if (editing.value) {
      await api.put(`/admin/subscription/addons/${editing.value.id}`, { ...form })
      toast.success('Add-on diperbarui')
    }
    else {
      await api.post('/admin/subscription/addons/create', { ...form })
      toast.success('Add-on dibuat')
    }
    modalOpen.value = false
    fetchAddons()
  }
  catch (error: any) {
    if (error?.errors) formErrors.value = error.errors
    else toast.error(error?.message || 'Gagal menyimpan add-on')
  }
  finally {
    saving.value = false
  }
}

async function remove(a: Addon) {
  if (!confirm(`Hapus add-on "${a.name}"?`)) return
  try {
    await api.delete(`/admin/subscription/addons/${a.id}`)
    toast.success('Add-on dihapus')
    fetchAddons()
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal menghapus add-on')
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Add-on</h1>
        <p class="mt-1 text-sm text-gray-500">Paket tambahan limit yang dibeli bersamaan dengan langganan.</p>
      </div>
      <button class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700" @click="openCreate">
        <Plus class="h-4 w-4" /> Tambah Add-on
      </button>
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div class="border-b border-gray-100 p-3">
        <div class="relative max-w-xs">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input v-model="search" type="text" placeholder="Cari add-on..." class="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" @input="onSearch" />
        </div>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-16 text-gray-400">
        <Loader2 class="h-6 w-6 animate-spin" />
      </div>
      <table v-else class="w-full text-sm">
        <thead class="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
          <tr>
            <th class="px-4 py-3">Kode</th>
            <th class="px-4 py-3">Nama</th>
            <th class="px-4 py-3">Fitur</th>
            <th class="px-4 py-3 text-right">Limit</th>
            <th class="px-4 py-3 text-right">Harga</th>
            <th class="px-4 py-3">Aktif</th>
            <th class="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-if="!addons.length">
            <td colspan="7" class="px-4 py-10 text-center text-gray-400">Belum ada add-on.</td>
          </tr>
          <tr v-for="a in addons" :key="a.id" class="hover:bg-gray-50/50">
            <td class="px-4 py-3 font-mono text-xs text-gray-700">{{ a.code }}</td>
            <td class="px-4 py-3 font-medium text-gray-900">{{ a.name }}</td>
            <td class="px-4 py-3 text-gray-600">{{ featureName[a.feature_code] || a.feature_code }}</td>
            <td class="px-4 py-3 text-right text-gray-700">+{{ a.limit_value }}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-900">{{ a.currency }} {{ formatCurrency(a.price) }}</td>
            <td class="px-4 py-3">
              <span class="rounded-md px-2 py-0.5 text-xs" :class="a.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'">
                {{ a.is_active ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-1">
                <button class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" @click="openEdit(a)"><Pencil class="h-4 w-4" /></button>
                <button class="rounded-lg p-1.5 text-red-500 hover:bg-red-50" @click="remove(a)"><Trash2 class="h-4 w-4" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <AdminPagination v-model:page="page" v-model:per-page="perPage" :total-page="totalPage" :total="total" :per-page="perPage" :loading="loading" />
    </div>

    <AdminModal v-model="modalOpen" :title="editing ? 'Edit Add-on' : 'Tambah Add-on'">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Kode</label>
          <input v-model="form.code" type="text" placeholder="extra_order_1000" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.code" class="mt-1 text-xs text-red-600">{{ formErrors.code.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama</label>
          <input v-model="form.name" type="text" placeholder="+1000 Order" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.name" class="mt-1 text-xs text-red-600">{{ formErrors.name.join(', ') }}</p>
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Deskripsi</label>
          <textarea v-model="form.description" rows="2" placeholder="Tambah 1000 order per bulan" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Fitur (feature_code)</label>
          <select v-model="form.feature_code" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option v-for="fc in featureCodes" :key="fc" :value="fc">{{ featureName[fc] || fc }} ({{ fc }})</option>
          </select>
          <p v-if="formErrors.feature_code" class="mt-1 text-xs text-red-600">{{ formErrors.feature_code.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Tambahan Limit</label>
          <input v-model.number="form.limit_value" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.limit_value" class="mt-1 text-xs text-red-600">{{ formErrors.limit_value.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Harga</label>
          <input v-model.number="form.price" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.price" class="mt-1 text-xs text-red-600">{{ formErrors.price.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Mata Uang</label>
          <input v-model="form.currency" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
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
