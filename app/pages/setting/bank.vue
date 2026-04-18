<script setup lang="ts">
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, GripVertical } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
})

interface Bank {
  id: string
  business_id: string
  wallet_id: string
  account_name: string
  account_number: string
  bank_id: string
  bank_name: string
  sort: number
  status: string
  wallet?: Wallet
  CreatedAt: string
  UpdatedAt: string
}

interface Wallet {
  id: string
  name: string
  type: string
  status: string
}

const api = useApi()
const toast = useToast()

const banks = ref<Bank[]>([])
const walletOptions = ref<Wallet[]>([])
const loading = ref(true)

// Modal state
const showModal = ref(false)
const editingBank = ref<Bank | null>(null)
const saving = ref(false)
const formErrors = ref<Record<string, string[]>>({})

const form = reactive({
  wallet_id: '',
  bank_id: '',
  bank_name: '',
  account_name: '',
  account_number: '',
  status: 'active',
})

// Bank options for selector
const bankOptions = [
  { id: '002', name: 'BRI', icon: 'bri' },
  { id: '008', name: 'Mandiri', icon: 'mandiri' },
  { id: '009', name: 'BNI', icon: 'bni' },
  { id: '014', name: 'BCA', icon: 'bca' },
  { id: '013', name: 'Permata', icon: 'permata' },
  { id: '022', name: 'CIMB Niaga', icon: 'cimb' },
  { id: '147', name: 'Muamalat', icon: 'muamalat' },
  { id: '451', name: 'BSI', icon: 'bsi' },
  { id: '422', name: 'BRI Syariah', icon: 'bris' },
  { id: '427', name: 'BNI Syariah', icon: 'bnis' },
  { id: '536', name: 'BCA Syariah', icon: 'bcas' },
  { id: '506', name: 'BSM', icon: 'bsm' },
    { id: '011', name: 'Seabank', icon: 'seabank' },
]

function getBankIcon(bankId: string): string {
  const bank = bankOptions.find(b => b.id === bankId)
  return `/images/banks/${bank?.icon || 'other'}.svg`
}

function onBankSelect(bankId: string) {
  const bank = bankOptions.find(b => b.id === bankId)
  if (bank) {
    form.bank_id = bank.id
    form.bank_name = bank.name
  }
}

async function fetchWallets() {
  try {
    const res = await api.get<{ data: Wallet[] }>('/wallets/index')
    walletOptions.value = (res.data || []).filter(w => w.status === 'active')
  } catch {
    walletOptions.value = []
  }
}

async function fetchBanks() {
  loading.value = true
  try {
    const res = await api.get<{ data: Bank[] }>('/banks/index')
    banks.value = (res.data || []).sort((a, b) => a.sort - b.sort)
  }
  catch {
    banks.value = []
  }
  finally {
    loading.value = false
  }
}

function openCreate() {
  editingBank.value = null
  form.wallet_id = ''
  form.bank_id = ''
  form.bank_name = ''
  form.account_name = ''
  form.account_number = ''
  form.status = 'active'
  formErrors.value = {}
  showModal.value = true
}

function openEdit(bank: Bank) {
  editingBank.value = bank
  form.wallet_id = bank.wallet_id || ''
  form.bank_id = bank.bank_id
  form.bank_name = bank.bank_name
  form.account_name = bank.account_name
  form.account_number = bank.account_number
  form.status = bank.status
  formErrors.value = {}
  showModal.value = true
}

async function handleSave() {
  saving.value = true
  formErrors.value = {}

  try {
    if (editingBank.value) {
      await api.put(`/banks/${editingBank.value.id}`, { ...form })
      toast.success('Rekening bank berhasil diperbarui')
    }
    else {
      await api.post('/banks/create', { ...form })
      toast.success('Rekening bank berhasil ditambahkan')
    }
    showModal.value = false
    await fetchBanks()
  }
  catch (err: any) {
    if (err.errors) {
      formErrors.value = err.errors
    }
    else {
      toast.error(err.message || 'Gagal menyimpan data')
    }
  }
  finally {
    saving.value = false
  }
}

async function handleDelete(bank: Bank) {
  if (!confirm(`Hapus rekening ${bank.bank_name} - ${bank.account_number}?`)) return

  try {
    await api.delete(`/banks/${bank.id}`)
    toast.success('Rekening bank berhasil dihapus')
    await fetchBanks()
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menghapus data')
  }
}

async function toggleStatus(bank: Bank) {
  const newStatus = bank.status === 'active' ? 'inactive' : 'active'

  try {
    await api.put(`/banks/${bank.id}/update-status`, { status: newStatus })
    bank.status = newStatus
    toast.success(`Status berhasil diubah ke ${newStatus}`)
  }
  catch (err: any) {
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

  const items = [...banks.value]
  const moved = items.splice(dragIndex.value, 1)[0]
  if (!moved) { dragIndex.value = null; dragOverIndex.value = null; return }
  items.splice(index, 0, moved)

  banks.value = items
  dragIndex.value = null
  dragOverIndex.value = null

  // Save new order to API
  const payload = items.map((b, i) => ({ id: b.id, sort: i + 1 }))
  try {
    await api.post('/banks/update-sort-mass', payload)
    toast.success('Urutan berhasil diperbarui')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengubah urutan')
    await fetchBanks()
  }
}

function onDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}

onMounted(() => {
  fetchBanks()
  fetchWallets()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Rekening Bank</h1>
        <p class="text-sm text-gray-500">Kelola rekening bank Anda.</p>
      </div>
      <button
        class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" />
        Tambah Rekening
      </button>
    </div> 

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="flex animate-pulse items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <div class="h-5 w-5 rounded bg-gray-200" />
        <div class="h-12 w-12 rounded-lg bg-gray-200" />
        <div class="flex-1 space-y-2">
          <div class="h-4 w-32 rounded bg-gray-200" />
          <div class="h-3 w-48 rounded bg-gray-200" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!banks.length" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <p class="text-gray-500">Belum ada rekening bank. Klik tombol di atas untuk menambahkan.</p>
    </div>

    <!-- Bank list -->
    <div v-else class="space-y-3">
      <div
        v-for="(bank, index) in banks"
        :key="bank.id"
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

        <!-- Bank icon -->
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-50 p-2">
          <img :src="getBankIcon(bank.bank_id)" :alt="bank.bank_name" class="h-8 w-8 object-contain" />
        </div>

        <!-- Info -->
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span class="font-semibold text-sm text-gray-900">{{ bank.bank_name }}</span>
            <span
              class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
              :class="bank.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
            >
              {{ bank.status === 'active' ? 'Aktif' : 'Nonaktif' }}
            </span>
          </div>
          <p class="truncate text-xs text-gray-600">{{ bank.account_number }} &middot; {{ bank.account_name }}</p>
          <p v-if="bank.wallet" class="truncate text-xs text-gray-400">Dompet: {{ bank.wallet.name }}</p>
        </div>

        <!-- Actions -->
        <div class="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <button
            class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Toggle Status"
            @click="toggleStatus(bank)"
          >
            <ToggleRight v-if="bank.status === 'active'" class="h-5 w-5 text-green-500" />
            <ToggleLeft v-else class="h-5 w-5 text-gray-400" />
          </button>
          <button
            class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Edit"
            @click="openEdit(bank)"
          >
            <Pencil class="h-4 w-4" />
          </button>
          <button
            class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Hapus"
            @click="handleDelete(bank)"
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
                {{ editingBank ? 'Edit Rekening Bank' : 'Tambah Rekening Bank' }}
              </h2>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto px-6 py-5">
              <div class="space-y-4">
                <!-- Wallet select -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Dompet</label>
                  <select
                    v-model="form.wallet_id"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">Pilih Dompet</option>
                    <option v-for="w in walletOptions" :key="w.id" :value="w.id">
                      {{ w.name }}
                    </option>
                  </select>
                  <p v-if="formErrors.wallet_id" class="mt-1 text-xs text-red-600">{{ formErrors.wallet_id[0] }}</p>
                </div>

                <!-- Bank select -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Bank</label>
                  <select
                    :value="form.bank_id"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    @change="onBankSelect(($event.target as HTMLSelectElement).value)"
                  >
                    <option value="">Pilih Bank</option>
                    <option v-for="opt in bankOptions" :key="opt.id" :value="opt.id">
                      {{ opt.name }} ({{ opt.id }})
                    </option>
                  </select>
                  <p v-if="formErrors.bankId" class="mt-1 text-xs text-red-600">{{ formErrors.bankId[0] }}</p>
                </div>

                <!-- Account name -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Pemilik Rekening</label>
                  <input
                    v-model="form.account_name"
                    type="text"
                    placeholder="Nama di rekening"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="formErrors.accountName" class="mt-1 text-xs text-red-600">{{ formErrors.accountName[0] }}</p>
                </div>

                <!-- Account number -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Nomor Rekening</label>
                  <input
                    v-model="form.account_number"
                    type="text"
                    placeholder="Nomor rekening"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="formErrors.accountNumber" class="mt-1 text-xs text-red-600">{{ formErrors.accountNumber[0] }}</p>
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
