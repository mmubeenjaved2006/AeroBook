import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

import passport, {
  googleEnabled
} from '../config/passport.js';

import User from '../models/User.js';

import {
  auth
} from '../middleware/auth.js';

import {
  signToken,
  publicUser,
  cookieOptions
} from '../utils/token.js';

import {
  sendPasswordResetEmail
} from '../services/emailService.js';

/* ========================================
   Initialize Authentication Router
======================================== */

const r = Router();

/* ========================================
   Password Reset Configuration
======================================== */

const RESET_TOKEN_EXPIRY = 15 * 60 * 1000;

const RESET_REQUEST_COOLDOWN = 60 * 1000;

const RESET_RESPONSE = {
  message:
    'If an eligible account exists, a password reset link will be sent to your email.'
};

/* ========================================
   Set Authentication Cookie
======================================== */

const setCookie = (res, user) => {
  return res.cookie(
    'aerobook_token',
    signToken(user),
    cookieOptions()
  );
};

/* ========================================
   User Registration / Signup
======================================== */

r.post('/signup', async (req, res, next) => {
  try {
    const {
      name,
      email,
      password
    } = req.body;

    /* Validate User Input */

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !email.includes('@') ||
      typeof password !== 'string' ||
      password.length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({
        message:
          'Name, valid email and password (8+ characters, maximum 72 bytes) required'
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    /* Check Existing Email */

    if (
      await User.exists({
        email: normalizedEmail
      })
    ) {
      return res.status(409).json({
        message: 'Email already registered'
      });
    }

    /* Create New User */

    const user = await User.create({
      name: name.trim(),

      email: normalizedEmail,

      password: await bcrypt.hash(
        password,
        12
      )
    });

    /* Set Authentication Cookie */

    setCookie(res, user);

    /* Send Registration Response */

    res.status(201).json({
      user: publicUser(user)
    });

  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({
        message: 'Email already registered'
      });
    }

    next(e);
  }
});

/* ========================================
   User Login
======================================== */

r.post('/login', async (req, res, next) => {
  try {
    const {
      email,
      password
    } = req.body;

    /* Validate Login Input */

    if (
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        message: 'Email and password required'
      });
    }

    /* Find User by Email */

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    }).select('+password');

    /* Verify Password */

    if (
      !user?.password ||
      !(await bcrypt.compare(
        password,
        user.password
      ))
    ) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    /* Set Authentication Cookie */

    setCookie(res, user);

    /* Send Login Response */

    res.json({
      user: publicUser(user)
    });

  } catch (e) {
    next(e);
  }
});

/* ========================================
   Forgot Password
======================================== */

r.post(
  '/forgot-password',
  async (req, res, next) => {
    try {
      const {
        email
      } = req.body;

      /* Validate Email */

      if (
        typeof email !== 'string' ||
        !email.trim().includes('@') ||
        email.length > 254
      ) {
        return res.status(400).json({
          message: 'Please enter a valid email address'
        });
      }

      const normalizedEmail = email
        .trim()
        .toLowerCase();

      /* Find Registered User */

      const user = await User.findOne({
        email: normalizedEmail
      }).select('+password');

      /* Prevent Account Enumeration */

      if (!user || !user.password) {
        return res.json(RESET_RESPONSE);
      }

      /* Generate Secure Reset Token */

      const resetToken = crypto
        .randomBytes(32)
        .toString('hex');

      /* Hash Token Before Database Storage */

      const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      const now = Date.now();

      /* Store Token and Enforce Cooldown */

      const updatedUser =
        await User.findOneAndUpdate(
          {
            _id: user._id,

            $or: [
              {
                passwordResetRequestedAt: {
                  $exists: false
                }
              },
              {
                passwordResetRequestedAt: null
              },
              {
                passwordResetRequestedAt: {
                  $lte: new Date(
                    now - RESET_REQUEST_COOLDOWN
                  )
                }
              }
            ]
          },
          {
            $set: {
              passwordResetToken: hashedToken,

              passwordResetExpires: new Date(
                now + RESET_TOKEN_EXPIRY
              ),

              passwordResetRequestedAt:
                new Date(now)
            }
          },
          {
            new: true
          }
        );

      /* Prevent Repeated Reset Requests */

      if (!updatedUser) {
        return res.json(RESET_RESPONSE);
      }

      try {
        /* Create Password Reset URL */

        const frontendURL = new URL(
          process.env.FRONTEND_URL
        );

        const resetURL = new URL(
          '/reset-password',
          frontendURL
        );

        resetURL.searchParams.set(
          'token',
          resetToken
        );

        /* Send Password Reset Email */

        await sendPasswordResetEmail({
          to: user.email,

          name: user.name,

          resetURL: resetURL.toString()
        });

      } catch (emailError) {

        /* Remove Failed Reset Token */

        await User.updateOne(
          {
            _id: user._id,
            passwordResetToken: hashedToken
          },
          {
            $unset: {
              passwordResetToken: '',
              passwordResetExpires: ''
            }
          }
        );

        console.error(
          'Password reset email failed:',
          emailError.code || 'EMAIL_ERROR'
        );
      }

      /* Send Generic Response */

      return res.json(RESET_RESPONSE);

    } catch (e) {
      next(e);
    }
  }
);

/* ========================================
   Verify Password Reset Token
======================================== */

r.get(
  '/verify-reset-token',
  async (req, res, next) => {
    try {
      const {
        token
      } = req.query;

      /* Validate Token Format */

      if (
        typeof token !== 'string' ||
        !/^[a-f0-9]{64}$/i.test(token)
      ) {
        return res.status(400).json({
          valid: false,

          message:
            'Invalid password reset link'
        });
      }

      /* Hash Received Token */

      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      /* Check Token and Expiry */

      const user = await User.exists({
        passwordResetToken: hashedToken,

        passwordResetExpires: {
          $gt: new Date()
        }
      });

      if (!user) {
        return res.status(400).json({
          valid: false,

          message:
            'Password reset link is invalid or expired'
        });
      }

      /* Token Is Valid */

      return res.json({
        valid: true,

        message: 'Reset token is valid'
      });

    } catch (e) {
      next(e);
    }
  }
);

/* ========================================
   Reset Password
======================================== */

r.post(
  '/reset-password',
  async (req, res, next) => {
    try {
      const {
        token,
        password,
        confirmPassword
      } = req.body;

      /* Validate Reset Token */

      if (
        typeof token !== 'string' ||
        !/^[a-f0-9]{64}$/i.test(token)
      ) {
        return res.status(400).json({
          message: 'Invalid password reset token'
        });
      }

      /* Validate New Password */

      if (
        typeof password !== 'string' ||
        password.length < 8 ||
        Buffer.byteLength(password, 'utf8') > 72
      ) {
        return res.status(400).json({
          message:
            'Password must contain at least 8 characters and a maximum of 72 bytes'
        });
      }

      /* Confirm Password */

      if (password !== confirmPassword) {
        return res.status(400).json({
          message: 'Passwords do not match'
        });
      }

      /* Hash Reset Token */

      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      /* Find Valid Reset Token */

      const user = await User.findOne({
        passwordResetToken: hashedToken,

        passwordResetExpires: {
          $gt: new Date()
        }
      }).select('+password');

      if (!user) {
        return res.status(400).json({
          message:
            'Password reset link is invalid or expired'
        });
      }

      /* Prevent Reusing Current Password */

      if (
        user.password &&
        await bcrypt.compare(
          password,
          user.password
        )
      ) {
        return res.status(400).json({
          message:
            'New password must be different from your current password'
        });
      }

      /* Hash New Password */

      const hashedPassword =
        await bcrypt.hash(password, 12);

      /* Update Password and Invalidate Token */

      const updatedUser =
        await User.findOneAndUpdate(
          {
            _id: user._id,

            passwordResetToken: hashedToken,

            passwordResetExpires: {
              $gt: new Date()
            }
          },
          {
            $set: {
              password: hashedPassword,

              passwordChangedAt: new Date()
            },

            $unset: {
              passwordResetToken: '',

              passwordResetExpires: '',

              passwordResetRequestedAt: ''
            }
          },
          {
            new: true
          }
        );

      /* Prevent Multiple Token Usage */

      if (!updatedUser) {
        return res.status(400).json({
          message:
            'Password reset link has expired or already been used'
        });
      }

      /* Clear Current Authentication Cookie */

      res.clearCookie('aerobook_token', {
        ...cookieOptions(),
        maxAge: undefined
      });

      /* Send Success Response */

      return res.json({
        success: true,

        message:
          'Password reset successfully. Please login with your new password.'
      });

    } catch (e) {
      next(e);
    }
  }
);

/* ========================================
   Get Current Authenticated User
======================================== */

r.get('/me', auth, (req, res) => {
  res.json({
    user: publicUser(req.user)
  });
});

/* ========================================
   User Logout
======================================== */

r.post('/logout', (req, res) => {

  /* Clear Authentication Cookie */

  res.clearCookie('aerobook_token', {
    ...cookieOptions(),
    maxAge: undefined
  });

  /* Send Logout Response */

  res.json({
    message: 'Signed out'
  });
});

/* ========================================
   Google OAuth Login
======================================== */

r.get('/google', (req, res, next) => {

  /* Check Google OAuth Configuration */

  if (!googleEnabled) {
    return res
      .status(503)
      .send(
        'Google OAuth is not configured. See backend/.env.example'
      );
  }

  /* Start Google Authentication */

  passport.authenticate('google', {
    scope: [
      'profile',
      'email'
    ],

    session: false

  })(req, res, next);
});

/* ========================================
   Google OAuth Callback
======================================== */

r.get(
  '/google/callback',
  (req, res, next) => {

    /* Check Google OAuth Configuration */

    if (!googleEnabled) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=google_not_configured`
      );
    }

    /* Authenticate Google User */

    passport.authenticate(
      'google',
      {
        session: false,

        failureRedirect:
          `${process.env.FRONTEND_URL}/login?error=google_failed`
      },
      (err, user) => {

        /* Handle Authentication Failure */

        if (err || !user) {
          return res.redirect(
            `${process.env.FRONTEND_URL}/login?error=google_failed`
          );
        }

        /* Set Authentication Cookie */

        setCookie(res, user);

        /* Redirect to Frontend */

        res.redirect(
          `${process.env.FRONTEND_URL}/auth/success`
        );
      }
    )(req, res, next);
  }
);

/* ========================================
   Export Authentication Router
======================================== */

export default r;