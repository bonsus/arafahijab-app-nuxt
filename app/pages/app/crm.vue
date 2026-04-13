<script setup lang="ts">
// CRM Dashboard Page
useHead({
  title: 'CRM Dashboard'
})

definePageMeta({
  layout: 'user'
})

// Dashboard stats data
const stats = [
  {
    title: 'CAMPAIGN SENT',
    value: '197',
    icon: '📈',
    trend: 'up',
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600'
  },
  {
    title: 'ANNUAL PROFIT',
    value: '$489 K',
    icon: '💰',
    trend: 'up',
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600'
  },
  {
    title: 'LEAD CONVERSATION',
    value: '33 %',
    icon: '📊',
    trend: 'down',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600'
  },
  {
    title: 'DAILY AVERAGE INCOME',
    value: '$1,597',
    icon: '🏆',
    trend: 'up',
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600'
  },
  {
    title: 'ANNUAL DEALS',
    value: '2,659',
    icon: '💎',
    trend: 'down',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600'
  }
]

// Chart data for balance overview
const balanceData = {
  revenue: '$584k',
  expenses: '$497k',
  profitRatio: '3.6%'
}

// Sort options
const sortOptions = [
  { label: 'Nov 2021', value: 'nov2021' },
  { label: 'Dec 2021', value: 'dec2021' },
  { label: 'Jan 2022', value: 'jan2022' }
]

const dealTypeSort = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Daily', value: 'daily' }
]

const balanceSort = [
  { label: 'Current Year', value: 'current' },
  { label: 'Last Year', value: 'last' },
  { label: 'Last 6 Months', value: '6months' }
]
</script>

<template>
  <NuxtLayout name="user">
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-gray-900">CRM</h1>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card v-for="stat in stats" :key="stat.title" class="relative overflow-hidden">
          <CardContent class="p-6">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-500 uppercase tracking-wide">{{ stat.title }}</p>
                <p class="text-2xl font-bold text-gray-900 mt-2">{{ stat.value }}</p>
              </div>
              <div :class="[stat.bgColor, 'p-3 rounded-lg']">
                <div :class="[stat.iconColor, 'text-xl']">
                  {{ stat.icon }}
                </div>
              </div>
            </div>
            <!-- Trend indicator -->
            <div class="absolute top-3 right-3">
              <div v-if="stat.trend === 'up'" class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <div v-else class="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Sales Forecast -->
        <Card class="lg:col-span-1">
          <CardHeader class="flex flex-row items-center justify-between">
            <CardTitle class="text-lg font-semibold">Sales Forecast</CardTitle>
            <Select>
              <SelectTrigger class="w-32 text-sm">
                <SelectValue placeholder="Nov 2021" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in sortOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <!-- Placeholder for bar chart -->
            <div class="h-64 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
              <div class="space-y-4 w-full px-4">
                <!-- Simulated bar chart -->
                <div class="flex items-end space-x-2 h-32">
                  <div class="bg-blue-400 w-8 h-24 rounded-t"></div>
                  <div class="bg-blue-300 w-8 h-16 rounded-t"></div>
                  <div class="bg-blue-500 w-8 h-20 rounded-t"></div>
                </div>
                <div class="text-center text-sm text-gray-500">Total Forecasted Value</div>
              </div>
            </div>

            <!-- Legend -->
            <div class="flex items-center justify-center space-x-4 text-sm">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-blue-500 rounded"></div>
                <span class="text-gray-600">Goal</span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-blue-300 rounded"></div>
                <span class="text-gray-600">Pending Forecast</span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-blue-200 rounded"></div>
                <span class="text-gray-600">Revenue</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Deal Type -->
        <Card class="lg:col-span-1">
          <CardHeader class="flex flex-row items-center justify-between">
            <CardTitle class="text-lg font-semibold">Deal Type</CardTitle>
            <Select>
              <SelectTrigger class="w-32 text-sm">
                <SelectValue placeholder="Monthly" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in dealTypeSort" :key="option.value" :value="option.value">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <!-- Placeholder for pie/donut chart -->
            <div class="h-64 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
              <div class="relative">
                <!-- Simulated donut chart -->
                <div class="w-32 h-32 rounded-full border-8 border-blue-200 border-t-blue-500 border-r-blue-400"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="text-center">
                    <div class="text-xs text-gray-500">2021</div>
                    <div class="text-xs text-gray-500">100</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Legend -->
            <div class="flex items-center justify-center space-x-4 text-sm">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-blue-200 rounded"></div>
                <span class="text-gray-600">Pending</span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-gray-300 rounded"></div>
                <span class="text-gray-600">Loss</span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-blue-500 rounded"></div>
                <span class="text-gray-600">Won</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Balance Overview -->
        <Card class="lg:col-span-1">
          <CardHeader class="flex flex-row items-center justify-between">
            <CardTitle class="text-lg font-semibold">Balance Overview</CardTitle>
            <Select>
              <SelectTrigger class="w-36 text-sm">
                <SelectValue placeholder="Current Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in balanceSort" :key="option.value" :value="option.value">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <!-- Balance Stats -->
            <div class="grid grid-cols-3 gap-4 mb-6">
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-600">{{ balanceData.revenue }}</div>
                <div class="text-xs text-gray-500">Revenue</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-gray-600">{{ balanceData.expenses }}</div>
                <div class="text-xs text-gray-500">Expenses</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-green-600">{{ balanceData.profitRatio }}</div>
                <div class="text-xs text-gray-500">Profit Ratio</div>
              </div>
            </div>

            <!-- Placeholder for line chart -->
            <div class="h-32 bg-gray-50 rounded-lg flex items-end justify-center p-4">
              <!-- Simulated line chart -->
              <svg class="w-full h-full" viewBox="0 0 300 80">
                <polyline
                  fill="none"
                  stroke="#3B82F6"
                  stroke-width="2"
                  points="0,60 50,45 100,50 150,30 200,25 250,15 300,10"
                />
                <polyline
                  fill="none"
                  stroke="#06B6D4"
                  stroke-width="2"
                  points="0,70 50,65 100,60 150,45 200,40 250,35 300,30"
                />
              </svg>
            </div>

            <!-- Legend -->
            <div class="flex items-center justify-center space-x-4 text-sm mt-4">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span class="text-gray-600">Revenue</span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-cyan-500 rounded-full"></div>
                <span class="text-gray-600">Expenses</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </NuxtLayout>
</template>
