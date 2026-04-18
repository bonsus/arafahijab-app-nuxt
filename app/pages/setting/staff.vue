<script setup lang="ts">
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, KeyRound,
  Search, ChevronLeft, ChevronRight, Shield, Users, X, Eye, EyeOff, Headset,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const toast = useToast()
const authStore = useAuthStore()
const { confirm } = useConfirm()

const isSelf = (user: User) => user.id === authStore.user?.id

// ─── Types ────────────────────────────────────
interface Role {
  id: string
  name: string
  permission: string[]
  CreatedAt: string
}

interface User {
  id: string
  name: string
  email: string
  phone: string
  company: string
  role_id: string
  status: string
  type: string
  is_cs: boolean
  CreatedAt: string
  role?: Role
}

interface PaginatedUsers {
  data: User[]
  page: number
  per_page: number
  total_page: number
  total: number
}

// ─── Tab State ────────────────────────────────
const activeTab = ref<'users' | 'roles'>('users')

// ─── Roles ────────────────────────────────────
const roles = ref<Role[]>([])
const rolesLoading = ref(true)

async function fetchRoles() {
  rolesLoading.value = true
  try {
    const res = await api.get<{ data: Role[] }>('/users/roles')
    roles.value = res.data || []
  } catch { roles.value = [] }
  finally { rolesLoading.value = false }
}

// Role modal
const showRoleModal = ref(false)
const editingRole = ref<Role | null>(null)
const savingRole = ref(false)
const roleErrors = ref<Record<string, string[]>>({})

const roleForm = reactive({
  name: '',
  permission: [] as string[],
})

// Permission groups — berdasarkan menu sidebar
const permissionGroups = [
  { label: 'Dashboard', permissions: ['dashboard.read'] },
  { label: 'Penjualan', permissions: ['penjualan.read', 'penjualan.create', 'penjualan.update', 'penjualan.delete'] },
  { label: 'Pembelian', permissions: ['pembelian.read', 'pembelian.create', 'pembelian.update', 'pembelian.delete'] },
  { label: 'Produk', permissions: ['produk.read', 'produk.create', 'produk.update', 'produk.delete'] },
  { label: 'Customer', permissions: ['customer.read', 'customer.create', 'customer.update', 'customer.delete'] },
  { label: 'Inventory', permissions: ['inventory.read', 'inventory.create', 'inventory.update', 'inventory.delete'] },
  { label: 'Laporan', permissions: ['laporan.penjualan', 'laporan.pembelian', 'laporan.return', 'laporan.stock'] },
  { label: 'Staff & Role', permissions: ['user.read', 'user.create', 'user.update', 'user.delete', 'role.read', 'role.create', 'role.update', 'role.delete'] },
  { label: 'Pengaturan', permissions: ['setting.read', 'setting.update'] },
  { label: 'Rekening Bank', permissions: ['bank.read', 'bank.create', 'bank.update', 'bank.delete'] },
]

function openCreateRole() {
  editingRole.value = null
  roleForm.name = ''
  roleForm.permission = []
  roleErrors.value = {}
  showRoleModal.value = true
}

function openEditRole(role: Role) {
  editingRole.value = role
  roleForm.name = role.name
  roleForm.permission = [...role.permission]
  roleErrors.value = {}
  showRoleModal.value = true
}

function togglePermission(perm: string) {
  const idx = roleForm.permission.indexOf(perm)
  if (idx === -1) roleForm.permission.push(perm)
  else roleForm.permission.splice(idx, 1)
}

function toggleGroupAll(perms: string[]) {
  const allSelected = perms.every(p => roleForm.permission.includes(p))
  if (allSelected) {
    roleForm.permission = roleForm.permission.filter(p => !perms.includes(p))
  } else {
    perms.forEach(p => { if (!roleForm.permission.includes(p)) roleForm.permission.push(p) })
  }
}

async function handleSaveRole() {
  savingRole.value = true
  roleErrors.value = {}
  try {
    const payload = { name: roleForm.name, permission: [...roleForm.permission] }
    if (editingRole.value) {
      await api.put(`/users/roles/${editingRole.value.id}`, payload)
      toast.success('Role berhasil diperbarui')
    } else {
      await api.post('/users/roles/create', payload)
      toast.success('Role berhasil dibuat')
    }
    showRoleModal.value = false
    await fetchRoles()
  } catch (err: any) {
    if (err.errors) roleErrors.value = err.errors
    else toast.error(err.message || 'Gagal menyimpan role')
  } finally { savingRole.value = false }
}

async function handleDeleteRole(role: Role) {
  const ok = await confirm({
    title: 'Hapus Role',
    message: `Yakin ingin menghapus role "${role.name}"? Semua staff dengan role ini perlu dipindahkan ke role lain.`,
    confirmText: 'Hapus',
  })
  if (!ok) return
  try {
    await api.delete(`/users/roles/${role.id}`)
    toast.success('Role berhasil dihapus')
    await fetchRoles()
  } catch (err: any) { toast.error(err.message || 'Gagal menghapus role') }
}

// ─── Users ────────────────────────────────────
const users = ref<User[]>([])
const usersLoading = ref(true)
const searchQuery = ref('')
const filterRole = ref('')
const currentPage = ref(1)
const perPage = ref(20)
const totalPages = ref(1)
const totalUsers = ref(0)

async function fetchUsers() {
  usersLoading.value = true
  try {
    const params = new URLSearchParams({
      page: String(currentPage.value),
      per_page: String(perPage.value),
    })
    if (searchQuery.value) params.set('search', searchQuery.value)
    if (filterRole.value) params.set('role_id', filterRole.value)
    const res = await api.get<{ data: PaginatedUsers }>(`/users/index?${params}`)
    const d = res.data
    users.value = d?.data || []
    totalPages.value = d?.total_page || 1
    totalUsers.value = d?.total || 0
  } catch { users.value = [] }
  finally { usersLoading.value = false }
}

let searchTimeout: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchUsers()
  }, 400)
}

function goPage(p: number) {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  fetchUsers()
}

// User modal
const showUserModal = ref(false)
const editingUser = ref<User | null>(null)
const savingUser = ref(false)
const userErrors = ref<Record<string, string[]>>({})

const userForm = reactive({
  name: '',
  email: '',
  phone: '',
  company: '',
  role_id: '',
  status: 'active',
  is_cs: false,
  password: '',
  password_confirmation: '',
})

const showPassword = ref(false)

function openCreateUser() {
  editingUser.value = null
  userForm.name = ''
  userForm.email = ''
  userForm.phone = ''
  userForm.company = ''
  userForm.role_id = ''
  userForm.status = 'active'
  userForm.is_cs = false
  userForm.password = ''
  userForm.password_confirmation = ''
  showPassword.value = false
  userErrors.value = {}
  showUserModal.value = true
}

function openEditUser(user: User) {
  editingUser.value = user
  userForm.name = user.name
  userForm.email = user.email
  userForm.phone = user.phone
  userForm.company = user.company || ''
  userForm.role_id = user.role_id
  userForm.status = user.status
  userForm.is_cs = user.is_cs || false
  userForm.password = ''
  userForm.password_confirmation = ''
  showPassword.value = false
  userErrors.value = {}
  showUserModal.value = true
}

async function handleSaveUser() {
  savingUser.value = true
  userErrors.value = {}
  try {
    if (editingUser.value) {
      const { password, password_confirmation, ...updateData } = userForm
      await api.put(`/users/${editingUser.value.id}`, updateData)
      toast.success('Staff berhasil diperbarui')
    } else {
      await api.post('/users/create', { ...userForm })
      toast.success('Staff berhasil ditambahkan')
    }
    showUserModal.value = false
    await fetchUsers()
  } catch (err: any) {
    if (err.errors) userErrors.value = err.errors
    else toast.error(err.message || 'Gagal menyimpan data')
  } finally { savingUser.value = false }
}

async function handleDeleteUser(user: User) {
  const ok = await confirm({
    title: 'Hapus Staff',
    message: `Yakin ingin menghapus staff "${user.name}"?`,
    confirmText: 'Hapus',
  })
  if (!ok) return
  try {
    await api.delete(`/users/${user.id}`)
    toast.success('Staff berhasil dihapus')
    await fetchUsers()
  } catch (err: any) { toast.error(err.message || 'Gagal menghapus staff') }
}

async function toggleUserStatus(user: User) {
  const newStatus = user.status === 'active' ? 'inactive' : 'active'
  try {
    await api.put(`/users/${user.id}/status`, { status: newStatus })
    user.status = newStatus
    toast.success(`Status diubah ke ${newStatus}`)
  } catch (err: any) { toast.error(err.message || 'Gagal mengubah status') }
}

// Password modal
const showPasswordModal = ref(false)
const passwordTarget = ref<User | null>(null)
const savingPassword = ref(false)
const passwordErrors = ref<Record<string, string[]>>({})
const showNewPassword = ref(false)

const passwordForm = reactive({
  password: '',
  password_confirmation: '',
})

function openPasswordModal(user: User) {
  passwordTarget.value = user
  passwordForm.password = ''
  passwordForm.password_confirmation = ''
  passwordErrors.value = {}
  showNewPassword.value = false
  showPasswordModal.value = true
}

async function handleSavePassword() {
  savingPassword.value = true
  passwordErrors.value = {}
  try {
    await api.put(`/users/${passwordTarget.value!.id}/password`, { ...passwordForm })
    toast.success('Password berhasil diperbarui')
    showPasswordModal.value = false
  } catch (err: any) {
    if (err.errors) passwordErrors.value = err.errors
    else toast.error(err.message || 'Gagal mengubah password')
  } finally { savingPassword.value = false }
}

// ─── Init ─────────────────────────────────────
onMounted(async () => {
  await fetchRoles()
  await fetchUsers()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Staff & Role</h1>
      <div class="flex gap-2">
        <button
          v-if="activeTab === 'roles'"
          class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          @click="openCreateRole"
        >
          <Plus class="h-4 w-4" /> Tambah Role
        </button>
        <button
          v-else
          class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          @click="openCreateUser"
        >
          <Plus class="h-4 w-4" /> Tambah Staff
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 rounded-lg bg-gray-100 p-1">
      <button
        class="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
        :class="activeTab === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
        @click="activeTab = 'users'"
      >
        <Users class="h-4 w-4" /> Staff
      </button>
      <button
        class="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
        :class="activeTab === 'roles' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
        @click="activeTab = 'roles'"
      >
        <Shield class="h-4 w-4" /> Role
      </button>
    </div>

    <!-- ══════════ USERS TAB ══════════ -->
    <div v-if="activeTab === 'users'">
      <!-- Search + Filter -->
      <div class="mb-4 flex flex-col gap-3 sm:flex-row">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari nama, email, atau perusahaan..."
            class="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            @input="onSearch"
          />
        </div>
        <select
          v-model="filterRole"
          class="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:w-48"
          @change="currentPage = 1; fetchUsers()"
        >
          <option value="">Semua Role</option>
          <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="usersLoading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="flex animate-pulse items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div class="h-10 w-10 rounded-full bg-gray-200" />
          <div class="flex-1 space-y-2">
            <div class="h-4 w-40 rounded bg-gray-200" />
            <div class="h-3 w-56 rounded bg-gray-200" />
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="!users.length" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
        <p class="text-gray-500">Tidak ada staff ditemukan.</p>
      </div>

      <!-- User list -->
      <div v-else class="space-y-3">
        <div
          v-for="user in users"
          :key="user.id"
          class="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md sm:items-center sm:gap-4"
        >
          <!-- Avatar -->
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
            {{ user.name.charAt(0).toUpperCase() }}
          </div>

          <!-- Info -->
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1 sm:gap-2">
              <span class="font-semibold text-sm text-gray-900">{{ user.name }}</span>
              <span
                v-if="isSelf(user)"
                class="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700"
              >Anda</span>
              <span
                v-if="user.type === 'owner'"
                class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
              >Owner</span>
              <span
                v-if="user.is_cs"
                class="inline-flex items-center gap-0.5 rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-700"
              ><Headset class="h-3 w-3" /> CS</span>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
              >{{ user.status === 'active' ? 'Aktif' : 'Nonaktif' }}</span>
            </div>
            <p class="truncate text-sm text-gray-500">{{ user.email }} &middot; {{ user.phone }}</p>
            <p v-if="user.role" class="mt-0.5 text-xs text-gray-400">
              <Shield class="mr-0.5 inline h-3 w-3" /> {{ user.role.name }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              v-if="!isSelf(user)"
              class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 sm:p-2"
              title="Toggle Status"
              @click="toggleUserStatus(user)"
            >
              <ToggleRight v-if="user.status === 'active'" class="h-5 w-5 text-green-500" />
              <ToggleLeft v-else class="h-5 w-5 text-gray-400" />
            </button>
            <button
              class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 sm:p-2"
              title="Ubah Password"
              @click="openPasswordModal(user)"
            >
              <KeyRound class="h-4 w-4" />
            </button>
            <button
              class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 sm:p-2"
              title="Edit"
              @click="openEditUser(user)"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              v-if="user.type !== 'owner' && !isSelf(user)"
              class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 sm:p-2"
              title="Hapus"
              @click="handleDeleteUser(user)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-xs text-gray-500 sm:text-sm">
          Halaman {{ currentPage }} dari {{ totalPages }} ({{ totalUsers }} staff)
        </p>
        <div class="flex gap-1">
          <button
            :disabled="currentPage <= 1"
            class="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            @click="goPage(currentPage - 1)"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <button
            :disabled="currentPage >= totalPages"
            class="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            @click="goPage(currentPage + 1)"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════ ROLES TAB ══════════ -->
    <div v-if="activeTab === 'roles'">
      <!-- Loading -->
      <div v-if="rolesLoading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="animate-pulse rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div class="h-5 w-28 rounded bg-gray-200" />
          <div class="mt-3 flex flex-wrap gap-2">
            <div v-for="j in 4" :key="j" class="h-6 w-20 rounded-full bg-gray-200" />
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="!roles.length" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
        <p class="text-gray-500">Belum ada role. Tambahkan role terlebih dahulu.</p>
      </div>

      <!-- Role list -->
      <div v-else class="space-y-3">
        <div
          v-for="role in roles"
          :key="role.id"
          class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md"
        >
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-semibold text-sm text-gray-900">{{ role.name }}</h3>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <span
                  v-for="perm in role.permission"
                  :key="perm"
                  class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                >{{ perm }}</span>
                <span v-if="!role.permission?.length" class="text-xs text-gray-400">Tidak ada permission</span>
              </div>
            </div>
            <div class="flex shrink-0 gap-1">
              <button
                class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Edit"
                @click="openEditRole(role)"
              >
                <Pencil class="h-4 w-4" />
              </button>
              <button
                class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                title="Hapus"
                @click="handleDeleteRole(role)"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════ USER MODAL ══════════ -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showUserModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="showUserModal = false">
          <div class="flex w-full max-w-lg flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;" @click.stop>
            <div class="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 class="text-lg font-semibold text-gray-900">
                {{ editingUser ? 'Edit Staff' : 'Tambah Staff' }}
              </h2>
              <button class="rounded-lg p-1 text-gray-400 hover:bg-gray-100" @click="showUserModal = false">
                <X class="h-5 w-5" />
              </button>
            </div>

            <div class="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <!-- Name -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama <span class="text-red-500">*</span></label>
                <input v-model="userForm.name" type="text" placeholder="Nama lengkap" class="modal-input" />
                <p v-if="userErrors.name" class="mt-1 text-xs text-red-600">{{ userErrors.name[0] }}</p>
              </div>
              <!-- Email -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Email <span class="text-red-500">*</span></label>
                <input v-model="userForm.email" type="email" placeholder="email@contoh.com" class="modal-input" />
                <p v-if="userErrors.email" class="mt-1 text-xs text-red-600">{{ userErrors.email[0] }}</p>
              </div>
              <!-- Phone -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">No. Telepon <span class="text-red-500">*</span></label>
                <input v-model="userForm.phone" type="text" placeholder="628xxxxxxxxxx" class="modal-input" />
                <p v-if="userErrors.phone" class="mt-1 text-xs text-red-600">{{ userErrors.phone[0] }}</p>
              </div>
              <!-- Company -->
              <!-- <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Perusahaan</label>
                <input v-model="userForm.company" type="text" placeholder="Nama perusahaan (opsional)" class="modal-input" />
              </div> -->
              <!-- Role -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Role <span class="text-red-500">*</span></label>
                <select v-model="userForm.role_id" class="modal-input">
                  <option value="">Pilih Role</option>
                  <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
                </select>
                <p v-if="userErrors.role_id" class="mt-1 text-xs text-red-600">{{ userErrors.role_id[0] }}</p>
              </div>
              <!-- Status -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Status <span class="text-red-500">*</span></label>
                <select v-model="userForm.status" class="modal-input">
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
              <!-- Customer Service -->
              <div>
                <label class="flex cursor-pointer items-center gap-3">
                  <input
                    v-model="userForm.is_cs"
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span class="text-sm font-medium text-gray-700">Customer Service (CS)</span>
                </label>
                <p class="ml-7 mt-0.5 text-xs text-gray-400">Tandai user ini sebagai customer service</p>
              </div>
              <!-- Password (create only) -->
              <template v-if="!editingUser">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Password <span class="text-red-500">*</span></label>
                  <div class="relative">
                    <input
                      v-model="userForm.password"
                      :type="showPassword ? 'text' : 'password'"
                      placeholder="Minimal 8 karakter"
                      class="modal-input pr-10"
                    />
                    <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" @click="showPassword = !showPassword">
                      <Eye v-if="showPassword" class="h-4 w-4" />
                      <EyeOff v-else class="h-4 w-4" />
                    </button>
                  </div>
                  <p v-if="userErrors.password" class="mt-1 text-xs text-red-600">{{ userErrors.password[0] }}</p>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Konfirmasi Password <span class="text-red-500">*</span></label>
                  <input
                    v-model="userForm.password_confirmation"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Ulangi password"
                    class="modal-input"
                  />
                  <p v-if="userErrors.password_confirmation" class="mt-1 text-xs text-red-600">{{ userErrors.password_confirmation[0] }}</p>
                </div>
              </template>
            </div>

            <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" @click="showUserModal = false">Batal</button>
              <button
                :disabled="savingUser"
                class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                @click="handleSaveUser"
              >{{ savingUser ? 'Menyimpan...' : 'Simpan' }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══════════ PASSWORD MODAL ══════════ -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showPasswordModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="showPasswordModal = false">
          <div class="flex w-full max-w-sm flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;" @click.stop>
            <div class="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 class="text-lg font-semibold text-gray-900">Ubah Password</h2>
              <button class="rounded-lg p-1 text-gray-400 hover:bg-gray-100" @click="showPasswordModal = false">
                <X class="h-5 w-5" />
              </button>
            </div>

            <div class="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <p class="text-sm text-gray-500">Ubah password untuk <span class="font-semibold text-gray-900">{{ passwordTarget?.name }}</span></p>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Password Baru</label>
                <div class="relative">
                  <input
                    v-model="passwordForm.password"
                    :type="showNewPassword ? 'text' : 'password'"
                    placeholder="Minimal 8 karakter"
                    class="modal-input pr-10"
                  />
                  <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" @click="showNewPassword = !showNewPassword">
                    <Eye v-if="showNewPassword" class="h-4 w-4" />
                    <EyeOff v-else class="h-4 w-4" />
                  </button>
                </div>
                <p v-if="passwordErrors.password" class="mt-1 text-xs text-red-600">{{ passwordErrors.password[0] }}</p>
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Konfirmasi Password</label>
                <input
                  v-model="passwordForm.password_confirmation"
                  :type="showNewPassword ? 'text' : 'password'"
                  placeholder="Ulangi password baru"
                  class="modal-input"
                />
                <p v-if="passwordErrors.password_confirmation" class="mt-1 text-xs text-red-600">{{ passwordErrors.password_confirmation[0] }}</p>
              </div>
            </div>

            <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" @click="showPasswordModal = false">Batal</button>
              <button
                :disabled="savingPassword"
                class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                @click="handleSavePassword"
              >{{ savingPassword ? 'Menyimpan...' : 'Simpan' }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══════════ ROLE MODAL ══════════ -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showRoleModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="showRoleModal = false">
          <div class="flex w-full max-w-lg flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;" @click.stop>
            <div class="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 class="text-lg font-semibold text-gray-900">
                {{ editingRole ? 'Edit Role' : 'Tambah Role' }}
              </h2>
              <button class="rounded-lg p-1 text-gray-400 hover:bg-gray-100" @click="showRoleModal = false">
                <X class="h-5 w-5" />
              </button>
            </div>

            <div class="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <!-- Name -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Role <span class="text-red-500">*</span></label>
                <input v-model="roleForm.name" type="text" placeholder="Contoh: Admin, Kasir" class="modal-input" />
                <p v-if="roleErrors.name" class="mt-1 text-xs text-red-600">{{ roleErrors.name[0] }}</p>
              </div>

              <!-- Permissions -->
              <div>
                <label class="mb-3 block text-sm font-medium text-gray-700">Permission</label>
                <div class="space-y-4">
                  <div v-for="group in permissionGroups" :key="group.label">
                    <div class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        :checked="group.permissions.every(p => roleForm.permission.includes(p))"
                        :indeterminate="group.permissions.some(p => roleForm.permission.includes(p)) && !group.permissions.every(p => roleForm.permission.includes(p))"
                        class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        @change="toggleGroupAll(group.permissions)"
                      />
                      <span class="text-sm font-semibold text-gray-800">{{ group.label }}</span>
                    </div>
                    <div class="ml-6 mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
                      <label
                        v-for="perm in group.permissions"
                        :key="perm"
                        class="flex cursor-pointer items-center gap-1.5"
                      >
                        <input
                          type="checkbox"
                          :checked="roleForm.permission.includes(perm)"
                          class="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          @change="togglePermission(perm)"
                        />
                        <span class="text-xs text-gray-600">{{ perm }}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" @click="showRoleModal = false">Batal</button>
              <button
                :disabled="savingRole"
                class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                @click="handleSaveRole"
              >{{ savingRole ? 'Menyimpan...' : 'Simpan' }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.modal-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
select.modal-input {
  @apply appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%221.5%22%3E%3Cpath%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_8px_center] bg-no-repeat pr-9;
}
</style>
