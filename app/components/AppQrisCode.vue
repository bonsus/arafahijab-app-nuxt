<script setup lang="ts">
import QRCode from 'qrcode'

const props = withDefaults(defineProps<{
  value: string
  size?: number
}>(), {
  size: 224,
})

const dataUrl = ref('')
const error = ref(false)

async function render() {
  if (!props.value) return
  error.value = false
  try {
    dataUrl.value = await QRCode.toDataURL(props.value, {
      width: props.size,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
  }
  catch {
    error.value = true
  }
}

watch(() => props.value, render, { immediate: true })

/** Untuk kebutuhan download di halaman pemakaian komponen. */
defineExpose({ dataUrl })
</script>

<template>
  <img
    v-if="dataUrl"
    :src="dataUrl"
    alt="QRIS"
    class="h-56 w-56 object-contain"
  >
  <div v-else-if="error" class="flex h-56 w-56 items-center justify-center text-sm text-gray-400">
    QR tidak dapat dibuat
  </div>
  <div v-else class="flex h-56 w-56 animate-pulse items-center justify-center rounded-lg bg-gray-100">
    <div class="h-4 w-24 rounded bg-gray-200" />
  </div>
</template>
