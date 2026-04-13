// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    // Private keys (only available on server-side)
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    apiUrl: process.env.API_URL || 'http://127.0.0.1:2345',
    // Public keys (exposed to client-side)
    public: {
      apiBase: process.env.NUXT_API_BASE_URL || 'http://127.0.0.1:2345',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    }
  },
  css: ['@/assets/css/tailwind.css'],
  modules: ['@nuxtjs/tailwindcss', 'shadcn-nuxt','@pinia/nuxt'],
  tailwindcss: {
    cssPath: '@/assets/css/tailwind.css',
    configPath: 'tailwind.config.js',
    exposeConfig: false,
    viewer: true,
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui'
  }
})
