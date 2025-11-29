
import { anthropic } from "@ai-sdk/anthropic";
import { Agent } from "@mastra/core/agent";
import { memory } from "./builder"; // Reusing the same memory for now
import { erpTool } from "@/tools/erp-tool";

export const ERP_SYSTEM_MESSAGE = `You are an expert in Enterprise Resource Planning (ERP).
You have access to a set of tools to get information from the ERP system.
When a user asks a question, use the available tools to answer it.
If the information is not available through the tools, you should state that you cannot answer the question.
Do not try to answer questions that are not related to ERP.`;

export const erpAgent = new Agent({
  name: "ERPAgent",
  model: anthropic("claude-3-7-sonnet-20250219"),
  instructions: ERP_SYSTEM_MESSAGE,
  memory,
  tools: {
    get_erp_data: erpTool,
  },
});
