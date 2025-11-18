"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PanicOverlayProps {
  text: string;
  enabled: boolean;
  currentSentenceIndex: number;
  onSentenceChange: (index: number) => void;
  onClose: () => void;
}

export function PanicOverlay({
  text,
  enabled,
  currentSentenceIndex,
  onSentenceChange,
  onClose,
}: PanicOverlayProps) {
  const [sentences, setSentences] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Split text into sentences
  useEffect(() => {
    if (!text) {
      setSentences([]);
      return;
    }

    // Split by sentence endings (. ! ?) while preserving the punctuation
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    const matches = text.match(sentenceRegex);
    setSentences(matches || [text]);
  }, [text]);

  // Handle arrow key navigation and Escape key
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onSentenceChange(
          Math.min(currentSentenceIndex + 1, sentences.length - 1)
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        onSentenceChange(Math.max(currentSentenceIndex - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, currentSentenceIndex, sentences.length, onClose]);

  // Handle click outside to close
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        overlayRef.current &&
        spotlightRef.current &&
        !spotlightRef.current.contains(e.target as Node) &&
        overlayRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [enabled, onClose]);

  if (!enabled || sentences.length === 0) {
    return null;
  }

  const currentSentence = sentences[currentSentenceIndex] || sentences[0];

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95"
        role="dialog"
        aria-label="Focus mode overlay"
        aria-modal="true"
        aria-live="polite"
      >
        {/* Close button in top right */}
        <div className="absolute right-4 top-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close focus mode"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div
          ref={containerRef}
          className="flex h-full items-center justify-center"
        >
          <motion.div
            ref={spotlightRef}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "max-w-2xl px-8 py-6 text-center",
              "text-2xl text-white",
              "rounded-lg bg-white/10 backdrop-blur-sm"
            )}
          >
            <p className="text-relaxed" aria-live="polite">
              {currentSentence.trim()}
            </p>
            <p
              className="mt-4 text-sm text-white/60"
              aria-label={`Sentence ${currentSentenceIndex + 1} of ${
                sentences.length
              }`}
            >
              {currentSentenceIndex + 1} of {sentences.length}
            </p>
            <p className="mt-2 text-xs text-white/40" role="note">
              Use ↑ ↓ arrow keys to navigate • Press ESC or click outside to
              exit
            </p>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
