<script setup lang="ts">
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-vue-next'
import type { BusinessProfile } from '~/types'

type LogoVariant = 'logo' | 'label' | 'document'

interface Props {
  business: BusinessProfile | null
  variant?: LogoVariant
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'logo',
})
const emit = defineEmits(['close', 'success'])

const api = useApi()
const toast = useToast()

const saving = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const preview = ref<string | null>(null)

const variantConfig: Record<LogoVariant, { title: string, endpoint: string, field: keyof BusinessProfile }> = {
  logo: { title: 'Ubah Logo Bisnis', endpoint: '/businesses/update-logo', field: 'logo' },
  label: { title: 'Ubah Logo Label', endpoint: '/businesses/update-logo-label', field: 'logo_label' },
  document: { title: 'Ubah Logo Dokumen', endpoint: '/businesses/update-logo-document', field: 'logo_document' },
}

const config = computed(() => variantConfig[props.variant])

watch(() => props.business, (biz) => {
  if (biz) {
    selectedFile.value = null
    preview.value = (biz[config.value.field] as string) || null
    if (fileInput.value) fileInput.value.value = ''
  }
}, { immediate: true })

function triggerFileInput() {
  fileInput.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    toast.error('File harus berupa gambar')
    return
  }

  selectedFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    preview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

async function handleSubmit() {
  if (!selectedFile.value) {
    toast.error('Pilih gambar logo terlebih dahulu')
    return
  }

  saving.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    await api.post(config.value.endpoint, formData)

    toast.success('Logo bisnis berhasil diperbarui')
    emit('success')
    emit('close')
  }
  catch (err: any) {
    toast.error(err.message || 'Gagal memperbarui logo')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="business"
        class="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 px-4 pb-4 sm:items-center sm:p-0"
        @click.self="$emit('close')"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enter-to-class="opacity-100 translate-y-0 sm:scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0 sm:scale-100"
          leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        >
          <div
            v-if="business"
            class="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 class="text-lg font-bold text-gray-900">{{ config.title }}</h2>
              <button
                class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                @click="$emit('close')"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Body -->
            <div class="px-6 py-6">
              <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />

              <div class="flex flex-col items-center gap-4">
                <div class="h-32 w-32 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  <img v-if="preview" :src="preview" alt="Logo" class="h-full w-full object-contain" />
                  <div v-else class="flex h-full w-full items-center justify-center text-gray-300">
                    <ImageIcon class="h-10 w-10" />
                  </div>
                </div>

                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  @click="triggerFileInput"
                >
                  <Upload class="h-4 w-4" />
                  Pilih Gambar
                </button>

                <p class="text-center text-xs text-gray-400">
                  Format: JPG, PNG, WEBP. Disarankan rasio 1:1.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                @click="$emit('close')"
              >
                Batal
              </button>
              <button
                type="button"
                :disabled="saving || !selectedFile"
                class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                @click="handleSubmit"
              >
                <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
                {{ saving ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
