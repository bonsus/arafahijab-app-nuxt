<script setup lang="ts">
import {
  Menu, Bell, ChevronDown, ChevronLeft, ChevronRight, User, Settings, LogOut,
  Home, Users, FileText, BarChart3, ShoppingCart, Package, Cog, Shield,
  UserCheck, FolderOpen, Database, Mail, Calendar, MessageSquare,
  SquareChartGantt, ShieldUser, FileArchive,
  HandHelping,
  MailOpen
} from 'lucide-vue-next'

// Auth store
const authStore = useAuthAdminStore()
const { user } = storeToRefs(authStore)

const sidebarCollapsed = useCookie('admin-sidebar-collapsed', { default: () => 'true' })
const showNotifications = ref(false)
const showProfileMenu = ref(false)
const showMobileOverlay = ref(false)
const openSubmenus = ref<string[]>(['Dashboard'])
const sidebarHover = ref(false)

// Menu items with hierarchy
const menuItems = [
  {
    name: 'Dashboard',
    to: '/admin',
    icon: Home,
  },
  {
    name: 'Invoices',
    icon: FileArchive,
    to: '/admin/invoices',
  },
  {
    name: 'Plan',
    icon: SquareChartGantt,
    to: '/admin/plans',
  },
  {
    name: 'Promotions',
    icon: HandHelping,
    to: '/admin/promotions',
  },
  {
    name: 'Users',
    icon: Users,
    to: '/admin/users',
  },
  {
    name: 'Admin',
    icon: ShieldUser,
    to: '/admin/admins',
  },
  {
    name: 'Settings',
    icon: Cog,
    path: '/admin/settings',
    children: [
      { name: 'General', to: '/admin/settings', icon: Settings },
      { name: 'Payment Gateway', to: '/admin/settings/payment-gateway', icon: Shield },
      { name: 'SMS Gateway', to: '/admin/settings/sms-gateway', icon: Mail },
      { name: 'Email', to: '/admin/settings/email', icon: MailOpen },
    ]
  },
  {
    name: 'Analytics',
    to: '/admin/analytics',
    icon: BarChart3,
  },
]

// Dummy notifications
const notifications = [
  {
    id: 1,
    title: 'New user registered',
    message: 'John Doe just signed up',
    time: '5 minutes ago'
  },
  {
    id: 2,
    title: 'Server maintenance',
    message: 'Scheduled maintenance tonight',
    time: '1 hour ago'
  },
  {
    id: 3,
    title: 'New order received',
    message: 'Order #1234 has been placed',
    time: '2 hours ago'
  }
]

const toggleSidebar = (index: any) => {
  if(sidebarCollapsed.value == 'show') {
    sidebarCollapsed.value = 'hide'
  } else {
    sidebarCollapsed.value = 'show'
  }
  if(sidebarCollapsed.value == 'show') {
    showMobileOverlay.value = true
  }
}
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as Element
    if (!target.closest('.relative')) {
      closeDropdowns()
    }
  })
  if (window.innerWidth < 768){
    document.getElementById('sidebar-menu')?.addEventListener('click', (e) => {
      const target = e.target as Element
      if(target.id === 'sidebar-menu-link') {
        closeMobile()
      }
    })
  }
})

const toggleSubmenu = (menuName: string) => {
  const index = openSubmenus.value.indexOf(menuName)
  if (index > -1) {
    openSubmenus.value.splice(index, 1)
  } else {
    openSubmenus.value.push(menuName)
  }
}

const isActiveRoute = (to: string) => {
  const route = useRoute()
  return route.path === to
}

const handleLogout = async () => {
  try {
    await authStore.logout()
    await navigateTo('/admin/login')
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

const closeMobile = () => {
  showMobileOverlay.value = false
  sidebarCollapsed.value = 'hide'
  console.log('closeMobile called')
}

// Close dropdowns when clicking outside
const closeDropdowns = () => {
  showNotifications.value = false
  showProfileMenu.value = false
}

// Close dropdowns on route change
watch(() => useRoute().path, () => {
  closeDropdowns()
})

const onHoverIn = () => {
  // if (sidebarCollapsed.value === 'hide') {
    sidebarHover.value = true
  // }
}

const onHoverOut = () => {
  // if (sidebarCollapsed.value === 'show') {
    sidebarHover.value = false
  // }
}

</script>
<template>
  <!-- Main admin layout -->
  <div class="min-h-screen bg-gray-50">
    <!-- Navigation Header -->
    <nav class="bg-white shadow-sm border-b border-gray-200 fixed w-full top-0 z-50">
      <div class="flex items-center justify-between px-4 h-14">
        <!-- Left side - Toggle + Brand -->
        <div class="flex items-center space-x-4">
          <button
            @click="toggleSidebar"
            class="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Menu class="w-6 h-6 text-gray-600" />
          </button>
          <div class="flex items-center space-x-2" @click="navigateTo('/admin')">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center">
              <!-- <span class="text-white font-bold text-sm">HW</span> -->
              <img src="/dapurkasicon.webp" alt="Logo" class="w-auto h-8 rounded-lg" /> 
            </div>
            <h1 class="text-xl font-semibold text-gray-900">Admin</h1>
          </div>
        </div>

        <!-- Right side - Notifications + Profile -->
        <div class="flex items-center space-x-4">
          <!-- Notifications -->
          <div class="relative">
            <button
              @click="showNotifications = !showNotifications"
              class="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 relative"
            >
              <Bell class="w-6 h-6 text-gray-600" />
              <!-- Notification badge -->
              <span class="absolute top-2 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                3
              </span>
            </button>

            <!-- Notifications Dropdown -->
            <div v-if="showNotifications" class="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-50 border">
              <div class="px-4 py-2 border-b border-gray-200">
                <h3 class="text-sm font-medium text-gray-900">Notifications</h3>
              </div>
              <div class="max-h-64 overflow-y-auto">
                <div v-for="notification in notifications" :key="notification.id" class="px-4 py-3 hover:bg-gray-50 border-b border-gray-100">
                  <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0">
                      <div class="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900">{{ notification.title }}</p>
                      <p class="text-sm text-gray-500">{{ notification.message }}</p>
                      <p class="text-xs text-gray-400 mt-1">{{ notification.time }}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="px-4 py-2 border-t border-gray-200">
                <a href="#" class="text-sm text-blue-600 hover:text-blue-700">View all notifications</a>
              </div>
            </div>
          </div>

          <!-- Profile Menu -->
          <div class="relative">
            <button
              @click="showProfileMenu = !showProfileMenu"
              class="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span class="text-white text-sm font-medium capitalize">
                  <ClientOnly fallback="A">
                    {{ user?.name?.charAt(0) || 'A' }}
                  </ClientOnly>
                </span>
              </div>
              <ChevronDown class="w-4 h-4 text-gray-600" />
            </button>

            <!-- Profile Dropdown -->
            <div v-if="showProfileMenu" class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
              <div class="px-4 py-2 border-b border-gray-200">
                <p class="text-sm font-medium text-gray-900">{{ user?.name || 'Admin User' }}</p>
                <p class="text-xs text-gray-500">{{ user?.email || 'admin@example.com' }}</p>
              </div>
              <RouterLink to="/admin/profile" class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                <User class="w-4 h-4 mr-2" />
                Profile
              </RouterLink>
              <RouterLink to="/admin/profile" class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                <Settings class="w-4 h-4 mr-2" />
                Settings
              </RouterLink>
              <button
                @click="handleLogout"
                class="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut class="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
    <!-- Sidebar -->
    <aside
      :class="[
        'fixed left-0 top-14 h-[calc(100vh-4rem)] bg-white shadow-sm border-r border-gray-200 transition-all duration-300 z-40',
        sidebarCollapsed == 'show' || sidebarHover ? 'w-64' : 'w-0 md:w-16'
      ]"
    >
      <div class="flex flex-col h-full" @mouseenter="onHoverIn" @mouseleave="onHoverOut">
        <!-- Sidebar Menu -->
        <div class="flex-1 overflow-y-auto py-4">
          <nav class="space-y-1 px-3" id="sidebar-menu">
            <div v-for="item in menuItems" :key="item.name">
              <!-- Menu Item without submenu -->
              <template v-if="!item.children">
                <NuxtLink
                  id="sidebar-menu-link"
                  :to="item.to"
                  :class="[
                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActiveRoute(item.to)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  ]"
                >
                  <component :is="item.icon" id="sidebar-menu-link" :class="['flex-shrink-0 w-5 h-5', sidebarCollapsed=='show' || sidebarHover ? 'mr-3' : 'mx-auto']" />
                  <span v-if="sidebarCollapsed=='show' || sidebarHover" id="sidebar-menu-link">{{ item.name }}</span>
                </NuxtLink>
              </template>

              <!-- Menu Item with submenu -->
              <template v-else>
                <button
                  @click="toggleSubmenu(item.name)"
                  :class="[
                    'flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  ]"
                >
                  <component :is="item.icon" :class="['flex-shrink-0 w-5 h-5', sidebarCollapsed=='show' || sidebarHover ? 'mr-3' : 'mx-auto']" />
                  <template v-if="sidebarCollapsed=='show' || sidebarHover">
                    <span class="flex-1 text-left">{{ item.name }}</span>
                    <ChevronDown
                      :class="[
                        'w-4 h-4 transition-transform',
                        openSubmenus.includes(item.name) || $route.path.includes(item.path) ? 'rotate-180' : ''
                      ]"
                    />
                  </template>
                </button>

                <!-- Submenu -->
                <div
                  v-if="(openSubmenus.includes(item.name) || $route.path.includes(item.path)) && (sidebarCollapsed=='show' || sidebarHover)"
                  class="ml-8 mt-1 space-y-1"
                >
                  <NuxtLink
                    v-for="child in item.children"
                    id="sidebar-menu-link"
                    :key="child.name"
                    :to="child.to"
                    :class="[
                      'flex items-center px-3 py-2 text-sm rounded-md transition-colors',
                      isActiveRoute(child.to)
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    ]"
                  >
                    <component :is="child.icon" class="w-4 h-4 mr-2" id="sidebar-menu-link"/>
                    {{ child.name }}
                  </NuxtLink>
                </div>
              </template>
            </div>
          </nav>
        </div>

        <!-- Sidebar Footer -->
        <!-- <div class="p-4 border-t border-gray-200">
          <div v-if="!sidebarCollapsed" class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span class="text-white text-sm font-medium">
                {{ user?.name?.charAt(0) || 'A' }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ user?.name || 'Admin' }}</p>
              <p class="text-xs text-gray-500 truncate">{{ user?.role?.name || 'Administrator' }}</p>
            </div>
          </div>
          <div v-else class="flex justify-center">
            <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span class="text-white text-sm font-medium">
                {{ user?.name?.charAt(0) || 'A' }}
              </span>
            </div>
          </div>
        </div> -->
      </div>
    </aside>

    <!-- Main Content -->
    <main
      :class="[
        'transition-all duration-300 pt-16',
        sidebarCollapsed == 'show' ? 'ml-0 md:ml-64' : 'ml-0 md:ml-16'
      ]"
    >
      <div class="p-3 md:p-6">
        <slot />
      </div>
    </main>

    <!-- Overlay for mobile -->
    <div
      v-if="showMobileOverlay"
      class="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
      @click="closeMobile"
    ></div>
  </div>
</template>
