import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

function SupplierForm({ supplier, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', contactPerson: '', phone: '', address: '', ...supplier });
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-bold text-slate-800 mb-4">{supplier ? 'Edit Supplier' : 'New Supplier'}</h2>
        <div className="space-y-3">
          <div><label className="text-xs font-medium text-slate-500">Name *</label><input name="name" value={form.name} onChange={handleChange} required className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:border-blue-400" /></div>
          <div><label className="text-xs font-medium text-slate-500">Contact Person</label><input name="contactPerson" value={form.contactPerson} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:border-blue-400" /></div>
          <div><label className="text-xs font-medium text-slate-500">Phone</label><input name="phone" value={form.phone} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:border-blue-400" /></div>
          <div><label className="text-xs font-medium text-slate-500">Address</label><textarea name="address" value={form.address} onChange={handleChange} rows={2} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:border-blue-400" /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">{supplier ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </div>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try { setLoading(true); setSuppliers(await api.suppliers.list()); }
    catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data) => {
    try {
      if (editing) await api.suppliers.update(editing.id, data);
      else await api.suppliers.create(data);
      setShowForm(false); setEditing(null); setMessage({ type: 'success', text: editing ? 'Supplier updated' : 'Supplier created' });
      load();
    } catch (e) { setMessage({ type: 'error', text: e.message }); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Suppliers</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">+ New Supplier</button>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text} <button className="float-right font-bold" onClick={() => setMessage(null)}>&times;</button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-400">Loading...</div>
        : suppliers.length === 0 ? <div className="p-8 text-center text-slate-400">No suppliers found</div>
        : (
          <table className="w-full">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b-2 border-slate-200 bg-slate-50">
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left">Contact</th>
                <th className="py-3 px-4 text-left">Phone</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4 text-right">Remaining</th>
                <th className="py-3 px-4 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 text-sm">
                  <td className="py-3 px-4 font-medium text-slate-800">{s.name}</td>
                  <td className="py-3 px-4 text-slate-500">{s.contactPerson || '-'}</td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-500">{s.phone || '-'}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">Rs.{s.totalBalance?.toFixed(0)}</td>
                  <td className={`py-3 px-4 text-right font-mono ${s.remainingCredit > 0 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                    Rs.{s.remainingCredit?.toFixed(0)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => { setEditing(s); setShowForm(true); }} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && <SupplierForm supplier={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}
