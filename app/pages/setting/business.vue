<script setup lang="ts">
import { Pencil, Image as ImageIcon, Building2 } from 'lucide-vue-next'
import type { BusinessProfile } from '~/types'

definePageMeta({
  middleware: 'auth',
})

const api = useApi()

const business = ref<BusinessProfile | null>(null)
const loading = ref(true)

const showProfileModal = ref(false)
const showLogoModal = ref(false)
const logoVariant = ref<'logo' | 'label' | 'document'>('logo')

function openLogoModal(variant: 'logo' | 'label' | 'document') {
  logoVariant.value = variant
  showLogoModal.value = true
}

const typeLabels: Record<string, string> = {
  personal: 'Personal',
  company: 'Perusahaan',
}

const currencyLabels: Record<string, string> = {
  IDR: 'IDR - Indonesian Rupiah',
  USD: 'USD - US Dollar',
  EUR: 'EUR - Euro',
  SGD: 'SGD - Singapore Dollar',
  MYR: 'MYR - Malaysian Ringgit',
}

const languageLabels: Record<string, string> = {
  id: 'Bahasa Indonesia',
  en: 'English',
}

const timezoneLabels: Record<string, string> = {
  '+7': '(UTC+7) WIB',
  '+8': '(UTC+8) WITA',
  '+9': '(UTC+9) WIT',
}

const fullAddress = computed(() => {
  if (!business.value) return ''
  const b = business.value
  return [b.address, b.district, b.city, b.province, b.zipcode, b.country]
    .filter(Boolean)
    .join(', ')
})

async function fetchBusiness() {
  loading.value = true
  try {
    const res = await api.get<{ data: BusinessProfile }>('/businesses/me')
    business.value = res.data
  }
  catch {
    business.value = null
  }
  finally {
    loading.value = false
  }
}

function onProfileSaved() {
  fetchBusiness()
}

function onLogoSaved() {
  fetchBusiness()
}

onMounted(fetchBusiness)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Pengaturan Bisnis</h1>
      <button
        v-if="business"
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        @click="showProfileModal = true"
      >
        <Pencil class="h-4 w-4" />
        Edit Bisnis
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div class="animate-pulse space-y-4">
        <div class="flex items-center gap-4">
          <div class="h-20 w-20 rounded-xl bg-gray-200" />
          <div class="space-y-2">
            <div class="h-5 w-40 rounded bg-gray-200" />
            <div class="h-4 w-24 rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </div>

    <!-- Not found -->
    <div v-else-if="!business" class="rounded-xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-200">
      <Building2 class="mx-auto h-10 w-10 text-gray-300" />
      <p class="mt-3 text-sm text-gray-500">Data bisnis tidak ditemukan.</p>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Logo + name card -->
      <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div class="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div class="group relative">
            <div class="h-24 w-24 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <img
                v-if="business.logo"
                :src="business.logo"
                alt="Logo"
                class="h-full w-full object-contain"
              />
              <div v-else class="flex h-full w-full items-center justify-center text-gray-300">
                <ImageIcon class="h-8 w-8" />
              </div>
            </div>
            <button
              type="button"
              class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
              @click="openLogoModal('logo')"
            >
              Ganti Logo
            </button>
          </div>

          <div class="min-w-0 flex-1">
            <h2 class="text-xl font-bold text-gray-900">{{ business.name || '-' }}</h2>
            <p class="mt-1 text-sm text-gray-500">{{ business.description || 'Tidak ada deskripsi' }}</p>
            <span class="mt-2 inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 ring-1 ring-primary-200">
              {{ typeLabels[business.type] || business.type || '-' }}
            </span>
          </div>

          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            @click="openLogoModal('logo')"
          >
            <ImageIcon class="h-4 w-4" />
            Ubah Logo
          </button>
        </div>
      </div>

      <!-- Print logos -->
      <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h3 class="mb-1 text-lg font-semibold text-gray-900">Logo Cetak</h3>
        <p class="mb-5 text-sm text-gray-500">Logo yang digunakan saat mencetak label pengiriman dan dokumen.</p>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <!-- Logo Label -->
          <div class="flex items-center gap-4 rounded-lg border border-gray-200 p-4">
            <div class="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              <img
                v-if="business.logo_label"
                :src="business.logo_label"
                alt="Logo Label"
                class="h-full w-full object-contain"
              />
              <div v-else class="flex h-full w-full items-center justify-center text-gray-300">
                <ImageIcon class="h-7 w-7" />
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-gray-900">Logo Label</p>
              <p class="mt-0.5 text-xs text-gray-500">Dipakai pada cetak label pengiriman.</p>
              <button
                type="button"
                class="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                @click="openLogoModal('label')"
              >
                <ImageIcon class="h-3.5 w-3.5" />
                Ubah
              </button>
            </div>
          </div>

          <!-- Logo Document -->
          <div class="flex items-center gap-4 rounded-lg border border-gray-200 p-4">
            <div class="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              <img
                v-if="business.logo_document"
                :src="business.logo_document"
                alt="Logo Dokumen"
                class="h-full w-full object-contain"
              />
              <div v-else class="flex h-full w-full items-center justify-center text-gray-300">
                <ImageIcon class="h-7 w-7" />
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-gray-900">Logo Dokumen</p>
              <p class="mt-0.5 text-xs text-gray-500">Dipakai pada cetak dokumen seperti invoice.</p>
              <button
                type="button"
                class="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                @click="openLogoModal('document')"
              >
                <ImageIcon class="h-3.5 w-3.5" />
                Ubah
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Details -->
      <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h3 class="mb-5 text-lg font-semibold text-gray-900">Informasi Bisnis</h3>
        <dl class="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-gray-400">Email</dt>
            <dd class="mt-1 text-sm text-gray-900">{{ business.email || '-' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-gray-400">Telepon</dt>
            <dd class="mt-1 text-sm text-gray-900">{{ business.phone || '-' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-gray-400">Mata Uang</dt>
            <dd class="mt-1 text-sm text-gray-900">{{ currencyLabels[business.currency] || business.currency || '-' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-gray-400">Bahasa</dt>
            <dd class="mt-1 text-sm text-gray-900">{{ languageLabels[business.language] || business.language || '-' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-gray-400">Zona Waktu</dt>
            <dd class="mt-1 text-sm text-gray-900">{{ timezoneLabels[business.timezone] || business.timezone || '-' }}</dd>
          </div> 
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-gray-400">Alamat</dt>
            <dd class="mt-1 text-sm text-gray-900">{{ fullAddress || '-' }}</dd>
          </div>
        </dl>
      </div>
    </template>

    <!-- Modals -->
    <AppBusinessProfileModal
      :business="showProfileModal ? business : null"
      @close="showProfileModal = false"
      @success="onProfileSaved"
    />
    <AppBusinessLogoModal
      :business="showLogoModal ? business : null"
      :variant="logoVariant"
      @close="showLogoModal = false"
      @success="onLogoSaved"
    />
  </div>
</template>
