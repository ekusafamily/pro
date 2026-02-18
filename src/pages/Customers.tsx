
import React, { useState } from 'react';
import { Plus, Trash2, Search, Calendar, User, AlertCircle, Banknote, X, Save } from 'lucide-react';
import { store, LOGO_URL } from '../store';
import { Customer, CreditStatus } from '../types';

export const Customers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<{ id: string, name: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [newCust, setNewCust] = useState<Omit<Customer, 'customer_id' | 'status' | 'created_at' | 'loyalty_points'>>({
    full_name: '', phone: '', address: '', due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount_owed: 0
  });

  const fetchCustomers = async () => {
    setLoading(true);
    const data = await store.getCustomers();
    setAllCustomers(data);
    setLoading(false);
  };

  React.useEffect(() => {
    fetchCustomers();
  }, []);

  const customers = allCustomers.filter(c =>
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await store.addCustomer(newCust);
    setShowAddModal(false);
    setNewCust({
      full_name: '', phone: '', address: '',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount_owed: 0
    });
    fetchCustomers();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Remove this customer from records?")) {
      await store.deleteCustomer(id);
      fetchCustomers();
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showPaymentModal && paymentAmount > 0) {
      await store.recordCustomerPayment(showPaymentModal.id, paymentAmount);
      setShowPaymentModal(null);
      setPaymentAmount(0);
      fetchCustomers();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <img src={LOGO_URL} alt="Kinthithe" className="h-16 w-16 object-contain rounded-xl shadow-sm border border-slate-200 bg-white" />
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Credit Ledger</h2>
            <p className="text-slate-500 font-bold text-sm tracking-wide">Manage debtor accounts and payment schedules.</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-3 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 uppercase tracking-widest"
        >
          <Plus size={18} /> Register Creditor
        </button>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-50">
          <div className="relative w-full md:w-[480px]">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by customer name or phone..."
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 font-bold text-slate-900 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#f7f6f5] text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Customer Profile</th>
                <th className="px-8 py-5">Outstanding Balance</th>
                <th className="px-8 py-5">Settlement Deadline</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-50">
                      <User size={48} className="text-slate-300" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active credit accounts</p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map(cust => {
                  const overdue = isOverdue(cust.due_date) && cust.status === CreditStatus.UNPAID;
                  return (
                    <tr key={cust.customer_id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${overdue ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-600'}`}>
                            <User size={20} />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-sm">{cust.full_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cust.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="font-black text-slate-900 text-lg">KES {cust.amount_owed.toLocaleString()}</div>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`text-xs font-bold flex items-center gap-2 ${overdue ? 'text-rose-600' : 'text-slate-500'}`}>
                          <Calendar size={14} /> {new Date(cust.due_date).toLocaleDateString()}
                          {overdue && <AlertCircle size={14} className="animate-pulse" />}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border
                          ${cust.status === CreditStatus.PAID
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : 'bg-amber-50 text-amber-600 border-amber-100'}
                        `}>
                          {cust.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-100 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setShowPaymentModal({ id: cust.customer_id, name: cust.full_name })}
                            className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all shadow-sm"
                            title="Record Payment"
                          >
                            <Banknote size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(cust.customer_id)}
                            className="p-2.5 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">Record Settlement</h3>
              <button onClick={() => setShowPaymentModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
            </div>

            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Debtor</p>
            <p className="text-lg font-black text-slate-900 mb-8 pb-4 border-b border-slate-100">{showPaymentModal.name}</p>

            <form onSubmit={handlePayment} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Process Payment (KES)</label>
                <input
                  type="number" required autoFocus
                  className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 font-black text-2xl text-slate-900 transition-all"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(parseFloat(e.target.value))}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowPaymentModal(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-colors uppercase tracking-widest text-[10px]">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-widest text-[10px]">Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden border border-white/20">
            <div className="p-8 border-b bg-indigo-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black tracking-tight">New Creditor</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">Add to ledger</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <form onSubmit={handleAdd} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input
                  type="text" required
                  className="w-full px-5 py-3 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold text-slate-900 transition-all"
                  value={newCust.full_name}
                  onChange={e => setNewCust({ ...newCust, full_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                  <input
                    type="text" required
                    className="w-full px-5 py-3 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold text-slate-900 transition-all"
                    value={newCust.phone}
                    onChange={e => setNewCust({ ...newCust, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Debt</label>
                  <input
                    type="number"
                    className="w-full px-5 py-3 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold text-slate-900 transition-all"
                    value={newCust.amount_owed}
                    onChange={e => setNewCust({ ...newCust, amount_owed: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Physical Address</label>
                <input
                  type="text" required
                  className="w-full px-5 py-3 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold text-slate-900 transition-all"
                  value={newCust.address}
                  onChange={e => setNewCust({ ...newCust, address: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Due Date</label>
                <input
                  type="date" required
                  className="w-full px-5 py-3 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold text-slate-900 transition-all"
                  value={newCust.due_date}
                  onChange={e => setNewCust({ ...newCust, due_date: e.target.value })}
                />
              </div>

              <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 mt-4">
                <Save size={16} /> Save Profile
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};