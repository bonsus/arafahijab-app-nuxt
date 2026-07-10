// Permission definitions & helpers — kept in sync with backend
// (internal/middleware/PERMISSION.md). Owner type always bypasses checks.

export interface PermissionModule {
  key: string
  label: string
  permissions: string[]
}

export interface PermissionGroup {
  key: string
  label: string
  modules: PermissionModule[]
}

/**
 * Full permission catalogue grouped for the role editor UI.
 * Mirrors the backend "JSON Siap Pakai untuk Frontend" section.
 */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: 'master_data',
    label: 'Master Data',
    modules: [
      { key: 'product', label: 'Produk', permissions: ['product.read', 'product.create', 'product.update', 'product.delete'] },
      { key: 'customer', label: 'Pelanggan', permissions: ['customer.read', 'customer.create', 'customer.update', 'customer.delete'] },
      { key: 'bank', label: 'Bank', permissions: ['bank.read', 'bank.create', 'bank.update', 'bank.delete'] },
      { key: 'courier', label: 'Kurir', permissions: ['courier.read', 'courier.update'] },
      { key: 'store', label: 'Toko', permissions: ['store.read', 'store.create', 'store.update', 'store.delete'] },
      { key: 'warehouse', label: 'Gudang', permissions: ['warehouse.read', 'warehouse.create', 'warehouse.update', 'warehouse.delete'] },
      { key: 'integration', label: 'Integrasi', permissions: ['integration.read', 'integration.create', 'integration.update', 'integration.delete'] },
      { key: 'option', label: 'Pengaturan', permissions: ['option.read', 'option.update'] },
      { key: 'payment-method', label: 'Metode Pembayaran', permissions: ['payment-method.read', 'payment-method.update'] },
      { key: 'user', label: 'Pengguna', permissions: ['user.read', 'user.create', 'user.update', 'user.delete'] },
      { key: 'role', label: 'Role', permissions: ['role', 'role.create', 'role.update', 'role.delete'] },
      { key: 'website', label: 'Website', permissions: ['website.read', 'website.create', 'website.update', 'website.delete'] },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory & Stok',
    modules: [
      { key: 'inventory', label: 'Inventory', permissions: ['inventory.read'] },
      { key: 'inbound', label: 'Inbound', permissions: ['inbound.read', 'inbound.create', 'inbound.update', 'inbound.delete'] },
      { key: 'stock_adjustment', label: 'Stock Adjustment', permissions: ['stock_adjustment.read', 'stock_adjustment.create', 'stock_adjustment.update', 'stock_adjustment.delete'] },
      { key: 'stock_conversion', label: 'Stock Conversion', permissions: ['stock_conversion.read', 'stock_conversion.create', 'stock_conversion.update', 'stock_conversion.delete'] },
      { key: 'stock_opname', label: 'Stock Opname', permissions: ['stock_opname.read', 'stock_opname.create', 'stock_opname.update', 'stock_opname.delete'] },
      { key: 'stock_transfer', label: 'Stock Transfer', permissions: ['stock_transfer.read', 'stock_transfer.create', 'stock_transfer.update', 'stock_transfer.delete'] },
      { key: 'stock_usage', label: 'Stock Usage', permissions: ['stock_usage.read', 'stock_usage.create', 'stock_usage.update', 'stock_usage.delete'] },
      { key: 'stock_usage_return', label: 'Stock Usage Return', permissions: ['stock_usage_return.read', 'stock_usage_return.create', 'stock_usage_return.update', 'stock_usage_return.delete'] },
    ],
  },
  {
    key: 'purchasing',
    label: 'Pembelian',
    modules: [
      { key: 'purchase', label: 'Pembelian', permissions: ['purchase.read', 'purchase.create', 'purchase.update', 'purchase.delete'] },
      { key: 'purchase_receipt', label: 'Penerimaan', permissions: ['purchase_receipt.read', 'purchase_receipt.create', 'purchase_receipt.update', 'purchase_receipt.delete'] },
      { key: 'purchase_return', label: 'Retur Pembelian', permissions: ['purchase_return.read', 'purchase_return.create', 'purchase_return.update', 'purchase_return.delete'] },
    ],
  },
  {
    key: 'sales',
    label: 'Penjualan',
    modules: [
      { key: 'sales_order', label: 'Sales Order', permissions: ['sales_order.read', 'sales_order.create', 'sales_order.update', 'sales_order.delete'] },
      { key: 'sales_order_mp', label: 'Sales Order Marketplace', permissions: ['sales_order_mp.read', 'sales_order_mp.create'] },
      { key: 'sales_order_payment', label: 'Pembayaran SO', permissions: ['sales_order_payment.read', 'sales_order_payment.create', 'sales_order_payment.update'] },
      { key: 'sales_order_return', label: 'Retur SO', permissions: ['sales_order_return.read', 'sales_order_return.create', 'sales_order_return.update'] },
      { key: 'sales_order_return_payment', label: 'Pembayaran Retur SO', permissions: ['sales_order_return_payment.read', 'sales_order_return_payment.create', 'sales_order_return_payment.update', 'sales_order_return_payment.delete'] },
      { key: 'transaction', label: 'Transaksi', permissions: ['transaction.read', 'transaction.create', 'transaction.update', 'transaction.delete'] },
      { key: 'sales_dashboard', label: 'Dashboard Penjualan', permissions: ['sales_dashboard.read'] },
    ],
  },
  {
    key: 'export',
    label: 'Export',
    modules: [
      { key: 'sales_order_export', label: 'Export Sales Order', permissions: ['sales_order_export.read'] },
      { key: 'sales_order_payment_export', label: 'Export Pembayaran SO', permissions: ['sales_order_payment_export.read'] },
      { key: 'sales_order_return_export', label: 'Export Retur SO', permissions: ['sales_order_return_export.read'] },
      { key: 'sales_purchase_order_export', label: 'Export Purchase Order', permissions: ['sales_purchase_order_export.read'] },
    ],
  },
  {
    key: 'promotion',
    label: 'Promosi',
    modules: [
      { key: 'promotion_checkout', label: 'Promo Checkout', permissions: ['promotion_checkout.read', 'promotion_checkout.create', 'promotion_checkout.update', 'promotion_checkout.delete'] },
      { key: 'promotion_discount', label: 'Promo Diskon', permissions: ['promotion_discount.read', 'promotion_discount.create', 'promotion_discount.update', 'promotion_discount.delete'] },
      { key: 'promotion_product_free', label: 'Promo Produk Gratis', permissions: ['promotion_product_free.read', 'promotion_product_free.create', 'promotion_product_free.update', 'promotion_product_free.delete'] },
    ],
  },
  {
    key: 'report',
    label: 'Laporan',
    modules: [
      { key: 'report_sales', label: 'Laporan Penjualan', permissions: ['report_sales.read'] },
      { key: 'report_finances', label: 'Laporan Keuangan', permissions: ['report_finances.read'] },
      { key: 'report_returns', label: 'Laporan Retur', permissions: ['report_returns.read'] },
      { key: 'report_stock', label: 'Laporan Stok', permissions: ['report_stock.read'] },
    ],
  },
  {
    key: 'wallet',
    label: 'Wallet',
    modules: [
      { key: 'wallet', label: 'Wallet', permissions: ['wallet.read', 'wallet.create', 'wallet.update', 'wallet.delete'] },
    ],
  },
]

/** Human readable label for a single permission's action. */
export function permissionActionLabel(perm: string): string {
  // Special-case: role "read" permission is the bare string `role`.
  if (perm === 'role') return 'Lihat'
  const action = perm.split('.')[1] || ''
  switch (action) {
    case 'read': return 'Lihat'
    case 'create': return 'Tambah'
    case 'update': return 'Ubah'
    case 'delete': return 'Hapus'
    default: return action || perm
  }
}

/**
 * Reactive permission checks for the current user.
 * Owner (`type === 'owner'`) bypasses every check, matching backend behaviour.
 */
export function usePermission() {
  const authStore = useAuthStore()

  const isOwner = computed(() => authStore.user?.type === 'owner')

  const permissions = computed<Set<string>>(() => {
    const raw = authStore.user?.role?.permission as unknown
    let list: string[] = []
    if (Array.isArray(raw)) {
      list = raw as string[]
    }
    else if (raw && typeof raw === 'object') {
      // Defensive: support legacy `{ "perm": true }` shape
      list = Object.keys(raw).filter(k => (raw as Record<string, boolean>)[k])
    }
    return new Set(list.map(p => String(p).toLowerCase()))
  })

  function can(permission?: string | null): boolean {
    if (!permission) return true
    if (isOwner.value) return true
    return permissions.value.has(permission.toLowerCase())
  }

  function canAny(perms?: string[] | null): boolean {
    if (isOwner.value) return true
    if (!perms || !perms.length) return true
    return perms.some(p => permissions.value.has(p.toLowerCase()))
  }

  function canAll(perms?: string[] | null): boolean {
    if (isOwner.value) return true
    if (!perms || !perms.length) return true
    return perms.every(p => permissions.value.has(p.toLowerCase()))
  }

  return { isOwner, permissions, can, canAny, canAll }
}
