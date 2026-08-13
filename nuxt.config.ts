import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@pinia/nuxt', '@nuxt/image'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        'lucide-vue-next',
        'reka-ui',
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'xlsx',
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
    apiBaseUrl: process.env.API_BASE_URL || 'https://v2api.arafahijab.co.id',
    // Admin backend (apps/admin). Paths are namespaced under /admin.
    // Defaults to the main API gateway; override with ADMIN_API_BASE_URL.
    adminApiBaseUrl: process.env.ADMIN_API_BASE_URL || process.env.API_BASE_URL || 'https://v2api.arafahijab.co.id',
    public: {
      appName: 'Arafa Hijab ERP',
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    },
  },

  pinia: {
    storesDirs: ['./app/stores/**'],
  },

  sourcemap: {
    server: true,
    client: true
  }
})