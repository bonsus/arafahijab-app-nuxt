<script setup lang="ts">
// Notification dropdown component
interface Notification {
  id: string
  title: string
  message: string
  time: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
}

const notifications = ref<Notification[]>([
  {
    id: '1',
    title: 'New Order Received',
    message: 'You have received a new order #12345',
    time: '2 minutes ago',
    type: 'success',
    read: false
  },
  {
    id: '2',
    title: 'Payment Failed',
    message: 'Payment for order #12344 has failed',
    time: '5 minutes ago',
    type: 'error',
    read: false
  },
  {
    id: '3',
    title: 'System Update',
    message: 'System maintenance scheduled for tonight',
    time: '1 hour ago',
    type: 'info',
    read: true
  }
])

const unreadCount = computed(() => 
  notifications.value.filter(n => !n.read).length
)

const markAsRead = (id: string) => {
  const notification = notifications.value.find(n => n.id === id)
  if (notification) {
    notification.read = true
  }
}

const markAllAsRead = () => {
  notifications.value.forEach(n => n.read = true)
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success': return '✅'
    case 'error': return '❌'
    case 'warning': return '⚠️'
    case 'info': return 'ℹ️'
    default: return '📢'
  }
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button class="relative p-2 text-gray-400 hover:text-gray-600">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <Badge v-if="unreadCount > 0" class="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
          {{ unreadCount }}
        </Badge>
      </button>
    </DropdownMenuTrigger>
    
    <DropdownMenuContent class="w-80 max-h-96 overflow-y-auto" align="end">
      <div class="p-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">Notifications</h3>
          <Button v-if="unreadCount > 0" @click="markAllAsRead" variant="ghost" size="sm">
            Mark all read
          </Button>
        </div>
      </div>
      
      <div v-if="notifications.length === 0" class="p-4 text-center text-gray-500">
        No notifications
      </div>
      
      <div v-else class="max-h-64 overflow-y-auto">
        <div 
          v-for="notification in notifications" 
          :key="notification.id"
          @click="markAsRead(notification.id)"
          class="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          :class="{ 'bg-blue-50': !notification.read }"
        >
          <div class="flex items-start space-x-3">
            <div class="text-lg">{{ getNotificationIcon(notification.type) }}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {{ notification.title }}
                </p>
                <div v-if="!notification.read" class="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
              <p class="text-sm text-gray-600">{{ notification.message }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ notification.time }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="p-4 border-t border-gray-200">
        <Button variant="outline" class="w-full" size="sm">
          View all notifications
        </Button>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
