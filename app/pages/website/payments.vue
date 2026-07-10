<script setup lang="ts">
import { CreditCard, ToggleLeft, ToggleRight, Store, Pencil, X } from 'lucide-vue-next'

definePageMeta({ layout: 'website', middleware: 'auth' })

interface PaymentMethod {
  id: string
  provider: string
  type: string
  code: string
  name: string
  category: string
  sort: number
  status: string
  is_active: boolean
  admin_fee: string
  bank_name: string
  account_name: string
  account_number: string
}

interface PaymentGroup {
  id: string
  provider: string
  is_active: boolean
  payment_method: PaymentMethod[]
}

const api = useApi()
const toast = useToast()
const { selectedStoreId, fetchStores } = useWebsiteStore()

const loading = ref(false)
const groups = ref<PaymentGroup[]>([])
const togglingIds = ref<Set<string>>(new Set())

async function fetchPayments() {
  if (!selectedStoreId.value) return
  loading.value = true
  try {
    const res = await api.get<{ data: { data: PaymentGroup[] } }>('/website/payments/index', { store_id: selectedStoreId.value })
    groups.value = res.data?.data || []
  }
  catch {
    groups.value = []
  }
  finally {
    loading.value = false
  }
}

async function toggleStatus(pm: PaymentMethod, group: PaymentGroup) {
  togglingIds.value.add(pm.id)
  const newStatus = pm.is_active ? 'inactive' : 'active'
  try {
    await api.put('/website/payments/update-status', {
      store_id: selectedStoreId.value,
      payment_method_id: pm.id,
      status: newStatus,
      admin_fee: pm.admin_fee || '0',
      bank_name: pm.bank_name || '',
      account_name: pm.account_name || '',
      account_number: pm.account_number || '',
    })
    pm.is_active = !pm.is_active
    pm.status = newStatus
    group.is_active = group.payment_method.some(m => m.is_active)
    toast.success(`Metode berhasil di${pm.is_active ? 'aktifkan' : 'nonaktifkan'}`)
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal mengubah status')
  }
  finally {
    togglingIds.value.delete(pm.id)
  }
}

// ─── Account / fee modal ─────────────────────────────────────────────
const showModal = ref(false)
const saving = ref(false)
const editingPm = ref<PaymentMethod | null>(null)
const editingGroup = ref<PaymentGroup | null>(null)
const form = reactive({ admin_fee: '0', bank_name: '', account_name: '', account_number: '' })

function openEdit(pm: PaymentMethod, group: PaymentGroup) {
  editingPm.value = pm
  editingGroup.value = group
  form.admin_fee = pm.admin_fee || '0'
  form.bank_name = pm.bank_name || ''
  form.account_name = pm.account_name || ''
  form.account_number = pm.account_number || ''
  showModal.value = true
}

const isManual = computed(() => editingPm.value?.category === 'manual' || editingPm.value?.type === 'bank_transfer')

async function handleSave() {
  if (!editingPm.value) return
  saving.value = true
  try {
    await api.put('/website/payments/update-status', {
      store_id: selectedStoreId.value,
      payment_method_id: editingPm.value.id,
      status: editingPm.value.is_active ? 'active' : 'active',
      admin_fee: form.admin_fee || '0',
      bank_name: form.bank_name.trim(),
      account_name: form.account_name.trim(),
      account_number: form.account_number.trim(),
    })
    const pm = editingPm.value
    pm.admin_fee = form.admin_fee
    pm.bank_name = form.bank_name.trim()
    pm.account_name = form.account_name.trim()
    pm.account_number = form.account_number.trim()
    pm.is_active = true
    pm.status = 'active'
    if (editingGroup.value) editingGroup.value.is_active = true
    toast.success('Metode pembayaran berhasil disimpan')
    showModal.value = false
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan metode')
  }
  finally {
    saving.value = false
  }
}

onMounted(async () => {
  await fetchStores()
  await fetchPayments()
})

watch(selectedStoreId, () => fetchPayments())
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Metode Pembayaran</h1>
      <p class="mt-1 text-sm text-gray-500">Aktifkan metode pembayaran untuk checkout website.</p>
    </div>

    <div v-if="!selectedStoreId" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <Store class="mx-auto h-12 w-12 text-gray-300" />
      <h3 class="mt-3 text-sm font-semibold text-gray-900">Belum ada store web dipilih</h3>
      <p class="mt-1 text-sm text-gray-500">Pilih store web pada menu di sebelah kiri.</p>
    </div>

    <div v-else-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-40 animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-gray-200" />
    </div>

    <div v-else-if="!groups.length" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <CreditCard class="mx-auto h-12 w-12 text-gray-300" />
      <h3 class="mt-3 text-sm font-semibold text-gray-900">Tidak ada metode pembayaran</h3>
      <p class="mt-1 text-sm text-gray-500">Belum ada data metode pembayaran tersedia.</p>
    </div>

    <div v-else class="space-y-4">
      <div v-for="group in groups" :key="group.id" class="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold capitalize text-gray-900">{{ group.provider }}</span>
            <span
              class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1"
              :class="group.is_active ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-gray-50 text-gray-500 ring-gray-200'"
            >
              {{ group.is_active ? 'Aktif' : 'Nonaktif' }}
            </span>
          </div>
        </div>
        <div class="divide-y divide-gray-50">
          <div v-for="pm in group.payment_method" :key="pm.id" class="flex items-center gap-3 px-5 py-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 ring-1 ring-gray-200">
              <CreditCard class="h-4 w-4 text-gray-400" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900">{{ pm.name }}</p>
              <p class="text-xs text-gray-400">
                <span class="font-mono">{{ pm.code }}</span>
                <template v-if="pm.bank_name"> &middot; {{ pm.bank_name }} {{ pm.account_number }}</template>
                <template v-if="Number(pm.admin_fee) > 0"> &middot; Fee Rp{{ Number(pm.admin_fee).toLocaleString('id-ID') }}</template>
              </p>
            </div>
            <button type="button" class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700" title="Atur rekening / fee" @click="openEdit(pm, group)">
              <Pencil class="h-4 w-4" />
            </button>
            <button type="button" class="flex shrink-0 items-center gap-1.5 transition-colors disabled:opacity-50" :disabled="togglingIds.has(pm.id)" @click="toggleStatus(pm, group)">
              <span class="rounded-full px-1.5 py-0.5 text-[10px] font-medium" :class="pm.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
                {{ pm.is_active ? 'Aktif' : 'Nonaktif' }}
              </span>
              <ToggleRight v-if="pm.is_active" class="h-5 w-5 text-green-600" />
              <ToggleLeft v-else class="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="showModal = false" />
        <div class="relative w-full max-w-md rounded-xl bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 class="text-base font-semibold text-gray-900">{{ editingPm?.name }}</h3>
            <button type="button" class="rounded-lg p-1 text-gray-400 hover:bg-gray-100" @click="showModal = false">
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="space-y-4 px-5 py-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Biaya Admin (Rp)</label>
              <input v-model="form.admin_fee" type="number" min="0" class="input" />
            </div>
            <template v-if="isManual">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Bank</label>
                <input v-model="form.bank_name" type="text" placeholder="BCA" class="input" />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Pemilik Rekening</label>
                <input v-model="form.account_name" type="text" class="input" />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Nomor Rekening</label>
                <input v-model="form.account_number" type="text" class="input" />
              </div>
            </template>
          </div>
          <div class="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
            <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="showModal = false">Batal</button>
            <button type="button" :disabled="saving" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50" @click="handleSave">
              {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
