

"use client";

import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import { ChatContainer } from "@/components/ui/chat-container";
import { Markdown } from "@/components/ui/markdown";
import { Button } from "@/components/ui/button";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
} from "@/components/ui/prompt-input";
import { compressImage, type CompressedImage } from "@/lib/image-compression";
import { Paperclip, ArrowUp, X } from "lucide-react";
import { useRouter } from "next/navigation";

type UIPart =
  | { type: "text"; text: string }
  | { type: "file"; mediaType: string; url: string };

type UIMessage = {
  id: string;
  role: "user" | "assistant";
  parts: UIPart[];
};

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getExtensionFromMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

async function uploadCompressedImage(image: CompressedImage): Promise<string> {
  const blob = await fetch(image.data).then((r) => r.blob());
  const filename = `upload.${getExtensionFromMime(image.mimeType)}`;
  const file = new File([blob], filename, { type: image.mimeType });
  const form = new FormData();
  form.append("image", file, filename);

  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    throw new Error("Upload failed");
  }
  const json = (await res.json()) as { url: string };
  return json.url;
}

export default function ScrollerChatPage() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [images, setImages] = useState<CompressedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const onSubmitCore = useCallback(async (text: string, imgs: CompressedImage[]) => {
    const parts: UIPart[] = [];
    if (text.trim()) {
      parts.push({ type: "text", text });
    }
    if (imgs.length > 0) {
      const uploadedUrls = await Promise.all(imgs.map((img) => uploadCompressedImage(img)));
      uploadedUrls.forEach((url, i) => {
        parts.push({ type: "file", mediaType: imgs[i]!.mimeType, url });
      });
    }
    if (parts.length === 0) return;
    setMessages((prev) => [...prev, { id: generateId(), role: "user", parts }]);
  }, []);

  const onSend = useCallback(async () => {
    await onSubmitCore(input, images);

    if (images.length > 0) {
      try {
        setLoading(true);
        const firstImage = images[0]!;
        const blob = await fetch(firstImage.data).then((r) => r.blob());
        const filename = `upload.${getExtensionFromMime(firstImage.mimeType)}`;
        const file = new File([blob], filename, { type: firstImage.mimeType });
        const form = new FormData();
        form.append("image", file, filename);

        const res = await fetch("/api/createsections", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        console.log(data);
      } catch (error) {
        console.error("Failed to create sections", error);
      } finally {
        setLoading(false);
        router.push("/scroller");
      }
    }

    setInput("");
    setImages([]);
  }, [input, images, onSubmitCore]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const newImages: CompressedImage[] = [];
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) {
        try {
          const compressed = await compressImage(file);
          newImages.push(compressed);
        } catch (e) {
          console.error("Failed to compress image", e);
        }
      }
    }
    setImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const content = useMemo(
    () => (
      <ChatContainer autoScroll className="min-h-[60vh]">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />)
        )}
      </ChatContainer>
    ),
    [messages]
  );

  return (
    <main className="relative min-h-screen w-full grid place-items-center overflow-x-hidden overflow-y-auto">
      <div className="relative w-full max-w-2xl px-4">
        <div className="h-[70vh] flex flex-col justify-center">
          {/* <div className="flex-1 p-4">{content}</div> */}
          {images.length > 0 && (
            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <Image
                      src={img.data}
                      alt={`Upload ${idx + 1}`}
                      width={72}
                      height={72}
                      className="w-18 h-18 object-cover rounded-lg border border-neutral-700"
                    />
                    <button
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="p-4">
            <PromptInput
              value={input}
              onValueChange={setInput}
              onSubmit={onSend}
              className="rounded-2xl p-3"
              leftSlot={
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-xl"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <Paperclip className="w-4 h-4 mr-2" /> Upload
                </Button>
              }
            >
              <PromptInputTextarea placeholder="Write a message..." />
              <PromptInputActions className="mt-2">
                <div className="flex-1" />
                <Button
                  type="button"
                  className="rounded-xl"
                  onClick={onSend}
                  disabled={loading || (input.trim() === "" && images.length === 0)}
                >
                  {loading ? "Working..." : "Send"} <ArrowUp className="w-4 h-4 ml-2" />
                </Button>
              </PromptInputActions>
            </PromptInput>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={loading}
            />
          </div>
        </div>
      </div>
      {loading && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-black/40">
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-neutral-900/80 px-4 py-3 text-white">
            <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span>Generating sections...</span>
          </div>
        </div>
      )}
    </main>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end py-1 mb-4" : "flex justify-start py-1 mb-4"}>
      <div
        className={
          isUser
            ? "bg-neutral-700 text-neutral-50 rounded-2xl px-4 py-2 max-w-[80%] ml-auto"
            : "bg-neutral-800 text-neutral-100 rounded-2xl px-4 py-2 max-w-[80%]"
        }
      >
        {message.parts.map((part, index) => {
          if (part.type === "text") {
            return (
              <div key={index} className="mb-2 last:mb-0">
                <Markdown className="prose prose-sm dark:prose-invert max-w-none">
                  {part.text}
                </Markdown>
              </div>
            );
          }
          if (part.type === "file" && part.mediaType.startsWith("image/")) {
            return (
              <div key={index} className="mt-2">
                <Image
                  src={part.url}
                  alt="Uploaded image"
                  width={200}
                  height={200}
                  className="max-w-full h-auto rounded-lg border border-neutral-700"
                  style={{ maxHeight: "200px" }}
                />
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

