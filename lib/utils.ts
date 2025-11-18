import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitizes text by removing excessive whitespace and normalizing line breaks
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Cleans OCR text by removing line breaks inside sentences
 */
export function cleanOCRText(text: string): string {
  return text
    .replace(/([a-z])\n([a-z])/gi, "$1 $2") // Remove line breaks between lowercase letters
    .replace(/([.!?])\n+/g, "$1 ") // Remove line breaks after sentence endings
    .replace(/\n{2,}/g, "\n\n") // Normalize multiple line breaks
    .trim();
}

