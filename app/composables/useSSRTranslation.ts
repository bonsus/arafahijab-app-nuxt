// composables/useSSRTranslation.ts
type ComponentTranslations = {
  [key: string]: any; // Add index signature for dynamic component names
};

type Translations = {
  id: {
    common: any;
    [componentName: string]: any;
  };
  en: {
    common: any;
    [componentName: string]: any;
  };
};

export const useSSRTranslation = (componentName: string) => {
  const { currentLocale } = useTranslation()
  const { $translations } = useNuxtApp() as { $translations: Translations }

  const getTranslation = (key: string, type: 'component' | 'common' = 'component'): string => {
    const locale = currentLocale.value as 'id' | 'en'

    // Get from preloaded translations
    const translationSource = type === 'component'
      ? $translations[locale][componentName]
      : $translations[locale].common

    if (!translationSource) {
      console.warn(`Translation not found for ${locale}.${componentName}`)
      return key
    }

    const keys = key.split('.')
    let result: any = translationSource

    for (const k of keys) {
      result = result?.[k]
    }

    return result || key
  }

  const t = (key: string): string => getTranslation(key, 'component')
  const tc = (key: string): string => getTranslation(key, 'common')

  return {
    t,   // Component translation
    tc,  // Common translation
    isLoaded: ref(true) // Always loaded for SSR
  }
}
