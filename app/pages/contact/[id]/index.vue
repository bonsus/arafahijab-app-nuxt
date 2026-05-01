<script setup lang="ts">
import {
  ArrowLeft, ArrowRight, Pencil, Users, MapPin, Star, Tag, Calendar,
  ToggleLeft, ToggleRight, Plus, Trash2, Loader2, KeyRound,
  Mail, Phone, AtSign, Hash, Shield, Clock, Award,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()

const customerId = route.params.id as string

const loading = ref(true)
const customer = ref<any>(null)

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Aktif', color: 'bg-green-100 text-green-700' },
  inactive: { label: 'Nonaktif', color: 'bg-gray-100 text-gray-500' },
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function loadCustomer() {
  loading.value = true
  try {
    const res = await api.get<{ data: any }>(`/customers/${customerId}`)
    customer.value = res.data
  } catch (err: any) {
    toast.error(err.message || 'Gagal memuat data customer')
  } finally {
    loading.value = false
  }
}

async function toggleStatus() {
  if (!customer.value) return
  const newStatus = customer.value.status === 'active' ? 'inactive' : 'active'
  try {
    await api.put(`/customers/${customerId}/update-status`, { status: newStatus })
    customer.value.status = newStatus
    toast.success(`Status diubah ke ${statusConfig[newStatus]?.label || newStatus}`)
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status')
  }
}

// --- Address CRUD ---
const showAddressModal = ref(false)
const editingAddressId = ref<string | null>(null)
const savingAddress = ref(false)

interface AddressRow {
  name: string
  phone: string
  country: string
  province: string
  city: string
  district: string
  postal_code: string
  address: string
  primary: boolean
}

const addressForm = ref<AddressRow>({
  name: '',
  phone: '',
  country: '',
  province: '',
  city: '',
  district: '',
  postal_code: '',
  address: '',
  primary: false,
})

// Key to force re-mount AddressFormRow when opening modal
const addressFormKey = ref(0)

function openAddAddress() {
  editingAddressId.value = null
  addressForm.value = {
    name: '',
    phone: '',
    country: '',
    province: '',
    city: '',
    district: '',
    postal_code: '',
    address: '',
    primary: false,
  }
  addressFormKey.value++
  showAddressModal.value = true
}

function openEditAddress(addr: any) {
  editingAddressId.value = addr.id
  addressForm.value = {
    name: addr.name || '',
    phone: addr.phone || '',
    country: addr.country || '',
    province: addr.province || '',
    city: addr.city || '',
    district: addr.district || '',
    postal_code: addr.zipcode || addr.postal_code || '',
    address: addr.address || '',
    primary: addr.primary || false,
  }
  addressFormKey.value++
  showAddressModal.value = true
}

async function handleSaveAddress() {
  savingAddress.value = true
  try {
    const a = addressForm.value
    const body = {
      customer_id: customerId,
      name: a.name,
      phone: a.phone,
      country: a.country,
      province: a.province,
      city: a.city,
      district: a.district,
      zipcode: a.postal_code,
      address: a.address,
      primary: a.primary,
    }
    if (editingAddressId.value) {
      await api.put(`/customers/addresses/${editingAddressId.value}`, body)
      toast.success('Alamat berhasil diperbarui')
    } else {
      await api.post(`/customers/${customerId}/addresses/create`, body)
      toast.success('Alamat berhasil ditambahkan')
    }
    showAddressModal.value = false
    loadCustomer()
  } catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan alamat')
  } finally {
    savingAddress.value = false
  }
}

async function handleDeleteAddress(addr: any) {
  const ok = await confirm({
    title: 'Hapus Alamat',
    message: `Yakin ingin menghapus alamat "${addr.name}"?`,
    confirmText: 'Hapus',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await api.delete(`/customers/addresses/${addr.id}`)
    toast.success('Alamat berhasil dihapus')
    loadCustomer()
  } catch (err: any) {
    toast.error(err.message || 'Gagal menghapus alamat')
  }
}

async function handleSetPrimaryAddress(addr: any) {
  if (addr.primary) return
  try {
    await api.put(`/customers/addresses/${addr.id}/update-primary`)
    toast.success(`"${addr.name}" dijadikan alamat utama`)
    loadCustomer()
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengubah alamat utama')
  }
}

// --- Point History ---
const pointHistories = ref<any[]>([])
const pointPage = ref(1)
const pointPerPage = ref(10)
const pointTotalPage = ref(1)
const pointTotal = ref(0)
const loadingPoints = ref(false)

async function fetchPointHistory() {
  loadingPoints.value = true
  try {
    const res = await api.get<{ data: any }>(`/customers/${customerId}/point-histories`, {
      page: String(pointPage.value),
      per_page: String(pointPerPage.value),
    })
    pointHistories.value = res.data?.data || []
    pointTotalPage.value = res.data?.total_page || 1
    pointTotal.value = res.data?.total || 0
  } catch {
    pointHistories.value = []
  } finally {
    loadingPoints.value = false
  }
}

function onPointPageChange(p: number) {
  pointPage.value = p
  fetchPointHistory()
}

function onPointPerPageChange(pp: number) {
  pointPerPage.value = pp
  pointPage.value = 1
  fetchPointHistory()
}

function formatPoints(val: string | number): string {
  return Number(val || 0).toLocaleString('id-ID')
}

// --- Category lookup ---
const categoryMap = ref<Record<string, string>>({})

async function fetchCategories() {
  try {
    const res = await api.get<{ data: { id: string; name: string }[] }>('/customers/categories/index')
    const map: Record<string, string> = {}
    for (const cat of res.data || []) {
      map[cat.id] = cat.name
    }
    categoryMap.value = map
  } catch {
    // silent
  }
}

function getCategoryName(id: string): string {
  return categoryMap.value[id] || id
}

function isLogActive(log: any): boolean {
  if (!log.ended_at) return true
  const d = new Date(log.ended_at)
  return d.getFullYear() <= 1
}

// --- Password modal ---
const showPasswordModal = ref(false)
const newPassword = ref('')
const savingPassword = ref(false)

async function handleUpdatePassword() {
  savingPassword.value = true
  try {
    await api.put(`/customers/${customerId}/update-password`, { password: newPassword.value })
    toast.success('Password berhasil diperbarui')
    showPasswordModal.value = false
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengubah password')
  } finally {
    savingPassword.value = false
  }
}

onMounted(() => {
  loadCustomer()
  fetchPointHistory()
  fetchCategories()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink
          :to="customer?.type === 'supplier' ? '/contact/supplier' : '/contact/customer'"
          class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft class="h-5 w-5" />
        </NuxtLink>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Detail Customer</h1>
          <p v-if="customer" class="mt-0.5 text-sm text-gray-500">{{ customer.type === 'supplier' ? 'Supplier' : 'Customer' }}</p>
        </div>
      </div>
      <div v-if="customer" class="flex items-center gap-2">
        <button
          v-if="customer.type !== 'supplier'"
          class="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="showPasswordModal = true; newPassword = ''"
        >
          <KeyRound class="h-4 w-4" />
          Ubah Password
        </button>
        <NuxtLink
          :to="`/contact/${customerId}/edit`"
          class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          <Pencil class="h-4 w-4" />
          Edit
        </NuxtLink>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-6">
      <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div class="animate-pulse space-y-4">
          <div class="h-5 w-48 rounded bg-gray-200" />
          <div class="h-4 w-64 rounded bg-gray-200" />
          <div class="grid grid-cols-2 gap-4">
            <div class="h-4 rounded bg-gray-200" />
            <div class="h-4 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="customer">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- LEFT (2/3) -->
        <div class="space-y-6 lg:col-span-2">
          <!-- Info Card -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <div class="mb-4 flex items-start justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-900">{{ customer.name }}</h2>
                <p v-if="customer.external_id" class="mt-0.5 text-sm text-gray-400">#{{ customer.external_id }}</p>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="statusConfig[customer.status]?.color || 'bg-gray-100 text-gray-500'"
                >
                  {{ statusConfig[customer.status]?.label || customer.status }}
                </span>
                <button
                  class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  title="Toggle Status"
                  @click="toggleStatus"
                >
                  <ToggleRight v-if="customer.status === 'active'" class="h-5 w-5 text-green-500" />
                  <ToggleLeft v-else class="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div v-if="customer.email">
                <dt class="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <Mail class="h-3.5 w-3.5" />
                  Email
                </dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">{{ customer.email }}</dd>
              </div>
              <div v-if="customer.phone">
                <dt class="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <Phone class="h-3.5 w-3.5" />
                  Telepon
                </dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">{{ customer.phone }}</dd>
              </div>
              <div v-if="customer.username && customer.type !== 'supplier'">
                <dt class="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <AtSign class="h-3.5 w-3.5" />
                  Username
                </dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">{{ customer.username }}</dd>
              </div>
              <div v-if="customer.type !== 'supplier'">
                <dt class="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <Shield class="h-3.5 w-3.5" />
                  Status Login
                </dt>
                <dd class="mt-1">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="customer.login_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                  >
                    {{ customer.login_status === 'active' ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <Calendar class="h-3.5 w-3.5" />
                  Terdaftar
                </dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">{{ formatDate(customer.created_at) }}</dd>
              </div>
            </dl>
          </div>

          <!-- Addresses Card -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="flex items-center gap-2 text-base font-semibold text-gray-900">
                <MapPin class="h-4 w-4 text-gray-400" />
                Alamat ({{ customer.addresses?.length || 0 }})
              </h2>
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
                @click="openAddAddress"
              >
                <Plus class="h-3.5 w-3.5" />
                Tambah Alamat
              </button>
            </div>

            <div v-if="!customer.addresses?.length" class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
              Belum ada alamat.
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="addr in customer.addresses"
                :key="addr.id"
                class="rounded-lg border p-4"
                :class="addr.primary ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-gray-50/50'"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-semibold text-gray-900">{{ addr.name }}</span>
                      <span
                        v-if="addr.primary"
                        class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                      >
                        <Star class="h-3 w-3 fill-amber-500 text-amber-500" />
                        Utama
                      </span>
                    </div>
                    <p class="mt-0.5 text-xs text-gray-500">{{ addr.phone }}</p>
                    <p class="mt-1 text-sm text-gray-600">
                      {{ [addr.address, addr.district, addr.city, addr.province, addr.country, addr.zipcode].filter(Boolean).join(', ') }}
                    </p>
                  </div>
                  <div class="flex shrink-0 items-center gap-1">
                    <button
                      v-if="!addr.primary"
                      type="button"
                      class="rounded p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600"
                      title="Jadikan Utama"
                      @click="handleSetPrimaryAddress(addr)"
                    >
                      <Star class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Edit"
                      @click="openEditAddress(addr)"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Hapus"
                      @click="handleDeleteAddress(addr)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Point History -->
          <div v-if="customer.type !== 'supplier'" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Award class="h-4 w-4 text-gray-400" />
              Riwayat Poin ({{ pointTotal }})
            </h2>

            <div v-if="loadingPoints" class="space-y-3">
              <div v-for="i in 3" :key="i" class="flex animate-pulse items-center gap-4 rounded-lg bg-gray-50 px-3 py-3">
                <div class="h-4 w-24 rounded bg-gray-200" />
                <div class="h-4 flex-1 rounded bg-gray-200" />
                <div class="h-4 w-16 rounded bg-gray-200" />
              </div>
            </div>

            <div v-else-if="!pointHistories.length" class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
              Belum ada riwayat poin.
            </div>

            <template v-else>
              <div class="space-y-2">
                <div
                  v-for="ph in pointHistories"
                  :key="ph.id"
                  class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5"
                >
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-gray-700">{{ ph.note || '-' }}</p>
                    <div class="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                      <span>{{ formatDateShort(ph.created_at) }}</span>
                      <span v-if="ph.order" class="font-mono text-gray-500">{{ ph.order.no }}</span>
                    </div>
                  </div>
                  <span
                    class="shrink-0 ml-3 text-sm font-semibold tabular-nums"
                    :class="Number(ph.points) >= 0 ? 'text-green-600' : 'text-red-600'"
                  >
                    {{ Number(ph.points) >= 0 ? '+' : '' }}{{ formatPoints(ph.points) }}
                  </span>
                </div>
              </div>

              <!-- Point pagination -->
              <AppPagination
                v-if="pointTotalPage > 1"
                :page="pointPage"
                :total-page="pointTotalPage"
                :total="pointTotal"
                :per-page="pointPerPage"
                :loading="loadingPoints"
                :show-per-page="false"
                @update:page="onPointPageChange"
                @update:per-page="onPointPerPageChange"
              />
            </template>
          </div>

          <!-- Category Movement -->
          <div v-if="customer.category_movements?.length" class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
            <h2 class="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Clock class="h-4 w-4 text-gray-400" />
              Perpindahan Kategori ({{ customer.category_movements.length }})
            </h2>

            <!-- Timeline -->
            <div class="relative space-y-0">
              <div
                v-for="(log, idx) in customer.category_movements"
                :key="log.id"
                class="relative flex gap-3"
              >
                <!-- Timeline line + dot -->
                <div class="flex flex-col items-center">
                  <div
                    class="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2 ring-white"
                    :class="isLogActive(log) ? 'bg-green-500' : 'bg-gray-300'"
                  >
                    <Tag class="h-3 w-3 text-white" />
                  </div>
                  <div
                    v-if="Number(idx) < customer.category_movements.length - 1"
                    class="w-0.5 grow bg-gray-200"
                  />
                </div>

                <!-- Content -->
                <div class="pb-5 pt-0.5" :class="Number(idx) === customer.category_movements.length - 1 ? 'pb-0' : ''">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-gray-900">{{ getCategoryName(log.customer_category_id) }}</span>
                    <span
                      class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium leading-none"
                      :class="isLogActive(log) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                    >
                      {{ isLogActive(log) ? 'Aktif' : 'Berakhir' }}
                    </span>
                  </div>
                  <div class="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                    <Calendar class="h-3 w-3" />
                    <span>{{ formatDateShort(log.started_at) }}</span>
                    <template v-if="!isLogActive(log)">
                      <ArrowRight class="h-3 w-3" />
                      <span>{{ formatDateShort(log.ended_at) }}</span>
                    </template>
                    <template v-else>
                      <span class="text-green-500">— sekarang</span>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT (1/3) -->
        <div class="space-y-6">
          <!-- Reward Points Card -->
          <div v-if="customer.type !== 'supplier'" class="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm ring-1 ring-amber-100">
            <div class="flex items-center gap-2">
              <Award class="h-4 w-4 text-amber-500" />
              <span class="text-xs font-medium text-amber-700">Total Poin</span>
            </div>
            <p class="mt-2 text-2xl font-bold tabular-nums text-gray-900">{{ formatPoints(customer.reward_points) }}</p>
          </div>

          <!-- Category Card -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Tag class="h-4 w-4 text-gray-400" />
              Kategori
            </h2>
            <div v-if="customer.category">
              <p class="text-sm font-semibold text-gray-900">{{ customer.category.name }}</p>
              <p v-if="customer.category.description" class="mt-0.5 text-xs text-gray-500">{{ customer.category.description }}</p>
              <p v-if="customer.category.discount" class="mt-1 text-xs text-green-600">Diskon {{ customer.category.discount }}%</p>
            </div>
            <p v-else class="text-sm text-gray-400">Tidak ada kategori</p>
          </div>

          <!-- Summary Card -->
          <div class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 class="mb-3 text-base font-semibold text-gray-900">Ringkasan</h2>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500">Tipe</dt>
                <dd class="font-medium text-gray-900">{{ customer.type === 'supplier' ? 'Supplier' : 'Customer' }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Status</dt>
                <dd>
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="statusConfig[customer.status]?.color"
                  >
                    {{ statusConfig[customer.status]?.label || customer.status }}
                  </span>
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Alamat</dt>
                <dd class="font-medium text-gray-900">{{ customer.addresses?.length || 0 }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Terdaftar</dt>
                <dd class="font-medium text-gray-900">{{ formatDateShort(customer.created_at) }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </template>

    <!-- Address Modal -->
    <Teleport to="body">
      <div v-if="showAddressModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @mousedown.self="showAddressModal = false">
        <div class="flex w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
          <div class="shrink-0 border-b border-gray-100 px-6 py-4">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ editingAddressId ? 'Edit Alamat' : 'Tambah Alamat' }}
            </h2>
          </div>
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <AddressFormRow
              :key="addressFormKey"
              v-model="addressForm"
              :index="0"
              :hide-actions="true"
            />
            <label class="mt-4 flex cursor-pointer items-center gap-3">
              <input
                v-model="addressForm.primary"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span class="text-sm font-medium text-gray-700">Jadikan alamat utama</span>
            </label>
          </div>
          <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="showAddressModal = false"
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="savingAddress || !addressForm.name || !addressForm.phone"
              class="flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleSaveAddress"
            >
              <Loader2 v-if="savingAddress" class="h-4 w-4 animate-spin" />
              {{ savingAddress ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Password Modal -->
    <Teleport to="body">
      <div v-if="showPasswordModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @mousedown.self="showPasswordModal = false">
        <div class="flex w-full max-w-sm flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
          <div class="shrink-0 border-b border-gray-100 px-6 py-4">
            <h2 class="text-lg font-semibold text-gray-900">Ubah Password</h2>
            <p class="mt-0.5 text-sm text-gray-500">{{ customer?.name }}</p>
          </div>
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Password Baru <span class="text-red-500">*</span></label>
              <input v-model="newPassword" type="password" class="form-input" placeholder="Min. 8 karakter" />
            </div>
          </div>
          <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="showPasswordModal = false"
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="savingPassword || newPassword.length < 8"
              class="flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleUpdatePassword"
            >
              <Loader2 v-if="savingPassword" class="h-4 w-4 animate-spin" />
              {{ savingPassword ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.form-input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
