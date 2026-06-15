const prisma = require('../prisma');
const { submitInvoice } = require('../services/fbrService');

function error(msg, status = 400) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

// ─── Products ───────────────────────────────────────────

exports.listProducts = async (req, res, next) => {
  try {
    const { q } = req.query;
    const where = q ? {
      OR: [
        { brandName: { contains: q, mode: 'insensitive' } },
        { genericName: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q } },
      ],
    } : {};
    const products = await prisma.product.findMany({
      where,
      orderBy: { brandName: 'asc' },
      include: {
        inventoryBatches: {
          where: { expiryDate: { gt: new Date() } },
          orderBy: { expiryDate: 'asc' },
        },
        _count: { select: { inventoryBatches: true, saleItems: true } },
      },
    });
    const result = products.map((p) => {
      const activeBatch = p.inventoryBatches.find((b) => b.quantityInBoxes > 0) || p.inventoryBatches[0];
      return {
        ...p,
        retailPrice: activeBatch?.retailPrice || 0,
        looseConversionFactor: activeBatch?.looseConversionFactor || 30,
        totalStockBoxes: p.inventoryBatches.reduce((s, b) => s + b.quantityInBoxes, 0),
        totalStockLoose: p.inventoryBatches.reduce((s, b) => s + b.quantityInLoose, 0),
        isLowStock: p.lowStockThreshold != null &&
          (p.inventoryBatches.reduce((s, b) => s + b.quantityInBoxes, 0) <= p.lowStockThreshold),
      };
    });
    res.json(result);
  } catch (err) { next(err); }
};

exports.getProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        inventoryBatches: { orderBy: { expiryDate: 'asc' } },
        stockAdjustments: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    const activeBatch = product.inventoryBatches.find((b) => b.quantityInBoxes > 0) || product.inventoryBatches[0];
    res.json({ ...product, retailPrice: activeBatch?.retailPrice || 0, looseConversionFactor: activeBatch?.looseConversionFactor || 30 });
  } catch (err) { next(err); }
};

exports.getProductByBarcode = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { barcode: req.params.barcode },
      include: { inventoryBatches: { where: { expiryDate: { gt: new Date() }, quantityInBoxes: { gt: 0 } }, orderBy: { expiryDate: 'asc' } } },
    });
    if (!product) throw error('Product not found', 404);
    const activeBatch = product.inventoryBatches[0];
    res.json({ ...product, retailPrice: activeBatch?.retailPrice || 0, looseConversionFactor: activeBatch?.looseConversionFactor || 30 });
  } catch (err) { next(err); }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { brandName, genericName, manufacturer, isControlled, barcode, lowStockThreshold } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { brandName, genericName, manufacturer, isControlled, barcode, lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : null },
    });
    res.json(product);
  } catch (err) { next(err); }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// ─── Batches / Stock Intake ─────────────────────────────

exports.listBatches = async (req, res, next) => {
  try {
    const { productId, expiring, expired, lowStock } = req.query;
    const where = {};
    if (productId) where.productId = productId;
    if (expiring === 'true') {
      where.expiryDate = { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), gt: new Date() };
    }
    if (expired === 'true') {
      where.expiryDate = { lte: new Date() };
    }
    const batches = await prisma.inventoryBatch.findMany({
      where,
      orderBy: { expiryDate: 'asc' },
      include: { product: true },
    });

    let result = batches;
    if (lowStock === 'true') {
      result = batches.filter((b) => {
        const totalBoxes = b.quantityInBoxes;
        const threshold = b.product.lowStockThreshold ?? 10;
        return totalBoxes <= threshold;
      });
    }

    res.json(result);
  } catch (err) { next(err); }
};

exports.getBatch = async (req, res, next) => {
  try {
    const batch = await prisma.inventoryBatch.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { product: true },
    });
    res.json(batch);
  } catch (err) { next(err); }
};

exports.stockIntake = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];

    for (const item of items) {
      let productId = item.productId;
      if (!productId && item.barcode) {
        const existing = await prisma.product.findUnique({ where: { barcode: item.barcode } });
        if (existing) productId = existing.id;
      }
      if (!productId) {
        results.push({ error: `Product not resolved for barcode: ${item.barcode}`, skipped: true });
        continue;
      }

      const purchasePrice = parseFloat(item.purchasePrice) || 0;
      const retailPrice = parseFloat(item.retailPrice) || 0;
      const boxQuantity = parseInt(item.boxQuantity) || 0;
      const looseConversionFactor = parseInt(item.looseConversionFactor) || 1;

      const batch = await prisma.inventoryBatch.create({
        data: {
          productId,
          batchNumber: item.batchNumber || `BATCH-${Date.now()}`,
          expiryDate: new Date(item.expiryDate),
          purchasePrice,
          retailPrice,
          boxQuantity,
          looseConversionFactor,
          quantityInBoxes: boxQuantity,
          quantityInLoose: 0,
        },
        include: { product: true },
      });

      await prisma.stockAdjustment.create({
        data: {
          productId,
          batchId: batch.id,
          type: 'STOCK_INTAKE',
          quantity: boxQuantity,
          unitType: 'BOX',
          reason: `Stock intake batch ${batch.batchNumber}`,
        },
      });

      results.push(batch);
    }

    res.status(201).json({ imported: results.length, batches: results });
  } catch (err) { next(err); }
};

// ─── Stock Adjustments ──────────────────────────────────

exports.adjustStock = async (req, res, next) => {
  try {
    const { productId, batchId, type, unitType, reason } = req.body;
    const quantity = parseInt(req.body.quantity) || 0;
    if (!productId || !type || !quantity) throw error('productId, type, and quantity are required');

    const adjustment = await prisma.$transaction(async (tx) => {
      const batch = await tx.inventoryBatch.findUnique({ where: { id: batchId } });
      if (!batch) throw error('Batch not found', 404);

      if (type === 'WRITE_OFF' || type === 'DAMAGE') {
        if (unitType === 'BOX') {
          if (batch.quantityInBoxes < quantity) throw error('Insufficient box stock');
          await tx.inventoryBatch.update({
            where: { id: batchId },
            data: { quantityInBoxes: { decrement: quantity } },
          });
        } else {
          if (batch.quantityInLoose < quantity) throw error('Insufficient loose stock');
          await tx.inventoryBatch.update({
            where: { id: batchId },
            data: { quantityInLoose: { decrement: quantity } },
          });
        }
      } else if (type === 'FOUND' || type === 'RETURN') {
        if (unitType === 'BOX') {
          await tx.inventoryBatch.update({
            where: { id: batchId },
            data: { quantityInBoxes: { increment: quantity } },
          });
        } else {
          await tx.inventoryBatch.update({
            where: { id: batchId },
            data: { quantityInLoose: { increment: quantity } },
          });
        }
      } else {
        throw error(`Unknown adjustment type: ${type}`);
      }

      return tx.stockAdjustment.create({
        data: { productId, batchId, type, quantity, unitType, reason },
      });
    });

    res.status(201).json(adjustment);
  } catch (err) { next(err); }
};

exports.listAdjustments = async (req, res, next) => {
  try {
    const { productId } = req.query;
    const where = productId ? { productId } : {};
    const adjustments = await prisma.stockAdjustment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { product: true },
    });
    res.json(adjustments);
  } catch (err) { next(err); }
};

// ─── Suppliers ──────────────────────────────────────────

exports.listSuppliers = async (req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { purchaseOrders: true } } },
    });
    res.json(suppliers);
  } catch (err) { next(err); }
};

exports.getSupplier = async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        purchaseOrders: {
          include: { items: { include: { product: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    res.json(supplier);
  } catch (err) { next(err); }
};

exports.createSupplier = async (req, res, next) => {
  try {
    const { name, contactPerson, phone, address } = req.body;
    if (!name) throw error('name is required');
    const supplier = await prisma.supplier.create({ data: { name, contactPerson, phone, address } });
    res.status(201).json(supplier);
  } catch (err) { next(err); }
};

exports.updateSupplier = async (req, res, next) => {
  try {
    const { name, contactPerson, phone, address } = req.body;
    const totalBalance = req.body.totalBalance !== undefined ? parseFloat(req.body.totalBalance) : undefined;
    const paidAmount = req.body.paidAmount !== undefined ? parseFloat(req.body.paidAmount) : undefined;
    const data = { name, contactPerson, phone, address };
    if (totalBalance !== undefined) data.totalBalance = totalBalance;
    if (paidAmount !== undefined) data.paidAmount = paidAmount;
    if (totalBalance !== undefined || paidAmount !== undefined) {
      const s = await prisma.supplier.findUniqueOrThrow({ where: { id: req.params.id } });
      data.remainingCredit = (data.totalBalance ?? s.totalBalance) - (data.paidAmount ?? s.paidAmount);
    }
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data });
    res.json(supplier);
  } catch (err) { next(err); }
};

// ─── Purchase Orders ────────────────────────────────────

exports.listPurchaseOrders = async (req, res, next) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });
    res.json(orders);
  } catch (err) { next(err); }
};

exports.getPurchaseOrder = async (req, res, next) => {
  try {
    const order = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });
    res.json(order);
  } catch (err) { next(err); }
};

exports.createPurchaseOrder = async (req, res, next) => {
  try {
    const { supplierId, items } = req.body;
    if (!supplierId) throw error('supplierId is required');
    if (!items || items.length === 0) throw error('At least one item required');

    let totalAmount = 0;
    const orderItems = items.map((item) => {
      const qty = parseInt(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const subtotal = qty * price;
      totalAmount += subtotal;
      return {
        productId: item.productId,
        batchNumber: item.batchNumber,
        expiryDate: new Date(item.expiryDate),
        quantity: qty,
        unitPrice: price,
        subtotal,
      };
    });

    const order = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          supplierId,
          totalAmount,
          paidAmount: 0,
          remainingAmount: totalAmount,
          items: { create: orderItems },
        },
        include: { items: { include: { product: true } }, supplier: true },
      });

      await tx.supplier.update({
        where: { id: supplierId },
        data: { totalBalance: { increment: totalAmount }, remainingCredit: { increment: totalAmount } },
      });

      for (const item of orderItems) {
        const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
        const batch = await tx.inventoryBatch.create({
          data: {
            productId: item.productId,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            purchasePrice: item.unitPrice,
            retailPrice: product.retailPrice || item.unitPrice * 1.2,
            boxQuantity: item.quantity,
            looseConversionFactor: parseInt(item.looseConversionFactor) || 30,
            quantityInBoxes: item.quantity,
            quantityInLoose: 0,
          },
        });

        await tx.stockAdjustment.create({
          data: {
            productId: item.productId,
            batchId: batch.id,
            type: 'PURCHASE_ORDER',
            quantity: item.quantity,
            unitType: 'BOX',
            reason: `PO #${po.id}`,
          },
        });
      }

      return po;
    });

    res.status(201).json(order);
  } catch (err) { next(err); }
};

// ─── Sales (Checkout) ───────────────────────────────────

function allocateStock(batches, requiredQty, unitType) {
  const allocations = [];
  let remaining = requiredQty;

  for (const batch of batches) {
    if (remaining <= 0) break;

    if (unitType === 'BOX') {
      const take = Math.min(remaining, batch.quantityInBoxes);
      if (take > 0) {
        allocations.push({ batchId: batch.id, quantity: take, unitType: 'BOX' });
        remaining -= take;
      }
    } else {
      let availBoxes = batch.quantityInBoxes;
      let availLoose = batch.quantityInLoose;
      const factor = batch.looseConversionFactor;

      while (availLoose < remaining && availBoxes > 0) {
        availLoose += factor;
        availBoxes -= 1;
      }

      const take = Math.min(remaining, availLoose);
      if (take > 0) {
        allocations.push({ batchId: batch.id, quantity: take, unitType: 'LOOSE' });
        remaining -= take;
      }
    }
  }

  if (remaining > 0) throw error('Insufficient stock to fulfill quantity');
  return allocations;
}

exports.createSale = async (req, res, next) => {
  try {
    const { items, paymentMethod, customerId } = req.body;
    const discountPercent = parseFloat(req.body.discountPercent) || 0;
    if (!items || items.length === 0) throw error('Cart is empty');

    const allocations = [];
    for (const item of items) {
      const qty = parseInt(item.quantity) || 1;
      const price = parseFloat(item.unitPrice) || 0;
      const batches = await prisma.inventoryBatch.findMany({
        where: {
          productId: item.productId,
          expiryDate: { gt: new Date() },
          OR: [{ quantityInBoxes: { gt: 0 } }, { quantityInLoose: { gt: 0 } }],
        },
        orderBy: { expiryDate: 'asc' },
      });
      if (batches.length === 0) throw error(`No available stock for product ${item.productId}`);
      const allocs = allocateStock(batches, qty, item.unitType || 'BOX');
      allocations.push({ productId: item.productId, unitPrice: price, allocs, qty });
    }

    const sale = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const saleItemsData = [];

      for (const group of allocations) {
        for (const alloc of group.allocs) {
          const batch = await tx.inventoryBatch.findUniqueOrThrow({ where: { id: alloc.batchId } });
          if (alloc.unitType === 'BOX') {
            await tx.inventoryBatch.update({
              where: { id: alloc.batchId },
              data: { quantityInBoxes: { decrement: alloc.quantity } },
            });
          } else {
            const factor = batch.looseConversionFactor;
            let boxes = batch.quantityInBoxes;
            let loose = batch.quantityInLoose;
            while (loose < alloc.quantity && boxes > 0) {
              boxes -= 1;
              loose += factor;
            }
            loose -= alloc.quantity;
            await tx.inventoryBatch.update({
              where: { id: alloc.batchId },
              data: { quantityInBoxes: boxes, quantityInLoose: loose },
            });
          }

          const subtotal = alloc.quantity * group.unitPrice;
          totalAmount += subtotal;
          saleItemsData.push({
            productId: group.productId,
            inventoryBatchId: alloc.batchId,
            quantity: alloc.quantity,
            unitType: alloc.unitType,
            unitPrice: group.unitPrice,
            subtotal,
          });
        }
      }

      const discPct = discountPercent || 0;
      const discountAmount = (totalAmount * discPct) / 100;
      const netPayable = Math.round((totalAmount - discountAmount) * 100) / 100;

      const newSale = await tx.sale.create({
        data: {
          totalAmount,
          discountPercent: discPct,
          discountAmount,
          netPayable,
          paymentMethod: paymentMethod || 'CASH',
          customerId: customerId || null,
          items: { create: saleItemsData },
        },
        include: { items: { include: { product: true } }, customer: true },
      });

      if (customerId && paymentMethod === 'CREDIT') {
        await tx.customerKhataTransaction.create({
          data: {
            customerKhataId: customerId,
            saleId: newSale.id,
            amount: netPayable,
            type: 'DEBIT',
            description: `Sale invoice ${newSale.id}`,
          },
        });
        await tx.customerKhata.update({
          where: { id: customerId },
          data: { totalCredit: { increment: netPayable }, remainingBalance: { increment: netPayable } },
        });
      }

      for (const sd of saleItemsData) {
        await tx.stockAdjustment.create({
          data: {
            productId: sd.productId,
            batchId: sd.inventoryBatchId,
            type: 'SALE',
            quantity: sd.quantity,
            unitType: sd.unitType,
            reason: `Sale #${newSale.id}`,
          },
        });
      }

      return newSale;
    });

    submitInvoice(sale).then((fbr) => {
      if (fbr.fbrInvoiceRef) {
        prisma.sale.update({
          where: { id: sale.id },
          data: { fbrInvoiceRef: fbr.fbrInvoiceRef, fbrQrPayload: fbr.fbrQrPayload },
        }).catch(() => {});
      }
    });

    res.status(201).json(sale);
  } catch (err) { next(err); }
};

exports.listSales = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const sales = await prisma.sale.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : undefined,
      include: {
        items: { include: { product: true, inventoryBatch: true } },
        customer: true,
      },
    });
    res.json(sales);
  } catch (err) { next(err); }
};

exports.getSale = async (req, res, next) => {
  try {
    const sale = await prisma.sale.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        items: { include: { product: true, inventoryBatch: true } },
        customer: { include: { transactions: true } },
      },
    });
    res.json(sale);
  } catch (err) { next(err); }
};

// ─── Customers / Ledger ─────────────────────────────────

exports.listCustomers = async (req, res, next) => {
  try {
    const { q } = req.query;
    const where = q ? {
      OR: [
        { fullName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ],
    } : {};
    const customers = await prisma.customerKhata.findMany({
      where,
      orderBy: { fullName: 'asc' },
      include: { _count: { select: { transactions: true, sales: true } } },
    });
    res.json(customers);
  } catch (err) { next(err); }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await prisma.customerKhata.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        transactions: { orderBy: { createdAt: 'desc' } },
        sales: { orderBy: { createdAt: 'desc' } },
      },
    });
    res.json(customer);
  } catch (err) { next(err); }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const { fullName, phone, address } = req.body;
    if (!fullName) throw error('fullName is required');
    const customer = await prisma.customerKhata.create({ data: { fullName, phone, address } });
    res.status(201).json(customer);
  } catch (err) { next(err); }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const { fullName, phone, address } = req.body;
    const customer = await prisma.customerKhata.update({
      where: { id: req.params.id },
      data: { fullName, phone, address },
    });
    res.json(customer);
  } catch (err) { next(err); }
};

exports.addCustomerPayment = async (req, res, next) => {
  try {
    const amount = parseFloat(req.body.amount);
    if (!amount || amount <= 0) throw error('Invalid payment amount');

    const customer = await prisma.$transaction(async (tx) => {
      const c = await tx.customerKhata.update({
        where: { id: req.params.id },
        data: { paidAmount: { increment: amount }, remainingBalance: { decrement: amount } },
      });
      await tx.customerKhataTransaction.create({
        data: {
          customerKhataId: req.params.id,
          amount,
          type: 'CREDIT',
          description: 'Payment received',
        },
      });
      return c;
    });

    res.json(customer);
  } catch (err) { next(err); }
};

// ─── Reports ────────────────────────────────────────────

exports.reportExpiring = async (req, res, next) => {
  try {
    const { days } = req.query;
    const threshold = parseInt(days) || 30;
    const batches = await prisma.inventoryBatch.findMany({
      where: {
        expiryDate: { lte: new Date(Date.now() + threshold * 24 * 60 * 60 * 1000), gt: new Date() },
        OR: [{ quantityInBoxes: { gt: 0 } }, { quantityInLoose: { gt: 0 } }],
      },
      orderBy: { expiryDate: 'asc' },
      include: { product: true },
    });
    res.json(batches);
  } catch (err) { next(err); }
};

exports.reportSummary = async (req, res, next) => {
  try {
    const [productCount, batchCount, totalBoxes, totalValue, salesToday] = await Promise.all([
      prisma.product.count(),
      prisma.inventoryBatch.count({ where: { quantityInBoxes: { gt: 0 } } }),
      prisma.inventoryBatch.aggregate({ _sum: { quantityInBoxes: true } }),
      prisma.inventoryBatch.aggregate({ _sum: { quantityInBoxes: true, purchasePrice: true } }),
      prisma.sale.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    ]);

    const lowStockProducts = await prisma.product.findMany({
      where: {
        lowStockThreshold: { not: null },
        inventoryBatches: {
          some: { quantityInBoxes: { lte: 0 } },
        },
      },
    });

    res.json({
      totalProducts: productCount,
      activeBatches: batchCount,
      totalStockBoxes: totalBoxes._sum.quantityInBoxes || 0,
      estimatedValue: totalValue._sum.purchasePrice || 0,
      salesToday,
      lowStockCount: lowStockProducts.length,
    });
  } catch (err) { next(err); }
};

exports.reportLowStock = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        lowStockThreshold: { not: null },
      },
      include: {
        inventoryBatches: {
          where: { expiryDate: { gt: new Date() } },
          select: { quantityInBoxes: true, quantityInLoose: true },
        },
      },
    });

    const result = products
      .map((p) => {
        const totalBoxes = p.inventoryBatches.reduce((s, b) => s + b.quantityInBoxes, 0);
        const totalLoose = p.inventoryBatches.reduce((s, b) => s + b.quantityInLoose, 0);
        return {
          ...p,
          totalStockBoxes: totalBoxes,
          totalStockLoose: totalLoose,
          isLowStock: totalBoxes <= (p.lowStockThreshold ?? 10),
        };
      })
      .filter((p) => p.isLowStock);

    res.json(result);
  } catch (err) { next(err); }
};

exports.reportValuation = async (req, res, next) => {
  try {
    const batches = await prisma.inventoryBatch.findMany({
      where: { quantityInBoxes: { gt: 0 } },
      include: { product: true },
      orderBy: { product: { brandName: 'asc' } },
    });

    const valuation = batches.map((b) => ({
      productName: b.product.brandName,
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      boxes: b.quantityInBoxes,
      purchasePrice: b.purchasePrice,
      retailPrice: b.retailPrice,
      purchaseValue: b.quantityInBoxes * b.purchasePrice,
      retailValue: b.quantityInBoxes * b.retailPrice,
      potentialProfit: b.quantityInBoxes * (b.retailPrice - b.purchasePrice),
    }));

    const totals = valuation.reduce(
      (acc, v) => ({
        totalBoxes: acc.totalBoxes + v.boxes,
        totalPurchase: acc.totalPurchase + v.purchaseValue,
        totalRetail: acc.totalRetail + v.retailValue,
        totalProfit: acc.totalProfit + v.potentialProfit,
      }),
      { totalBoxes: 0, totalPurchase: 0, totalRetail: 0, totalProfit: 0 },
    );

    res.json({ items: valuation, totals });
  } catch (err) { next(err); }
};

// ─── Unified Search ─────────────────────────────────────

exports.search = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) return res.json({ products: [], batches: [], customers: [], suppliers: [] });

    const [products, batches, customers, suppliers] = await Promise.all([
      prisma.product.findMany({
        where: {
          OR: [
            { brandName: { contains: q, mode: 'insensitive' } },
            { genericName: { contains: q, mode: 'insensitive' } },
            { barcode: { contains: q } },
          ],
        },
        take: 10,
      }),
      prisma.inventoryBatch.findMany({
        where: { batchNumber: { contains: q, mode: 'insensitive' } },
        include: { product: true },
        take: 10,
      }),
      prisma.customerKhata.findMany({
        where: {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
          ],
        },
        take: 10,
      }),
      prisma.supplier.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        take: 10,
      }),
    ]);

    res.json({ products, batches, customers, suppliers });
  } catch (err) { next(err); }
};

// ─── Master Medicine List ───────────────────────────────

exports.searchMasterMedicines = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const medicines = await prisma.masterMedicineList.findMany({
      where: { brandName: { contains: q, mode: 'insensitive' } },
      orderBy: { brandName: 'asc' },
      take: 15,
    });
    res.json(medicines);
  } catch (err) { next(err); }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { brandName, genericName, manufacturer, isControlled, barcode, lowStockThreshold, isCustom } = req.body;
    if (!brandName) throw error('brandName is required');

    const product = await prisma.product.create({
      data: {
        brandName,
        genericName,
        manufacturer,
        isControlled: isControlled || false,
        barcode,
        lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : 10,
      },
    });

    // If custom, add to master list so it appears in autocomplete immediately.
    if (isCustom) {
      const existing = await prisma.masterMedicineList.findFirst({ where: { brandName } });
      if (!existing) {
        await prisma.masterMedicineList.create({
          data: { brandName, genericName, companyName: manufacturer },
        });
      }
    }

    res.status(201).json(product);
  } catch (err) { next(err); }
};


