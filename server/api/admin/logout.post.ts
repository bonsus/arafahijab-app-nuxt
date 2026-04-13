// server/api/admin/logout.post.ts

export default defineEventHandler((event) => {
  // Hapus cookie admin-token (httpOnly)
  deleteCookie(event, 'admin-token', {
    httpOnly: true,
    sameSite: 'lax',
  })
  
  // Hapus cookie admin-user (client-side)
  deleteCookie(event, 'admin-user', {
    httpOnly: false,
    sameSite: 'lax',
  })

  return { 
    success: true,
    message: 'Logged out successfully' 
  }
})