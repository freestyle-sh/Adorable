import { Resilience } from "./resilience";

export interface SystemMetrics {
  timestamp: number;
  circuitBreakers: Record<string, any>;
  performance: {
    averageResponseTime: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
  };
  errors: {
    recent: Array<{ timestamp: number; context: string; message: string }>;
    count: number;
  };
}

export class Monitoring {
  private static metrics: SystemMetrics = {
    timestamp: Date.now(),
    circuitBreakers: {},
    performance: {
      averageResponseTime: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      successRate: 100,
    },
    errors: {
      recent: [],
      count: 0,
    },
  };

  private static requestTimes: number[] = [];
  private static readonly MAX_ERRORS = 100;
  private static readonly MAX_REQUEST_TIMES = 1000;

  /**
   * Record a successful request
   */
  static recordSuccess(duration: number): void {
    this.metrics.performance.totalRequests++;
    this.metrics.performance.successfulRequests++;
    this.updateSuccessRate();
    this.recordRequestTime(duration);
  }

  /**
   * Record a failed request
   */
  static recordFailure(duration: number, context: string, error: string): void {
    this.metrics.performance.totalRequests++;
    this.metrics.performance.failedRequests++;
    this.updateSuccessRate();
    this.recordRequestTime(duration);
    this.recordError(context, error);
  }

  /**
   * Get current system metrics
   */
  static getMetrics(): SystemMetrics {
    // Update circuit breaker status
    this.metrics.circuitBreakers = Resilience.getHealthStatus();
    this.metrics.timestamp = Date.now();

    return { ...this.metrics };
  }

  /**
   * Get a summary of system health
   */
  static getHealthSummary(): {
    status: "healthy" | "degraded" | "unhealthy";
    issues: string[];
  } {
    const issues: string[] = [];
    const metrics = this.getMetrics();

    // Check success rate
    if (metrics.performance.successRate < 95) {
      issues.push(
        `Low success rate: ${metrics.performance.successRate.toFixed(1)}%`
      );
    }

    // Check circuit breakers
    for (const [context, status] of Object.entries(metrics.circuitBreakers)) {
      if (status.state === "open") {
        issues.push(`Circuit breaker open for ${context}`);
      }
    }

    // Check error rate
    if (metrics.errors.count > 50) {
      issues.push(`High error count: ${metrics.errors.count}`);
    }

    // Determine overall status
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (issues.length > 0) {
      status = issues.length > 2 ? "unhealthy" : "degraded";
    }

    return { status, issues };
  }

  /**
   * Reset all metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      timestamp: Date.now(),
      circuitBreakers: {},
      performance: {
        averageResponseTime: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRate: 100,
      },
      errors: {
        recent: [],
        count: 0,
      },
    };
    this.requestTimes = [];
  }

  /**
   * Export metrics for external monitoring systems
   */
  static exportMetrics(): string {
    return JSON.stringify(this.getMetrics(), null, 2);
  }

  private static updateSuccessRate(): void {
    const { totalRequests, successfulRequests } = this.metrics.performance;
    if (totalRequests > 0) {
      this.metrics.performance.successRate =
        (successfulRequests / totalRequests) * 100;
    }
  }

  private static recordRequestTime(duration: number): void {
    this.requestTimes.push(duration);

    // Keep only the last N request times
    if (this.requestTimes.length > this.MAX_REQUEST_TIMES) {
      this.requestTimes = this.requestTimes.slice(-this.MAX_REQUEST_TIMES);
    }

    // Update average response time
    const sum = this.requestTimes.reduce((acc, time) => acc + time, 0);
    this.metrics.performance.averageResponseTime =
      sum / this.requestTimes.length;
  }

  private static recordError(context: string, error: string): void {
    const errorEntry = {
      timestamp: Date.now(),
      context,
      message: error,
    };

    this.metrics.errors.recent.unshift(errorEntry);
    this.metrics.errors.count++;

    // Keep only the last N errors
    if (this.metrics.errors.recent.length > this.MAX_ERRORS) {
      this.metrics.errors.recent = this.metrics.errors.recent.slice(
        0,
        this.MAX_ERRORS
      );
    }
  }
}
