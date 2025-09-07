export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // true only in prod so http allowed now
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days in ms
  path: "/",
};
