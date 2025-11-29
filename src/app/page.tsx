"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@stackframe/stack";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/erp-utils";

interface DashboardMetrics {
  totalSales: number;
  totalPurchase: number;
  totalStock: number;
  pendingOrders: number;
}

export default function Home() {
  const router = useRouter();
  const user = useUser();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalSales: 0,
    totalPurchase: 0,
    totalStock: 0,
    pendingOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<"en" | "bn">("en");

  // Redirect if not authenticated
  useEffect(() => {
    if (user === null) {
      router.push("/login");
    }
  }, [user, router]);

  useEffect(() => {
    // In a real application, fetch metrics from API
    // For now, using demo data
    setMetrics({
      totalSales: 450000,
      totalPurchase: 280000,
      totalStock: 150000,
      pendingOrders: 12,
    });
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  const moduleList = [
    {
      title: language === "en" ? "Inventory" : "ইনভেন্টরি",
      icon: "📦",
      href: "/erp/inventory",
      description:
        language === "en"
          ? "Manage stock and cylinders"
          : "স্টক এবং সিলিন্ডার পরিচালনা করুন",
    },
    {
      title: language === "en" ? "Purchase" : "ক্রয়",
      icon: "🛒",
      href: "/erp/purchase",
      description:
        language === "en" ? "Purchase orders & GRN" : "ক্রয় অর্ডার এবং GRN",
    },
    {
      title: language === "en" ? "Sales" : "বিক্রয়",
      icon: "💰",
      href: "/erp/sales",
      description:
        language === "en"
          ? "Sales orders & invoices"
          : "বিক্রয় অর্ডার এবং চালান",
    },
    {
      title: language === "en" ? "Accounting" : "হিসাব",
      icon: "📊",
      href: "/erp/accounting",
      description:
        language === "en"
          ? "Ledger & journal vouchers"
          : "লেজার এবং জার্নাল ভাউচার",
    },
    {
      title: language === "en" ? "Reports" : "রিপোর্ট",
      icon: "📈",
      href: "/erp/reports",
      description:
        language === "en"
          ? "Financial & operational reports"
          : "আর্থিক এবং অপারেশনাল রিপোর্ট",
    },
    {
      title: language === "en" ? "Masters" : "মাস্টার ডেটা",
      icon: "⚙️",
      href: "/erp/masters",
      description:
        language === "en"
          ? "Customers, suppliers, products"
          : "গ্রাহক, সরবরাহকারী, পণ্য",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {language === "en" ? "ERP Dashboard" : "ERP ড্যাশবোর্ড"}
            </h1>
            <p className="text-gray-600 mt-1">
              {language === "en"
                ? "Business Automation Platform for Bangladesh"
                : "বাংলাদেশের জন্য ব্যবসায়িক স্বয়ংক্রিয়তা প্ল্যাটফর্ম"}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setLanguage(language === "en" ? "bn" : "en")}
          >
            {language === "en" ? "Bangla" : "English"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="p-6 bg-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === "en" ? "Total Sales" : "মোট বিক্রয়"}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(metrics.totalSales)}
                </p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </Card>

          <Card className="p-6 bg-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === "en" ? "Total Purchase" : "মোট ক্রয়"}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(metrics.totalPurchase)}
                </p>
              </div>
              <div className="text-3xl">🛒</div>
            </div>
          </Card>

          <Card className="p-6 bg-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === "en" ? "Stock Value" : "স্টক মূল্য"}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(metrics.totalStock)}
                </p>
              </div>
              <div className="text-3xl">📦</div>
            </div>
          </Card>

          <Card className="p-6 bg-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === "en" ? "Pending Orders" : "অপেক্ষমাণ অর্ডার"}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {metrics.pendingOrders}
                </p>
              </div>
              <div className="text-3xl">⏳</div>
            </div>
          </Card>
        </div>

        {/* Modules Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {language === "en" ? "Modules" : "মডিউল"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {moduleList.map((module) => (
              <Card
                key={module.href}
                className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(module.href)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{module.icon}</div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {module.title}
                </h3>
                <p className="text-sm text-gray-600 mt-2">{module.description}</p>
                <Button
                  variant="ghost"
                  className="mt-4 w-full justify-start"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(module.href);
                  }}
                >
                  {language === "en" ? "Access →" : "অ্যাক্সেস করুন →"}
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Feature Highlights */}
        <Card className="p-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <h3 className="text-2xl font-bold mb-4">
            {language === "en"
              ? "Key Features"
              : "মূল বৈশিষ্ট্য"}
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <li className="flex items-center">
              <span className="mr-3">✓</span>
              <span>
                {language === "en"
                  ? "Multi-branch management"
                  : "বহু-শাখা পরিচালনা"}
              </span>
            </li>
            <li className="flex items-center">
              <span className="mr-3">✓</span>
              <span>
                {language === "en"
                  ? "Cylinder lifecycle tracking"
                  : "সিলিন্ডার জীবনচক্র ট্র্যাকিং"}
              </span>
            </li>
            <li className="flex items-center">
              <span className="mr-3">✓</span>
              <span>
                {language === "en"
                  ? "Real-time accounting"
                  : "রিয়েল-টাইম হিসাব"}
              </span>
            </li>
            <li className="flex items-center">
              <span className="mr-3">✓</span>
              <span>
                {language === "en"
                  ? "Bangladesh compliance"
                  : "বাংলাদেশ সম্মতি"}
              </span>
            </li>
            <li className="flex items-center">
              <span className="mr-3">✓</span>
              <span>
                {language === "en"
                  ? "Comprehensive reporting"
                  : "বিস্তৃত রিপোর্টিং"}
              </span>
            </li>
            <li className="flex items-center">
              <span className="mr-3">✓</span>
              <span>
                {language === "en"
                  ? "Role-based access control"
                  : "ভূমিকা-ভিত্তিক অ্যাক্সেস নিয়ন্ত্রণ"}
              </span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
