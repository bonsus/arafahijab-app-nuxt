// stores/auth.ts
export const useAuthAdminStore = defineStore('authAdmin', () => {
  const user = ref<any>(null)

  const login = async (email: string, password: string) => {
    try {
      const res = await $fetch('/api/admin/login', {
        method: 'POST',
        body: { email, password },
      })
      user.value = res // res = user data
    } catch (err: any) {
      user.value = null
      const errorMessage = err?.data?.error || '';
      const errorDetails = err?.data?.errors || {};
      throw new Error(JSON.stringify({ error: errorMessage, errors: errorDetails }));
    }
  }

  const fetchUser = async () => {
    try {
      const res = await $fetch('/api/admin/me')
      console.log('Fetched user:', res)
      user.value = res
    } catch {
      user.value = null
    }
  }

  const logout = async () => {
    await $fetch('/api/admin/logout', { method: 'POST' })
    user.value = null
  }

  return { user, login, fetchUser, logout }
})
export const useAuthUserStore = defineStore('authUser', () => {
  const user = ref<any>(null)

  const login = async (email: string, password: string) => {
    try {
      const res = await $fetch('/api/user/login', {
        method: 'POST',
        body: { email, password },
      })
      user.value = res // res = user data
    } catch (err: any) {
      user.value = null
      const errorMessage = err?.data?.error || '';
      const errorDetails = err?.data?.errors || {};
      throw new Error(JSON.stringify({ error: errorMessage, errors: errorDetails }));
    }
  }

  const fetchUser = async () => {
    try {
      const res = await $fetch('/api/user/auth/me',{
        method: 'GET',
      })
      console.log('Fetched user:', res)
      user.value = res
    } catch {
      user.value = null
    }
  }

  const logout = async () => {
    await $fetch('/api/user/auth/logout', { method: 'POST' })
    user.value = null
  }

  return { user, login, fetchUser, logout }
})
