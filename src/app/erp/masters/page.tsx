'use client';

import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Settings } from 'lucide-react';

interface MasterItem {
  id: string;
  type: 'customer' | 'supplier' | 'product' | 'user';
  name: string;
  code: string;
  status: 'active' | 'inactive';
  lastModified: string;
}

export default function MastersPage() {
  const [selectedType, setSelectedType] = useState<'customer' | 'supplier' | 'product' | 'user'>('customer');
  const [searchTerm, setSearchTerm] = useState('');

  const [items, setItems] = useState<MasterItem[]>([
    {
      id: '1',
      type: 'customer',
      name: 'ABC Industries',
      code: 'CUST-001',
      status: 'active',
      lastModified: '2025-11-19',
    },
    {
      id: '2',
      type: 'customer',
      name: 'XYZ Corporation',
      code: 'CUST-002',
      status: 'active',
      lastModified: '2025-11-18',
    },
    {
      id: '3',
      type: 'supplier',
      name: 'Gas Suppliers Ltd',
      code: 'SUPP-001',
      status: 'active',
      lastModified: '2025-11-19',
    },
    {
      id: '4',
      type: 'product',
      name: 'Cooking Gas - 12kg',
      code: 'PROD-001',
      status: 'active',
      lastModified: '2025-11-19',
    },
  ]);

  const filterItems = items.filter((item) => item.type === selectedType);
  const typeLabels = {
    customer: 'Customers',
    supplier: 'Suppliers',
    product: 'Products',
    user: 'Users',
  };

  const typeColors = {
    customer: 'text-blue-600 bg-blue-50 border-blue-200',
    supplier: 'text-green-600 bg-green-50 border-green-200',
    product: 'text-purple-600 bg-purple-50 border-purple-200',
    user: 'text-orange-600 bg-orange-50 border-orange-200',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">⚙️ Master Data Management</h1>
          <p className="text-gray-600 mt-1">Manage core master data like customers, suppliers, and products</p>
        </div>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
          <Plus className="w-5 h-5" />
          <span>Add New</span>
        </button>
      </div>

      {/* Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.entries(typeLabels) as [keyof typeof typeLabels, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSelectedType(key as 'customer' | 'supplier' | 'product' | 'user')}
            className={`p-4 rounded-lg border-2 transition font-semibold text-center ${
              selectedType === key
                ? `${typeColors[key]} border-current`
                : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            {label}
            <p className="text-sm font-normal mt-1">
              {filterItems.filter((i) => i.type === key).length}
            </p>
          </button>
        ))}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm font-medium">Total {typeLabels[selectedType]}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{filterItems.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-gray-600 text-sm font-medium">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {filterItems.filter((i) => i.status === 'active').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <p className="text-gray-600 text-sm font-medium">Inactive</p>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {filterItems.filter((i) => i.status === 'inactive').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <p className="text-gray-600 text-sm font-medium">Last Updated</p>
          <p className="text-lg font-bold text-gray-900 mt-2">
            {filterItems[0]?.lastModified || 'N/A'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow flex space-x-2">
        <div className="flex-1 flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={`Search by name or code...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none flex-1 text-gray-800"
          />
        </div>
        <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition flex items-center space-x-2">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Filter</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Code</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Type</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Last Modified</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filterItems.map((item) => (
              <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                <td className="px-6 py-3 text-sm font-mono font-semibold text-blue-600">{item.code}</td>
                <td className="px-6 py-3 text-sm text-gray-900">{item.name}</td>
                <td className="px-6 py-3 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize`}>
                    {item.type}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">{item.lastModified}</td>
                <td className="px-6 py-3 text-sm flex space-x-2">
                  <button className="p-1 hover:bg-blue-100 rounded transition" title="Edit">
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </button>
                  <button className="p-1 hover:bg-red-100 rounded transition" title="Delete">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filterItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No {typeLabels[selectedType].toLowerCase()} found</p>
            <p className="text-gray-400 text-sm">Click "Add New" to create one</p>
          </div>
        )}
      </div>
    </div>
  );
}
