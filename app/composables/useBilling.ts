import type { SubscriptionStatus, InvoiceStatus } from '~/types'

interface BadgeConfig {
  label: string
  cls: string
}

export const SUBSCRIPTION_STATUS: Record<string, BadgeConfig> = {
  pending_activation: { label: 'Menunggu Aktivasi', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  trial: { label: 'Trial', cls: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' },
  active: { label: 'Aktif', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  past_due: { label: 'Jatuh Tempo', cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  grace_period: { label: 'Masa Tenggang', cls: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  cancelled: { label: 'Dibatalkan', cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
  expired: { label: 'Kedaluwarsa', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
}

export const INVOICE_STATUS: Record<string, BadgeConfig> = {
  open: { label: 'Belum Dibayar', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  paid: { label: 'Lunas', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  void: { label: 'Dibatalkan', cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
}

export const TRANSACTION_STATUS: Record<string, BadgeConfig> = {
  pending: { label: 'Menunggu', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  paid: { label: 'Terbayar', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  failed: { label: 'Gagal', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  expired: { label: 'Kedaluwarsa', cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
}

export const BILLING_CYCLE_LABEL: Record<string, string> = {
  monthly: 'Bulanan',
  quarterly: '3 Bulanan',
  semi_annual: '6 Bulanan',
  yearly: 'Tahunan',
}

export function subscriptionBadge(status: SubscriptionStatus | string): BadgeConfig {
  return SUBSCRIPTION_STATUS[status] || { label: status, cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' }
}

export function invoiceBadge(status: InvoiceStatus | string): BadgeConfig {
  return INVOICE_STATUS[status] || { label: status, cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' }
}

export function transactionBadge(status: string): BadgeConfig {
  return TRANSACTION_STATUS[status] || { label: status, cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' }
}

export function billingCycleLabel(cycle: string): string {
  return BILLING_CYCLE_LABEL[cycle] || cycle
}
