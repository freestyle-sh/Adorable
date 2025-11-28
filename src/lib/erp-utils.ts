// ERP System Utilities

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export async function fetchAPI<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "API request failed",
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("bn-BD", {
    style: "currency",
    currency: "BDT",
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("bn-BD");
}

export function calculateWeightedAverageCost(
  previousQuantity: number,
  previousCost: number,
  newQuantity: number,
  newCost: number
): number {
  const totalQuantity = previousQuantity + newQuantity;
  if (totalQuantity === 0) return 0;
  return (previousCost + newCost) / totalQuantity;
}

export function generateDocumentNumber(prefix: string, sequence: number): string {
  return `${prefix}${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(sequence).padStart(6, "0")}`;
}

export function validateDocumentStatus(
  currentStatus: string,
  targetStatus: string,
  validTransitions: Record<string, string[]>
): boolean {
  return validTransitions[currentStatus]?.includes(targetStatus) || false;
}

// Document workflow status transitions
export const documentStatusTransitions = {
  purchase_order: {
    draft: ["confirmed", "cancelled"],
    confirmed: ["partial_received", "completed", "cancelled"],
    partial_received: ["partial_received", "completed"],
    completed: [],
    cancelled: [],
  },
  grn: {
    draft: ["pending", "rejected"],
    pending: ["approved", "rejected"],
    approved: ["posted"],
    rejected: [],
    posted: [],
  },
  invoice: {
    draft: ["posted"],
    posted: ["partial", "paid", "overdue"],
    partial: ["paid", "overdue"],
    paid: [],
    overdue: ["paid"],
  },
};

export function canTransitionStatus(
  documentType: string,
  fromStatus: string,
  toStatus: string
): boolean {
  const transitions =
    documentStatusTransitions[
      documentType as keyof typeof documentStatusTransitions
    ];
  if (!transitions) return false;
  return transitions[fromStatus as keyof typeof transitions]?.includes(
    toStatus
  ) || false;
}

// VAT/Tax Calculation for Bangladesh
export function calculateBDTax(amount: number, taxRate: number = 15): number {
  return (amount * taxRate) / 100;
}

export function calculateTotalWithTax(
  amount: number,
  taxRate: number = 15
): number {
  return amount + calculateBDTax(amount, taxRate);
}

// Compliance helpers for Bangladesh
export const bangladeshCompliance = {
  validateBIN: (bin: string): boolean => {
    return /^\d{12}$/.test(bin);
  },
  validateTradeLicense: (license: string): boolean => {
    return license.length > 0;
  },
  requiredDocuments: [
    "BIN",
    "Trade License",
    "Registration Certificate",
    "Bank Details",
  ],
  fiscalYearStart: 1, // July
  fiscalYearEnd: 12, // June
};
