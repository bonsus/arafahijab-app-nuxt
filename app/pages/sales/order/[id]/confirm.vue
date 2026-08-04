<script setup lang="ts">
import { computed, ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Upload, Loader2, CheckCircle2, X, Image as ImageIcon, Rows3, Columns3 } from 'lucide-vue-next'
import { formatCurrency, convertIsoToDatetimeLocal, formatDateTimeForApi } from '~/composables/useFormatters'

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
const fileInput = ref<HTMLInputElement | null>(null)

const form = reactive({
  order_id: orderId, 
  payment_date: convertIsoToDatetimeLocal(new Date().toISOString()),
  amount: 0,
  from_name: '',
  from_bank: '',
  bank_id: '',
  note: '',
  file: null as File | null,
})

const formErrors = ref<Record<string, string[]>>({})
const selectedFiles = ref<File[]>([])
const selectedPreviews = ref<string[]>([])
const combineModalOpen = ref(false)
const combineOrientation = ref<'vertical' | 'horizontal'>('vertical')
const combinedPreview = ref<string>('')
const combinedFile = ref<File | null>(null)
const isCombining = ref(false)

const canCombine = computed(() => selectedFiles.value.length === 2)

function revokePreview(url: string) {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

function clearSelectedFiles() {
  selectedPreviews.value.forEach(revokePreview)
  selectedFiles.value = []
  selectedPreviews.value = []
  combinedPreview.value = ''
  combinedFile.value = null
  combineModalOpen.value = false
  combineOrientation.value = 'vertical'
  form.file = null
}

function setSingleFile(file: File) {
  clearSelectedFiles()
  selectedFiles.value = [file]
  selectedPreviews.value = [URL.createObjectURL(file)]
  form.file = file
}

function setTwoFiles(files: File[]) {
  clearSelectedFiles()
  selectedFiles.value = files.slice(0, 2)
  selectedPreviews.value = selectedFiles.value.map(file => URL.createObjectURL(file))
  combineModalOpen.value = true
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files || []).filter(file => file.type.startsWith('image/'))

  formErrors.value.file = []

  if (!files.length) {
    clearSelectedFiles()
    return
  }

  if (files.length === 1) {
    const file = files[0]
    if (file) {
      setSingleFile(file)
    }
  }
  else {
    setTwoFiles(files.slice(0, 2))
  }

  target.value = ''
}

function onBankSelect(bank: any) {
  form.bank_id = bank.id
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = reject
      image.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function createCombinedImage(files: File[], orientation: 'vertical' | 'horizontal') {
  const images = await Promise.all(files.map(async (file) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    const dimensions = await getImageDimensions(file)
    return { dataUrl, ...dimensions }
  }))

  const maxWidth = 1024
  const gap = 24
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas tidak tersedia')
  }

  const first = images[0]
  const second = images[1]

  if (!first || !second) {
    throw new Error('Dibutuhkan 2 gambar untuk combine')
  }

  if (orientation === 'vertical') {
    const scale = Math.min(1, maxWidth / Math.max(first.width, second.width))
    const width = Math.round(Math.max(first.width, second.width) * scale)
    const firstHeight = Math.round(first.height * scale)
    const secondHeight = Math.round(second.height * scale)
    canvas.width = width
    canvas.height = firstHeight + gap + secondHeight
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    const firstX = Math.round((width - first.width * scale) / 2)
    const secondX = Math.round((width - second.width * scale) / 2)
    await Promise.all(images.map(({ dataUrl }) => new Promise<void>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve()
      image.onerror = reject
      image.src = dataUrl
    })))

    const firstImage = new Image()
    const secondImage = new Image()

    await new Promise<void>((resolve, reject) => {
      let loaded = 0
      const done = () => {
        loaded += 1
        if (loaded === 2) resolve()
      }
      firstImage.onload = done
      secondImage.onload = done
      firstImage.onerror = reject
      secondImage.onerror = reject
      firstImage.src = first.dataUrl
      secondImage.src = second.dataUrl
    })

    context.drawImage(firstImage, firstX, 0, Math.round(first.width * scale), firstHeight)
    context.drawImage(secondImage, secondX, firstHeight + gap, Math.round(second.width * scale), secondHeight)
  }
  else {
    const scale = Math.min(1, maxWidth / (first.width + second.width + gap))
    const width = Math.round((first.width + second.width + gap) * scale)
    const height = Math.round(Math.max(first.height, second.height) * scale)
    canvas.width = width
    canvas.height = height
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    const firstImage = new Image()
    const secondImage = new Image()

    await new Promise<void>((resolve, reject) => {
      let loaded = 0
      const done = () => {
        loaded += 1
        if (loaded === 2) resolve()
      }
      firstImage.onload = done
      secondImage.onload = done
      firstImage.onerror = reject
      secondImage.onerror = reject
      firstImage.src = first.dataUrl
      secondImage.src = second.dataUrl
    })

    const firstWidth = Math.round(first.width * scale)
    const secondWidth = Math.round(second.width * scale)
    const firstHeight = Math.round(first.height * scale)
    const secondHeight = Math.round(second.height * scale)
    const firstY = Math.round((height - firstHeight) / 2)
    const secondY = Math.round((height - secondHeight) / 2)

    context.drawImage(firstImage, 0, firstY, firstWidth, firstHeight)
    context.drawImage(secondImage, firstWidth + Math.round(gap * scale), secondY, secondWidth, secondHeight)
  }

  return new Promise<{ blob: Blob; previewUrl: string }>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Gagal membuat gambar gabungan'))
        return
      }
      resolve({ blob, previewUrl: canvas.toDataURL('image/jpeg', 0.92) })
    }, 'image/jpeg', 0.92)
  })
}

async function openCombineModal() {
  if (selectedFiles.value.length !== 2) return
  isCombining.value = true
  try {
    const result = await createCombinedImage(selectedFiles.value, combineOrientation.value)
    if (combinedPreview.value.startsWith('blob:')) {
      revokePreview(combinedPreview.value)
    }
    combinedPreview.value = result.previewUrl
    combinedFile.value = new File([result.blob], `payment-confirmation-${Date.now()}.jpg`, { type: 'image/jpeg' })
    form.file = combinedFile.value
    combineModalOpen.value = true
  }
  catch (error: any) {
    toast.error(error?.message || 'Gagal menggabungkan gambar')
  }
  finally {
    isCombining.value = false
  }
}

async function applyCombineOrientation(orientation: 'vertical' | 'horizontal') {
  if (selectedFiles.value.length !== 2) return
  combineOrientation.value = orientation
  await openCombineModal()
}

function closeCombineModal() {
  combineModalOpen.value = false
}

function confirmCombinedImage() {
  if (combinedFile.value) {
    form.file = combinedFile.value
    combineModalOpen.value = false
  }
}

function removeSelectedFile(index: number) {
  const preview = selectedPreviews.value[index]
  if (preview) revokePreview(preview)
  selectedFiles.value.splice(index, 1)
  selectedPreviews.value.splice(index, 1)
  combinedPreview.value = ''
  combinedFile.value = null

  if (selectedFiles.value.length === 1) {
    form.file = selectedFiles.value[0] || null
  }
  else {
    form.file = null
  }
}

function resetUpload() {
  clearSelectedFiles()
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function getPreviewLabel(): string {
  if (selectedFiles.value.length === 2) {
    return '2 gambar dipilih, silakan combine dulu'
  }
  if (selectedFiles.value.length === 1) {
    return selectedFiles.value[0]?.name || '1 gambar dipilih'
  }
  return 'Klik untuk upload bukti transfer'
}

function openFilePicker() {
  fileInput.value?.click()
}

function onModalBackdropClick() {
  closeCombineModal()
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
  formData.append('payment_date', formatDateTimeForApi(form.payment_date))
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
              <input v-model="form.payment_date" type="datetime-local" class="input-field" />
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
              @click="openFilePicker"
            >
              <Upload class="mb-2 h-8 w-8 text-gray-400" />
              <p class="text-sm text-gray-500">{{ getPreviewLabel() }}</p>
              <p class="text-xs text-gray-400">JPEG, PNG (Maks. 5MB per file)</p>
              <input
                ref="fileInput"
                type="file"
                accept="image/jpeg,image/png"
                multiple
                class="hidden"
                @change="onFileChange"
              />
            </div>
            <div v-if="selectedFiles.length" class="space-y-3">
              <div class="grid gap-3 sm:grid-cols-2">
                <div
                  v-for="(preview, index) in selectedPreviews"
                  :key="preview"
                  class="overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                >
                  <div class="flex items-center justify-between border-b border-gray-200 px-3 py-2 text-xs text-gray-600">
                    <span>Gambar {{ index + 1 }}</span>
                    <button type="button" class="text-gray-400 hover:text-red-500" @click="removeSelectedFile(index)">
                      <X class="h-4 w-4" />
                    </button>
                  </div>
                  <img :src="preview" alt="Preview" class="h-40 w-full object-contain bg-white" />
                  <div class="px-3 py-2 text-xs text-gray-500">{{ selectedFiles[index]?.name }}</div>
                </div>
              </div>

              <div v-if="selectedFiles.length === 2" class="rounded-lg border border-dashed border-primary-200 bg-primary-50 p-4">
                <div class="mb-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                    :class="combineOrientation === 'vertical' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
                    @click="applyCombineOrientation('vertical')"
                  >
                    <Rows3 class="h-4 w-4" />
                    Vertical
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                    :class="combineOrientation === 'horizontal' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
                    @click="applyCombineOrientation('horizontal')"
                  >
                    <Columns3 class="h-4 w-4" />
                    Horizontal
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    @click="void openCombineModal()"
                  >
                    <ImageIcon class="h-4 w-4" />
                    Preview combine
                  </button>
                </div>
                <p class="text-xs text-gray-600">Hasil combine akan dibuat di frontend dan dibatasi max width 1024px.</p>
              </div>

              <div v-else-if="form.file" class="rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
                <CheckCircle2 class="mr-2 inline h-4 w-4 text-green-500" />
                {{ form.file.name }}
              </div>
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

      <Teleport to="body">
        <Transition name="modal">
          <div
            v-if="combineModalOpen"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            @click.self="onModalBackdropClick"
          >
            <div class="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Combine Gambar</h3>
                  <p class="mt-0.5 text-xs text-gray-500">Pilih orientasi lalu lihat preview hasil gabungan.</p>
                </div>
                <button type="button" class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="closeCombineModal">
                  <X class="h-5 w-5" />
                </button>
              </div>

              <div class="grid gap-0 lg:grid-cols-[1fr_320px]">
                <div class="border-b border-gray-200 bg-gray-50 p-4 lg:border-b-0 lg:border-r">
                  <div class="overflow-hidden rounded-xl border border-gray-200 bg-white p-3">
                    <img
                      v-if="combinedPreview"
                      :src="combinedPreview"
                      alt="Combined preview"
                      class="max-h-[70vh] w-full object-contain"
                    />
                    <div v-else class="flex min-h-[320px] items-center justify-center text-sm text-gray-400">
                      Preview gabungan akan muncul di sini
                    </div>
                  </div>
                </div>

                <div class="space-y-4 p-4">
                  <div class="rounded-xl border border-gray-200 p-4">
                    <p class="text-sm font-semibold text-gray-900">Orientasi combine</p>
                    <div class="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        class="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                        :class="combineOrientation === 'vertical' ? 'bg-primary-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'"
                        @click="void applyCombineOrientation('vertical')"
                      >
                        <Rows3 class="h-4 w-4" />
                        Vertical
                      </button>
                      <button
                        type="button"
                        class="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                        :class="combineOrientation === 'horizontal' ? 'bg-primary-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'"
                        @click="void applyCombineOrientation('horizontal')"
                      >
                        <Columns3 class="h-4 w-4" />
                        Horizontal
                      </button>
                    </div>
                    <p class="mt-3 text-xs text-gray-500">Max width hasil combine: 1024px.</p>
                  </div>

                  <div class="rounded-xl border border-gray-200 p-4">
                    <p class="text-sm font-semibold text-gray-900">File terpilih</p>
                    <div class="mt-3 space-y-2">
                      <div v-for="(file, index) in selectedFiles" :key="file.name + index" class="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                        <ImageIcon class="h-4 w-4 text-gray-400" />
                        <span class="min-w-0 flex-1 truncate">{{ file.name }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex gap-2 pt-2">
                    <button type="button" class="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="closeCombineModal">
                      Batal
                    </button>
                    <button
                      type="button"
                      class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="isCombining || !combinedFile"
                      @click="confirmCombinedImage"
                    >
                      <Loader2 v-if="isCombining" class="h-4 w-4 animate-spin" />
                      {{ isCombining ? 'Menggabungkan...' : 'Pakai Hasil Combine' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
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

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
