const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export function socketAsyncHandler(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      console.error("Socket handler error:", err);
      const socket = args[0]; 
      if (socket?.emit) {
        socket.emit("error", { error: err.message || "Internal server error" });
      }
    }
  };
}

export { asyncHandler };
