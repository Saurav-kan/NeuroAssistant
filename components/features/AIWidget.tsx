"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIWidgetProps {
  text: string;
}

export function AIWidget({ text }: AIWidgetProps) {
  const [selectedText, setSelectedText] = useState<string>("");
  const [context, setContext] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [explanation, setExplanation] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const selectionRef = useRef<Selection | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Helper function to extract surrounding context
  const getSurroundingContext = (
    fullText: string,
    selectedText: string,
    contextWords: number = 50
  ): string => {
    // Find the position of the selected text in the full text
    const selectedIndex = fullText.indexOf(selectedText);
    if (selectedIndex === -1) {
      return ""; // Selected text not found in full text
    }

    // Get text before the selection
    const beforeText = fullText.substring(0, selectedIndex);
    // Get text after the selection
    const afterText = fullText.substring(selectedIndex + selectedText.length);

    // Split into words and get the last N words before selection
    const beforeWords = beforeText.trim().split(/\s+/);
    const beforeContext = beforeWords.slice(-contextWords).join(" ").trim();

    // Split into words and get the first N words after selection
    const afterWords = afterText.trim().split(/\s+/);
    const afterContext = afterWords.slice(0, contextWords).join(" ").trim();

    // Combine context (only if we have meaningful context)
    const contextParts: string[] = [];
    if (beforeContext) contextParts.push(beforeContext);
    if (afterContext) contextParts.push(afterContext);

    return contextParts.join(" ").trim();
  };

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setShowButton(false);
        return;
      }

      const selectedText = selection.toString().trim();
      if (selectedText.length > 0 && selectedText.length < 100) {
        selectionRef.current = selection;
        setSelectedText(selectedText);

        // Extract surrounding context (50 words before and after)
        const surroundingContext = getSurroundingContext(
          text,
          selectedText,
          50
        );
        setContext(surroundingContext);

        // Get position for button (above the selection)
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setButtonPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 5,
        });

        setShowButton(true);
        setExplanation("");
        setError(null);
      } else {
        setShowButton(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        // Check if click is not on the selection
        const selection = window.getSelection();
        if (
          !selection ||
          selection.rangeCount === 0 ||
          selection.toString().trim().length === 0
        ) {
          setShowButton(false);
        }
      }
    };

    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [text]);

  const handleExplain = async () => {
    if (!selectedText) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          term: selectedText,
          context: context || undefined, // Only send context if available
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Parse the OpenAIStream response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Process remaining buffer
          if (buffer.trim()) {
            const text = extractTextFromChunk(buffer);
            if (text) {
              fullText += text;
              setExplanation(fullText);
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines (split by newline)
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            const text = extractTextFromChunk(line);
            if (text) {
              fullText += text;
              setExplanation(fullText);
            }
          }
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to get explanation. Please check your API key.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to extract text from AI SDK stream chunks
  const extractTextFromChunk = (chunk: string): string => {
    // Skip empty chunks
    if (!chunk.trim()) {
      return "";
    }

    // AI SDK format: "0:text content" where text is JSON-encoded
    if (chunk.startsWith("0:")) {
      let text = chunk.slice(2);

      // The text after "0:" is JSON-encoded
      try {
        let parsed = JSON.parse(text);

        // Handle double-encoding: if parsed is still a JSON string, parse again
        if (
          typeof parsed === "string" &&
          parsed.startsWith('"') &&
          parsed.endsWith('"')
        ) {
          try {
            parsed = JSON.parse(parsed);
          } catch {
            // Not double-encoded, continue with parsed
          }
        }

        // If it's a string, clean it up and return
        if (typeof parsed === "string") {
          // Remove any remaining quote artifacts
          let cleaned = parsed;
          // If the string still has quotes at the start/end, remove them
          if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.slice(1, -1);
          }
          // Replace escaped newlines and quotes
          cleaned = cleaned
            .replace(/\\n/g, "\n")
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\t/g, "\t");
          return cleaned;
        }

        // If it's an object, try to extract text fields
        if (typeof parsed === "object" && parsed !== null) {
          if (parsed.textDelta) {
            return String(parsed.textDelta);
          }
          if (parsed.text) {
            return String(parsed.text);
          }
          if (parsed.content) {
            return String(parsed.content);
          }
        }

        // Fallback: stringify and return
        return String(parsed);
      } catch (e) {
        // If JSON parsing fails, try to clean up the text
        return text
          .replace(/^"/, "") // Remove leading quote
          .replace(/"$/, "") // Remove trailing quote
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\t/g, "\t");
      }
    }

    // Skip control lines
    if (chunk.startsWith(":") || chunk.startsWith("d:")) {
      return "";
    }

    // Try parsing entire chunk as JSON (fallback)
    try {
      const parsed = JSON.parse(chunk);
      if (typeof parsed === "string") {
        return parsed;
      }
      if (parsed.textDelta) {
        return parsed.textDelta;
      }
      if (parsed.text) {
        return parsed.text;
      }
    } catch {
      // Not JSON, return as plain text
    }

    // Return as plain text (shouldn't happen with proper format)
    return chunk;
  };

  const handleOpenDialog = () => {
    setIsOpen(true);
    setShowButton(false);
    // Auto-trigger explanation when dialog opens
    if (selectedText && !explanation && !error) {
      handleExplain();
    }
  };

  return (
    <>
      {/* Floating "Get Meaning" Button */}
      {showButton && selectedText && (
        <div
          ref={buttonRef}
          className="fixed z-50"
          style={{
            left: `${buttonPosition.x}px`,
            top: `${buttonPosition.y}px`,
            transform: "translateX(-50%) translateY(-100%)",
          }}
        >
          <Button
            size="sm"
            onClick={handleOpenDialog}
            className="shadow-lg"
            aria-label={`Get meaning of "${selectedText}"`}
          >
            Get Meaning
          </Button>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Explain: &quot;{selectedText}&quot;</DialogTitle>
            <DialogDescription>
              Getting a simple explanation...
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {error && (
              <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                {error}
                {error.includes("API key") && (
                  <p className="mt-2 text-xs">
                    Please set your OPENAI_API_KEY in .env.local
                  </p>
                )}
              </div>
            )}
            {explanation && !isLoading && (
              <p className="text-relaxed text-foreground">{explanation}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
