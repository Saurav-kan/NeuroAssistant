import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// Initialize Redis directly for Edge Middleware to avoid complex imports
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const response = NextResponse.next();
  
  // Skip if Redis is not configured
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return response;
  }

  try {
    // 1. Identify User
    let visitorId = request.cookies.get("visitorId")?.value;
    
    if (!visitorId) {
      // Generate a new visitor ID (simple random string for anonymity)
      visitorId = crypto.randomUUID();
      
      // Set cookie for 1 year
      response.cookies.set("visitorId", visitorId, {
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      });
    }

    // 2. Track Page View (Fire and Forget)
    // We use waitUntil to not block the response
    const pathname = request.nextUrl.pathname;
    
    // Only track actual pages, not assets or internal paths
    if (!pathname.startsWith("/_") && !pathname.includes(".")) {
      const analyticsPromise = trackPageView(visitorId, pathname);
      
      // Use event.waitUntil to keep the lambda alive
      event.waitUntil(analyticsPromise);
    }
  } catch (error) {
    // Fail silently, don't block the user
    console.error("Middleware analytics error:", error);
  }

  return response;
}

async function trackPageView(visitorId: string, path: string) {
  const timestamp = Date.now();
  const today = new Date().toISOString().split("T")[0];
  
  // 1. Track Active User (Heartbeat - 5 mins TTL)
  await redis.set(`analytics:active_users:${visitorId}`, "1", { ex: 300 });

  // 2. Track Unique Visitor (HyperLogLog)
  await redis.pfadd(`analytics:unique_visitors:${today}`, visitorId);
  // Also track all-time unique visitors
  await redis.pfadd("analytics:unique_visitors:all_time", visitorId);

  // 3. Track Page View Count
  await redis.incr(`analytics:page_views:${today}`);
  await redis.hincrby(`analytics:page_views_by_path:${today}`, path, 1);
}
