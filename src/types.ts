
export enum UserRole {
  ADMIN = 'admin',
  STAFF = 'staff',
  DISTRIBUTOR = 'distributor',
  CUSTOMER = 'customer'
}

export enum UserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled'
}

export enum SaleType {
  CASH = 'cash',
  CREDIT = 'credit',
  MPESA = 'mpesa'
}

export enum CreditStatus {
  PAID = 'paid',
  UNPAID = 'unpaid'
}

export enum PaymentStatus {
  PAID = 'paid',
  UNPAID = 'unpaid'
}

export interface User {
  user_id: string;
  username: string;
  full_name?: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  last_login?: string;
  avatar_url?: string;
}

export interface Product {
  product_id: string;
  name: string;
  category: string;
  unit?: string; // e.g. 2kg, 500ml, 1 pc
  manufacturer?: string; // Example brand/source
  price: number; // Selling price
  buying_price: number; // Admin viewable buying price
  stock: number;
  low_stock_alert: number;
  image_url?: string; // Base64 or URL for product photo
}

export interface Sale {
  sale_id: string;
  product_id: string;
  user_id: string;
  quantity: number;
  total_price: number;
  sale_type: SaleType;
  customer_id?: string;
  date: string;
  loyalty_points: number;
  payment_ref?: string;
  amount_paid?: number;
  change_amount?: number;
}

export interface Customer {
  customer_id: string;
  full_name: string;
  phone: string;
  address: string;
  due_date: string;
  amount_owed: number;
  status: CreditStatus;
  created_at: string;
  loyalty_points: number;
}

export interface StockBatch {
  batch_id: string;
  product_id: string;
  quantity: number;
  mfg_date: string;
  expiry_date: string;
  batch_no: string;
}

export interface StockIn {
  stock_in_id: string;
  reference_no: string;
  distributor_id: string;
  product_id: string;
  received_by: string;
  qty_received: number;
  qty_accepted: number;
  qty_rejected: number;
  rejection_reason?: string;
  unit_cost: number;
  total_cost: number;
  prev_stock: number;
  new_stock: number;
  delivery_note_no?: string;
  invoice_no?: string;
  mfg_date: string;
  expiry_date: string;
  batch_no: string;
  date: string;
}

export interface Distributor {
  distributor_id: string;
  name: string;
  kra_pin: string;
  phone: string;
  address: string;
  main_products?: string; // Categories or brands supplied
  total_owed: number;
  payment_status: PaymentStatus;
}

export interface Alert {
  alert_id: string;
  type: 'credit overdue' | 'low stock' | 'unpaid distributor' | 'password reset' | 'expired product' | 'near expiry';
  reference_id: string;
  message: string;
  seen: boolean;
  date: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  timestamp: string;
}
