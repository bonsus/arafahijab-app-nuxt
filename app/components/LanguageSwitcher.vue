
<script setup lang="ts">
import { Globe, ChevronDown, Check } from 'lucide-vue-next'

const { setLocale, currentLocale, availableLocales } = useTranslation()
const showDropdown = ref(false)

const currentLocaleData = computed(() => {
  return availableLocales.find(l => l.code === currentLocale.value) || availableLocales[0]
})

const switchLanguage = async (newLocale: 'id' | 'en') => {
  await setLocale(newLocale)
  showDropdown.value = false
}

// Close dropdown when clicking outside
onMounted(() => {
  const handleClickOutside = (e: Event) => {
    const target = e.target as HTMLElement
    if (!target.closest('.relative')) {
      showDropdown.value = false
    }
  }

  document.addEventListener('click', handleClickOutside)

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})
</script>
<template>
  <div class="relative">
    <Button
      variant="outline"
      size="sm"
      @click="showDropdown = !showDropdown"
      class="flex items-center space-x-2"
    >
      <Globe class="w-4 h-4" />
      <span class="hidden sm:inline">{{ currentLocaleData?.name }}</span>
      <ChevronDown class="w-4 h-4" />
    </Button>

    <div
      v-if="showDropdown"
      class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50"
    >
      <div class="py-1">
        <button
          v-for="locale in availableLocales"
          :key="locale.code"
          @click="switchLanguage(locale.code as 'id' | 'en')"
          :class="[
            'w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2',
            currentLocale === locale.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
          ]"
        >
          <span class="text-lg">{{ locale.flag }}</span>
          <span>{{ locale.name }}</span>
          <Check v-if="currentLocale === locale.code" class="w-4 h-4 ml-auto" />
        </button>
      </div>
    </div>
  </div>
</template>
