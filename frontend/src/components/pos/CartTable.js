import React from 'react';
import CartRow from './CartRow';

export default function CartTable({ items, onUpdate, onRemove }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <svg className="w-16 h-16 mb-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        <p className="text-lg font-medium">Cart is empty</p>
        <p className="text-sm">Search and add products above</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto cart-scroll">
      <table className="w-full">
        <thead>
          <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b-2 border-slate-200">
            <th className="py-3 px-3 text-left">Product</th>
            <th className="py-3 px-3 text-left">Unit</th>
            <th className="py-3 px-3 text-left">Qty</th>
            <th className="py-3 px-3 text-right">Rate</th>
            <th className="py-3 px-3 text-right">Subtotal</th>
            <th className="py-3 px-3 text-right w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <CartRow key={`${item.product.id}-${i}`} item={item} index={i} onUpdate={onUpdate} onRemove={onRemove} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
