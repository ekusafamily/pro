import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  ShoppingBag, DollarSign, AlertCircle, Package, ArrowUpRight, History,
  Users, Shield, Database, Truck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { store, LOGO_URL } from '../store';
import { UserRole, CreditStatus, Sale, Product, Customer } from '../types';

const StatCard = ({ title, value, icon: Icon, colorClass, trend }: { title: string, value: string | number, icon: React.ComponentType<{ size?: number | string, className?: string }>, colorClass: string, trend?: string }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-lg hover:shadow-indigo-500/5 group relative overflow-hidden">
    <div className="flex items-center justify-between mb-4 relative z-10">
      <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 group-hover:scale-110 transition-transform`}>
        <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
      </div>
      {trend && (
        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-emerald-100">
          <ArrowUpRight size={12} /> {trend}
        </span>
      )}
    </div>
    <div className="relative z-10">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = store.getCurrentUser();
  const isAdmin = user?.role === UserRole.ADMIN;

  const [allSales, setAllSales] = React.useState<Sale[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [salesData, productsData, customersData] = await Promise.all([
        store.getSales(),
        store.getProducts(),
        store.getCustomers()
      ]);
      setAllSales(salesData);
      setProducts(productsData);
      setCustomers(customersData);
      setLoading(false);
    };
    fetchData();
  }, []);

  const dashboardSales = isAdmin ? allSales : allSales.filter(s => s.user_id === user?.user_id);
  const totalRevenue = dashboardSales.reduce((acc, s) => acc + s.total_price, 0);
  const totalItemsSold = dashboardSales.reduce((acc, s) => acc + s.quantity, 0);
  const lowStockCount = products.filter(p => p.stock <= p.low_stock_alert).length;
  const overdueDebt = customers.reduce((acc, c) => acc + (c.status === CreditStatus.UNPAID ? c.amount_owed : 0), 0);

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dailyTotal = dashboardSales
      .filter(s => s.date.startsWith(dateStr))
      .reduce((acc, s) => acc + s.total_price, 0);
    return { name: d.toLocaleDateString('en-US', { weekday: 'short' }), total: dailyTotal };
  }).reverse();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative group cursor-pointer">
            <img src={LOGO_URL} alt="Kinthithe Store" className="h-16 w-16 object-contain rounded-xl shadow-sm border border-slate-200 bg-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Welcome, <span className="text-indigo-600">{user?.full_name?.split(' ')[0] || user?.username}</span></h2>
            <p className="text-slate-500 font-bold text-xs flex items-center gap-2 uppercase tracking-wide">
              {isAdmin ? 'Administrator Dashboard' : 'Retail Terminal'}
            </p>
          </div>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-3 shadow-sm">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">System Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Gross Revenue" value={`KES ${totalRevenue.toLocaleString()}`} icon={DollarSign} colorClass="bg-indigo-600" trend="12.4%" />
        <StatCard title="Units Sold" value={totalItemsSold.toLocaleString()} icon={ShoppingBag} colorClass="bg-violet-600" trend="5.2%" />
        <StatCard title="Low Stock" value={lowStockCount} icon={Package} colorClass="bg-amber-500" />
        <StatCard title="Outstanding Credit" value={`KES ${overdueDebt.toLocaleString()}`} icon={AlertCircle} colorClass="bg-rose-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h3 className="text-lg font-black text-slate-900">Revenue Analytics</h3>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Last 7 Days Performance</p>
            </div>
          </div>
          <div className="h-[350px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    padding: '12px',
                    fontFamily: 'inherit'
                  }}
                  itemStyle={{ color: '#4f46e5', fontWeight: 700, fontSize: '13px' }}
                  labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}
                />
                <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-slate-900 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden flex-1 group">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>

            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black mb-6 tracking-tight">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => navigate('/users')} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 flex flex-col items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] group/btn">
                    <Users className="text-slate-400 group-hover/btn:text-white transition-colors" size={24} />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 group-hover/btn:text-white">Users</span>
                  </button>
                  <button onClick={() => navigate('/inventory')} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 flex flex-col items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] group/btn">
                    <Package className="text-slate-400 group-hover/btn:text-white transition-colors" size={24} />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 group-hover/btn:text-white">Inventory</span>
                  </button>
                  <button onClick={() => navigate('/stockin')} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 flex flex-col items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] group/btn">
                    <Database className="text-slate-400 group-hover/btn:text-white transition-colors" size={24} />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 group-hover/btn:text-white">Stock In</span>
                  </button>
                  <button onClick={() => navigate('/distributors')} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 flex flex-col items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] group/btn">
                    <Truck className="text-slate-400 group-hover/btn:text-white transition-colors" size={24} />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 group-hover/btn:text-white">Suppliers</span>
                  </button>
                </div>
              </div>
              <button onClick={() => navigate('/reports')} className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-3">
                <span>View Full Audit</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <History size={20} />
            </div>
            Recent Transactions
          </h3>
          <button className="text-indigo-600 font-bold text-xs uppercase tracking-widest hover:text-indigo-700 transition-colors">View All</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardSales.slice(-4).reverse().map((sale, i) => {
            const p = products.find(prod => prod.product_id === sale.product_id);
            return (
              <div key={i} className="flex flex-col p-5 bg-slate-50/50 rounded-2xl border border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-lg hover:shadow-indigo-100/10 transition-all group cursor-default">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm border border-slate-100 overflow-hidden">
                    {p?.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="text-slate-300" size={20} />
                    )}
                  </div>
                  <span className="px-2 py-1 bg-white text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-50">
                    {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 truncate leading-tight mb-1">{p?.name || 'Unknown Item'}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-3">#{sale.sale_id.slice(0, 6)}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400">Total</span>
                    <span className="text-sm font-black text-indigo-600">KES {sale.total_price.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {dashboardSales.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <ShoppingBag size={24} />
              </div>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No activities today</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};