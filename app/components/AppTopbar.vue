<script setup lang="ts">
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'
import { Menu, Bell } from 'lucide-vue-next'
import type { Notification } from '~/types'

const sidebar = useSidebar()

// Dummy notifications (shared with sidebar — in real app, use a store)
const notifications: Notification[] = [
  { id: 1, title: 'Order Baru', message: 'Order #1234 masuk dari marketplace', read: false, createdAt: '2026-04-13' },
  { id: 2, title: 'Stock Rendah', message: 'Stok Hijab Pashmina tinggal 5 pcs', read: false, createdAt: '2026-04-13' },
  { id: 3, title: 'Pembayaran Diterima', message: 'Pembayaran PO #567 sudah dikonfirmasi', read: true, createdAt: '2026-04-12' },
  { id: 4, title: 'Return Disetujui', message: 'Return #89 telah diproses', read: true, createdAt: '2026-04-11' },
]
const unreadCount = computed(() => notifications.filter((n) => !n.read).length)
</script>
<template>
  <!-- Mobile header only -->
  <header class="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
    <!-- Left: Hamburger + Brand -->
    <div class="flex items-center gap-3">
      <button
        class="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
        @click="sidebar.toggle()"
      >
        <Menu class="h-5 w-5" />
      </button>
      <div class="flex items-center gap-2">
        <div class="flex h-7 w-7 items-center justify-center rounded-md bg-primary-600 text-xs font-bold text-white">
          A
        </div>
        <span class="text-base font-semibold text-gray-900">Arafa ERP</span>
      </div>
    </div>

    <!-- Right: Notification -->
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
          align="end"
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
  </header>
</template>
