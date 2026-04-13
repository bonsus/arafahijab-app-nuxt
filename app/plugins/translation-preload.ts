// plugins/translation-preload.ts
import registerID from '~/translations/id/register.json'
import registerEN from '~/translations/en/register.json'
import commonID from '~/translations/id/common.json'
import commonEN from '~/translations/en/common.json'
import loginID from '~/translations/id/login.json'
import loginEN from '~/translations/en/login.json'
import adminID from '~/translations/id/admin.json'
import adminEN from '~/translations/en/admin.json'

export default defineNuxtPlugin(() => {
  // Preload all translations for SSR
  const translations = {
    id: {
      register: registerID,
      common: commonID,
      login: loginID,
      admin: adminID
    },
    en: {
      register: registerEN,
      common: commonEN,
      login: loginEN,
      admin: adminEN
    }
  }

  return {
    provide: {
      translations
    }
  }
})
