<script setup lang="ts">
import {
  RefreshCw,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  ArrowLeftRight,
  X,
  Loader2,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

interface WalletItem {
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
  total_transaction: number
  total_transaction_in: number
  total_transaction_out: number
  total_amount_in: string
  total_amount_out: string
}

const api = useApi()
const toast = useToast()

const loading = ref(true)
const wallets = ref<WalletItem[]>([])
const summaryRef = ref<{ refresh: () => void } | null>(null)

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

function getTypeLabel(type: string): string {
  return walletTypes.find(t => t.value === type)?.label || type
}

async function fetchWallets() {
  loading.value = true
  try {
    const res = await api.get<{ data: WalletItem[] }>('/wallets/index')
    wallets.value = (res.data || []).sort((a, b) => a.sort - b.sort)
  }
  catch {
    wallets.value = []
  }
  finally {
    loading.value = false
  }
}

// ── Transfer Modal ────────────────────────────────────────────────────────────
const showTransferModal = ref(false)
const savingTransfer = ref(false)
const transferErrors = ref<Record<string, string[]>>({})

const transferForm = reactive({
  from_wallet_id: '',
  to_wallet_id: '',
  amount: 0,
  description: '',
  reference_no: '',
})

const activeWallets = computed(() => wallets.value.filter(w => w.status === 'active'))

const fromWallet = computed(() =>
  wallets.value.find(w => w.id === transferForm.from_wallet_id) ?? null,
)

const toWalletOptions = computed(() =>
  activeWallets.value.filter(w => w.id !== transferForm.from_wallet_id),
)

function openTransferModal(fromWalletId = '') {
  transferErrors.value = {}
  transferForm.from_wallet_id = fromWalletId || (activeWallets.value[0]?.id ?? '')
  transferForm.to_wallet_id = ''
  transferForm.amount = 0
  transferForm.description = ''
  transferForm.reference_no = ''
  showTransferModal.value = true
}

async function handleTransfer() {
  transferErrors.value = {}
  if (!transferForm.from_wallet_id) {
    transferErrors.value.from_wallet_id = ['Dompet asal wajib dipilih']
    return
  }
  if (!transferForm.to_wallet_id) {
    transferErrors.value.to_wallet_id = ['Dompet tujuan wajib dipilih']
    return
  }
  if (!transferForm.amount || transferForm.amount <= 0) {
    transferErrors.value.amount = ['Jumlah transfer harus lebih dari 0']
    return
  }

  savingTransfer.value = true
  try {
    await api.post('/wallets/transactions/transfer', {
      from_wallet_id: transferForm.from_wallet_id,
      to_wallet_id: transferForm.to_wallet_id,
      amount: transferForm.amount,
      description: transferForm.description,
      reference_no: transferForm.reference_no,
    })
    toast.success('Transfer berhasil dilakukan')
    showTransferModal.value = false
    await fetchWallets()
    summaryRef.value?.refresh()
  }
  catch (err: any) {
    if (err.errors) transferErrors.value = err.errors
    else toast.error(err.message || 'Gagal melakukan transfer')
  }
  finally {
    savingTransfer.value = false
  }
}

onMounted(() => {
  fetchWallets()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl">Wallet / Dompet</h1>
        <p class="text-sm text-gray-500">Ringkasan saldo dompet bisnis Anda.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
          :disabled="loading || activeWallets.length < 2"
          @click="openTransferModal()"
        >
          <ArrowLeftRight class="h-4 w-4" />
          Transfer
        </button>
        <NuxtLink
          to="/wallet/history"
          class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Landmark class="h-4 w-4" />
          History Transaksi
        </NuxtLink>
        <button
          class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          :disabled="loading"
          @click="fetchWallets"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
      </div>
    </div>

    <AppWalletSummary ref="summaryRef" />

    <div v-if="loading" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="i in 6" :key="i" class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200">
        <div class="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div class="mt-2 h-6 w-32 animate-pulse rounded bg-gray-200" />
        <div class="mt-4 grid grid-cols-2 gap-2">
          <div class="h-12 animate-pulse rounded-lg bg-gray-100" />
          <div class="h-12 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    </div>

    <div v-else-if="!wallets.length" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <Wallet class="mx-auto mb-3 h-12 w-12 text-gray-300" />
      <p class="text-sm text-gray-500">Belum ada dompet yang tersedia.</p>
    </div>

    <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="wallet in wallets"
        :key="wallet.id"
        class="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-200"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-gray-900">{{ wallet.name }}</p>
            <p class="text-xs text-gray-500">{{ getTypeLabel(wallet.type) }}</p>
          </div>
          <span
            class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
            :class="wallet.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
          >
            {{ wallet.status === 'active' ? 'Aktif' : 'Nonaktif' }}
          </span>
        </div>

        <p class="mt-3 text-xs text-gray-500">Saldo</p>
        <p class="text-lg font-bold text-gray-900">Rp{{ formatCurrency(wallet.balance) }}</p>

        <div class="mt-4 grid grid-cols-2 gap-2">
          <div class="rounded-lg bg-emerald-50 p-2.5 ring-1 ring-emerald-100">
            <p class="flex items-center gap-1 text-[11px] text-emerald-600">
              <ArrowDownLeft class="h-3.5 w-3.5" />
              Masuk
            </p>
            <p class="mt-1 text-sm font-semibold text-emerald-700">Rp{{ formatCurrency(wallet.total_amount_in) }}</p>
          </div>
          <div class="rounded-lg bg-red-50 p-2.5 ring-1 ring-red-100">
            <p class="flex items-center gap-1 text-[11px] text-red-600">
              <ArrowUpRight class="h-3.5 w-3.5" />
              Keluar
            </p>
            <p class="mt-1 text-sm font-semibold text-red-700">Rp{{ formatCurrency(wallet.total_amount_out) }}</p>
          </div>
        </div>

        <div class="mt-3 flex items-center justify-between border-t border-gray-100 pt-2">
          <span class="text-xs text-gray-500">{{ wallet.total_transaction || 0 }} transaksi</span>
          <button
            v-if="wallet.status === 'active' && activeWallets.length >= 2"
            class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-primary-600 transition-colors hover:bg-primary-50"
            @click="openTransferModal(wallet.id)"
          >
            <ArrowLeftRight class="h-3 w-3" />
            Transfer
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Transfer Modal -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showTransferModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        @click.self="showTransferModal = false"
      >
        <div class="flex w-full max-w-md flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
          <!-- Header -->
          <div class="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
            <div class="flex items-center gap-2">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
                <ArrowLeftRight class="h-5 w-5 text-primary-600" />
              </div>
              <h2 class="text-lg font-semibold text-gray-900">Transfer Antar Dompet</h2>
            </div>
            <button class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="showTransferModal = false">
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <div class="space-y-4">
              <!-- From wallet -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Dari Dompet <span class="text-red-500">*</span></label>
                <select
                  v-model="transferForm.from_wallet_id"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">Pilih dompet asal</option>
                  <option v-for="w in activeWallets" :key="w.id" :value="w.id">
                    {{ w.name }} — Rp{{ formatCurrency(w.balance) }}
                  </option>
                </select>
                <p v-if="transferErrors.from_wallet_id" class="mt-1 text-xs text-red-600">{{ transferErrors.from_wallet_id[0] }}</p>
              </div>

              <!-- Arrow indicator -->
              <div class="flex justify-center">
                <ArrowDownLeft class="h-5 w-5 rotate-[-135deg] text-gray-400" />
              </div>

              <!-- To wallet -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Ke Dompet <span class="text-red-500">*</span></label>
                <select
                  v-model="transferForm.to_wallet_id"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  :disabled="!transferForm.from_wallet_id"
                >
                  <option value="">Pilih dompet tujuan</option>
                  <option v-for="w in toWalletOptions" :key="w.id" :value="w.id">
                    {{ w.name }} — Rp{{ formatCurrency(w.balance) }}
                  </option>
                </select>
                <p v-if="transferErrors.to_wallet_id" class="mt-1 text-xs text-red-600">{{ transferErrors.to_wallet_id[0] }}</p>
              </div>

              <!-- Balance hint -->
              <div v-if="fromWallet" class="rounded-lg bg-blue-50 px-4 py-2.5 text-sm ring-1 ring-blue-100">
                <span class="text-blue-600">Saldo tersedia: </span>
                <span class="font-semibold text-blue-800">Rp{{ formatCurrency(fromWallet.balance) }}</span>
              </div>

              <!-- Amount -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Jumlah Transfer <span class="text-red-500">*</span></label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-gray-400 pointer-events-none">Rp</span>
                  <input
                    v-model.number="transferForm.amount"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="w-full rounded-lg border border-gray-300 py-2.5 pl-8 pr-4 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <p v-if="transferErrors.amount" class="mt-1 text-xs text-red-600">{{ transferErrors.amount[0] }}</p>
              </div>

              <!-- Description -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Keterangan</label>
                <input
                  v-model="transferForm.description"
                  type="text"
                  placeholder="Keterangan transfer (opsional)"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <!-- Reference No -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">No. Referensi</label>
                <input
                  v-model="transferForm.reference_no"
                  type="text"
                  placeholder="No. referensi (opsional)"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              @click="showTransferModal = false"
            >
              Batal
            </button>
            <button
              :disabled="savingTransfer"
              class="flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
              @click="handleTransfer"
            >
              <Loader2 v-if="savingTransfer" class="h-4 w-4 animate-spin" />
              {{ savingTransfer ? 'Memproses...' : 'Transfer' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
