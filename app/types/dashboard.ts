export interface KpiMetric {
  value: number
  growth: number
}

export interface KpiSummary {
  revenue_today: KpiMetric
  orders_today: KpiMetric
  pending_orders: KpiMetric
  in_delivery_orders: KpiMetric
  fulfillment_sla: KpiMetric
  return_rate: KpiMetric
}

export type PipelineStatus = 'healthy' | 'warning' | 'critical'

export interface PipelineStage {
  count: number
  avg_wait_minutes?: number
  avg_process_minutes?: number
  status?: PipelineStatus
}

export interface PipelineData {
  pending: PipelineStage
  picking: PipelineStage
  packing: PipelineStage
  shipping: PipelineStage
  completed: PipelineStage
  problem: PipelineStage
}

export interface OrdersRevenueChart {
  labels: string[]
  orders: number[]
  revenue: number[]
  compare_orders?: number[]
  compare_revenue?: number[]
}

export interface FulfillmentChart {
  labels: string[]
  picking_avg: number[]
  packing_avg: number[]
  shipping_avg: number[]
}

export interface DashboardAlert {
  id: string
  type: 'critical' | 'warning' | 'info'
  title: string
  description: string
  created_at: string
  action_url: string
}

export interface DashboardActivity {
  id: string
  type: string
  message: string
  warehouse: string
  created_at: string
}

export interface DashboardActivityPage {
  data: DashboardActivity[]
  page: number
  per_page: number
  total_page: number
  total: number
}

export interface CustomerCategoryStat {
  category_id: string
  category_name: string
  total_orders: number
  total_revenue: number
  percentage: number
}

export interface ChannelStat {
  store_id: string
  store_name: string
  channel: string
  total_orders: number
  total_revenue: number
  percentage: number
}

export interface SkuStat {
  sku_id: string
  sku: string
  product_name: string
  variant: string
  total_orders: number
  total_qty: number
  total_revenue: number
  percentage: number
}

export interface ProductStat {
  product_id: string
  product_name: string
  total_orders: number
  total_qty: number
  total_revenue: number
  percentage: number
}

export interface ProductCategoryStat {
  category_id: string
  category_name: string
  total_orders: number
  total_qty: number
  total_revenue: number
  percentage: number
}
