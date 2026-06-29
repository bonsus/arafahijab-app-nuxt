<script setup lang="ts">
import { X, Upload, Loader2, CheckCircle2 } from 'lucide-vue-next'

interface Bank {
  id: string
  bank_name: string
  account_name: string
  account_number: string
  status: string
}

interface SalesOrder {
  id: string
  no: string
  total: string
}

interface Props {
  order: SalesOrder | null
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'success'])

const api = useApi()
const toast = useToast()

const banks = ref<Bank[]>([])
const submitting = ref(false)
const formErrors = ref<Record<string, string[]>>({})
const filePreview = ref<string>('')
const fileInput = ref<HTMLInputElement | null>(null)

const form = reactive({
  payment_date: new Date().toISOString().slice(0, 10),
  amount: 0,
  from_name: '',
  from_bank: '',
  bank_id: '',
  note: '',
  file: null as File | null,
})

watch(() => props.order, async (order) => {
  if (order) {
    form.payment_date = new Date().toISOString().slice(0, 10)
    form.amount = Number(order.total)
    form.from_name = ''
    form.from_bank = ''
    form.bank_id = ''
    form.note = ''
    form.file = null
    filePreview.value = ''
    formErrors.value = {}
    await fetchBanks()
  }
})

async function fetchBanks() {
  try {
    const res = await api.get<{ data: Bank[] }>('/banks/index')
    banks.value = (res.data || []).filter(b => b.status === 'active')
  }
  catch { banks.value = [] }
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    form.file = target.files[0]
    if (form.file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => { filePreview.value = ev.target?.result as string }
      reader.readAsDataURL(form.file)
    }
    else {
      filePreview.value = ''
    }
  }
}

async function handleSubmit() {
  if (!props.order) return
  formErrors.value = {}
  if (!form.file) {
    formErrors.value.file = ['Bukti transfer wajib diupload']
    return
  }
  submitting.value = true
  const formData = new FormData()
  formData.append('order_id', props.order.id)
  formData.append('payment_date', String(form.payment_date))
  formData.append('amount', String(form.amount))
  formData.append('from_name', form.from_name)
  formData.append('from_bank', form.from_bank)
  formData.append('bank_id', form.bank_id)
  formData.append('note', form.note)
  formData.append('file', form.file)
  try {
    await api.post('/sales/ordercs/payment-confirmations/create', formData)
    toast.success('Konfirmasi pembayaran berhasil dikirim')
    emit('success')
    emit('close')
  }
  catch (err: any) {
    if (err.errors) formErrors.value = err.errors
    else toast.error(err.message || 'Gagal mengirim konfirmasi pembayaran')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="order" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/40" @click="emit('close')" />
      <div class="relative z-10 w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 class="text-base font-semibold text-gray-900">Konfirmasi Pembayaran</h2>
          <button class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="emit('close')">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form class="max-h-[75vh] overflow-y-auto px-5 py-4 space-y-4" @submit.prevent="handleSubmit">
          <div class="rounded-lg bg-gray-50 p-3 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-gray-600">No. Order</span>
              <span class="font-mono font-semibold text-primary-600">{{ order.no }}</span>
            </div>
            <div class="mt-1 flex items-center justify-between">
              <span class="text-gray-600">Total</span>
              <span class="font-bold text-gray-900">Rp{{ formatCurrency(order.total) }}</span>
            </div>
          </div>

          <div>
            <label class="mb-2 block text-sm font-semibold text-gray-900">Rekening Tujuan <span class="text-red-500">*</span></label>
            <div class="space-y-2">
              <label
                v-for="bank in banks"
                :key="bank.id"
                class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50"
                :class="form.bank_id === bank.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'"
              >
                <input v-model="form.bank_id" type="radio" :value="bank.id" class="text-primary-600" />
                <div class="flex-1">
                  <span class="font-semibold text-gray-900">{{ bank.bank_name }}</span>
                  <div class="text-xs text-gray-500">{{ bank.account_number }} - {{ bank.account_name }}</div>
                </div>
              </label>
            </div>
            <p v-if="formErrors.bank_id" class="mt-1 text-xs text-red-600">{{ formErrors.bank_id[0] }}</p>
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600">Tanggal Transfer <span class="text-red-500">*</span></label>
            <input v-model="form.payment_date" type="date" class="cs-input" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600">Jumlah Transfer</label>
            <input v-model.number="form.amount" type="number" min="0" class="cs-input" readonly />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600">Nama Pengirim <span class="text-red-500">*</span></label>
            <input v-model="form.from_name" type="text" class="cs-input" placeholder="Nama pemilik rekening pengirim" />
            <p v-if="formErrors.from_name" class="mt-1 text-xs text-red-600">{{ formErrors.from_name[0] }}</p>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600">Bank Pengirim <span class="text-red-500">*</span></label>
            <input v-model="form.from_bank" type="text" class="cs-input" placeholder="Contoh: BCA" />
            <p v-if="formErrors.from_bank" class="mt-1 text-xs text-red-600">{{ formErrors.from_bank[0] }}</p>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600">Catatan (Opsional)</label>
            <textarea v-model="form.note" rows="2" class="cs-input" placeholder="Catatan tambahan..." />
          </div>

          <div>
            <label class="mb-2 block text-sm font-semibold text-gray-900">Bukti Transfer <span class="text-red-500">*</span></label>
            <div class="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-6 hover:border-primary-400" @click="fileInput?.click()">
              <Upload class="mb-2 h-7 w-7 text-gray-400" />
              <p class="text-sm text-gray-500">Klik untuk upload</p>
              <p class="text-xs text-gray-400">JPEG, PNG (Maks. 5MB)</p>
              <input ref="fileInput" type="file" accept="image/jpeg,image/png" class="hidden" @change="onFileChange" />
            </div>
            <div v-if="filePreview" class="mt-2 rounded-lg border border-gray-200 p-2">
              <img :src="filePreview" alt="Preview" class="max-h-40 w-full rounded object-contain" />
            </div>
            <div v-else-if="form.file" class="mt-2 rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
              <CheckCircle2 class="mr-2 inline h-4 w-4 text-green-500" />{{ form.file.name }}
            </div>
            <p v-if="formErrors.file" class="mt-1 text-xs text-red-600">{{ formErrors.file[0] }}</p>
          </div>

          <div class="flex gap-3 pt-2">
            <button type="button" class="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="emit('close')">Batal</button>
            <button type="submit" :disabled="submitting" class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
              <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
              {{ submitting ? 'Mengirim...' : 'Kirim Konfirmasi' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cs-input {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid rgb(209 213 219);
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: rgb(17 24 39);
}
.cs-input::placeholder { color: rgb(156 163 175); }
.cs-input:focus { outline: none; border-color: var(--color-primary-500); }
</style>
