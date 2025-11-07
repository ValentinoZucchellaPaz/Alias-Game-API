import { ZodError } from "zod";
import { AppError, ValidationError } from "../../utils/errors.js";

export function errorHandler(err, req, res, _next) {
  console.error("desde error handler", err); // debug errors

  // ------------------------
  // Zod validation errors
  // ------------------------
  if (err instanceof ZodError) {
    const details =
      err.errors?.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })) ?? JSON.parse(err.message);

    const valError = new ValidationError(details);

    return res.status(valError.statusCode).json({
      status: "error",
      type: valError.type,
      message: valError.message,
      details: valError.details,
    });
  }

  // ------------------------
  // AppError (and subclasses)
  // ------------------------
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      type: err.type,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // ------------------------
  // Postgres DB errors
  // ------------------------
  if (err.code) {
    let message = "Database error";
    switch (err.code) {
      case "23505": // unique_violation
        message = "Duplicate entry";
        break;
      case "23503": // foreign_key_violation
        message = "Foreign key constraint failed";
        break;
    }
    return res.status(400).json({
      status: "error",
      type: "database",
      message,
    });
  }

  // ------------------------
  // Generic 500 error
  // ------------------------
  return res.status(err.statusCode || 500).json({
    status: "error",
    type: err.type || "internal",
    message: err.message || "Internal server error",
    ...(err.details ? { details: err.details } : {}),
  });
}
