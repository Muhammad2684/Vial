import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export default function LedgerPage() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [payment, setPayment] = useState({ amount: '' });
  const [message, setMessage] = useState(null);

  useEffect(() => { api.customers.list().then(setCustomers).catch(() => {}); }, []);

  const loadDetails = useCallback(async (id) => {
    try { setDetails(await api.customers.get(id)); }
    catch {}
  }, []);

  const handleSelect = (id) => {
    setSelected(id);
    loadDetails(id);
  };

  const handlePayment = async () => {
    if (!payment.amount || payment.amount <= 0) return;
    try {
      await api.customers.addPayment(selected, parseFloat(payment.amount));
      setMessage({ type: 'success', text: `Payment of Rs.${payment.amount} recorded` });
      setPayment({ amount: '' });
      loadDetails(selected);
    } catch (e) { setMessage({ type: 'error', text: e.message }); }
  };

  return (
    <div className="flex gap-6 h-full">
      <div className="w-80 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-800">Customers</h2>
        </div>
        <div className="overflow-y-auto max-h-[calc(100vh-12rem)]">
          {customers.map((c) => (
            <div key={c.id} onClick={() => handleSelect(c.id)}
              className={`px-4 py-3 cursor-pointer border-b border-slate-100 text-sm hover:bg-slate-50 ${
                selected === c.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}>
              <div className="font-medium text-slate-800">{c.fullName}</div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>{c.phone || 'No phone'}</span>
                <span className={c.remainingBalance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                  Rs.{c.remainingBalance?.toFixed(0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1">
        {!details ? (
          <div className="flex items-center justify-center h-full text-slate-400">Select a customer</div>
        ) : (
          <div className="space-y-4">
            {message && (
              <div className={`px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {message.text} <button className="float-right font-bold" onClick={() => setMessage(null)}>&times;</button>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{details.fullName}</h2>
                  <p className="text-sm text-slate-500">{details.phone} {details.address ? `- ${details.address}` : ''}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-500">Remaining Balance</div>
                  <div className={`text-2xl font-bold ${details.remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    Rs.{details.remainingBalance?.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Record Payment</h3>
              <div className="flex gap-3">
                <input type="number" placeholder="Amount" value={payment.amount}
                  onChange={(e) => setPayment({ amount: e.target.value })}
                  className="w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-400" />
                <button onClick={handlePayment} disabled={!payment.amount}
                  className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:bg-slate-300">Record Payment</button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-700">Transaction History</h3>
              </div>
              {details.transactions?.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">No transactions</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                      <th className="py-2 px-4 text-left">Date</th>
                      <th className="py-2 px-4 text-left">Type</th>
                      <th className="py-2 px-4 text-left">Description</th>
                      <th className="py-2 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.transactions?.map((t) => (
                      <tr key={t.id} className="border-b border-slate-100 text-sm">
                        <td className="py-2 px-4 text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td className="py-2 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${t.type === 'DEBIT' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-slate-600">{t.description || '-'}</td>
                        <td className={`py-2 px-4 text-right font-mono ${t.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`}>
                          Rs.{t.amount?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
