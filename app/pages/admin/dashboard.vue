<script setup lang="ts">
import { Users, CreditCard, FileText, Wallet, ArrowRight } from 'lucide-vue-next'

definePageMeta({
  middleware: 'admin-auth',
  layout: 'admin',
})

const authStore = useAdminAuthStore()

const shortcuts = [
  { label: 'Kelola Admin', desc: 'User & role admin', to: '/admin/admins', icon: Users, color: 'bg-indigo-50 text-indigo-600' },
  { label: 'Plan & Feature', desc: 'Katalog langganan', to: '/admin/subscription/plans', icon: CreditCard, color: 'bg-emerald-50 text-emerald-600' },
  { label: 'Subscription', desc: 'Langganan tenant', to: '/admin/subscription/subscriptions', icon: Wallet, color: 'bg-amber-50 text-amber-600' },
  { label: 'Invoice', desc: 'Tagihan & pembayaran', to: '/admin/subscription/invoices', icon: FileText, color: 'bg-rose-50 text-rose-600' },
]
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold text-gray-900">
        Selamat datang, {{ authStore.admin?.name || 'Admin' }}
      </h1>
      <p class="mt-1 text-sm text-gray-500">Panel administrasi platform Ordeo ERP.</p>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <NuxtLink
        v-for="item in shortcuts"
        :key="item.to"
        :to="item.to"
        class="group flex items-center justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-lg" :class="item.color">
            <component :is="item.icon" class="h-5 w-5" />
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-900">{{ item.label }}</p>
            <p class="text-xs text-gray-500">{{ item.desc }}</p>
          </div>
        </div>
        <ArrowRight class="h-4 w-4 text-gray-300 transition-colors group-hover:text-indigo-600" />
      </NuxtLink>
    </div>

    <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 class="text-sm font-semibold text-gray-900">Informasi Akun</h2>
      <dl class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <dt class="text-xs text-gray-500">Nama</dt>
          <dd class="mt-0.5 text-sm font-medium text-gray-900">{{ authStore.admin?.name || '-' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-gray-500">Email</dt>
          <dd class="mt-0.5 text-sm font-medium text-gray-900">{{ authStore.admin?.email || '-' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-gray-500">Role</dt>
          <dd class="mt-0.5 text-sm font-medium text-gray-900">{{ authStore.admin?.role?.name || '-' }}</dd>
        </div>
      </dl>
    </div>
  </div>
</template>
