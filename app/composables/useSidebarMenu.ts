import type { MenuItem } from '~/types'

export function useSidebarMenu(): MenuItem[] {
  return [
    {
      label: 'Dashboard',
      icon: 'layout-dashboard',
      to: '/dashboard', 
    },
    {
      label: 'Pesanan',
      icon: 'shopping-bag',
      to: '/sales/ordercs', 
      csOnly: true, 
    },
    {
      label: 'Konfirmasi Pembayaran',
      icon: 'credit-card',
      to: '/sales/ordercs/payment-confirmations', 
      csOnly: true,
    },
    {
      label: 'Penjualan',
      icon: 'shopping-cart',
      children: [
        { label: 'Order', to: '/sales/order', permission: 'sales_order.read' }, 
        { label: 'Pembayaran', to: '/sales/payment', permission: 'sales_order_payment.read' },
        { label: 'Retur', to: '/sales/return', permission: 'sales_order_return.read' },
        { label: 'Order Marketplace', to: '/sales/marketplace', permission: 'sales_order_mp.read' },
        { label: 'Rekonsiliasi Ongkir', to: '/sales/order/reconcile-shipment', permission: 'sales_order.read' },
      ],
    },
    {
      label: 'Pembelian',
      icon: 'package-check',
      children: [
        { label: 'Purchase Order', to: '/purchase/order', permission: 'purchase.read' },
        { label: 'Penerimaan Barang', to: '/purchase/receipt', permission: 'purchase_receipt.read' },
        { label: 'Pembayaran', to: '/purchase/payment', permission: 'purchase.read' },
        { label: 'Retur Pembelian', to: '/purchase/return', permission: 'purchase_return.read' },
      ],
    },
    {
      label: 'Produk',
      icon: 'box',
      children: [
        { label: 'Master Produk', to: '/product/masters', permission: 'product.read' },
        { label: 'Kategori Produk', to: '/product/categories', permission: 'product.read' },
        { label: 'Produk Marketplace', to: '/product/marketplace', permission: 'product.read' },
      ],
    },
    {
      label: 'WMS',
      icon: 'warehouse',
      children: [
        { label: 'Inbound', to: '/wms/inbound', permission: 'inbound.read' },
        { label: 'Lokasi', to: '/wms/locations', permission: 'warehouse.read' },
        { label: 'Layout', to: '/wms/layout', permission: 'warehouse.read' },
      ],
    },
    {
        label: 'Promosi',
        icon: 'tag',
        children: [
          { label: 'Diskon Produk', to: '/promotion/discount', permission: 'promotion_discount.read' },
          { label: 'Diskon Checkout', to: '/promotion/checkout', permission: 'promotion_checkout.read' },
          { label: 'Diskon Ongkir', to: '/promotion/shipping', permission: 'promotion_checkout.read' },
          { label: 'Produk Gratis', to: '/promotion/free-product', permission: 'promotion_product_free.read' },
        ],
    },
    {
      label: 'Kontak',
      icon: 'users',
      children: [
        { label: 'Pelanggan', to: '/contact/customer', permission: 'customer.read' },
        { label: 'Supplier', to: '/contact/supplier', permission: 'customer.read' },
      ],
    },
    {
      label: 'Inventory',
      icon: 'package-search',
      children: [
        { label: 'Stock', to: '/inventory/stock', permission: 'inventory.read' },
        { label: 'Stock Movement', to: '/inventory/movement', permission: 'inventory.read' },
        { label: 'Pemakaian Stock', to: '/inventory/usage', permission: 'stock_usage.read' },
        { label: 'Stock Opname', to: '/inventory/opname', permission: 'stock_opname.read' },
        { label: 'Penyesuaian Stock', to: '/inventory/adjustment', permission: 'stock_adjustment.read' },
        { label: 'Konversi Stock', to: '/inventory/conversion', permission: 'stock_conversion.read' },
        { label: 'Transfer Stock', to: '/inventory/transfer', permission: 'stock_transfer.read' },
      ],
    },
    {
      label: 'Laporan',
      icon: 'file-bar-chart',
      children: [
        { label: 'Laporan Stock', to: '/report/stock/stock-report', permission: 'report_stock.read' },
        { label: 'Laporan Penjualan', to: '/report/sales/overview', permission: 'report_sales.read' },
        { label: 'Laporan Keuangan', to: '/report/finance/overview', permission: 'report_finances.read' },
        { label: 'Laporan Retur', to: '/report/return/overview', permission: 'report_returns.read' },
      ],
    },
    {
      label: 'Dompet',
      icon: 'wallet',
      children: [
        { label: 'Saldo Dompet', to: '/wallet', permission: 'wallet.read' },
        { label: 'History Transaksi', to: '/wallet/history', permission: 'wallet.read' },
      ],
    },
    {
      label: 'Media',
      icon: 'image',
      to: '/media',
      permission: 'media.read',
    },
    {
      label: 'Monitor Worker',
      icon: 'activity',
      to: '/monitor/worker',
      permission: 'monitor.read',
    },
    {
      label: 'Pengaturan',
      icon: 'settings',
      to: '/setting/general',
      permission: ['option.read', 'option.update', 'store.read', 'bank.read', 'warehouse.read', 'integration.read', 'payment-method.read', 'user.read', 'role'],
    },
  ]
}
