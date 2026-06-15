import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color || 'text-slate-800'}`}>{value}</div>
    </div>
  );
}

export default function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [valuation, setValuation] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, l, e, v] = await Promise.all([
        api.reports.summary(), api.reports.lowStock(), api.reports.expiring(30), api.reports.valuation(),
      ]);
      setSummary(s); setLowStock(l); setExpiring(e); setValuation(v);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Inventory Reports</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Products" value={summary?.totalProducts ?? '-'} color="text-blue-600" />
        <StatCard label="Active Batches" value={summary?.activeBatches ?? '-'} color="text-teal-600" />
        <StatCard label="Total Stock (Boxes)" value={summary?.totalStockBoxes ?? '-'} color="text-slate-800" />
        <StatCard label="Est. Value" value={summary?.estimatedValue ? `Rs.${summary.estimatedValue.toFixed(0)}` : '-'} color="text-green-600" />
        <StatCard label="Sales Today" value={summary?.salesToday ?? '-'} color="text-purple-600" />
        <StatCard label="Low Stock Items" value={summary?.lowStockCount ?? '-'} color={summary?.lowStockCount > 0 ? 'text-red-600' : 'text-green-600'} />
      </div>

      {/* Low Stock */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-700">Low Stock Alerts ({lowStock.length})</h2>
        </div>
        {lowStock.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">All products are well-stocked</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                <th className="py-2 px-4 text-left">Product</th>
                <th className="py-2 px-4 text-right">Stock (Boxes)</th>
                <th className="py-2 px-4 text-right">Loose</th>
                <th className="py-2 px-4 text-right">Threshold</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 text-sm">
                  <td className="py-2 px-4 font-medium text-slate-800">{p.brandName}</td>
                  <td className="py-2 px-4 text-right font-mono text-red-600 font-bold">{p.totalStockBoxes}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{p.totalStockLoose}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{p.lowStockThreshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Expiring Soon */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-700">Expiring Within 30 Days ({expiring.length})</h2>
        </div>
        {expiring.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">No batches expiring soon</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                <th className="py-2 px-4 text-left">Product</th>
                <th className="py-2 px-4 text-left">Batch #</th>
                <th className="py-2 px-4 text-left">Expiry</th>
                <th className="py-2 px-4 text-right">Boxes</th>
                <th className="py-2 px-4 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {expiring.map((b) => (
                <tr key={b.id} className="border-b border-slate-100 text-sm">
                  <td className="py-2 px-4 font-medium text-slate-800">{b.product?.brandName}</td>
                  <td className="py-2 px-4 font-mono text-xs text-slate-500">{b.batchNumber}</td>
                  <td className="py-2 px-4 font-mono text-xs text-amber-600 font-bold">{new Date(b.expiryDate).toLocaleDateString()}</td>
                  <td className="py-2 px-4 text-right font-mono">{b.quantityInBoxes}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">Rs.{(b.quantityInBoxes * b.purchasePrice).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Valuation */}
      {valuation && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Boxes" value={valuation.totals?.totalBoxes ?? '-'} />
          <StatCard label="Purchase Value" value={valuation.totals ? `Rs.${valuation.totals.totalPurchase.toFixed(0)}` : '-'} color="text-blue-600" />
          <StatCard label="Retail Value" value={valuation.totals ? `Rs.${valuation.totals.totalRetail.toFixed(0)}` : '-'} color="text-green-600" />
          <StatCard label="Potential Profit" value={valuation.totals ? `Rs.${valuation.totals.totalProfit.toFixed(0)}` : '-'} color="text-purple-600" />
        </div>
      )}
    </div>
  );
}
