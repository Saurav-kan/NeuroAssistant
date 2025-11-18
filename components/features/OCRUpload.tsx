"use client";

import { useState, useRef } from "react";
import { createWorker } from "tesseract.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2, FileText } from "lucide-react";
import { cleanOCRText } from "@/lib/utils";

interface OCRUploadProps {
  onTextExtracted: (text: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function OCRUpload({ onTextExtracted }: OCRUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG, or PDF file.");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
      return;
    }

    setError(null);
    setFileName(file.name);
    setIsProcessing(true);
    setProgress(0);

    try {
      // For PDFs, we'd need a different approach (convert to image first)
      // For now, we'll handle images only
      if (file.type === "application/pdf") {
        setError("PDF support coming soon. Please upload an image file (JPG/PNG).");
        setIsProcessing(false);
        return;
      }

      // Create image from file
      const imageUrl = URL.createObjectURL(file);

      // Initialize Tesseract worker
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      // Perform OCR
      const { data } = await worker.recognize(imageUrl);
      
      // Clean the extracted text
      const cleanedText = cleanOCRText(data.text);
      
      // Cleanup
      await worker.terminate();
      URL.revokeObjectURL(imageUrl);

      // Pass extracted text to parent
      if (cleanedText.trim()) {
        onTextExtracted(cleanedText);
        setProgress(100);
      } else {
        throw new Error("No text could be extracted from the image.");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to process image. Please try again.";
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          PDF Un-Breaker (OCR)
        </CardTitle>
        <CardDescription>
          Upload an image of your textbook to extract text
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ocr-file">Upload Image</Label>
          <Input
            id="ocr-file"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileSelect}
            ref={fileInputRef}
            disabled={isProcessing}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">
            Supported formats: JPG, PNG (Max 10MB)
          </p>
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing {fileName}...</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{progress}% complete</p>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!isProcessing && !error && fileName && (
          <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
            Successfully extracted text from {fileName}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

