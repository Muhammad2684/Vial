import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export default function AdjustmentsPage() {
  const [products, setProducts] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [view, setView] = useState('list');
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({
    productId: '', batchId: '', type: 'WRITE_OFF', quantity: 1, unitType: 'BOX', reason: '',
  });

  const load = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([api.products.list(), api.inventory.adjustments()]);
      setProducts(p); setAdjustments(a);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.inventory.adjust(form);
      setMessage({ type: 'success', text: `${form.type} adjustment of ${form.quantity} ${form.unitType} recorded` });
      setForm({ productId: '', batchId: '', type: 'WRITE_OFF', quantity: 1, unitType: 'BOX', reason: '' });
      setView('list');
      load();
    } catch (e) { setMessage({ type: 'error', text: e.message }); }
  };

  const typeColors = {
    WRITE_OFF: 'bg-red-100 text-red-700',
    DAMAGE: 'bg-orange-100 text-orange-700',
    FOUND: 'bg-green-100 text-green-700',
    RETURN: 'bg-blue-100 text-blue-700',
    SALE: 'bg-purple-100 text-purple-700',
    STOCK_INTAKE: 'bg-teal-100 text-teal-700',
    PURCHASE_ORDER: 'bg-indigo-100 text-indigo-700',
  };

  if (view === 'create') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Stock Adjustment</h1>
          <button onClick={() => setView('list')} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">Back</button>
        </div>

        {message && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text} <button className="float-right font-bold" onClick={() => setMessage(null)}>&times;</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-lg">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white focus:border-blue-400">
                <option value="WRITE_OFF">Write Off</option>
                <option value="DAMAGE">Damage</option>
                <option value="FOUND">Found (Add Stock)</option>
                <option value="RETURN">Return (Add Stock)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500">Product</label>
              <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white focus:border-blue-400">
                <option value="">-- Select --</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.brandName}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500">Batch ID (optional)</label>
              <input value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm font-mono focus:border-blue-400" placeholder="Leave empty if unknown" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Unit Type</label>
                <select value={form.unitType} onChange={(e) => setForm({ ...form, unitType: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white focus:border-blue-400">
                  <option value="BOX">Box</option>
                  <option value="LOOSE">Loose</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Quantity</label>
                <input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm text-right focus:border-blue-400" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500">Reason</label>
              <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:border-blue-400" placeholder="Why is this adjustment being made?" />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button type="submit" disabled={!form.productId}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:bg-slate-300">
              Record Adjustment
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Stock Adjustments</h1>
        <button onClick={() => setView('create')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">+ New Adjustment</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {adjustments.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No adjustments recorded</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b-2 border-slate-200 bg-slate-50">
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-left">Product</th>
                <th className="py-3 px-4 text-left">Type</th>
                <th className="py-3 px-4 text-right">Qty</th>
                <th className="py-3 px-4 text-left">Unit</th>
                <th className="py-3 px-4 text-left">Reason</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50 text-sm">
                  <td className="py-3 px-4 text-slate-500">{new Date(a.createdAt).toLocaleString()}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{a.product?.brandName}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${typeColors[a.type] || 'bg-slate-100 text-slate-700'}`}>
                      {a.type}
                    </span>
                  </td>
                  <td className={`py-3 px-4 text-right font-mono font-bold ${['WRITE_OFF','DAMAGE','SALE'].includes(a.type) ? 'text-red-600' : 'text-green-600'}`}>
                    {['WRITE_OFF','DAMAGE','SALE'].includes(a.type) ? '-' : '+'}{a.quantity}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${a.unitType === 'BOX' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {a.unitType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-xs">{a.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
