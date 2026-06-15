import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

function CustomerForm({ customer, onSave, onCancel }) {
  const [form, setForm] = useState({ fullName: '', phone: '', address: '', ...customer });
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-bold text-slate-800 mb-4">{customer ? 'Edit Customer' : 'New Customer'}</h2>
        <div className="space-y-3">
          <div><label className="text-xs font-medium text-slate-500">Full Name *</label><input name="fullName" value={form.fullName} onChange={handleChange} required className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:border-blue-400" /></div>
          <div><label className="text-xs font-medium text-slate-500">Phone</label><input name="phone" value={form.phone} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:border-blue-400" /></div>
          <div><label className="text-xs font-medium text-slate-500">Address</label><textarea name="address" value={form.address} onChange={handleChange} rows={2} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:border-blue-400" /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">{customer ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try { setLoading(true); setCustomers(await api.customers.list(query)); }
    catch { } finally { setLoading(false); }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data) => {
    try {
      if (editing) await api.customers.update(editing.id, data);
      else await api.customers.create(data);
      setShowForm(false); setEditing(null); setMessage({ type: 'success', text: editing ? 'Customer updated' : 'Customer created' });
      load();
    } catch (e) { setMessage({ type: 'error', text: e.message }); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">+ New Customer</button>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text} <button className="float-right font-bold" onClick={() => setMessage(null)}>&times;</button>
        </div>
      )}

      <div className="mb-4">
        <input type="text" placeholder="Search by name or phone..." value={query} onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-blue-400" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-400">Loading...</div>
        : customers.length === 0 ? <div className="p-8 text-center text-slate-400">No customers found</div>
        : (
          <table className="w-full">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b-2 border-slate-200 bg-slate-50">
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left">Phone</th>
                <th className="py-3 px-4 text-right">Total Credit</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Remaining</th>
                <th className="py-3 px-4 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 text-sm">
                  <td className="py-3 px-4 font-medium text-slate-800">{c.fullName}</td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-500">{c.phone || '-'}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">Rs.{c.totalCredit?.toFixed(0)}</td>
                  <td className="py-3 px-4 text-right font-mono text-green-600">Rs.{c.paidAmount?.toFixed(0)}</td>
                  <td className={`py-3 px-4 text-right font-mono ${c.remainingBalance > 0 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                    Rs.{c.remainingBalance?.toFixed(0)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => { setEditing(c); setShowForm(true); }} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && <CustomerForm customer={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}
