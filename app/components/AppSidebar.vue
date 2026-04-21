
<script setup lang="ts">
import {
  CollapsibleRoot,
  CollapsibleTrigger,
  CollapsibleContent,
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from 'reka-ui'
import {
  LayoutDashboard,
  ShoppingCart,
  PackageCheck,
  Box,
  Users,
  Warehouse,
  FileBarChart,
  Settings,
  Wallet,
  ChevronDown,
  ChevronsUpDown,
  LogOut,
  Bell,
  Building2,
  X,
} from 'lucide-vue-next'
import type { MenuItem, Business, Notification } from '~/types'
import type { Component } from 'vue'

const authStore = useAuthStore()
const route = useRoute()
const menu = useSidebarMenu()
const sidebar = useSidebar()

// Close sidebar on mobile when a link is clicked
function onNavClick() {
  if (window.innerWidth < 1024) {
    sidebar.close()
  }
}

// Dummy businesses
const businesses: Business[] = [
  { id: 1, name: 'Arafa Hijab Store' },
  { id: 2, name: 'Arafa Outlet Jakarta' },
  { id: 3, name: 'Arafa Online Shop' },
]
const currentBusiness = ref<Business>(businesses[0]!)

// Dummy notifications
const notifications: Notification[] = [
  { id: 1, title: 'Order Baru', message: 'Order #1234 masuk dari marketplace', read: false, createdAt: '2026-04-13' },
  { id: 2, title: 'Stock Rendah', message: 'Stok Hijab Pashmina tinggal 5 pcs', read: false, createdAt: '2026-04-13' },
  { id: 3, title: 'Pembayaran Diterima', message: 'Pembayaran PO #567 sudah dikonfirmasi', read: true, createdAt: '2026-04-12' },
  { id: 4, title: 'Return Disetujui', message: 'Return #89 telah diproses', read: true, createdAt: '2026-04-11' },
]
const unreadCount = computed(() => notifications.filter((n) => !n.read).length)

const iconMap: Record<string, Component> = {
  'layout-dashboard': LayoutDashboard,
  'shopping-cart': ShoppingCart,
  'package-check': PackageCheck,
  'box': Box,
  'users': Users,
  'warehouse': Warehouse,
  'file-bar-chart': FileBarChart,
  'settings': Settings,
  'wallet': Wallet,
}

function getIcon(name: string): Component {
  return iconMap[name] || LayoutDashboard
}

const openGroups = reactive<Record<string, boolean>>({})

function isGroupActive(item: MenuItem): boolean {
  if (!item.children) return false
  return item.children.some((child) => child.to && route.path.startsWith(child.to))
}

watchEffect(() => {
  for (const item of menu) {
    if (item.children && isGroupActive(item)) {
      openGroups[item.label] = true
    }
  }
})

const userInitials = computed(() => {
  const name = authStore.user?.name || 'U'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})
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

  <!-- Sidebar -->
  <aside
    class="fixed inset-y-0 left-0 z-50 flex w-58 flex-col border-r border-gray-200 bg-white transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0"
    :class="sidebar.isOpen.value ? 'translate-x-0' : '-translate-x-full'"
  >
    <!-- Header: Logo + Notification + Toggle -->
    <div class="border-b border-gray-200 px-4 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
            A
          </div>
          <span class="text-lg font-semibold text-gray-900">Arafa ERP</span>
        </div>
        <div class="flex items-center gap-1">
          <!-- Notifications -->
          <PopoverRoot>
            <PopoverTrigger
              class="relative rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <Bell class="h-5 w-5" />
              <span
                v-if="unreadCount > 0"
                class="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
              >
                {{ unreadCount }}
              </span>
            </PopoverTrigger>
            <PopoverPortal>
              <PopoverContent
                class="z-[60] w-80 rounded-lg border border-gray-200 bg-white shadow-lg"
                :side-offset="8"
                align="start"
              >
                <div class="border-b border-gray-200 px-4 py-3">
                  <h3 class="text-sm font-semibold text-gray-900">Notifikasi</h3>
                </div>
                <div class="max-h-64 overflow-y-auto">
                  <div
                    v-for="notif in notifications"
                    :key="notif.id"
                    class="flex gap-3 border-b border-gray-100 px-4 py-3 last:border-0"
                    :class="{ 'bg-blue-50/50': !notif.read }"
                  >
                    <div class="flex-1">
                      <p class="text-sm font-medium text-gray-900">{{ notif.title }}</p>
                      <p class="text-xs text-gray-500">{{ notif.message }}</p>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </PopoverPortal>
          </PopoverRoot>

          <!-- Close sidebar (mobile) -->
          <button
            class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 lg:hidden"
            @click="sidebar.close()"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
      </div>

      <!-- Business Switcher -->
      <DropdownMenuRoot>
        <DropdownMenuTrigger
          class="mt-3 flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Building2 class="h-4 w-4 shrink-0" />
          <span class="flex-1 truncate text-left">{{ currentBusiness.name }}</span>
          <ChevronsUpDown class="h-3.5 w-3.5 shrink-0 text-gray-400" />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            class="z-[60] min-w-[220px] rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
            :side-offset="4"
            align="start"
          >
            <DropdownMenuItem
              v-for="biz in businesses"
              :key="biz.id"
              class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none transition-colors hover:bg-gray-100 data-[highlighted]:bg-gray-100"
              @select="currentBusiness = biz"
            >
              <Building2 class="h-4 w-4 shrink-0" />
              <span class="truncate">{{ biz.name }}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto px-3 py-4">
      <ul class="space-y-1">
        <li v-for="item in menu" :key="item.label">
          <!-- Simple link (no children) -->
          <NuxtLink
            v-if="!item.children"
            :to="item.to!"
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
            active-class="bg-primary-50 text-primary-700 hover:bg-primary-50 hover:text-primary-700"
            @click="onNavClick"
          >
            <component :is="getIcon(item.icon!)" class="h-4 w-4 shrink-0" />
            <span>{{ item.label }}</span>
          </NuxtLink>

          <!-- Collapsible group -->
          <CollapsibleRoot v-else v-model:open="openGroups[item.label]">
            <CollapsibleTrigger
              class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
              :class="{ 'bg-gray-100 text-gray-900': isGroupActive(item) }"
            >
              <component :is="getIcon(item.icon!)" class="h-4 w-4 shrink-0" />
              <span class="flex-1 text-left">{{ item.label }}</span>
              <ChevronDown
                class="h-4 w-4 shrink-0 transition-transform duration-200"
                :class="{ 'rotate-180': openGroups[item.label] }"
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul class="mt-1 space-y-1 pl-8">
                <li v-for="child in item.children" :key="child.label">
                  <NuxtLink
                    :to="child.to!"
                    class="flex items-center rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                    active-class="bg-primary-50 text-primary-700 hover:bg-primary-50 hover:text-primary-700"
                    @click="onNavClick"
                  >
                    {{ child.label }}
                  </NuxtLink>
                </li>
              </ul>
            </CollapsibleContent>
          </CollapsibleRoot>
        </li>
      </ul>
    </nav>

    <!-- User Profile (bottom) -->
    <div class="border-t border-gray-200 px-4 py-3">
      <div class="flex items-center gap-2.5">
        <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
          {{ userInitials }}
        </div>
        <div class="flex-1 overflow-hidden">
          <p class="truncate text-xs font-medium text-gray-900">{{ authStore.user?.name || 'User' }}</p>
          <p class="truncate text-[11px] leading-tight text-gray-500">{{ authStore.user?.email || '' }}</p>
        </div>
        <button
          class="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
          title="Logout"
          @click="authStore.logout()"
        >
          <LogOut class="h-4 w-4" />
        </button>
      </div>
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
