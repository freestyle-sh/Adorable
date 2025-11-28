// Multi-language support for Bangla and English

export const translations = {
  en: {
    // Navigation
    dashboard: "Dashboard",
    inventory: "Inventory",
    purchase: "Purchase",
    sales: "Sales",
    accounting: "Accounting",
    reports: "Reports",
    settings: "Settings",

    // Master Data
    products: "Products",
    customers: "Customers",
    suppliers: "Suppliers",
    branches: "Branches",
    warehouses: "Warehouses",
    users: "Users",

    // Purchase Module
    purchaseOrders: "Purchase Orders",
    goodsReceipt: "Goods Receipt Notes",
    purchaseReturn: "Purchase Returns",

    // Sales Module
    salesOrders: "Sales Orders",
    invoices: "Invoices",
    deliveryNotes: "Delivery Notes",
    paymentReceipts: "Payment Receipts",
    salesReturn: "Sales Returns",

    // Accounting
    chartOfAccounts: "Chart of Accounts",
    journalVouchers: "Journal Vouchers",
    ledger: "Ledger",

    // Reports
    trialBalance: "Trial Balance",
    profitAndLoss: "Profit & Loss",
    balanceSheet: "Balance Sheet",
    stockReport: "Stock Report",
    salesReport: "Sales Report",
    purchaseReport: "Purchase Report",

    // Cylinder Management
    cylinders: "Cylinders",
    cylinderExchange: "Cylinder Exchange",
    cylinderInventory: "Cylinder Inventory",

    // Common
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    submit: "Submit",
    approve: "Approve",
    reject: "Reject",
    back: "Back",
    search: "Search",
    filter: "Filter",
    export: "Export",
    import: "Import",
    print: "Print",
    details: "Details",
    status: "Status",
    date: "Date",
    total: "Total",
    amount: "Amount",
    quantity: "Quantity",
    price: "Price",
    action: "Action",
    notes: "Notes",

    // Statuses
    draft: "Draft",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    completed: "Completed",
    cancelled: "Cancelled",
    inTransit: "In Transit",

    // Messages
    success: "Success",
    error: "Error",
    loading: "Loading...",
    noData: "No data available",
    confirm: "Are you sure?",
  },
  bn: {
    // Navigation
    dashboard: "ড্যাশবোর্ড",
    inventory: "ইনভেন্টরি",
    purchase: "ক্রয়",
    sales: "বিক্রয়",
    accounting: "হিসাব",
    reports: "রিপোর্ট",
    settings: "সেটিংস",

    // Master Data
    products: "পণ্য",
    customers: "গ্রাহক",
    suppliers: "সরবরাহকারী",
    branches: "শাখা",
    warehouses: "গুদাম",
    users: "ব্যবহারকারী",

    // Purchase Module
    purchaseOrders: "ক্রয় আদেশ",
    goodsReceipt: "পণ্য প্রাপ্তি নোট",
    purchaseReturn: "ক্রয় ফেরত",

    // Sales Module
    salesOrders: "বিক্রয় আদেশ",
    invoices: "চালান",
    deliveryNotes: "ডেলিভারি নোট",
    paymentReceipts: "পেমেন্ট রসিদ",
    salesReturn: "বিক্রয় ফেরত",

    // Accounting
    chartOfAccounts: "অ্যাকাউন্টের চার্ট",
    journalVouchers: "জার্নাল ভাউচার",
    ledger: "লেজার",

    // Reports
    trialBalance: "ট্রায়াল ব্যালেন্স",
    profitAndLoss: "মুনাফা ও ক্ষতি",
    balanceSheet: "ব্যালেন্স শীট",
    stockReport: "স্টক রিপোর্ট",
    salesReport: "বিক্রয় রিপোর্ট",
    purchaseReport: "ক্রয় রিপোর্ট",

    // Cylinder Management
    cylinders: "সিলিন্ডার",
    cylinderExchange: "সিলিন্ডার বিনিময়",
    cylinderInventory: "সিলিন্ডার ইনভেন্টরি",

    // Common
    add: "যোগ করুন",
    edit: "সম্পাদনা করুন",
    delete: "মুছুন",
    save: "সংরক্ষণ করুন",
    cancel: "বাতিল করুন",
    submit: "জমা দিন",
    approve: "অনুমোদন করুন",
    reject: "প্রত্যাখ্যান করুন",
    back: "ফিরে যান",
    search: "অনুসন্ধান করুন",
    filter: "ফিল্টার করুন",
    export: "রপ্তানি করুন",
    import: "আমদানি করুন",
    print: "প্রিন্ট করুন",
    details: "বিবরণ",
    status: "অবস্থা",
    date: "তারিখ",
    total: "মোট",
    amount: "পরিমাণ",
    quantity: "পরিমাণ",
    price: "মূল্য",
    action: "পদক্ষেপ",
    notes: "নোট",

    // Statuses
    draft: "খসড়া",
    pending: "অপেক্ষমাণ",
    approved: "অনুমোদিত",
    rejected: "প্রত্যাখ্যাত",
    completed: "সম্পন্ন",
    cancelled: "বাতিল",
    inTransit: "পথে",

    // Messages
    success: "সফল",
    error: "ত্রুটি",
    loading: "লোড হচ্ছে...",
    noData: "কোন তথ্য উপলব্ধ নেই",
    confirm: "আপনি কি নিশ্চিত?",
  },
};

export type Language = "en" | "bn";

export function getTranslation(language: Language, key: string): string {
  const langDict = translations[language];
  return langDict[key as keyof typeof langDict] || key;
}

export function useTranslation(language: Language) {
  return {
    t: (key: string) => getTranslation(language, key),
  };
}
