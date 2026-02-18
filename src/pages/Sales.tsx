import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingCart, Plus, Minus, Search, Trash2, CreditCard, Banknote, Printer, FileText, CheckCircle2, UserPlus, Package, Smartphone } from 'lucide-react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode'; // Import QR Code library
import { supabase } from '../lib/supabase';
import { store, LOGO_URL } from '../store';
import { SaleType, Product, Sale } from '../types';

const STORE_CONFIG = {
  name: "KINTHITHE STORE",
  branch: "KINTHITHE",
  address: "P.O. Box 266 EMBU",
  tel: "0710236236",
  pin: "P051123456X",
  till: "4209800",
  vatRate: 3.00,
};

// Backend API URL (Render Production)
const API_BASE_URL = 'https://kinthithe2026.onrender.com';

// Sub-component for Receipt Content to avoid duplication
const ReceiptContent: React.FC<{ receipt: Sale[], allProducts: Product[], qrCodeUrl: string }> = ({ receipt, allProducts, qrCodeUrl }) => {
  if (!receipt || receipt.length === 0) return null;

  // Calculations
  const rSub = receipt.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const rVat = rSub * (STORE_CONFIG.vatRate / 100);
  const rTotal = rSub + rVat;
  const rLoyalty = Math.floor(rSub / 100);
  const rPaid = receipt[0]?.amount_paid || rTotal;
  const rChange = receipt[0]?.change_amount || 0;

  return (
    <div className="w-full flex flex-col items-center">
      {/* Header */}
      <div className="text-center w-full uppercase">
        <h1 className="text-base font-black mb-1">{STORE_CONFIG.name}</h1>
        <p>[{STORE_CONFIG.branch}]</p>
        <p>{STORE_CONFIG.address}</p>
        <p>Tel: {STORE_CONFIG.tel}</p>
      </div>
      <div className="dashed-line w-full border-b border-dashed border-black my-1"></div>

      {/* Metadata */}
      <div className="w-full text-left">
        <p>Receipt No: {receipt[0]?.payment_ref || 'N/A'}</p>
        <p>Date: {new Date().toLocaleDateString()} Time: {new Date().toLocaleTimeString()}</p>
        <p>Till No: {STORE_CONFIG.till} Cashier: System</p>
      </div>
      <div className="dashed-line w-full border-b border-dashed border-black my-1"></div>

      {/* Items Header */}
      <div className="w-full flex justify-between font-bold">
        <span className="w-1/2 text-left">Item</span>
        <span className="w-1/6 text-center">Qty</span>
        <span className="w-1/6 text-right">Price</span>
        <span className="w-1/6 text-right">Tot</span>
      </div>
      <div className="dashed-line w-full border-b border-dashed border-black my-1"></div>

      {/* Items List */}
      <div className="w-full space-y-1">
        {receipt.map((item, i) => {
          const product = allProducts.find(p => p.product_id === item.product_id);
          return (
            <div key={i} className="flex justify-between items-start">
              <span className="w-1/2 text-left uppercase truncate">{product?.name || 'Unknown'}</span>
              <span className="w-1/6 text-center">{item.quantity}</span>
              <span className="w-1/6 text-right">{product?.price}</span>
              <span className="w-1/6 text-right">{item.total_price}</span>
            </div>
          );
        })}
      </div>
      <div className="dashed-line w-full border-b border-dashed border-black my-1"></div>

      {/* Totals */}
      <div className="w-full space-y-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{rSub.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>VAT ({STORE_CONFIG.vatRate} %)</span>
          <span>{rVat.toFixed(2)}</span>
        </div>
      </div>
      <div className="dashed-line w-full border-b border-dashed border-black my-1"></div>

      <div className="w-full flex justify-between font-bold text-sm">
        <span>TOTAL AMOUNT</span>
        <span>{rTotal.toLocaleString()}</span>
      </div>
      <div className="dashed-line w-full border-b border-dashed border-black my-1"></div>

      {/* Payment Info */}
      <div className="w-full space-y-1">
        <div className="flex justify-between">
          <span>Payment Method:</span>
          <span className="uppercase">{receipt[0]?.sale_type || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span>Transaction / Ref No:</span>
          <span>{receipt[0]?.payment_ref || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span>Amount Paid</span>
          <span>{rPaid.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Change</span>
          <span>{rChange.toLocaleString()}</span>
        </div>
      </div>
      <div className="dashed-line w-full border-b border-dashed border-black my-1"></div>

      {/* Loyalty */}
      <div className="w-full flex justify-between">
        <span>Loyalty Points Earned:</span>
        <span>{rLoyalty}</span>
      </div>
      <div className="dashed-line w-full border-b border-dashed border-black my-1"></div>

      {/* Footer */}
      <div className="text-center w-full space-y-1 mt-2">
        <p className="font-bold">Return Policy:</p>
        <p>Goods once sold are only returnable</p>
        <p>within 24hrs with a valid receipt.</p>
      </div>
      <div className="dashed-line w-full border-b border-dashed border-black my-1"></div>

      <p className="font-bold text-center w-full uppercase my-2">THANK YOU FOR SHOPPING WITH US</p>
      <div className="dashed-line w-full border-b border-dashed border-black my-1"></div>

      <p className="text-center w-full">Website: <span className="font-bold">www.kinthithe.co.ke</span></p>
      <div className="mt-4 border-2 border-black p-2 w-full text-center flex justify-center">
        {qrCodeUrl ? (
          <img src={qrCodeUrl} alt="Receipt QR" className="w-24 h-24" />
        ) : (
          <p className="text-[8px] font-bold">[Generating QR...]</p>
        )}
      </div>
    </div>
  );
};

export const Sales: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<{ product: Product, quantity: number }[]>([]);
  const [saleType, setSaleType] = useState<SaleType>(SaleType.CASH);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [customerInfo, setCustomerInfo] = useState({ full_name: '', phone: '', address: '' });
  const [debtorDetails, setDebtorDetails] = useState({ full_name: '', phone: '', address: '' }); // For Credit & Loyalty
  const [showCustomerForm, setShowCustomerForm] = useState(false); // Toggle for Cash
  const [receipt, setReceipt] = useState<Sale[] | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [amountTendered, setAmountTendered] = useState<string>(''); // For Change Calculation
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'sending' | 'waiting' | 'success'>('idle');

  // Format phone number for MPesa (254...)
  const formatPhoneNumber = (phone: string) => {
    let p = phone.replace(/\D/g, ''); // Remove non-digits
    if (p.startsWith('0')) return '254' + p.substring(1);
    if (p.startsWith('7') || p.startsWith('1')) return '254' + p;
    if (p.startsWith('254')) return p;
    return p; // Return as is if unknown, validation will catch it
  };

  // Fetch Products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('name');

        if (error) throw error;
        setAllProducts(data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Categories
  const categories = useMemo(() => {
    const cats = new Set(allProducts.map(p => p.category));
    return ['ALL', ...Array.from(cats)].sort();
  }, [allProducts]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.includes(searchTerm);
      const matchesCategory = selectedCategory === 'ALL' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allProducts, searchTerm, selectedCategory]);

  // Cart Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const vatAmount = cartSubtotal * (STORE_CONFIG.vatRate / 100);
  const grandTotal = cartSubtotal + vatAmount;
  const changeAmount = useMemo(() => {
    const paid = parseFloat(amountPaid) || 0;
    return Math.max(0, paid - grandTotal);
  }, [amountPaid, grandTotal]);

  // Cart Actions
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.product_id === product.product_id);
      if (existing) {
        return prev.map(item =>
          item.product.product_id === product.product_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.product_id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.product_id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  // Receipt PDF Generation
  const generateReceiptPDF = (salesData: Sale[]) => {
    const lineHeight = 3;

    // Calculate Dynamic Content Height
    const itemHeight = salesData.length * lineHeight;
    const headerHeight = 35; // Name, Address, etc.
    const metadataHeight = 30; // Ref, Date, Time, Till, Cashier
    const totalsHeight = 35; // Subtotal, VAT, Total, Payment Method, Ref, Paid, Change, Loyalty
    const footerHeight = 40; // Policies, Thank You, QR
    const totalHeight = headerHeight + metadataHeight + itemHeight + totalsHeight + footerHeight + 10; // +10mm buffer

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [58, totalHeight]
    });

    const centerX = 29;
    let y = 5;
    const dashedLine = '-------------------------------------';

    // Helper for centered text
    const centerText = (text: string, yPos: number, size = 9, bold = false) => {
      doc.setFont("Courier", bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.text(text, centerX, yPos, { align: "center" });
    };

    // Helper for left-right text
    const rowText = (left: string, right: string, yPos: number, size = 9) => {
      doc.setFont("Courier", "normal");
      doc.setFontSize(size);
      doc.text(left, 2, yPos);
      doc.text(right, 56, yPos, { align: "right" });
    };

    // Header
    centerText(STORE_CONFIG.name, y, 10, true); y += lineHeight + 1;
    centerText(`[${STORE_CONFIG.branch}]`, y); y += lineHeight;
    centerText(STORE_CONFIG.address, y); y += lineHeight;
    centerText(`Tel: ${STORE_CONFIG.tel}`, y); y += lineHeight;
    centerText(dashedLine, y); y += lineHeight;

    // Metadata
    const sale = salesData[0];
    rowText(`Receipt No:`, sale.payment_ref || 'N/A', y); y += lineHeight;

    // Split Date/Time to avoid overlap on narrow paper
    rowText(`Date: ${new Date().toLocaleDateString()}`, "", y, 8); y += lineHeight;
    rowText(`Time: ${new Date().toLocaleTimeString()}`, "", y, 8); y += lineHeight;

    // Split Till/Cashier
    rowText(`Till: ${STORE_CONFIG.till}`, "", y, 8); y += lineHeight;
    rowText(`Cashier: System`, "", y, 8); y += lineHeight;

    centerText(dashedLine, y); y += lineHeight;

    // Items Header
    doc.setFont("Courier", "bold");
    doc.setFontSize(8); // Slightly smaller for table headers
    doc.text("Item", 2, y);
    doc.text("Qty", 35, y, { align: "center" });
    doc.text("Tot", 56, y, { align: "right" });
    y += lineHeight;
    centerText(dashedLine, y); y += lineHeight;

    // Items
    salesData.forEach(item => {
      const product = allProducts.find(p => p.product_id === item.product_id);
      // Allow slightly longer name or handle truncation better if needed
      // Currently limited to 18 chars for single line
      const name = product?.name.substring(0, 18) || 'Unknown';
      const qty = item.quantity.toString();
      const total = item.total_price.toString();

      doc.setFont("Courier", "normal");
      doc.setFontSize(8); // Smaller font for items to fit more
      doc.text(name, 2, y);
      doc.text(qty, 35, y, { align: "center" });
      doc.text(total, 56, y, { align: "right" });
      y += lineHeight;
    });
    centerText(dashedLine, y); y += lineHeight;

    // Calculate TOTALS from salesData directly (fix for 0 total bug)
    const receiptSubtotal = salesData.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const receiptVat = receiptSubtotal * (STORE_CONFIG.vatRate / 100);
    const receiptTotal = receiptSubtotal + receiptVat;
    const receiptLoyalty = Math.floor(receiptSubtotal / 100);

    // Subtotals
    rowText("Subtotal", receiptSubtotal.toLocaleString(), y); y += lineHeight;
    rowText(`VAT (${STORE_CONFIG.vatRate}%)`, receiptVat.toFixed(2), y); y += lineHeight;
    centerText(dashedLine, y); y += lineHeight;

    // Total
    doc.setFont("Courier", "bold");
    doc.setFontSize(11);
    rowText("TOTAL AMOUNT", `KES ${receiptTotal.toLocaleString()}`, y, 11); y += lineHeight + 2;
    doc.setFontSize(9);
    centerText(dashedLine, y); y += lineHeight;

    // Payment Info
    rowText("Method:", salesData[0].sale_type.toUpperCase(), y); y += lineHeight;
    rowText("Ref:", sale.payment_ref || 'N/A', y); y += lineHeight;
    rowText("Paid:", (sale.amount_paid || receiptTotal).toLocaleString(), y); y += lineHeight;
    rowText("Change:", (sale.change_amount || 0).toLocaleString(), y); y += lineHeight;
    centerText(dashedLine, y); y += lineHeight;

    // Loyalty
    rowText("Loyalty Pts:", receiptLoyalty.toString(), y); y += lineHeight;
    centerText(dashedLine, y); y += lineHeight;

    // Footer
    y += 2;
    centerText("Return Policy:", y, 9, true); y += lineHeight;
    centerText("Goods once sold are only returnable", y, 7); y += lineHeight;
    centerText("within 24hrs with a valid receipt.", y, 7); y += lineHeight;
    centerText(dashedLine, y); y += lineHeight;

    y += 2;
    centerText("THANK YOU FOR SHOPPING WITH US", y, 9, true); y += lineHeight;
    centerText(dashedLine, y); y += lineHeight;
    centerText(`www.kinthithe.co.ke`, y); y += lineHeight + 4;

    // Generate QR Code
    try {
      QRCode.toDataURL(`Receipt: ${sale.payment_ref}\nTotal: ${receiptTotal}\nDate: ${new Date().toLocaleDateString()}`)
        .then(url => {
          doc.addImage(url, 'PNG', 20, y, 18, 18); // Centered QR Code
          doc.setFontSize(7);
          doc.text("Scan to Verify", 29, y + 22, { align: "center" });
          doc.save(`Receipt-${sale.payment_ref}.pdf`);
        })
        .catch(err => {
          console.error("QR Error", err);
          doc.save(`Receipt-${sale.payment_ref}.pdf`);
        });
    } catch (e) {
      console.error("QR Generation Failed", e);
      doc.save(`Receipt-${sale.payment_ref}.pdf`);
    }
  };

  // Generate QR for Modal
  useEffect(() => {
    if (receipt && receipt.length > 0) {
      const sale = receipt[0];
      const rSub = receipt.reduce((sum, item) => sum + (item.total_price || 0), 0);
      const rVat = rSub * (STORE_CONFIG.vatRate / 100);
      const rTotal = rSub + rVat;

      QRCode.toDataURL(`Receipt: ${sale.payment_ref}\nTotal: ${rTotal}\nDate: ${new Date().toLocaleDateString()}`)
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error("QR Modal Error", err));
    } else {
      setQrCodeUrl('');
    }
  }, [receipt]);

  // Complete Sale (Cash/Credit)
  const handleCompleteSale = async () => {
    if (cart.length === 0) return alert("Cart is empty");

    setLoading(true);
    const generatedRef = `POS${Date.now().toString().slice(-9)}`;
    const timestamp = new Date().toISOString();

    try {
      const paymentAmount = parseFloat(amountPaid) || 0;

      // Validate Cash Tender
      if (saleType === SaleType.CASH) {
        const tendered = parseFloat(amountTendered);
        if (!amountTendered || isNaN(tendered)) {
          alert("Please enter amount tendered");
          setLoading(false);
          return;
        }
        if (tendered < grandTotal) {
          alert(`Amount tendered (KES ${tendered}) is less than total (KES ${grandTotal})`);
          setLoading(false);
          return;
        }
      }

      for (const item of cart) {
        // Determine amount_paid per item
        // For Cash, if total paid >= grandTotal, each item is fully paid.
        // For Credit, usually 0 paid initially.
        let itemPaid = 0;
        let itemChange = 0;
        const itemTotal = item.product.price * item.quantity;

        if (saleType === SaleType.CASH) {
          const tendered = parseFloat(amountTendered) || 0;
          if (tendered >= grandTotal) {
            // Include VAT in itemPaid
            itemPaid = itemTotal + (itemTotal * (STORE_CONFIG.vatRate / 100));
          } else {
            // Partial payment - shouldn't happen due to check above, but purely for logic safety
            itemPaid = 0;
          }
        } else if (saleType === SaleType.MPESA) {
          // MPesa is always full paid including VAT
          itemPaid = itemTotal + (itemTotal * (STORE_CONFIG.vatRate / 100));
        }

        // We record the FULL change on the first item only to avoid duplicating it in stats?
        // Or better: record 0 change on items, and just track it in a separate transaction log?
        // Current table `sales` has `change_amount`.
        // If we buy 2 items, creating 2 rows, which one gets the change?
        // Let's assign change to the first item for simplicity in aggregation.
        if (cart.indexOf(item) === 0 && saleType === SaleType.CASH) {
          const tendered = parseFloat(amountTendered) || 0;
          if (tendered >= grandTotal) {
            itemChange = tendered - grandTotal;
          }
        }

        await store.recordSale({
          product_id: item.product.product_id,
          quantity: item.quantity,
          sale_type: saleType,
          payment_ref: generatedRef,
          amount_paid: itemPaid,
          customer_id: undefined,
          change_amount: itemChange // Record change
        }, (saleType === SaleType.CREDIT || (saleType === SaleType.CASH && showCustomerForm)) ? debtorDetails : undefined);
      }

      // Fetch recorded sales for receipt
      const { data } = await supabase
        .from('sales')
        .select('*')
        .eq('payment_ref', generatedRef);

      setReceipt(data || []);

      const receiptData = data || [];
      if (receiptData.length > 0) {
        generateReceiptPDF(receiptData);
      }

      setCart([]);
      setAmountPaid('');
      setPaymentRef('');

      setDebtorDetails({ full_name: '', phone: '', address: '' });
      setShowCustomerForm(false);

      // Removed window.print()
      // setTimeout(() => window.print(), 500);

    } catch (err) {
      console.error("Sale Error", err);
      alert("Failed to record sale");
    } finally {
      setLoading(false);
    }
  };

  // Payment Logic
  const initiateMpesaPayment = async () => {
    if (!customerInfo.phone) {
      alert("Enter phone number for MPESA payment");
      return;
    }

    setLoading(true);
    setPaymentStatus('sending');
    const generatedRef = `POS${Date.now().toString().slice(-9)}`;
    setPaymentRef(generatedRef);

    try {
      // 1. Record Sale as Pending
      for (const item of cart) {
        await store.recordSale({
          product_id: item.product.product_id,
          quantity: item.quantity,
          sale_type: SaleType.MPESA,
          payment_ref: generatedRef,
          amount_paid: 0,
          customer_id: undefined, // Or handle customer logic if needed
          total_price: item.product.price * item.quantity,
          date: new Date().toISOString(),
          loyalty_points: 0, // Simplified
          change_amount: 0,
        } as any); // Type casting as recordSale might handle partials or I need to match strictly
        // Actually store.recordSale likely takes simpler object. 
        // I will assume it handles the insert. 
      }

      // 2. Send STK Push
      const response = await fetch(`${API_BASE_URL}/api/initiate-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: formatPhoneNumber(customerInfo.phone),
          amount: Math.ceil(grandTotal),
          external_reference: generatedRef,
          callback_url: `${API_BASE_URL}/api/callback`,
        })
      });

      const result = await response.json();

      if (result.success) {
        setPaymentStatus('waiting');
      } else {
        alert(`MPESA Failed: ${result.message || 'Unknown error'}`);
        setPaymentStatus('idle');
      }
    } catch (err) {
      console.error("MPESA Error", err);
      // alert("Network Error: Could not initiate MPESA payment.");
      setPaymentStatus('idle');
    } finally {
      // Keep loading false, but status reflects state
      if (paymentStatus !== 'waiting') setLoading(false);
    }
  };

  // Polling Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (saleType === SaleType.MPESA && paymentRef && paymentStatus === 'waiting') {
      interval = setInterval(async () => {
        console.log("Polling for payment...", paymentRef);
        const { data } = await supabase
          .from('sales')
          .select('*')
          .eq('payment_ref', paymentRef);

        const paidSale = data?.find(s => s.amount_paid && s.amount_paid >= grandTotal);

        if (paidSale) {
          console.log("Payment Confirmed! Printing...");
          clearInterval(interval);
          setPaymentStatus('success');

          setTimeout(() => {
            setReceipt(data || []);

            const receiptData = data || [];
            if (data && data.length > 0) {
              generateReceiptPDF(data);
            }

            setCart([]);
            setPaymentRef('');
            setCustomerInfo({ full_name: '', phone: '', address: '' });
            setPaymentStatus('idle'); // Or 'success' to keep showing checkmark?
            // setTimeout(() => window.print(), 500);
          }, 1500);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [saleType, paymentRef, grandTotal, paymentStatus]);

  // Render
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-full animate-in fade-in duration-500 p-6">
      {/* LEFT COLUMN: PRODUCTS */}
      <div className="xl:col-span-8 flex flex-col gap-6">
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-20" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          {filteredProducts.map(product => (
            <div
              key={product.product_id}
              onClick={() => addToCart(product)}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-95"
            >
              <div className="h-32 bg-slate-50 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="text-slate-300 group-hover:scale-110 transition-transform duration-300" size={40} />
                )}
                <div className="absolute top-2 right-2 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-lg">
                  {product.stock} left
                </div>
              </div>
              <h3 className="font-bold text-slate-800 line-clamp-1">{product.name}</h3>
              <p className="text-xs text-slate-400 mb-2">{product.category}</p>
              <div className="flex justify-between items-center">
                <span className="text-blue-600 font-bold">KES {product.price.toLocaleString()}</span>
                <button className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition-colors">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: CART */}
      <div className="xl:col-span-4 flex flex-col gap-6">
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl flex flex-col h-[calc(100vh-40px)] sticky top-5 overflow-hidden">
          {/* Cart Header */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShoppingCart className="text-blue-600" />
              <h2 className="text-xl font-bold text-slate-800">Current Sale</h2>
            </div>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
              {cart.length} Items
            </span>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                <ShoppingCart size={48} className="opacity-20" />
                <p>Cart is empty</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.product_id} className="flex gap-4 p-3 bg-slate-50 rounded-2xl group">
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 text-sm">{item.product.name}</h4>
                    <p className="text-blue-600 font-bold text-xs mt-1">
                      @{item.product.price} x {item.quantity}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-bold text-slate-800 text-sm">
                      {(item.product.price * item.quantity).toLocaleString()}
                    </span>
                    <div className="flex gap-1 items-center bg-white rounded-lg p-1 border border-slate-100 shadow-sm">
                      <button onClick={() => updateQuantity(item.product.product_id, -1)} className="p-1 hover:bg-slate-50 rounded"><Minus size={12} /></button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.product_id, 1)} className="p-1 hover:bg-slate-50 rounded"><Plus size={12} /></button>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.product.product_id)} className="text-red-400 hover:text-red-600 self-center p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Payment Section */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-6">
            {/* Payment Type Selection */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-white rounded-xl border border-slate-200">
              {[SaleType.CASH, SaleType.MPESA, SaleType.CREDIT].map(type => (
                <button
                  key={type}
                  onClick={() => setSaleType(type)}
                  className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${saleType === type
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* DEBTOR / CUSTOMER DETAILS FORM */}
            {(saleType === SaleType.CREDIT || (saleType === SaleType.CASH)) && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">

                {saleType === SaleType.CASH && (
                  <button
                    onClick={() => setShowCustomerForm(!showCustomerForm)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {showCustomerForm ? <Minus size={12} /> : <Plus size={12} />}
                    {showCustomerForm ? "Remove Customer Info" : "Add Customer for Loyalty"}
                  </button>
                )}

                {(saleType === SaleType.CREDIT || showCustomerForm) && (
                  <div className={`p-4 rounded-3xl border space-y-3 shadow-sm ${saleType === SaleType.CREDIT ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <UserPlus size={16} className={saleType === SaleType.CREDIT ? "text-red-500" : "text-blue-500"} />
                      <p className={`text-[10px] font-black uppercase tracking-widest ${saleType === SaleType.CREDIT ? "text-red-500" : "text-blue-500"}`}>
                        {saleType === SaleType.CREDIT ? "Debtor Details (Required)" : "Customer Details (Optional)"}
                      </p>
                    </div>

                    <input
                      type="text" placeholder="Full Name" required={saleType === SaleType.CREDIT}
                      className="w-full px-4 py-2 bg-white border-transparent focus:border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 text-sm"
                      value={debtorDetails.full_name}
                      onChange={e => setDebtorDetails({ ...debtorDetails, full_name: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text" placeholder="Phone" required={saleType === SaleType.CREDIT}
                        className="w-full px-4 py-2 bg-white border-transparent focus:border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 text-sm"
                        value={debtorDetails.phone}
                        onChange={e => setDebtorDetails({ ...debtorDetails, phone: e.target.value })}
                      />
                      <input
                        type="text" placeholder="Location"
                        className="w-full px-4 py-2 bg-white border-transparent focus:border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 text-sm"
                        value={debtorDetails.address}
                        onChange={e => setDebtorDetails({ ...debtorDetails, address: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MPESA UI */}
            {saleType === SaleType.MPESA && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                <div className="p-5 bg-white rounded-3xl border border-emerald-100 space-y-3 shadow-sm">

                  {paymentStatus === 'idle' && (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <Smartphone size={16} className="text-emerald-500" />
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">M-Pesa Customer Number</p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text" placeholder="2547..." required
                          name="mpesaPhone" id="mpesaPhone"
                          className="w-full px-4 py-3 bg-emerald-50/50 border-transparent focus:bg-white border focus:border-emerald-200 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 font-black text-lg text-emerald-900 transition-all tracking-widest"
                          value={customerInfo.phone}
                          onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                        />
                        <button
                          onClick={initiateMpesaPayment}
                          disabled={loading || !customerInfo.phone}
                          className="px-4 bg-emerald-500 text-white rounded-xl font-bold text-xs hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                        >
                          PUSH
                        </button>
                      </div>
                    </>
                  )}

                  {paymentStatus === 'sending' && (
                    <div className="flex flex-col items-center justify-center py-4 space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                      <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Sending STK Push...</p>
                    </div>
                  )}

                  {paymentStatus === 'waiting' && (
                    <div className="flex flex-col items-center justify-center py-4 space-y-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="animate-pulse rounded-full h-3 w-3 bg-emerald-500"></div>
                      <p className="text-xs font-black text-emerald-800 uppercase tracking-widest text-center">Check Phone & Enter PIN</p>
                      <p className="text-[10px] font-bold text-emerald-600 text-center">Waiting for payment confirmation...</p>
                    </div>
                  )}

                  {paymentStatus === 'success' && (
                    <div className="flex flex-col items-center justify-center py-4 space-y-2 bg-emerald-100 rounded-xl border border-emerald-200">
                      <CheckCircle2 size={32} className="text-emerald-600" />
                      <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">Payment Successful!</p>
                      <p className="text-[10px] font-bold text-emerald-600">Generating Receipt...</p>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* Totals */}
            <div className="space-y-4">
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-sm font-medium">Subtotal</span>
                  <span className="font-bold">KES {cartSubtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-sm font-medium">VAT ({STORE_CONFIG.vatRate}%)</span>
                  <span className="font-bold">KES {vatAmount.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-slate-400 text-sm font-medium">Total Amount</span>
                <span className="text-3xl font-black text-slate-800">KES {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            {/* Amount Tendered Input (Visible for Cash/Credit) */}
            {saleType !== SaleType.MPESA && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-500 uppercase">Amount Tendered (KES)</label>
                <input
                  type="number"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Amount..."
                />
                <div className="flex justify-between items-center bg-slate-100 p-3 rounded-lg">
                  <span className="text-slate-500 font-bold text-sm">CHANGE:</span>
                  <span className="text-xl font-black text-slate-800">
                    KES {amountTendered && !isNaN(parseFloat(amountTendered))
                      ? (parseFloat(amountTendered) - grandTotal).toLocaleString()
                      : '0'}
                  </span>
                </div>
              </div>
            )}

            {/* Complete Sale Button (For Cash/Credit) */}
            {saleType !== SaleType.MPESA && (
              <button
                onClick={handleCompleteSale}
                disabled={loading || cart.length === 0}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                {loading ? 'PROCESSING...' : 'COMPLETE SALE'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RECEIPT MODAL */}
      {/* RECEIPT MODAL */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-xl animate-in fade-in duration-300">
          <style>
            {`
              @media print {
                /* Hide the main app root */
                #root { display: none !important; }
                
                /* Ensure print portal is visible */
                #print-portal { 
                   display: block !important;
                   background: white;
                   position: absolute;
                   top: 0;
                   left: 0;
                   width: 100%;
                   margin: 0;
                   padding: 0;
                }
                
                /* Receipt styling for print */
                .print-receipt {
                   width: 58mm !important;
                   font-size: 11px !important; /* Slightly larger for readability */
                   font-family: 'Courier New', Courier, monospace !important;
                   font-weight: bold;
                   color: black !important;
                   padding: 5px !important;
                   margin: 0 !important;
                }
                .print-receipt * {
                   visibility: visible !important;
                   color: black !important;
                }
                
                /* Hide buttons */
                button { display: none !important; }
              }
            `}
          </style>

          <div className="bg-white w-full max-w-[350px] shadow-2xl overflow-hidden border border-white/20 relative rounded-none">

            {/* On-Screen Receipt View */}
            <div id="receipt-display" className="bg-white font-mono text-[10px] leading-tight text-black p-4 relative z-10 w-full flex flex-col items-center">
              <ReceiptContent receipt={receipt} allProducts={allProducts} qrCodeUrl={qrCodeUrl} />
            </div>

            {/* Print Portal - Renders directly to body when printing */}
            {createPortal(
              <div id="print-portal" className="hidden print:block">
                <div className="print-receipt">
                  <ReceiptContent receipt={receipt} allProducts={allProducts} qrCodeUrl={qrCodeUrl} />
                </div>
              </div>,
              document.body
            )}



            {/* Modal Buttons */}
            <div className="p-4 bg-slate-50 flex gap-2">
              <button onClick={() => setReceipt(null)} className="flex-1 py-3 text-slate-500 font-bold rounded-xl hover:bg-slate-100">Close</button>
              <button onClick={() => window.print()} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                <Printer size={18} /> Print
              </button>
              <button onClick={() => receipt && generateReceiptPDF(receipt)} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                <FileText size={18} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};