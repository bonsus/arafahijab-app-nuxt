<template>
  <div class="min-h-screen bg-gray-50 flex">
    <!-- Sidebar -->
    <div
      :class="[
        'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <!-- Logo/Brand -->
      <div class="flex items-center h-16 px-6 border-b border-gray-200">
        <div class="flex items-center space-x-3">
          <!-- image logo -->
          <a href="/app" class="flex items-center space-x-3">
            <img src="/dapurkas.webp" alt="Logo" class="w-auto h-8 rounded-lg" />
          </a>
          <!-- <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-sm">V</span>
          </div>
          <span class="font-semibold text-xl text-gray-900">VELZON</span> -->
        </div>
      </div>

      <!-- Navigation Menu -->
      <div class="flex-1 overflow-y-auto p-4">
        <nav class="space-y-6">
          <div v-for="section in menuItems" :key="section.title">
            <!-- Section Header -->
            <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {{ section.title }}
            </div>

            <!-- Menu Items -->
            <div class="space-y-1">
              <NuxtLink
                v-for="item in section.children"
                :key="item.title"
                :to="item.href"
                :class="[
                  'flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors',
                  item.active
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                ]"
              >
                <span>{{ item.title }}</span>
                <span
                  v-if="item.badge"
                  class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"
                >
                  {{ item.badge }}
                </span>
              </NuxtLink>
            </div>
          </div>
        </nav>
      </div>

      <!-- Sidebar Footer -->
      <div class="p-4 border-t border-gray-200">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center">
            <span class="text-white text-sm">👩‍💼</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ user.name }}</p>
            <p class="text-xs text-gray-500 truncate">{{ user.role }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 lg:ml-0">
      <!-- Top Header -->
      <header class="bg-white border-b border-gray-200 px-6 py-4 lg:px-8">
        <div class="flex items-center justify-between">
          <!-- Left side: Menu toggle + breadcrumb -->
          <div class="flex items-center space-x-4">
            <!-- Mobile menu button -->
            <button
              @click="toggleSidebar"
              class="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 lg:hidden"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <!-- Desktop sidebar toggle -->
            <button
              @click="toggleSidebar"
              class="hidden lg:block p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <!-- Breadcrumb -->
            <nav class="flex items-center space-x-2 text-sm text-gray-500">
              <NuxtLink to="/app" class="hover:text-gray-700">Dashboards</NuxtLink>
              <span class="text-gray-400">›</span>
              <span class="text-gray-900 font-medium">CRM</span>
            </nav>
          </div>

          <!-- Right side: Search + Icons + User -->
          <div class="flex items-center space-x-4">
            <!-- Search -->
            <div class="relative hidden md:block">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search..."
                class="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
            </div>

            <!-- Language Switcher -->
            <LanguageSwitcher />

            <!-- Apps Grid -->
            <button class="p-2 text-gray-400 hover:text-gray-600 hidden sm:block">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>

            <!-- Shopping Cart -->
            <button class="relative p-2 text-gray-400 hover:text-gray-600 hidden sm:block">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 2.5M7 13l2.5 2.5m6-2.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zm-6 0a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" />
              </svg>
              <span class="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                5
              </span>
            </button>

            <!-- Notifications -->
            <NotificationDropdown />

            <!-- Fullscreen -->
            <button class="p-2 text-gray-400 hover:text-gray-600 hidden sm:block">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>

            <!-- Theme Toggle -->
            <button class="p-2 text-gray-400 hover:text-gray-600 hidden sm:block">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>

            <!-- User Avatar -->
            <UserProfileDropdown />
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>

    <!-- Mobile sidebar overlay -->
    <div
      v-if="sidebarOpen && isMobile"
      @click="toggleSidebar"
      class="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
    ></div>
  </div>
</template>

<script setup lang="ts">
interface MenuItem {
  title: string
  href: string
  active?: boolean
  badge?: string | number
}

interface MenuSection {
  title: string
  children: MenuItem[]
}

// Sample user data
const user = {
  name: 'Anna Adame',
  role: 'Manager'
}

// Sidebar state management
const isMobile = ref(false)
const sidebarOpen = ref(true)

onMounted(() => {
  // Check initial screen size
  checkMobile()

  // Listen for resize events
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

function checkMobile() {
  isMobile.value = window.innerWidth < 1024
  // On mobile, sidebar should be closed by default
  if (isMobile.value) {
    sidebarOpen.value = false
  } else {
    sidebarOpen.value = true
  }
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

const menuItems: MenuSection[] = [
  {
    title: 'MENU',
    children: [
      { title: 'Dashboards', href: '/app', active: false },
      { title: 'CRM', href: '/app/crm', active: true },
      { title: 'Email', href: '/app/email', active: false },
    ]
  },
  {
    title: 'PAGES',
    children: [
      { title: 'Authentication', href: '/auth', active: false },
      { title: 'Pages', href: '/pages', active: false },
      { title: 'Landing', href: '/landing', active: false, badge: 'Hot' },
    ]
  },
  {
    title: 'COMPONENTS',
    children: [
      { title: 'Base UI', href: '/components/base', active: false },
      { title: 'Advance UI', href: '/components/advance', active: false },
      { title: 'Forms', href: '/components/forms', active: false },
      { title: 'Tables', href: '/components/tables', active: false },
      { title: 'Charts', href: '/components/charts', active: false },
      { title: 'Icons', href: '/components/icons', active: false },
      { title: 'Maps', href: '/components/maps', active: false, badge: 'New' },
    ]
  },
  {
    title: 'APPS',
    children: [
      { title: 'Calendar', href: '/apps/calendar', active: false },
      { title: 'Chat', href: '/apps/chat', active: false },
      { title: 'Mailbox', href: '/apps/mailbox', active: false },
      { title: 'File Manager', href: '/apps/filemanager', active: false },
      { title: 'To Do', href: '/apps/todo', active: false, badge: 3 },
      { title: 'Notes', href: '/apps/notes', active: false },
      { title: 'Tasks', href: '/apps/tasks', active: false },
    ]
  }
]
</script>
