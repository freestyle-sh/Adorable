# Adorable ERP - API Quick Reference

## Base URL
```
http://localhost:3000/api/organizations/{orgId}
```

## Authentication
```
Headers: Authorization: Bearer {token}
(Stack Auth implementation)
```

---

## Master Data APIs

### Customers

**List Customers**
```
GET /customers
Response: Array of customer objects
```

**Create Customer**
```
POST /customers
Body: {
  "name": "ABC Ltd",
  "phone": "01700000000",
  "email": "contact@abc.com",
  "address": "Dhaka",
  "city": "Dhaka",
  "country": "Bangladesh",
  "binNumber": "123456789012",
  "tradeLicense": "12345/2020",
  "creditLimit": "100000",
  "paymentTerms": "Net 30"
}
Response: Created customer object
```

### Suppliers

**List Suppliers**
```
GET /suppliers
Response: Array of supplier objects
```

**Create Supplier**
```
POST /suppliers
Body: {
  "name": "XYZ Supplier",
  "phone": "01600000000",
  "email": "supplier@xyz.com",
  "address": "Dhaka",
  "city": "Dhaka",
  "binNumber": "987654321098",
  "paymentTerms": "Net 15",
  "leadTime": 7
}
Response: Created supplier object
```

### Products

**List Products**
```
GET /products
Response: Array of product objects
```

**Create Product**
```
POST /products
Body: {
  "name": "LPG Cylinder",
  "code": "CYL001",
  "description": "12 KG LPG Cylinder",
  "type": "cylinder",
  "unit": "piece",
  "weight": "12.5",
  "standardCost": "400.00",
  "sellingPrice": "600.00"
}
Response: Created product object
```

### Users

**List Users**
```
GET /users
Response: Array of user objects (password excluded)
```

**Create User**
```
POST /users
Body: {
  "email": "user@company.com",
  "name": "John Doe",
  "phone": "01700000000",
  "role": "sales_executive",
  "branchIds": ["branch-id-1", "branch-id-2"],
  "passwordHash": "hashed_password"
}
Response: Created user object (password excluded)
```

---

## Inventory APIs

### Branches

**List Branches**
```
GET /branches
Response: Array of branch objects
```

**Create Branch**
```
POST /branches
Body: {
  "name": "Dhaka Branch",
  "code": "DHK",
  "address": "123 Main St, Dhaka",
  "phone": "02-1234567",
  "warehouseId": "wh-id-optional"
}
Response: Created branch object
```

### Warehouses

**List Warehouses** (by branch)
```
GET /branches/{branchId}/warehouses
Response: Array of warehouse objects
```

**Create Warehouse**
```
POST /branches/{branchId}/warehouses
Body: {
  "name": "Main Warehouse",
  "code": "WH001",
  "location": "Dhaka",
  "capacity": 1000
}
Response: Created warehouse object
```

### Cylinders

**List Cylinders** (by warehouse)
```
GET /branches/{branchId}/warehouses/{warehouseId}/cylinders
Response: Array of cylinder objects
```

**Add Cylinder**
```
POST /branches/{branchId}/warehouses/{warehouseId}/cylinders
Body: {
  "productId": "product-uuid",
  "cylinderId": "CYL-12345",
  "status": "empty"
}
Response: Created cylinder object
```

### Stock Report

**Get Stock Report**
```
GET /reports/stock?warehouseId={warehouseId}
Response: {
  "warehouseId": "...",
  "warehouse": {...},
  "products": [
    {
      "product": {...},
      "quantity": "100",
      "costValue": "40000",
      "averageCost": "400"
    }
  ],
  "totalQuantity": "100",
  "totalValue": "40000"
}
```

---

## Purchase APIs

### Purchase Orders

**List Purchase Orders**
```
GET /purchase-orders
Response: Array of PO objects
```

**Create Purchase Order**
```
POST /purchase-orders
Body: {
  "poNumber": "PO202501001",
  "supplierId": "supplier-uuid",
  "expectedDeliveryDate": "2025-01-20",
  "notes": "Urgent delivery required",
  "items": [
    {
      "productId": "product-uuid",
      "quantity": "100",
      "unitPrice": "400.00"
    },
    {
      "productId": "product-uuid-2",
      "quantity": "50",
      "unitPrice": "200.00"
    }
  ],
  "createdBy": "user-uuid"
}
Response: Created PO object with calculated total
```

### Goods Receipt Notes (GRN)

**List GRNs**
```
GET /grn
Response: Array of GRN objects
```

**Create GRN** (Updates Stock Balance)
```
POST /grn
Body: {
  "grnNumber": "GRN202501001",
  "poId": "po-uuid",
  "warehouseId": "warehouse-uuid",
  "items": [
    {
      "productId": "product-uuid",
      "quantity": "100",
      "unitPrice": "400.00"
    }
  ],
  "createdBy": "user-uuid"
}
Response: {
  "id": "grn-uuid",
  "grnNumber": "GRN202501001",
  "status": "draft",
  "totalAmount": "40000",
  ...
}
NOTE: Stock balance automatically updated with weighted average cost
```

### Purchase Report

**Get Purchase Report**
```
GET /reports/purchase?startDate=2025-01-01&endDate=2025-01-31
Response: {
  "reportDate": "2025-01-19T...",
  "period": {"startDate": "2025-01-01", "endDate": "2025-01-31"},
  "purchaseOrders": [...],
  "summary": {
    "totalPurchases": 40000,
    "totalCompleted": 40000,
    "totalPending": 0,
    "numberOfPOs": 1
  }
}
```

---

## Sales APIs

### Sales Orders

**List Sales Orders**
```
GET /sales-orders
Response: Array of SO objects
```

**Create Sales Order**
```
POST /sales-orders
Body: {
  "soNumber": "SO202501001",
  "customerId": "customer-uuid",
  "branchId": "branch-uuid",
  "deliveryDate": "2025-01-22",
  "notes": "Deliver to warehouse",
  "items": [
    {
      "productId": "product-uuid",
      "quantity": "50",
      "unitPrice": "600.00"
    }
  ],
  "createdBy": "user-uuid"
}
Response: Created SO object
```

### Invoices

**List Invoices**
```
GET /invoices
Response: Array of invoice objects
```

**Create Invoice** (Auto-calculates Tax)
```
POST /invoices
Body: {
  "invoiceNumber": "INV202501001",
  "customerId": "customer-uuid",
  "soId": "sales-order-uuid",
  "dueDate": "2025-02-20",
  "items": [
    {
      "productId": "product-uuid",
      "description": "LPG Cylinder - 12 KG",
      "quantity": "50",
      "unitPrice": "600.00"
    }
  ],
  "notes": "Tax invoice",
  "taxRate": 15
}
Response: {
  "id": "invoice-uuid",
  "invoiceNumber": "INV202501001",
  "subTotal": "30000",
  "taxAmount": "4500",
  "totalAmount": "34500",
  "paymentStatus": "unpaid",
  ...
}
```

### Payment Receipts

**List Payment Receipts**
```
GET /payment-receipts
Response: Array of receipt objects
```

**Record Payment** (Updates Invoice Status)
```
POST /payment-receipts
Body: {
  "receiptNumber": "RCPT202501001",
  "invoiceId": "invoice-uuid",
  "customerId": "customer-uuid",
  "amount": "34500",
  "paymentMethod": "bank_transfer",
  "referenceNumber": "TXN12345"
}
Response: Created receipt object
NOTE: Invoice payment status updated based on amount
- Full payment: status = "paid"
- Partial payment: status = "partial"
- No payment: status = "unpaid"/"overdue"
```

### Sales Report

**Get Sales Report**
```
GET /reports/sales?startDate=2025-01-01&endDate=2025-01-31
Response: {
  "reportDate": "2025-01-19T...",
  "period": {...},
  "invoices": [...],
  "summary": {
    "totalSales": 34500,
    "totalPaid": 34500,
    "totalUnpaid": 0,
    "numberOfInvoices": 1
  }
}
```

---

## Accounting APIs

### Chart of Accounts

**List Chart of Accounts**
```
GET /chart-of-accounts
Response: Array of account objects
```

**Create Account**
```
POST /chart-of-accounts
Body: {
  "accountCode": "1001",
  "accountName": "Cash at Hand",
  "accountType": "Asset",
  "accountGroup": "Current Asset",
  "subGroup": "Cash"
}
Response: Created account object
```

### Journal Vouchers

**List Journal Vouchers**
```
GET /journal-vouchers
Response: Array of voucher objects
```

**Create Journal Voucher** (Auto-Posts to Ledger)
```
POST /journal-vouchers
Body: {
  "voucherNumber": "JV202501001",
  "description": "Salary payment Jan 2025",
  "referenceDocumentId": "optional-ref",
  "entries": [
    {
      "accountId": "account-uuid",
      "debit": "100000.00",
      "credit": "0",
      "description": "Salary expense",
      "lineNo": 1
    },
    {
      "accountId": "account-uuid-2",
      "debit": "0",
      "credit": "100000.00",
      "description": "Cash",
      "lineNo": 2
    }
  ],
  "createdBy": "user-uuid"
}
Response: {
  "id": "voucher-uuid",
  "voucherNumber": "JV202501001",
  "status": "draft",
  "totalDebit": "100000",
  "totalCredit": "100000",
  ...
}
NOTE: Ledger entries automatically created and account balances updated
```

### Trial Balance Report

**Get Trial Balance**
```
GET /reports/trial-balance
Response: {
  "reportDate": "2025-01-19T...",
  "items": [
    {
      "code": "1001",
      "name": "Cash at Hand",
      "type": "Asset",
      "group": "Current Asset",
      "debit": "50000",
      "credit": "0"
    },
    ...
  ],
  "totalDebit": "150000",
  "totalCredit": "150000",
  "isBalanced": true
}
```

---

## Operations APIs

### Transits (Warehouse Transfers)

**List Transits**
```
GET /transits
Response: Array of transit objects
```

**Create Transit**
```
POST /transits
Body: {
  "transitNumber": "TRN202501001",
  "fromWarehouseId": "warehouse-uuid-1",
  "toWarehouseId": "warehouse-uuid-2",
  "expectedArrivalDate": "2025-01-25",
  "items": [
    {
      "productId": "product-uuid",
      "quantity": "50",
      "costPerUnit": "400.00"
    }
  ]
}
Response: Created transit object
```

### Cylinder Exchanges

**List Exchanges**
```
GET /cylinder-exchanges
Response: Array of exchange objects
```

**Record Exchange**
```
POST /cylinder-exchanges
Body: {
  "exchangeNumber": "EXC202501001",
  "customerId": "customer-uuid",
  "emptyReturnedCount": 5,
  "refillIssuedCount": 5
}
Response: Created exchange object
```

---

## System Settings

**Get Settings**
```
GET /settings
Response: {
  "language": "en",
  "dateFormat": "DD/MM/YYYY",
  "currency": "BDT",
  "taxRate": 15
}
```

**Update Settings**
```
POST /settings
Body: {
  "language": "bn",
  "dateFormat": "DD/MM/YYYY",
  "currency": "BDT",
  "taxRate": 15
}
Response: Updated settings object
```

---

## Error Responses

**Standard Error Format**
```
{
  "error": "Error message describing what went wrong",
  "status": 400
}
```

**Common HTTP Status Codes**
- 200 - OK
- 201 - Created
- 400 - Bad Request
- 404 - Not Found
- 500 - Internal Server Error

---

## Sample Usage Examples

### Complete Flow: Purchase to GRN

```bash
# 1. Create supplier
curl -X POST http://localhost:3000/api/organizations/org-1/suppliers \
  -H "Content-Type: application/json" \
  -d '{"name":"XYZ Corp","city":"Dhaka"}'

# 2. Create product
curl -X POST http://localhost:3000/api/organizations/org-1/products \
  -H "Content-Type: application/json" \
  -d '{"name":"LPG","code":"LPG001","type":"cylinder","sellingPrice":"600"}'

# 3. Create PO
curl -X POST http://localhost:3000/api/organizations/org-1/purchase-orders \
  -H "Content-Type: application/json" \
  -d '{
    "poNumber":"PO001",
    "supplierId":"supplier-id",
    "items":[{"productId":"product-id","quantity":"100","unitPrice":"400"}]
  }'

# 4. Create GRN (receives goods)
curl -X POST http://localhost:3000/api/organizations/org-1/grn \
  -H "Content-Type: application/json" \
  -d '{
    "grnNumber":"GRN001",
    "poId":"po-id",
    "warehouseId":"wh-id",
    "items":[{"productId":"product-id","quantity":"100","unitPrice":"400"}]
  }'

# 5. Check stock
curl http://localhost:3000/api/organizations/org-1/reports/stock?warehouseId=wh-id
```

---

## Currency & Date Formatting

**Currency**: BDT (Bengali Taka)
- Format: "৳ 1,00,000.00"
- Used in all financial calculations
- Stored as DECIMAL(15,2) in database

**Dates**: DD/MM/YYYY
- Example: 19/11/2025
- Locale: bn-BD (Bengali Bangladesh)
- Timezone: Assumed local/server time

---

## Authentication Levels

**Public Endpoints** (No auth required):
- (All endpoints currently public for development)

**Protected Endpoints** (Auth required):
- Will be implemented with Stack Auth
- Roles: admin, manager, accountant, sales_executive, purchase_executive, warehouse_staff, viewer

---

**API Version**: 1.0.0  
**Last Updated**: November 19, 2025
