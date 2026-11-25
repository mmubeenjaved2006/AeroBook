
import passport from 'passport';

import {
  Strategy as GoogleStrategy
} from 'passport-google-oauth20';

import User from '../models/User.js';

/* ========================================
   Check Google OAuth Configuration
======================================== */

export const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET
);

/* ========================================
   Configure Google OAuth Strategy
======================================== */

if (googleEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,

        clientSecret: process.env.GOOGLE_CLIENT_SECRET,

        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          `${process.env.BACKEND_URL}/api/auth/google/callback`
      },

      async (
        accessToken,
        refreshToken,
        profile,
        done
      ) => {
        try {
          /* Get Google Account Email */

          const email = profile.emails?.[0]?.value?.toLowerCase();

          if (!email) {
            return done(
              new Error('Google account has no email')
            );
          }

          /* Find User by Google ID */

          let user = await User.findOne({
            googleId: profile.id
          });

          /* Check if User Already Exists */

          if (!user) {
            user = await User.findOne({
              email
            });

            if (user) {
              /* Link Google Account to Existing User */

              user.googleId = profile.id;

              user.avatar ||= profile.photos?.[0]?.value;

              await user.save();
            } else {
              /* Create New User with Google Account */

              user = await User.create({
                googleId: profile.id,
                email,
                name:
                  profile.displayName ||
                  email.split('@')[0],
                avatar: profile.photos?.[0]?.value
              });
            }
          }

          /* Authentication Successful */

          done(null, user);
        } catch (err) {
          /* Authentication Error */

          done(err);
        }
      }
    )
  );
}

/* ========================================
   Export Passport Configuration
======================================== */

export default passport;
