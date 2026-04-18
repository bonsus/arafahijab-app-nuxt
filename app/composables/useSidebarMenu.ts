import type { MenuItem } from '~/types'

export function useSidebarMenu(): MenuItem[] {
  return [
    {
      label: 'Dashboard',
      icon: 'layout-dashboard',
      to: '/dashboard',
    },
    {
      label: 'Penjualan',
      icon: 'shopping-cart',
      children: [
        { label: 'Order', to: '/penjualan/order' },
        { label: 'Retur', to: '/penjualan/retur' },
        { label: 'Non-Sales', to: '/penjualan/non-sales' },
      ],
    },
    {
      label: 'Pembelian',
      icon: 'package-check',
      children: [
        { label: 'Purchase Order', to: '/pembelian/purchase-order' },
        { label: 'Penerimaan', to: '/pembelian/penerimaan' },
      ],
    },
    {
      label: 'Produk',
      icon: 'box',
      children: [
        { label: 'Master Produk', to: '/product/masters' },
        { label: 'Kategori Produk', to: '/product/categories' },
        { label: 'Produk Binding', to: '/product/binding' },
        { label: 'Produk Integrations', to: '/product/integrations' },
      ],
    },
    {
        label: 'Promosi',
        icon: 'tag',
        children: [
          { label: 'Diskon Produk', to: '/promotion/discount' },
          { label: 'Diskon Checkout', to: '/promotion/checkout' },
          { label: 'Produk Gratis', to: '/promotion/free-product' },
          { label: 'Diskon Ongkir', to: '/promotion/shipping' },
        ],
    },
    {
      label: 'Kontak',
      icon: 'users',
      children: [
        { label: 'Pelanggan', to: '/contact/customer' },
        { label: 'Supplier', to: '/contact/supplier' },
      ],
    },
    {
      label: 'Inventory',
      icon: 'package-search',
      children: [
        { label: 'Stock', to: '/inventory/stock' },
        { label: 'Riwayat Stock Movement', to: '/inventory/movement' },
        { label: 'Konversi Stock', to: '/inventory/konversi' },
        { label: 'Pindah Gudang Stock', to: '/inventory/pindah-gudang' },
        { label: 'Penyesuaian Stock', to: '/inventory/penyesuaian' },
        { label: 'Stock Opname', to: '/inventory/opname' },
      ],
    },
    {
      label: 'Laporan',
      icon: 'file-bar-chart',
      children: [
        { label: 'Laporan Penjualan', to: '/laporan/penjualan' },
        { label: 'Laporan Return', to: '/laporan/return' },
        { label: 'Laporan Pembelian', to: '/laporan/pembelian' },
        { label: 'Laporan Stock', to: '/laporan/stock' },
      ],
    },
    {
      label: 'Media',
      icon: 'image',
      to: '/media',
    },
    {
      label: 'WMS',
      icon: 'warehouse',
      children: [ 
        { label: 'Lokasi', to: '/wms/locations' },
        { label: 'Layout', to: '/wms/layout' },
      ],
    },
    {
      label: 'Pengaturan',
      icon: 'settings',
      to: '/setting/general' 
    },
  ]
}
