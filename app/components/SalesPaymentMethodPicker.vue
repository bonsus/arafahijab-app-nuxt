<script setup lang="ts">
import { CreditCard, X, Loader2, Check, RefreshCw } from 'lucide-vue-next'

export interface PaymentMethod {
  id: string
  provider: string
  type: string
  code: string
  name: string
  category: string
  sort: number
}

const props = defineProps<{
  modelValue: PaymentMethod | null
  codAvailable?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [method: PaymentMethod | null]
}>()

const api = useApi()

const open = ref(false)
const loading = ref(false)
const methods = ref<PaymentMethod[]>([])
const error = ref('')

const categoryLabels: Record<string, string> = {
  BANK_TRANSFER: 'Transfer Bank',
  COD: 'COD',
  VIRTUAL_ACCOUNT: 'Virtual Account',
  EWALLET: 'E-Wallet',
  QRIS: 'QRIS',
}

const categoryOrder = ['COD','BANK_TRANSFER', 'QRIS', 'EWALLET', 'VIRTUAL_ACCOUNT'] as const

const filteredMethods = computed(() => {
  return methods.value.filter(m => {
    if (m.category === 'COD') return !!props.codAvailable
    return true
  })
})

const groupedMethods = computed(() => {
  const groups: Record<string, PaymentMethod[]> = {}
  for (const cat of categoryOrder) {
    const items = filteredMethods.value.filter(m => m.category === cat)
    if (items.length) groups[cat] = items.sort((a, b) => a.sort - b.sort)
  }
  return groups
})

async function openModal() {
  open.value = true
  if (!methods.value.length) await fetchMethods()
}

async function fetchMethods() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get<{ data: PaymentMethod[] }>('/payment-methods/available')
    methods.value = res.data || []
  }
  catch (err: any) {
    error.value = err.message || 'Gagal memuat metode pembayaran'
  }
  finally {
    loading.value = false
  }
}

function select(method: PaymentMethod) {
  emit('update:modelValue', method)
  open.value = false
}

function iconPath(code: string): string {
  return `/images/banks/${code.toLowerCase()}.svg`
}

const brokenIcons = ref<Set<string>>(new Set())
function onIconError(code: string) {
  brokenIcons.value = new Set([...brokenIcons.value, code])
}
function hasIcon(code: string): boolean {
  return !brokenIcons.value.has(code)
}

// when COD becomes unavailable and current selection is COD, clear it
watch(() => props.codAvailable, (val) => {
  if (!val && props.modelValue?.category === 'COD') {
    emit('update:modelValue', null)
  }
})
</script>

<template>
  <!-- Trigger / Selected summary -->
  <div>
    <button
      v-if="!modelValue"
      type="button"
      class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
      @click="openModal"
    >
      <CreditCard class="h-4 w-4" />
      Pilih Metode Pembayaran
    </button>

    <!-- Selected summary -->
    <div
      v-if="modelValue"
      class="flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2.5"
    >
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-gray-100 overflow-hidden">
        <img
          v-if="hasIcon(modelValue.code)"
          :src="iconPath(modelValue.code)"
          :alt="modelValue.name"
          class="h-7 w-7 object-contain"
          @error="onIconError(modelValue.code)"
        />
        <CreditCard v-else class="h-4 w-4 text-gray-300" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-primary-900">{{ modelValue.name }}</p>
        <p class="text-xs text-primary-500 capitalize">{{ categoryLabels[modelValue.category] || modelValue.category }}</p>
      </div>
      <button
        type="button"
        class="shrink-0 text-xs font-medium text-primary-500 hover:text-primary-700"
        @click="openModal"
      >
        Ganti
      </button>
    </div>
  </div>

  <!-- Modal -->
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
        v-if="open"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        @click.self="open = false"
      >
        <div
          class="flex w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl"
          style="max-height: 80vh"
          @click.stop
        >
          <!-- Header -->
          <div class="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3">
            <CreditCard class="h-4 w-4 text-primary-500" />
            <h3 class="flex-1 text-sm font-semibold text-gray-900">Metode Pembayaran</h3>
            <button
              class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              @click="open = false"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Loading -->
          <div v-if="loading" class="flex flex-1 items-center justify-center gap-2 py-16 text-sm text-gray-400">
            <Loader2 class="h-5 w-5 animate-spin" /> Memuat...
          </div>

          <!-- Error -->
          <div v-else-if="error" class="flex-1 px-4 py-10 text-center">
            <p class="mb-3 text-sm text-red-500">{{ error }}</p>
            <button
              type="button"
              class="mx-auto flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="fetchMethods"
            >
              <RefreshCw class="h-4 w-4" /> Coba Lagi
            </button>
          </div>

          <!-- Method groups -->
          <div v-else class="min-h-0 flex-1 overflow-y-auto">
            <template v-for="cat in categoryOrder" :key="cat">
              <template v-if="groupedMethods[cat]?.length">
                <!-- Category label -->
                <p class="sticky top-0 bg-gray-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  {{ categoryLabels[cat] || cat }}
                </p>

                <!-- Methods in category -->
                <button
                  v-for="method in groupedMethods[cat]"
                  :key="method.id"
                  type="button"
                  class="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-primary-50 last:border-b-0"
                  :class="modelValue?.id === method.id ? 'bg-primary-50' : ''"
                  @click="select(method)"
                >
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 ring-1 ring-gray-100 overflow-hidden">
                    <img
                      v-if="hasIcon(method.code)"
                      :src="iconPath(method.code)"
                      :alt="method.name"
                      class="h-8 w-8 object-contain p-0.5"
                      @error="onIconError(method.code)"
                    />
                    <CreditCard v-else class="h-5 w-5 text-gray-300" />
                  </div>

                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-gray-900">{{ method.name }}</p>
                    <p class="text-xs text-gray-400 capitalize">{{ method.provider }}</p>
                  </div>

                  <Check
                    v-if="modelValue?.id === method.id"
                    class="h-4 w-4 shrink-0 text-primary-500"
                  />
                </button>
              </template>
            </template>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>
