const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sampleSuppliers = await prisma.supplier.count();
  if (sampleSuppliers > 0) {
    console.log(`Sample data already exists (${sampleSuppliers} suppliers) — skipping.`);
    return;
  }

  const masterCount = await prisma.masterMedicineList.count();
  if (masterCount < 10) {
    console.log('MasterMedicineList is empty — run node prisma/seed.js first.');
    return;
  }

  const masters = await prisma.masterMedicineList.findMany({ take: 20 });
  const now = new Date();

  function daysFromNow(n) {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return d;
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(arr) {
    return arr[rand(0, arr.length - 1)];
  }

  // ─── Suppliers ──────────────────────────────────────

  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: 'Abbott Laboratories Pakistan',
        contactPerson: 'Khalid Mehmood',
        phone: '021-111-222-668',
        address: 'D/12, SITE Industrial Area, Karachi',
        totalBalance: 0,
        paidAmount: 0,
        remainingCredit: 0,
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'GlaxoSmithKline Pakistan',
        contactPerson: 'Fatima Ali',
        phone: '021-111-475-468',
        address: '35-D, Main Boulevard, Gulberg II, Lahore',
        totalBalance: 0,
        paidAmount: 0,
        remainingCredit: 0,
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'Getz Pharma',
        contactPerson: 'Usman Khan',
        phone: '021-3432-1234',
        address: '29-30, Sector 23, Korangi Industrial Area, Karachi',
        totalBalance: 0,
        paidAmount: 0,
        remainingCredit: 0,
      },
    }),
  ]);

  console.log(`Created ${suppliers.length} suppliers`);

  // ─── Products & Batches ─────────────────────────────

  const products = [];
  const batches = [];
  const productData = [
    { idx: 0, genericName: 'Paracetamol 500mg', barcode: '8901234560010', purchasePrice: 45, retailPrice: 65, boxQty: 100, looseFactor: 10, boxes: 15, loose: 3, batchNum: 'B-2401', expiryDays: 240 },
    { idx: 1, genericName: 'Amoxicillin 250mg', barcode: '8901234560027', purchasePrice: 120, retailPrice: 170, boxQty: 50, looseFactor: 10, boxes: 8, loose: 2, batchNum: 'B-2402', expiryDays: 210 },
    { idx: 2, genericName: 'Omeprazole 20mg', barcode: '8901234560034', purchasePrice: 80, retailPrice: 130, boxQty: 60, looseFactor: 10, boxes: 12, loose: 5, batchNum: 'B-2403', expiryDays: 300 },
    { idx: 3, genericName: 'Azithromycin 500mg', barcode: '8901234560041', purchasePrice: 250, retailPrice: 380, boxQty: 30, looseFactor: 10, boxes: 6, loose: 1, batchNum: 'B-2404', expiryDays: 270 },
    { idx: 4, genericName: 'Metformin 850mg', barcode: '8901234560058', purchasePrice: 60, retailPrice: 95, boxQty: 100, looseFactor: 10, boxes: 20, loose: 4, batchNum: 'B-2405', expiryDays: 365 },
    { idx: 5, genericName: 'Losartan 50mg', barcode: '8901234560065', purchasePrice: 90, retailPrice: 145, boxQty: 50, looseFactor: 10, boxes: 10, loose: 2, batchNum: 'B-2406', expiryDays: 330 },
    { idx: 6, genericName: 'Atorvastatin 10mg', barcode: '8901234560072', purchasePrice: 110, retailPrice: 170, boxQty: 60, looseFactor: 10, boxes: 7, loose: 3, batchNum: 'B-2407', expiryDays: 280 },
    { idx: 7, genericName: 'Salbutamol Inhaler', barcode: '8901234560089', purchasePrice: 200, retailPrice: 320, boxQty: 20, looseFactor: 1, boxes: 5, loose: 0, batchNum: 'B-2408', expiryDays: 200 },
    { idx: 8, genericName: 'Ceftriaxone 1g Inj', barcode: '8901234560096', purchasePrice: 150, retailPrice: 240, boxQty: 25, looseFactor: 1, boxes: 4, loose: 0, batchNum: 'B-2409', expiryDays: 190 },
    { idx: 9, genericName: 'Fluconazole 150mg', barcode: '8901234560102', purchasePrice: 70, retailPrice: 120, boxQty: 40, looseFactor: 10, boxes: 9, loose: 2, batchNum: 'B-2410', expiryDays: 350 },
    // Near expiry batches
    { idx: 0, genericName: null, barcode: null, purchasePrice: 42, retailPrice: 60, boxQty: 100, looseFactor: 10, boxes: 5, loose: 0, batchNum: 'B-2301', expiryDays: 25 },
    { idx: 1, genericName: null, barcode: null, purchasePrice: 110, retailPrice: 160, boxQty: 50, looseFactor: 10, boxes: 3, loose: 1, batchNum: 'B-2302', expiryDays: 15 },
    // Expired batch
    { idx: 2, genericName: null, barcode: null, purchasePrice: 75, retailPrice: 125, boxQty: 60, looseFactor: 10, boxes: 2, loose: 0, batchNum: 'B-2201', expiryDays: -60 },
  ];

  for (const pd of productData) {
    const master = masters[pd.idx % masters.length];
    const product = await prisma.product.create({
      data: {
        brandName: master.brandName,
        genericName: pd.genericName || master.genericName,
        manufacturer: pd.genericName ? pick(masters).companyName : master.companyName,
        isControlled: false,
        barcode: pd.barcode,
        lowStockThreshold: rand(3, 8),
      },
    });
    products.push(product);

    const batch = await prisma.inventoryBatch.create({
      data: {
        productId: product.id,
        batchNumber: pd.batchNum,
        expiryDate: daysFromNow(pd.expiryDays),
        purchasePrice: pd.purchasePrice,
        retailPrice: pd.retailPrice,
        boxQuantity: pd.boxQty,
        looseConversionFactor: pd.looseFactor,
        quantityInBoxes: pd.boxes,
        quantityInLoose: pd.loose,
      },
    });
    batches.push(batch);

    await prisma.stockAdjustment.create({
      data: {
        productId: product.id,
        batchId: batch.id,
        type: 'STOCK_INTAKE',
        quantity: pd.boxes,
        unitType: 'BOX',
        reason: `Initial stock — batch ${pd.batchNum}`,
      },
    });
  }

  console.log(`Created ${products.length} products with ${batches.length} batches`);

  // ─── Purchase Orders ────────────────────────────────

  const po1 = await prisma.purchaseOrder.create({
    data: {
      supplierId: suppliers[0].id,
      totalAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
      createdAt: daysFromNow(-30),
    },
  });

  let po1Total = 0;
  const po1Items = [];
  for (let i = 0; i < 4; i++) {
    const product = products[i];
    const qty = rand(10, 25);
    const price = [45, 120, 80, 250][i];
    const subtotal = qty * price;
    po1Total += subtotal;
    po1Items.push({
      purchaseOrderId: po1.id,
      productId: product.id,
      batchNumber: `PO1-${i + 1}`,
      expiryDate: daysFromNow(rand(150, 300)),
      quantity: qty,
      unitPrice: price,
      subtotal,
    });

    await prisma.stockAdjustment.create({
      data: {
        productId: product.id,
        batchId: batches[i].id,
        type: 'PURCHASE_ORDER',
        quantity: qty,
        unitType: 'BOX',
        reason: `PO #${po1.id}`,
      },
    });
  }

  await prisma.purchaseOrderItem.createMany({ data: po1Items });
  await prisma.purchaseOrder.update({
    where: { id: po1.id },
    data: { totalAmount: po1Total, paidAmount: po1Total * 0.6, remainingAmount: po1Total * 0.4 },
  });
  await prisma.supplier.update({
    where: { id: suppliers[0].id },
    data: { totalBalance: { increment: po1Total }, remainingCredit: { increment: po1Total * 0.4 } },
  });

  const po2 = await prisma.purchaseOrder.create({
    data: {
      supplierId: suppliers[1].id,
      totalAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
      createdAt: daysFromNow(-15),
    },
  });

  let po2Total = 0;
  const po2Items = [];
  for (let i = 4; i < 8; i++) {
    const product = products[i];
    const qty = rand(8, 20);
    const price = [60, 90, 110, 200][i - 4];
    const subtotal = qty * price;
    po2Total += subtotal;
    po2Items.push({
      purchaseOrderId: po2.id,
      productId: product.id,
      batchNumber: `PO2-${i - 3}`,
      expiryDate: daysFromNow(rand(180, 330)),
      quantity: qty,
      unitPrice: price,
      subtotal,
    });

    await prisma.stockAdjustment.create({
      data: {
        productId: product.id,
        batchId: batches[i].id,
        type: 'PURCHASE_ORDER',
        quantity: qty,
        unitType: 'BOX',
        reason: `PO #${po2.id}`,
      },
    });
  }

  await prisma.purchaseOrderItem.createMany({ data: po2Items });
  await prisma.purchaseOrder.update({
    where: { id: po2.id },
    data: { totalAmount: po2Total, paidAmount: 0, remainingAmount: po2Total },
  });
  await prisma.supplier.update({
    where: { id: suppliers[1].id },
    data: { totalBalance: { increment: po2Total }, remainingCredit: { increment: po2Total } },
  });

  console.log(`Created 2 purchase orders (total PKR ${(po1Total + po2Total).toLocaleString()})`);

  // ─── Customers ──────────────────────────────────────

  const customers = await Promise.all([
    prisma.customerKhata.create({
      data: {
        fullName: 'Ahmed Hassan',
        phone: '0300-1234567',
        address: 'House 12, Block B, Johar Town, Lahore',
        totalCredit: 0,
        paidAmount: 0,
        remainingBalance: 0,
      },
    }),
    prisma.customerKhata.create({
      data: {
        fullName: 'Saima Batool',
        phone: '0333-7654321',
        address: 'Flat 3B, Al-Falah Apartments, Clifton, Karachi',
        totalCredit: 0,
        paidAmount: 0,
        remainingBalance: 0,
      },
    }),
    prisma.customerKhata.create({
      data: {
        fullName: 'Dr. Imran Sheikh',
        phone: '0345-9876543',
        address: '23-B, Cavalry Ground, DHA Phase V, Islamabad',
        totalCredit: 0,
        paidAmount: 0,
        remainingBalance: 0,
      },
    }),
  ]);

  console.log(`Created ${customers.length} customers`);

  // ─── Sales ──────────────────────────────────────────

  // Sale 1 — cash sale a few hours ago
  const sale1 = await prisma.sale.create({
    data: {
      totalAmount: 0,
      discountPercent: 5,
      discountAmount: 0,
      netPayable: 0,
      paymentMethod: 'CASH',
      createdAt: daysFromNow(-1),
    },
  });

  const s1Items = [
    { productIdx: 0, batchIdx: 0, qty: 3, unitType: 'BOX' },
    { productIdx: 2, batchIdx: 2, qty: 5, unitType: 'LOOSE' },
    { productIdx: 4, batchIdx: 4, qty: 2, unitType: 'BOX' },
  ];

  let s1Total = 0;
  for (const si of s1Items) {
    const batch = batches[si.batchIdx];
    let qtyToUse = si.qty;
    if (si.unitType === 'LOOSE') {
      const boxesNeeded = Math.ceil((si.qty - batch.quantityInLoose) / batch.looseConversionFactor);
      qtyToUse = Math.min(si.qty, batch.looseConversionFactor * boxesNeeded);
    }
    const unitPrice = batch.retailPrice;
    const subtotal = qtyToUse * unitPrice;
    s1Total += subtotal;

    await prisma.saleItem.create({
      data: {
        saleId: sale1.id,
        productId: batch.productId,
        inventoryBatchId: batch.id,
        quantity: qtyToUse,
        unitType: si.unitType,
        unitPrice,
        subtotal,
      },
    });

    if (si.unitType === 'BOX') {
      await prisma.inventoryBatch.update({
        where: { id: batch.id },
        data: { quantityInBoxes: { decrement: qtyToUse } },
      });
    } else {
      const factor = batch.looseConversionFactor;
      let boxes = batch.quantityInBoxes;
      let loose = batch.quantityInLoose;
      while (loose < qtyToUse && boxes > 0) {
        boxes -= 1;
        loose += factor;
      }
      loose -= qtyToUse;
      await prisma.inventoryBatch.update({
        where: { id: batch.id },
        data: { quantityInBoxes: boxes, quantityInLoose: loose },
      });
    }

    await prisma.stockAdjustment.create({
      data: {
        productId: batch.productId,
        batchId: batch.id,
        type: 'SALE',
        quantity: qtyToUse,
        unitType: si.unitType,
        reason: `Sale #${sale1.id}`,
      },
    });
  }

  const s1Disc = Math.round((s1Total * 5) / 100);
  await prisma.sale.update({
    where: { id: sale1.id },
    data: { totalAmount: s1Total, discountAmount: s1Disc, netPayable: s1Total - s1Disc },
  });

  // Sale 2 — credit sale to Ahmed
  const sale2 = await prisma.sale.create({
    data: {
      totalAmount: 0,
      discountPercent: 0,
      discountAmount: 0,
      netPayable: 0,
      paymentMethod: 'CREDIT',
      customerId: customers[0].id,
      createdAt: daysFromNow(-3),
    },
  });

  const s2Items = [
    { productIdx: 1, batchIdx: 1, qty: 2, unitType: 'BOX' },
    { productIdx: 3, batchIdx: 3, qty: 4, unitType: 'LOOSE' },
    { productIdx: 5, batchIdx: 5, qty: 1, unitType: 'BOX' },
    { productIdx: 6, batchIdx: 6, qty: 3, unitType: 'LOOSE' },
  ];

  let s2Total = 0;
  for (const si of s2Items) {
    const batch = batches[si.batchIdx];
    const unitPrice = batch.retailPrice;
    const subtotal = si.qty * unitPrice;
    s2Total += subtotal;

    await prisma.saleItem.create({
      data: {
        saleId: sale2.id,
        productId: batch.productId,
        inventoryBatchId: batch.id,
        quantity: si.qty,
        unitType: si.unitType,
        unitPrice,
        subtotal,
      },
    });

    if (si.unitType === 'BOX') {
      await prisma.inventoryBatch.update({
        where: { id: batch.id },
        data: { quantityInBoxes: { decrement: si.qty } },
      });
    } else {
      const factor = batch.looseConversionFactor;
      let boxes = batch.quantityInBoxes;
      let loose = batch.quantityInLoose;
      while (loose < si.qty && boxes > 0) {
        boxes -= 1;
        loose += factor;
      }
      loose -= si.qty;
      await prisma.inventoryBatch.update({
        where: { id: batch.id },
        data: { quantityInBoxes: boxes, quantityInLoose: loose },
      });
    }

    await prisma.stockAdjustment.create({
      data: {
        productId: batch.productId,
        batchId: batch.id,
        type: 'SALE',
        quantity: si.qty,
        unitType: si.unitType,
        reason: `Sale #${sale2.id}`,
      },
    });
  }

  await prisma.sale.update({
    where: { id: sale2.id },
    data: { totalAmount: s2Total, discountAmount: 0, netPayable: s2Total },
  });

  await prisma.customerKhataTransaction.create({
    data: {
      customerKhataId: customers[0].id,
      saleId: sale2.id,
      amount: s2Total,
      type: 'DEBIT',
      description: `Sale invoice #${sale2.id}`,
    },
  });
  await prisma.customerKhata.update({
    where: { id: customers[0].id },
    data: { totalCredit: { increment: s2Total }, remainingBalance: { increment: s2Total } },
  });

  // Sale 3 — cash sale today
  const sale3 = await prisma.sale.create({
    data: {
      totalAmount: 0,
      discountPercent: 0,
      discountAmount: 0,
      netPayable: 0,
      paymentMethod: 'CASH',
    },
  });

  const s3Items = [
    { productIdx: 7, batchIdx: 7, qty: 2, unitType: 'BOX' },
    { productIdx: 9, batchIdx: 9, qty: 3, unitType: 'LOOSE' },
  ];

  let s3Total = 0;
  for (const si of s3Items) {
    const batch = batches[si.batchIdx];
    const unitPrice = batch.retailPrice;
    const subtotal = si.qty * unitPrice;
    s3Total += subtotal;

    await prisma.saleItem.create({
      data: {
        saleId: sale3.id,
        productId: batch.productId,
        inventoryBatchId: batch.id,
        quantity: si.qty,
        unitType: si.unitType,
        unitPrice,
        subtotal,
      },
    });

    if (si.unitType === 'BOX') {
      await prisma.inventoryBatch.update({
        where: { id: batch.id },
        data: { quantityInBoxes: { decrement: si.qty } },
      });
    } else {
      const factor = batch.looseConversionFactor;
      let boxes = batch.quantityInBoxes;
      let loose = batch.quantityInLoose;
      while (loose < si.qty && boxes > 0) {
        boxes -= 1;
        loose += factor;
      }
      loose -= si.qty;
      await prisma.inventoryBatch.update({
        where: { id: batch.id },
        data: { quantityInBoxes: boxes, quantityInLoose: loose },
      });
    }

    await prisma.stockAdjustment.create({
      data: {
        productId: batch.productId,
        batchId: batch.id,
        type: 'SALE',
        quantity: si.qty,
        unitType: si.unitType,
        reason: `Sale #${sale3.id}`,
      },
    });
  }

  await prisma.sale.update({
    where: { id: sale3.id },
    data: { totalAmount: s3Total, discountAmount: 0, netPayable: s3Total },
  });

  // Payment from Ahmed
  await prisma.customerKhataTransaction.create({
    data: {
      customerKhataId: customers[0].id,
      amount: 500,
      type: 'CREDIT',
      description: 'Partial payment received',
    },
  });
  await prisma.customerKhata.update({
    where: { id: customers[0].id },
    data: { paidAmount: { increment: 500 }, remainingBalance: { decrement: 500 } },
  });

  console.log(`Created 3 sales (total PKR ${(s1Total + s2Total + s3Total).toLocaleString()})`);
  console.log('\nSample data loaded successfully!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
