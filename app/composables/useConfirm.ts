import type { ComponentPublicInstance } from 'vue'

const confirmRef = shallowRef<ComponentPublicInstance | null>(null)

export function useConfirm() {
  function setRef(el: ComponentPublicInstance | null) {
    confirmRef.value = el
  }

  function confirm(opts: {
    title?: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info'
  }): Promise<boolean> {
    if (!confirmRef.value) return Promise.resolve(false)
    return (confirmRef.value as any).open(opts)
  }

  return { setRef, confirm }
}
