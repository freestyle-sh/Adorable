import { createApp } from "@/actions/create-app";
import { redirect } from "next/navigation";
import { getUser } from "@/auth/stack-auth";
import { headers } from "next/headers";

// This page is never rendered. It is used to:
// - Force user login without losing the user's initial message and template selection.
// - Force a loading page to be rendered (loading.tsx) while the app is being created.
export default async function NewAppRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] }>;
  params: Promise<{ id: string }>;
}) {
  const user = await getUser().catch(() => undefined);
  const search = await searchParams;

  if (!user) {
    // reconstruct the search params
    const newParams = new URLSearchParams();
    Object.entries(search).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => newParams.append(key, v));
      } else {
        newParams.set(key, value);
      }
    });

    // After sign in, redirect back to this page with the initial search params
    redirect(
      `/handler/sign-in?after_auth_return_to=${encodeURIComponent(
        "/app/new?" + newParams.toString()
      )}`
    );
  }

  // Handle different message formats for backward compatibility
  let messageParts: any[] | undefined;
  let templateId: string | undefined;

  // New format: messageId reference
  if (search.messageId) {
    try {
      const messageIdStr = Array.isArray(search.messageId) 
        ? search.messageId[0] 
        : search.messageId;
      
      // Get the current host from headers to construct the correct URL
      const headersList = await headers();
      const host = headersList.get("host") || "localhost:3001";
      const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
      const baseUrl = `${protocol}://${host}`;
      
      // Fetch message data from API
      const response = await fetch(
        `${baseUrl}/api/initial-message?messageId=${messageIdStr}`
      );
      
      if (response.ok) {
        const messageData = await response.json();
        messageParts = messageData.parts;
        templateId = messageData.templateId;
        console.log(`🔍 Retrieved message data for app creation:`, {
          messageId: messageIdStr,
          templateId,
          partsCount: messageParts?.length,
          imageCount: messageParts?.filter((p: any) => p.type === 'file').length,
          parts: messageParts?.map((p: any) => ({ 
            type: p.type, 
            hasText: p.type === 'text' ? !!p.text : false,
            hasUrl: p.type === 'file' ? !!p.url : false,
            mediaType: p.mediaType 
          }))
        });
      } else {
        console.error("Failed to fetch message data:", response.statusText);
      }
    } catch (error) {
      console.error("Failed to fetch message data:", error);
    }
  }

  // Backward compatibility: handle old messageData format
  if (!messageParts && search.messageData) {
    try {
      const messageDataStr = Array.isArray(search.messageData) 
        ? search.messageData[0] 
        : search.messageData;
      const parsed = JSON.parse(decodeURIComponent(messageDataStr));
      messageParts = parsed.parts;
    } catch (error) {
      console.error("Failed to parse messageData:", error);
    }
  }

  // Backward compatibility: handle old message format
  if (!messageParts && search.message) {
    const message = Array.isArray(search.message) ? search.message[0] : search.message;
    if (message) {
      messageParts = [
        {
          type: "text",
          text: decodeURIComponent(message),
        },
      ];
    }
  }

  // Determine template ID (new format includes it in message data)
  const finalTemplateId = templateId || (search.template as string) || "nextjs";

  const { id } = await createApp({
    initialMessageParts: messageParts,
    templateId: finalTemplateId,
  });

  redirect(`/app/${id}`);
}
