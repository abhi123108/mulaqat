const passport = require("passport");
const GoogleStrategy =
  require("passport-google-oauth20").Strategy;

const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL,
    },

    async (
      accessToken,
      refreshToken,
      profile,
      done
    ) => {
      try {
        // ========================================
        // GOOGLE EMAIL
        // ========================================

        const email =
          profile.emails?.[0]?.value;

        if (!email) {
          return done(
            new Error(
              "Google account email not available"
            ),
            null
          );
        }

        const normalizedEmail =
          email.toLowerCase();

        // ========================================
        // GOOGLE PROFILE PHOTO
        // ========================================

        const googleAvatar =
          profile.photos?.[0]?.value || "";

        // ========================================
        // FIND EXISTING USER
        // ========================================

        let user = await User.findOne({
          $or: [
            {
              googleId: profile.id,
            },
            {
              email: normalizedEmail,
            },
          ],
        });

        // ========================================
        // CREATE NEW GOOGLE USER
        // ========================================

        if (!user) {
          user = await User.create({
            name:
              profile.displayName ||
              "Mulaqat User",

            email: normalizedEmail,

            password: null,

            authProvider: "google",

            googleId: profile.id,

            // Current active avatar
            avatar: googleAvatar,

            // Permanent Google avatar
            googleAvatar: googleAvatar,
          });
        }

        // ========================================
        // EXISTING USER
        // ========================================

        else {
          user.googleId = profile.id;

          user.authProvider = "google";

          if (profile.displayName) {
            user.name =
              profile.displayName;
          }

          // ----------------------------------------
          // Always preserve latest Google photo
          // ----------------------------------------

          if (googleAvatar) {
            user.googleAvatar =
              googleAvatar;
          }

          // ----------------------------------------
          // IMPORTANT:
          // Don't overwrite custom uploaded photo.
          //
          // If avatar is empty, use Google photo.
          // Otherwise keep the user's custom photo.
          // ----------------------------------------

          if (
            !user.avatar &&
            googleAvatar
          ) {
            user.avatar =
              googleAvatar;
          }

          await user.save();
        }

        // ========================================
        // PASSPORT SUCCESS
        // ========================================

        return done(null, user);
      } catch (error) {
        console.error(
          "Google authentication error:",
          error
        );

        return done(error, null);
      }
    }
  )
);

module.exports = passport;