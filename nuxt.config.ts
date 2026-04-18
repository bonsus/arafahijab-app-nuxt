import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@pinia/nuxt'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        'lucide-vue-next',
        'reka-ui',
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ],
    },
  },

  nitro: {
    sourceMap: false,
  },

  imports: {
    dirs: ['stores'],
  },

  runtimeConfig: {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8080',
    public: {
      appName: 'Arafa Hijab ERP',
    },
  },

  pinia: {
    storesDirs: ['./app/stores/**'],
  },
})
