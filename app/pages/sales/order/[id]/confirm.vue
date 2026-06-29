<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Upload, Loader2, CheckCircle2 } from 'lucide-vue-next'
import { formatCurrency } from '~/composables/useFormatters'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const orderId = route.params.id as string

const api = useApi()
const toast = useToast()

const loading = ref(true)
const submitting = ref(false)
const order = ref<any>(null)
const banks = ref<any[]>([])

const form = reactive({
  order_id: orderId, 
  payment_date: new Date().toISOString().slice(0, 10),
  amount: 0,
  from_name: '',
  from_bank: '',
  bank_id: '',
  note: '',
  file: null as File | null,
})

const formErrors = ref<Record<string, string[]>>({})
const filePreview = ref<string>('')

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    form.file = target.files[0]
    // Create preview for image
    if (form.file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        filePreview.value = e.target?.result as string
      }
      reader.readAsDataURL(form.file)
    } else {
      filePreview.value = ''
    }
  }
}

function onBankSelect(bank: any) {
  form.bank_id = bank.id
}

async function handleSubmit() {
  formErrors.value = {}
  
  if (!form.file) {
    formErrors.value.file = ['Bukti transfer wajib diupload']
    return
  }
  
  submitting.value = true
  
  const formData = new FormData()
  formData.append('order_id', form.order_id) 
  formData.append('payment_date', String(form.payment_date))
  formData.append('amount', String(form.amount))
  formData.append('from_name', form.from_name)
  formData.append('from_bank', form.from_bank) 
  formData.append('bank_id', form.bank_id)

  formData.append('note', form.note)
  formData.append('file', form.file)
  
  try {  
    await api.post('/sales/orders/payment-confirmations/create', formData)
    toast.success('Konfirmasi pembayaran berhasil dikirim')
    router.push(`/sales/order`)
  } catch (err: any) {
    if (err.errors) {
      formErrors.value = err.errors
    } else {
      toast.error(err.message || 'Gagal mengirim konfirmasi pembayaran')
    }
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    // Fetch order
    const res = await api.get<{ data: any }>(`/sales/orders/${orderId}`)
    order.value = res.data
    form.amount = Number(order.value.total)
    
    // Fetch banks
    const bankRes = await api.get<{ data: any[] }>('/banks/index')
    banks.value = (bankRes.data || []).filter((b: any) => b.status === 'active')
  } catch (err: any) {
    toast.error(err.message || 'Gagal memuat data')
    router.push('/sales/order')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="max-w-2xl mx-auto py-8 px-4">
    <div class="mb-6 flex items-center gap-3">
      <button
        type="button"
        class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        @click="router.back()"
      >
        <ArrowLeft class="h-5 w-5" />
      </button>
      <h1 class="text-2xl font-bold text-gray-900">Konfirmasi Pembayaran</h1>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-400">Memuat data...</div>

    <template v-else>
      <!-- Order Info -->
      <div class="mb-6 rounded-xl bg-white p-5 shadow ring-1 ring-gray-200">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm text-gray-600">No. Order</span>
          <span class="font-mono text-sm font-bold text-primary-600">{{ order.no }}</span>
        </div>
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm text-gray-600">Total Pembayaran</span>
          <span class="text-base font-bold text-gray-900">Rp{{ formatCurrency(Number(order.total)) }}</span>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <!-- Pilih Rekening Tujuan -->
        <div class="rounded-xl bg-white p-5 shadow ring-1 ring-gray-200">
          <label class="mb-3 block text-sm font-semibold text-gray-900">
            Pilih Rekening Tujuan <span class="text-red-500">*</span>
          </label>
          <div class="space-y-2">
            <label
              v-for="bank in banks"
              :key="bank.id"
              class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50"
              :class="form.bank_id === bank.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'"
            >
              <input
                type="radio"
                :value="bank.id"
                :checked="form.bank_id === bank.id"
                class="text-primary-600"
                @change="onBankSelect(bank)"
              />
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <img :src="`/images/banks/${bank.bank_name}.svg`" :alt="bank.bank_name" class="h-5 w-5 object-contain" @error="($event.target as HTMLImageElement).style.display='none'" />
                  <span class="font-semibold text-gray-900">{{ bank.bank_name }}</span>
                </div>
                <div class="mt-0.5 text-xs text-gray-500">
                  {{ bank.account_number }} - {{ bank.account_name }}
                </div>
              </div>
            </label>
          </div>
          <p v-if="formErrors.bank_id" class="mt-1 text-xs text-red-600">{{ formErrors.bank_id[0] }}</p>
        </div>

        <div class="rounded-xl bg-white p-5 shadow ring-1 ring-gray-200">
          <h2 class="mb-4 text-sm font-semibold text-gray-900">Informasi Transfer</h2>
          <div class="space-y-4">
            <!-- Tanggal Transfer -->
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600">
                Tanggal Transfer <span class="text-red-500">*</span>
              </label>
              <input v-model="form.payment_date" type="date" class="input-field" />
              <p v-if="formErrors.payment_date" class="mt-1 text-xs text-red-600">{{ formErrors.payment_date[0] }}</p>
            </div>

            <!-- Jumlah Transfer -->
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600">
                Jumlah Transfer <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
                <input v-model.number="form.amount" type="number" min="0" class="input-field" style="padding-left:2rem;" readonly />
              </div>
              <p v-if="formErrors.amount" class="mt-1 text-xs text-red-600">{{ formErrors.amount[0] }}</p>
            </div>

            <!-- Nama Pengirim -->
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600">
                Nama Pengirim <span class="text-red-500">*</span>
              </label>
              <input v-model="form.from_name" type="text" class="input-field" placeholder="Nama pemilik rekening pengirim" />
              <p v-if="formErrors.from_name" class="mt-1 text-xs text-red-600">{{ formErrors.from_name[0] }}</p>
            </div>

            <!-- Bank Pengirim -->
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600">
                Bank Pengirim <span class="text-red-500">*</span>
              </label>
              <input v-model="form.from_bank" type="text" class="input-field" placeholder="Contoh: BCA" />
              <p v-if="formErrors.from_bank" class="mt-1 text-xs text-red-600">{{ formErrors.from_bank[0] }}</p>
            </div>

            <!-- Catatan -->
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600">Catatan (Opsional)</label>
              <textarea v-model="form.note" rows="2" class="input-field" placeholder="Catatan tambahan..."></textarea>
            </div>
          </div>
        </div>

        <!-- Upload Bukti -->
        <div class="rounded-xl bg-white p-5 shadow ring-1 ring-gray-200">
          <label class="mb-3 block text-sm font-semibold text-gray-900">
            Upload Bukti Transfer <span class="text-red-500">*</span>
          </label>
          <div class="space-y-3">
            <div
              class="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-8 transition-colors hover:border-primary-400"
              @click="($refs.fileInput as HTMLInputElement)?.click()"
            >
              <Upload class="mb-2 h-8 w-8 text-gray-400" />
              <p class="text-sm text-gray-500">Klik untuk upload bukti transfer</p>
              <p class="text-xs text-gray-400">JPEG, PNG (Maks. 5MB)</p>
              <input
                ref="fileInput"
                type="file"
                accept="image/jpeg,image/png"
                class="hidden"
                @change="onFileChange"
              />
            </div>
            <div v-if="filePreview" class="rounded-lg border border-gray-200 p-2">
              <img :src="filePreview" alt="Preview" class="max-h-48 w-full rounded object-contain" />
            </div>
            <div v-else-if="form.file" class="rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
              <CheckCircle2 class="mr-2 inline h-4 w-4 text-green-500" />
              {{ form.file.name }}
            </div>
          </div>
          <p v-if="formErrors.file" class="mt-2 text-xs text-red-600">{{ formErrors.file[0] }}</p>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            @click="router.back()"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="submitting"
            class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
            {{ submitting ? 'Mengirim...' : 'Kirim Konfirmasi' }}
          </button>
        </div>
      </form>
    </template>
  </div>
</template>

<style scoped>
.input-field {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid rgb(209 213 219);
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  color: rgb(17 24 39);
}
.input-field::placeholder {
  color: rgb(156 163 175);
}
.input-field:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-500-rgb), 0.2);
}
</style>
