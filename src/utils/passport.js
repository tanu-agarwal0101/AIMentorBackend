import passport from "passport";
import {Strategy as GoogleStrategy} from "passport-google-oauth20";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
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
      callbackURL: `http://localhost:5000/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await prisma.user.findUnique({
          where: { oauthId: profile.id },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              name: profile.displayName,
              email: profile.emails[0].value,
              oauthId: profile.id,
              password: "",
              provider: `google`,
            },
          });
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