<script setup lang="ts">
import {
  CollapsibleRoot,
  CollapsibleTrigger,
  CollapsibleContent,
} from 'reka-ui'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  ChevronDown,
  ShieldCheck,
  X,
} from 'lucide-vue-next'
import type { AdminMenuItem } from '~/types/admin'
import type { Component } from 'vue'

const route = useRoute()
const menu = useAdminMenu()
const sidebar = useAdminSidebar()

function onNavClick() {
  if (window.innerWidth < 1024) sidebar.close()
}

const iconMap: Record<string, Component> = {
  'layout-dashboard': LayoutDashboard,
  'users': Users,
  'credit-card': CreditCard,
  'settings': Settings,
}

function getIcon(name?: string): Component {
  return (name && iconMap[name]) || LayoutDashboard
}

const openGroups = reactive<Record<string, boolean>>({})

function isGroupActive(item: AdminMenuItem): boolean {
  if (!item.children) return false
  return item.children.some(child => child.to && route.path.startsWith(child.to))
}

function isActive(to?: string): boolean {
  if (!to) return false
  if (to === '/admin/dashboard') return route.path === to
  return route.path.startsWith(to)
}

watchEffect(() => {
  for (const item of menu) {
    if (item.children && isGroupActive(item)) openGroups[item.label] = true
  }
})
</script>

<template>
  <!-- Mobile backdrop -->
  <Transition name="fade">
    <div
      v-if="sidebar.isOpen.value"
      class="fixed inset-0 z-30 bg-black/50 lg:hidden"
      @click="sidebar.close()"
    />
  </Transition>

  <aside
    class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-slate-300 transition-transform duration-200 lg:static lg:translate-x-0"
    :class="sidebar.isOpen.value ? 'translate-x-0' : '-translate-x-full'"
  >
    <!-- Brand -->
    <div class="flex h-16 items-center justify-between border-b border-slate-800 px-4">
      <NuxtLink to="/admin/dashboard" class="flex items-center gap-2.5" @click="onNavClick">
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <ShieldCheck class="h-5 w-5" />
        </div>
        <div>
          <p class="text-sm font-semibold text-white">Admin Panel</p>
          <p class="text-[11px] text-slate-400">Ordeo ERP</p>
        </div>
      </NuxtLink>
      <button class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 lg:hidden" @click="sidebar.close()">
        <X class="h-5 w-5" />
      </button>
    </div>

    <!-- Nav -->
    <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      <template v-for="item in menu" :key="item.label">
        <!-- Single item -->
        <NuxtLink
          v-if="!item.children"
          :to="item.to!"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          :class="isActive(item.to) ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'"
          @click="onNavClick"
        >
          <component :is="getIcon(item.icon)" class="h-4.5 w-4.5 shrink-0" />
          {{ item.label }}
        </NuxtLink>

        <!-- Group -->
        <CollapsibleRoot v-else v-model:open="openGroups[item.label]">
          <CollapsibleTrigger
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            :class="isGroupActive(item) ? 'text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'"
          >
            <component :is="getIcon(item.icon)" class="h-4.5 w-4.5 shrink-0" />
            <span class="flex-1 text-left">{{ item.label }}</span>
            <ChevronDown
              class="h-4 w-4 transition-transform"
              :class="openGroups[item.label] ? 'rotate-180' : ''"
            />
          </CollapsibleTrigger>
          <CollapsibleContent class="mt-1 space-y-0.5 pl-4">
            <NuxtLink
              v-for="child in item.children"
              :key="child.to"
              :to="child.to!"
              class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors"
              :class="isActive(child.to) ? 'bg-slate-800 font-medium text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'"
              @click="onNavClick"
            >
              <span class="h-1.5 w-1.5 rounded-full" :class="isActive(child.to) ? 'bg-indigo-400' : 'bg-slate-600'" />
              {{ child.label }}
            </NuxtLink>
          </CollapsibleContent>
        </CollapsibleRoot>
      </template>
    </nav>

    <div class="border-t border-slate-800 px-4 py-3 text-[11px] text-slate-500">
      &copy; {{ new Date().getFullYear() }} Ordeo Admin
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
