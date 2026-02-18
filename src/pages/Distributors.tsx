
import React, { useState } from 'react';
import { Truck, Plus, Trash2, Search, Package, X, Banknote, ShieldCheck, Printer, FileText, CheckCircle2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { store, LOGO_URL } from '../store';
import { Distributor, UserRole, Product } from '../types';

const DISTRIBUTOR_RECEIPT_CONFIG = {
  name: "KINTHITHE STORE",
  po_box: "_35",
  tel: "0710236236",
  email: "__KINTHITHE@GMAIL.COM",
  vatRate: 0.16,
  branch: "KINTHITHE",
  till: "123654"
};

interface DistributorPaymentReceipt {
  receiptNo: string;
  date: string;
  time: string;
  distributorName: string;
  kraPin: string;
  amount: number;
  paymentMethod: string;
  amountPaid: number;
}

export const Distributors: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState<{ id: string, name: string, balance: number, kraPin: string } | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [paymentReceipt, setPaymentReceipt] = useState<DistributorPaymentReceipt | null>(null);
  const [allDistributors, setAllDistributors] = useState<Distributor[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const user = store.getCurrentUser();
  const isAdmin = user?.role === UserRole.ADMIN;

  const fetchData = async () => {
    setLoading(true);
    const [distData, prodData] = await Promise.all([
      store.getDistributors(),
      store.getProducts()
    ]);
    setAllDistributors(distData);
    setAllProducts(prodData);
    setLoading(false);
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const [newDist, setNewDist] = useState<Omit<Distributor, 'distributor_id' | 'total_owed' | 'payment_status'>>({
    name: '', kra_pin: '', phone: '', address: '', main_products: ''
  });

  const [deliveryData, setDeliveryData] = useState({
    name: '',
    category: 'GENERAL',
    quantity: 0,
    buying_price: 0,
    selling_price: 0,
    low_stock_alert: 10,
    mfg_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    batch_no: ''
  });

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    method: 'BANK TRANSFER'
  });

  const distributors = allDistributors.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.kra_pin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.main_products?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddDistributor = async (e: React.FormEvent) => {
    e.preventDefault();
    await store.addDistributor(newDist);
    setShowAddModal(false);
    setNewDist({ name: '', kra_pin: '', phone: '', address: '', main_products: '' });
    fetchData();
  };

  const handleRecordDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showDeliveryModal) return;

    let productId = selectedProductId;

    if (isNewProduct) {
      const newProd = await store.addProduct({
        name: deliveryData.name,
        category: deliveryData.category,
        price: deliveryData.selling_price,
        buying_price: deliveryData.buying_price,
        stock: 0,
        low_stock_alert: deliveryData.low_stock_alert,
        unit: '',
        manufacturer: '',
        image_url: ''
      });
      if (newProd) productId = newProd.product_id;
    }

    if (productId) {
      const autoBatch = 'BCH-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      await store.addStockIn({
        distributor_id: showDeliveryModal,
        product_id: productId,
        qty_received: deliveryData.quantity,
        qty_accepted: deliveryData.quantity,
        qty_rejected: 0,
        unit_cost: deliveryData.buying_price,
        rejection_reason: '',
        delivery_note_no: '',
        invoice_no: '',
        batch_no: deliveryData.batch_no || autoBatch,
        mfg_date: deliveryData.mfg_date,
        expiry_date: deliveryData.expiry_date
      });
      setShowDeliveryModal(null);
      resetDeliveryForm();
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const handleDistributorPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showPayModal && paymentData.amount > 0) {
      const success = await store.recordDistributorPayment(showPayModal.id, paymentData.amount);
      if (success) {
        const now = new Date();
        setPaymentReceipt({
          receiptNo: 'PAY-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString(),
          distributorName: showPayModal.name,
          kraPin: showPayModal.kraPin,
          amount: paymentData.amount,
          paymentMethod: paymentData.method,
          amountPaid: paymentData.amount
        });
        setShowPayModal(null);
        setPaymentData({ amount: 0, method: 'BANK TRANSFER' });
        fetchData();
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSavePDF = () => {
    if (!paymentReceipt) return;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 220]
    });

    try {
      doc.addImage(LOGO_URL, 'JPEG', 30, 5, 20, 20);
    } catch {
      console.error("Failed to process delivery");
      alert("Failed to process delivery. Please try again.");
    }

    const cashier = store.getCurrentUser()?.full_name || store.getCurrentUser()?.username || 'Admin';
    const subtotal = paymentReceipt.amount / (1 + DISTRIBUTOR_RECEIPT_CONFIG.vatRate);
    const vat = paymentReceipt.amount - subtotal;

    doc.setFont("courier", "bold");
    doc.setFontSize(12);
    doc.text(DISTRIBUTOR_RECEIPT_CONFIG.name, 40, 30, { align: 'center' });

    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.text(`P.O. Box ${DISTRIBUTOR_RECEIPT_CONFIG.po_box}`, 40, 35, { align: 'center' });
    doc.text(`Tel: ${DISTRIBUTOR_RECEIPT_CONFIG.tel}`, 40, 39, { align: 'center' });
    doc.text(`Email: ${DISTRIBUTOR_RECEIPT_CONFIG.email}`, 40, 43, { align: 'center' });

    doc.setFont("courier", "bold");
    doc.text("INVOICE / TAX RECEIPT", 40, 51, { align: 'center' });
    doc.setFont("courier", "normal");

    doc.text(`Receipt No: ${paymentReceipt.receiptNo}`, 10, 59);
    doc.text(`Date: ${paymentReceipt.date}`, 10, 63);
    doc.text(`Time: ${paymentReceipt.time}`, 10, 67);
    doc.text(`Branch: ${DISTRIBUTOR_RECEIPT_CONFIG.branch}`, 10, 71);
    doc.text(`Served By: ${cashier}`, 10, 75);
    doc.text(`Till No: ${DISTRIBUTOR_RECEIPT_CONFIG.till}`, 10, 79);

    doc.text("------------------------------------------------", 40, 85, { align: 'center' });
    doc.text("Customer Details (Distributor)", 10, 91);
    doc.text(`Name: ${paymentReceipt.distributorName}`, 10, 95);
    doc.text(`KRA PIN: ${paymentReceipt.kraPin}`, 10, 99);

    doc.text("------------------------------------------------", 40, 105, { align: 'center' });
    doc.text("Item No Item Description     Qty   Price   Total", 10, 111);
    doc.text("1       ACCOUNT SETTLEMENT  1     " + paymentReceipt.amount.toFixed(0) + "   " + paymentReceipt.amount.toFixed(0), 10, 117);
    doc.text("------------------------------------------------", 40, 123, { align: 'center' });

    doc.text(`Subtotal: Ksh ${subtotal.toFixed(2)}`, 10, 129);
    doc.text(`VAT (16%): Ksh ${vat.toFixed(2)}`, 10, 133);
    doc.setFont("courier", "bold");
    doc.text(`Total Amount: Ksh ${paymentReceipt.amount.toFixed(2)}`, 10, 139);
    doc.setFont("courier", "normal");

    doc.text("------------------------------------------------", 40, 145, { align: 'center' });
    doc.text(`Payment Method: ${paymentReceipt.paymentMethod}`, 10, 151);
    doc.text(`Amount Paid: Ksh ${paymentReceipt.amountPaid.toFixed(2)}`, 10, 155);
    doc.text(`Change: Ksh 0.00`, 10, 159);
    doc.text("------------------------------------------------", 40, 165, { align: 'center' });

    doc.text("THANK YOU FOR YOUR PARTNERSHIP", 40, 173, { align: 'center' });

    doc.save(`Distributor_Payment_${paymentReceipt.receiptNo}.pdf`);
  };

  const resetDeliveryForm = () => {
    setDeliveryData({
      name: '',
      category: 'GENERAL',
      quantity: 0,
      buying_price: 0,
      selling_price: 0,
      low_stock_alert: 10,
      mfg_date: new Date().toISOString().split('T')[0],
      expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      batch_no: ''
    });
    setSelectedProductId('');
    setIsNewProduct(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Permanently remove this supply node?")) {
      await store.deleteDistributor(id);
      fetchData();
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <img src={LOGO_URL} alt="Kinthithe" className="h-20 w-20 object-contain rounded-xl shadow-lg border border-white bg-white" />
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Suppliers</h2>
            <p className="text-slate-500 font-bold text-base">Managing {distributors.length} active distribution partners.</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 uppercase tracking-widest"
          >
            <Plus size={20} /> Add Distributor
          </button>
        )}
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex flex-col xl:flex-row gap-8 items-center justify-between">
          <div className="relative w-full xl:w-[600px]">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
            <input
              type="text"
              placeholder="Search suppliers by name, PIN, or category..."
              className="w-full pl-16 pr-8 py-5 bg-slate-50 border-2 border-transparent rounded-[24px] outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 font-black text-lg transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Total Liability</span>
              <span className="text-3xl font-black text-rose-600">KES {distributors.reduce((acc, d) => acc + d.total_owed, 0).toLocaleString()}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Total Suppliers</span>
              <span className="text-3xl font-black text-indigo-600">{distributors.length}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#f7f6f5] text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-10 py-6">#</th>
                <th className="px-10 py-6">Distributor/Supplier</th>
                <th className="px-10 py-6">Main Products</th>
                <th className="px-10 py-6">Contact Number</th>
                <th className="px-10 py-6">KRA PIN</th>
                <th className="px-10 py-6 text-right">Outstanding (KES)</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {distributors.map((dist, idx) => (
                <tr key={dist.distributor_id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-10 py-6">
                    <span className="text-xs font-black text-stone-300">{(idx + 1).toString().padStart(2, '0')}</span>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                        <Truck size={24} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 tracking-tight text-lg leading-tight">{dist.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{dist.address}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="max-w-[300px]">
                      <p className="text-xs font-bold text-stone-500 leading-relaxed truncate">{dist.main_products || 'General Supplies'}</p>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className="text-sm font-black text-slate-700">{dist.phone}</span>
                  </td>
                  <td className="px-10 py-6">
                    <span className="text-[11px] font-black text-stone-400 font-mono bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{dist.kra_pin}</span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <span className={`text-lg font-black ${dist.total_owed > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {dist.total_owed > 0 ? `KES ${dist.total_owed.toLocaleString()}` : 'SETTLED'}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isAdmin && dist.total_owed > 0 && (
                        <button
                          onClick={() => setShowPayModal({ id: dist.distributor_id, name: dist.name, balance: dist.total_owed, kraPin: dist.kra_pin })}
                          className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all"
                          title="Settle Dues"
                        >
                          <Banknote size={20} />
                        </button>
                      )}
                      <button
                        onClick={() => setShowDeliveryModal(dist.distributor_id)}
                        className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                        title="Intake Delivery"
                      >
                        <Package size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(dist.distributor_id)}
                        className="p-3 text-stone-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Distributor Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[48px] shadow-2xl p-10 space-y-8 border border-white/20">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Settle Payment</h3>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Paying {showPayModal.name}</p>
              </div>
              <button onClick={() => setShowPayModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 bg-[#f7f6f5] rounded-3xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outstanding Balance</p>
              <p className="text-3xl font-black text-rose-600">KES {showPayModal.balance.toLocaleString()}</p>
            </div>

            <form onSubmit={handleDistributorPayment} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Settlement Amount</label>
                <input
                  type="number" required
                  max={showPayModal.balance}
                  className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-600/5 focus:border-indigo-600 font-black text-xl"
                  value={paymentData.amount || ''}
                  onChange={e => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method</label>
                <select
                  className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-600/5 focus:border-indigo-600 font-black text-sm"
                  value={paymentData.method}
                  onChange={e => setPaymentData({ ...paymentData, method: e.target.value })}
                >
                  <option value="BANK TRANSFER">BANK TRANSFER</option>
                  <option value="MPESA TILL">MPESA TILL</option>
                  <option value="LIQUID CASH">LIQUID CASH</option>
                  <option value="CHEQUE">CHEQUE</option>
                </select>
              </div>

              <button type="submit" className="w-full py-6 bg-emerald-600 text-white font-black rounded-3xl shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95 transition-all uppercase tracking-[0.3em] text-xs">
                Process Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Record Delivery Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl rounded-[48px] shadow-2xl overflow-hidden border border-white/20 flex flex-col md:flex-row">
            <div className="md:w-1/3 bg-slate-900 p-12 text-white flex flex-col justify-between">
              <div>
                <div className="bg-indigo-600 p-3 rounded-2xl w-fit mb-8 shadow-xl"><Package size={32} /></div>
                <h3 className="text-3xl font-black mb-6 leading-tight">Receive Delivery</h3>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">Verify batch numbers and expiry dates before adding to inventory.</p>
              </div>
              <div className="space-y-4 pt-10 border-t border-slate-800">
                <div className="flex items-center gap-3 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                  <ShieldCheck size={18} /> Verification Active
                </div>
              </div>
            </div>
            <div className="flex-1 p-12">
              <div className="flex justify-between items-center mb-10">
                <h4 className="text-2xl font-black text-slate-900">Delivery Details</h4>
                <button onClick={() => setShowDeliveryModal(null)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400"><X /></button>
              </div>
              <form onSubmit={handleRecordDelivery} className="space-y-6">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-8">
                  <button type="button" onClick={() => setIsNewProduct(false)} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${!isNewProduct ? 'bg-white shadow-sm text-indigo-600' : 'text-stone-400'}`}>Existing Product</button>
                  <button type="button" onClick={() => setIsNewProduct(true)} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${isNewProduct ? 'bg-white shadow-sm text-indigo-600' : 'text-stone-400'}`}>New Product</button>
                </div>

                <div className="space-y-4">
                  {!isNewProduct ? (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Product</label>
                      <select
                        required
                        className="w-full px-5 py-3 bg-slate-50 border-0 rounded-xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-black text-sm"
                        value={selectedProductId}
                        onChange={e => setSelectedProductId(e.target.value)}
                      >
                        <option value="">-- Choose from Catalog --</option>
                        {allProducts.map(p => (
                          <option key={p.product_id} value={p.product_id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Name</label>
                        <input
                          type="text" required
                          className="w-full px-5 py-3 bg-slate-50 border-0 rounded-xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-black text-sm"
                          value={deliveryData.name}
                          onChange={e => setDeliveryData({ ...deliveryData, name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                          <select
                            required
                            className="w-full px-5 py-3 bg-slate-50 border-0 rounded-xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-black text-sm"
                            value={deliveryData.category}
                            onChange={e => setDeliveryData({ ...deliveryData, category: e.target.value })}
                          >
                            <option value="GENERAL">GENERAL</option>
                            <option value="MAIZE FLOUR">MAIZE FLOUR</option>
                            <option value="WHEAT FLOUR">WHEAT FLOUR</option>
                            <option value="RICE">RICE</option>
                            <option value="SUGAR & SALT">SUGAR & SALT</option>
                            <option value="OILS & FATS">OILS & FATS</option>
                            <option value="DAIRY">DAIRY</option>
                            <option value="BEVERAGES">BEVERAGES</option>
                            <option value="CLEANING">CLEANING</option>
                            <option value="PERSONAL CARE">PERSONAL CARE</option>
                            <option value="SNACKS & SPICES">SNACKS & SPICES</option>
                            <option value="FRESH PRODUCE">FRESH PRODUCE</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selling Price</label>
                          <input
                            type="number" required
                            className="w-full px-5 py-3 bg-slate-50 border-0 rounded-xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-black text-sm text-indigo-600"
                            value={deliveryData.selling_price}
                            onChange={e => setDeliveryData({ ...deliveryData, selling_price: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Buying Price</label>
                      <input
                        type="number" required
                        className="w-full px-5 py-3 bg-slate-50 border-0 rounded-xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-black text-sm text-stone-600"
                        value={deliveryData.buying_price}
                        onChange={e => setDeliveryData({ ...deliveryData, buying_price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                      <input
                        type="number" required
                        className="w-full px-5 py-3 bg-slate-50 border-0 rounded-xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-black text-sm text-stone-600"
                        value={deliveryData.quantity}
                        onChange={e => setDeliveryData({ ...deliveryData, quantity: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest ml-1">Mfg Date</label>
                      <input
                        type="date" required
                        className="w-full px-5 py-3 bg-slate-50 border-0 rounded-xl outline-none focus:ring-4 focus:ring-rose-500/10 font-black text-xs"
                        value={deliveryData.mfg_date}
                        onChange={e => setDeliveryData({ ...deliveryData, mfg_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest ml-1">Expiry Date</label>
                      <input
                        type="date" required
                        className="w-full px-5 py-3 bg-slate-50 border-0 rounded-xl outline-none focus:ring-4 focus:ring-rose-500/10 font-black text-xs"
                        value={deliveryData.expiry_date}
                        onChange={e => setDeliveryData({ ...deliveryData, expiry_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-stone-400 font-bold uppercase">Distributor specific intake flow enabled.</p>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700 text-[10px] font-bold">
                    Please ensure all manufacturing dates match the physical batch certificates.
                  </div>
                </div>

                <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all uppercase tracking-[0.3em] text-xs mt-4">
                  Confirm Delivery
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Distributor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-xl rounded-[48px] shadow-2xl overflow-hidden border border-white/20">
            <div className="p-12 border-b flex justify-between items-center bg-slate-900 text-white">
              <div>
                <h3 className="text-3xl font-black tracking-tight">Add Distributor</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-2">New Supply Partner</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X size={32} /></button>
            </div>
            <form onSubmit={handleAddDistributor} className="p-12 space-y-8">
              <div className="space-y-6">
                <input
                  type="text" placeholder="Distributor Name" required
                  className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold"
                  value={newDist.name}
                  onChange={e => setNewDist({ ...newDist, name: e.target.value })}
                />
                <input
                  type="text" placeholder="KRA PIN" required
                  className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold font-mono"
                  value={newDist.kra_pin}
                  onChange={e => setNewDist({ ...newDist, kra_pin: e.target.value })}
                />
                <input
                  type="text" placeholder="Primary Products Supplied"
                  className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold"
                  value={newDist.main_products}
                  onChange={e => setNewDist({ ...newDist, main_products: e.target.value })}
                />
                <input
                  type="text" placeholder="Phone Number"
                  className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/10 font-bold"
                  value={newDist.phone}
                  onChange={e => setNewDist({ ...newDist, phone: e.target.value })}
                />
              </div>
              <button type="submit" className="w-full py-6 bg-indigo-600 text-white font-black rounded-[32px] shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-[0.98] transition-all uppercase tracking-[0.3em] text-xs">
                Save Distributor
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};