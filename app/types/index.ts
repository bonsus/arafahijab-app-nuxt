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
