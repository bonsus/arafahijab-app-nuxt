<script setup lang="ts">
import { X } from 'lucide-vue-next'

interface Props {
  modelValue: boolean
  title?: string
  /** Tailwind max-width class for the panel. */
  maxWidth?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  maxWidth: 'max-w-lg',
})

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="props.modelValue"
      class="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      @click.self="close"
    >
      <div
        class="my-8 w-full rounded-xl bg-white shadow-xl"
        :class="props.maxWidth"
      >
        <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h3 class="text-base font-semibold text-gray-900">{{ props.title }}</h3>
          <button
            class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            @click="close"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
        <div class="px-5 py-4">
          <slot />
        </div>
        <div v-if="$slots.footer" class="flex justify-end gap-2 border-t border-gray-100 px-5 py-3.5">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
