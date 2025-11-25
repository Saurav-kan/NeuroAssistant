import { NextResponse } from "next/server";
import { getAnalyticsSummary } from "@/lib/analytics";

// Cache for 60 seconds
export const revalidate = 60;

export async function GET() {
  try {
    const stats = await getAnalyticsSummary();
    
    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("[API] Error fetching stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
