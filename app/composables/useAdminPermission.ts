// Admin permission checks. Roles carry a string[] permission list where
// ["*"] grants everything, otherwise entries are `modul.aksi` strings.
export function useAdminPermission() {
  const authStore = useAdminAuthStore()

  const permissions = computed<Set<string>>(() => {
    const list = authStore.admin?.role?.permission ?? []
    return new Set(list)
  })

  /** Full access when the role holds the wildcard "*". */
  const isSuper = computed(() => permissions.value.has('*'))

  function can(perm: string): boolean {
    if (isSuper.value) return true
    return permissions.value.has(perm)
  }

  function canAny(perms: string[]): boolean {
    if (isSuper.value) return true
    return perms.some(p => permissions.value.has(p))
  }

  function canAll(perms: string[]): boolean {
    if (isSuper.value) return true
    return perms.every(p => permissions.value.has(p))
  }

  return { permissions, isSuper, can, canAny, canAll }
}
