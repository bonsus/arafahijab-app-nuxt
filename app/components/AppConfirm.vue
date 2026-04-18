<script setup lang="ts">
import { AlertTriangle, X } from 'lucide-vue-next'

const visible = ref(false)
const title = ref('Konfirmasi')
const message = ref('')
const confirmText = ref('Hapus')
const cancelText = ref('Batal')
const variant = ref<'danger' | 'warning' | 'info'>('danger')
let resolvePromise: ((value: boolean) => void) | null = null

function open(opts: {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}): Promise<boolean> {
  title.value = opts.title || 'Konfirmasi'
  message.value = opts.message
  confirmText.value = opts.confirmText || 'Hapus'
  cancelText.value = opts.cancelText || 'Batal'
  variant.value = opts.variant || 'danger'
  visible.value = true
  return new Promise((resolve) => {
    resolvePromise = resolve
  })
}

function onConfirm() {
  visible.value = false
  resolvePromise?.(true)
  resolvePromise = null
}

function onCancel() {
  visible.value = false
  resolvePromise?.(false)
  resolvePromise = null
}

defineExpose({ open })
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
        v-if="visible"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
        @click.self="onCancel"
      >
        <div class="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" @click.stop>
          <div class="flex items-start gap-4">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              :class="{
                'bg-red-100': variant === 'danger',
                'bg-amber-100': variant === 'warning',
                'bg-blue-100': variant === 'info',
              }"
            >
              <AlertTriangle
                class="h-5 w-5"
                :class="{
                  'text-red-600': variant === 'danger',
                  'text-amber-600': variant === 'warning',
                  'text-blue-600': variant === 'info',
                }"
              />
            </div>
            <div class="flex-1">
              <h3 class="text-base font-semibold text-gray-900">{{ title }}</h3>
              <p class="mt-1 text-sm text-gray-500">{{ message }}</p>
            </div>
            <button class="rounded-lg p-1 text-gray-400 hover:bg-gray-100" @click="onCancel">
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="mt-5 flex justify-end gap-3">
            <button
              class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              @click="onCancel"
            >
              {{ cancelText }}
            </button>
            <button
              class="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
              :class="{
                'bg-red-600 hover:bg-red-700': variant === 'danger',
                'bg-amber-600 hover:bg-amber-700': variant === 'warning',
                'bg-blue-600 hover:bg-blue-700': variant === 'info',
              }"
              @click="onConfirm"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
