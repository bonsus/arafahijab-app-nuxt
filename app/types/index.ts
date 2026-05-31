export interface Role {
  id: string
  business_id: string
  name: string
  permission: Record<string, boolean>
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
  CreatedAt: string
  UpdatedAt: string
  DeletedAt: string | null
  role?: Role
}

export interface LoginPayload {
  email: string
  password: string
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
