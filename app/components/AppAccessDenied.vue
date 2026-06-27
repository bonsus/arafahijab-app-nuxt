<script setup lang="ts">
import { ShieldX, X } from 'lucide-vue-next'

const { accessDeniedVisible, accessDeniedMessage, closeAccessDenied } = useAccessControl()
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
        v-if="accessDeniedVisible"
        class="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
        @click.self="closeAccessDenied"
      >
        <div class="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" @click.stop>
          <div class="flex items-start gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <ShieldX class="h-5 w-5 text-red-600" />
            </div>
            <div class="flex-1">
              <h3 class="text-base font-semibold text-gray-900">Akses Ditolak</h3>
              <p class="mt-1 text-sm text-gray-500">{{ accessDeniedMessage }}</p>
            </div>
            <button class="rounded-lg p-1 text-gray-400 hover:bg-gray-100" @click="closeAccessDenied">
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="mt-5 flex justify-end">
            <button
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
              @click="closeAccessDenied"
            >
              Mengerti
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
