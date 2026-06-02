import passport from "passport";
import {Strategy as GoogleStrategy} from "passport-google-oauth20";
import prisma from "./prisma.js";
// console.log("Google ClientID:", process.env.OAUTH_CLIENT_ID);
// console.log(
//   "Google ClientSecret:",
//   process.env.OAUTH_CLIENT_SECRET ? "Loaded" : "Missing"
// );
// console.log("ClientID type:", typeof process.env.OAUTH_CLIENT_ID);
// console.log("ClientID length:", process.env.OAUTH_CLIENT_ID.length);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL || "http://localhost:5000"}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value.trim().toLowerCase();

        let user = await prisma.user.findUnique({
          where: { oauthId: profile.id },
        });

        if (!user) {
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          if (existingUser) {
            const isGoogleEmailVerified = profile._json && (profile._json.email_verified === true || profile._json.email_verified === "true");

            if (isGoogleEmailVerified) {
              user = await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  oauthId: profile.id,
                  provider: "google",
                  emailVerified: true,
                  emailVerifiedAt: existingUser.emailVerifiedAt || new Date(),
                },
              });
            } else {
              return done(new Error("Unable to link account: Google email is not verified."), null);
            }
          } else {
            user = await prisma.user.create({
              data: {
                name: profile.displayName,
                email,
                oauthId: profile.id,
                password: null,
                provider: "google",
                emailVerified: true,
                emailVerifiedAt: new Date(),
              },
            });
          }
        }
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  const user = await prisma.user.findUnique({ where: { id } });
  done(null, user);
});


export default passport