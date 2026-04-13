// SSR-compatible login translation composable with inline translations
export const useLoginTranslation = () => {
  const { currentLocale } = useTranslation()

  // Embedded translations for SSR compatibility
  const translations = {
    id: {
      "title": "Masuk",
      "subtitle": "Masuk ke akun Anda untuk melanjutkan.",
      "form": {
        "email": "Email",
        "password": "Kata Sandi",
        "forgot_password": "Lupa kata sandi?",
        "placeholders": {
          "email": "Masukkan email Anda",
          "password": "Masukkan kata sandi"
        }
      },
      "button": {
        "login": "Masuk",
        "google_login": "Masuk dengan Google"
      },
      "messages": {
        "success": "Berhasil masuk!",
        "error": "Email atau kata sandi salah",
        "registered": "Akun berhasil dibuat! Silakan masuk untuk melanjutkan."
      },
      "registration": {
        "text": "Belum punya akun?",
        "link": "Daftar di sini"
      }
    },
    en: {
      "title": "Sign In",
      "subtitle": "Enter your credentials to access your account.",
      "form": {
        "email": "Email",
        "password": "Password",
        "forgot_password": "Forgot password?",
        "placeholders": {
          "email": "Enter your email address",
          "password": "Enter your password"
        }
      },
      "button": {
        "login": "Sign In",
        "google_login": "Sign in with Google"
      },
      "messages": {
        "success": "Successfully signed in!",
        "error": "Invalid email or password",
        "registered":"Account created successfully! Please sign in to continue."
      },
      "registration": {
        "text": "Don't have an account?",
        "link": "Sign up here"
      }
    }
  }

  const getTranslation = (key: string): string => {
    const locale = currentLocale.value as 'id' | 'en'
    const keys = key.split('.')
    let value: any = translations[locale]

    for (const k of keys) {
      value = value?.[k]
    }

    return value || key
  }

  // Get common translations from the main translation composable
  const { ts: getCommonTranslation } = useTranslation()

  return {
    t: getTranslation,
    tc: getCommonTranslation,
    isLoaded: ref(true) // Always loaded since translations are inline
  }
}
