import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import User from '../models/User.js';

/* ========================================
   Authentication Middleware
======================================== */

export async function auth(req, res, next) {
  try {

    /* Get JWT Token from Cookie or Header */

    const authorization =
      req.headers.authorization;

    const bearerToken =
      typeof authorization === 'string' &&
      /^Bearer\s+/i.test(authorization)
        ? authorization.replace(/^Bearer\s+/i, '')
        : null;

    const token =
      req.cookies?.aerobook_token ||
      bearerToken;

    /* Check if Token Exists */

    if (!token) {
      return res.status(401).json({
        message: 'Please sign in'
      });
    }

    /* Verify JWT Token */

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        algorithms: ['HS256']
      }
    );

    /* Validate Token Payload */

    if (
      !decoded ||
      typeof decoded !== 'object' ||
      !decoded.id ||
      !mongoose.isValidObjectId(decoded.id) ||
      !Number.isFinite(decoded.iat) ||
      !Number.isFinite(decoded.exp)
    ) {
      return res.status(401).json({
        message: 'Invalid authentication token'
      });
    }

    /* Find Authenticated User */

    const user = await User.findById(
      decoded.id
    ).select(
      '-password -passwordResetToken -passwordResetExpires -passwordResetRequestedAt'
    );

    if (!user) {
      return res.status(401).json({
        message: 'Account not found'
      });
    }

    /* ========================================
       Check Session Timestamp
    ======================================== */

    const tokenIssuedTimestamp =
      Number.isFinite(decoded.sessionIssuedAt)
        ? decoded.sessionIssuedAt
        : decoded.iat * 1000;

    /* Reject Invalid Future Timestamps */

    if (
      tokenIssuedTimestamp <= 0 ||
      tokenIssuedTimestamp > Date.now() + 5000
    ) {
      return res.status(401).json({
        message: 'Invalid session timestamp'
      });
    }

    /* ========================================
       Check Password Change Date
    ======================================== */

    if (user.passwordChangedAt) {

      const passwordChangedTimestamp =
        new Date(
          user.passwordChangedAt
        ).getTime();

      /* Invalidate Old Login Sessions */

      if (
        tokenIssuedTimestamp <
        passwordChangedTimestamp
      ) {
        return res.status(401).json({
          message:
            'Your password has been changed. Please sign in again.'
        });
      }
    }

    /* Attach Authenticated User */

    req.user = user;

    /* Continue to Next Middleware */

    return next();

  } catch (error) {

    /* Handle Expired Token */

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message:
          'Session expired. Please sign in again.'
      });
    }

    /* Handle Invalid Token */

    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'NotBeforeError'
    ) {
      return res.status(401).json({
        message:
          'Invalid authentication token'
      });
    }

    /* Forward Unexpected Server Errors */

    return next(error);
  }
}

/* ========================================
   Admin Authorization Middleware
======================================== */

export function admin(req, res, next) {

  /* Check Authentication */

  if (!req.user) {
    return res.status(401).json({
      message: 'Please sign in'
    });
  }

  /* Check Admin Role */

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Admin access required'
    });
  }

  /* Allow Admin Access */

  return next();
}