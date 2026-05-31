<script setup lang="ts">
import {
  CreditCard, ToggleLeft, ToggleRight, GripVertical,
  Wallet, Building2, QrCode, Landmark, Settings, X, Check,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface PaymentMethod {
  id: string
  type: string
  code: string
  name: string
  category: string
  sort: number
  status: string
  is_active: boolean
  admin_fee?: number
  unique_code?: number
  unique_type?: 'plus' | 'minus'
}

interface Provider {
  id: string
  provider: string
  is_active: boolean
  payment_method: PaymentMethod[]
}

const api = useApi()
const toast = useToast()

const loading = ref(true)
const providers = ref<Provider[]>([])
const activeTab = ref('')
const togglingIds = ref<Set<string>>(new Set())

// Edit settings state
const editingMethodId = ref<string | null>(null)
const editForm = reactive({
  admin_fee: 0,
  unique_code: 0,
  unique_type: 'plus' as 'plus' | 'minus',
})
const savingSettings = ref(false)

// Drag sort state
const dragState = reactive<{
  fromIndex: number | null
  overIndex: number | null
}>({ fromIndex: null, overIndex: null })

const categoryConfig: Record<string, { label: string; color: string; icon: any }> = {
  virtual_account: { label: 'Virtual Account', color: 'bg-blue-50 text-blue-700 ring-blue-200', icon: Building2 },
  e_wallet: { label: 'E-Wallet', color: 'bg-green-50 text-green-700 ring-green-200', icon: Wallet },
  qris: { label: 'QRIS', color: 'bg-purple-50 text-purple-700 ring-purple-200', icon: QrCode },
  bank_transfer: { label: 'Bank Transfer', color: 'bg-cyan-50 text-cyan-700 ring-cyan-200', icon: Landmark },
  credit_card: { label: 'Credit Card', color: 'bg-amber-50 text-amber-700 ring-amber-200', icon: CreditCard },
  cod: { label: 'COD', color: 'bg-orange-50 text-orange-700 ring-orange-200', icon: Wallet },
}

function getCategoryInfo(category: string) {
  return categoryConfig[category] || { label: category, color: 'bg-gray-50 text-gray-600 ring-gray-200', icon: CreditCard }
}

async function fetchProviders() {
  loading.value = true
  try {
    const res = await api.get<{ data: Provider[] }>('/payment-methods/index')
    providers.value = (res.data || []).map(p => ({
      ...p,
      payment_method: (p.payment_method || []).sort((a, b) => a.sort - b.sort),
    }))
    const first = providers.value[0]
    if (first && !activeTab.value) {
      activeTab.value = first.provider
    }
  } catch {
    providers.value = []
  } finally {
    loading.value = false
  }
}

const activeProvider = computed(() => providers.value.find(p => p.provider === activeTab.value))

async function toggleMethodStatus(method: PaymentMethod) {
  const prov = activeProvider.value
  if (!prov) return
  togglingIds.value.add(method.id)
  const newStatus = method.is_active ? 'inactive' : 'active'
  try {
    await api.put('/payment-methods/update-status', {
      provider: prov.provider,
      payment_method_id: method.id,
      status: newStatus,
    })
    method.is_active = !method.is_active
    prov.is_active = prov.payment_method.some(m => m.is_active)
    toast.success(`${method.name} berhasil di${method.is_active ? 'aktifkan' : 'nonaktifkan'}`)
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status')
  } finally {
    togglingIds.value.delete(method.id)
  }
}

// Edit settings
function openEditSettings(method: PaymentMethod) {
  editingMethodId.value = method.id
  editForm.admin_fee = method.admin_fee || 0
  editForm.unique_code = method.unique_code || 0
  editForm.unique_type = method.unique_type || 'plus'
}

function cancelEditSettings() {
  editingMethodId.value = null
}

async function saveSettings(method: PaymentMethod) {
  const prov = activeProvider.value
  if (!prov) return
  
  savingSettings.value = true
  try {
    const payload: any = {
      provider: prov.provider,
      payment_method_id: method.id,
      status: method.is_active ? 'active' : 'inactive',
    }
    
    // Add admin_fee if not internal provider
    if (prov.provider !== 'internal') {
      payload.admin_fee = editForm.admin_fee
    }
    
    // Add unique_code and unique_type if bank_transfer
    if (method.category === 'bank_transfer') {
      payload.unique_code = editForm.unique_code
      payload.unique_type = editForm.unique_type
    }
    
    await api.put('/payment-methods/update-status', payload)
    
    // Update local data
    if (prov.provider !== 'internal') {
      method.admin_fee = editForm.admin_fee
    }
    if (method.category === 'bank_transfer') {
      method.unique_code = editForm.unique_code
      method.unique_type = editForm.unique_type
    }
    
    toast.success('Pengaturan berhasil diperbarui')
    editingMethodId.value = null
  } catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan pengaturan')
  } finally {
    savingSettings.value = false
  }
}

// Drag & drop sort
function onDragStart(index: number, e: DragEvent) {
  dragState.fromIndex = index
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(index: number, e: DragEvent) {
  e.preventDefault()
  dragState.overIndex = index
}

function onDragLeave() {
  dragState.overIndex = null
}

async function onDrop(index: number) {
  const prov = activeProvider.value
  if (!prov || dragState.fromIndex === null || dragState.fromIndex === index) {
    resetDrag()
    return
  }

  const items = [...prov.payment_method]
  const moved = items.splice(dragState.fromIndex, 1)[0]
  if (!moved) { resetDrag(); return }
  items.splice(index, 0, moved)
  prov.payment_method = items

  resetDrag()

  const payload = {
    provider: prov.provider,
    data: items.map((m, i) => ({ payment_method_id: m.id, sort: i + 1 })),
  }
  try {
    await api.put('/payment-methods/update-sort', payload)
    toast.success('Urutan berhasil diperbarui')
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengubah urutan')
    await fetchProviders()
  }
}

function resetDrag() {
  dragState.fromIndex = null
  dragState.overIndex = null
}

onMounted(() => fetchProviders())
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Metode Pembayaran</h1>
      <p class="mt-1 text-sm text-gray-500">Kelola metode pembayaran yang tersedia untuk transaksi bisnis Anda.</p>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-4">
      <div class="flex gap-1 rounded-lg bg-gray-100 p-1">
        <div v-for="i in 3" :key="i" class="h-8 w-24 animate-pulse rounded-md bg-gray-200" />
      </div>
      <div class="space-y-2">
        <div v-for="j in 4" :key="j" class="flex animate-pulse items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200">
          <div class="h-4 w-4 rounded bg-gray-200" />
          <div class="flex-1 space-y-1.5">
            <div class="h-4 w-36 rounded bg-gray-200" />
            <div class="h-3 w-24 rounded bg-gray-100" />
          </div>
          <div class="h-5 w-16 rounded-full bg-gray-100" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="providers.length === 0" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <CreditCard class="mx-auto h-12 w-12 text-gray-300" />
      <h3 class="mt-3 text-sm font-semibold text-gray-900">Tidak ada metode pembayaran</h3>
      <p class="mt-1 text-sm text-gray-500">Belum ada provider pembayaran yang terhubung.</p>
    </div>

    <template v-else>
      <!-- Provider tabs -->
      <div class="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
        <button
          v-for="prov in providers"
          :key="prov.provider"
          type="button"
          class="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors"
          :class="activeTab === prov.provider ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
          @click="activeTab = prov.provider"
        >
          <img
            :src="`/images/brands/${prov.provider}.webp`"
            :alt="prov.provider"
            class="h-4 w-4 object-contain"
            @error="($event.target as HTMLImageElement).style.display='none'"
          />
          {{ prov.provider }}
          <span
            class="inline-flex items-center justify-center rounded-full px-1.5 text-xs"
            :class="activeTab === prov.provider ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500'"
          >
            {{ prov.payment_method.length }}
          </span>
        </button>
      </div>

      <!-- Active provider methods -->
      <div v-if="activeProvider" class="space-y-2">
        <div
          v-for="(method, idx) in activeProvider.payment_method"
          :key="method.id"
          draggable="true"
          class="rounded-xl bg-white shadow-sm ring-1 transition-all"
          :class="[
            dragState.overIndex === idx ? 'ring-primary-400 shadow-md' : 'ring-gray-200',
            dragState.fromIndex === idx ? 'opacity-50' : 'hover:shadow-md',
          ]"
          @dragstart="onDragStart(idx, $event)"
          @dragover="onDragOver(idx, $event)"
          @dragleave="onDragLeave"
          @drop="onDrop(idx)"
          @dragend="resetDrag"
        >
          <!-- Main row -->
          <div class="flex items-center gap-3 px-4 py-3">
            <!-- Drag handle -->
            <GripVertical class="h-4 w-4 shrink-0 cursor-grab text-gray-300" />

            <!-- Method info -->
            <div class="min-w-0 flex-1">
              <span class="text-sm font-medium text-gray-900">{{ method.name }}</span>
              <div class="mt-0.5 flex items-center gap-2">
                <span
                  class="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1"
                  :class="getCategoryInfo(method.category).color"
                >
                  <component :is="getCategoryInfo(method.category).icon" class="h-2.5 w-2.5" />
                  {{ getCategoryInfo(method.category).label }}
                </span>
                <span class="font-mono text-[10px] text-gray-400">{{ method.code }}</span>
                <span v-if="activeProvider.provider !== 'internal' && method.admin_fee" class="text-[10px] text-gray-500">
                  Fee: Rp{{ method.admin_fee.toLocaleString('id-ID') }}
                </span>
                <span v-if="method.category === 'bank_transfer' && method.unique_code" class="rounded bg-yellow-100 px-1.5 py-0.5 text-[9px] font-medium text-yellow-700">
                  Unique {{ method.unique_type }} ({{ method.unique_code }})
                </span>
              </div>
            </div>

            <!-- Settings button -->
            <button
              v-if="editingMethodId !== method.id"
              type="button"
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              @click="openEditSettings(method)"
            >
              <Settings class="h-4 w-4" />
            </button>

            <!-- Toggle -->
            <button
              type="button"
              class="flex items-center gap-1.5 transition-colors disabled:opacity-50"
              :disabled="togglingIds.has(method.id)"
              @click="toggleMethodStatus(method)"
            >
              <span
                class="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                :class="method.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
              >
                {{ method.is_active ? 'Aktif' : 'Nonaktif' }}
              </span>
              <ToggleRight v-if="method.is_active" class="h-5 w-5 text-green-600" />
              <ToggleLeft v-else class="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <!-- Edit form -->
          <div v-if="editingMethodId === method.id" class="border-t border-gray-100 bg-gray-50 px-4 py-3">
            <div class="space-y-3">
              <!-- Admin Fee (not for internal) -->
              <div v-if="activeProvider.provider !== 'internal'" class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600">Admin Fee</label>
                  <div class="relative">
                    <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
                    <input
                      v-model.number="editForm.admin_fee"
                      type="number"
                      min="0"
                      class="w-full rounded-lg border border-gray-300 py-2 pl-7 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <!-- Unique Code (bank_transfer only) -->
              <div v-if="method.code === 'bank_transfer'" class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600">Kode Unik Maksimal</label>
                  <input
                    v-model.number="editForm.unique_code"
                    type="number"
                    min="0"
                    max="999"
                    class="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="999"
                  />
                  <p class="mt-0.5 text-[10px] text-gray-500">Contoh: 999 = random 111-999</p>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-600">Tipe Kode Unik</label>
                  <div class="flex gap-2">
                    <label class="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 transition-colors" :class="editForm.unique_type === 'plus' ? 'border-primary-500 bg-primary-50' : 'hover:border-gray-400'">
                      <input
                        v-model="editForm.unique_type"
                        type="radio"
                        value="plus"
                        class="text-primary-600 focus:ring-2 focus:ring-primary-500/20"
                      />
                      <span class="text-sm">Ditambah (+)</span>
                    </label>
                    <label class="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 transition-colors" :class="editForm.unique_type === 'minus' ? 'border-primary-500 bg-primary-50' : 'hover:border-gray-400'">
                      <input
                        v-model="editForm.unique_type"
                        type="radio"
                        value="minus"
                        class="text-primary-600 focus:ring-2 focus:ring-primary-500/20"
                      />
                      <span class="text-sm">Dikurangi (-)</span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                  @click="cancelEditSettings"
                >
                  <X class="h-3.5 w-3.5" />
                  Batal
                </button>
                <button
                  type="button"
                  :disabled="savingSettings"
                  class="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                  @click="saveSettings(method)"
                >
                  <Check class="h-3.5 w-3.5" />
                  {{ savingSettings ? 'Menyimpan...' : 'Simpan' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="text-xs text-gray-400">
        {{ providers.length }} provider &middot;
        {{ providers.reduce((sum, p) => sum + p.payment_method.length, 0) }} metode pembayaran
      </div>
    </template>
  </div>
</template>
