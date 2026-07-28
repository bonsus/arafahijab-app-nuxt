export interface Role {
  id: string
  business_id: string
  name: string
  permission: string[]
  CreatedAt: string
  UpdatedAt: string
  DeletedAt: string | null
}

export interface User {
  id: string
  business_id: string
  role_id: string
  company: string
  name: string
  phone: string
  email: string
  type: string
  status: string
  email_status: string
  phone_status: string
  language: string
  is_cs?: boolean
  CreatedAt: string
  UpdatedAt: string
  DeletedAt: string | null
  role?: Role
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  company?: string
  name: string
  phone?: string
  email: string
  password: string
  password_confirmation: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface ApiResponse<T = unknown> {
  data: T
  message?: string
}

export interface ApiErrorResponse {
  error?: string
  message?: string
  errors?: Record<string, string[]>
}

export interface ApiError {
  statusCode: number
  message: string
  errors?: Record<string, string[]>
}

export interface Business {
  id: number
  name: string
  logo?: string
}

export interface BusinessProfile {
  id: string
  logo: string
  logo_label: string
  logo_document: string
  name: string
  description: string
  type: string
  email: string
  phone: string
  currency: string
  language: string
  timezone: string
  country: string
  province: string
  city: string
  district: string
  zipcode: string
  address: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: number
  title: string
  message: string
  read: boolean
  createdAt: string
}

export interface MenuItem {
  label: string
  icon?: string
  to?: string
  /** Permission(s) required to see this item. String = single, array = any-of. */
  permission?: string | string[]
  /** Only visible to users with is_cs = true. */
  csOnly?: boolean
  /** Only visible to the business owner. */
  ownerOnly?: boolean
  children?: MenuItem[]
}

// Sales Order Types
export interface OrderStore {
  id: string
  name: string
  source: string
}

export interface OrderWarehouse {
  id: string
  name: string
}

export interface OrderCustomer {
  id: string
  name: string
  phone: string
}

export interface OrderCustomerCategory {
  id: string
  name: string
}

export interface OrderStaff {
  id: string
  name: string
}

export interface OrderItem {
  id: string
  order_id: string
  category_id: string
  product_id: string
  sku_id: string
  category_name: string
  name: string
  sku: string
  variants: Record<string, string> | string[]
  weight: number
  qty: number
  price: string
  discount: string
  total: string
  cogs: string
  cogs_total: string
  qty_returned: number
  is_free: 'yes' | 'no'
}

export interface OrderAddress {
  id: string
  order_id: string
  name: string
  phone: string
  country: string
  province: string
  city: string
  district: string
  address: string
  zipcode: string
}

export interface OrderShipment {
  id: string
  order_id: string
  courier_code: string
  courier_name: string
  service_code: string
  service_name: string
  tracking_no: string
  note: string
  price: string
  discount: string
  total: string
  aggregator: string
}

export interface OrderPayment {
  id: string
  business_id: string
  order_id: string
  wallet_id: string
  external_id: string
  no: string
  date: string
  amount: string
  provider: string
  method: string
  bank_type: string
  bank_name: string
  account_number: string
  account_name: string
  file: string
  note: string
  created_at: string
  updated_at: string
}

export interface OrderLog {
  id: string
  order_id: string
  user_id: string
  name: string
  action: string
  note: string
  created_at: string
}

export interface SalesOrder {
  id: string
  business_id: string
  store_id: string
  warehouse_id: string
  customer_id: string
  customer_category_id: string
  external_id: string
  staff_id: string
  no: string
  date_created: string
  date_due: string
  date_processed: string | null
  date_shipped: string | null
  date_delivered: string | null
  date_completed: string | null
  date_cancelled: string | null
  date_paid: string | null
  qty: number
  qty_returned: number
  weight: number
  subtotal: string
  discount: string
  shipping_cost: string
  unique_code: string
  adjustment: string
  tax: string
  total: string
  admin_fee: string
  affiliate_fee: string
  commission_fee: string
  grand_total: string
  payment_total: string
  cogs_total: string
  cod: 'yes' | 'no'
  preorder: 'yes' | 'no'
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
  sub_status: string
  payment_status: 'unpaid' | 'paid' | 'refunded'
  payment_provider: 'internal' | 'midtrans' | 'xendit'
  payment_method: 'bank_transfer' | 'credit_card' | 'ewallet' | 'cod'
  note: string
  customer_note: string
  tags: string
  source: string
  created_at: string
  updated_at: string
  store: OrderStore
  warehouse: OrderWarehouse
  customer: OrderCustomer
  customer_category: OrderCustomerCategory
  staff: OrderStaff
  items: OrderItem[]
  address: OrderAddress
  shipment: OrderShipment
  payments: OrderPayment[]
  logs: OrderLog[]
}

// ---------------------------------------------------------------------------
// Billing / Subscription Types
// ---------------------------------------------------------------------------

export interface BillingFeature {
  id: string
  code: string
  name: string
  category: string
  data_type: string
  description: string
  created_at: string
  updated_at: string
}

export interface PlanVersionFeature {
  id: string
  plan_version_id: string
  feature_id: string
  value: string
  created_at: string
  feature: BillingFeature
}

export interface Plan {
  id: string
  code: string
  name: string
  description: string
  is_public: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  versions?: PlanVersion[]
}

export interface PlanVersion {
  id: string
  plan_id: string
  version: number
  billing_cycle: string
  currency: string
  price: number
  compare_price: number
  trial_days: number
  effective_from: string
  effective_until: string | null
  is_active: boolean
  created_at: string
  plan?: Plan
  features?: PlanVersionFeature[]
}

export type SubscriptionStatus =
  | 'pending_activation'
  | 'trial'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'cancelled'
  | 'expired'

export interface Subscription {
  id: string
  business_id: string
  plan_version_id: string
  status: SubscriptionStatus
  billing_cycle: string
  starts_at: string | null
  ends_at: string | null
  trial_ends_at: string | null
  grace_ends_at: string | null
  auto_renew: boolean
  cancel_at_period_end: boolean
  cancelled_at: string | null
  created_at: string
  updated_at: string
  plan_version?: PlanVersion
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  type: string
  description: string
  quantity: number
  unit_price: number
  subtotal: number
  created_at: string
}

export interface BillingTransaction {
  id: string
  payment_id: string
  gateway: string
  payment_method: string
  transaction_id: string
  external_id: string
  payment_url: string
  va_number: string
  qr_string: string
  expiry_at: string | null
  status: string
  request_payload?: Record<string, any> | null
  response_payload?: Record<string, any> | null
  webhook_payload?: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface BillingPayment {
  id: string
  invoice_id: string
  status: string
  total_paid: number
  created_at: string
  updated_at: string
  transactions?: BillingTransaction[]
}

export type InvoiceStatus = 'open' | 'paid' | 'void'

export interface Invoice {
  id: string
  business_id: string
  subscription_id: string
  invoice_number: string
  status: InvoiceStatus
  currency: string
  subtotal: number
  discount: number
  tax: number
  total: number
  due_date: string
  paid_at: string | null
  company_name: string
  billing_name: string
  billing_email: string
  billing_address: string
  plan_name: string
  billing_cycle: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  items?: InvoiceItem[]
  payments?: BillingPayment[]
}

export interface PlanChange {
  id: string
  subscription_id: string
  from_plan_version_id: string
  to_plan_version_id: string
  type: string
  effective_at: string
  status: string
  created_at: string
}

export interface PaymentMethod {
  code: string
  name: string
  category: string
}

export interface CheckoutResult {
  type: string
  subscription: Subscription | null
  invoice: Invoice | null
  plan_change: PlanChange | null
}

export interface Paginated<T> {
  data: T[]
  page: number
  perpage: number
  total_page: number
  total: number
}
