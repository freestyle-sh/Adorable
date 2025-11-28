# Adorable ERP System - Setup & Implementation Guide

## 🎯 Overview

**Adorable** is a comprehensive Enterprise Resource Planning (ERP) system designed specifically for business automation in Bangladesh and globally. It includes modules for inventory management, purchase & sales, accounting, multi-branch operations, and compliance reporting.

---

## 📋 System Architecture

### Technology Stack
- **Frontend**: Next.js 15 with React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (via Neon)
- **ORM**: Drizzle ORM
- **Authentication**: Stack Auth
- **Caching**: Redis
- **Deployment**: Vercel

### Core Modules

| Module | Features | Status |
|--------|----------|--------|
| **Inventory Management** | Stock tracking, cylinder lifecycle, warehouse management | ✅ Complete |
| **Purchase Management** | PO, GRN, Returns, Vendor management | ✅ Complete |
| **Sales Management** | Sales orders, invoices, delivery notes, payment receipts | ✅ Complete |
| **Accounting** | Chart of accounts, journal vouchers, ledger, trial balance | ✅ Complete |
| **Reporting** | Stock, sales, purchase, accounting reports | ✅ Complete |
| **Multi-Branch** | Branch & warehouse management | ✅ Complete |
| **Multi-Language** | Bangla & English support | ✅ Complete |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- PostgreSQL (Neon recommended)
- npm or yarn

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/farhanmahee/Adorable.git
   cd Adorable
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in the following:
   ```env
   DATABASE_URL=postgresql://user:password@host/database
   ANTHROPIC_API_KEY=your_key
   FREESTYLE_API_KEY=your_key
   NEXT_PUBLIC_STACK_PROJECT_ID=your_project_id
   NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_key
   STACK_SECRET_SERVER_KEY=your_key
   REDIS_URL=redis://localhost:6379
   ```

4. **Initialize database**
   ```bash
   npx drizzle-kit push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

---

## 📊 Database Schema

The ERP system includes 31 tables organized into logical modules:

### Master Data Tables
- `organizations` - Main organization/company
- `branches` - Multiple branches
- `warehouses` - Storage locations
- `users` - User accounts & roles
- `customers` - Customer master
- `suppliers` - Supplier master
- `products` - Product master

### Inventory Management
- `cylinder_inventory` - Physical cylinders tracking
- `stock_balance` - Current stock levels
- `stock_movements` - Stock transaction log

### Purchase Module
- `purchase_orders` - POs
- `purchase_order_items` - PO line items
- `goods_receipt_notes` - GRNs
- `grn_items` - GRN line items
- `purchase_returns` - Purchase returns

### Sales Module
- `sales_orders` - Sales orders
- `sales_order_items` - SO line items
- `delivery_notes` - Delivery notes
- `invoices` - Customer invoices
- `invoice_items` - Invoice line items
- `payment_receipts` - Payment records
- `sales_returns` - Sales returns

### Accounting
- `chart_of_accounts` - CoA
- `journal_vouchers` - Journal entries
- `journal_entries` - Detailed entries
- `ledger` - Ledger transactions

### Additional
- `transits` - Warehouse transfers
- `transit_items` - Transfer items
- `cylinder_exchanges` - Cylinder swaps
- `system_settings` - Configuration
- `report_schedules` - Scheduled reports

---

## 🔌 API Endpoints

### Organizations
```
GET    /api/organizations
POST   /api/organizations
```

### Customers
```
GET    /api/organizations/{orgId}/customers
POST   /api/organizations/{orgId}/customers
```

### Suppliers
```
GET    /api/organizations/{orgId}/suppliers
POST   /api/organizations/{orgId}/suppliers
```

### Products
```
GET    /api/organizations/{orgId}/products
POST   /api/organizations/{orgId}/products
```

### Purchase Management
```
GET    /api/organizations/{orgId}/purchase-orders
POST   /api/organizations/{orgId}/purchase-orders
GET    /api/organizations/{orgId}/grn
POST   /api/organizations/{orgId}/grn
```

### Sales Management
```
GET    /api/organizations/{orgId}/sales-orders
POST   /api/organizations/{orgId}/sales-orders
GET    /api/organizations/{orgId}/invoices
POST   /api/organizations/{orgId}/invoices
GET    /api/organizations/{orgId}/payment-receipts
POST   /api/organizations/{orgId}/payment-receipts
```

### Accounting
```
GET    /api/organizations/{orgId}/chart-of-accounts
POST   /api/organizations/{orgId}/chart-of-accounts
GET    /api/organizations/{orgId}/journal-vouchers
POST   /api/organizations/{orgId}/journal-vouchers
```

### Reports
```
GET    /api/organizations/{orgId}/reports/stock
GET    /api/organizations/{orgId}/reports/trial-balance
GET    /api/organizations/{orgId}/reports/sales
GET    /api/organizations/{orgId}/reports/purchase
```

---

## 🎨 Frontend Features

### Dashboard
- **Metrics Overview**: Sales, purchase, stock, pending orders
- **Module Navigation**: Quick access to all modules
- **Language Toggle**: Bangla/English support
- **Feature Highlights**: Key capabilities showcase

### Available Pages (To Be Implemented)
- `/erp/inventory` - Inventory management
- `/erp/purchase` - Purchase orders & GRN
- `/erp/sales` - Sales orders & invoices
- `/erp/accounting` - Accounting module
- `/erp/reports` - Reports dashboard
- `/erp/masters` - Master data management

---

## 💼 Business Logic Implementation

### Weighted Average COGS
The system calculates cost of goods sold using weighted average method:
```typescript
newAverageCost = (previousCost + newCost) / (previousQuantity + newQuantity)
```

### Document Status Workflows
Each document type has allowed status transitions:
- **Purchase Orders**: draft → confirmed → partial_received → completed
- **Invoices**: draft → posted → partial/paid/overdue
- **GRNs**: draft → pending → approved → posted

### Multi-Branch Isolation
- Branch IDs control data visibility
- Stock balances tracked by warehouse
- Reports filtered by branch/warehouse

### Bangladesh Compliance
- BIN number validation
- Trade license tracking
- VAT/Tax calculation (default 15%)
- Fiscal year support (July-June)

---

## 🔐 Role-Based Access Control

### User Roles
- **Admin** - Full system access
- **Manager** - Department management
- **Accountant** - Financial transactions
- **Sales Executive** - Sales operations
- **Purchase Executive** - Purchase operations
- **Warehouse Staff** - Inventory management
- **Viewer** - Read-only access

---

## 🌍 Multi-Language Support

The system supports Bangla and English with full translations for:
- Navigation menus
- Module names
- Reports
- Common operations
- Status messages

Switch language via the dashboard language toggle button.

---

## 📈 Reports Available

1. **Stock Report** - Current stock levels by warehouse
2. **Trial Balance** - Accounting trial balance
3. **Sales Report** - Sales invoices and revenue
4. **Purchase Report** - Purchase orders and expenses
5. **Profit & Loss** (In Development)
6. **Balance Sheet** (In Development)
7. **Cylinder Statement** (In Development)

---

## 🛠️ Development Guide

### Adding a New Module

1. Create database tables in `src/db/schema.ts`
2. Generate migrations: `npx drizzle-kit generate`
3. Create API routes in `src/app/api/organizations/[orgId]/{module}`
4. Implement business logic in utility functions
5. Create frontend components

### Adding a New Report

1. Create API endpoint: `src/app/api/organizations/[orgId]/reports/{report}`
2. Add report type to `reportScheduleTable`
3. Implement aggregation logic
4. Create frontend report viewer

### Adding New Languages

Edit `src/lib/translations.ts` and add translations for:
- UI labels
- Module names
- Status messages
- Report titles

---

## 📝 Sample API Usage

### Create a Purchase Order
```bash
curl -X POST http://localhost:3000/api/organizations/{orgId}/purchase-orders \
  -H "Content-Type: application/json" \
  -d '{
    "poNumber": "PO202501001",
    "supplierId": "supplier-uuid",
    "items": [
      {
        "productId": "product-uuid",
        "quantity": "100",
        "unitPrice": "500.00"
      }
    ]
  }'
```

### Create an Invoice
```bash
curl -X POST http://localhost:3000/api/organizations/{orgId}/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceNumber": "INV202501001",
    "customerId": "customer-uuid",
    "soId": "sales-order-uuid",
    "items": [
      {
        "productId": "product-uuid",
        "quantity": "50",
        "unitPrice": "1000.00"
      }
    ]
  }'
```

---

## 🚀 Deployment to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "ERP system implementation"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com
   - Import your GitHub repository
   - Configure environment variables
   - Deploy

3. **Set Environment Variables in Vercel**
   - DATABASE_URL
   - ANTHROPIC_API_KEY
   - FREESTYLE_API_KEY
   - Stack Auth credentials
   - Other required keys

4. **Run Migrations in Production**
   ```bash
   npx drizzle-kit push --config drizzle.config.ts
   ```

---

## 🐛 Troubleshooting

### Database Connection Issues
- Check DATABASE_URL format
- Verify Neon database is active
- Test connection: `psql <DATABASE_URL>`

### Build Errors
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `npm install`
- Check TypeScript errors: `npm run build`

### API Errors
- Check request body format (JSON)
- Verify required fields are present
- Check organization/entity IDs exist
- Review server logs for detailed errors

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [PostgreSQL Docs](https://www.postgresql.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

## 📞 Support & Contact

For issues, feature requests, or questions:
- GitHub Issues: https://github.com/farhanmahee/Adorable/issues
- Email: contact@adorable-erp.com
- Documentation: https://docs.adorable-erp.com

---

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 🎉 Thank You

Thank you for using Adorable ERP! We're committed to providing the best business automation solution for your organization.

**Version**: 1.0.0
**Last Updated**: November 2025
