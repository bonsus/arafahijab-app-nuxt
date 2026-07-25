<script setup lang="ts">
import { ShieldAlert } from 'lucide-vue-next'

const { adminAccessDeniedVisible, adminAccessDeniedMessage, closeAccessDenied } = useAdminAccessControl()
</script>

<template>
  <Transition name="fade">
    <div
      v-if="adminAccessDeniedVisible"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      @click.self="closeAccessDenied"
    >
      <div class="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <ShieldAlert class="h-6 w-6" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900">Akses Ditolak</h3>
        <p class="mt-1.5 text-sm text-gray-500">{{ adminAccessDeniedMessage }}</p>
        <button
          class="mt-5 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          @click="closeAccessDenied"
        >
          Mengerti
        </button>
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
