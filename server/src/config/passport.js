const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error("Google account email not available"), null);
        }

        let user = await User.findOne({
          $or: [
            { googleId: profile.id },
            { email: email.toLowerCase() },
          ],
        });

        if (!user) {
          user = await User.create({
            name: profile.displayName,
            email: email.toLowerCase(),
            password: null,
            authProvider: "google",
            googleId: profile.id,
            avatar: profile.photos?.[0]?.value || "",
          });
        } else {
          user.googleId = profile.id;
          user.authProvider = "google";
          user.name = profile.displayName || user.name;
          user.avatar = profile.photos?.[0]?.value || user.avatar;

          await user.save();
        }

        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

module.exports = passport;