"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";

interface ReadingTrackerProps {
  text: string;
}

/**
 * Tracks reading progress using Intersection Observer
 * Only marks sections as "read" when user is actively focused/engaged
 */
export function ReadingTracker({ text }: ReadingTrackerProps) {
  const { markSectionAsRead, setReadingProgress, updateStudyStats } = useAppStore();
  const sectionTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [isUserActive, setIsUserActive] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track user activity (scrolling, mouse movement, keyboard)
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      setIsUserActive(true);

      // Clear existing timeout
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }

      // Set inactive after 5 seconds of no activity
      activityTimeoutRef.current = setTimeout(() => {
        setIsUserActive(false);
      }, 5000);
    };

    // Listen for various user activities
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("mousemove", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("wheel", handleActivity, { passive: true });

    // Check if page is focused
    const handleFocus = () => setIsUserActive(true);
    const handleBlur = () => setIsUserActive(false);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    // Initial check - if page just loaded, wait for first activity
    setIsUserActive(false);

    return () => {
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("wheel", handleActivity);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!text) return;

    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create Intersection Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionId = entry.target.getAttribute("data-section-id");
          if (!sectionId) return;

          if (entry.isIntersecting) {
            // Section is visible - only start timer if user is active
            if (!isUserActive) {
              // Clear any existing timer if user becomes inactive
              const existingTimer = sectionTimers.current.get(sectionId);
              if (existingTimer) {
                clearTimeout(existingTimer);
                sectionTimers.current.delete(sectionId);
              }
              return;
            }

            // Check if section is already being tracked
            if (sectionTimers.current.has(sectionId)) {
              return; // Already tracking this section
            }

            // Section is visible and user is active - start timer to mark as read
            const timer = setTimeout(() => {
              // Double-check user is still active before marking as read
              if (!isUserActive) {
                sectionTimers.current.delete(sectionId);
                return;
              }

              markSectionAsRead(sectionId);

              // Update word count for this section
              const sectionText = entry.target.textContent || "";
              const wordCount = sectionText.trim().split(/\s+/).length;
              updateStudyStats(wordCount);
              
              // Calculate progress based on read sections
              const allSections = document.querySelectorAll("[data-section-id]");
              const currentState = useAppStore.getState();
              const readCount = Array.from(allSections).filter((el) => {
                const id = el.getAttribute("data-section-id");
                return id && currentState.readSections.has(id);
              }).length;
              
              const progress = allSections.length > 0 
                ? Math.round((readCount / allSections.length) * 100)
                : 0;
              
              setReadingProgress(progress);
              
              sectionTimers.current.delete(sectionId);
            }, 3000); // Mark as read after 3 seconds of active visibility

            sectionTimers.current.set(sectionId, timer);
          } else {
            // Section is no longer visible - clear timer
            const timer = sectionTimers.current.get(sectionId);
            if (timer) {
              clearTimeout(timer);
              sectionTimers.current.delete(sectionId);
            }
          }
        });
      },
      {
        threshold: 0.6, // Section must be 60% visible
        rootMargin: "-20% 0px -20% 0px", // Only count when in center 60% of viewport
      }
    );

    // Observe all sections
    const sections = document.querySelectorAll("[data-section-id]");
    sections.forEach((section) => {
      observerRef.current?.observe(section);
    });

    return () => {
      // Cleanup
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      sectionTimers.current.forEach((timer) => clearTimeout(timer));
      sectionTimers.current.clear();
    };
  }, [text, isUserActive, markSectionAsRead, setReadingProgress, updateStudyStats]);

  // Clear all timers when user becomes inactive
  useEffect(() => {
    if (!isUserActive) {
      sectionTimers.current.forEach((timer) => clearTimeout(timer));
      sectionTimers.current.clear();
    }
  }, [isUserActive]);

  return null; // This component doesn't render anything
}

