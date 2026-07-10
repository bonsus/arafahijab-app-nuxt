<script setup lang="ts">
import { Image as ImageIcon, X, Store } from 'lucide-vue-next'

definePageMeta({ layout: 'website', middleware: 'auth' })

interface WebSettings {
  site_name: string
  logo: string
  favicon: string
  description: string
  meta_title: string
  meta_description: string
  meta_keywords: string
  theme: string
  schema: Record<string, any> | null
  social: Record<string, any> | null
}

const api = useApi()
const toast = useToast()
const { selectedStoreId, fetchStores } = useWebsiteStore()

const loading = ref(false)
const saving = ref(false)
const showLogoPicker = ref(false)
const showFaviconPicker = ref(false)

const form = reactive({
  site_name: '',
  logo: '',
  favicon: '',
  description: '',
  meta_title: '',
  meta_description: '',
  meta_keywords: '',
  theme: 'theme1',
  primary_color: '#0aa77f',
  layout: 'boxed',
  instagram: '',
  facebook: '',
  tiktok: '',
})

const themes = [
  { value: 'theme1', label: 'Theme 1' },
  { value: 'theme2', label: 'Theme 2' },
  { value: 'theme3', label: 'Theme 3' },
]

function resetForm() {
  form.site_name = ''
  form.logo = ''
  form.favicon = ''
  form.description = ''
  form.meta_title = ''
  form.meta_description = ''
  form.meta_keywords = ''
  form.theme = 'theme1'
  form.primary_color = '#0aa77f'
  form.layout = 'boxed'
  form.instagram = ''
  form.facebook = ''
  form.tiktok = ''
}

async function fetchSettings() {
  if (!selectedStoreId.value) return
  loading.value = true
  try {
    const res = await api.get<{ data: WebSettings }>('/website/settings', { store_id: selectedStoreId.value })
    const d = res.data
    resetForm()
    if (d) {
      form.site_name = d.site_name || ''
      form.logo = d.logo || ''
      form.favicon = d.favicon || ''
      form.description = d.description || ''
      form.meta_title = d.meta_title || ''
      form.meta_description = d.meta_description || ''
      form.meta_keywords = d.meta_keywords || ''
      form.theme = d.theme || 'theme1'
      form.primary_color = d.schema?.primary_color || '#0aa77f'
      form.layout = d.schema?.layout || 'boxed'
      form.instagram = d.social?.instagram || ''
      form.facebook = d.social?.facebook || ''
      form.tiktok = d.social?.tiktok || ''
    }
  }
  catch {
    resetForm()
  }
  finally {
    loading.value = false
  }
}

function onLogoSelect(medias: any[]) {
  if (medias.length) {
    const m = medias[0]
    form.logo = m.files?.find((f: any) => f.size === 'original')?.file_url || m.files?.[0]?.file_url || ''
  }
  showLogoPicker.value = false
}

function onFaviconSelect(medias: any[]) {
  if (medias.length) {
    const m = medias[0]
    form.favicon = m.files?.find((f: any) => f.size === 'original')?.file_url || m.files?.[0]?.file_url || ''
  }
  showFaviconPicker.value = false
}

async function handleSave() {
  if (!selectedStoreId.value) {
    toast.error('Pilih store web terlebih dahulu')
    return
  }
  saving.value = true
  try {
    await api.put('/website/settings', {
      store_id: selectedStoreId.value,
      site_name: form.site_name.trim(),
      logo: form.logo,
      favicon: form.favicon,
      description: form.description.trim(),
      meta_title: form.meta_title.trim(),
      meta_description: form.meta_description.trim(),
      meta_keywords: form.meta_keywords.trim(),
      theme: form.theme,
      schema: { primary_color: form.primary_color, layout: form.layout },
      social: { instagram: form.instagram.trim(), facebook: form.facebook.trim(), tiktok: form.tiktok.trim() },
    })
    toast.success('Pengaturan website berhasil disimpan')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan pengaturan')
  }
  finally {
    saving.value = false
  }
}

onMounted(async () => {
  await fetchStores()
  await fetchSettings()
})

watch(selectedStoreId, () => fetchSettings())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Pengaturan Umum</h1>
        <p class="mt-1 text-sm text-gray-500">Identitas, SEO, tema, dan sosial media website.</p>
      </div>
      <button
        v-if="selectedStoreId"
        type="button"
        :disabled="saving"
        class="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleSave"
      >
        {{ saving ? 'Menyimpan...' : 'Simpan' }}
      </button>
    </div>

    <!-- No store selected -->
    <div v-if="!selectedStoreId" class="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
      <Store class="mx-auto h-12 w-12 text-gray-300" />
      <h3 class="mt-3 text-sm font-semibold text-gray-900">Belum ada store web dipilih</h3>
      <p class="mt-1 text-sm text-gray-500">Pilih store web pada menu di sebelah kiri untuk mulai mengelola website.</p>
    </div>

    <template v-else>
      <!-- Identity -->
      <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 class="text-sm font-semibold text-gray-900">Identitas</h2>
        <div class="mt-4 grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-[200px_1fr]">
          <!-- Logo & favicon -->
          <div class="flex gap-4">
            <div class="flex flex-col items-center gap-1.5">
              <div
                v-if="form.logo"
                class="group relative h-24 w-24 cursor-pointer overflow-hidden rounded-lg border border-gray-200"
                @click="showLogoPicker = true"
              >
                <img :src="form.logo" alt="Logo" class="h-full w-full object-cover" />
                <button type="button" class="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white shadow" @click.stop="form.logo = ''">
                  <X class="h-3 w-3" />
                </button>
              </div>
              <button
                v-else
                type="button"
                class="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:border-primary-400 hover:text-primary-500"
                @click="showLogoPicker = true"
              >
                <ImageIcon class="h-6 w-6" />
                <span class="text-[10px] font-medium">Logo</span>
              </button>
              <span class="text-[10px] text-gray-400">Logo</span>
            </div>
            <div class="flex flex-col items-center gap-1.5">
              <div
                v-if="form.favicon"
                class="group relative h-24 w-24 cursor-pointer overflow-hidden rounded-lg border border-gray-200"
                @click="showFaviconPicker = true"
              >
                <img :src="form.favicon" alt="Favicon" class="h-full w-full object-cover" />
                <button type="button" class="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white shadow" @click.stop="form.favicon = ''">
                  <X class="h-3 w-3" />
                </button>
              </div>
              <button
                v-else
                type="button"
                class="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:border-primary-400 hover:text-primary-500"
                @click="showFaviconPicker = true"
              >
                <ImageIcon class="h-6 w-6" />
                <span class="text-[10px] font-medium">Favicon</span>
              </button>
              <span class="text-[10px] text-gray-400">Favicon</span>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Nama Situs</label>
              <input v-model="form.site_name" type="text" placeholder="Arafa Hijab Store" class="input" />
            </div>
            <div class="sm:col-span-2">
              <label class="mb-1.5 block text-sm font-medium text-gray-700">Deskripsi</label>
              <textarea v-model="form.description" rows="2" placeholder="Deskripsi singkat toko" class="input" />
            </div>
          </div>
        </div>
      </div>

      <!-- SEO -->
      <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 class="text-sm font-semibold text-gray-900">SEO</h2>
        <div class="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Meta Title</label>
            <input v-model="form.meta_title" type="text" class="input" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Meta Keywords</label>
            <input v-model="form.meta_keywords" type="text" placeholder="hijab, kerudung" class="input" />
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Meta Description</label>
            <textarea v-model="form.meta_description" rows="2" class="input" />
          </div>
        </div>
      </div>

      <!-- Theme -->
      <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 class="text-sm font-semibold text-gray-900">Tampilan</h2>
        <div class="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Tema</label>
            <select v-model="form.theme" class="input">
              <option v-for="t in themes" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Layout</label>
            <select v-model="form.layout" class="input">
              <option value="boxed">Boxed</option>
              <option value="full">Full width</option>
            </select>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Warna Utama</label>
            <div class="flex items-center gap-2">
              <input v-model="form.primary_color" type="color" class="h-9 w-12 cursor-pointer rounded border border-gray-300" />
              <input v-model="form.primary_color" type="text" class="input" />
            </div>
          </div>
        </div>
      </div>

      <!-- Social -->
      <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 class="text-sm font-semibold text-gray-900">Sosial Media</h2>
        <div class="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Instagram</label>
            <input v-model="form.instagram" type="text" placeholder="https://instagram.com/..." class="input" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Facebook</label>
            <input v-model="form.facebook" type="text" placeholder="https://facebook.com/..." class="input" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">TikTok</label>
            <input v-model="form.tiktok" type="text" placeholder="https://tiktok.com/@..." class="input" />
          </div>
        </div>
      </div>
    </template>

    <!-- Pickers -->
    <AppMediaPicker v-if="showLogoPicker" @select="onLogoSelect" @close="showLogoPicker = false" />
    <AppMediaPicker v-if="showFaviconPicker" @select="onFaviconSelect" @close="showFaviconPicker = false" />
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
}
</style>
