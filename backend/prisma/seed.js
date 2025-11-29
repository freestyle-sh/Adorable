/**
 * backend/prisma/seed_test.js
 * Deterministic test seed for CI and local test runs.
 *
 * Run: node prisma/seed_test.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function upsert(modelName, where, create) {
  // generic upsert wrapper using dynamic client access
  const client = prisma;
  // eslint-disable-next-line no-undef
  const model = client[modelName];
  if (!model) throw new Error(`Model ${modelName} not found on prisma client`);
  try {
    const existing = await model.findUnique({ where });
    if (existing) return existing;
  } catch (e) {
    // fallthrough for composite unique keys
  }
  return model.create({ data: create });
}

async function main() {
  console.log('Seeding test fixtures...');

  // Roles
  const superadmin = await upsert('role', { name: 'superadmin' }, { name: 'superadmin', permissions: ['*'] });

  // Super admin user (password must be hashed by app or tests will bypass auth)
  await upsert('user', { email: 'superadmin@example.com' }, {
    email: 'superadmin@example.com',
    name: 'Test SuperAdmin',
    passwordHash: 'test-placeholder-hash', // production: replace with bcrypt hash
    roleId: superadmin.id,
    isActive: true
  });

  // Branch + Warehouse
  const branch = await upsert('branch', { code: 'TEST-BR-001' }, { code: 'TEST-BR-001', name: 'Test Branch', address: 'CI Branch' });
  const warehouse = await upsert('warehouse', { code: 'TEST-WH-001' }, { code: 'TEST-WH-001', name: 'Main WH', branchId: branch.id });

  // Item types
  const emptyType = await upsert('itemType', { code: 'EMPTY' }, { code: 'EMPTY', name: 'Empty Cylinder' });
  const refillType = await upsert('itemType', { code: 'REFILL' }, { code: 'REFILL', name: 'Refill' });

  // Items
  const itemEmpty = await upsert('item', { sku: 'TEST-EMPTY-01' }, {
    sku: 'TEST-EMPTY-01',
    name: 'Test Empty Cylinder 12kg',
    itemTypeId: emptyType.id,
    unitPrice: 0,
    unitCost: 0,
    barcode: 'T0001',
    active: true
  });

  const itemRefill = await upsert('item', { sku: 'TEST-REFILL-01' }, {
    sku: 'TEST-REFILL-01',
    name: 'Test Refill 12kg',
    itemTypeId: refillType.id,
    unitPrice: 1000,
    unitCost: 800,
    barcode: 'T0002',
    active: true
  });

  // Inventory
  await upsert('inventory', {
    warehouseId_itemId: { warehouseId: warehouse.id, itemId: itemEmpty.id }
  }, {
    warehouseId: warehouse.id,
    itemId: itemEmpty.id,
    quantity: 200,
    reserved: 0
  });

  await upsert('inventory', {
    warehouseId_itemId: { warehouseId: warehouse.id, itemId: itemRefill.id }
  }, {
    warehouseId: warehouse.id,
    itemId: itemRefill.id,
    quantity: 500,
    reserved: 0
  });

  // Customer & Supplier
  await upsert('customer', { code: 'CUST-001' }, { code: 'CUST-001', name: 'Test Customer', contact: '0123456789', address: 'Customer Address' });

  await upsert('supplier', { code: 'SUP-001' }, { code: 'SUP-001', name: 'Test Supplier', contact: '0123456789', address: 'Supplier Address' });

  // Basic COA entries for tests
  const coa1 = await upsert('coa', { code: '1001' }, { code: '1001', name: 'Cash', type: 'ASSET' });
  const coa2 = await upsert('coa', { code: '2001' }, { code: '2001', name: 'Sales', type: 'INCOME' });

  console.log('Test fixtures seeded successfully.');
}

main()
  .catch((e) => {
    console.error('Seed failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
