<script setup lang="ts">
// User profile dropdown component
const user = ref({
  name: 'Edward Diana',
  role: 'Founder',
  avatar: '👩‍💼',
  email: 'edward@company.com'
})

const menuItems = [
  { label: 'My Profile', icon: '👤', href: '/profile' },
  { label: 'Account Settings', icon: '⚙️', href: '/settings' },
  { label: 'Billing', icon: '💳', href: '/billing' },
  { label: 'Support', icon: '🎧', href: '/support' },
  { separator: true },
  { label: 'Sign out', icon: '🚪', action: 'logout' }
]

const handleAction = (action: string) => {
  if (action === 'logout') {
    // Handle logout
    console.log('Logging out...')
    navigateTo('/login')
  }
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button class="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <div class="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center">
          <span class="text-white text-sm">{{ user.avatar }}</span>
        </div>
        <div class="hidden sm:block text-left">
          <p class="text-sm font-medium text-gray-900">{{ user.name }}</p>
          <p class="text-xs text-gray-500">{{ user.role }}</p>
        </div>
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </DropdownMenuTrigger>
    
    <DropdownMenuContent class="w-56" align="end">
      <div class="p-3 border-b border-gray-200">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center">
            <span class="text-white">{{ user.avatar }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ user.name }}</p>
            <p class="text-xs text-gray-500 truncate">{{ user.email }}</p>
          </div>
        </div>
      </div>
      
      <div class="py-1">
        <template v-for="(item, index) in menuItems" :key="index">
          <hr v-if="item.separator" class="my-1 border-gray-200" />
          <DropdownMenuItem 
            v-else
            @click="item.action ? handleAction(item.action) : navigateTo(item.href)"
            class="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            <span class="mr-3">{{ item.icon }}</span>
            {{ item.label }}
          </DropdownMenuItem>
        </template>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
