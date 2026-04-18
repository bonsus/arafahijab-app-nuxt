<script setup lang="ts">
import { ShoppingCart, Package, Users, DollarSign } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
})

const authStore = useAuthStore()

const stats = [
  {
    label: 'Total Penjualan',
    value: 'Rp 12.450.000',
    change: '+12%',
    changeColor: 'text-green-600',
    icon: DollarSign,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  {
    label: 'Order Hari Ini',
    value: '48',
    change: '+8%',
    changeColor: 'text-green-600',
    icon: ShoppingCart,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    label: 'Produk Aktif',
    value: '1.234',
    change: '+3%',
    changeColor: 'text-green-600',
    icon: Package,
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    label: 'Customer',
    value: '856',
    change: '+5%',
    changeColor: 'text-green-600',
    icon: Users,
    bgColor: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
]
</script>
<template>
  <div>
    <!-- Welcome -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">
        Selamat datang, {{ authStore.user?.name || 'User' }}! 👋
      </h1>
      <p class="mt-1 text-gray-500">Berikut ringkasan bisnis Anda hari ini.</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-xl border border-gray-200 bg-white p-6"
      >
        <div class="flex items-center justify-between">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-lg"
            :class="stat.bgColor"
          >
            <component :is="stat.icon" class="h-5 w-5" :class="stat.iconColor" />
          </div>
          <span
            class="text-xs font-medium"
            :class="stat.changeColor"
          >
            {{ stat.change }}
          </span>
        </div>
        <p class="mt-4 text-2xl font-bold text-gray-900">{{ stat.value }}</p>
        <p class="text-sm text-gray-500">{{ stat.label }}</p>
      </div>
    </div>

    <!-- User Info Card -->
    <div class="mt-8 rounded-xl border border-gray-200 bg-white p-6">
      <h2 class="mb-4 text-lg font-semibold text-gray-900">Informasi Akun</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p class="text-sm text-gray-500">Nama</p>
          <p class="font-medium text-gray-900">{{ authStore.user?.name || '-' }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Email</p>
          <p class="font-medium text-gray-900">{{ authStore.user?.email || '-' }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Role</p>
          <p class="font-medium text-gray-900">{{ authStore.user?.role || '-' }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">ID</p>
          <p class="font-medium text-gray-900">{{ authStore.user?.id || '-' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
