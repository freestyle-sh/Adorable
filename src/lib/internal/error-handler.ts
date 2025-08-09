import { NextRequest } from "next/server";

export interface ErrorResponse {
  message: string;
  code?: string;
  retryable?: boolean;
}

export interface StreamErrorResponse {
  type: "error";
  data: ErrorResponse;
}

export class ErrorHandler {
  /**
   * Handle errors gracefully and return appropriate responses
   * This keeps the main route handlers clean and focused
   */
  static handleError(error: unknown, context: string): Response {
    console.error(`${context}:`, error);

    // Determine if this is a retryable error
    const isRetryable = this.isRetryableError(error);
    const statusCode = this.getStatusCode(error);
    const message = this.getErrorMessage(error);

    // For streaming endpoints, return SSE error format
    if (context.includes("chat") || context.includes("stream")) {
      const errorResponse: StreamErrorResponse = {
        type: "error",
        data: {
          message,
          retryable: isRetryable,
        },
      };

      return new Response(`data: ${JSON.stringify(errorResponse)}\n\n`, {
        status: statusCode,
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
          "x-vercel-ai-ui-message-stream": "v1",
          "x-accel-buffering": "no",
        },
      });
    }

    // For regular endpoints, return JSON error
    return new Response(
      JSON.stringify({
        error: message,
        retryable: isRetryable,
      }),
      {
        status: statusCode,
        headers: { "content-type": "application/json" },
      }
    );
  }

  /**
   * Create a simple success response for streaming endpoints
   */
  static createStreamSuccessResponse(message: string, data?: any): Response {
    const response = {
      type: "message",
      data: {
        id: crypto.randomUUID(),
        role: "assistant",
        content: message,
        ...data,
      },
    };

    return new Response(`data: ${JSON.stringify(response)}\n\n`, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
        "x-vercel-ai-ui-message-stream": "v1",
        "x-accel-buffering": "no",
      },
    });
  }

  /**
   * Validate request and return early error response if invalid
   */
  static validateRequest(
    req: NextRequest,
    requiredHeaders: string[]
  ): Response | null {
    for (const header of requiredHeaders) {
      if (!req.headers.get(header)) {
        return this.handleError(
          new Error(`Missing required header: ${header}`),
          "request-validation"
        );
      }
    }
    return null;
  }

  /**
   * Determine if an error is retryable
   */
  private static isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const retryableErrors = [
        "ECONNRESET",
        "ETIMEDOUT",
        "ENOTFOUND",
        "ECONNREFUSED",
        "NETWORK_ERROR",
        "TIMEOUT",
      ];
      return retryableErrors.some((retryableError) =>
        error.message.includes(retryableError)
      );
    }
    return false;
  }

  /**
   * Get appropriate HTTP status code for an error
   */
  private static getStatusCode(error: unknown): number {
    if (error instanceof Error) {
      if (error.message.includes("not found")) return 404;
      if (error.message.includes("unauthorized")) return 401;
      if (error.message.includes("forbidden")) return 403;
      if (error.message.includes("validation")) return 400;
      if (error.message.includes("timeout")) return 408;
    }
    return 500;
  }

  /**
   * Get user-friendly error message
   */
  private static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      // Hide internal error details from users
      if (
        error.message.includes("ECONN") ||
        error.message.includes("ENOTFOUND")
      ) {
        return "Connection issue. Please try again.";
      }
      if (error.message.includes("timeout")) {
        return "Request timed out. Please try again.";
      }
      return error.message;
    }
    return "An unexpected error occurred. Please try again.";
  }
}
