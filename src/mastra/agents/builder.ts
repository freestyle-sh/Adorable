import { SYSTEM_MESSAGE } from "@/lib/system";
import { anthropic } from "@ai-sdk/anthropic";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
// import { TokenLimiter, ToolCallFilter } from "@mastra/memory/processors";
import { PostgresStore, PgVector } from "@mastra/pg";
import Openint from "@openint/sdk";

export const memory = new Memory({
  options: {
    lastMessages: 10,
    semanticRecall: false,
    threads: {
      generateTitle: true,
    },
    // workingMemory: {
    //   enabled: true,
    //   use: "tool-call",
    // },
  },
  vector: new PgVector({
    connectionString: process.env.DATABASE_URL!,
  }),
  storage: new PostgresStore({
    connectionString: process.env.DATABASE_URL!,
  }),
  processors: [
    // new ToolCallFilter({
    //   exclude: ["read_file", "read_multiple_files"],
    // }),
    // new TokenLimiter(100_000),
  ],
});

async function getIntegrationsMessage(anonId?: string) {
    // QQ: should we use_environment_variables: true for generation? 
  const openint = new Openint({token: process.env.OPENINT_API_KEY!, 
    // baseURL: 'http://localhost:4000/api/v1'
    });
  try {
    return anonId ? ((await openint.getMessageTemplate({customer_id: anonId})).template) : "";
  } catch (error) {
    console.error('Openint integrations error', error);
    return "";
  }
}

export const getBuilderAgent = async (anonId?: string) => {
  const integrationsMessage = await getIntegrationsMessage(anonId);
  return new Agent({
    name: "BuilderAgent",
    model: anthropic("claude-3-7-sonnet-20250219"),
    instructions: SYSTEM_MESSAGE + (anonId ? `\n\n${integrationsMessage}` : ""),
    memory,
  })
};