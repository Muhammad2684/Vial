import React from 'react';

/**
 * CartRow — A single line item in the POS cart.
 *
 * Supports Box/Loose toggle:
 * - 'BOX': qty is in full boxes, price = retailPrice * 1 box
 * - 'LOOSE': qty is in loose units (tablets/strips), price = retailPrice / looseConversionFactor per unit
 *
 * Example: Box costs 300 PKR with 30 tablets. Selling 3 loose tablets:
 *   unitPrice = 300 / 30 = 10 PKR per tablet
 *   subtotal = 3 * 10 = 30 PKR
 */
export default function CartRow({ item, index, onUpdate, onRemove }) {
  const { product, unitType, quantity, unitPrice } = item;
  const factor = product.looseConversionFactor || 1;

  const handleToggle = () => {
    const newType = unitType === 'BOX' ? 'LOOSE' : 'BOX';
    const newPrice = newType === 'BOX'
      ? product.retailPrice
      : product.retailPrice / factor;
    onUpdate(index, { unitType: newType, unitPrice: newPrice, quantity: 1 });
  };

  const handleQty = (e) => {
    const val = parseInt(e.target.value, 10) || 1;
    onUpdate(index, { quantity: Math.max(1, val) });
  };

  const subtotal = quantity * unitPrice;

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
      <td className="py-3 px-3">
        <div className="font-medium text-slate-800">{product.brandName}</div>
        {product.genericName && <div className="text-xs text-slate-400">{product.genericName}</div>}
      </td>
      <td className="py-3 px-3">
        <button
          type="button"
          onClick={handleToggle}
          className={`px-2.5 py-1 text-xs font-bold rounded-md border transition-colors ${
            unitType === 'BOX'
              ? 'bg-blue-100 text-blue-700 border-blue-300'
              : 'bg-amber-100 text-amber-700 border-amber-300'
          }`}
        >
          {unitType === 'BOX' ? 'BOX' : 'LOOSE'}
        </button>
      </td>
      <td className="py-3 px-3">
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={handleQty}
          className="w-16 px-2 py-1 text-center border border-slate-200 rounded-lg text-sm font-medium focus:border-blue-400 focus:ring-0"
        />
      </td>
      <td className="py-3 px-3 text-right font-mono text-sm text-slate-600">
        {unitPrice.toFixed(2)}
      </td>
      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
        {subtotal.toFixed(2)}
      </td>
      <td className="py-3 px-3 text-right">
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Remove item"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </tr>
  );
}
