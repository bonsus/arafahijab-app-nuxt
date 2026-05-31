<script setup lang="ts">
import { Scan, X, Loader2, AlertCircle } from 'lucide-vue-next'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const api = useApi()
const router = useRouter()

const scanInput = ref('')
const scanning = ref(false)
const errorMessage = ref('')

function close() {
  emit('update:modelValue', false)
  // Reset state after animation
  setTimeout(() => {
    scanInput.value = ''
    errorMessage.value = ''
  }, 200)
}

async function handleScan() {
  if (!scanInput.value.trim()) return
  
  scanning.value = true
  errorMessage.value = ''
  
  try {
    // Call API to find picking list by nomor
    const res = await api.get<{ data: { id: string; no: string } }>(`/sales/orders/picking-lists/${scanInput.value.trim()}`)
    
    if (res.data?.id) {
      // Close modal and redirect
      close()
      router.push(`/sales/order/picking-list/scan/${res.data.id}`)
    } else {
      errorMessage.value = 'Nomor picking list tidak ditemukan'
    }
  }
  catch (err: any) {
    errorMessage.value = err.message || 'Nomor picking list tidak ditemukan atau tidak aktif'
  }
  finally {
    scanning.value = false
  }
}

function handleKeyPress(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleScan()
  } else if (e.key === 'Escape') {
    close()
  }
}

// Auto focus input when modal opens
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    nextTick(() => {
      const input = document.querySelector('#scan-picking-input') as HTMLInputElement
      if (input) input.focus()
    })
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
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4"
        @click.self="close"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="modelValue"
            class="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 class="text-lg font-bold text-gray-900">Scan Picking</h3>
                <p class="text-xs text-gray-500 mt-0.5">Scan atau input nomor picking list</p>
              </div>
              <button
                type="button"
                class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                @click="close"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Body -->
            <div class="p-6">
              <!-- Scanner Icon -->
              <div class="mb-6 flex justify-center">
                <div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 ring-4 ring-primary-100">
                  <Scan class="h-10 w-10 text-primary-600" />
                </div>
              </div>

              <!-- Input -->
              <div class="space-y-2">
                <label for="scan-picking-input" class="block text-sm font-medium text-gray-700">
                  Nomor Picking List
                </label>
                <div class="relative">
                  <input
                    id="scan-picking-input"
                    v-model="scanInput"
                    type="text"
                    placeholder="Contoh: PL-001 atau scan barcode"
                    class="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-base font-medium focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    :disabled="scanning"
                    @keypress="handleKeyPress"
                  />
                </div>
                <p class="text-xs text-gray-500">
                  Masukkan nomor picking list untuk mulai picking
                </p>
              </div>

              <!-- Error Message -->
              <Transition
                enter-active-class="transition duration-150 ease-out"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-1"
              >
                <div
                  v-if="errorMessage"
                  class="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 ring-1 ring-red-200"
                >
                  <AlertCircle class="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <p class="text-sm font-medium text-red-900">Picking List Tidak Ditemukan</p>
                    <p class="text-xs text-red-700 mt-0.5">{{ errorMessage }}</p>
                  </div>
                </div>
              </Transition>

              <!-- Actions -->
              <div class="mt-6 flex gap-3">
                <button
                  type="button"
                  class="flex-1 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                  @click="close"
                >
                  Batal
                </button>
                <button
                  type="button"
                  :disabled="!scanInput.trim() || scanning"
                  class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="handleScan"
                >
                  <Loader2 v-if="scanning" class="h-4 w-4 animate-spin" />
                  <Scan v-else class="h-4 w-4" />
                  {{ scanning ? 'Mencari...' : 'Scan' }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
