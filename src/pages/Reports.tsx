
import React, { useState, useMemo } from 'react';
import {
   Download, Printer, DollarSign, Package, TrendingUp, BarChart as BarIcon,
   CreditCard, ShieldAlert, UserCircle, PieChart as PieIcon, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { store, LOGO_URL } from '../store';
import { UserRole, Sale, Product, Customer, User, StockBatch } from '../types';

export const Reports: React.FC = () => {
   const [dateRange] = useState('Current Fiscal Period');
   const [allSales, setAllSales] = useState<Sale[]>([]);
   const [products, setProducts] = useState<Product[]>([]);
   const [customers, setCustomers] = useState<Customer[]>([]);
   const [users, setUsers] = useState<User[]>([]);
   const [allBatches, setAllBatches] = useState<StockBatch[]>([]);
   const [loading, setLoading] = useState(true);

   React.useEffect(() => {
      const fetchData = async () => {
         setLoading(true);
         const [salesData, productsData, customersData, usersData, batchesData] = await Promise.all([
            store.getSales(),
            store.getProducts(),
            store.getCustomers(),
            store.getUsers(),
            store.getBatches()
         ]);
         setAllSales(salesData);
         setProducts(productsData);
         setCustomers(customersData);
         setUsers(usersData);
         setAllBatches(batchesData);
         setLoading(false);
      };
      fetchData();
   }, []);

   // Staff Performance Data
   const staffPerformance = useMemo(() => {
      return users
         .filter(u => u.role !== UserRole.DISTRIBUTOR)
         .map(user => {
            const userSales = allSales.filter(s => s.user_id === user.user_id);
            const totalVolume = userSales.reduce((acc, s) => acc + s.total_price, 0);
            const itemsSold = userSales.reduce((acc, s) => acc + s.quantity, 0);
            return {
               id: user.user_id,
               name: user.full_name || user.username,
               avatar: user.avatar_url,
               volume: totalVolume,
               count: userSales.length,
               items: itemsSold
            };
         })
         .sort((a, b) => b.volume - a.volume);
   }, [users, allSales]);

   // Expiry Logic
   const expiryAudits = useMemo(() => {
      const now = new Date();
      const nearExpiryThreshold = new Date();
      nearExpiryThreshold.setDate(now.getDate() + 14);

      const expired = allBatches.filter(b => b.quantity > 0 && new Date(b.expiry_date) <= now);
      const nearExpiry = allBatches.filter(b => b.quantity > 0 && new Date(b.expiry_date) > now && new Date(b.expiry_date) <= nearExpiryThreshold);

      return { expired, nearExpiry };
   }, [allBatches]);

   // Financial Calculations
   const totalRevenue = allSales.reduce((acc, s) => acc + s.total_price, 0);
   const totalCost = allSales.reduce((acc, s) => {
      const p = products.find(prod => prod.product_id === s.product_id);
      return acc + ((p?.buying_price || 0) * s.quantity);
   }, 0);
   const totalProfit = totalRevenue - totalCost;
   const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

   if (loading) {
      return (
         <div className="flex items-center justify-center h-[600px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
         </div>
      );
   }

   const exportGeneralReport = () => {
      const doc = new jsPDF();

      try {
         doc.addImage(LOGO_URL, 'JPEG', 85, 10, 30, 30);
      } catch {
         console.warn("PDF Logo generation failed");
      }

      doc.setFontSize(22);
      doc.text("KINTHITHE STORE", 105, 50, { align: 'center' });
      doc.setFontSize(14);
      doc.text("Financial Performance Audit Report", 105, 58, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 70);
      doc.text(`Reporting Period: ${dateRange}`, 20, 76);

      doc.line(20, 80, 190, 80);

      doc.setFont("helvetica", "bold");
      doc.text("SUMMARY METRICS", 20, 90);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Sales Revenue: KES ${totalRevenue.toLocaleString()}`, 20, 100);
      doc.text(`Total Cost of Goods: KES ${totalCost.toLocaleString()}`, 20, 108);
      doc.text(`Gross Profit: KES ${totalProfit.toLocaleString()}`, 20, 116);
      doc.text(`Profit Margin: ${margin.toFixed(2)}%`, 20, 124);

      doc.line(20, 130, 190, 130);

      doc.text("Authorized by: System Audit Hub", 105, 140, { align: 'center' });

      doc.save(`Kinthithe_Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`);
   };

   const handlePrint = () => {
      window.print();
   };

   return (
      <div className="space-y-8 pb-20 animate-in fade-in duration-500 printable-report">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <h2 className="text-4xl font-black text-slate-900 tracking-tight">Financial & Stock Analytics</h2>
               <p className="text-slate-500 font-bold text-lg">Comprehensive audit of store performance and staff productivity.</p>
            </div>
            <div className="flex gap-4 no-print">
               <button onClick={exportGeneralReport} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 uppercase tracking-widest">
                  <Download size={18} /> Export PDF
               </button>
               <button onClick={handlePrint} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-4 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all uppercase tracking-widest shadow-sm">
                  <Printer size={18} /> Print All
               </button>
            </div>
         </div>

         {/* KPI Cards */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl relative overflow-hidden group">
               <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <DollarSign size={80} />
               </div>
               <div className="flex flex-col gap-1 relative z-10">
                  <div className="p-3 bg-indigo-50 w-fit rounded-2xl text-indigo-600 mb-4"><DollarSign size={24} /></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
                  <p className="text-2xl font-black text-slate-900">KES {totalRevenue.toLocaleString()}</p>
                  <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-2">
                     <ArrowUpRight size={14} /> +{margin.toFixed(1)}% Margin
                  </div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl relative overflow-hidden group">
               <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <TrendingUp size={80} />
               </div>
               <div className="flex flex-col gap-1 relative z-10">
                  <div className="p-3 bg-emerald-50 w-fit rounded-2xl text-emerald-600 mb-4"><TrendingUp size={24} /></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Profit</p>
                  <p className="text-2xl font-black text-slate-900">KES {totalProfit.toLocaleString()}</p>
                  <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-2">
                     <ArrowUpRight size={14} /> Strong Performance
                  </div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl relative overflow-hidden group">
               <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Package size={80} />
               </div>
               <div className="flex flex-col gap-1 relative z-10">
                  <div className="p-3 bg-amber-50 w-fit rounded-2xl text-amber-600 mb-4"><Package size={24} /></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Value</p>
                  <p className="text-2xl font-black text-slate-900">KES {products.reduce((acc, p) => acc + (p.stock * p.buying_price), 0).toLocaleString()}</p>
                  <div className="flex items-center gap-1 text-amber-500 text-xs font-bold mt-2">
                     Reflecting Cost Price
                  </div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl relative overflow-hidden group">
               <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <CreditCard size={80} />
               </div>
               <div className="flex flex-col gap-1 relative z-10">
                  <div className="p-3 bg-rose-50 w-fit rounded-2xl text-rose-600 mb-4"><CreditCard size={24} /></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Debt Exposure</p>
                  <p className="text-2xl font-black text-slate-900">KES {customers.reduce((acc, c) => acc + c.amount_owed, 0).toLocaleString()}</p>
                  <div className="flex items-center gap-1 text-rose-500 text-xs font-bold mt-2">
                     <ArrowDownRight size={14} /> Pending Collections
                  </div>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
               {/* Staff Performance Report */}
               <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden">
                  <div className="p-8 border-b border-slate-50 flex items-center gap-4 bg-slate-50/50">
                     <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><BarIcon size={24} /></div>
                     <div>
                        <h3 className="text-xl font-black text-slate-900">Staff Sales Productivity</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Monitoring individual cashier metrics</p>
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-[#f7f6f5] text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">
                           <tr>
                              <th className="px-8 py-5">Cashier</th>
                              <th className="px-8 py-5">Sale Count</th>
                              <th className="px-8 py-5">Items Sold</th>
                              <th className="px-8 py-5 text-right">Total Volume</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {staffPerformance.map(staff => (
                              <tr key={staff.id} className="hover:bg-slate-50 transition-all">
                                 <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                       <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm">
                                          {staff.avatar ? <img src={staff.avatar} className="w-full h-full object-cover" /> : <UserCircle className="text-slate-300 w-full h-full p-2" />}
                                       </div>
                                       <span className="font-black text-slate-900 text-sm">{staff.name}</span>
                                    </div>
                                 </td>
                                 <td className="px-8 py-5 font-bold text-slate-600 text-sm">{staff.count} Sales</td>
                                 <td className="px-8 py-5 font-bold text-slate-600 text-sm">{staff.items} Items</td>
                                 <td className="px-8 py-5 text-right font-black text-indigo-600 text-lg">KES {staff.volume.toLocaleString()}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* Expiry Audit Section */}
               <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden">
                  <div className="p-8 border-b border-slate-50 flex items-center gap-4 bg-slate-50/50">
                     <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg"><ShieldAlert size={24} /></div>
                     <div>
                        <h3 className="text-xl font-black text-slate-900">Expired Stock Batches</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Items past expiry date (Sale Blocked)</p>
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-[#f7f6f5] text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">
                           <tr>
                              <th className="px-8 py-5">Batch No</th>
                              <th className="px-8 py-5">Product</th>
                              <th className="px-8 py-5">Qty Left</th>
                              <th className="px-8 py-5">Expired Date</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {expiryAudits.expired.map(batch => {
                              const prod = products.find(p => p.product_id === batch.product_id);
                              return (
                                 <tr key={batch.batch_id} className="hover:bg-rose-50 transition-all">
                                    <td className="px-8 py-5 font-mono text-xs font-bold text-slate-500 bg-slate-50 rounded-r-lg w-fit">{batch.batch_no}</td>
                                    <td className="px-8 py-5 font-bold text-slate-900">{prod?.name}</td>
                                    <td className="px-8 py-5 font-black text-rose-600">{batch.quantity} Units</td>
                                    <td className="px-8 py-5 text-sm font-bold text-slate-400">{new Date(batch.expiry_date).toLocaleDateString()}</td>
                                 </tr>
                              );
                           })}
                           {expiryAudits.expired.length === 0 && (
                              <tr><td colSpan={4} className="p-16 text-center text-slate-400 font-bold uppercase tracking-widest">No expired stock batches detected.</td></tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>

            <div className="space-y-8">
               <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-xl">
                  <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3">
                     <PieIcon size={24} className="text-indigo-600" /> Stock Health
                  </h3>
                  <div className="space-y-6">
                     {products.slice(0, 8).map(p => (
                        <div key={p.product_id} className="space-y-3">
                           <div className="flex justify-between text-xs font-black tracking-wide">
                              <span className="text-slate-700">{p.name}</span>
                              <span className={p.stock <= p.low_stock_alert ? 'text-rose-600' : 'text-slate-400'}>{p.stock} in stock</span>
                           </div>
                           <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                 className={`h-full rounded-full transition-all duration-1000 ${p.stock <= p.low_stock_alert ? 'bg-rose-500' : 'bg-indigo-500'}`}
                                 style={{ width: `${Math.min(100, (p.stock / 100) * 100)}%` }}
                              ></div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="bg-slate-900 p-10 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-10"><DollarSign size={100} /></div>
                  <h3 className="text-2xl font-black mb-8 relative z-10">Tax Summary</h3>
                  <div className="space-y-6 relative z-10">
                     <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <span>VAT Applicable (16%)</span>
                        <span className="text-white font-black">KES {(totalRevenue * 0.16).toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <span>Corporation Est.</span>
                        <span className="text-white font-black">KES {(totalProfit * 0.3).toLocaleString()}</span>
                     </div>
                     <div className="pt-6 border-t border-slate-800 flex justify-between">
                        <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Total Liability</span>
                        <span className="text-xl font-black text-emerald-400">KES {((totalRevenue * 0.16) + (totalProfit * 0.3)).toLocaleString()}</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};