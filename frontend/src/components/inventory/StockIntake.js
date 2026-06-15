import React, { useState, useRef } from 'react';
import { api, clearCache } from '../../utils/api';

function emptyRow() {
  return { productId: '', brandName: '', barcode: '', batchNumber: '', expiryDate: '', purchasePrice: '', retailPrice: '', boxQuantity: '', looseConversionFactor: 30 };
}

const COL_HEADERS = ['Brand Name', 'Barcode', 'Batch #', 'Expiry', 'Purchase Price', 'Retail Price', 'Boxes', 'Loose/Box', ''];

export default function StockIntake() {
  const [rows, setRows] = useState([emptyRow()]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [suggestions, setSuggestions] = useState({});
  const [focusedIdx, setFocusedIdx] = useState(null);
  const timerRef = useRef({});

  const updateRow = (idx, field, value) => {
    setRows((prev) => { const next = [...prev]; next[idx][field] = value; return next; });
  };

  const removeRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const handleBrandChange = (idx, value) => {
    updateRow(idx, 'brandName', value);
    if (timerRef.current[idx]) clearTimeout(timerRef.current[idx]);

    if (value.length < 2) { setSuggestions((prev) => ({ ...prev, [idx]: [] })); return; }

    timerRef.current[idx] = setTimeout(async () => {
      try {
        const results = await api.products.list(value);
        setSuggestions((prev) => ({ ...prev, [idx]: results }));
      } catch { setSuggestions((prev) => ({ ...prev, [idx]: [] })); }
    }, 250);
  };

  const selectProduct = (idx, product) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        productId: product.id,
        brandName: product.brandName,
        barcode: product.barcode || '',
        purchasePrice: next[idx].purchasePrice || '',
        retailPrice: next[idx].retailPrice || (product.retailPrice || ''),
        looseConversionFactor: next[idx].looseConversionFactor || product.looseConversionFactor || 30,
      };
      return next;
    });
    setSuggestions((prev) => ({ ...prev, [idx]: [] }));
  };

  const parseBulk = () => {
    const lines = bulkText.trim().split('\n').filter(Boolean);
    if (lines.length === 0) return;

    const parsed = lines.map((line) => {
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      const r = emptyRow();
      if (parts[0]) r.brandName = parts[0].trim();
      if (parts[1]) r.barcode = parts[1].trim();
      if (parts[2]) r.batchNumber = parts[2].trim();
      if (parts[3]) r.expiryDate = parts[3].trim();
      if (parts[4]) r.purchasePrice = parts[4].trim();
      if (parts[5]) r.retailPrice = parts[5].trim();
      if (parts[6]) r.boxQuantity = parts[6].trim();
      if (parts[7]) r.looseConversionFactor = parseInt(parts[7]) || 30;
      return r;
    });

    setRows(parsed);
    setBulkText('');
    setShowBulk(false);
    setMessage({ type: 'success', text: `Parsed ${parsed.length} rows from paste. Review and submit.` });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBulkText(ev.target.result);
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = rows.filter((r) => (r.barcode || r.brandName) && r.expiryDate);
    if (payload.length === 0) { setMessage({ type: 'error', text: 'At least one row needs a barcode/brand and expiry' }); return; }

    setLoading(true);
    setMessage(null);
    try {
      const result = await api.inventory.stockIntake(payload);
      setMessage({ type: 'success', text: `Imported ${result.imported} batch(es) successfully` });
      clearCache();
      setRows([emptyRow()]);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Stock Intake</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowBulk(!showBulk)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">
            {showBulk ? 'Row Entry' : 'Bulk Paste'}
          </button>
          {showBulk && (
            <label className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 cursor-pointer">
              Upload CSV
              <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {showBulk && (
        <div className="mb-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-2">
            Paste tab-separated or comma-separated data: Brand, Barcode, Batch#, Expiry, PurchasePrice, RetailPrice, Boxes, LoosePerBox
          </p>
          <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={8}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:border-blue-400"
            placeholder="Panadol	4901234567890	BATCH-001	2027-12-31	50	100	50	30" />
          <button onClick={parseBulk} disabled={!bulkText.trim()}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:bg-slate-300">
            Parse & Load Rows
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-visible">
        {/* Column headers */}
        <div className="flex gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
          {COL_HEADERS.map((h, i) => (
            <div key={i} className={`${i === 0 ? 'flex-[2]' : i < 8 ? 'flex-1' : 'w-10'}`}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        <div className="space-y-1">
          {rows.map((row, i) => (
            <StockRow
              key={i}
              row={row}
              index={i}
              suggestions={suggestions[i] || []}
              isFocused={focusedIdx === i}
              onFocus={() => setFocusedIdx(i)}
              onBlur={() => setTimeout(() => setFocusedIdx(null), 200)}
              onBrandChange={handleBrandChange}
              onSelect={selectProduct}
              onUpdate={updateRow}
              onRemove={removeRow}
            />
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={addRow}
            className="px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm font-medium text-slate-500 hover:border-blue-400 hover:text-blue-600">
            + Add Row
          </button>
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:bg-slate-300">
            {loading ? 'Importing…' : 'Import Stock'}
          </button>
        </div>
      </form>
    </div>
  );
}

function StockRow({ row, index, suggestions, isFocused, onFocus, onBlur, onBrandChange, onSelect, onUpdate, onRemove }) {
  return (
    <div className="flex gap-2 items-start py-1.5 px-2 border-b border-slate-100 hover:bg-slate-50/50 rounded-lg">
      {/* Brand Name with dropdown */}
      <div className="flex-[2] relative">
        <input value={row.brandName}
          onChange={(e) => onBrandChange(index, e.target.value)}
          onFocus={onFocus} onBlur={onBlur}
          autoComplete="off"
          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:border-blue-400"
          placeholder="Type product name..." />
        {isFocused && suggestions.length > 0 && (
          <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
            {suggestions.map((p) => (
              <li key={p.id} onMouseDown={() => { onSelect(index, p); }}
                className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-slate-100 last:border-0">
                <div className="text-sm font-medium text-slate-800">{p.brandName}</div>
                <div className="text-[11px] text-slate-500">{p.genericName || ''} {p.barcode ? `[${p.barcode}]` : ''}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex-1"><input value={row.barcode}
        onChange={(e) => onUpdate(index, 'barcode', e.target.value)}
        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-mono focus:border-blue-400" placeholder="Scan" /></div>

      <div className="flex-1"><input value={row.batchNumber}
        onChange={(e) => onUpdate(index, 'batchNumber', e.target.value)}
        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:border-blue-400" placeholder="Batch #" /></div>

      <div className="flex-1"><input type="date" value={row.expiryDate}
        onChange={(e) => onUpdate(index, 'expiryDate', e.target.value)}
        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:border-blue-400" /></div>

      <div className="flex-1"><input type="number" step="0.01" value={row.purchasePrice}
        onChange={(e) => onUpdate(index, 'purchasePrice', e.target.value)}
        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-mono text-right focus:border-blue-400" placeholder="0.00" /></div>

      <div className="flex-1"><input type="number" step="0.01" value={row.retailPrice}
        onChange={(e) => onUpdate(index, 'retailPrice', e.target.value)}
        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-mono text-right focus:border-blue-400" placeholder="0.00" /></div>

      <div className="flex-1"><input type="number" value={row.boxQuantity}
        onChange={(e) => onUpdate(index, 'boxQuantity', e.target.value)}
        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-mono text-right focus:border-blue-400" placeholder="0" /></div>

      <div className="flex-1"><input type="number" value={row.looseConversionFactor}
        onChange={(e) => onUpdate(index, 'looseConversionFactor', e.target.value)}
        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-mono text-right focus:border-blue-400" placeholder="30" /></div>

      <div className="w-10 flex items-center justify-center pt-1">
        <button type="button" onClick={() => onRemove(index)}
          className="p-1 text-slate-400 hover:text-red-600 text-lg leading-none">&times;</button>
      </div>
    </div>
  );
}
