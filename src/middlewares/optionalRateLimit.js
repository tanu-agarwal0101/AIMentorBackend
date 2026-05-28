const rateLimits = new Map();

/**
 * Optional Rate Limiting Middleware (In-memory, prep for Redis later)
 * Limits requests per user or IP within a rolling window.
 */
export const optionalRateLimit = (req, res, next) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const key = req.user ? req.user.id : ip;

  const limit = 30; // Max 30 requests
  const windowMs = 60 * 1000; // per 1 minute

  const now = Date.now();
  if (!rateLimits.has(key)) {
    rateLimits.set(key, []);
  }

  const timestamps = rateLimits.get(key);
  const activeTimestamps = timestamps.filter((timestamp) => now - timestamp < windowMs);
  
  if (activeTimestamps.length >= limit) {
    return res.status(429).json({
      error: "Too many requests. Please pace your interactions with Cody.",
      retryAfter: Math.round((windowMs - (now - activeTimestamps[0])) / 1000)
    });
  }

  activeTimestamps.push(now);
  rateLimits.set(key, activeTimestamps);

  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", limit - activeTimestamps.length);

  next();
};
