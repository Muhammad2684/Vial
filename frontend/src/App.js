import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import POSPage from './components/pos/POSPage';
import StockIntake from './components/inventory/StockIntake';
import ProductsPage from './pages/ProductsPage';
import BatchesPage from './pages/BatchesPage';
import SuppliersPage from './pages/SuppliersPage';
import CustomersPage from './pages/CustomersPage';
import LedgerPage from './pages/LedgerPage';
import SalesPage from './pages/SalesPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import AdjustmentsPage from './pages/AdjustmentsPage';
import ReportsPage from './pages/ReportsPage';
import HomePage from './pages/HomePage';

const PAGES = {
  Home: HomePage,
  POS: POSPage,
  'Stock Intake': StockIntake,
  Products: ProductsPage,
  Batches: BatchesPage,
  Suppliers: SuppliersPage,
  Customers: CustomersPage,
  Ledger: LedgerPage,
  Sales: SalesPage,
  Purchases: PurchaseOrdersPage,
  Adjustments: AdjustmentsPage,
  Reports: ReportsPage,
};

export default function App() {
  const [page, setPage] = useState(() => localStorage.getItem('vial2_page') || 'Home');

  useEffect(() => {
    localStorage.setItem('vial2_page', page);
  }, [page]);

  const handleNavigate = useCallback((p) => setPage(p), []);

  const Component = PAGES[page];

  return (
    <Layout page={page} onNavigate={handleNavigate}>
      <Component onNavigate={handleNavigate} />
    </Layout>
  );
}
