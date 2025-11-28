'use client';

import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Package, AlertCircle } from 'lucide-react';

interface InventoryItem {
  id: string;
  cylinderId: string;
  productName: string;
  quantity: number;
  warehouse: string;
  status: 'active' | 'damaged' | 'returned';
  lastUpdate: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([
    {
      id: '1',
      cylinderId: 'CYL-001',
      productName: 'Cooking Gas - 12kg',
      quantity: 45,
      warehouse: 'Main Warehouse',
      status: 'active',
      lastUpdate: '2025-11-19',
    },
    {
      id: '2',
      cylinderId: 'CYL-002',
      productName: 'Industrial Gas - 50kg',
      quantity: 12,
      warehouse: 'Branch A',
      status: 'active',
      lastUpdate: '2025-11-19',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  const lowStockItems = items.filter((item) => item.quantity < 20).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📦 Inventory Management</h1>
          <p className="text-gray-600 mt-1">Track and manage cylinder inventory across warehouses</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm font-medium">Total Items</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{items.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-gray-600 text-sm font-medium">Total Quantity</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {items.reduce((sum, item) => sum + item.quantity, 0)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <p className="text-gray-600 text-sm font-medium">Low Stock Alerts</p>
          <p className="text-3xl font-bold text-yellow-600 mt-2">{lowStockItems}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <p className="text-gray-600 text-sm font-medium">Active Warehouses</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">2</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow flex space-x-2">
        <div className="flex-1 flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by product name or cylinder ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none flex-1 text-gray-800"
          />
        </div>
        <select className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="damaged">Damaged</option>
          <option value="returned">Returned</option>
        </select>
      </div>

      {/* Alerts */}
      {lowStockItems > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-900">{lowStockItems} items running low on stock</p>
            <p className="text-sm text-yellow-700">Consider placing purchase orders soon</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Cylinder ID</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Product Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Quantity</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Warehouse</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                <td className="px-6 py-3 text-sm font-mono text-gray-900">{item.cylinderId}</td>
                <td className="px-6 py-3 text-sm text-gray-900">{item.productName}</td>
                <td className="px-6 py-3 text-sm">
                  <span
                    className={`font-semibold ${
                      item.quantity < 20 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {item.quantity} units
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">{item.warehouse}</td>
                <td className="px-6 py-3 text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'damaged'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm flex space-x-2">
                  <button className="p-1 hover:bg-blue-100 rounded transition">
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </button>
                  <button className="p-1 hover:bg-red-100 rounded transition">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
