// One place that turns anything thrown into a clean, consistent `{ message, code }` JSON response.
// The message is always safe to show to a user; details only go to the server log.

export class AppError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

const GENERIC = "Something went wrong on our side. Please try again.";

export const mapError = (error) => {
  if (error instanceof AppError) {
    return { status: error.status, message: error.message, code: error.code };
  }
  const name = error?.name;

  // body-parser: malformed JSON / body too large
  if (error?.type === "entity.too.large") {
    return { status: 413, message: "That upload is too large. Try a smaller file.", code: "TOO_LARGE" };
  }
  if (error?.type === "entity.parse.failed" || (error instanceof SyntaxError && error.status === 400)) {
    return { status: 400, message: "The request was not valid JSON.", code: "BAD_JSON" };
  }
  if (error?.message === "Not allowed by CORS") {
    return { status: 403, message: "This origin is not allowed to use the API.", code: "CORS" };
  }

  // mongoose / mongodb
  if (name === "ValidationError" && error.errors) {
    const first = Object.values(error.errors)[0];
    return { status: 400, message: first?.message || "Some fields are invalid.", code: "VALIDATION" };
  }
  if (name === "CastError") return { status: 400, message: "Invalid id.", code: "BAD_ID" };
  if (error?.code === 11000) {
    return { status: 409, message: "That already exists.", code: "DUPLICATE" };
  }
  if (name === "MongoServerSelectionError" || name === "MongoNetworkError" || name === "MongoNetworkTimeoutError") {
    return { status: 503, message: "The database is temporarily unavailable. Please retry in a moment.", code: "DB_DOWN" };
  }

  // auth
  if (name === "JsonWebTokenError" || name === "TokenExpiredError") {
    return { status: 401, message: "Your session is no longer valid. Please log in again.", code: "BAD_TOKEN" };
  }

  // uploads (cloudinary reports http_code) and outbound calls
  if (error?.http_code) {
    return { status: 502, message: "Uploading the file failed. Please try again.", code: "UPLOAD_FAILED" };
  }
  if (name === "TimeoutError" || name === "AbortError") {
    return { status: 504, message: "The request took too long. Please try again.", code: "TIMEOUT" };
  }

  return { status: 500, message: GENERIC, code: "INTERNAL" };
};

export const sendError = (res, error, context = "") => {
  const mapped = mapError(error);
  if (mapped.status >= 500) console.error(`[${mapped.code}] ${context}`.trim(), error?.message || error);
  if (res.headersSent) return;
  res.status(mapped.status).json({ message: mapped.message, code: mapped.code });
};

// express error middleware (last in the chain)
// eslint-disable-next-line no-unused-vars
export const errorMiddleware = (err, req, res, _next) => sendError(res, err, `${req.method} ${req.originalUrl}`);

export const notFoundMiddleware = (req, res) =>
  res.status(404).json({ message: `Nothing here: ${req.method} ${req.originalUrl}`, code: "NOT_FOUND" });
