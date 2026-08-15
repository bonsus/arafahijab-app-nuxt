import { X, Check, AlertCircle } from 'lucide-vue-next'

interface ImportResult {
  mp_product_id: string
  product_id: string
  product_name: string
  category_id: string
  status: 'success' | 'failed'
  skus: string[] | null
  failed_reason?: string
}

const props = defineProps<{
  modelValue: boolean
  results: ImportResult[]
  storeName: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const successCount = computed(() => props.results.filter(r => r.status === 'success').length)
const failedCount = computed(() => props.results.filter(r => r.status === 'failed').length)

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @click.self="close"
  >
    <div class="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl" @click.stop>
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Hasil Import Produk</h2>
          <p class="mt-0.5 text-sm text-gray-500">{{ storeName }}</p>
        </div>
        <button
          type="button"
          class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          @click="close"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Stats -->
      <div class="flex gap-4 border-b border-gray-200 px-6 py-4">
        <div class="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2">
          <Check class="h-4 w-4 text-green-600" />
          <span class="text-sm font-medium text-green-700">{{ successCount }} Berhasil</span>
        </div>
        <div class="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2">
          <AlertCircle class="h-4 w-4 text-red-600" />
          <span class="text-sm font-medium text-red-700">{{ failedCount }} Gagal</span>
        </div>
      </div>

      <!-- Results list -->
      <div class="flex-1 overflow-auto">
        <div
          v-for="result in results"
          :key="result.mp_product_id"
          class="flex items-start gap-3 border-b border-gray-100 px-6 py-4"
        >
          <div class="mt-0.5">
            <Check v-if="result.status === 'success'" class="h-5 w-5 text-green-600" />
            <AlertCircle v-else class="h-5 w-5 text-red-600" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900">{{ result.product_name }}</p>
            <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span class="font-mono">ID: {{ result.mp_product_id }}</span>
              <span
                v-if="result.status === 'success' && result.skus?.length"
                class="rounded bg-green-50 px-1.5 py-0.5 font-medium text-green-700"
              >
                {{ result.skus.length }} SKU
              </span>
            </div>
            <p v-if="result.status === 'failed' && result.failed_reason" class="mt-1 text-xs text-red-600">
              {{ result.failed_reason }}
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end border-t border-gray-200 px-6 py-4">
        <button
          type="button"
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          @click="close"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
</template>
