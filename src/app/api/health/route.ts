import { NextRequest } from "next/server";
import { Monitoring } from "@/lib/internal/monitoring";

export async function GET(req: NextRequest) {
  try {
    const healthSummary = Monitoring.getHealthSummary();
    const metrics = Monitoring.getMetrics();

    return new Response(
      JSON.stringify({
        status: healthSummary.status,
        timestamp: new Date().toISOString(),
        issues: healthSummary.issues,
        summary: {
          successRate: `${metrics.performance.successRate.toFixed(1)}%`,
          totalRequests: metrics.performance.totalRequests,
          averageResponseTime: `${metrics.performance.averageResponseTime.toFixed(0)}ms`,
          circuitBreakers: Object.keys(metrics.circuitBreakers).length,
        },
      }),
      {
        status: healthSummary.status === "healthy" ? 200 : 503,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-cache",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Failed to get health status",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
}
