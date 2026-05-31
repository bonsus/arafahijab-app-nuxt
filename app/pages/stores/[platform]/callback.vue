<script setup lang="ts">
import { CheckCircle2, XCircle, Loader2 } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const api = useApi()

const platform = computed(() => route.params.platform as string)
const code = computed(() => route.query.code as string | undefined)

type Status = 'loading' | 'success' | 'error'
const status = ref<Status>('loading')
const errorMessage = ref('')

const platformLabels: Record<string, string> = {
  tiktok: 'TikTok Shop',
  shopee: 'Shopee',
  lazada: 'Lazada',
}

async function authorize() {
  if (!code.value) {
    status.value = 'error'
    errorMessage.value = 'Kode otorisasi tidak ditemukan. Silakan ulangi proses dari awal.'
    return
  }
  try {
    await api.post(`/stores/${platform.value}/authorize`, { code: code.value })
    status.value = 'success'
    setTimeout(() => navigateTo('/setting/store'), 2500)
  }
  catch (err: any) {
    status.value = 'error'
    errorMessage.value = err.message || 'Gagal menghubungkan toko. Silakan coba lagi.'
  }
}

onMounted(() => authorize())
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <div class="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
      <!-- Loading -->
      <template v-if="status === 'loading'">
        <Loader2 class="mx-auto h-12 w-12 animate-spin text-primary-500" />
        <h2 class="mt-4 text-base font-semibold text-gray-900">Menghubungkan toko...</h2>
        <p class="mt-1 text-sm text-gray-500">
          Sedang memproses otorisasi {{ platformLabels[platform] || platform }}, harap tunggu.
        </p>
      </template>

      <!-- Success -->
      <template v-else-if="status === 'success'">
        <CheckCircle2 class="mx-auto h-12 w-12 text-green-500" />
        <h2 class="mt-4 text-base font-semibold text-gray-900">Toko berhasil dihubungkan!</h2>
        <p class="mt-1 text-sm text-gray-500">
          {{ platformLabels[platform] || platform }} berhasil terhubung. Mengalihkan ke halaman toko...
        </p>
      </template>

      <!-- Error -->
      <template v-else>
        <XCircle class="mx-auto h-12 w-12 text-red-500" />
        <h2 class="mt-4 text-base font-semibold text-gray-900">Otorisasi gagal</h2>
        <p class="mt-1 text-sm text-gray-500">{{ errorMessage }}</p>
        <NuxtLink
          to="/setting/store"
          class="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Kembali ke Pengaturan Toko
        </NuxtLink>
      </template>
    </div>
  </div>
</template>
