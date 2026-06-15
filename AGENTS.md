# Vial2 — Pharmacy POS, Inventory & Ledger

## Stack
- **Backend**: Node.js, Express, Prisma (PostgreSQL), dotenv, morgan, cors
- **Frontend**: React 18, TailwindCSS 3, react-scripts
- **Database**: PostgreSQL (local instance managed via npm scripts)

## Project structure
```
Vial2/
├── backend/
│   ├── prisma/            # Schema + seed
│   ├── scripts/           # Database management (manage-db.js)
│   ├── src/
│   │   ├── controllers/   # Route handlers (one file)
│   │   ├── middleware/     # Error handler
│   │   ├── routes/        # Express router
│   │   ├── services/      # FBR POS API integration
│   │   ├── index.js       # Express entry point
│   │   └── prisma.js      # PrismaClient singleton
│   ├── .env               # Config (tracked — contains non-sensitive defaults only)
│   └── package.json
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── common/    # Navbar
│       │   ├── inventory/ # StockIntake
│       │   └── pos/       # POSPage, ProductSearch, CartTable, CartRow, FBRStatus
│       └── pages/         # HomePage, ProductsPage, BatchesPage, etc.
│   └── package.json
└── AGENTS.md
```

## Running

```bash
# Terminal 1 — Database
cd backend
npm run db:start

# Terminal 2 — Backend
cd backend
npm run dev              # http://localhost:4000

# Terminal 3 — Frontend
cd frontend
npm start                # http://localhost:3000 (proxies /api/* to :4000)
```

## Database management
```bash
cd backend
npm run db:init          # One-time: initdb + create role + create db
npm run db:start         # Start PostgreSQL
npm run db:stop          # Stop PostgreSQL
npm run db:restart       # Restart PostgreSQL
npm run db:status        # Check if PostgreSQL is running
npm run prisma:push      # Sync schema to database
npm run prisma:studio    # Open Prisma Studio
npm run prisma:migrate   # Create a migration
```

First-time setup:
```bash
cd backend
npm install
npm run db:init
npm run db:start
npm run prisma:push
node prisma/seed.js         # Seeds 1100 MasterMedicineList entries
npm run db:sample           # Optional: adds sample products, suppliers, batches, sales, customers
npm run dev
```

## Seeding
- `prisma/seed.js` — seeds the `MasterMedicineList` (1100 entries). Safe to re-run (skips if >0 entries).
- `prisma/sample-data.js` — creates 13 products with batches, 3 suppliers, 2 purchase orders, 3 customers, 3 sales for demo/testing.
- `npm run db:sample` — shortcut to run sample-data.js.

## Conventions
- JavaScript (no TypeScript)
- Express routes in `routes/`, handlers in `controllers/`
- Prisma for all DB access (no raw SQL)
- All API routes under `/api/inventory/*`
- Error handling via `next(err)` → centralized errorHandler middleware
- Frontend uses TailwindCSS utility classes (no CSS modules)
- Frontend proxies `/api` to backend — use relative URLs in frontend
- FBR integration is async (non-blocking after sale creation)

## Key files
- `backend/src/controllers/inventoryController.js` — all route handlers (877 lines)
- `backend/prisma/schema.prisma` — 9 models: Product, InventoryBatch, Supplier, PurchaseOrder, etc.
- `backend/prisma/seed.js` — seeds 1100 MasterMedicineList entries
- `backend/scripts/manage-db.js` — cross-platform PG lifecycle manager
