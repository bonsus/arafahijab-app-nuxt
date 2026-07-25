// Type definitions for the Admin area (apps/admin backend).
// Kept separate from the main app types to avoid coupling.

export interface AdminRole {
  id: string
  name: string
  /** ["*"] means full access, otherwise list of `modul.aksi` strings. */
  permission: string[]
  created_at?: string
  updated_at?: string
}

export interface Admin {
  id: string
  name: string
  username?: string
  email: string
  role_id: string
  status: 'active' | 'inactive' | 'deleted'
  created_at?: string
  updated_at?: string
  role?: AdminRole
}

export interface AdminLoginPayload {
  email: string
  password: string
}

/** POST /admin/auth/login returns token + admin at the top level (not wrapped). */
export interface AdminLoginResponse {
  token: string
  admin: Admin
}

/** Generic single-object response: { message?, data }. */
export interface AdminResponse<T = unknown> {
  data: T
  message?: string
}

/** Paginated list wrapper. Admins module uses `per_page`, Subscription uses `perpage`. */
export interface AdminPaginated<T = unknown> {
  data: T[]
  page: number
  perpage?: number
  per_page?: number
  total_page: number
  total: number
}

export interface AdminApiError {
  statusCode: number
  message: string
  errors?: Record<string, string[]>
}

// ---- Subscription & Billing ----

export type BillingCycle = 'monthly' | 'quarterly' | 'semi_annual' | 'yearly' | 'custom'
export type FeatureDataType = 'boolean' | 'number' | 'string' | 'unlimited'
export type SubscriptionStatus =
  | 'trial' | 'active' | 'grace_period' | 'past_due' | 'expired'
  | 'cancelled' | 'suspended' | 'paused' | 'pending_activation'
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
export type InvoiceItemType = 'plan' | 'addon' | 'setup_fee' | 'manual_charge' | 'discount' | 'credit'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded'
export type Gateway = 'midtrans' | 'doku'

export interface Feature {
  id: string
  code: string
  name: string
  category?: string
  data_type: FeatureDataType
  description?: string
  created_at?: string
  updated_at?: string
}

export interface PlanVersionFeature {
  id: string
  plan_version_id: string
  feature_id: string
  value: string
  created_at?: string
  feature?: Feature
}

export interface PlanVersion {
  id: string
  plan_id: string
  version: number
  billing_cycle: BillingCycle
  currency: string
  price: number
  compare_price?: number
  trial_days: number
  effective_from?: string
  effective_until?: string | null
  is_active: boolean
  created_at?: string
  plan?: Plan
  features?: PlanVersionFeature[]
}

export interface Plan {
  id: string
  code: string
  name: string
  description?: string
  is_public: boolean
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  versions?: PlanVersion[]
}

export interface Business {
  id: string
  name: string
  description?: string
  image?: string
  created_at?: string
  updated_at?: string
}

export interface Subscription {
  id: string
  business_id: string
  plan_version_id: string
  status: SubscriptionStatus
  billing_cycle: BillingCycle
  starts_at?: string
  ends_at?: string
  trial_ends_at?: string | null
  grace_ends_at?: string | null
  auto_renew: boolean
  cancel_at_period_end: boolean
  cancelled_at?: string | null
  created_at?: string
  updated_at?: string
  business?: Business
  plan_version?: PlanVersion
}

export interface SubscriptionEvent {
  id: string
  subscription_id: string
  event: string
  old_status: string
  new_status: string
  payload?: unknown
  created_by: string
  created_at?: string
}

export interface PlanChange {
  id: string
  subscription_id: string
  from_plan_version_id: string
  to_plan_version_id: string
  type: 'upgrade' | 'downgrade' | 'cycle'
  effective_at?: string
  status: 'pending' | 'applied' | 'cancelled'
  created_at?: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  type: InvoiceItemType
  description: string
  quantity: number
  unit_price: number
  subtotal: number
  created_at?: string
}

export interface Transaction {
  id: string
  payment_id: string
  gateway: Gateway
  payment_method: string
  transaction_id: string
  external_id: string
  payment_url?: string
  va_number?: string
  qr_string?: string
  expiry_at?: string
  status: 'pending' | 'paid' | 'failed' | 'expired'
  created_at?: string
  updated_at?: string
}

export interface Payment {
  id: string
  invoice_id: string
  status: PaymentStatus
  total_paid: number
  created_at?: string
  updated_at?: string
  transactions?: Transaction[]
}

export interface Invoice {
  id: string
  business_id: string
  subscription_id?: string
  invoice_number: string
  status: InvoiceStatus
  currency: string
  subtotal: number
  discount: number
  tax: number
  total: number
  due_date?: string
  paid_at?: string | null
  company_name?: string
  billing_name?: string
  billing_email?: string
  billing_address?: string
  plan_name?: string
  billing_cycle?: BillingCycle
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  items?: InvoiceItem[]
  payments?: Payment[]
}

export interface AdminMenuItem {
  label: string
  icon?: string
  to?: string
  permission?: string | string[]
  children?: AdminMenuItem[]
}
