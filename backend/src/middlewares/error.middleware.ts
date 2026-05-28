import { ErrorRequestHandler } from "express";

/**
 * ErrorMiddleware which : 
 * - intercepts the errors thrown by the app 
 * - provide a structured error response
 * - prevents exposure of the int
 *   ernal code errors to the user side  
 */
export const errorMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  // Check for status and statusCode and extract the value, else fallback to 500
  const status = typeof err?.status === "number" ? err.status : typeof err?.statusCode === "number" ? err.statusCode : 500;


  // Extract the requestId
  const requestId = req.requestId ?? req.header("x-request-id");
  if (requestId) res.setHeader("x-request-id", requestId);
  const message = status >= 500 ? "Internal Server Error" : (err as any)?.message ?? "Error";

  if (status >= 500) {
    console.error(`Method : ${req.method}; Request Id : ${requestId}; Original URL : ${req.originalUrl}; Error : ${err}`);
  }

  res.status(status).json({
    success: false,
    message,
    requestId
  })
}
