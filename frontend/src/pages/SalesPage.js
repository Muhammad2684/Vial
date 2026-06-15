import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    try { setLoading(true); setSales(await api.sales.list(50)); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalSales = sales.length;
  const totalRevenue = sales.reduce((s, sale) => s + sale.netPayable, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Sales History</h1>
        <div className="flex gap-4 text-sm">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200">
            <span className="text-slate-500">Total Sales: </span>
            <span className="font-bold text-slate-800">{totalSales}</span>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200">
            <span className="text-slate-500">Revenue: </span>
            <span className="font-bold text-green-600">Rs.{totalRevenue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No sales yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b-2 border-slate-200 bg-slate-50">
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-left">Payment</th>
                <th className="py-3 px-4 text-left">Customer</th>
                <th className="py-3 px-4 text-right">Items</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Discount</th>
                <th className="py-3 px-4 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <React.Fragment key={sale.id}>
                  <tr className="border-b border-slate-100 hover:bg-slate-50 text-sm cursor-pointer"
                    onClick={() => setExpanded(expanded === sale.id ? null : sale.id)}>
                    <td className="py-3 px-4 text-slate-500">{new Date(sale.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${sale.paymentMethod === 'CASH' ? 'bg-green-100 text-green-700' : sale.paymentMethod === 'CREDIT' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{sale.customer?.fullName || '-'}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">{sale.items?.length || 0}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">Rs.{sale.totalAmount?.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono text-red-500">
                      {sale.discountAmount > 0 ? `-Rs.${sale.discountAmount.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">Rs.{sale.netPayable?.toFixed(2)}</td>
                  </tr>
                  {expanded === sale.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={7} className="px-4 py-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-500 font-semibold">
                              <th className="py-1 px-2 text-left">Product</th>
                              <th className="py-1 px-2 text-left">Unit</th>
                              <th className="py-1 px-2 text-right">Qty</th>
                              <th className="py-1 px-2 text-right">Rate</th>
                              <th className="py-1 px-2 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sale.items?.map((item) => (
                              <tr key={item.id} className="border-t border-slate-200">
                                <td className="py-1 px-2 font-medium">{item.product?.brandName}</td>
                                <td className="py-1 px-2"><span className={`px-1.5 py-0.5 rounded font-bold ${item.unitType === 'BOX' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{item.unitType}</span></td>
                                <td className="py-1 px-2 text-right">{item.quantity}</td>
                                <td className="py-1 px-2 text-right font-mono">Rs.{item.unitPrice?.toFixed(2)}</td>
                                <td className="py-1 px-2 text-right font-mono">Rs.{item.subtotal?.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {sale.fbrInvoiceRef && (
                          <p className="text-[10px] text-slate-400 mt-2">FBR Ref: {sale.fbrInvoiceRef}</p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
