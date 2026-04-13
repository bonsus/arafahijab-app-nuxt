// composables/useComponentTranslation.ts
export const useComponentTranslation = (componentName: string) => {
  const { currentLocale } = useTranslation()
  
  const translations = ref<any>({})
  const commonTranslations = ref<any>({})
  const isLoaded = ref(false)

  // Load translations synchronously on server, async on client
  const loadTranslations = async () => {
    try {
      const locale = currentLocale.value
      
      // Load component translations
      const componentModule = await import(`~/translations/${locale}/${componentName}.json`)
      translations.value = componentModule.default || componentModule
      
      // Load common translations
      const commonModule = await import(`~/translations/${locale}/common.json`)
      commonTranslations.value = commonModule.default || commonModule
      
      isLoaded.value = true
    } catch (error) {
      console.warn(`Failed to load translations for ${componentName}`)
      translations.value = {}
      commonTranslations.value = {}
      isLoaded.value = true
    }
  }

  // Initialize translations immediately for SSR
  if (process.server) {
    // On server, load synchronously
    loadTranslations()
  } else {
    // On client, load after mount
    onMounted(async () => {
      await loadTranslations()
    })

    // Reload translations when locale changes
    watch(currentLocale, async () => {
      isLoaded.value = false
      await loadTranslations()
    })
  }

  // Simple translation function
  const t = (key: string): string => {
    if (!isLoaded.value && process.client) return key
    
    const keys = key.split('.')
    let result: any = translations.value
    
    for (const k of keys) {
      result = result?.[k]
    }
    
    return result || key
  }

  // Common translations
  const tc = (key: string): string => {
    if (!isLoaded.value && process.client) return key
    
    const keys = key.split('.')
    let result: any = commonTranslations.value
    
    for (const k of keys) {
      result = result?.[k]
    }
    
    return result || key
  }

  return {
    t,        // Component-specific translation
    tc,       // Common translation
    isLoaded: readonly(isLoaded)
  }
}
