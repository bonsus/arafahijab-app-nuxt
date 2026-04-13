<template>
  <NuxtLayout name="admin">
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Analytics</h1>
          <p class="text-gray-600">Monitor your application performance and user behavior</p>
        </div>
        <div class="flex items-center space-x-3">
          <select class="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
          <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
            Export Report
          </button>
        </div>
      </div>

      <!-- Key Metrics -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="metric in keyMetrics" :key="metric.title" class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div :class="[metric.bgColor, 'p-3 rounded-md']">
                  <component :is="metric.icon" :class="[metric.iconColor, 'w-6 h-6']" />
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">{{ metric.title }}</dt>
                  <dd class="flex items-baseline">
                    <div class="text-2xl font-semibold text-gray-900">{{ metric.value }}</div>
                    <div class="ml-2 flex items-baseline text-sm font-semibold">
                      <TrendingUp v-if="metric.trend === 'up'" class="w-4 h-4 text-green-500" />
                      <TrendingDown v-else class="w-4 h-4 text-red-500" />
                      <span :class="metric.trend === 'up' ? 'text-green-600' : 'text-red-600'" class="ml-1">
                        {{ metric.change }}
                      </span>
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Traffic Overview -->
        <div class="bg-white shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Traffic Overview</h3>
            <div class="h-64 flex items-center justify-center bg-gray-50 rounded-md">
              <div class="text-center">
                <BarChart3 class="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p class="text-gray-500">Traffic Chart</p>
                <p class="text-sm text-gray-400">Chart integration needed</p>
              </div>
            </div>
          </div>
        </div>

        <!-- User Engagement -->
        <div class="bg-white shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">User Engagement</h3>
            <div class="h-64 flex items-center justify-center bg-gray-50 rounded-md">
              <div class="text-center">
                <PieChart class="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p class="text-gray-500">Engagement Chart</p>
                <p class="text-sm text-gray-400">Chart integration needed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Analytics Tables -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Top Pages -->
        <div class="bg-white shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Top Pages</h3>
            <div class="space-y-4">
              <div v-for="page in topPages" :key="page.path" class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="flex-shrink-0">
                    <FileText class="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900">{{ page.title }}</p>
                    <p class="text-xs text-gray-500">{{ page.path }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-sm font-medium text-gray-900">{{ page.views }}</p>
                  <p class="text-xs text-gray-500">views</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Traffic Sources -->
        <div class="bg-white shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Traffic Sources</h3>
            <div class="space-y-4">
              <div v-for="source in trafficSources" :key="source.name" class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="flex-shrink-0">
                    <component :is="source.icon" class="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900">{{ source.name }}</p>
                    <p class="text-xs text-gray-500">{{ source.percentage }}% of traffic</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-sm font-medium text-gray-900">{{ source.visitors }}</p>
                  <p class="text-xs text-gray-500">visitors</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Real-time Activity -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Real-time Activity</h3>
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span class="text-sm text-gray-500">Live</span>
            </div>
          </div>
          <div class="space-y-3">
            <div v-for="activity in realtimeActivity" :key="activity.id" class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div class="flex items-center space-x-3">
                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ activity.user }}</p>
                  <p class="text-xs text-gray-500">{{ activity.action }}</p>
                </div>
              </div>
              <div class="text-xs text-gray-500">
                {{ activity.time }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import {
  BarChart3, PieChart, TrendingUp, TrendingDown, Users, Eye, Clock, Globe,
  FileText, Search, Share2, Mail
} from 'lucide-vue-next'

// Middleware protection dan layout
definePageMeta({
  middleware: 'admin',
  layout: 'admin'
})

// Key metrics data
const keyMetrics = [
  {
    title: 'Page Views',
    value: '24,567',
    change: '+12.5%',
    trend: 'up',
    icon: Eye,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  {
    title: 'Unique Visitors',
    value: '8,543',
    change: '+8.2%',
    trend: 'up',
    icon: Users,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  {
    title: 'Avg. Session',
    value: '3m 24s',
    change: '-2.1%',
    trend: 'down',
    icon: Clock,
    bgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600'
  },
  {
    title: 'Bounce Rate',
    value: '34.2%',
    change: '-5.3%',
    trend: 'up',
    icon: Globe,
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600'
  }
]

// Top pages data
const topPages = [
  {
    title: 'Dashboard',
    path: '/admin',
    views: '12,345'
  },
  {
    title: 'User Management',
    path: '/admin/users',
    views: '8,234'
  },
  {
    title: 'Analytics',
    path: '/admin/analytics',
    views: '5,678'
  },
  {
    title: 'Settings',
    path: '/admin/settings',
    views: '3,456'
  },
  {
    title: 'Reports',
    path: '/admin/reports',
    views: '2,345'
  }
]

// Traffic sources data
const trafficSources = [
  {
    name: 'Direct Traffic',
    percentage: 45,
    visitors: '3,842',
    icon: Globe
  },
  {
    name: 'Search Engines',
    percentage: 30,
    visitors: '2,561',
    icon: Search
  },
  {
    name: 'Social Media',
    percentage: 15,
    visitors: '1,281',
    icon: Share2
  },
  {
    name: 'Email Campaigns',
    percentage: 10,
    visitors: '854',
    icon: Mail
  }
]

// Real-time activity data
const realtimeActivity = [
  {
    id: 1,
    user: 'John Doe',
    action: 'Viewed user management page',
    time: 'just now'
  },
  {
    id: 2,
    user: 'Jane Smith',
    action: 'Created new user account',
    time: '2 minutes ago'
  },
  {
    id: 3,
    user: 'Bob Johnson',
    action: 'Updated system settings',
    time: '5 minutes ago'
  },
  {
    id: 4,
    user: 'Alice Brown',
    action: 'Generated analytics report',
    time: '8 minutes ago'
  }
]

// Meta tags
useHead({
  title: 'Analytics - Admin',
  meta: [
    { name: 'description', content: 'Analytics dashboard for monitoring application performance' }
  ]
})
</script>
