'use client';

import { useState } from 'react';
import { Plus, Search, BarChart3, PieChart } from 'lucide-react';

interface JournalEntry {
  id: string;
  voucherNumber: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  status: 'draft' | 'posted' | 'cancelled';
}

export default function AccountingPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([
    {
      id: '1',
      voucherNumber: 'JV-2025-001',
      date: '2025-11-19',
      description: 'Purchase of inventory',
      debit: 125000,
      credit: 0,
      status: 'posted',
    },
    {
      id: '2',
      voucherNumber: 'JV-2025-002',
      date: '2025-11-18',
      description: 'Sales revenue',
      debit: 0,
      credit: 95000,
      status: 'posted',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);
  const balance = totalDebit - totalCredit;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 Accounting & Finance</h1>
          <p className="text-gray-600 mt-1">Manage journal entries and general ledger</p>
        </div>
        <button className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium">
          <Plus className="w-5 h-5" />
          <span>New Journal Entry</span>
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm font-medium">Total Debits</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">৳{(totalDebit / 100000).toFixed(1)}L</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <p className="text-gray-600 text-sm font-medium">Total Credits</p>
          <p className="text-3xl font-bold text-red-600 mt-2">৳{(totalCredit / 100000).toFixed(1)}L</p>
        </div>
        <div className={`bg-white p-6 rounded-lg shadow border-l-4 ${balance >= 0 ? 'border-green-500' : 'border-red-500'}`}>
          <p className="text-gray-600 text-sm font-medium">Balance</p>
          <p className={`text-3xl font-bold mt-2 ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ৳{Math.abs(balance).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <p className="text-gray-600 text-sm font-medium">Posted Entries</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{entries.filter((e) => e.status === 'posted').length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow flex space-x-2">
        <div className="flex-1 flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by voucher number or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none flex-1 text-gray-800"
          />
        </div>
        <select className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="posted">Posted</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-lg shadow hover:shadow-lg transition flex items-start space-x-3 border border-purple-100">
          <BarChart3 className="w-8 h-8 text-purple-600 flex-shrink-0" />
          <div className="text-left">
            <p className="font-semibold text-gray-900">Trial Balance</p>
            <p className="text-sm text-gray-600">Generate report</p>
          </div>
        </button>
        <button className="bg-gradient-to-br from-orange-50 to-yellow-50 p-4 rounded-lg shadow hover:shadow-lg transition flex items-start space-x-3 border border-orange-100">
          <BarChart3 className="w-8 h-8 text-orange-600 flex-shrink-0" />
          <div className="text-left">
            <p className="font-semibold text-gray-900">P&L Statement</p>
            <p className="text-sm text-gray-600">Profit & Loss</p>
          </div>
        </button>
        <button className="bg-gradient-to-br from-cyan-50 to-teal-50 p-4 rounded-lg shadow hover:shadow-lg transition flex items-start space-x-3 border border-cyan-100">
          <PieChart className="w-8 h-8 text-teal-600 flex-shrink-0" />
          <div className="text-left">
            <p className="font-semibold text-gray-900">Chart of Accounts</p>
            <p className="text-sm text-gray-600">View all accounts</p>
          </div>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Voucher #</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Date</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Description</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Debit</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Credit</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                <td className="px-6 py-3 text-sm font-mono font-semibold text-purple-600">{entry.voucherNumber}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{entry.date}</td>
                <td className="px-6 py-3 text-sm text-gray-900">{entry.description}</td>
                <td className="px-6 py-3 text-sm font-semibold text-right text-blue-600">
                  {entry.debit > 0 ? `৳${entry.debit.toLocaleString()}` : '-'}
                </td>
                <td className="px-6 py-3 text-sm font-semibold text-right text-red-600">
                  {entry.credit > 0 ? `৳${entry.credit.toLocaleString()}` : '-'}
                </td>
                <td className="px-6 py-3 text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                      entry.status === 'posted'
                        ? 'bg-green-100 text-green-800'
                        : entry.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {entry.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm">
                  <button className="text-purple-600 hover:underline font-medium">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
