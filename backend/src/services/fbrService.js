/**
 * FBR (Federal Board of Revenue) POS Integration Service
 *
 * Pakistan's FBR requires real-time invoice reporting for Tier-1 retailers.
 * Sends sale data to the FBR fiscal server and returns the invoice reference
 * and QR code payload for the printed receipt.
 *
 * Sandbox docs: https://fbr.gov.pk/pos-rules
 */

const https = require('https');

const API_BASE = process.env.FBR_API_URL || 'https://sandbox.fbr.gov.pk/pos/api/v1/';
const USERNAME = process.env.FBR_USERNAME || 'test_user';
const PASSWORD = process.env.FBR_PASSWORD || 'test_pass';
const POS_ID = process.env.FBR_POS_ID || 'POS-001';

function buildInvoicePayload(sale) {
  return {
    posId: POS_ID,
    invoiceNumber: sale.invoiceNumber,
    invoiceType: 'S',
    invoiceDate: sale.createdAt,
    buyerName: sale.customer?.fullName || 'CASH',
    buyerPhone: sale.customer?.phone || '',
    items: sale.items.map((item) => ({
      productCode: item.product?.barcode || item.productId,
      productName: item.product?.brandName || 'Item',
      quantity: item.quantity,
      unitType: item.unitType,
      unitPrice: item.unitPrice,
      taxRate: 0,
      discount: 0,
      totalAmount: item.subtotal,
    })),
    totalAmount: sale.totalAmount,
    discountAmount: sale.discountAmount,
    netPayable: sale.netPayable,
    paymentMode: sale.paymentMethod === 'CASH' ? 'CS' : 'CR',
  };
}

/**
 * POST invoice to FBR fiscal server.
 * Returns gracefully on network failure (offline-resilient).
 *
 * @param {Object} sale
 * @returns {Promise<{fbrInvoiceRef: string|null, fbrQrPayload: string|null}>}
 */
async function submitInvoice(sale) {
  const payload = buildInvoicePayload(sale);
  const body = JSON.stringify(payload);

  return new Promise((resolve) => {
    const url = new URL('/api/v1/invoice', API_BASE);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Authorization: `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')}`,
      },
      rejectUnauthorized: false,
      timeout: 15000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              fbrInvoiceRef: parsed.invoiceNumber || `FBR-${Date.now()}`,
              fbrQrPayload: parsed.qrCode || parsed.qrPayload || '',
            });
          } else {
            console.warn('[FBR] API error', res.statusCode, parsed);
            resolve({ fbrInvoiceRef: null, fbrQrPayload: null });
          }
        } catch {
          resolve({ fbrInvoiceRef: null, fbrQrPayload: null });
        }
      });
    });

    req.on('error', (err) => {
      console.warn('[FBR] Network error, proceeding without FBR sync:', err.message);
      resolve({ fbrInvoiceRef: null, fbrQrPayload: null });
    });

    req.on('timeout', () => {
      req.destroy();
      console.warn('[FBR] Timeout, proceeding without FBR sync');
      resolve({ fbrInvoiceRef: null, fbrQrPayload: null });
    });

    req.write(body);
    req.end();
  });
}

module.exports = { submitInvoice, buildInvoicePayload };
