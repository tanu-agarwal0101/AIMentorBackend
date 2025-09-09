import jwt from "jsonwebtoken";

// without cookie
// export const authenticateJWT = (req, res, next) => {
    
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//         return res.status(401).json({
//             error: "Unauthorized"
//         })
//     }

//     const token = authHeader.split(" ")[1]

//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET)
//         req.user = decoded;
//         next()
//     } catch (error) {
//         return res.status(403).json({error: "Invalid or expired token"})
//     }
    
// }



export const authenticateJWT = (req, res, next) => {
    const token = req.cookies.token
    
    if(!token) return res.status(401).json({error: "Unauthorized"})

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};


export const socketAuth = (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) return next(new Error("Unauthorized"))
    
    const token = cookieHeader.split(";").find(c => c.trim().startsWith("token="))?.split("=")[1]
    
    if (!token) return next(new Error("Unauthorized"))
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    socket.user = decoded
    next()
  } catch (error) {
    next(new Error("Invalid or expired token"))
  }
}