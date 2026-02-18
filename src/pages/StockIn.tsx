
import React, { useState } from 'react';
import {
  ArrowRight, ShieldCheck, AlertCircle, X, Filter,
  TrendingUp, BarChart3, User, Plus, Search, Calendar, Truck, Package
} from 'lucide-react';
import { store } from '../store';
import { StockIn, UserRole, Distributor, Product } from '../types';

export const StockInPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allStockIns, setAllStockIns] = useState<StockIn[]>([]);
  const [loading, setLoading] = useState(true);

  const user = store.getCurrentUser();
  const isAdmin = user?.role === UserRole.ADMIN;

  const fetchData = async () => {
    setLoading(true);
    const [distData, prodData, siData] = await Promise.all([
      store.getDistributors(),
      store.getProducts(),
      store.getStockIns()
    ]);
    setDistributors(distData);
    setProducts(prodData);
    setAllStockIns(siData);
    setLoading(false);
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const stockIns = allStockIns.filter(s => {
    const p = products.find(prod => prod.product_id === s.product_id);
    const d = distributors.find(dist => dist.distributor_id === s.distributor_id);
    const matchStr = (p?.name || '') + (d?.name || '') + s.reference_no;
    return matchStr.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const [formData, setFormData] = useState<Omit<StockIn, 'stock_in_id' | 'reference_no' | 'date' | 'total_cost' | 'prev_stock' | 'new_stock' | 'received_by'>>({
    distributor_id: '',
    product_id: '',
    qty_received: 0,
    qty_accepted: 0,
    qty_rejected: 0,
    unit_cost: 0,
    rejection_reason: '',
    delivery_note_no: '',
    invoice_no: '',
    batch_no: '',
    mfg_date: '',
    expiry_date: ''
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.distributor_id || !formData.product_id) {
      setError("Please select both a supplier and a product.");
      return;
    }

    if (!formData.mfg_date || !formData.expiry_date) {
      setError("Manufacturing and Expiry dates are mandatory.");
      return;
    }

    try {
      await store.addStockIn(formData);
      setShowAddModal(false);
      setFormData({
        distributor_id: '',
        product_id: '',
        qty_received: 0,
        qty_accepted: 0,
        qty_rejected: 0,
        unit_cost: 0,
        rejection_reason: '',
        delivery_note_no: '',
        invoice_no: '',
        batch_no: '',
        mfg_date: '',
        expiry_date: ''
      });
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const totalIntakeValue = stockIns.reduce((acc, s) => acc + s.total_cost, 0);
  const totalItemsReceived = stockIns.reduce((acc, s) => acc + s.qty_accepted, 0);
  const totalRejections = stockIns.reduce((acc, s) => acc + s.qty_rejected, 0);

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Stock Intake</h2>
          <p className="text-slate-500 font-bold text-lg">Log and track inventory entries with batch integrity.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 uppercase tracking-widest"
        >
          <Plus size={20} /> Record Intake
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl flex items-center gap-6">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm"><BarChart3 size={28} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Intake Value</p>
            <h4 className="text-2xl font-black text-slate-900">KES {totalIntakeValue.toLocaleString()}</h4>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl flex items-center gap-6">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm"><TrendingUp size={28} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Accepted Items</p>
            <h4 className="text-2xl font-black text-slate-900">{totalItemsReceived.toLocaleString()} <span className="text-sm text-slate-400 font-bold">Units</span></h4>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl flex items-center gap-6">
          <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl shadow-sm"><AlertCircle size={28} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rejected Items</p>
            <h4 className="text-2xl font-black text-slate-900">{totalRejections.toLocaleString()} <span className="text-sm text-slate-400 font-bold">Units</span></h4>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="relative w-full md:w-[480px]">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by Ref #, Supplier or Product..."
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 font-bold text-slate-900 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button className="p-4 hover:bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 transition-colors"><Filter size={20} /></button>
            <button className="p-4 hover:bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 transition-colors"><Calendar size={20} /></button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#f7f6f5] text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-6">Batch / Ref</th>
                <th className="px-8 py-6">Product Details</th>
                <th className="px-8 py-6">Validity Dates</th>
                <th className="px-8 py-6">Quantity Validation</th>
                <th className="px-8 py-6">Stock Update</th>
                {isAdmin && <th className="px-8 py-6 text-right">Cost Analysis</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stockIns.slice().reverse().map(si => {
                const p = products.find(prod => prod.product_id === si.product_id);
                const d = distributors.find(dist => dist.distributor_id === si.distributor_id);
                const isExpired = new Date(si.expiry_date) <= new Date();

                return (
                  <tr key={si.stock_in_id} className="hover:bg-slate-50 transition-all cursor-default group">
                    <td className="px-8 py-6">
                      <p className="font-mono font-black text-slate-900 text-xs bg-slate-100 px-2 py-1 rounded-lg w-fit">{si.batch_no || 'N/A'}</p>
                      <p className="text-[10px] text-indigo-400 font-bold mt-2 uppercase tracking-wide">{si.reference_no}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-50 rounded-2xl text-slate-300 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-colors"><Truck size={20} /></div>
                        <div>
                          <p className="font-black text-slate-900 leading-none mb-1 text-sm">{p?.name || 'Unknown'}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">From: {d?.name || 'Unknown'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MFG: {new Date(si.mfg_date).toLocaleDateString()}</span>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isExpired ? 'text-rose-600' : 'text-emerald-600'}`}>EXP: {new Date(si.expiry_date).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-700">Rec: {si.qty_received} → Acc: {si.qty_accepted}</span>
                        {si.qty_rejected > 0 && (
                          <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-lg w-fit flex items-center gap-1 mt-1">
                            <AlertCircle size={10} /> {si.qty_rejected} Rejected
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3 bg-slate-50 w-fit px-3 py-1.5 rounded-xl border border-slate-100">
                        <span className="text-xs text-slate-400 font-bold">{si.prev_stock}</span>
                        <ArrowRight size={12} className="text-slate-300" />
                        <span className="text-sm font-black text-emerald-600">{si.new_stock}</span>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-8 py-6 text-right">
                        <p className="text-sm font-black text-slate-900">KES {si.total_cost.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">@ KES {si.unit_cost.toLocaleString()} / unit</p>
                      </td>
                    )}
                  </tr>
                );
              })}
              {stockIns.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <Package size={48} className="text-slate-300" />
                      <p className="font-black text-slate-900 uppercase tracking-widest text-xs">No Intake History Logged</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Intake Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/20">
            {/* Sidebar Branding */}
            <div className="hidden md:flex md:w-1/3 bg-slate-900 p-12 text-white flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <div className="bg-indigo-600 p-4 rounded-2xl w-fit mb-8 shadow-xl">
                  <Package className="text-white" size={32} />
                </div>
                <h3 className="text-3xl font-black mb-6 leading-tight">Stock Intake Terminal</h3>
                <p className="text-indigo-200 text-sm leading-relaxed font-medium">Mandatory batch tracking and expiry validation active for all incoming operational assets.</p>
              </div>
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3 text-emerald-400 text-xs font-bold uppercase tracking-widest p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                  <ShieldCheck size={18} /> Quality Integrity Active
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-xs font-bold p-2">
                  <User size={16} /> Operator: {user?.username}
                </div>
              </div>
              {/* Decorative gradients */}
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl"></div>
              <div className="absolute -left-20 -top-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl"></div>
            </div>

            {/* Form Content */}
            <div className="flex-1 p-10 md:p-14 overflow-y-auto max-h-[90vh] custom-scrollbar">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight">New Stock Entry</h4>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Enter batch details below</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
              </div>

              {error && (
                <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-in slide-in-from-top-2">
                  <AlertCircle size={20} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier / Distributor</label>
                    <div className="relative">
                      <select
                        required
                        className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold text-sm appearance-none text-slate-900"
                        value={formData.distributor_id}
                        onChange={e => setFormData({ ...formData, distributor_id: e.target.value })}
                      >
                        <option value="">Select Supplier...</option>
                        {distributors.map(d => <option key={d.distributor_id} value={d.distributor_id}>{d.name}</option>)}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Truck size={16} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Designation</label>
                    <div className="relative">
                      <select
                        required
                        className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold text-sm appearance-none text-slate-900"
                        value={formData.product_id}
                        onChange={e => setFormData({ ...formData, product_id: e.target.value })}
                      >
                        <option value="">Select Product...</option>
                        {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name} (Current: {p.stock})</option>)}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Package size={16} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Manufacturing Date</label>
                    <input
                      type="date" required
                      className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 text-sm font-bold text-slate-900"
                      value={formData.mfg_date}
                      onChange={e => setFormData({ ...formData, mfg_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Expiry Date</label>
                    <input
                      type="date" required
                      className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 text-sm font-bold text-slate-900"
                      value={formData.expiry_date}
                      onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qty Received</label>
                    <input
                      type="number" required min="0"
                      className="w-full px-4 py-3 bg-white border-0 rounded-xl outline-none focus:ring-4 focus:ring-indigo-600/10 text-xl font-black text-slate-900 text-center"
                      value={formData.qty_received}
                      onChange={e => setFormData({ ...formData, qty_received: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Qty Accepted</label>
                    <input
                      type="number" required min="0"
                      className="w-full px-4 py-3 bg-emerald-50 border-0 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/20 text-xl font-black text-emerald-600 text-center"
                      value={formData.qty_accepted}
                      onChange={e => setFormData({ ...formData, qty_accepted: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest ml-1">Qty Rejected</label>
                    <input
                      type="number" required min="0"
                      className="w-full px-4 py-3 bg-rose-50 border-0 rounded-xl outline-none focus:ring-4 focus:ring-rose-500/20 text-xl font-black text-rose-500 text-center"
                      value={formData.qty_rejected}
                      onChange={e => setFormData({ ...formData, qty_rejected: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Buying Price (B.P) / Unit</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">KES</span>
                      <input
                        type="number" required step="0.01" min="0"
                        className="w-full pl-16 pr-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-black text-slate-900"
                        value={formData.unit_cost}
                        onChange={e => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Batch Number</label>
                    <input
                      type="text" required
                      placeholder="e.g. BCH-2024-001"
                      className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 text-sm font-bold font-mono text-slate-900 uppercase"
                      value={formData.batch_no}
                      onChange={e => setFormData({ ...formData, batch_no: e.target.value })}
                    />
                  </div>
                </div>

                <div className="bg-slate-900 rounded-[32px] p-8 text-white flex justify-between items-center shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-indigo-600/20 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Entry Value</p>
                    <h5 className="text-3xl font-black tracking-tight">KES {(formData.qty_received * formData.unit_cost).toLocaleString()}</h5>
                  </div>
                  <div className="relative z-10 text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Asset Control</p>
                    <p className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">Secure Entry</p>
                  </div>
                </div>

                <button type="submit" className="w-full py-6 bg-indigo-600 text-white font-black rounded-[32px] shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-[0.98] transition-all uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-3">
                  <ShieldCheck size={18} /> Confirm Stock Usage
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
