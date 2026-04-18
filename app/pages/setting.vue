<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const route = useRoute()

const settingMenus = [
  { label: 'Umum', to: '/setting/general' },
  { label: 'Staff', to: '/setting/staff' },
  { label: 'Gudang', to: '/setting/warehouse' },
  { label: 'Kategori Pelanggan', to: '/setting/customer-category' },
  { label: 'Integrasi', to: '/setting/integration' },
  { label: 'Kurir', to: '/setting/courier' },
  { label: 'Dompet', to: '/setting/wallets' },
  { label: 'Metode Pembayaran', to: '/setting/payment-method' },
  { label: 'Rekening Bank', to: '/setting/bank' },
  { label: 'Nomor Transaksi', to: '/setting/transaction-number' },
]
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900">Pengaturan</h1>

    <div class="mt-6 flex flex-col gap-8 lg:flex-row">
      <!-- Left nav -->
      <nav class="w-full shrink-0 lg:w-48">
        <ul class="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-x-visible lg:pb-0">
          <li v-for="item in settingMenus" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              :class="route.path === item.to ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
            >
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <!-- Content -->
      <div class="min-w-0 flex-1">
        <NuxtPage />
      </div>
    </div>
  </div>
</template>
