# Translation System Documentation

## 📂 Struktur File Translation

```
app/translations/
├── id/                 # Bahasa Indonesia
│   ├── common.json     # Teks umum (button, loading, etc)
│   ├── register.json   # Halaman register
│   ├── login.json      # Halaman login
│   └── admin.json      # Dashboard admin
└── en/                 # English
    ├── common.json     # Common texts
    ├── register.json   # Register page
    ├── login.json      # Login page
    └── admin.json      # Admin dashboard
```

## 🛠️ Cara Penggunaan

### 1. **Untuk Component/Page Baru:**

```vue
<script setup lang="ts">
// Import translation hook dengan nama component
const { t, tc, isLoaded } = useComponentTranslation('register')

// t()  = Translation untuk component tertentu
// tc() = Translation untuk common texts
// isLoaded = Status loading translation
</script>

<template>
  <div v-if="!isLoaded">Loading...</div>
  <div v-else>
    <h1>{{ t('title') }}</h1>
    <button>{{ tc('save') }}</button>
  </div>
</template>
```

### 2. **Menambah Translation File Baru:**

1. Buat file JSON di `app/translations/id/component-name.json`
2. Buat file JSON di `app/translations/en/component-name.json`
3. Gunakan `useComponentTranslation('component-name')` di component

### 3. **Struktur JSON Translation:**

```json
{
  "title": "Judul Halaman",
  "subtitle": "Sub judul",
  "form": {
    "name": "Nama",
    "email": "Email",
    "placeholders": {
      "name": "Masukkan nama",
      "email": "Masukkan email"
    }
  },
  "button": {
    "submit": "Kirim",
    "cancel": "Batal"
  },
  "messages": {
    "success": "Berhasil!",
    "error": "Terjadi kesalahan"
  }
}
```

## 🌐 Language Switcher

Component `<LanguageSwitcher />` sudah tersedia dan bisa digunakan di mana saja:

```vue
<template>
  <div class="header">
    <LanguageSwitcher />
  </div>
</template>
```

## 🔧 Advanced Usage

### Manual Translation Loading:

```vue
<script setup lang="ts">
const { loadComponentTranslations, ts } = useTranslation()

// Preload translations
await loadComponentTranslations('register')

// Use sync translation (hanya untuk yang sudah di-load)
const text = ts('title', 'register')
</script>
```

### Global Translation State:

```vue
<script setup lang="ts">
const { currentLocale, setLocale, availableLocales } = useTranslation()

// Get current locale
console.log(currentLocale.value) // 'id' atau 'en'

// Change locale
await setLocale('en')

// Available locales
console.log(availableLocales)
</script>
```

## 📋 Component List

### ✅ **Sudah Ada Translation:**
- `register` - Halaman register
- `login` - Halaman login  
- `admin` - Dashboard admin
- `common` - Teks umum

### 🔄 **Perlu Ditambah:**
- `profile` - Halaman profil
- `dashboard` - Dashboard user
- `settings` - Pengaturan
- `navigation` - Menu navigasi

## 💡 Tips Maintenance

1. **Konsisten dengan Key Names**: Gunakan naming yang konsisten seperti `form.name`, `button.submit`, dll.

2. **Grouping yang Logis**: Kelompokkan teks berdasarkan fungsi:
   ```json
   {
     "form": { ... },
     "button": { ... },
     "messages": { ... }
   }
   ```

3. **Fallback Text**: Sistem akan return key name jika translation tidak ditemukan.

4. **Performance**: Translation di-cache otomatis per component.

5. **Hot Reload**: Perubahan file JSON akan langsung ter-reload saat development.
