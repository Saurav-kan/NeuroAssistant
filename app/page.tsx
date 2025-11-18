"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OCRUpload } from "@/components/features/OCRUpload";
import { PDFUpload } from "@/components/features/PDFUpload";
import { useAppStore } from "@/lib/store";
import { sanitizeText } from "@/lib/utils";
import { BookOpen, Upload } from "lucide-react";

export default function HomePage() {
  const [text, setText] = useState("");
  const router = useRouter();
  const setTextInStore = useAppStore((state) => state.setText);
  const clearPdfSession = useAppStore((state) => state.clearPdfSession);

  const handleStartReading = () => {
    try {
      const sanitized = sanitizeText(text);
      if (!sanitized.trim()) {
        alert("Please enter or upload some text to read.");
        return;
      }

      // Ensure any previous PDF session is cleared when switching to manual text
      clearPdfSession();
      // Store text in Zustand store (which persists to LocalStorage)
      setTextInStore(sanitized);

      // Generate unique ID for session
      const sessionId =
        Date.now().toString(36) + Math.random().toString(36).substr(2);

      // Navigate to reader page
      router.push(`/reader/${sessionId}`);
    } catch (error) {
      console.error("Error starting reading session:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const handlePdfReady = (sessionId: string) => {
    router.push(`/reader/${sessionId}`);
  };

  const handleTextExtracted = (extractedText: string) => {
    setText(extractedText);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="spacing-relaxed">
        <header className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold tracking-tight">
            NeuroFocus Study Tool
          </h1>
          <p className="text-lg text-muted-foreground">
            Convert educational content into neuro-friendly formats
          </p>
        </header>

        <div className="mx-auto max-w-3xl space-y-6">
          {/* PDF Upload Section */}
          <PDFUpload onPdfReady={handlePdfReady} />

          {/* OCR Upload Section */}
          <OCRUpload onTextExtracted={handleTextExtracted} />

          {/* Text Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Or Paste Your Text
              </CardTitle>
              <CardDescription>
                Paste your study material here to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="text-input">Your Text</Label>
                <Textarea
                  id="text-input"
                  placeholder="Paste your text here..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-[200px] text-relaxed"
                />
              </div>
              <Button
                onClick={handleStartReading}
                disabled={!text.trim()}
                className="w-full"
                size="lg"
                aria-label="Start reading session with the entered text"
              >
                <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                Start Reading
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

