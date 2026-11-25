import jwt from 'jsonwebtoken';

/* ========================================
   JWT Token Configuration
======================================== */

const TOKEN_EXPIRY = '7d';

const COOKIE_MAX_AGE =
  7 * 24 * 60 * 60 * 1000;

/* ========================================
   Generate Secure JWT Token
======================================== */

export const signToken = (user) => {
  return jwt.sign(
    {
      id: user.id,

      role: user.role,

      sessionIssuedAt: Date.now()
    },

    process.env.JWT_SECRET,

    {
      expiresIn: TOKEN_EXPIRY,

      algorithm: 'HS256'
    }
  );
};

/* ========================================
   Public User Information
======================================== */

export const publicUser = (user) => ({
  id: user.id,

  name: user.name,

  email: user.email,

  role: user.role,

  avatar: user.avatar
});

/* ========================================
   Secure Authentication Cookie
======================================== */

export const cookieOptions = () => {
  const isProduction =
    process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,

    secure: isProduction,

    sameSite: isProduction
      ? 'none'
      : 'lax',

    maxAge: COOKIE_MAX_AGE,

    path: '/'
  };
};