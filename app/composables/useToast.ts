// composables/useToast.ts
export const useToast = () => {
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success', duration: number = 3000) => {
    // Create toast element
    const toast = document.createElement('div')
    toast.className = `
      fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white font-medium
      transform transition-all duration-300 ease-in-out translate-x-full opacity-0
      ${type === 'success' ? 'bg-green-500' : ''}
      ${type === 'error' ? 'bg-red-500' : ''}
      ${type === 'warning' ? 'bg-yellow-500' : ''}
      ${type === 'info' ? 'bg-blue-500' : ''}
    `
    toast.textContent = message
    
    // Add to DOM
    document.body.appendChild(toast)
    
    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full', 'opacity-0')
    }, 10)
    
    // Remove after duration
    setTimeout(() => {
      toast.classList.add('translate-x-full', 'opacity-0')
      setTimeout(() => {
        document.body.removeChild(toast)
      }, 300)
    }, duration)
  }

  return {
    success: (message: string, duration?: number) => showToast(message, 'success', duration),
    error: (message: string, duration?: number) => showToast(message, 'error', duration),
    warning: (message: string, duration?: number) => showToast(message, 'warning', duration),
    info: (message: string, duration?: number) => showToast(message, 'info', duration),
  }
}
