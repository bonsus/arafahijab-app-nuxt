<script setup lang="ts">
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from 'reka-ui'
import {
  Settings,
  Globe,
  Box,
  Layout,
  Menu as MenuIcon,
  Truck,
  CreditCard,
  Folder,
  Newspaper,
  ChevronsUpDown,
  Store as StoreIcon,
  ArrowLeft,
  X,
  Check,
} from 'lucide-vue-next'
import type { Component } from 'vue'
import type { WebsiteMenuItem } from '~/composables/useWebsiteMenu'

const route = useRoute()
const sidebar = useSidebar()
const menu = useWebsiteMenu()
const { webStores, selectedStore, selectStore } = useWebsiteStore()

function onNavClick() {
  if (window.innerWidth < 1024) sidebar.close()
}

const iconMap: Record<string, Component> = {
  settings: Settings,
  globe: Globe,
  box: Box,
  layout: Layout,
  menu: MenuIcon,
  truck: Truck,
  'credit-card': CreditCard,
  folder: Folder,
  newspaper: Newspaper,
}

function getIcon(name: string): Component {
  return iconMap[name] || Settings
}

function isActive(item: WebsiteMenuItem): boolean {
  const target = item.match || item.to
  return route.path === target || route.path.startsWith(target + '/')
}
</script>

<template>
  <!-- Mobile overlay -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="sidebar.isOpen.value"
        class="fixed inset-0 z-40 bg-black/50 lg:hidden"
        @click="sidebar.close()"
      />
    </Transition>
  </Teleport>

  <aside
    class="fixed inset-y-0 left-0 z-50 flex w-58 flex-col border-r border-gray-800 bg-gray-900 transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0"
    :class="sidebar.isOpen.value ? 'translate-x-0' : '-translate-x-full'"
  >
    <!-- Header -->
    <div class="border-b border-gray-800 px-4 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
            <Globe class="h-4 w-4" />
          </div>
          <span class="text-lg font-semibold text-white">Website</span>
        </div>
        <button
          class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white lg:hidden"
          @click="sidebar.close()"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Store switcher -->
      <DropdownMenuRoot>
        <DropdownMenuTrigger
          class="mt-3 flex w-full items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-800"
        >
          <StoreIcon class="h-4 w-4 shrink-0 text-gray-400" />
          <span class="flex-1 truncate text-left">
            {{ selectedStore?.shop_name || 'Pilih store web' }}
          </span>
          <ChevronsUpDown class="h-3.5 w-3.5 shrink-0 text-gray-400" />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            class="z-[60] min-w-[220px] rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
            :side-offset="4"
            align="start"
          >
            <template v-if="webStores.length">
              <DropdownMenuItem
                v-for="s in webStores"
                :key="s.id"
                class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none transition-colors hover:bg-gray-100 data-[highlighted]:bg-gray-100"
                @select="selectStore(s.id)"
              >
                <StoreIcon class="h-4 w-4 shrink-0 text-gray-400" />
                <span class="flex-1 truncate">{{ s.shop_name }}</span>
                <Check v-if="selectedStore?.id === s.id" class="h-4 w-4 shrink-0 text-primary-600" />
              </DropdownMenuItem>
            </template>
            <div v-else class="px-3 py-2 text-xs text-gray-400">
              Belum ada store web
            </div>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto px-3 py-4">
      <ul class="space-y-1">
        <li v-for="item in menu" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
            :class="isActive(item) ? 'bg-primary-600 text-white hover:bg-primary-600 hover:text-white' : ''"
            @click="onNavClick"
          >
            <component :is="getIcon(item.icon)" class="h-4 w-4 shrink-0" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <!-- Footer: back to ERP -->
    <div class="border-t border-gray-800 p-3">
      <NuxtLink
        to="/dashboard"
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        @click="onNavClick"
      >
        <ArrowLeft class="h-4 w-4 shrink-0" />
        <span>Kembali ke ERP</span>
      </NuxtLink>
    </div>
  </aside>
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
