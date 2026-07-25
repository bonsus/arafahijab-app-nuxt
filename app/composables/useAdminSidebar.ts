// Independent sidebar open/close state for the admin area.
const adminSidebarOpen = ref(false)

export function useAdminSidebar() {
  function toggle() {
    adminSidebarOpen.value = !adminSidebarOpen.value
  }

  function open() {
    adminSidebarOpen.value = true
  }

  function close() {
    adminSidebarOpen.value = false
  }

  return {
    isOpen: adminSidebarOpen,
    toggle,
    open,
    close,
  }
}
