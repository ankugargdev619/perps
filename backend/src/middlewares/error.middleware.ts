import { ErrorRequestHandler } from "express";
import { ApiError } from "../utils/api-error.ts";

/**
 * ErrorMiddleware which : 
 * - intercepts the errors thrown by the app 
 * - provide a structured error response
 * - prevents exposure of the internal code errors to the user side  
 */
export const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {

  // No need to process if the headers are already sent
  if (res.headersSent) return next(err);

  // Check for status and statusCode and extract the value, else fallback to 500
  const status =
    err instanceof ApiError
      ? err.statusCode
      : typeof err?.status === "number"
        ? err.status
        : typeof err?.statusCode === "number"
          ? err.statusCode
          : 500;

  const requestId = req.requestId ?? req.header("x-request-id");
  if (requestId) res.setHeader("x-request-id", requestId);

  const isServerError = status >= 500;
  const message = isServerError ? "Internal Server Error" : err.message ?? "Error";
  const code =
    !isServerError && err instanceof ApiError
      ? err.code
      : !isServerError && typeof (err as { code?: unknown }).code === "string"
        ? (err as { code: string }).code
        : isServerError
          ? "INTERNAL_ERROR"
          : "UNKNOWN_ERROR";

  if (isServerError) {
    console.error({
      level: "error",
      msg: "unhandled_request_error",
      requestId,
      method: req.method,
      path: req.originalUrl,
      status,
      userId: req.user?.id,
      err: {
        name: err?.name,
        message: err?.message,
        code: err instanceof ApiError ? err.code : (err as any)?.code,
        stack: err?.stack,
      }
    });
  }

  res.status(status).json({
    error: { code, message, requestId },
  });
};
