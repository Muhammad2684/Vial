import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';

function ProductForm({ product, onSave, onCancel }) {
  const [form, setForm] = useState({
    brandName: '', genericName: '', manufacturer: '', barcode: '',
    lowStockThreshold: 10, isControlled: false, ...product,
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Brand name keystroke → autocomplete from master list
  const handleBrandChange = (e) => {
    const value = e.target.value;
    setForm({ ...form, brandName: value });
    if (isCustom) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }

    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.masterMedicines.search(value);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch { setSuggestions([]); }
      setSearching(false);
    }, 250);
  };

  // User picks a master suggestion → lock generic & manufacturer
  const selectSuggestion = (med) => {
    setForm({ ...form, brandName: med.brandName, genericName: med.genericName || '', manufacturer: med.companyName || '' });
    setShowSuggestions(false);
    setIsCustom(false);
  };

  // "Add custom" → unlock generic & manufacturer fields
  const enableCustom = () => {
    setIsCustom(true);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Reset toggle if user types more after choosing "custom"
  // but keep them editable.

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, isCustom });
  };

  const readOnlyStyle = 'bg-gray-100 text-slate-500 cursor-not-allowed';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          {product ? 'Edit Product' : 'New Product'}
          {!product && <span className="ml-2 text-xs font-normal text-slate-400">— search the DRAP master list or add custom</span>}
        </h2>

        <div className="space-y-3">
          {/* Brand Name with autocomplete */}
          <div className="relative">
            <label className="text-xs font-medium text-slate-500">Brand Name *</label>
            <input
              ref={inputRef}
              name="brandName"
              value={form.brandName}
              onChange={handleBrandChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              required
              autoComplete="off"
              placeholder="Type to search DRAP master list..."
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-400"
            />
            {searching && (
              <div className="absolute right-3 top-8">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                {suggestions.map((med) => (
                  <li key={med.id} onMouseDown={() => selectSuggestion(med)}
                    className="px-4 py-2.5 cursor-pointer hover:bg-blue-50 border-b border-slate-100 last:border-0">
                    <div className="font-medium text-slate-800 text-sm">{med.brandName}</div>
                    <div className="text-xs text-slate-500">{med.genericName} — {med.companyName}</div>
                  </li>
                ))}
              </ul>
            )}

            {/* "Not found" prompt */}
            {!isCustom && form.brandName.length >= 2 && !searching && suggestions.length === 0 && (
              <div className="mt-2">
                <button type="button" onClick={enableCustom}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium underline">
                  Medicine not found? Click here to add manually.
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Generic Name — locked when master-linked, editable when custom */}
            <div>
              <label className="text-xs font-medium text-slate-500">Generic / Formula</label>
              <input
                name="genericName"
                value={form.genericName}
                onChange={handleChange}
                readOnly={!isCustom}
                className={`w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-400 ${!isCustom ? readOnlyStyle : ''}`}
              />
            </div>

            {/* Manufacturer — locked when master-linked, editable when custom */}
            <div>
              <label className="text-xs font-medium text-slate-500">Manufacturer / Company</label>
              <input
                name="manufacturer"
                value={form.manufacturer}
                onChange={handleChange}
                readOnly={!isCustom}
                className={`w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-400 ${!isCustom ? readOnlyStyle : ''}`}
              />
            </div>
          </div>

          {isCustom && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              Custom medicine. On save, a copy will be queued for admin review to add to the master database.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Barcode</label>
              <input name="barcode" value={form.barcode} onChange={handleChange} placeholder="Optional"
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Low Stock Threshold</label>
              <input name="lowStockThreshold" type="number" value={form.lowStockThreshold} onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-400" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input name="isControlled" type="checkbox" checked={form.isControlled}
              onChange={(e) => setForm({ ...form, isControlled: e.target.checked })}
              className="rounded" />
            <span className="text-sm font-medium text-slate-600">Controlled substance</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button type="submit"
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
            {product ? 'Update' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try { setLoading(true); setProducts(await api.products.list(query)); }
    catch (e) { setMessage({ type: 'error', text: e.message }); }
    finally { setLoading(false); }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data) => {
    try {
      if (editing) await api.products.update(editing.id, data);
      else await api.products.create(data);
      setShowForm(false); setEditing(null);
      setMessage({ type: 'success', text: editing ? 'Product updated' : 'Product created' });
      load();
    } catch (e) { setMessage({ type: 'error', text: e.message }); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try { await api.products.delete(id); setMessage({ type: 'success', text: 'Product deleted' }); load(); }
    catch (e) { setMessage({ type: 'error', text: e.message }); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Products</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">+ New Product</button>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text} <button className="float-right font-bold" onClick={() => setMessage(null)}>&times;</button>
        </div>
      )}

      <div className="mb-4">
        <input type="text" placeholder="Search by name or barcode..." value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-blue-400" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No products found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b-2 border-slate-200 bg-slate-50">
                <th className="py-3 px-4 text-left">Brand Name</th>
                <th className="py-3 px-4 text-left">Generic</th>
                <th className="py-3 px-4 text-left">Manufacturer</th>
                <th className="py-3 px-4 text-left">Barcode</th>
                <th className="py-3 px-4 text-right">Stock</th>
                <th className="py-3 px-4 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 text-sm">
                  <td className="py-3 px-4 font-medium text-slate-800">{p.brandName}</td>
                  <td className="py-3 px-4 text-slate-500">{p.genericName || '-'}</td>
                  <td className="py-3 px-4 text-slate-500">{p.manufacturer || '-'}</td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-500">{p.barcode || '-'}</td>
                  <td className="py-3 px-4 text-right font-mono">
                    <span className={p.isLowStock ? 'text-red-600 font-bold' : 'text-slate-600'}>
                      {p.totalStockBoxes}B
                    </span>
                    {p.totalStockLoose > 0 && <span className="text-slate-400 ml-1">/{p.totalStockLoose}L</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => { setEditing(p); setShowForm(true); }}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium mr-3">Edit</button>
                    <button onClick={() => handleDelete(p.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && <ProductForm product={editing} onSave={handleSave}
        onCancel={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}
