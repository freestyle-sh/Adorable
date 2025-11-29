'use client';

import { useState } from 'react';
import { Plus, Search, TrendingUp, FileText } from 'lucide-react';

interface SalesOrder {
  id: string;
  soNumber: string;
  customer: string;
  date: string;
  totalAmount: number;
  status: 'draft' | 'pending' | 'shipped' | 'delivered';
  items: number;
}

export default function SalesPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([
    {
      id: '1',
      soNumber: 'SO-2025-001',
      customer: 'ABC Industries',
      date: '2025-11-19',
      totalAmount: 95000,
      status: 'shipped',
      items: 4,
    },
    {
      id: '2',
      soNumber: 'SO-2025-002',
      customer: 'XYZ Corporation',
      date: '2025-11-18',
      totalAmount: 150000,
      status: 'delivered',
      items: 6,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    shipped: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
  };

  const totalValue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">💰 Sales Management</h1>
          <p className="text-gray-600 mt-1">Manage sales orders and customer deliveries</p>
        </div>
        <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium">
          <Plus className="w-5 h-5" />
          <span>New Sales Order</span>
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-gray-600 text-sm font-medium">Total Sales</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">৳{(totalValue / 100000).toFixed(1)}L</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm font-medium">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{orders.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <p className="text-gray-600 text-sm font-medium">Delivered</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{deliveredCount}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
          <p className="text-gray-600 text-sm font-medium">Pending/In Transit</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">{orders.length - deliveredCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow flex space-x-2">
        <div className="flex-1 flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by SO number or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none flex-1 text-gray-800"
          />
        </div>
        <select className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg shadow hover:shadow-lg transition flex items-start space-x-3 border border-green-100">
          <FileText className="w-8 h-8 text-green-600 flex-shrink-0" />
          <div className="text-left">
            <p className="font-semibold text-gray-900">Create Invoice</p>
            <p className="text-sm text-gray-600">From delivery note</p>
          </div>
        </button>
        <button className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg shadow hover:shadow-lg transition flex items-start space-x-3 border border-blue-100">
          <TrendingUp className="w-8 h-8 text-blue-600 flex-shrink-0" />
          <div className="text-left">
            <p className="font-semibold text-gray-900">Sales Analytics</p>
            <p className="text-sm text-gray-600">View dashboard</p>
          </div>
        </button>
        <button className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg shadow hover:shadow-lg transition flex items-start space-x-3 border border-purple-100">
          <FileText className="w-8 h-8 text-purple-600 flex-shrink-0" />
          <div className="text-left">
            <p className="font-semibold text-gray-900">Generate Reports</p>
            <p className="text-sm text-gray-600">Revenue & metrics</p>
          </div>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">SO Number</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Customer</th>
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
                <td className="px-6 py-3 text-sm font-mono font-semibold text-green-600">{order.soNumber}</td>
                <td className="px-6 py-3 text-sm text-gray-900">{order.customer}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{order.date}</td>
                <td className="px-6 py-3 text-sm font-semibold text-gray-900">৳{order.totalAmount.toLocaleString()}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{order.items} items</td>
                <td className="px-6 py-3 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm">
                  <button className="text-green-600 hover:underline font-medium">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
