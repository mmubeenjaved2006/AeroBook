import mongoose from 'mongoose';

/* ========================================
   User Schema
======================================== */

const schema = new mongoose.Schema(
  {
    /* User Full Name */

    name: {
      type: String,
      required: true
    },

    /* User Email Address */

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    /* User Password */

    password: String,

    /* Google OAuth Account ID */

    googleId: {
      type: String,
      sparse: true,
      unique: true
    },

    /* User Profile Picture */

    avatar: String,

    /* User Role */

    role: {
      type: String,
      enum: [
        'user',
        'admin'
      ],
      default: 'user'
    },

    /* ========================================
       Password Reset Fields
    ======================================== */

    /* Secure Hashed Password Reset Token */

    passwordResetToken: {
      type: String,
      select: false
    },

    /* Password Reset Token Expiry */

    passwordResetExpires: {
      type: Date,
      select: false
    },

    /* Last Password Reset Request */

    passwordResetRequestedAt: {
      type: Date,
      select: false
    },

    /* Last Password Change Date */

    passwordChangedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

/* ========================================
   Password Reset Token Index
======================================== */

schema.index(
  {
    passwordResetToken: 1
  },
  {
    sparse: true
  }
);

/* ========================================
   Export User Model
======================================== */

export default mongoose.model(
  'User',
  schema
);