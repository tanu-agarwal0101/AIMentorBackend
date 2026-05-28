/**
 * Initializes express response headers for chunked transfer streaming.
 * Avoids full Server-Sent Events (SSE) overhead for standard MVP API consumption.
 *
 * @param {import("express").Response} res - Express response object.
 */
export const initChunkedStream = (res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  
  res.flushHeaders && res.flushHeaders();
};
