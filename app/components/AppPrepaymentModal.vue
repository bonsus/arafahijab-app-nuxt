<script setup lang="ts">
import { X, Search, ChevronDown, Loader2 } from 'lucide-vue-next'

interface Wallet {
  id: string
  name: string
}

interface POOption {
  id: string
  no: string
  total: number
  payment_total: number
  payment_status: string
  customer: { id: string; name: string } | null 
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const api = useApi()
const toast = useToast()

const saving = ref(false)
const errors = ref<Record<string, string[]>>({})
const walletOptions = ref<Wallet[]>([])
const poResults = ref<POOption[]>([])
const loadingPOs = ref(false)
const poSearch = ref('')
const poOpen = ref(false)
const selectedPO = ref<POOption | null>(null)

const form = reactive({
  purchase_order_id: '',
  wallet_id: '',
  date: new Date().toISOString().slice(0, 10),
  amount: 0,
  method: 'transfer',
  note: '',
})

const remainingPayment = computed(() => {
  if (!selectedPO.value) return 0
  return Number(selectedPO.value.total) - Number(selectedPO.value.payment_total)
})

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('id-ID').format(val)
}

async function fetchWallets() {
  try {
    const res = await api.get<{ data: Wallet[] }>('/wallets/index')
    walletOptions.value = (res.data || []).filter((w: any) => w.status === 'active')
  }
  catch {
    walletOptions.value = []
  }
}

async function fetchPOs() {
  loadingPOs.value = true
  try {
    const params: Record<string, string> = {
      per_page: '20',
      status: 'approved',
      payment_status: 'unpaid,partial',
    }
    if (poSearch.value) params.search = poSearch.value
    const res = await api.get<{ data: { data: POOption[] } }>('/purchases/index', params)
    poResults.value = res.data?.data || []
  }
  catch {
    poResults.value = []
  }
  finally {
    loadingPOs.value = false
  }
}

let poSearchTimer: ReturnType<typeof setTimeout>
function onPOSearch(val: string) {
  poSearch.value = val
  clearTimeout(poSearchTimer)
  poSearchTimer = setTimeout(() => fetchPOs(), 300)
}

function selectPO(po: POOption) {
  poOpen.value = false
  selectedPO.value = po
  form.purchase_order_id = po.id
  poSearch.value = ''
}

function clearPO() {
  selectedPO.value = null
  form.purchase_order_id = ''
}

function resetForm() {
  form.purchase_order_id = ''
  form.wallet_id = ''
  form.date = new Date().toISOString().slice(0, 10)
  form.amount = 0
  form.method = 'transfer'
  form.note = ''
  errors.value = {}
  poSearch.value = ''
  selectedPO.value = null
  poOpen.value = false
}

function close() {
  emit('update:modelValue', false)
}

async function handleSave() {
  saving.value = true
  errors.value = {}

  try {
    const payload: Record<string, any> = {
      purchase_order_id: form.purchase_order_id,
      date: form.date ? new Date(form.date).toISOString() : '',
      amount: form.amount,
      method: form.method,
      note: form.note,
      wallet_id: form.wallet_id,
    }

    await api.post('/purchases/payment/create', payload)
    toast.success('Prepayment berhasil ditambahkan')
    close()
    emit('saved')
  }
  catch (err: any) {
    if (err.errors) {
      errors.value = err.errors
    }
    else {
      toast.error(err.message || 'Gagal menyimpan prepayment')
    }
  }
  finally {
    saving.value = false
  }
}

watch(() => props.modelValue, (val) => {
  if (val) {
    resetForm()
    if (!walletOptions.value.length) fetchWallets()
    fetchPOs()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="close">
        <div class="flex w-full max-w-md flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
          <!-- Header -->
          <div class="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 class="text-lg font-semibold text-gray-900">Tambah Prepayment</h2>
            <button class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="close">
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <div class="space-y-4">
              <!-- PO Autocomplete -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Purchase Order <span class="text-red-500">*</span></label>
                <div class="relative">
                  <button
                    type="button"
                    class="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    @click="poOpen = !poOpen; if (poOpen && !poResults.length) fetchPOs()"
                  >
                    <span :class="selectedPO ? 'text-gray-900' : 'text-gray-400'">
                      {{ selectedPO ? `${selectedPO.no}${selectedPO.customer ? ` — ${selectedPO.customer.name}` : ''}` : 'Pilih Purchase Order' }}
                    </span>
                    <div class="flex items-center gap-1">
                      <button
                        v-if="selectedPO"
                        type="button"
                        class="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        @click.stop="clearPO"
                      >
                        <X class="h-3.5 w-3.5" />
                      </button>
                      <ChevronDown class="h-4 w-4 text-gray-400 transition-transform" :class="{ 'rotate-180': poOpen }" />
                    </div>
                  </button>
                  <!-- Dropdown -->
                  <div
                    v-if="poOpen"
                    class="absolute left-0 top-full z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg"
                  >
                    <div class="border-b border-gray-100 p-2">
                      <div class="relative">
                        <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        <input
                          :value="poSearch"
                          type="text"
                          placeholder="Cari no PO, supplier..."
                          class="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                          @input="onPOSearch(($event.target as HTMLInputElement).value)"
                        />
                      </div>
                    </div>
                    <div class="max-h-48 overflow-y-auto">
                      <div v-if="loadingPOs" class="flex items-center justify-center py-4">
                        <Loader2 class="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                      <div v-else-if="!poResults.length" class="px-3 py-4 text-center text-sm text-gray-400">
                        Tidak ada PO yang tersedia
                      </div>
                      <button
                        v-for="po in poResults"
                        v-else
                        :key="po.id"
                        type="button"
                        class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                        :class="selectedPO?.id === po.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'"
                        @click="selectPO(po)"
                      >
                        <div class="min-w-0 flex-1">
                          <p class="font-medium">{{ po.no }}</p>
                          <p v-if="po.customer" class="truncate text-xs text-gray-500">{{ po.customer.name }}</p>
                        </div>
                        <span
                          class="shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium"
                          :class="po.payment_status === 'partial' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'"
                        >
                          {{ po.payment_status === 'partial' ? 'Sebagian' : 'Belum Bayar' }}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
                <p v-if="errors.purchase_order_id" class="mt-1 text-xs text-red-600">{{ errors.purchase_order_id[0] }}</p>
              </div>

              <!-- Payment Info Summary -->
              <div v-if="selectedPO" class="grid grid-cols-3 gap-3">
                <div class="rounded-lg bg-gray-50 p-3 text-center ring-1 ring-gray-100">
                  <p class="text-xs text-gray-400">Total PO</p>
                  <p class="mt-1 text-sm font-bold text-gray-900">Rp{{ formatCurrency(Number(selectedPO.total)) }}</p>
                </div>
                <div class="rounded-lg bg-emerald-50 p-3 text-center ring-1 ring-emerald-100">
                  <p class="text-xs text-emerald-500">Dibayar</p>
                  <p class="mt-1 text-sm font-bold text-emerald-700">Rp{{ formatCurrency(Number(selectedPO.payment_total)) }}</p>
                </div>
                <div class="rounded-lg p-3 text-center ring-1" :class="remainingPayment <= 0 ? 'bg-green-50 ring-green-100' : 'bg-red-50 ring-red-100'">
                  <p class="text-xs" :class="remainingPayment <= 0 ? 'text-green-500' : 'text-red-500'">Sisa</p>
                  <p class="mt-1 text-sm font-bold" :class="remainingPayment <= 0 ? 'text-green-700' : 'text-red-700'">Rp{{ formatCurrency(remainingPayment) }}</p>
                </div>
              </div>

              <!-- Amount -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Jumlah <span class="text-red-500">*</span></label>
                <input
                  v-model.number="form.amount"
                  type="number"
                  min="0"
                  placeholder="0"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <p v-if="errors.amount" class="mt-1 text-xs text-red-600">{{ errors.amount[0] }}</p>
              </div>

              <!-- Method -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Metode Pembayaran <span class="text-red-500">*</span></label>
                <select
                  v-model="form.method"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="transfer">Transfer Bank</option>
                  <option value="cash">Tunai</option>
                  <option value="ewallet">E-Wallet</option>
                  <option value="other">Lainnya</option>
                </select>
                <p v-if="errors.method" class="mt-1 text-xs text-red-600">{{ errors.method[0] }}</p>
              </div>

              <!-- Wallet -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Dompet <span class="text-red-500">*</span></label>
                <select
                  v-model="form.wallet_id"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">Pilih Dompet (Opsional)</option>
                  <option v-for="w in walletOptions" :key="w.id" :value="w.id">
                    {{ w.name }}
                  </option>
                </select>
                <p v-if="errors.wallet_id" class="mt-1 text-xs text-red-600">{{ errors.wallet_id[0] }}</p>
              </div>

              <!-- Date -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Tanggal</label>
                <input
                  v-model="form.date"
                  type="date"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <!-- Note -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan</label>
                <textarea
                  v-model="form.note"
                  rows="2"
                  placeholder="Catatan pembayaran"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              @click="close"
            >
              Batal
            </button>
            <button
              :disabled="saving || !form.purchase_order_id"
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
</template>
