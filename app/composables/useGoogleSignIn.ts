interface GoogleCredentialResponse {
  credential: string
  select_by?: string
}

interface RenderButtonOptions {
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  type?: 'standard' | 'icon'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  width?: number
  locale?: string
}

const GSI_SRC = 'https://accounts.google.com/gsi/client'

let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (import.meta.server) {
    return Promise.reject(new Error('Google Sign-In hanya tersedia di browser'))
  }
  if ((window as any).google?.accounts?.id) {
    return Promise.resolve()
  }
  if (scriptPromise) {
    return scriptPromise
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Gagal memuat Google Sign-In')))
      return
    }
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Gagal memuat Google Sign-In'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

export function useGoogleSignIn() {
  const config = useRuntimeConfig()
  const clientId = config.public.googleClientId as string

  const isConfigured = computed(() => !!clientId)

  async function initialize(onCredential: (idToken: string) => void) {
    if (!clientId) {
      throw new Error('Google Client ID belum dikonfigurasi')
    }
    await loadScript()
    ;(window as any).google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: GoogleCredentialResponse) => {
        if (response?.credential) {
          onCredential(response.credential)
        }
      },
    })
  }

  async function renderButton(
    target: HTMLElement,
    onCredential: (idToken: string) => void,
    options: RenderButtonOptions = {},
  ) {
    await initialize(onCredential)
    ;(window as any).google.accounts.id.renderButton(target, {
      theme: 'outline',
      size: 'large',
      type: 'standard',
      shape: 'rectangular',
      text: 'signin_with',
      width: target.clientWidth || 320,
      ...options,
    })
  }

  return {
    isConfigured,
    initialize,
    renderButton,
  }
}
