import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({
    supplierId: '',
    items: [{ productId: '', batchNumber: '', expiryDate: '', quantity: 1, unitPrice: 0, looseConversionFactor: 30 }],
  });

  const load = useCallback(async () => {
    try { setLoading(true);
      const [o, p, s] = await Promise.all([api.purchaseOrders.list(), api.products.list(), api.suppliers.list()]);
      setOrders(o); setProducts(p); setSuppliers(s);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: '', batchNumber: '', expiryDate: '', quantity: 1, unitPrice: 0, looseConversionFactor: 30 }] });

  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx][field] = value;
    setForm({ ...form, items });
  };

  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await api.purchaseOrders.create(form);
      setMessage({ type: 'success', text: `Purchase order created! Total: Rs.${result.totalAmount?.toFixed(2)}` });
      setView('list');
      setForm({ supplierId: '', items: [{ productId: '', batchNumber: '', expiryDate: '', quantity: 1, unitPrice: 0, looseConversionFactor: 30 }] });
      load();
    } catch (e) { setMessage({ type: 'error', text: e.message }); }
  };

  if (view === 'create') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">New Purchase Order</h1>
          <button onClick={() => setView('list')} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">Back</button>
        </div>

        {message && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text} <button className="float-right font-bold" onClick={() => setMessage(null)}>&times;</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <label className="text-xs font-medium text-slate-500">Supplier *</label>
            <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} required
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:border-blue-400">
              <option value="">-- Select Supplier --</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Items</h3>
            <table className="w-full">
              <thead>
                <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b-2 border-slate-200">
                  <th className="py-2 px-2 text-left">Product</th>
                  <th className="py-2 px-2 text-left">Batch #</th>
                  <th className="py-2 px-2 text-left">Expiry</th>
                  <th className="py-2 px-2 text-right">Qty</th>
                  <th className="py-2 px-2 text-right">Unit Price</th>
                  <th className="py-2 px-2 text-right">Subtotal</th>
                  <th className="py-2 px-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 px-2">
                      <select value={item.productId} onChange={(e) => updateItem(i, 'productId', e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-sm bg-white focus:border-blue-400">
                        <option value="">-- Select --</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.brandName}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-2"><input value={item.batchNumber} onChange={(e) => updateItem(i, 'batchNumber', e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-sm font-mono focus:border-blue-400" /></td>
                    <td className="py-2 px-2"><input type="date" value={item.expiryDate} onChange={(e) => updateItem(i, 'expiryDate', e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-sm focus:border-blue-400" /></td>
                    <td className="py-2 px-2"><input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 0)} className="w-20 px-2 py-1.5 border rounded-lg text-sm text-right focus:border-blue-400" /></td>
                    <td className="py-2 px-2"><input type="number" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1.5 border rounded-lg text-sm text-right font-mono focus:border-blue-400" /></td>
                    <td className="py-2 px-2 text-right font-mono text-sm font-bold">Rs.{(item.quantity * item.unitPrice).toFixed(2)}</td>
                    <td className="py-2 px-2 text-center">
                      <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700 text-lg leading-none">&times;</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={addItem} className="mt-3 px-3 py-1.5 border-2 border-dashed border-slate-300 rounded-lg text-xs font-medium text-slate-500 hover:border-blue-400 hover:text-blue-600">+ Add Item</button>

            {form.items.length > 0 && (
              <div className="text-right mt-3 text-sm font-bold text-slate-800">
                Total: Rs.{form.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0).toFixed(2)}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={!form.supplierId || form.items.some((i) => !i.productId)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:bg-slate-300">Create Purchase Order</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Purchase Orders</h1>
        <button onClick={() => setView('create')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">+ New Order</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-400">Loading...</div>
        : orders.length === 0 ? <div className="p-8 text-center text-slate-400">No purchase orders yet</div>
        : (
          <table className="w-full">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b-2 border-slate-200 bg-slate-50">
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-left">Supplier</th>
                <th className="py-3 px-4 text-right">Items</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50 text-sm">
                  <td className="py-3 px-4 text-slate-500">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{o.supplier?.name}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">{o.items?.length || 0}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">Rs.{o.totalAmount?.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-mono text-green-600">Rs.{o.paidAmount?.toFixed(2)}</td>
                  <td className={`py-3 px-4 text-right font-mono ${o.remainingAmount > 0 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                    Rs.{o.remainingAmount?.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
