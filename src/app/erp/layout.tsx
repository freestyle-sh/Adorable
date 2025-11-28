'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { useTranslation } from '@/lib/translations';

const modules = [
  { name: 'inventory', icon: '📦', href: '/erp/inventory' },
  { name: 'purchase', icon: '🛒', href: '/erp/purchase' },
  { name: 'sales', icon: '💰', href: '/erp/sales' },
  { name: 'accounting', icon: '📊', href: '/erp/accounting' },
  { name: 'reports', icon: '📈', href: '/erp/reports' },
  { name: 'masters', icon: '⚙️', href: '/erp/masters' },
];

export default function ERPLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const pathname = usePathname();
  const t = useTranslation(language);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gradient-to-b from-blue-900 to-blue-800 text-white transition-all duration-300 flex flex-col shadow-lg`}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          <div className={`${!sidebarOpen && 'hidden'}`}>
            <h1 className="text-2xl font-bold">Adorable</h1>
            <p className="text-xs text-blue-200">ERP System</p>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-blue-700 rounded-lg transition"
          >
            <ChevronDown className={`w-5 h-5 transform transition-transform ${!sidebarOpen ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-2">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                pathname.includes(module.name)
                  ? 'bg-blue-600 shadow-lg'
                  : 'hover:bg-blue-700'
              }`}
              title={module.name}
            >
              <span className="text-xl">{module.icon}</span>
              {sidebarOpen && <span className="capitalize">{module.name}</span>}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 space-y-2 border-t border-blue-700">
          <button
            onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
          >
            <span>{language === 'en' ? '🇧🇩 বাংলা' : '🇬🇧 English'}</span>
          </button>
          <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm">
          <h2 className="text-2xl font-bold text-gray-800">
            {pathname.split('/').pop()?.toUpperCase()}
          </h2>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-800">User Name</p>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
              <ChevronDown className={`w-4 h-4 transition ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <button className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 transition">
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </button>
                <button className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 transition border-t border-gray-200">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                <button className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-red-50 text-red-600 transition border-t border-gray-200 rounded-b-lg">
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
