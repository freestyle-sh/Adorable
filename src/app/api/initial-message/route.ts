import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/internal/redis";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// In-memory fallback for development (when Redis might not be available)
const inMemoryStore = new Map<string, string>();

// File system fallback for persistence across restarts
const TEMP_DIR = join(process.cwd(), 'tmp', 'messages');

async function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
}

async function saveToFile(messageId: string, data: string) {
  try {
    await ensureTempDir();
    const filePath = join(TEMP_DIR, `${messageId}.json`);
    await writeFile(filePath, data);
    
    // Clean up after 1 hour
    setTimeout(() => {
      unlink(filePath).catch(console.error);
    }, 3600000);
  } catch (error) {
    console.warn("Failed to save message to file:", error);
  }
}

async function readFromFile(messageId: string): Promise<string | null> {
  try {
    const filePath = join(TEMP_DIR, `${messageId}.json`);
    const data = await readFile(filePath, 'utf-8');
    // Clean up after reading
    unlink(filePath).catch(console.error);
    return data;
  } catch (error) {
    return null;
  }
}

// Store initial message data temporarily and return a reference ID
export async function POST(req: NextRequest) {
  try {
    const { parts, templateId } = await req.json();
    
    if (!parts || !Array.isArray(parts)) {
      return NextResponse.json({ error: "Invalid message parts" }, { status: 400 });
    }

    if (!templateId) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    // Generate a unique ID for this initial message
    const messageId = `initial_msg_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // Store the message data with a TTL of 1 hour
    const messageData = {
      parts,
      templateId,
      createdAt: Date.now(),
    };

    const messageDataStr = JSON.stringify(messageData);

    const redis = await getRedis();
    
    if (redis) {
      try {
        await redis.setEx(messageId, 3600, messageDataStr);
        console.log(`✅ Successfully stored message in Redis: ${messageId}`, {
          messageId,
          templateId,
          partsCount: parts.length,
          imageCount: parts.filter((p: any) => p.type === 'file').length
        });
      } catch (redisError) {
        console.warn("Redis operation failed, using in-memory fallback:", redisError);
        // Fallback to in-memory storage
        inMemoryStore.set(messageId, messageDataStr);
        console.log(`📝 Stored message in memory fallback: ${messageId}`, {
          messageId,
          templateId,
          partsCount: parts.length,
          imageCount: parts.filter((p: any) => p.type === 'file').length
        });
        // Clean up old entries (simple TTL simulation)
        setTimeout(() => {
          inMemoryStore.delete(messageId);
        }, 3600000); // 1 hour
      }
    } else {
      console.warn("Redis not available, using in-memory fallback");
      // Fallback to in-memory storage for development
      inMemoryStore.set(messageId, messageDataStr);
      console.log(`📝 Stored message in memory (no Redis): ${messageId}`, {
        messageId,
        templateId,
        partsCount: parts.length,
        imageCount: parts.filter((p: any) => p.type === 'file').length
      });
      // Clean up old entries (simple TTL simulation)
      setTimeout(() => {
        inMemoryStore.delete(messageId);
      }, 3600000); // 1 hour
    }

    return NextResponse.json({ messageId });
  } catch (error) {
    console.error("Error storing initial message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Retrieve initial message data by reference ID
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("messageId");

    if (!messageId) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
    }

    let messageDataStr: string | null = null;

    const redis = await getRedis();
    
    if (redis) {
      try {
        messageDataStr = await redis.get(messageId);
        if (messageDataStr) {
          // Delete from Redis after retrieval
          await redis.del(messageId);
        }
      } catch (redisError) {
        console.warn("Redis operation failed, checking in-memory fallback:", redisError);
        // Check in-memory fallback
        messageDataStr = inMemoryStore.get(messageId) || null;
        if (messageDataStr) {
          // Delete from in-memory store after retrieval
          inMemoryStore.delete(messageId);
        }
      }
    } else {
      console.warn("Redis not available, checking in-memory fallback");
      // Check in-memory fallback
      messageDataStr = inMemoryStore.get(messageId) || null;
      if (messageDataStr) {
        // Delete from in-memory store after retrieval
        inMemoryStore.delete(messageId);
      }
    }
    
    if (!messageDataStr) {
      console.log(`❌ Message not found: ${messageId}`);
      return NextResponse.json({ error: "Message not found or expired" }, { status: 404 });
    }

    const messageData = JSON.parse(messageDataStr);
    console.log(`✅ Successfully retrieved message: ${messageId}`, {
      messageId,
      templateId: messageData.templateId,
      partsCount: messageData.parts?.length,
      imageCount: messageData.parts?.filter((p: any) => p.type === 'file').length
    });

    return NextResponse.json(messageData);
  } catch (error) {
    console.error("Error retrieving initial message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
