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

    const data = await response.json().catch(() => undefined);

    if (!response.ok) {
      return {
        success: false,
        error: (data as any)?.error || `API request failed with ${response.status}`,
      };
    }

    return {
      success: true,
      data: data as T,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Money helpers (integer minor units: poisha)
export function toMinorUnits(value: number | string): number {
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

export function fromMinorUnits(minor: number): number {
  if (!Number.isFinite(minor)) return 0;
  return minor / 100;
}

export function safeMul(a: number | string, b: number | string): number {
  return fromMinorUnits(toMinorUnits(a) * toMinorUnits(b) / 100);
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
