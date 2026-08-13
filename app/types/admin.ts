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
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible' | 'expired'
export type InvoiceItemType = 'plan' | 'addon' | 'setup_fee' | 'manual_charge' | 'discount' | 'credit'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded'
export type Gateway = 'midtrans' | 'doku' | 'faspay' | 'singapay' | 'gapura'
export type DiscountType = 'nominal' | 'percentage'
export type PlanChangeType = 'upgrade' | 'downgrade' | 'cycle'
export type PlanChangeStatus = 'pending' | 'applied' | 'cancelled'

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
  duration_month?: number
  currency: string
  price: number
  compare_price?: number
  discount?: number
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
  type: PlanChangeType
  effective_at?: string
  status: PlanChangeStatus
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

// ---- Coupon (Discount) ----

export interface Coupon {
  id: string
  code: string
  name: string
  discount_type: DiscountType
  value: number
  max_discount: number
  plan_id?: string
  billing_cycle?: BillingCycle | ''
  valid_from?: string | null
  valid_until?: string | null
  max_uses: number
  used_count: number
  is_active: boolean
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

// ---- Add-on ----

export interface Addon {
  id: string
  code: string
  name: string
  description?: string
  feature_code: string
  limit_value: number
  price: number
  currency: string
  is_active: boolean
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

// ---- Payment Gateway Settings ----

export type GatewayEnvironment = 'sandbox' | 'production'
export type PaymentMethodCategory =
  | 'va' | 'ewallet' | 'qris' | 'card' | 'retail'
  | 'paylater' | 'ebanking' | 'directdebit' | 'ecommerce'

export interface GatewayCredential {
  key: string
  label: string
  /** Secret values are never returned by the API. */
  secret: boolean
  /** Whether a value is already stored. */
  is_set: boolean
  /** Always empty for secret fields. */
  value: string
}

export interface GatewayMethod {
  code: string
  name: string
  category: PaymentMethodCategory | string
  is_active: boolean
}

export interface PaymentGateway {
  code: string
  name: string
  is_active: boolean
  environment: GatewayEnvironment
  credentials: GatewayCredential[]
  methods: GatewayMethod[]
}

// ---- Email Settings (A.12) ----

export interface EmailSettings {
  enabled: boolean
  host: string
  port: number
  username: string
  password?: string
  from: string
  from_name: string
}

// ---- Manual Bank Transfer (A.10 / A.11 / B.8) ----
export type ManualPaymentStatus =
  | 'pending' | 'waiting_verification' | 'approved' | 'rejected' | 'expired' | 'cancelled'

export interface BankAccount {
  id: string
  bank_code: string
  bank_name: string
  account_name: string
  account_number: string
  branch?: string
  logo_url?: string
  description?: string
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface ManualPaymentConfirmation {
  id: string
  payment_id: string
  sender_bank_name: string
  sender_account_name: string
  transfer_amount: number
  transfer_date?: string
  transfer_time?: string
  proof_file_url: string
  note?: string
  status: ManualPaymentStatus
  rejection_reason?: string
  rejection_note?: string
  bank_account?: {
    bank_name: string
    account_name: string
    account_number: string
  }
  created_at?: string
}

export interface ManualPayment {
  id: string
  invoice_id: string
  payment_method: string
  status: ManualPaymentStatus
  total_paid: number
  expired_at?: string
  rejection_reason?: string
  rejection_note?: string
  created_at?: string
  updated_at?: string
  invoice?: {
    id: string
    invoice_number: string
    total: number
    business_id?: string
  }
  confirmations?: ManualPaymentConfirmation[]
}

export interface AdminMenuItem {
  label: string
  icon?: string
  to?: string
  permission?: string | string[]
  children?: AdminMenuItem[]
}
