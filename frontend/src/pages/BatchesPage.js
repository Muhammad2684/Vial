import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    try {
      let data;
      if (filter === 'expiring') data = await api.reports.expiring(30);
      else if (filter === 'expired') data = await api.batches.list('?expired=true');
      else data = await api.batches.list();
      setBatches(data);
    } catch {}
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const filters = [
    { key: 'all', label: 'All Batches' },
    { key: 'expiring', label: 'Expiring Soon (30d)' },
    { key: 'expired', label: 'Expired' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Inventory Batches</h1>

      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f.key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {batches.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No batches found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b-2 border-slate-200 bg-slate-50">
                <th className="py-3 px-4 text-left">Product</th>
                <th className="py-3 px-4 text-left">Batch #</th>
                <th className="py-3 px-4 text-left">Expiry</th>
                <th className="py-3 px-4 text-right">In Stock</th>
                <th className="py-3 px-4 text-right">Purchase</th>
                <th className="py-3 px-4 text-right">Retail</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => {
                const expired = new Date(b.expiryDate) < new Date();
                const expiringSoon = !expired && new Date(b.expiryDate) < new Date(Date.now() + 30 * 86400000);
                return (
                  <React.Fragment key={b.id}>
                    <tr className={`border-b border-slate-100 hover:bg-slate-50 text-sm cursor-pointer ${expired ? 'bg-red-50' : expiringSoon ? 'bg-amber-50' : ''}`}
                      onClick={() => setExpanded(expanded === b.id ? null : b.id)}>
                      <td className="py-3 px-4 font-medium text-slate-800">{b.product?.brandName}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">{b.batchNumber}</td>
                      <td className={`py-3 px-4 font-mono text-xs ${expired ? 'text-red-600 font-bold' : expiringSoon ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
                        {new Date(b.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {b.quantityInBoxes}B {b.quantityInLoose > 0 ? `/ ${b.quantityInLoose}L` : ''}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">Rs.{b.purchasePrice?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">Rs.{b.retailPrice?.toFixed(2)}</td>
                    </tr>
                    {expanded === b.id && (
                      <tr className="bg-slate-50">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="text-xs text-slate-600 space-y-1">
                            <p>Box Qty: <strong>{b.boxQuantity}</strong> | Loose/Box: <strong>{b.looseConversionFactor}</strong></p>
                            <p>Purchase Value: <strong>Rs.{(b.quantityInBoxes * b.purchasePrice).toFixed(2)}</strong> | Retail Value: <strong>Rs.{(b.quantityInBoxes * b.retailPrice).toFixed(2)}</strong></p>
                            <p className="text-[10px] text-slate-400">ID: {b.id}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
