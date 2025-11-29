'use client';

import { useState } from 'react';
import { Download, Filter, BarChart3, LineChart, PieChart, Calendar } from 'lucide-react';

interface Report {
  id: string;
  name: string;
  description: string;
  lastGenerated: string;
  icon: React.ReactNode;
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    start: '2025-11-01',
    end: '2025-11-30',
  });

  const reports: Report[] = [
    {
      id: 'trial-balance',
      name: 'Trial Balance',
      description: 'Summary of all accounts with debit and credit balances',
      lastGenerated: '2025-11-19',
      icon: <BarChart3 className="w-8 h-8" />,
    },
    {
      id: 'pl-statement',
      name: 'Profit & Loss Statement',
      description: 'Revenue, expenses, and net profit for the period',
      lastGenerated: '2025-11-19',
      icon: <LineChart className="w-8 h-8" />,
    },
    {
      id: 'balance-sheet',
      name: 'Balance Sheet',
      description: 'Assets, liabilities, and equity snapshot',
      lastGenerated: '2025-11-19',
      icon: <BarChart3 className="w-8 h-8" />,
    },
    {
      id: 'cash-flow',
      name: 'Cash Flow Statement',
      description: 'Operating, investing, and financing activities',
      lastGenerated: '2025-11-18',
      icon: <LineChart className="w-8 h-8" />,
    },
    {
      id: 'stock-valuation',
      name: 'Stock Valuation Report',
      description: 'Inventory stock levels and valuations',
      lastGenerated: '2025-11-19',
      icon: <PieChart className="w-8 h-8" />,
    },
    {
      id: 'sales-revenue',
      name: 'Sales Revenue Report',
      description: 'Sales by customer, product, and time period',
      lastGenerated: '2025-11-19',
      icon: <BarChart3 className="w-8 h-8" />,
    },
    {
      id: 'purchase-expense',
      name: 'Purchase Expense Report',
      description: 'Purchases by supplier and product category',
      lastGenerated: '2025-11-19',
      icon: <BarChart3 className="w-8 h-8" />,
    },
    {
      id: 'receivables-aging',
      name: 'Receivables Aging',
      description: 'Outstanding customer invoices by age',
      lastGenerated: '2025-11-18',
      icon: <LineChart className="w-8 h-8" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📈 Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Generate financial and operational reports</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-end space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-300">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="bg-transparent outline-none text-gray-800"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-300">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="bg-transparent outline-none text-gray-800"
              />
            </div>
          </div>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Apply Filter</span>
          </button>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div
            key={report.id}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition border border-gray-200 cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl text-blue-500 group-hover:scale-110 transition">
                {report.icon}
              </div>
              <button className="opacity-0 group-hover:opacity-100 transition">
                <Download className="w-5 h-5 text-gray-400 hover:text-blue-600" />
              </button>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{report.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{report.description}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Last: {report.lastGenerated}</p>
              <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium">
                Generate
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sample Report Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Preview: Stock Valuation</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Product</th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">Qty</th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">Unit Cost</th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">Total Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-900">Cooking Gas - 12kg</td>
                <td className="px-4 py-2 text-right text-gray-600">45</td>
                <td className="px-4 py-2 text-right text-gray-600">৳2,800</td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">৳126,000</td>
              </tr>
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-900">Industrial Gas - 50kg</td>
                <td className="px-4 py-2 text-right text-gray-600">12</td>
                <td className="px-4 py-2 text-right text-gray-600">৳7,500</td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">৳90,000</td>
              </tr>
              <tr className="bg-blue-50 border-t-2 border-gray-300">
                <td colSpan={3} className="px-4 py-2 text-right font-semibold text-gray-900">
                  Total Stock Value:
                </td>
                <td className="px-4 py-2 text-right font-bold text-blue-600 text-lg">৳216,000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
