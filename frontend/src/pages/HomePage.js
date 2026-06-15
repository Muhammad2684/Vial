import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const TILES = [
  { label: 'POS', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z', desc: 'Point of Sale', gradient: 'from-blue-500 to-blue-600' },
  { label: 'Products', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', desc: 'Inventory catalog', gradient: 'from-emerald-500 to-emerald-600' },
  { label: 'Stock Intake', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6', desc: 'Receive new stock', gradient: 'from-violet-500 to-violet-600' },
  { label: 'Batches', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', desc: 'Batch tracking', gradient: 'from-amber-500 to-amber-600' },
  { label: 'Sales', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z', desc: 'Sales history', gradient: 'from-rose-500 to-rose-600' },
  { label: 'Suppliers', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857', desc: 'Supplier directory', gradient: 'from-cyan-500 to-cyan-600' },
  { label: 'Customers', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', desc: 'Customer directory', gradient: 'from-orange-500 to-orange-600' },
  { label: 'Ledger', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', desc: 'Customer ledger', gradient: 'from-teal-500 to-teal-600' },
  { label: 'Purchases', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z', desc: 'Purchase orders', gradient: 'from-indigo-500 to-indigo-600' },
  { label: 'Adjustments', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z', desc: 'Stock adjustments', gradient: 'from-red-500 to-red-600' },
  { label: 'Reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', desc: 'Analytics & insights', gradient: 'from-purple-500 to-purple-600' },
];

export default function HomePage({ onNavigate }) {
  const [summary, setSummary] = useState(null);

  const load = useCallback(async () => {
    try {
      const s = await api.reports.summary();
      setSummary(s);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stream Deck</h1>
          <p className="text-sm text-slate-500 mt-1">Command center — tap a tile to get started</p>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard label="Total Products" value={summary.totalProducts} />
          <StatCard label="Active Batches" value={summary.activeBatches} />
          <StatCard label="Low Stock Items" value={summary.lowStockCount} color="text-amber-600" />
          <StatCard label="Sales Today" value={summary.salesToday} color="text-blue-600" />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {TILES.map((tile) => (
          <button
            key={tile.label}
            onClick={() => onNavigate(tile.label)}
            className="group p-5 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left"
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tile.gradient} flex items-center justify-center mb-3 shadow-sm`}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={tile.icon} />
              </svg>
            </div>
            <div className="font-semibold text-slate-800 text-sm">{tile.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{tile.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color || 'text-slate-800'}`}>{value}</div>
    </div>
  );
}
