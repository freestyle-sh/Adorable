"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { PromptInput, PromptInputActions } from "@/components/ui/prompt-input";
import { PromptInputTextareaWithTypingAnimation } from "@/components/prompt-input";
import { Button } from "@/components/ui/button";
import { FrameworkSelector } from "@/components/framework-selector";
import { Paperclip, X } from "lucide-react";
import { compressImage, CompressedImage } from "@/lib/image-compression";

interface EnhancedPromptInputProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  framework: string;
  onFrameworkChange: (value: string) => void;
  isLoading: boolean;
  onSubmit: (prompt: string, images: CompressedImage[]) => void;
}

export function EnhancedPromptInput({
  prompt,
  onPromptChange,
  framework,
  onFrameworkChange,
  isLoading,
  onSubmit,
}: EnhancedPromptInputProps) {
  const [images, setImages] = useState<CompressedImage[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_IMAGES = 5; // Maximum number of images allowed

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files) return;

    // Check if adding these files would exceed the limit
    const currentImageCount = images.length;
    const newFilesCount = Array.from(files).filter(file => file.type.startsWith("image/")).length;
    
    if (currentImageCount + newFilesCount > MAX_IMAGES) {
      alert(`You can only upload up to ${MAX_IMAGES} images. Currently have ${currentImageCount}, trying to add ${newFilesCount}.`);
      return;
    }

    setIsCompressing(true);
    const newImages: CompressedImage[] = [];

    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) {
        try {
          const compressed = await compressImage(file);
          newImages.push(compressed);
        } catch (error) {
          console.error("Failed to compress image:", error);
        }
      }
    }

    setImages((prev) => [...prev, ...newImages]);
    setIsCompressing(false);

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    onSubmit(prompt, images);
  };

  return (
    <div className="w-full">
      {/* Image previews */}
      {images.length > 0 && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {images.length} image{images.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setImages([])}
              className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <Image
                  src={image.data}
                  alt={`Upload ${index + 1}`}
                  width={64}
                  height={64}
                  className="w-16 h-16 object-cover rounded border"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b text-center">
                  {Math.round(image.compressedSize / 1024)}KB
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative w-full max-w-full overflow-hidden">
        <div className="w-full bg-accent rounded-md relative z-10 border transition-colors">
          <PromptInput
            leftSlot={
              <FrameworkSelector
                value={framework}
                onChange={onFrameworkChange}
              />
            }
            isLoading={isLoading || isCompressing}
            value={prompt}
            onValueChange={onPromptChange}
            onSubmit={handleSubmit}
            className="relative z-10 border-none bg-transparent shadow-none focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-200 transition-all duration-200 ease-in-out"
          >
            <PromptInputTextareaWithTypingAnimation />
            <PromptInputActions>
              {/* Image upload button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isCompressing}
                type="button"
              >
                <Paperclip className="h-3 w-3" />
              </Button>
              
              {/* Submit button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSubmit}
                disabled={isLoading || isCompressing || (!prompt.trim() && images.length === 0)}
                className="h-7 text-xs"
              >
                <span className="hidden sm:inline">
                  {isCompressing ? "Processing..." : "Start Creating ⏎"}
                </span>
                <span className="sm:hidden">
                  {isCompressing ? "..." : "Create ⏎"}
                </span>
              </Button>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
