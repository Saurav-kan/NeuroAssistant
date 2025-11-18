"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, TrendingUp } from "lucide-react";

export function ProgressTracker() {
  const {
    readingProgress,
    totalStudyTime,
    wordsRead,
    currentText,
    readSections,
    setReadingProgress,
  } = useAppStore();

  // Format time
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  // Calculate progress based on TTS-read sections
  useEffect(() => {
    const allSections = document.querySelectorAll("[data-section-id]");
    if (allSections.length > 0) {
      const readCount = Array.from(allSections).filter((el) => {
        const id = el.getAttribute("data-section-id");
        return id && readSections.has(id);
      }).length;

      const calculatedProgress = Math.round(
        (readCount / allSections.length) * 100
      );
      if (calculatedProgress !== readingProgress && calculatedProgress > 0) {
        setReadingProgress(calculatedProgress);
      }
    }
  }, [readSections, readingProgress, setReadingProgress]);

  // Use TTS reading progress
  const displayProgress = readingProgress;

  // Calculate word count
  const totalWords = currentText ? currentText.trim().split(/\s+/).length : 0;
  // Use actual words read from store, or estimate based on progress
  const wordsReadCount =
    wordsRead > 0
      ? wordsRead
      : Math.round((displayProgress / 100) * totalWords);
  const wordsRemaining = Math.max(0, totalWords - wordsReadCount);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Progress
        </CardTitle>
        <CardDescription>Track your TTS reading progress</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Reading Progress</span>
            <span className="font-medium">{displayProgress}%</span>
          </div>
          <Progress value={displayProgress} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold">{wordsReadCount}</div>
            <div className="text-xs text-muted-foreground">Words Read</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold">{wordsRemaining}</div>
            <div className="text-xs text-muted-foreground">Remaining</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold">
              {formatTime(totalStudyTime)}
            </div>
            <div className="text-xs text-muted-foreground">Study Time</div>
          </div>
        </div>

        {/* Completion Estimate */}
        {wordsReadCount > 0 && wordsRemaining > 0 && totalStudyTime > 0 && (
          <div className="pt-2 border-t text-center">
            <div className="text-sm text-muted-foreground">
              Est. time remaining:{" "}
              <span className="font-medium">
                {formatTime(
                  Math.round((totalStudyTime / wordsReadCount) * wordsRemaining)
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
