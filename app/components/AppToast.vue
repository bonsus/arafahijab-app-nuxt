<script setup lang="ts">
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-vue-next'

const { toasts, remove } = useToast()

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colorMap = {
  success: 'bg-green-50 text-green-800 ring-green-200',
  error: 'bg-red-50 text-red-800 ring-red-200',
  warning: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
  info: 'bg-blue-50 text-blue-800 ring-blue-200',
}

const iconColorMap = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
}
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed right-0 top-0 z-[9999] flex flex-col items-end gap-2 p-4">
      <TransitionGroup
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-full opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex w-80 items-start gap-3 rounded-lg p-4 shadow-lg ring-1"
          :class="colorMap[toast.type]"
        >
          <component :is="iconMap[toast.type]" class="mt-0.5 h-5 w-5 shrink-0" :class="iconColorMap[toast.type]" />
          <p class="flex-1 text-sm font-medium">{{ toast.message }}</p>
          <button class="shrink-0 opacity-60 hover:opacity-100" @click="remove(toast.id)">
            <X class="h-4 w-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
