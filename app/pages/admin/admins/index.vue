<script setup lang="ts">
import { Plus, Pencil, Trash2, Loader2, Search, KeyRound } from 'lucide-vue-next'
import type { Admin, AdminRole, AdminResponse, AdminPaginated } from '~/types/admin'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const api = useAdminApi()
const toast = useToast()

const admins = ref<Admin[]>([])
const roles = ref<AdminRole[]>([])
const loading = ref(false)

const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const totalPage = ref(0)
const search = ref('')

async function fetchRoles() {
  try {
    const res = await api.get<AdminResponse<AdminRole[]>>('/admin/admins/roles')
    roles.value = res.data || []
  }
  catch { /* handled globally */ }
}

async function fetchAdmins() {
  loading.value = true
  try {
    const res = await api.get<AdminResponse<AdminPaginated<Admin>>>('/admin/admins/', {
      page: String(page.value),
      perpage: String(perPage.value),
      search: search.value,
    })
    admins.value = res.data.data || []
    total.value = res.data.total
    totalPage.value = res.data.total_page
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memuat admin')
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchRoles()
  fetchAdmins()
})

watch([page, perPage], fetchAdmins)

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchAdmins()
  }, 400)
}

const roleName = (id: string) => roles.value.find(r => r.id === id)?.name || '-'

const statusBadge: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
  deleted: 'bg-red-50 text-red-700',
}

// ---- Create / Edit ----
const modalOpen = ref(false)
const editing = ref<Admin | null>(null)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})

const form = reactive({
  name: '',
  username: '',
  email: '',
  password: '',
  password_confirmation: '',
  role_id: '',
  status: 'active' as Admin['status'],
})

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', username: '', email: '', password: '', password_confirmation: '', role_id: roles.value[0]?.id || '', status: 'active' })
  formErrors.value = {}
  modalOpen.value = true
}

function openEdit(admin: Admin) {
  editing.value = admin
  Object.assign(form, {
    name: admin.name,
    username: admin.username || '',
    email: admin.email,
    password: '',
    password_confirmation: '',
    role_id: admin.role_id,
    status: admin.status,
  })
  formErrors.value = {}
  modalOpen.value = true
}

async function save() {
  saving.value = true
  formErrors.value = {}
  try {
    if (editing.value) {
      const payload: Record<string, unknown> = {
        name: form.name,
        username: form.username,
        email: form.email,
        role_id: form.role_id,
        status: form.status,
      }
      if (form.password) {
        payload.password = form.password
        payload.password_confirmation = form.password_confirmation
      }
      await api.put(`/admin/admins/${editing.value.id}`, payload)
      toast.success('Admin berhasil diperbarui')
    }
    else {
      await api.post('/admin/admins/create', { ...form })
      toast.success('Admin berhasil dibuat')
    }
    modalOpen.value = false
    fetchAdmins()
  }
  catch (error: any) {
    if (error?.errors) formErrors.value = error.errors
    else toast.error(error?.message || 'Gagal menyimpan admin')
  }
  finally {
    saving.value = false
  }
}

async function changeStatus(admin: Admin, status: Admin['status']) {
  try {
    await api.put(`/admin/admins/${admin.id}/status`, { status })
    toast.success('Status diperbarui')
    fetchAdmins()
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memperbarui status')
  }
}

async function remove(admin: Admin) {
  if (!confirm(`Hapus admin "${admin.name}"?`)) return
  try {
    await api.delete(`/admin/admins/${admin.id}`)
    toast.success('Admin berhasil dihapus')
    fetchAdmins()
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal menghapus admin')
  }
}

// ---- Reset password ----
const pwdModalOpen = ref(false)
const pwdTarget = ref<Admin | null>(null)
const pwdSaving = ref(false)
const pwdErrors = ref<Record<string, string[]>>({})
const pwdForm = reactive({ password: '', password_confirmation: '' })

function openResetPassword(admin: Admin) {
  pwdTarget.value = admin
  pwdForm.password = ''
  pwdForm.password_confirmation = ''
  pwdErrors.value = {}
  pwdModalOpen.value = true
}

async function savePassword() {
  if (!pwdTarget.value) return
  pwdSaving.value = true
  pwdErrors.value = {}
  try {
    await api.put(`/admin/admins/${pwdTarget.value.id}/password`, { ...pwdForm })
    toast.success('Password admin direset')
    pwdModalOpen.value = false
  }
  catch (error: any) {
    if (error?.errors) pwdErrors.value = error.errors
    else toast.error(error?.message || 'Gagal reset password')
  }
  finally {
    pwdSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Admin</h1>
        <p class="mt-1 text-sm text-gray-500">Kelola akun admin platform.</p>
      </div>
      <button
        class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" /> Tambah Admin
      </button>
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div class="border-b border-gray-100 p-3">
        <div class="relative max-w-xs">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="search"
            type="text"
            placeholder="Cari admin..."
            class="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            @input="onSearch"
          />
        </div>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-16 text-gray-400">
        <Loader2 class="h-6 w-6 animate-spin" />
      </div>
      <table v-else class="w-full text-sm">
        <thead class="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
          <tr>
            <th class="px-4 py-3">Nama</th>
            <th class="px-4 py-3">Email</th>
            <th class="px-4 py-3">Role</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-if="!admins.length">
            <td colspan="5" class="px-4 py-10 text-center text-gray-400">Belum ada admin.</td>
          </tr>
          <tr v-for="admin in admins" :key="admin.id" class="hover:bg-gray-50/50">
            <td class="px-4 py-3 font-medium text-gray-900">{{ admin.name }}</td>
            <td class="px-4 py-3 text-gray-600">{{ admin.email }}</td>
            <td class="px-4 py-3 text-gray-600">{{ admin.role?.name || roleName(admin.role_id) }}</td>
            <td class="px-4 py-3">
              <select
                :value="admin.status"
                class="rounded-md border-0 px-2 py-1 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                :class="statusBadge[admin.status]"
                @change="changeStatus(admin, ($event.target as HTMLSelectElement).value as Admin['status'])"
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="deleted">deleted</option>
              </select>
            </td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-1">
                <button class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" title="Edit" @click="openEdit(admin)">
                  <Pencil class="h-4 w-4" />
                </button>
                <button class="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50" title="Reset password" @click="openResetPassword(admin)">
                  <KeyRound class="h-4 w-4" />
                </button>
                <button class="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Hapus" @click="remove(admin)">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <AdminPagination
        v-model:page="page"
        v-model:per-page="perPage"
        :total-page="totalPage"
        :total="total"
        :per-page="perPage"
        :loading="loading"
      />
    </div>

    <!-- Create / Edit modal -->
    <AdminModal v-model="modalOpen" :title="editing ? 'Edit Admin' : 'Tambah Admin'">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama</label>
          <input v-model="form.name" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.name" class="mt-1 text-xs text-red-600">{{ formErrors.name.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Username</label>
          <input v-model="form.username" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.username" class="mt-1 text-xs text-red-600">{{ formErrors.username.join(', ') }}</p>
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
          <input v-model="form.email" type="email" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.email" class="mt-1 text-xs text-red-600">{{ formErrors.email.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Role</label>
          <select v-model="form.role_id" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option value="" disabled>Pilih role</option>
            <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
          <p v-if="formErrors.role_id" class="mt-1 text-xs text-red-600">{{ formErrors.role_id.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
          <select v-model="form.status" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="deleted">deleted</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">
            Password {{ editing ? '(kosongkan jika tidak diubah)' : '' }}
          </label>
          <input v-model="form.password" type="password" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.password" class="mt-1 text-xs text-red-600">{{ formErrors.password.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Konfirmasi Password</label>
          <input v-model="form.password_confirmation" type="password" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="formErrors.password_confirmation" class="mt-1 text-xs text-red-600">{{ formErrors.password_confirmation.join(', ') }}</p>
        </div>
      </div>

      <template #footer>
        <button class="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50" @click="modalOpen = false">
          Batal
        </button>
        <button
          :disabled="saving"
          class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          @click="save"
        >
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          Simpan
        </button>
      </template>
    </AdminModal>

    <!-- Reset password modal -->
    <AdminModal v-model="pwdModalOpen" title="Reset Password" max-width="max-w-md">
      <p class="mb-4 text-sm text-gray-500">
        Reset password untuk <span class="font-medium text-gray-900">{{ pwdTarget?.name }}</span>.
      </p>
      <div class="space-y-4">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Password Baru</label>
          <input v-model="pwdForm.password" type="password" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="pwdErrors.password" class="mt-1 text-xs text-red-600">{{ pwdErrors.password.join(', ') }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Konfirmasi Password</label>
          <input v-model="pwdForm.password_confirmation" type="password" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <p v-if="pwdErrors.password_confirmation" class="mt-1 text-xs text-red-600">{{ pwdErrors.password_confirmation.join(', ') }}</p>
        </div>
      </div>
      <template #footer>
        <button class="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50" @click="pwdModalOpen = false">
          Batal
        </button>
        <button
          :disabled="pwdSaving"
          class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          @click="savePassword"
        >
          <Loader2 v-if="pwdSaving" class="h-4 w-4 animate-spin" />
          Reset
        </button>
      </template>
    </AdminModal>
  </div>
</template>
