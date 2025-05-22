import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { PromptInputTextarea } from "./ui/prompt-input";

export function TypingAnimation({
  fullPlaceholder,
}: {
  fullPlaceholder: string;
}) {
  const [placeholderText, setPlaceholderText] = useState("");
  const exampleIdeas = useMemo(
    () => [
      "a dog food marketplace",
      "a personal portfolio website for my mother's bakery",
      "a B2B SaaS for burrito shops to sell burritos",
      "a social network for coders to find grass to touch",
      "a potato farm.🇮🇪 🇮🇪 🇮🇪            ",
    ],
    []
  );

  const currentTextIndexRef = useRef<number>(0);
  const currentCharIndexRef = useRef<number>(0);
  const typingTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pauseTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const placeholderRef = useRef<HTMLTextAreaElement>(null);

  const typeNextCharacter = useCallback(() => {
    const currentIdea = exampleIdeas[currentTextIndexRef.current];
    if (currentCharIndexRef.current < currentIdea.length) {
      setPlaceholderText(
        fullPlaceholder +
          " " +
          currentIdea.substring(0, currentCharIndexRef.current + 1)
      );
      currentCharIndexRef.current++;
      typingTimerRef.current = setTimeout(typeNextCharacter, 100);
    } else {
      pauseTimerRef.current = setTimeout(() => {
        eraseText();
      }, 2000);
    }
  }, [exampleIdeas, fullPlaceholder]);

  const eraseText = useCallback(() => {
    const currentIdea = exampleIdeas[currentTextIndexRef.current];
    if (currentCharIndexRef.current > 0) {
      setPlaceholderText(
        fullPlaceholder +
          " " +
          currentIdea.substring(0, currentCharIndexRef.current - 1)
      );
      currentCharIndexRef.current--;
      typingTimerRef.current = setTimeout(eraseText, 50);
    } else {
      currentTextIndexRef.current =
        (currentTextIndexRef.current + 1) % exampleIdeas.length;
      pauseTimerRef.current = setTimeout(() => {
        typingTimerRef.current = setTimeout(typeNextCharacter, 100);
      }, 500);
    }
  }, [exampleIdeas, fullPlaceholder, typeNextCharacter]);

  useEffect(() => {
    typingTimerRef.current = setTimeout(typeNextCharacter, 500);

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, [typeNextCharacter]);

  return (
    <PromptInputTextarea
      ref={placeholderRef}
      placeholder={placeholderText || fullPlaceholder}
      className="min-h-[100px] w-full bg-transparent dark:bg-transparent backdrop-blur-sm pr-12"
      onBlur={() => {}}
    />
  );
}
