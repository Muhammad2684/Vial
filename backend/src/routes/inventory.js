const { Router } = require('express');
const ctrl = require('../controllers/inventoryController');

const router = Router();

// Products
router.get('/products', ctrl.listProducts);
router.get('/products/barcode/:barcode', ctrl.getProductByBarcode);
router.get('/products/:id', ctrl.getProduct);
router.post('/products', ctrl.createProduct);
router.put('/products/:id', ctrl.updateProduct);
router.delete('/products/:id', ctrl.deleteProduct);

// Stock / Batches
router.get('/batches', ctrl.listBatches);
router.get('/batches/:id', ctrl.getBatch);
router.post('/stock-intake', ctrl.stockIntake);

// Stock Adjustments
router.post('/adjust', ctrl.adjustStock);
router.get('/adjustments', ctrl.listAdjustments);

// Suppliers
router.get('/suppliers', ctrl.listSuppliers);
router.get('/suppliers/:id', ctrl.getSupplier);
router.post('/suppliers', ctrl.createSupplier);
router.put('/suppliers/:id', ctrl.updateSupplier);

// Purchase Orders
router.get('/purchase-orders', ctrl.listPurchaseOrders);
router.get('/purchase-orders/:id', ctrl.getPurchaseOrder);
router.post('/purchase-orders', ctrl.createPurchaseOrder);

// Sales
router.get('/sales', ctrl.listSales);
router.get('/sales/:id', ctrl.getSale);
router.post('/sales', ctrl.createSale);

// Customers / Ledger
router.get('/customers', ctrl.listCustomers);
router.get('/customers/:id', ctrl.getCustomer);
router.post('/customers', ctrl.createCustomer);
router.put('/customers/:id', ctrl.updateCustomer);
router.post('/customers/:id/payment', ctrl.addCustomerPayment);

// Reports
router.get('/reports/expiring', ctrl.reportExpiring);
router.get('/reports/summary', ctrl.reportSummary);
router.get('/reports/low-stock', ctrl.reportLowStock);
router.get('/reports/valuation', ctrl.reportValuation);

// Master Medicine List
router.get('/master-medicines', ctrl.searchMasterMedicines);

// Unified Search
router.get('/search', ctrl.search);

module.exports = router;
