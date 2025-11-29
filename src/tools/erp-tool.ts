
import { tool } from "@ai-sdk/react";
import { z } from "zod";

export const erpTool = tool({
  description: "Get data from the ERP system",
  parameters: z.object({
    query: z.string().describe("The query to execute against the ERP system"),
  }),
  execute: async ({ query }) => {
    // In a real implementation, this would query the ERP system.
    // For now, we'll return some mock data based on the query.
    if (query.toLowerCase().includes("sales")) {
      return {
        sales: [
          { id: 1, customer: "Customer A", amount: 1000 },
          { id: 2, customer: "Customer B", amount: 2000 },
        ],
      };
    } else if (query.toLowerCase().includes("inventory")) {
      return {
        inventory: [
          { id: 1, item: "Item A", quantity: 100 },
          { id: 2, item: "Item B", quantity: 200 },
        ],
      };
    } else {
      return {
        error: "Unknown query. Try 'sales' or 'inventory'.",
      };
    }
  },
});
