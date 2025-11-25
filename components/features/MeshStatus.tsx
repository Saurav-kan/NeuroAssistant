"use client";

import { useEffect, useState } from "react";
import { Activity, Users, Globe, Server } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MeshStats {
  activeUsers: number;
  uniqueVisitors: number;
  totalApiCalls: number;
  cacheHitRate: number;
  ttsUsageCount: number;
}

export function MeshStatus() {
  const [stats, setStats] = useState<MeshStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setStats(data.data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch mesh stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-full bg-background/80 px-4 py-2 text-xs font-medium shadow-lg backdrop-blur-sm border border-border/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <TooltipProvider>
        {/* Active Users */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-emerald-500 cursor-help">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{stats.activeUsers} Online</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Concurrent users active in the last 5 minutes</p>
          </TooltipContent>
        </Tooltip>

        <div className="h-3 w-px bg-border" />

        {/* Unique Visitors */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-help">
              <Users className="h-3 w-3" />
              <span>{stats.uniqueVisitors}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Unique visitors today</p>
          </TooltipContent>
        </Tooltip>

        <div className="h-3 w-px bg-border" />

        {/* System Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-help">
              <Server className="h-3 w-3" />
              <span>Mesh Active</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-xs">
              <p>Total API Calls: {stats.totalApiCalls}</p>
              <p>Cache Hit Rate: {(stats.cacheHitRate * 100).toFixed(1)}%</p>
              <p>TTS Usage: {stats.ttsUsageCount}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
