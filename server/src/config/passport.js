const passport = require("passport");
const GoogleStrategy =
  require("passport-google-oauth20").Strategy;

const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
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
          profile.emails?.[0]?.value?.trim();

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
        // GOOGLE PROFILE DATA
        // ========================================

        const googleId = profile.id;

        const googleAvatar =
          profile.photos?.[0]?.value || "";

        const googleName =
          profile.displayName?.trim() ||
          "Mulaqat User";

        // ========================================
        // STEP 1
        // Find user by Google ID
        // ========================================

        let user = await User.findOne({
          googleId: googleId,
        });

        if (user) {
          // Update latest Google information

          user.googleAvatar = googleAvatar;

          // Only use Google photo if user
          // doesn't have a custom uploaded photo
          if (!user.avatar && googleAvatar) {
            user.avatar = googleAvatar;
          }

          if (googleName) {
            user.name = googleName;
          }

          await user.save();

          return done(null, user);
        }

        // ========================================
        // STEP 2
        // Find user by EMAIL
        //
        // This is important:
        // Google account + existing local account
        // with same email = SAME USER
        // ========================================

        user = await User.findOne({
          email: normalizedEmail,
        });

        if (user) {
          // Link Google account to existing account

          user.googleId = googleId;

          user.googleAvatar = googleAvatar;

          // Keep existing uploaded profile photo
          if (!user.avatar && googleAvatar) {
            user.avatar = googleAvatar;
          }

          // If this account has no password,
          // treat it as Google account.
          if (!user.password) {
            user.authProvider = "google";
          }

          // Update name only if needed
          if (!user.name && googleName) {
            user.name = googleName;
          }

          await user.save();

          console.log(
            `Google account linked with existing user: ${normalizedEmail}`
          );

          return done(null, user);
        }

        // ========================================
        // STEP 3
        // No Google ID + No email match
        // Create NEW Google user
        // ========================================

        user = await User.create({
          name: googleName,

          email: normalizedEmail,

          password: null,

          authProvider: "google",

          googleId: googleId,

          avatar: googleAvatar,

          googleAvatar: googleAvatar,
        });

        console.log(
          `New Google user created: ${normalizedEmail}`
        );

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