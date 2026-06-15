import React from 'react';
import Navbar from './common/Navbar';

export default function Layout({ page, onNavigate, children }) {
  return (
    <div className="h-screen flex flex-col">
      <Navbar active={page} onNavigate={onNavigate} />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
