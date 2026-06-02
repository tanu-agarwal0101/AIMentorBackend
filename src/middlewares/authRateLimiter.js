const loginLimits = new Map();
const forgotLimits = new Map();

/**
 * Helper to check rate limit for a specific IP.
 */
const checkLimit = (store, ip, maxRequests, windowMs, errorMessage, res, next) => {
  const now = Date.now();
  if (!store.has(ip)) {
    store.set(ip, []);
  }

  const timestamps = store.get(ip);
  const activeTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (activeTimestamps.length >= maxRequests) {
    const oldestTimestamp = activeTimestamps[0];
    const retryAfter = Math.round((windowMs - (now - oldestTimestamp)) / 1000);
    return res.status(429).json({
      message: errorMessage,
      retryAfter
    });
  }

  activeTimestamps.push(now);
  store.set(ip, activeTimestamps);

  res.setHeader("X-RateLimit-Limit", maxRequests);
  res.setHeader("X-RateLimit-Remaining", maxRequests - activeTimestamps.length);
  next();
};

/**
 * Login Rate Limiter: 5 requests per 15 minutes per IP
 */
export const loginRateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  checkLimit(
    loginLimits,
    ip,
    5,
    15 * 60 * 1000,
    "Too many login attempts. Please try again after 15 minutes.",
    res,
    next
  );
};

/**
 * Forgot Password Rate Limiter: 3 requests per hour per IP
 */
export const forgotPasswordRateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  checkLimit(
    forgotLimits,
    ip,
    3,
    60 * 60 * 1000,
    "Too many password reset requests. Please try again after an hour.",
    res,
    next
  );
};

const resendVerificationLimits = new Map();

/**
 * Resend Verification Rate Limiter: 3 requests per hour per user ID
 * Note: In a multi-instance production environment, this in-memory Map rate limiter
 * should be migrated to a distributed store like Redis/Upstash Redis (Technical Debt).
 */
export const resendVerificationRateLimiter = (req, res, next) => {
  const userId = req.user?.id || req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  checkLimit(
    resendVerificationLimits,
    userId,
    3,
    60 * 60 * 1000, 
    "Too many verification requests. Please try again after an hour.",
    res,
    next
  );
};

const registerLimits = new Map();

/**
 * Register Rate Limiter: 5 registrations per hour per IP
 */
export const registerRateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  checkLimit(
    registerLimits,
    ip,
    5,
    60 * 60 * 1000,
    "Too many accounts created from this IP. Please try again after an hour.",
    res,
    next
  );
};
