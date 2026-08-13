<script setup lang="ts">
import { Plus, Pencil, Trash2, Loader2, Search, Power } from 'lucide-vue-next'
import type { BankAccount, AdminResponse, AdminPaginated } from '~/types/admin'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const api = useAdminApi()
const toast = useToast()
const { confirm } = useConfirm()

const accounts = ref<BankAccount[]>([])
const loading = ref(false)
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const totalPage = ref(0)
const search = ref('')
const statusFilter = ref('')

async function fetchAccounts() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      perpage: String(perPage.value),
      search: search.value,
    }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await api.get<AdminResponse<AdminPaginated<BankAccount>>>('/admin/subscription/bank-accounts', params)
    accounts.value = res.data.data || []
    total.value = res.data.total
    totalPage.value = res.data.total_page
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memuat rekening bank')
  }
  finally {
    loading.value = false
  }
}

onMounted(fetchAccounts)
watch([page, perPage, statusFilter], fetchAccounts)

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchAccounts()
  }, 400)
}

// ---- Modal create/edit ----
const modalOpen = ref(false)
const editing = ref<BankAccount | null>(null)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})
const form = reactive({
  bank_code: '',
  bank_name: '',
  account_name: '',
  account_number: '',
  branch: '',
  logo_url: '',
  description: '',
  is_active: true,
  sort_order: 0,
})

function openCreate() {
  editing.value = null
  Object.assign(form, {
    bank_code: '', bank_name: '', account_name: '', account_number: '',
    branch: '', logo_url: '', description: '', is_active: true, sort_order: 0,
  })
  formErrors.value = {}
  modalOpen.value = true
}

function openEdit(a: BankAccount) {
  editing.value = a
  Object.assign(form, {
    bank_code: a.bank_code || '',
    bank_name: a.bank_name,
    account_name: a.account_name,
    account_number: a.account_number,
    branch: a.branch || '',
    logo_url: a.logo_url || '',
    description: a.description || '',
    is_active: a.is_active,
    sort_order: a.sort_order || 0,
  })
  formErrors.value = {}
  modalOpen.value = true
}

async function save() {
  saving.value = true
  formErrors.value = {}
  try {
    const payload = { ...form }
    if (editing.value) {
      const res = await api.put<AdminResponse<BankAccount>>(`/admin/subscription/bank-accounts/${editing.value.id}`, payload)
      toast.success(res.message || 'Rekening diperbarui')
    }
    else {
      const res = await api.post<AdminResponse<BankAccount>>('/admin/subscription/bank-accounts/create', payload)
      toast.success(res.message || 'Rekening dibuat')
    }
    modalOpen.value = false
    fetchAccounts()
  }
  catch (error: any) {
    if (error?.errors) formErrors.value = error.errors
    else toast.error(error?.message || 'Gagal menyimpan rekening')
  }
  finally {
    saving.value = false
  }
}

// ---- Status toggle ----
const busy = reactive<Record<string, boolean>>({})
async function toggleStatus(a: BankAccount) {
  busy[a.id] = true
  try {
    const res = await api.patch<AdminResponse<BankAccount>>(`/admin/subscription/bank-accounts/${a.id}/status`, {
      is_active: !a.is_active,
    })
    const idx = accounts.value.findIndex(x => x.id === a.id)
    if (idx !== -1) accounts.value[idx] = res.data
    toast.success(res.data.is_active ? 'Rekening diaktifkan' : 'Rekening dinonaktifkan')
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal mengubah status')
  }
  finally {
    busy[a.id] = false
  }
}

// ---- Delete ----
const deleting = ref('')
async function remove(a: BankAccount) {
  const ok = await confirm({
    title: 'Hapus Rekening',
    message: `Hapus rekening ${a.bank_name} - ${a.account_number}? Histori transaksi lama tetap tersimpan.`,
    confirmText: 'Hapus',
  })
  if (!ok) return
  deleting.value = a.id
  try {
    await api.delete(`/admin/subscription/bank-accounts/${a.id}`)
    toast.success('Rekening dihapus')
    fetchAccounts()
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal menghapus rekening')
  }
  finally {
    deleting.value = ''
  }
}

const bankIcon = (code: string) => `/images/banks/${(code || '').toLowerCase()}.svg`
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Rekening Bank</h1>
        <p class="mt-1 text-sm text-gray-500">Rekening tujuan untuk pembayaran Transfer Bank Manual (A.10).</p>
      </div>
      <button class="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700" @click="openCreate">
        <Plus class="h-4 w-4" /> Tambah Rekening
      </button>
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div class="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3">
        <div class="relative min-w-[220px] flex-1">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="search"
            type="text"
            placeholder="Cari nama bank / no rekening"
            class="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            @input="onSearch"
          />
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
            <th class="px-4 py-3">Bank</th>
            <th class="px-4 py-3">Atas Nama</th>
            <th class="px-4 py-3">No. Rekening</th>
            <th class="px-4 py-3">Cabang</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-if="!accounts.length">
            <td colspan="6" class="px-4 py-10 text-center text-gray-400">Belum ada rekening bank.</td>
          </tr>
          <tr v-for="a in accounts" :key="a.id" class="hover:bg-gray-50/50">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <span class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-gray-50 ring-1 ring-gray-100">
                  <img :src="bankIcon(a.bank_code || a.bank_name)" :alt="a.bank_name" class="h-6 w-6 object-contain" @error="($event.target as HTMLImageElement).src = '/images/banks/other.svg'">
                </span>
                <span class="font-medium text-gray-900">{{ a.bank_name }}</span>
              </div>
            </td>
            <td class="px-4 py-3 text-gray-700">{{ a.account_name }}</td>
            <td class="px-4 py-3 font-mono text-xs text-gray-600">{{ a.account_number }}</td>
            <td class="px-4 py-3 text-gray-500">{{ a.branch || '-' }}</td>
            <td class="px-4 py-3">
              <button
                class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium disabled:opacity-60"
                :class="a.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'"
                :disabled="busy[a.id]"
                @click="toggleStatus(a)"
              >
                <Power v-if="busy[a.id]" class="h-3 w-3 animate-pulse" />
                {{ a.is_active ? 'Aktif' : 'Nonaktif' }}
              </button>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1">
                <button class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-indigo-600" title="Edit" @click="openEdit(a)">
                  <Pencil class="h-4 w-4" />
                </button>
                <button class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600" title="Hapus" :disabled="deleting === a.id" @click="remove(a)">
                  <Trash2 v-if="deleting !== a.id" class="h-4 w-4" />
                  <Loader2 v-else class="h-4 w-4 animate-spin" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <AdminPagination v-model:page="page" v-model:per-page="perPage" :total-page="totalPage" :total="total" :per-page="perPage" :loading="loading" />
    </div>

    <!-- Modal create/edit -->
    <AdminModal v-model="modalOpen" :title="editing ? 'Edit Rekening Bank' : 'Tambah Rekening Bank'" max-width="max-w-md">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Kode Bank</label>
            <input v-model="form.bank_code" type="text" placeholder="BCA" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            <p v-if="formErrors.bank_code" class="mt-1 text-xs text-red-600">{{ formErrors.bank_code.join(', ') }}</p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Bank</label>
            <input v-model="form.bank_name" type="text" placeholder="Bank Central Asia" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            <p v-if="formErrors.bank_name" class="mt-1 text-xs text-red-600">{{ formErrors.bank_name.join(', ') }}</p>
          </div>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Atas Nama</label>
          <input v-model="form.account_name" type="text" placeholder="PT ORDEO MITRA DIGITAL" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.account_name" class="mt-1 text-xs text-red-600">{{ formErrors.account_name.join(', ') }}</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">No. Rekening</label>
            <input v-model="form.account_number" type="text" placeholder="1234567890" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            <p v-if="formErrors.account_number" class="mt-1 text-xs text-red-600">{{ formErrors.account_number.join(', ') }}</p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Cabang</label>
            <input v-model="form.branch" type="text" placeholder="Sukabumi" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            <p v-if="formErrors.branch" class="mt-1 text-xs text-red-600">{{ formErrors.branch.join(', ') }}</p>
          </div>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">URL Logo</label>
          <input v-model="form.logo_url" type="text" placeholder="https://..." class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.logo_url" class="mt-1 text-xs text-red-600">{{ formErrors.logo_url.join(', ') }}</p>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Deskripsi</label>
          <input v-model="form.description" type="text" placeholder="Rekening operasional" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.description" class="mt-1 text-xs text-red-600">{{ formErrors.description.join(', ') }}</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Urutan</label>
            <input v-model.number="form.sort_order" type="number" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
            <label class="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
              <input v-model="form.is_active" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              Aktif
            </label>
          </div>
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
