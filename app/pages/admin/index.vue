<script setup lang="ts">
import {
  Users, DollarSign, ShoppingCart, TrendingUp, BarChart3, Package,
  UserPlus, FileText, Settings, Eye, Bell, CheckCircle, AlertCircle
} from 'lucide-vue-next'

useHead({
  title: 'Admin Dashboard',
  meta: [
    { name: 'description', content: 'Admin dashboard untuk mengelola aplikasi' }
  ]
})
definePageMeta({
  middleware: 'admin',
})
const query = ref({
  start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
  end_date: new Date().toISOString().split('T')[0] || '',
})

// Auth store
const authStore = useAuthAdminStore()
const { user } = storeToRefs(authStore)

// Current date
const currentDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// Stats data
const stats = [
  {
    title: 'Total Users',
    value: '2,543',
    change: '+12%',
    icon: Users,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  {
    title: 'Revenue',
    value: '$45,231',
    change: '+8%',
    icon: DollarSign,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  {
    title: 'Orders',
    value: '1,234',
    change: '-2%',
    icon: ShoppingCart,
    bgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600'
  },
  {
    title: 'Growth',
    value: '23.5%',
    change: '+4%',
    icon: TrendingUp,
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600'
  }
]

// Recent activity
const recentActivity = [
  {
    id: 1,
    title: 'New user registered',
    description: 'John Doe just signed up',
    time: '5 minutes ago',
    icon: UserPlus,
    iconBg: 'bg-blue-500'
  },
  {
    id: 2,
    title: 'Order completed',
    description: 'Order #1234 has been fulfilled',
    time: '15 minutes ago',
    icon: CheckCircle,
    iconBg: 'bg-green-500'
  },
  {
    id: 3,
    title: 'System alert',
    description: 'Server backup completed successfully',
    time: '1 hour ago',
    icon: AlertCircle,
    iconBg: 'bg-yellow-500'
  },
  {
    id: 4,
    title: 'New content published',
    description: 'Blog post "Getting Started" is live',
    time: '2 hours ago',
    icon: FileText,
    iconBg: 'bg-purple-500'
  }
]

// Quick actions
const quickActions = [
  {
    title: 'Add User',
    icon: UserPlus,
    bgColor: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700'
  },
  {
    title: 'View Reports',
    icon: BarChart3,
    bgColor: 'bg-green-600',
    hoverColor: 'hover:bg-green-700'
  },
  {
    title: 'Settings',
    icon: Settings,
    bgColor: 'bg-yellow-600',
    hoverColor: 'hover:bg-yellow-700'
  },
  {
    title: 'Analytics',
    icon: Eye,
    bgColor: 'bg-purple-600',
    hoverColor: 'hover:bg-purple-700'
  }
]

// Top products
const topProducts = [
  {
    id: 1,
    name: 'Premium Plan',
    sales: 145,
    revenue: '$12,450'
  },
  {
    id: 2,
    name: 'Basic Plan',
    sales: 89,
    revenue: '$7,890'
  },
  {
    id: 3,
    name: 'Enterprise Plan',
    sales: 34,
    revenue: '$15,600'
  },
  {
    id: 4,
    name: 'Starter Plan',
    sales: 67,
    revenue: '$3,350'
  }
]

</script>
<template>
  <NuxtLayout name="admin">
    <div class="space-y-6">
      <!-- Dashboard Header -->
      <div class="flex flex-col md:flex-row items-start justify-start md:justify-between">
        <div class="mb-4 md:mb-0">
          <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
          <ClientOnly>
            <p class="text-gray-600">Welcome back, {{ user?.name || 'Admin' }}!</p>
          </ClientOnly>
        </div>
        <div>
          <DateRangeForm :date="query"/>
        </div>
      </div>

      <AdminWidgetUser />
      <AdminWidgetInvoice :query="query" />

      <!-- Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <AdminWidgetRecentInvoice/>
        <!-- Recent Activity -->
        <!-- <div class="bg-white shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
              <a href="#" class="text-sm text-blue-600 hover:text-blue-700">View all</a>
            </div>
            <div class="flow-root">
              <ul class="-mb-8">
                <li v-for="(activity, idx) in recentActivity" :key="activity.id">
                  <div class="relative pb-8" :class="{ 'pb-0': idx === recentActivity.length - 1 }">
                    <span v-if="idx !== recentActivity.length - 1" class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                    <div class="relative flex space-x-3">
                      <div>
                        <span :class="[activity.iconBg, 'h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white']">
                          <component :is="activity.icon" class="w-4 h-4 text-white" />
                        </span>
                      </div>
                      <div class="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p class="text-sm text-gray-900">{{ activity.title }}</p>
                          <p class="text-sm text-gray-500">{{ activity.description }}</p>
                        </div>
                        <div class="text-right text-sm whitespace-nowrap text-gray-500">
                          {{ activity.time }}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div> -->

        <!-- Quick Actions -->
        <div class="bg-white shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div class="grid grid-cols-2 gap-4">
              <button
                v-for="action in quickActions"
                :key="action.title"
                :class="[action.bgColor, action.hoverColor, 'text-white px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2']"
              >
                <component :is="action.icon" class="w-4 h-4" />
                <span>{{ action.title }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Chart Section -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Revenue Chart -->
        <div class="lg:col-span-2 bg-white shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Revenue Overview</h3>
            <div class="h-64 flex items-center justify-center bg-gray-50 rounded-md">
              <div class="text-center">
                <BarChart3 class="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p class="text-gray-500">Chart placeholder</p>
                <p class="text-sm text-gray-400">Integration with chart library needed</p>
              </div>
            </div>
          </div>
        </div>

        <AdminWidgetTopPlan :query="query"/>

      </div>
    </div>
  </NuxtLayout>
</template>
