// composables/useTranslation.ts
export const useTranslation = () => {
  const currentLocale = useCookie<string>('locale', {
    default: () => 'id',
    sameSite: 'lax'
  })

  const translationsCache = ref<Record<string, any>>({})

  // Load translation file dynamically
  const loadTranslation = async (locale: string, component: string) => {
    const cacheKey = `${locale}.${component}`
    
    if (translationsCache.value[cacheKey]) {
      return translationsCache.value[cacheKey]
    }

    try {
      const translation = await import(`~/translations/${locale}/${component}.json`)
      translationsCache.value[cacheKey] = translation.default || translation
      return translationsCache.value[cacheKey]
    } catch (error) {
      console.warn(`Translation file not found: ${locale}/${component}.json`)
      return {}
    }
  }

  // Get translation with component namespace
  const t = async (key: string, component: string = 'common'): Promise<string> => {
    const locale = currentLocale.value as 'id' | 'en'
    const translation = await loadTranslation(locale, component)
    
    const keys = key.split('.')
    let result: any = translation
    
    for (const k of keys) {
      result = result?.[k]
    }
    
    return result || key
  }

  // Sync version for already loaded translations
  const ts = (key: string, component: string = 'common'): string => {
    const locale = currentLocale.value as 'id' | 'en'
    const cacheKey = `${locale}.${component}`
    const translation = translationsCache.value[cacheKey]
    
    if (!translation) {
      return key
    }
    
    const keys = key.split('.')
    let result: any = translation
    
    for (const k of keys) {
      result = result?.[k]
    }
    
    return result || key
  }

  // Preload translations for a component
  const loadComponentTranslations = async (component: string) => {
    const locale = currentLocale.value as 'id' | 'en'
    await loadTranslation(locale, component)
  }

  const setLocale = async (locale: 'id' | 'en') => {
    currentLocale.value = locale
    // Clear cache when locale changes
    translationsCache.value = {}
  }

  const getLocale = () => currentLocale.value

  const availableLocales = [
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ]

  return {
    t,
    ts,
    loadComponentTranslations,
    setLocale,
    getLocale,
    currentLocale: readonly(currentLocale),
    availableLocales
  }
}