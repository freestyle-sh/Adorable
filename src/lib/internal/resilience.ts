import { ErrorHandler } from "./error-handler";

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
}

export class Resilience {
  private static circuitBreakers = new Map<string, CircuitBreakerState>();
  private static defaultRetryOptions: RetryOptions = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  };

  private static defaultCircuitBreakerOptions: CircuitBreakerOptions = {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringWindow: 60000,
  };

  /**
   * Execute a function with automatic retry logic
   * Developers just call this and get resilience automatically
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    options?: Partial<RetryOptions>
  ): Promise<T> {
    const config = { ...this.defaultRetryOptions, ...options };
    let lastError: unknown;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === config.maxAttempts) {
          console.error(
            `${context}: All retry attempts failed after ${config.maxAttempts} attempts`
          );
          throw error;
        }

        if (!this.isRetryableError(error)) {
          console.log(`${context}: Non-retryable error, not retrying:`, error);
          throw error;
        }

        const delay = this.calculateBackoffDelay(attempt, config);
        console.log(
          `${context}: Attempt ${attempt} failed, retrying in ${delay}ms...`
        );

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Execute a function with circuit breaker protection
   * Automatically opens circuit on repeated failures
   */
  static async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    context: string,
    options?: Partial<CircuitBreakerOptions>
  ): Promise<T> {
    const config = { ...this.defaultCircuitBreakerOptions, ...options };
    const circuitBreaker = this.getOrCreateCircuitBreaker(context, config);

    if (circuitBreaker.state === "open") {
      if (
        Date.now() - circuitBreaker.lastFailureTime <
        config.recoveryTimeout
      ) {
        throw new Error(
          `Circuit breaker is open for ${context}. Please try again later.`
        );
      } else {
        // Try to close the circuit
        circuitBreaker.state = "half-open";
        circuitBreaker.failureCount = 0;
      }
    }

    try {
      const result = await operation();

      // Success - close circuit if it was half-open
      if (circuitBreaker.state === "half-open") {
        circuitBreaker.state = "closed";
        circuitBreaker.failureCount = 0;
      }

      return result;
    } catch (error) {
      // Failure - update circuit breaker state
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = Date.now();

      if (circuitBreaker.failureCount >= config.failureThreshold) {
        circuitBreaker.state = "open";
        console.warn(
          `Circuit breaker opened for ${context} after ${config.failureThreshold} failures`
        );
      }

      throw error;
    }
  }

  /**
   * Execute with both retry and circuit breaker protection
   * This is the main method developers should use for critical operations
   */
  static async withResilience<T>(
    operation: () => Promise<T>,
    context: string,
    retryOptions?: Partial<RetryOptions>,
    circuitBreakerOptions?: Partial<CircuitBreakerOptions>
  ): Promise<T> {
    return this.withCircuitBreaker(
      () => this.withRetry(operation, context, retryOptions),
      context,
      circuitBreakerOptions
    );
  }

  /**
   * Health check for resilience systems
   */
  static getHealthStatus(): Record<string, any> {
    const status: Record<string, any> = {};

    for (const [context, circuitBreaker] of this.circuitBreakers) {
      status[context] = {
        state: circuitBreaker.state,
        failureCount: circuitBreaker.failureCount,
        lastFailureTime: circuitBreaker.lastFailureTime,
        isHealthy: circuitBreaker.state === "closed",
      };
    }

    return status;
  }

  /**
   * Reset circuit breaker for a specific context
   */
  static resetCircuitBreaker(context: string): void {
    this.circuitBreakers.delete(context);
  }

  /**
   * Reset all circuit breakers
   */
  static resetAllCircuitBreakers(): void {
    this.circuitBreakers.clear();
  }

  private static getOrCreateCircuitBreaker(
    context: string,
    options: CircuitBreakerOptions
  ): CircuitBreakerState {
    if (!this.circuitBreakers.has(context)) {
      this.circuitBreakers.set(context, {
        state: "closed",
        failureCount: 0,
        lastFailureTime: 0,
      });
    }
    return this.circuitBreakers.get(context)!;
  }

  private static isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const retryableErrors = [
        "ECONNRESET",
        "ETIMEDOUT",
        "ENOTFOUND",
        "ECONNREFUSED",
        "NETWORK_ERROR",
        "TIMEOUT",
        "RATE_LIMIT",
        "SERVICE_UNAVAILABLE",
      ];
      return retryableErrors.some((retryableError) =>
        error.message.includes(retryableError)
      );
    }
    return false;
  }

  private static calculateBackoffDelay(
    attempt: number,
    config: RetryOptions
  ): number {
    const delay =
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelay);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

interface CircuitBreakerState {
  state: "closed" | "open" | "half-open";
  failureCount: number;
  lastFailureTime: number;
}
