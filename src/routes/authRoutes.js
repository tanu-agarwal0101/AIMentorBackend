import { Router } from "express";
import { login, register } from "../controllers/authController.js";
import passport from "../utils/passport.js";
import jwt from "jsonwebtoken";
import { cookieOptions } from "../utils/cookieOptions.js";



const router = Router();
router.post('/register', register)
router.post('/login', login)

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))


// without jwt. authmiddleware wont work
// router.get(
//     '/google/callback',
//     passport.authenticate('google', {
//         failureRedirect: '/login'
//     }),
//     (req, res) => {
//         // successful login
//         res.redirect(`${process.env.FRONTEND_URL}/chat?token=${req.user.id}`)
//     }
// )


// through queries
// router.get(
//   "/google/callback",
//   passport.authenticate("google", {
//     failureRedirect: "/login",
//   }),
//   (req, res) => {
//       // successful login
//       const payload = { id: req.user.id, email: req.user.email }
//       const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '10d'})
//     res.redirect(`${process.env.FRONTEND_URL}/chat?token=${token}`);
//   }
// );


router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
  }),
  (req, res) => {

    const payload = { id: req.user.id, email: req.user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "10d",
    });
      
      res.cookie("token", token, cookieOptions)
    //   console.log(req.user.email)
      // res.redirect(`${process.env.FRONTEND_URL}/chat`);
    // res.redirect(`http://localhost:5000/api/auth/success`);
    res.redirect(`http://localhost:3000/dashboard`);
  }
);
router.get("/success", (req, res) => {
  res.send("Google login successful, cookie set!");
});


router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    ...cookieOptions,
    maxAge: undefined,
  });
  console.log("done logout")
    res.json({message: 'Logout successful'})
})
export default router;