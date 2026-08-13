import type { AdminMenuItem } from '~/types/admin'

// Sidebar menu for the admin area. Distinct from the main app menu.
export function useAdminMenu(): AdminMenuItem[] {
  return [
    {
      label: 'Dashboard',
      icon: 'layout-dashboard',
      to: '/admin/dashboard',
    },
    {
      label: 'Manajemen Admin',
      icon: 'users',
      children: [
        { label: 'Admin', to: '/admin/admins' },
        { label: 'Role & Permission', to: '/admin/roles' },
      ],
    },
    {
      label: 'Langganan',
      icon: 'credit-card',
      children: [
        { label: 'Plan', to: '/admin/subscription/plans' },
        { label: 'Feature', to: '/admin/subscription/features' },
        { label: 'Add-on', to: '/admin/subscription/addons' },
        { label: 'Coupon', to: '/admin/subscription/coupons' },
        { label: 'Subscription', to: '/admin/subscription/subscriptions' },
        { label: 'Invoice', to: '/admin/subscription/invoices' },
        { label: 'Payment', to: '/admin/subscription/payments' },
        { label: 'Rekening Bank', to: '/admin/subscription/bank-accounts' },
        { label: 'Pembayaran Manual', to: '/admin/subscription/manual-payments' },
        { label: 'Email Settings', to: '/admin/subscription/email-settings' },
      ],
    },
    {
      label: 'Pengaturan',
      icon: 'settings',
      children: [
        { label: 'Payment Gateway', to: '/admin/payment-gateways' },
        { label: 'Options', to: '/admin/options' },
      ],
    },
  ]
}
