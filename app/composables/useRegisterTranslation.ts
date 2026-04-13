// composables/useRegisterTranslation.ts
export const useRegisterTranslation = () => {
  const { currentLocale } = useTranslation()
  
  const translations = {
    id: {
      register: {
        title: "Daftar",
        subtitle: "Buat akun baru untuk memulai.",
        form: {
          name: "Nama Lengkap",
          phone: "Nomor Telepon",
          company: "Perusahaan",
          email: "Email",
          password: "Kata Sandi",
          password_confirmation: "Konfirmasi Kata Sandi",
          placeholders: {
            name: "Masukkan nama Anda",
            phone: "Masukkan nomor telepon Anda",
            company: "Masukkan nama perusahaan",
            email: "Masukkan email Anda",
            password: "Masukkan kata sandi Anda",
            password_confirmation: "Konfirmasi kata sandi Anda"
          }
        },
        button: {
          register: "Daftar",
          google_signup: "Daftar dengan Google"
        },
        messages: {
          success: "Pendaftaran berhasil! Silakan periksa email Anda untuk memverifikasi akun.",
          error: "Terjadi kesalahan saat pendaftaran"
        },
        login_link: {
          text: "Sudah punya akun?",
          link: "Masuk di sini"
        }
      },
      common: {
        loading: "Memuat...",
        save: "Simpan",
        cancel: "Batal"
      }
    },
    en: {
      register: {
        title: "Register",
        subtitle: "Create a new account to get started.",
        form: {
          name: "Full Name",
          phone: "Phone",
          company: "Company",
          email: "Email",
          password: "Password",
          password_confirmation: "Confirm Password",
          placeholders: {
            name: "Enter your name",
            phone: "Enter your phone number",
            company: "Enter your company name",
            email: "Enter your email",
            password: "Enter your password",
            password_confirmation: "Confirm your password"
          }
        },
        button: {
          register: "Register",
          google_signup: "Sign up with Google"
        },
        messages: {
          success: "Registration successful! Please check your email to verify your account.",
          error: "Error during registration"
        },
        login_link: {
          text: "Already have an account?",
          link: "Log in here"
        }
      },
      common: {
        loading: "Loading...",
        save: "Save",
        cancel: "Cancel"
      }
    }
  }

  const getTranslation = (key: string, type: 'register' | 'common' = 'register'): string => {
    const locale = currentLocale.value as 'id' | 'en'
    const translationSource = translations[locale][type]
    
    const keys = key.split('.')
    let result: any = translationSource
    
    for (const k of keys) {
      result = result?.[k]
    }
    
    return result || key
  }

  const t = (key: string): string => getTranslation(key, 'register')
  const tc = (key: string): string => getTranslation(key, 'common')

  return {
    t,   // Register translation
    tc,  // Common translation
    isLoaded: ref(true) // Always loaded
  }
}
