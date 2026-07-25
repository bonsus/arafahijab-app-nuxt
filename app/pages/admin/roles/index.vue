<script setup lang="ts">
import { Plus, Pencil, Trash2, Loader2, ShieldCheck } from 'lucide-vue-next'
import type { AdminRole, AdminResponse } from '~/types/admin'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const api = useAdminApi()
const toast = useToast()

const roles = ref<AdminRole[]>([])
const loading = ref(false)

async function fetchRoles() {
  loading.value = true
  try {
    const res = await api.get<AdminResponse<AdminRole[]>>('/admin/admins/roles')
    roles.value = res.data || []
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal memuat role')
  }
  finally {
    loading.value = false
  }
}

onMounted(fetchRoles)

// ---- Create / Edit ----
const modalOpen = ref(false)
const editing = ref<AdminRole | null>(null)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})

const form = reactive({
  name: '',
  isSuper: false,
  permissionText: '',
})

function openCreate() {
  editing.value = null
  form.name = ''
  form.isSuper = false
  form.permissionText = ''
  formErrors.value = {}
  modalOpen.value = true
}

function openEdit(role: AdminRole) {
  editing.value = role
  form.name = role.name
  form.isSuper = role.permission.includes('*')
  form.permissionText = role.permission.filter(p => p !== '*').join('\n')
  formErrors.value = {}
  modalOpen.value = true
}

function buildPermissions(): string[] {
  if (form.isSuper) return ['*']
  return form.permissionText
    .split(/[\n,]/)
    .map(p => p.trim())
    .filter(Boolean)
}

async function save() {
  saving.value = true
  formErrors.value = {}
  const payload = { name: form.name, permission: buildPermissions() }
  try {
    if (editing.value) {
      await api.put(`/admin/admins/roles/${editing.value.id}`, payload)
      toast.success('Role berhasil diperbarui')
    }
    else {
      await api.post('/admin/admins/roles/create', payload)
      toast.success('Role berhasil dibuat')
    }
    modalOpen.value = false
    fetchRoles()
  }
  catch (error: any) {
    if (error?.errors) formErrors.value = error.errors
    else toast.error(error?.message || 'Gagal menyimpan role')
  }
  finally {
    saving.value = false
  }
}

async function remove(role: AdminRole) {
  if (!confirm(`Hapus role "${role.name}"?`)) return
  try {
    await api.delete(`/admin/admins/roles/${role.id}`)
    toast.success('Role berhasil dihapus')
    fetchRoles()
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal menghapus role')
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Role & Permission</h1>
        <p class="mt-1 text-sm text-gray-500">Kelola role admin beserta hak aksesnya.</p>
      </div>
      <button
        class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" /> Tambah Role
      </button>
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div v-if="loading" class="flex items-center justify-center py-16 text-gray-400">
        <Loader2 class="h-6 w-6 animate-spin" />
      </div>
      <table v-else class="w-full text-sm">
        <thead class="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
          <tr>
            <th class="px-4 py-3">Nama Role</th>
            <th class="px-4 py-3">Permission</th>
            <th class="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-if="!roles.length">
            <td colspan="3" class="px-4 py-10 text-center text-gray-400">Belum ada role.</td>
          </tr>
          <tr v-for="role in roles" :key="role.id" class="hover:bg-gray-50/50">
            <td class="px-4 py-3 font-medium text-gray-900">{{ role.name }}</td>
            <td class="px-4 py-3">
              <span
                v-if="role.permission.includes('*')"
                class="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
              >
                <ShieldCheck class="h-3.5 w-3.5" /> Super Admin
              </span>
              <div v-else class="flex flex-wrap gap-1">
                <span
                  v-for="p in role.permission.slice(0, 6)"
                  :key="p"
                  class="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600"
                >{{ p }}</span>
                <span v-if="role.permission.length > 6" class="text-[11px] text-gray-400">
                  +{{ role.permission.length - 6 }} lagi
                </span>
                <span v-if="!role.permission.length" class="text-xs text-gray-400">-</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-1">
                <button class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" @click="openEdit(role)">
                  <Pencil class="h-4 w-4" />
                </button>
                <button class="rounded-lg p-1.5 text-red-500 hover:bg-red-50" @click="remove(role)">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AdminModal v-model="modalOpen" :title="editing ? 'Edit Role' : 'Tambah Role'">
      <div class="space-y-4">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Role</label>
          <input
            v-model="form.name"
            type="text"
            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <p v-if="formErrors.name" class="mt-1 text-xs text-red-600">{{ formErrors.name.join(', ') }}</p>
        </div>

        <label class="flex items-center gap-2 text-sm text-gray-700">
          <input v-model="form.isSuper" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-indigo-600" />
          Super Admin (akses penuh <code class="rounded bg-gray-100 px-1">*</code>)
        </label>

        <div v-if="!form.isSuper">
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Permission</label>
          <textarea
            v-model="form.permissionText"
            rows="6"
            placeholder="subscription.read&#10;subscription.write&#10;invoice.read"
            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-mono text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <p class="mt-1 text-xs text-gray-400">Satu permission per baris (format: <code>modul.aksi</code>).</p>
          <p v-if="formErrors.permission" class="mt-1 text-xs text-red-600">{{ formErrors.permission.join(', ') }}</p>
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
  </div>
</template>
