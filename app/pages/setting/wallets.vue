<script setup lang="ts">
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, GripVertical } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface Wallet {
  id: string
  business_id: string
  balance: string
  name: string
  description: string
  type: string
  status: string
  sort: number
  created_at: string
  updated_at: string
}

const api = useApi()
const toast = useToast()

const wallets = ref<Wallet[]>([])
const loading = ref(true)
const saving = ref(false)
const showModal = ref(false)
const editingWallet = ref<Wallet | null>(null)
const formErrors = ref<Record<string, string[]>>({})

const walletTypes = [
  { value: 'cash', label: 'Kas' },
  { value: 'bank', label: 'Bank' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'xendit', label: 'Xendit' },
  { value: 'midtrans', label: 'Midtrans' },
  { value: 'everpro', label: 'Everpro' },
  { value: 'mengantar', label: 'Mengantar' },
  { value: 'lincah', label: 'Lincah' },
]

const form = reactive({
  name: '',
  description: '',
  type: 'cash',
  status: 'active',
})

function getTypeLabel(type: string): string {
  return walletTypes.find(t => t.value === type)?.label || type
}

function formatCurrency(value: string): string {
  const num = parseFloat(value)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

async function fetchWallets() {
  loading.value = true
  try {
    const res = await api.get<{ data: Wallet[] }>('/wallets/index')
    wallets.value = (res.data || []).sort((a, b) => a.sort - b.sort)
  } catch {
    wallets.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingWallet.value = null
  form.name = ''
  form.description = ''
  form.type = 'cash'
  form.status = 'active'
  formErrors.value = {}
  showModal.value = true
}

function openEdit(wallet: Wallet) {
  editingWallet.value = wallet
  form.name = wallet.name
  form.description = wallet.description
  form.type = wallet.type
  form.status = wallet.status
  formErrors.value = {}
  showModal.value = true
}

async function handleSave() {
  saving.value = true
  formErrors.value = {}

  try {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      type: form.type,
      status: form.status,
    }

    if (editingWallet.value) {
      await api.put(`/wallets/${editingWallet.value.id}`, payload)
      toast.success('Dompet berhasil diperbarui')
    } else {
      await api.post('/wallets/create', payload)
      toast.success('Dompet berhasil ditambahkan')
    }
    showModal.value = false
    await fetchWallets()
  } catch (err: any) {
    if (err.errors) {
      formErrors.value = err.errors
    } else {
      toast.error(err.message || 'Gagal menyimpan data')
    }
  } finally {
    saving.value = false
  }
}

async function handleDelete(wallet: Wallet) {
  if (!confirm(`Hapus dompet "${wallet.name}"?`)) return

  try {
    await api.delete(`/wallets/${wallet.id}`)
    toast.success('Dompet berhasil dihapus')
    await fetchWallets()
  } catch (err: any) {
    toast.error(err.message || 'Gagal menghapus data')
  }
}

async function toggleStatus(wallet: Wallet) {
  const newStatus = wallet.status === 'active' ? 'inactive' : 'active'

  try {
    await api.put(`/wallets/${wallet.id}/update-status`, { status: newStatus })
    wallet.status = newStatus
    toast.success(`Status berhasil diubah ke ${newStatus}`)
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status')
  }
}

// Drag & drop sort
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(index: number, e: DragEvent) {
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
  }
}

function onDragOver(index: number, e: DragEvent) {
  e.preventDefault()
  dragOverIndex.value = index
}

function onDragLeave() {
  dragOverIndex.value = null
}

async function onDrop(index: number) {
  if (dragIndex.value === null || dragIndex.value === index) {
    dragIndex.value = null
    dragOverIndex.value = null
    return
  }

  const items = [...wallets.value]
  const moved = items.splice(dragIndex.value, 1)[0]
  if (!moved) { dragIndex.value = null; dragOverIndex.value = null; return }
  items.splice(index, 0, moved)

  wallets.value = items
  dragIndex.value = null
  dragOverIndex.value = null

  const payload = items.map(w => ({ id: w.id }))
  try {
    await api.post('/wallets/update-sort-mass', payload)
    toast.success('Urutan berhasil diperbarui')
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengubah urutan')
    await fetchWallets()
  }
}

function onDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}

onMounted(() => {
  fetchWallets()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Dompet</h1>
        <p class="text-sm text-gray-500">Kelola dompet bisnis Anda.</p>
      </div>
      <button
        class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" />
        Tambah Dompet
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="flex animate-pulse items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <div class="h-5 w-5 rounded bg-gray-200" />
        <div class="flex-1 space-y-2">
          <div class="h-4 w-32 rounded bg-gray-200" />
          <div class="h-3 w-48 rounded bg-gray-200" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!wallets.length" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <p class="text-gray-500">Belum ada dompet. Klik tombol di atas untuk menambahkan.</p>
    </div>

    <!-- Wallet list -->
    <div v-else class="space-y-3">
      <div
        v-for="(wallet, index) in wallets"
        :key="wallet.id"
        draggable="true"
        class="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 transition-all sm:gap-4"
        :class="[
          dragOverIndex === index ? 'ring-primary-400 shadow-md' : 'ring-gray-200',
          dragIndex === index ? 'opacity-50' : 'hover:shadow-md',
        ]"
        @dragstart="onDragStart(index, $event)"
        @dragover="onDragOver(index, $event)"
        @dragleave="onDragLeave"
        @drop="onDrop(index)"
        @dragend="onDragEnd"
      >
        <!-- Drag handle -->
        <GripVertical class="h-5 w-5 shrink-0 cursor-grab text-gray-300" />

        <!-- Info -->
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span class="text-sm font-semibold text-gray-900">{{ wallet.name }}</span>
            <span
              class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
              :class="wallet.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
            >
              {{ wallet.status === 'active' ? 'Aktif' : 'Nonaktif' }}
            </span>
            <span class="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {{ getTypeLabel(wallet.type) }}
            </span>
          </div>
          <p class="truncate text-xs text-gray-600">
            {{ wallet.description || '-' }} &middot; {{ formatCurrency(wallet.balance) }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <button
            class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Toggle Status"
            @click="toggleStatus(wallet)"
          >
            <ToggleRight v-if="wallet.status === 'active'" class="h-5 w-5 text-green-500" />
            <ToggleLeft v-else class="h-5 w-5 text-gray-400" />
          </button>
          <button
            class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Edit"
            @click="openEdit(wallet)"
          >
            <Pencil class="h-4 w-4" />
          </button>
          <button
            class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Hapus"
            @click="handleDelete(wallet)"
          >
            <Trash2 class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="showModal = false">
          <div class="flex w-full max-w-md flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
            <!-- Header -->
            <div class="shrink-0 border-b border-gray-100 px-6 py-4">
              <h2 class="text-lg font-semibold text-gray-900">
                {{ editingWallet ? 'Edit Dompet' : 'Tambah Dompet' }}
              </h2>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto px-6 py-5">
              <div class="space-y-4">
                <!-- Name -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Dompet</label>
                  <input
                    v-model="form.name"
                    type="text"
                    placeholder="Contoh: Kas Utama"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="formErrors.name" class="mt-1 text-xs text-red-600">{{ formErrors.name[0] }}</p>
                </div>

                <!-- Description -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Deskripsi</label>
                  <textarea
                    v-model="form.description"
                    rows="3"
                    placeholder="Deskripsi singkat dompet"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="formErrors.description" class="mt-1 text-xs text-red-600">{{ formErrors.description[0] }}</p>
                </div>

                <!-- Type -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Tipe Dompet</label>
                  <select
                    v-model="form.type"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option v-for="t in walletTypes" :key="t.value" :value="t.value">
                      {{ t.label }}
                    </option>
                  </select>
                  <p v-if="formErrors.type" class="mt-1 text-xs text-red-600">{{ formErrors.type[0] }}</p>
                </div>

                <!-- Status -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
                  <select
                    v-model="form.status"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                @click="showModal = false"
              >
                Batal
              </button>
              <button
                :disabled="saving"
                class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                @click="handleSave"
              >
                {{ saving ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
