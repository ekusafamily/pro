
import {
  User, Product, Sale, Customer,
  Distributor, Alert, AuditLog, SaleType, StockIn, StockBatch
} from './types';
import { supabase } from './lib/supabase';

// Official Logo - Provided by User
export const LOGO_URL = "/logo.png";

interface SRMSData {
  currentUser: User | null;
}



export class SRMSStore {
  private data: SRMSData = { currentUser: null };

  constructor() {
    const saved = localStorage.getItem('srms_user');
    if (saved) {
      this.data.currentUser = JSON.parse(saved);
    }
  }

  // --- Auth ---
  async login(username: string, password: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .eq('status', 'active')
      .single();

    if (error || !data) return null;

    const user: User = data;
    this.data.currentUser = user;
    localStorage.setItem('srms_user', JSON.stringify(user));
    await this.logAction(user.user_id, 'Terminal Access Authenticated');
    return user;
  }

  logout() {
    if (this.data.currentUser) {
      this.logAction(this.data.currentUser.user_id, 'Terminal Session Terminated');
    }
    this.data.currentUser = null;
    localStorage.removeItem('srms_user');
  }

  getCurrentUser() { return this.data.currentUser; }

  // --- Products ---
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    if (error) return [];
    return data;
  }

  async addProduct(product: Omit<Product, 'product_id'>): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();
    if (error) return null;
    return data;
  }

  async addBulkProducts(products: Omit<Product, 'product_id'>[]) {
    const { error } = await supabase.from('products').insert(products);
    if (error) throw error;
  }

  async updateProduct(id: string, updates: Partial<Product>) {
    await supabase.from('products').update(updates).eq('product_id', id);
  }

  async deleteProduct(id: string) {
    await supabase.from('products').delete().eq('product_id', id);
  }

  // --- Sales ---
  async getSales(): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: false });
    if (error) return [];
    return data;
  }

  async recordSale(saleData: Omit<Sale, 'sale_id' | 'date' | 'total_price' | 'user_id' | 'loyalty_points'>, customerData?: Omit<Customer, 'customer_id' | 'due_date' | 'status' | 'created_at' | 'amount_owed' | 'loyalty_points'>) {
    if (!this.data.currentUser) return null;

    // Fetch product to calculate price and check stock
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('product_id', saleData.product_id)
      .single();

    if (!product || product.stock < saleData.quantity) return null;

    // Simplified price calculation for now (real logic would involve batches)
    const totalSalePrice = product.price * saleData.quantity;
    const pointsEarned = Math.floor(totalSalePrice / 200);

    let customer_id = saleData.customer_id;
    if (customerData && customerData.phone) {
      // 1. Check if customer exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', customerData.phone)
        .single();

      if (existingCustomer) {
        customer_id = existingCustomer.customer_id;

        // 2. Prepare Updates
        const newLoyaltyPoints = (existingCustomer.loyalty_points || 0) + pointsEarned;
        let newAmountOwed = existingCustomer.amount_owed;
        let newStatus = existingCustomer.status;

        // ONLY increase debt if Credit Sale
        if (saleData.sale_type === SaleType.CREDIT) {
          newAmountOwed += totalSalePrice;
          newStatus = 'unpaid';
        }

        await supabase.from('customers').update({
          amount_owed: newAmountOwed,
          status: newStatus,
          loyalty_points: newLoyaltyPoints
        }).eq('customer_id', customer_id);

      } else {
        // 3. New Customer
        const initialDebt = saleData.sale_type === SaleType.CREDIT ? totalSalePrice : 0;
        const initialStatus = saleData.sale_type === SaleType.CREDIT ? 'unpaid' : 'paid';

        const { data: newCust } = await supabase
          .from('customers')
          .insert([{
            ...customerData,
            amount_owed: initialDebt,
            status: initialStatus,
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days default
            loyalty_points: pointsEarned
          }])
          .select()
          .single();
        if (newCust) customer_id = newCust.customer_id;
      }
    }

    const salePayload = {
      ...saleData,
      user_id: this.data.currentUser.user_id,
      total_price: totalSalePrice,
      customer_id,
      loyalty_points: pointsEarned
    };
    console.log("Saving Sale to DB:", salePayload); // DEBUG PAYLOAD

    const { data: newSale, error: saleError } = await supabase
      .from('sales')
      .insert([salePayload])
      .select()
      .single();

    if (saleError) {
      console.error("SUPABASE ERROR:", saleError); // DEBUG ERROR
      return null;
    }

    if (newSale) {
      // Update product stock
      await supabase.from('products').update({ stock: product.stock - saleData.quantity }).eq('product_id', product.product_id);
      await this.checkAlerts();
    }

    return newSale;
  }

  // --- User Management ---
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*').order('username');
    if (error) return [];
    return data;
  }

  async addUser(user: Omit<User, 'user_id' | 'created_at'>) {
    await supabase.from('users').insert([{
      ...user,
      password: user.username,
      avatar_url: user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
    }]);
  }

  async updateUser(id: string, updates: Partial<User>) {
    await supabase.from('users').update(updates).eq('user_id', id);
  }

  async deleteUser(id: string) {
    if (id === '1') return; // Protect root admin
    await supabase.from('users').delete().eq('user_id', id);
  }

  // --- Customers ---
  async getCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase.from('customers').select('*').order('full_name');
    if (error) return [];
    return data;
  }

  async addCustomer(cust: Omit<Customer, 'customer_id' | 'status' | 'created_at' | 'loyalty_points'>) {
    await supabase.from('customers').insert([{
      ...cust,
      status: 'unpaid',
      loyalty_points: 0
    }]);
  }

  async deleteCustomer(id: string) {
    await supabase.from('customers').delete().eq('customer_id', id);
  }

  async recordCustomerPayment(id: string, amount: number) {
    const { data: cust } = await supabase.from('customers').select('*').eq('customer_id', id).single();
    if (cust) {
      const newOwed = Math.max(0, cust.amount_owed - amount);
      await supabase.from('customers').update({
        amount_owed: newOwed,
        status: newOwed === 0 ? 'paid' : 'unpaid'
      }).eq('customer_id', id);
    }
  }

  // --- Distributors ---
  async getDistributors(): Promise<Distributor[]> {
    const { data, error } = await supabase.from('distributors').select('*').order('name');
    if (error) return [];
    return data;
  }

  async addDistributor(dist: Omit<Distributor, 'distributor_id' | 'total_owed' | 'payment_status'>): Promise<Distributor | null> {
    const { data, error } = await supabase
      .from('distributors')
      .insert([{ ...dist, total_owed: 0, payment_status: 'paid' }])
      .select()
      .single();
    if (error) return null;
    return data;
  }

  async updateDistributor(id: string, updates: Partial<Distributor>) {
    await supabase.from('distributors').update(updates).eq('distributor_id', id);
  }

  async deleteDistributor(id: string) {
    await supabase.from('distributors').delete().eq('distributor_id', id);
  }

  async recordDistributorPayment(id: string, amount: number) {
    const { data: dist } = await supabase.from('distributors').select('*').eq('distributor_id', id).single();
    if (dist) {
      const newOwed = Math.max(0, dist.total_owed - amount);
      await supabase.from('distributors').update({
        total_owed: newOwed,
        payment_status: newOwed === 0 ? 'paid' : 'unpaid'
      }).eq('distributor_id', id);
      return true;
    }
    return false;
  }

  // --- Stock In ---
  async getStockIns(): Promise<StockIn[]> {
    const { data, error } = await supabase.from('stock_ins').select('*').order('date', { ascending: false });
    if (error) return [];
    return data;
  }

  async addStockIn(siData: Omit<StockIn, 'stock_in_id' | 'reference_no' | 'date' | 'total_cost' | 'prev_stock' | 'new_stock' | 'received_by'>) {
    if (!this.data.currentUser) throw new Error("Unauthorized");

    const { data: product } = await supabase.from('products').select('*').eq('product_id', siData.product_id).single();
    if (!product) throw new Error("Product not found");

    const prev_stock = product.stock;
    const new_stock = prev_stock + siData.qty_accepted;
    const total_cost = siData.qty_received * siData.unit_cost;

    const { data: newStockIn } = await supabase
      .from('stock_ins')
      .insert([{
        ...siData,
        reference_no: 'REF-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        total_cost,
        prev_stock,
        new_stock,
        received_by: this.data.currentUser.full_name || this.data.currentUser.username
      }])
      .select()
      .single();

    if (newStockIn) {
      await supabase.from('products').update({ stock: new_stock }).eq('product_id', product.product_id);
      await supabase.from('stock_batches').insert([{
        product_id: siData.product_id,
        quantity: siData.qty_accepted,
        mfg_date: siData.mfg_date,
        expiry_date: siData.expiry_date,
        batch_no: siData.batch_no || newStockIn.reference_no
      }]);

      const { data: dist } = await supabase.from('distributors').select('*').eq('distributor_id', siData.distributor_id).single();
      if (dist) {
        await supabase.from('distributors').update({
          total_owed: dist.total_owed + total_cost,
          payment_status: 'unpaid'
        }).eq('distributor_id', dist.distributor_id);
      }
      await this.checkAlerts();
    }
    return newStockIn;
  }

  async getBatches(): Promise<StockBatch[]> {
    const { data, error } = await supabase.from('stock_batches').select('*');
    if (error) return [];
    return data;
  }

  // --- Alerts ---
  async getAlerts(): Promise<Alert[]> {
    const { data, error } = await supabase.from('alerts').select('*').order('date', { ascending: false });
    if (error) return [];
    return data;
  }

  async markAlertSeen(id: string) {
    await supabase.from('alerts').update({ seen: true }).eq('alert_id', id);
  }

  private async checkAlerts() {
    const { data: products } = await supabase.from('products').select('*');
    if (!products) return;

    for (const p of products) {
      if (p.stock <= p.low_stock_alert) {
        await this.createAlert('low stock', p.product_id, `Low stock for ${p.name}: only ${p.stock} units remaining.`);
      }
    }
  }

  private async createAlert(type: Alert['type'], refId: string, msg: string) {
    const { data: exists } = await supabase
      .from('alerts')
      .select('*')
      .eq('reference_id', refId)
      .eq('type', type)
      .eq('seen', false)
      .maybeSingle();

    if (!exists) {
      await supabase.from('alerts').insert([{
        type,
        reference_id: refId,
        message: msg,
        seen: false
      }]);
    }
  }

  // --- Audit Logs ---
  async getAuditLogs(): Promise<AuditLog[]> {
    const { data, error } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
    if (error) return [];
    return data;
  }

  private async logAction(userId: string, action: string) {
    await supabase.from('audit_logs').insert([{ user_id: userId, action }]);
  }

  // --- Image Upload ---
  async uploadProductImage(file: File): Promise<string | null> {
    const fileName = `${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (error) return null;

    const { data: publicUrl } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return publicUrl.publicUrl;
  }
}

export const store = new SRMSStore();

