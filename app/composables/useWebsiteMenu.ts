export interface WebsiteMenuItem {
  label: string
  icon: string
  to: string
  /** Prefix used for active-state matching (defaults to `to`). */
  match?: string
}

export function useWebsiteMenu(): WebsiteMenuItem[] {
  return [
    { label: 'Pengaturan Umum', icon: 'settings', to: '/website/settings' },
    { label: 'Domain', icon: 'globe', to: '/website/domains' },
    { label: 'Produk', icon: 'box', to: '/website/products' },
    { label: 'Halaman', icon: 'layout', to: '/website/pages' },
    { label: 'Menu Navigasi', icon: 'menu', to: '/website/menus' },
    { label: 'Kurir', icon: 'truck', to: '/website/couriers' },
    { label: 'Pembayaran', icon: 'credit-card', to: '/website/payments' },
    { label: 'Blog - Kategori', icon: 'folder', to: '/website/blog/categories' },
    { label: 'Blog - Artikel', icon: 'newspaper', to: '/website/blog/posts' },
  ]
}
