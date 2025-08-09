import { NextRequest } from "next/server";
import { getAppIdFromHeaders } from "@/lib/utils";
import { ChatService } from "@/lib/internal/chat-service";

// "fix" mastra mcp bug
import { EventEmitter } from "events";
EventEmitter.defaultMaxListeners = 1000;

export async function POST(req: NextRequest) {
  console.log("Creating new chat stream");

  // Get app ID from headers
  const appId = getAppIdFromHeaders(req);
  if (!appId) {
    return new Response("Missing App Id header", { status: 400 });
  }

  // Validate request
  const validationError = ChatService.validateChatRequest(req);
  if (validationError) {
    return validationError;
  }

  // Process chat request with all the durability features
  return await ChatService.processChatRequest(req, appId);
}
