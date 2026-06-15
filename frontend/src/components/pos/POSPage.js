import React, { useState, useCallback, useRef } from 'react';
import ProductSearch from './ProductSearch';
import CartTable from './CartTable';
import FBRStatus from './FBRStatus';
import { api } from '../../utils/api';

export default function POSPage() {
  const [cart, setCart] = useState([]);
  const [discountPct, setDiscountPct] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [fbrConnected, setFbrConnected] = useState(true);
  const customerRef = useRef(null);
  const discountRef = useRef(null);

  // Load customers list for udhaar
  React.useEffect(() => {
    api.customers.list().then(setCustomers).catch(() => {});
    // Blink FBR status (placeholder — real check would hit /api/health or FBR info endpoint)
    setFbrConnected(navigator.onLine);
    const onLine = () => setFbrConnected(true);
    const offLine = () => setFbrConnected(false);
    window.addEventListener('online', onLine);
    window.addEventListener('offline', offLine);
    return () => { window.removeEventListener('online', onLine); window.removeEventListener('offline', offLine); };
  }, []);

  const addToCart = useCallback((product) => {
    setCart((prev) => [
      ...prev,
      {
        product,
        unitType: 'BOX',
        quantity: 1,
        unitPrice: product.retailPrice || 0,
      },
    ]);
  }, []);

  const updateCartItem = useCallback((index, fields) => {
    setCart((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...fields };
      return next;
    });
  }, []);

  const removeCartItem = useCallback((index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const totalAmount = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountAmount = (totalAmount * discountPct) / 100;
  const netPayable = Math.round((totalAmount - discountAmount) * 100) / 100;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const result = await api.sales.create({
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitType: item.unitType,
          unitPrice: item.unitPrice,
        })),
        discountPercent: discountPct,
        paymentMethod: paymentMethod === 'UDHAAR' ? 'CREDIT' : paymentMethod,
        customerId: customerId || null,
      });

      setMessage({ type: 'success', text: `Sale complete! Total: Rs. ${netPayable.toFixed(2)}` });
      setCart([]);
      setDiscountPct(0);
      setCustomerId('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
    setSubmitting(false);
  };

  const handleKeyDown = (e) => {
    // F8 = checkout, F2 = focus search, F4 = focus discount
    if (e.key === 'F8') { e.preventDefault(); handleCheckout(); }
    if (e.key === 'F2') { e.preventDefault(); document.querySelector('input[type="text"]')?.focus(); }
    if (e.key === 'F4') { e.preventDefault(); discountRef.current?.focus(); }
  };

  return (
    <div className="h-full flex flex-col" onKeyDown={handleKeyDown}>
      {/* FBR Status Bar */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Point of Sale</h1>
        <FBRStatus connected={fbrConnected} />
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
          <button className="float-right font-bold" onClick={() => setMessage(null)}>&times;</button>
        </div>
      )}

      {/* Product Search */}
      <div className="mb-4">
        <ProductSearch onSelect={addToCart} />
        <p className="text-[11px] text-slate-400 mt-1 ml-1">
          <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono">F2</kbd> Search &nbsp;
          <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono">F4</kbd> Discount &nbsp;
          <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono">F8</kbd> Checkout
        </p>
      </div>

      {/* Cart + Summary */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Cart Table */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 overflow-auto">
          <CartTable items={cart} onUpdate={updateCartItem} onRemove={removeCartItem} />
        </div>

        {/* Summary Panel */}
        <div className="w-80 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Summary</h2>

          <div className="space-y-3 flex-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Items</span>
              <span className="font-semibold">{cart.reduce((s, i) => s + i.quantity, 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Amount</span>
              <span className="font-mono font-semibold">Rs. {totalAmount.toFixed(2)}</span>
            </div>

            <div>
              <label className="text-xs text-slate-500 font-medium">Discount %</label>
              <input
                ref={discountRef}
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={discountPct}
                onChange={(e) => setDiscountPct(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:border-blue-400 focus:ring-0"
              />
            </div>

            <div className="flex justify-between text-sm text-green-700">
              <span>Discount Amount</span>
              <span className="font-mono">- Rs. {discountAmount.toFixed(2)}</span>
            </div>

            <hr className="border-slate-200" />

            <div className="flex justify-between text-lg font-bold">
              <span>Net Payable</span>
              <span className="font-mono text-blue-600">Rs. {netPayable.toFixed(2)}</span>
            </div>

            <div>
              <label className="text-xs text-slate-500 font-medium">Payment</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:border-blue-400 focus:ring-0"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="UDHAAR">Udhaar (Credit)</option>
              </select>
            </div>

            {paymentMethod === 'UDHAAR' && (
              <div>
                <label className="text-xs text-slate-500 font-medium">Customer</label>
                <select
                  ref={customerRef}
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:border-blue-400 focus:ring-0"
                >
                  <option value="">-- Select --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.fullName} (Rs. {c.remainingBalance?.toFixed(0)})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || submitting}
            className={`w-full mt-5 py-3.5 rounded-xl text-lg font-bold transition-all ${
              cart.length === 0 || submitting
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-lg shadow-blue-200'
            }`}
          >
            {submitting ? 'Processing…' : `Checkout (F8)`}
          </button>
        </div>
      </div>
    </div>
  );
}
