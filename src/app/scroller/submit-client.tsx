"use client";

import { useMemo, useRef, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { CompressedImage } from "@/lib/image-compression";

export type CarouselItemData = { src: string; name: string };

export default function SubmitClient({
  groups,
}: {
  groups: CarouselItemData[][];
}) {
  const apisRef = useRef<CarouselApi[]>([]);
  const [creatingApp, setCreatingApp] = useState(false);
  const router = useRouter();

  const setApiAtIndex = (index: number, api: CarouselApi | undefined) => {
    if (!api) return;
    apisRef.current[index] = api;
  };



  // Helper function to convert image URL to CompressedImage format
  const urlToCompressedImage = async (url: string): Promise<CompressedImage> => {
    try {
      // Fetch the image as a blob
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Convert blob to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64Data = reader.result as string;
          resolve({
            data: base64Data,
            mimeType: blob.type || "image/png",
            originalSize: blob.size,
            compressedSize: blob.size, // Not actually compressed since we're converting existing images
          });
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Failed to convert image URL to base64:", error);
      throw error;
    }
  };

  const onCreateAppWithImages = async () => {
    const selections: { name: string; src: string }[] = [];
    for (let i = 0; i < groups.length; i++) {
      const api = apisRef.current[i];
      const group = groups[i] ?? [];
      if (!api || group.length === 0) continue;
      const selectedIndex = api.selectedScrollSnap() ?? 0;
      const clampedIndex = Math.max(0, Math.min(group.length - 1, selectedIndex));
      const selected = group[clampedIndex]!;
      selections.push({ name: selected.name, src: selected.src });
    }

    if (selections.length === 0) {
      alert("No images selected!");
      return;
    }

    try {
      setCreatingApp(true);
      
      // Convert selected images to CompressedImage format (base64)
      const compressedImages: CompressedImage[] = [];
      for (const selection of selections) {
        try {
          const compressedImage = await urlToCompressedImage(selection.src);
          compressedImages.push(compressedImage);
        } catch (error) {
          console.error(`Failed to process image ${selection.name}:`, error);
          // Continue with other images instead of failing completely
        }
      }

      if (compressedImages.length === 0) {
        alert("Failed to process any images. Please try again.");
        return;
      }

      // Create message parts with the compressed images (same format as main form)
      const messageParts = [
        {
          type: "text",
          text: `Create a web application using these ${compressedImages.length} selected images. Please analyze the images and build something creative based on their content.`,
        },
        ...compressedImages.map((image) => ({
          type: "file",
          mediaType: image.mimeType,
          url: image.data, // This is the base64 data
        })),
      ];

      // Store the message data via API and get a reference ID (same as main form)
      const response = await fetch("/api/initial-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parts: messageParts,
          templateId: "nextjs", // You can make this configurable
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to store message data");
      }

      const { messageId } = await response.json();

      // Navigate to create a new app with the message ID
      router.push(`/app/new?messageId=${messageId}`);
    } catch (error) {
      console.error("Error creating app:", error);
      alert("Failed to create app. Please try again.");
    } finally {
      setCreatingApp(false);
    }
  };

  return (
    <div className="relative">
      <div className="mx-auto flex w-full max-w-[100vw] flex-col">
        {groups.map((items, index) => (
          <section key={index} className="relative mx-auto w-full overflow-hidden">
            <Carousel
              className="w-full"
              gutter={false}
              opts={{ align: "start", loop: true }}
              setApi={(api) => setApiAtIndex(index, api)}
            >
              <CarouselContent>
                {items.map((item, i) => (
                  <CarouselItem key={i} className="basis-full">
                    <div className="relative">
                      <img src={item.src} alt={item.name} className="block h-auto w-full" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2 rounded-none bg-black/30 text-white shadow-none hover:bg-black/40" />
              <CarouselNext className="right-2 rounded-none bg-black/30 text-white shadow-none hover:bg-black/40" />
            </Carousel>
          </section>
        ))}
      </div>

      <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        <Button
          type="button"
          className="pointer-events-auto rounded-xl"
          onClick={onCreateAppWithImages}
          disabled={creatingApp}
        >
          {creatingApp ? "Creating App..." : "Create App from Images"}
        </Button>
      </div>
    </div>
  );
}


