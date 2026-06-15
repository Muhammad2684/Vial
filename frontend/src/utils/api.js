const BASE = process.env.REACT_APP_API_URL || '/api/inventory';

const cache = new Map();
const CACHE_TTL = 30000;

function cached(key, fetcher) {
  const existing = cache.get(key);
  if (existing && Date.now() - existing.ts < CACHE_TTL) return existing.data;
  const promise = fetcher().then((data) => { cache.set(key, { data, ts: Date.now() }); return data; });
  cache.set(key, { data: promise, ts: Date.now() });
  return promise;
}

function invalidate(...prefixes) {
  for (const key of cache.keys()) {
    if (prefixes.some((p) => key.startsWith(p))) cache.delete(key);
  }
}

export function clearCache() { cache.clear(); }

async function request(path, options = {}) {
  const cacheKey = `GET ${path}`;
  if (!options.method || options.method === 'GET') {
    return cached(cacheKey, () =>
      fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json', ...options.headers } }).then(handleRes)
    );
  }
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  invalidate('GET /products', 'GET /batches', 'GET /suppliers', 'GET /customers', 'GET /sales', 'GET /purchase-orders', 'GET /adjustments', 'GET /reports');
  return handleRes(res);
}

async function handleRes(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  products: {
    list: (q) => request(`/products?q=${encodeURIComponent(q || '')}`),
    get: (id) => request(`/products/${id}`),
    byBarcode: (code) => request(`/products/barcode/${encodeURIComponent(code)}`),
    create: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  },

  batches: {
    list: (productId) => request(`/batches${productId ? `?productId=${productId}` : ''}`),
    get: (id) => request(`/batches/${id}`),
  },

  inventory: {
    stockIntake: (data) => request('/stock-intake', { method: 'POST', body: JSON.stringify(data) }),
    adjust: (data) => request('/adjust', { method: 'POST', body: JSON.stringify(data) }),
    adjustments: (productId) => request(`/adjustments${productId ? `?productId=${productId}` : ''}`),
  },

  sales: {
    list: (limit) => request(`/sales${limit ? `?limit=${limit}` : ''}`),
    get: (id) => request(`/sales/${id}`),
    create: (data) => request('/sales', { method: 'POST', body: JSON.stringify(data) }),
  },

  suppliers: {
    list: () => request('/suppliers'),
    get: (id) => request(`/suppliers/${id}`),
    create: (data) => request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  purchaseOrders: {
    list: () => request('/purchase-orders'),
    get: (id) => request(`/purchase-orders/${id}`),
    create: (data) => request('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  },

  customers: {
    list: (q) => request(`/customers?q=${encodeURIComponent(q || '')}`),
    get: (id) => request(`/customers/${id}`),
    create: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    addPayment: (id, amount) => request(`/customers/${id}/payment`, { method: 'POST', body: JSON.stringify({ amount }) }),
  },

  reports: {
    expiring: (days) => request(`/reports/expiring${days ? `?days=${days}` : ''}`),
    summary: () => request('/reports/summary'),
    lowStock: () => request('/reports/low-stock'),
    valuation: () => request('/reports/valuation'),
  },

  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),

  masterMedicines: {
    search: (q) => request(`/master-medicines?q=${encodeURIComponent(q)}`),
  },

};
