<script setup lang="ts">
import { X, Upload, FileText, Loader2 } from 'lucide-vue-next'

interface Bank {
  id: string
  bank_id: string
  bank_name: string
  account_name: string
  account_number: string
  wallet_id: string
  status: string
}

interface SalesOrder {
  id: string
  no: string
  total: string
  payment_status: string
}

interface Props {
  order: SalesOrder | null
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'success'])

const api = useApi()
const toast = useToast()

const banks = ref<Bank[]>([])
const loadingBanks = ref(false)
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const filePreview = ref<string | null>(null)

const form = reactive({
  date: convertIsoToDatetimeLocal(new Date().toISOString()),
  amount: '',
  actual_amount: '',
  bank_id: '',
  note: '',
})

watch(() => props.order, (newOrder) => {
  if (newOrder) {
    form.amount = newOrder.total
    form.actual_amount = newOrder.total
    form.date = convertIsoToDatetimeLocal(new Date().toISOString())
    form.bank_id = ''
    form.note = ''
    selectedFile.value = null
    filePreview.value = null
    errors.value = {}
  }
})

const selectedBank = computed(() => banks.value.find(b => b.id === form.bank_id))

function formatCurrency(value: string): string {
  const num = Number.parseFloat(value)
  return new Intl.NumberFormat('id-ID').format(num)
}

async function fetchBanks() {
  loadingBanks.value = true
  try {
    const res = await api.get<{ data: Bank[] }>('/banks/index')
    banks.value = (res.data || []).filter(b => b.status === 'active')
  }
  catch {
    banks.value = []
  }
  finally {
    loadingBanks.value = false
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    toast.error('File harus berupa JPEG, PNG, atau PDF')
    return
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    toast.error('Ukuran file maksimal 5MB')
    return
  }

  selectedFile.value = file

  // Create preview for images
  if (file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (e) => {
      filePreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
  else {
    filePreview.value = null
  }
}

function removeFile() {
  selectedFile.value = null
  filePreview.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleSubmit() {
  if (!props.order) return

  errors.value = {}
  saving.value = true

  try {
    const formData = new FormData()
    formData.append('order_id', props.order.id)
    formData.append('date', formatDateTimeForApi(form.date))
    formData.append('amount', form.amount)
    formData.append('actual_amount', form.actual_amount)
    formData.append('bank_id', form.bank_id)
    if (form.note) formData.append('note', form.note)
    if (selectedFile.value) formData.append('file', selectedFile.value)

    await api.post('/sales/orders/payments/create', formData)

    toast.success('Pembayaran berhasil dicatat')
    emit('success')
    emit('close')
  }
  catch (err: any) {
    if (err.errors) {
      errors.value = err.errors
    }
    else {
      toast.error(err.message || 'Gagal mencatat pembayaran')
    }
  }
  finally {
    saving.value = false
  }
}

watch(() => props.order, (newOrder) => {
  if (newOrder) {
    fetchBanks()
  }
}, { immediate: true })
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
      <div
        v-if="order"
        class="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 px-4 pb-4 sm:items-center sm:p-0"
        @click.self="$emit('close')"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enter-to-class="opacity-100 translate-y-0 sm:scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0 sm:scale-100"
          leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        >
          <div
            v-if="order"
            class="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 class="text-lg font-bold text-gray-900">Catat Pembayaran</h2>
                <p class="mt-0.5 text-sm text-gray-500">Order: {{ order.no }}</p>
              </div>
              <button
                class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                @click="$emit('close')"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Body -->
            <form class="max-h-[70vh] overflow-y-auto px-6 py-5" @submit.prevent="handleSubmit">
              <div class="space-y-4">
                <!-- Tanggal -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Tanggal Pembayaran <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.date"
                    type="datetime-local"
                    required
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="errors.date" class="mt-1 text-xs text-red-600">{{ errors.date[0] }}</p>
                </div>

                <!-- Jumlah -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Jumlah Pembayaran <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
                    <input
                      :value="formatCurrency(form.amount)"
                      type="text"
                      readonly
                      required
                      class="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                  <!-- <p class="mt-1 text-xs text-gray-500">Rp{{ formatCurrency(form.amount) }}</p> -->
                  <p v-if="errors.amount" class="mt-1 text-xs text-red-600">{{ errors.amount[0] }}</p>
                </div>

                <!-- actual amount -->
                <div >
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Jumlah Aktual <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
                    <input
                      v-model="form.actual_amount"
                      type="text"
                      required
                      class="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                  <p v-if="errors.actual_amount" class="mt-1 text-xs text-red-600">{{ errors.actual_amount[0] }}</p>
                </div>
                <!-- Bank Tujuan -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Bank Tujuan <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="form.bank_id"
                    required
                    :disabled="loadingBanks"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-gray-50"
                  >
                    <option value="">{{ loadingBanks ? 'Memuat...' : 'Pilih bank tujuan' }}</option>
                    <option v-for="bank in banks" :key="bank.id" :value="bank.id">
                      {{ bank.bank_name }} - {{ bank.account_number }} ({{ bank.account_name }})
                    </option>
                  </select>
                  <p v-if="errors.bank_id" class="mt-1 text-xs text-red-600">{{ errors.bank_id[0] }}</p>

                  <!-- Selected bank info -->
                  <div v-if="selectedBank" class="mt-2 rounded-lg bg-blue-50 p-3">
                    <p class="text-xs font-medium text-blue-900">Detail Rekening</p>
                    <div class="mt-1.5 space-y-1">
                      <div class="flex items-center gap-2">
                        <img
                          :src="`/images/banks/${selectedBank.bank_id || 'other'}.svg`"
                          :alt="selectedBank.bank_name"
                          class="h-5 w-5 object-contain"
                          @error="(e) => { const target = e.target as HTMLImageElement; target.src = '/images/banks/other.svg' }"
                        />
                        <p class="text-xs text-blue-700">{{ selectedBank.bank_name }}</p>
                      </div>
                      <p class="text-xs text-blue-600">{{ selectedBank.account_number }}</p>
                      <p class="text-xs text-blue-600">a.n. {{ selectedBank.account_name }}</p>
                    </div>
                  </div>
                </div>

                <!-- File Upload -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">
                    Bukti Pembayaran <span class="text-red-500">*</span>
                  </label>
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    class="hidden"
                    @change="handleFileSelect"
                  />

                  <!-- File preview or upload button -->
                  <div v-if="selectedFile" class="space-y-2">
                    <!-- Image preview -->
                    <div v-if="filePreview" class="relative overflow-hidden rounded-lg border border-gray-200">
                      <img :src="filePreview" alt="Preview" class="h-48 w-full object-cover" />
                      <button
                        type="button"
                        class="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white shadow-lg transition-colors hover:bg-red-600"
                        @click="removeFile"
                      >
                        <X class="h-4 w-4" />
                      </button>
                    </div>

                    <!-- PDF info -->
                    <div v-else class="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                      <div class="flex items-center gap-2">
                        <FileText class="h-5 w-5 text-red-500" />
                        <div>
                          <p class="text-sm font-medium text-gray-900">{{ selectedFile.name }}</p>
                          <p class="text-xs text-gray-500">{{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        class="rounded-lg p-1 text-red-500 hover:bg-red-50"
                        @click="removeFile"
                      >
                        <X class="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <!-- Upload button -->
                  <button
                    v-else
                    type="button"
                    class="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm font-medium text-gray-600 transition-colors hover:border-primary-500 hover:bg-primary-50 hover:text-primary-600"
                    @click="triggerFileInput"
                  >
                    <Upload class="h-5 w-5" />
                    <span>Upload Bukti Pembayaran</span>
                  </button>

                  <p class="mt-1 text-xs text-gray-500">Format: JPEG, PNG, atau PDF (Max. 5MB)</p>
                  <p v-if="errors.file" class="mt-1 text-xs text-red-600">{{ errors.file[0] }}</p>
                </div>

                <!-- Catatan -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Catatan</label>
                  <textarea
                    v-model="form.note"
                    rows="3"
                    placeholder="Catatan tambahan (opsional)"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <p v-if="errors.note" class="mt-1 text-xs text-red-600">{{ errors.note[0] }}</p>
                </div>
              </div>
            </form>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                :disabled="saving"
                @click="$emit('close')"
              >
                Batal
              </button>
              <button
                type="button"
                class="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
                :disabled="saving || !selectedFile || !form.bank_id"
                @click="handleSubmit"
              >
                <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
                {{ saving ? 'Menyimpan...' : 'Simpan Pembayaran' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
