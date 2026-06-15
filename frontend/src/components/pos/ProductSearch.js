import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../utils/api';

/**
 * Live product search bar.
 * Queries by brand name or barcode on every keystroke (300ms debounce).
 * Supports keyboard navigation (arrow keys + Enter).
 */
export default function ProductSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); return; }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.products.list(query);
        setResults(data);
        setActiveIdx(-1);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [query]);

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIdx >= 0 && results[activeIdx]) {
      selectProduct(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setResults([]);
      inputRef.current?.blur();
    }
  };

  const selectProduct = (product) => {
    onSelect(product);
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          autoFocus
          type="text"
          className="w-full pl-10 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl text-lg font-medium placeholder-slate-400 focus:border-blue-500 focus:ring-0 transition-colors"
          placeholder="Search by name or scan barcode..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
          {results.map((p, i) => (
            <li
              key={p.id}
              className={`px-4 py-3 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-0 ${
                i === activeIdx ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
              onMouseDown={() => selectProduct(p)}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <div>
                <div className="font-semibold text-slate-800">{p.brandName}</div>
                {p.genericName && <div className="text-xs text-slate-500">{p.genericName}</div>}
              </div>
              <div className="text-right">
                <div className="font-bold text-blue-600">Rs. {p.retailPrice?.toFixed(2)}</div>
                {p.barcode && <div className="text-[10px] text-slate-400 font-mono">{p.barcode}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
