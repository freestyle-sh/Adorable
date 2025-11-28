<p align="center">
  <img src="icon.png" alt="Adorable ERP" width="75">
</p>

# Adorable - Enterprise Resource Planning System

A comprehensive, modern **ERP (Enterprise Resource Planning) system** designed for business automation across all departments. Built with Next.js, PostgreSQL, and React, Adorable provides seamless integration of inventory, purchase, sales, accounting, and reporting modules.

> **Built for Bangladesh businesses** | **Global Compliance Ready** | **Multi-Branch Support**

## �� Key Features

### Core Modules
- ✅ **Inventory Management** - Real-time stock tracking, cylinder lifecycle management, warehouse operations
- ✅ **Purchase Management** - Purchase orders, GRN, supplier management, purchase returns
- ✅ **Sales Management** - Sales orders, invoicing, delivery notes, payment tracking
- ✅ **Accounting** - Chart of accounts, journal vouchers, ledger, trial balance
- ✅ **Reporting Engine** - Stock, sales, purchase, and accounting reports with export options
- ✅ **Multi-Branch Operations** - Centralized management of multiple branches and warehouses
- ✅ **Multi-Language** - Full support for Bangla and English interface

### Advanced Capabilities
- Real-time inventory valuation using weighted-average COGS
- Cylinder exchange and transit management
- Role-based access control (7 user roles)
- Bangladesh tax and compliance support
- Payment status tracking and reconciliation
- Automated accounting voucher posting
- Comprehensive audit trails

## 🏗️ System Architecture

```
Adorable ERP
├── Frontend (Next.js 15 + React 19)
│   ├── Dashboard with real-time metrics
│   ├── Module-specific pages
│   ├── Reports viewer
│   └── Multi-language UI
├── Backend (Next.js API Routes)
│   ├── RESTful API endpoints
│   ├── Business logic layer
│   ├── Database queries
│   └── Authentication
├── Database (PostgreSQL via Neon)
│   ├── 31 relational tables
│   ├── Automated migrations
│   └── Transaction support
└── Infrastructure
    ├── Redis caching
    ├── Stack Auth
    └── Vercel deployment
```

## 📊 Database Schema

**31 Tables** organized in logical modules:

- **Master Data**: Organizations, Branches, Warehouses, Users, Customers, Suppliers, Products
- **Inventory**: Cylinder inventory, Stock balance, Stock movements
- **Purchase**: Purchase orders, GRN, Returns
- **Sales**: Sales orders, Invoices, Delivery notes, Payments
- **Accounting**: Chart of accounts, Journal vouchers, Ledger
- **Operations**: Transits, Cylinder exchanges, System settings

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL (Neon recommended)
- npm or yarn

### Installation

1. **Clone repository**
   ```bash
   git clone https://github.com/farhanmahee/Adorable.git
   cd Adorable
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Initialize database**
   ```bash
   npx drizzle-kit push
   ```

5. **Start development**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## 🔌 API Endpoints

### Organizations
- `GET /api/organizations`
- `POST /api/organizations`

### Master Data
- `GET /api/organizations/{orgId}/customers`
- `GET /api/organizations/{orgId}/suppliers`
- `GET /api/organizations/{orgId}/products`
- `GET /api/organizations/{orgId}/users`

### Purchase Module
- `GET /api/organizations/{orgId}/purchase-orders`
- `POST /api/organizations/{orgId}/purchase-orders`
- `GET /api/organizations/{orgId}/grn`
- `POST /api/organizations/{orgId}/grn`

### Sales Module
- `GET /api/organizations/{orgId}/sales-orders`
- `POST /api/organizations/{orgId}/sales-orders`
- `GET /api/organizations/{orgId}/invoices`
- `POST /api/organizations/{orgId}/invoices`

### Accounting
- `GET /api/organizations/{orgId}/chart-of-accounts`
- `POST /api/organizations/{orgId}/chart-of-accounts`
- `GET /api/organizations/{orgId}/journal-vouchers`

### Reports
- `GET /api/organizations/{orgId}/reports/stock`
- `GET /api/organizations/{orgId}/reports/trial-balance`
- `GET /api/organizations/{orgId}/reports/sales`
- `GET /api/organizations/{orgId}/reports/purchase`

## 📚 Documentation

- [**Setup Guide**](./ERP_SETUP_GUIDE.md) - Detailed installation & configuration
- [**Database Schema**](./docs/schema.md) - Table descriptions and relationships
- [**Deployment Guide**](./docs/deployment.md) - Vercel & production setup

## 🌍 Multi-Language Support

The system includes full translations for:
- Bangla (Bengali) - বাংলা
- English

Language preference is stored in system settings and can be toggled from the dashboard.

## 🔐 User Roles & Permissions

| Role | Permissions |
|------|-------------|
| Admin | Full system access |
| Manager | Department operations |
| Accountant | Financial transactions |
| Sales Executive | Sales operations |
| Purchase Executive | Purchase operations |
| Warehouse Staff | Inventory management |
| Viewer | Read-only access |

## 🏢 Bangladesh Compliance

Adorable is built with local regulations in mind:
- ✅ BIN number validation
- ✅ Trade license tracking
- ✅ VAT/Tax calculation (configurable)
- ✅ Fiscal year support (July-June)
- ✅ Compliant audit trails
- ✅ Multi-currency support (BDT focus)

## 📈 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL 15+ |
| ORM | Drizzle ORM |
| Authentication | Stack Auth |
| Caching | Redis |
| Deployment | Vercel |
| Language | TypeScript |

## 📦 Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── organizations/        # API routes
│   ├── page.tsx                  # Main dashboard
│   └── layout.tsx                # Root layout
├── components/
│   ├── ui/                       # UI components
│   └── ...                       # Feature components
├── db/
│   └── schema.ts                 # Database schema
├── lib/
│   ├── erp-utils.ts             # ERP utilities
│   ├── translations.ts           # Multi-language
│   └── ...
├── actions/                      # Server actions
└── mastra/                       # AI agents (optional)
```

## 🚀 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy (automatic on push)

```bash
# Build production
npm run build

# Start production
npm start
```

## 🛠️ Development

### Generate Database Migrations
```bash
npx drizzle-kit generate
```

### Apply Migrations
```bash
npx drizzle-kit push
```

### Run Linter
```bash
npm run lint
```

### Build for Production
```bash
npm run build
```

## 📋 Requirements Checklist

- ✅ Inventory Management (cylinder system, empty/refill/package, general items, services)
- ✅ Purchase Management (transits, exchanges, returns, work orders, GRN, vouchers)
- ✅ Sales Management (orders, cylinder handling, returns, in-transit, receipts)
- ✅ Accounting (CoA, vouchers, ledger, trial balance, statements, COGS, VAT/TAX)
- ✅ Reporting engine (stock, sales, purchase, accounting reports)
- ✅ Multi-branch dashboards + full business dashboard
- ✅ Role & Permission based ACL
- ✅ Multi-language (Bangla + English)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] AI-powered forecasting
- [ ] Integration with payment gateways
- [ ] Integration with courier services
- [ ] Mobile attendance system
- [ ] WhatsApp/SMS notifications
- [ ] Advanced manufacturing module
- [ ] HR & Payroll module
- [ ] CRM module

## 📞 Support

For support, email support@adorable-erp.com or open an issue on GitHub.

## 🙏 Acknowledgments

Built with ❤️ for business automation in Bangladesh and beyond.

---

**Version**: 1.0.0 | **Status**: Production Ready | **Last Updated**: November 2025
