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