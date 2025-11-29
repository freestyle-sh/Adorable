'use client';

import { useState } from 'react';
import { Plus, Search, Eye, Download, Truck } from 'lucide-react';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  date: string;
  totalAmount: number;
  status: 'draft' | 'pending' | 'approved' | 'completed';
  items: number;
}

export default function PurchasePage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([
    {
      id: '1',
      poNumber: 'PO-2025-001',
      supplier: 'Gas Suppliers Ltd',
      date: '2025-11-19',
      totalAmount: 125000,
      status: 'approved',
      items: 5,
    },
    {
      id: '2',
      poNumber: 'PO-2025-002',
      supplier: 'Industrial Gas Co',
      date: '2025-11-18',
      totalAmount: 85000,
      status: 'pending',
      items: 3,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  };

  const totalValue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'draft').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🛒 Purchase Management</h1>
          <p className="text-gray-600 mt-1">Create and track purchase orders</p>
        </div>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
          <Plus className="w-5 h-5" />
          <span>New PO</span>
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm font-medium">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{orders.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-gray-600 text-sm font-medium">Total Value</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">৳{(totalValue / 100000).toFixed(1)}L</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <p className="text-gray-600 text-sm font-medium">Pending/Draft</p>
          <p className="text-3xl font-bold text-yellow-600 mt-2">{pendingOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <p className="text-gray-600 text-sm font-medium">Avg Order Value</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ৳{Math.round(totalValue / orders.length / 1000)}K
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow flex space-x-2">
        <div className="flex-1 flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by PO number or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none flex-1 text-gray-800"
          />
        </div>
        <select className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition flex items-start space-x-3">
          <Truck className="w-8 h-8 text-blue-600 flex-shrink-0" />
          <div className="text-left">
            <p className="font-semibold text-gray-900">Create GRN</p>
            <p className="text-sm text-gray-600">Record goods receipt</p>
          </div>
        </button>
        <button className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition flex items-start space-x-3">
          <Download className="w-8 h-8 text-green-600 flex-shrink-0" />
          <div className="text-left">
            <p className="font-semibold text-gray-900">Export Report</p>
            <p className="text-sm text-gray-600">Download as Excel</p>
          </div>
        </button>
        <button className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition flex items-start space-x-3">
          <Eye className="w-8 h-8 text-purple-600 flex-shrink-0" />
          <div className="text-left">
            <p className="font-semibold text-gray-900">Analytics</p>
            <p className="text-sm text-gray-600">View trends & insights</p>
          </div>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">PO Number</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Supplier</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Date</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Total Amount</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Items</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                <td className="px-6 py-3 text-sm font-mono font-semibold text-blue-600">{order.poNumber}</td>
                <td className="px-6 py-3 text-sm text-gray-900">{order.supplier}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{order.date}</td>
                <td className="px-6 py-3 text-sm font-semibold text-gray-900">৳{order.totalAmount.toLocaleString()}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{order.items} items</td>
                <td className="px-6 py-3 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm">
                  <button className="text-blue-600 hover:underline font-medium">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
