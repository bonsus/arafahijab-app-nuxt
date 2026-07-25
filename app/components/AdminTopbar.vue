<script setup lang="ts">
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from 'reka-ui'
import { Menu, ChevronDown, User, LogOut } from 'lucide-vue-next'

const sidebar = useAdminSidebar()
const authStore = useAdminAuthStore()

const initials = computed(() => {
  const name = authStore.admin?.name || 'A'
  return name.trim().charAt(0).toUpperCase()
})

function logout() {
  authStore.logout()
}
</script>

<template>
  <header class="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
    <div class="flex items-center gap-3">
      <button
        class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 lg:hidden"
        @click="sidebar.toggle()"
      >
        <Menu class="h-5 w-5" />
      </button>
      <div class="hidden sm:block">
        <span class="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">Admin Area</span>
      </div>
    </div>

    <DropdownMenuRoot>
      <DropdownMenuTrigger
        class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-100"
      >
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
          {{ initials }}
        </div>
        <div class="hidden text-left sm:block">
          <p class="text-sm font-medium text-gray-900">{{ authStore.admin?.name || 'Admin' }}</p>
          <p class="text-[11px] text-gray-500">{{ authStore.admin?.role?.name || '-' }}</p>
        </div>
        <ChevronDown class="h-4 w-4 text-gray-400" />
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          align="end"
          :side-offset="6"
          class="z-50 w-48 rounded-lg border border-gray-100 bg-white py-1 shadow-lg"
        >
          <DropdownMenuItem
            class="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-50"
            @click="navigateTo('/admin/profile')"
          >
            <User class="h-4 w-4" /> Profil Saya
          </DropdownMenuItem>
          <DropdownMenuItem
            class="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-red-600 outline-none hover:bg-red-50"
            @click="logout"
          >
            <LogOut class="h-4 w-4" /> Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
  </header>
</template>
