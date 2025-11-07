export class AppError extends Error {
  constructor(message, statusCode = 500, type = "app") {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    Error.captureStackTrace(this, this.constructor);
  }

  serialize() {
    const base = {
      name: this.name,
      message: this.message,
      stack: this.stack,
    };

    return Object.assign(base, { ...this });
  }
}

export class AuthError extends AppError {
  constructor(message = "Unauthorized", code = 401) {
    super(message, code, "auth");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "not_found");
  }
}

export class ValidationError extends AppError {
  constructor(details) {
    super("Validation failed", 400, "validation");
    this.details = details;
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409, "conflict");
  }
}

export class RateLimitError extends AppError {
  constructor(event, msBeforeNext, message) {
    super(message || `Rate limit exceeded for event: ${event}`, 429, "rate_limit");
    this.event = event;
    this.retryAfter = msBeforeNext;
  }
}
