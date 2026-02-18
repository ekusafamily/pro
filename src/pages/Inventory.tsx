
import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Search, X, AlertTriangle, Upload, Camera, ImageIcon, FileSpreadsheet, Download, Check } from 'lucide-react';
import { store } from '../store';
import { Product, UserRole } from '../types';

export const Inventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<Omit<Product, 'product_id'>[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const [newProduct, setNewProduct] = useState<Omit<Product, 'product_id'>>({
    name: '', category: 'MAIZE FLOUR', unit: '', manufacturer: '', price: 0, buying_price: 0, stock: 0, low_stock_alert: 5, image_url: ''
  });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchProducts = async () => {
    setLoading(true);
    const data = await store.getProducts();
    setAllProducts(data);
    setLoading(false);
  };

  React.useEffect(() => {
    fetchProducts();
  }, []);

  const products = allProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image is too large (max 5MB).");
      return;
    }

    try {
      setLoading(true);
      const publicUrl = await store.uploadProductImage(file);
      if (publicUrl) {
        if (isEdit && editingProduct) {
          setEditingProduct({ ...editingProduct, image_url: publicUrl });
        } else {
          setNewProduct({ ...newProduct, image_url: publicUrl });
        }
      } else {
        setError("Failed to upload image.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to upload image.");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = "name,category,unit,manufacturer,buying_price,price,stock,low_stock_alert,image_url";
    const blob = new Blob([headers], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_template.csv';
    a.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').filter(r => r.trim() !== '').slice(1);
      const parsed = rows.map(row => {
        const cols = row.split(',');
        if (cols.length < 8) return null;
        return {
          name: cols[0]?.trim(),
          category: cols[1]?.trim() || 'MAIZE FLOUR',
          unit: cols[2]?.trim() || 'pc',
          manufacturer: cols[3]?.trim() || '',
          buying_price: parseFloat(cols[4]) || 0,
          price: parseFloat(cols[5]) || 0,
          stock: parseInt(cols[6]) || 0,
          low_stock_alert: parseInt(cols[7]) || 5,
          image_url: cols[8]?.trim() || ''
        } as Omit<Product, 'product_id'>;
      }).filter((p): p is Omit<Product, 'product_id'> => p !== null);
      setImportData(parsed);
    };
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    setLoading(true);
    try {
      const finalData = await Promise.all(importData.map(async (item) => {
        let finalImageUrl = item.image_url;

        // If csv has a filename (not a http url) and we have uploaded files
        if (item.image_url && !item.image_url.startsWith('http') && imageFiles.length > 0) {
          const targetName = item.image_url.toLowerCase().trim();
          // Find matching file (exact or with added extension)
          const file = imageFiles.find(f => {
            const fname = f.name.toLowerCase();
            return fname === targetName ||
              fname === `${targetName}.jpg` ||
              fname === `${targetName}.jpeg` ||
              fname === `${targetName}.png` ||
              fname === `${targetName}.webp`;
          });

          if (file) {
            const url = await store.uploadProductImage(file);
            if (url) finalImageUrl = url;
          }
        }

        return { ...item, image_url: finalImageUrl };
      }));

      // @ts-ignore - store has this method now
      await store.addBulkProducts(finalData);
      setShowImportModal(false);
      setImportData([]);
      setImageFiles([]);
      fetchProducts();
    } catch (err) {
      console.error(err);
      setError("Failed to import products.");
    } finally {
      setLoading(false);
    }
  };

  const user = store.getCurrentUser();
  const isAdmin = user?.role === UserRole.ADMIN;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await store.addProduct(newProduct);
    setShowAddModal(false);
    setNewProduct({ name: '', category: 'MAIZE FLOUR', unit: '', manufacturer: '', price: 0, buying_price: 0, stock: 0, low_stock_alert: 5, image_url: '' });
    fetchProducts();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      await store.updateProduct(editingProduct.product_id, editingProduct);
      setEditingProduct(null);
      fetchProducts();
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      await store.deleteProduct(id);
      fetchProducts();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Inventory Ledger</h2>
          <p className="text-slate-500 font-bold text-lg">Central control for {products.length} active retail assets.</p>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-3 bg-white text-indigo-600 border border-indigo-100 px-6 py-4 rounded-2xl font-black text-xs hover:bg-indigo-50 transition-all shadow-lg shadow-indigo-100/20 active:scale-95 uppercase tracking-widest"
            >
              <FileSpreadsheet size={20} />  Import Excel/CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 uppercase tracking-widest"
            >
              <Plus size={20} /> Deploy New Asset
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[48px] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex flex-col xl:flex-row gap-8 items-center justify-between">
          <div className="relative w-full xl:w-[600px]">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
            <input
              type="text"
              placeholder="Query catalog by name, category, or manufacturer..."
              className="w-full pl-16 pr-8 py-5 bg-slate-50 border-2 border-transparent rounded-[24px] outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 font-black text-lg transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Net Asset Value</span>
              <span className="text-3xl font-black text-indigo-600">KES {products.reduce((acc, p) => acc + (p.stock * p.buying_price), 0).toLocaleString()}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Total Units</span>
              <span className="text-3xl font-black text-slate-900">{products.reduce((acc, p) => acc + p.stock, 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#f7f6f5] text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-10 py-6">Item</th>
                <th className="px-10 py-6">Category</th>
                <th className="px-10 py-6 text-center">Qty (Unit)</th>
                <th className="px-10 py-6 text-center">Stock</th>
                <th className="px-10 py-6">Manufacturer</th>
                <th className="px-10 py-6 text-right">Selling Price</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.map((product) => (
                <tr key={product.product_id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#f7f6f5] border border-stone-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md transition-all">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={24} className="text-stone-300" />
                        )}
                      </div>
                      <div>
                        <span className="font-black text-slate-900 tracking-tight text-base block leading-tight">{product.name}</span>
                        <span className="text-[9px] text-stone-300 font-bold uppercase tracking-widest">{product.product_id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest">{product.category}</span>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">{product.unit || '---'}</span>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className="inline-flex items-center gap-3">
                      <span className={`text-lg font-black ${product.stock <= product.low_stock_alert ? 'text-rose-600' : 'text-slate-900'}`}>{product.stock}</span>
                      {product.stock <= product.low_stock_alert && (
                        <AlertTriangle size={18} className="text-rose-500 animate-pulse" />
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wide truncate max-w-[150px] block">{product.manufacturer || 'General Supplier'}</span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <span className="text-lg font-black text-indigo-600">KES {product.price.toLocaleString()}</span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setEditingProduct(product)} className="p-3 text-stone-400 hover:text-indigo-600 hover:bg-[#f7f6f5] rounded-2xl transition-all"><Edit3 size={18} /></button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(product.product_id)}
                          className="p-3 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deploy Asset Modal */}
      {(showAddModal || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]">
            <div className="p-10 border-b flex justify-between items-center bg-indigo-600 text-white shrink-0">
              <div>
                <h3 className="text-3xl font-black tracking-tight">{editingProduct ? 'Modify Asset' : 'Asset Deployment'}</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mt-2">Inventory System Integration</p>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setEditingProduct(null); setError(null); }}
                className="p-3 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={28} />
              </button>
            </div>

            <form onSubmit={editingProduct ? handleEdit : handleAdd} className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-in slide-in-from-top-2">
                  <AlertTriangle size={20} /> {error}
                </div>
              )}

              {/* Photo Upload Area */}
              <div className="flex flex-col items-center gap-4 py-4 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 hover:border-indigo-400 transition-all group">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-40 h-40 rounded-[32px] bg-white shadow-lg flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group-hover:scale-105 transition-transform"
                >
                  {(editingProduct?.image_url || newProduct.image_url) ? (
                    <>
                      <img
                        src={editingProduct ? editingProduct.image_url : newProduct.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="text-white" size={32} />
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload size={40} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                      <span className="text-[10px] font-black text-slate-400 uppercase mt-3 tracking-widest">Upload Photo</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, !!editingProduct)}
                />
                <div className="text-center">
                  <p className="text-xs font-black text-slate-900">Product Photography</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">PNG, JPG up to 5MB</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Identity (Name)</label>
                  <input
                    type="text" required
                    placeholder="e.g. Amaize 2kg"
                    className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-900 transition-all"
                    value={editingProduct ? editingProduct.name : newProduct.name}
                    onChange={e => editingProduct ? setEditingProduct({ ...editingProduct, name: e.target.value }) : setNewProduct({ ...newProduct, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                  <div className="relative">
                    <select
                      required
                      className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-900 appearance-none cursor-pointer transition-all"
                      value={editingProduct ? editingProduct.category : newProduct.category}
                      onChange={e => editingProduct ? setEditingProduct({ ...editingProduct, category: e.target.value }) : setNewProduct({ ...newProduct, category: e.target.value })}
                    >
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
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Specification</label>
                  <input
                    type="text" required
                    placeholder="e.g. 2kg, 500ml, 1pc"
                    className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-900 transition-all"
                    value={editingProduct ? editingProduct.unit : newProduct.unit}
                    onChange={e => editingProduct ? setEditingProduct({ ...editingProduct, unit: e.target.value }) : setNewProduct({ ...newProduct, unit: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Manufacturer</label>
                  <input
                    type="text" required
                    placeholder="e.g. Unga Group"
                    className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-900 transition-all"
                    value={editingProduct ? editingProduct.manufacturer : newProduct.manufacturer}
                    onChange={e => editingProduct ? setEditingProduct({ ...editingProduct, manufacturer: e.target.value }) : setNewProduct({ ...newProduct, manufacturer: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 p-6 bg-slate-50 rounded-[32px]">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acquisition</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">KES</span>
                    <input
                      type="number" required
                      className="w-full pl-12 pr-4 py-4 bg-white border-0 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-black text-slate-900 transition-all"
                      value={editingProduct ? editingProduct.buying_price : newProduct.buying_price}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        if (editingProduct) setEditingProduct({ ...editingProduct, buying_price: val });
                        else setNewProduct({ ...newProduct, buying_price: val });
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Retail Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 font-bold text-xs">KES</span>
                    <input
                      type="number" required
                      className="w-full pl-12 pr-4 py-4 bg-white border-0 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-black text-indigo-600 transition-all"
                      value={editingProduct ? editingProduct.price : newProduct.price}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        if (editingProduct) setEditingProduct({ ...editingProduct, price: val });
                        else setNewProduct({ ...newProduct, price: val });
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Low Alert</label>
                  <input
                    type="number" required
                    className="w-full px-4 py-4 bg-white border-0 rounded-xl outline-none focus:ring-4 focus:ring-rose-500/10 font-black text-rose-500 transition-all"
                    value={editingProduct ? editingProduct.low_stock_alert : newProduct.low_stock_alert}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      if (editingProduct) setEditingProduct({ ...editingProduct, low_stock_alert: val });
                      else setNewProduct({ ...newProduct, low_stock_alert: val });
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-6 bg-indigo-600 text-white font-black rounded-[24px] shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 transition-all uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-3"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload size={18} />
                    {editingProduct ? 'Commit Asset Changes' : 'Authorize Asset Deployment'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]">
            <div className="p-10 border-b flex justify-between items-center bg-indigo-600 text-white shrink-0">
              <div>
                <h3 className="text-3xl font-black tracking-tight">Bulk Asset Import</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mt-2">Excel / CSV Data Integration</p>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportData([]); setImageFiles([]); }} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X size={28} /></button>
            </div>

            <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div onClick={downloadTemplate} className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 hover:border-indigo-400 cursor-pointer transition-all group text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-sm text-indigo-500 group-hover:scale-110 transition-transform">
                    <Download size={32} />
                  </div>
                  <h4 className="font-bold text-slate-900">1. Download Template</h4>
                  <p className="text-xs text-slate-400 mt-2">Get standard CSV format</p>
                </div>

                <div className="relative p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 hover:border-indigo-400 cursor-pointer transition-all group text-center overflow-hidden">
                  <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImportFile} />
                  <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-sm text-emerald-500 group-hover:scale-110 transition-transform">
                    <FileSpreadsheet size={32} />
                  </div>
                  <h4 className="font-bold text-slate-900">2. Upload CSV</h4>
                  <p className="text-xs text-slate-400 mt-2">{importData.length > 0 ? `${importData.length} rows loaded` : 'Select .csv file'}</p>
                </div>

                <div className="relative p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 hover:border-indigo-400 cursor-pointer transition-all group text-center overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={(e) => {
                      if (e.target.files) setImageFiles(Array.from(e.target.files));
                    }}
                  />
                  <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-sm text-rose-500 group-hover:scale-110 transition-transform">
                    <ImageIcon size={32} />
                  </div>
                  <h4 className="font-bold text-slate-900">3. Select Images</h4>
                  <p className="text-xs text-slate-400 mt-2">{imageFiles.length > 0 ? `${imageFiles.length} files selected` : 'Upload product photos'}</p>
                </div>
              </div>

              {importData.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-slate-900">Preview ({importData.length} items)</h4>
                    <button onClick={() => setImportData([])} className="text-xs font-bold text-rose-500 hover:text-rose-600">Clear</button>
                  </div>
                  <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-100">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-400 font-bold uppercase sticky top-0">
                        <tr>
                          <th className="p-3">Name</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Price</th>
                          <th className="p-3">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {importData.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-3 font-medium text-slate-900">{item.name}</td>
                            <td className="p-3 text-slate-500">{item.category}</td>
                            <td className="p-3 font-bold text-indigo-600">{item.price}</td>
                            <td className="p-3 font-bold text-slate-900">{item.stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button onClick={confirmImport} disabled={loading} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" /> : <><Check size={20} /> Confirm Import</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
