import mongoose from 'mongoose';

/* ========================================
   Passenger Schema
======================================== */

const passenger = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    passport: {
      type: String,

      required: [
        function () {
          return this.ownerDocument().isNew;
        },
        'Passport number is required'
      ],

      trim: true,

      uppercase: true,

      validate: {
        validator: function (value) {
          if (
            !this.ownerDocument().isNew &&
            !this.isModified('passport')
          ) {
            return true;
          }

          return /^[A-Z]{2}[0-9]{7}$/.test(value);
        },

        message:
          'Passport number must contain 2 letters and 7 digits'
      }
    }
  },
  {
    _id: false
  }
);

/* ========================================
   Booking Schema
======================================== */

const schema = new mongoose.Schema(
  {
    /* User Reference */

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    /* Flight Reference */

    flight: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flight',
      required: true
    },

    /* Selected Seat */

    seat: {
      type: String,
      required: true
    },

    /* Passenger Information */

    passenger: {
      type: passenger,
      required: true
    },

    /* Booking Reference Number */

    pnr: {
      type: String,
      required: true,
      unique: true
    },

    /* Booking Price */

    price: {
      type: Number,
      required: true
    },

    /* Booking Status */

    status: {
      type: String,
      enum: [
        'confirmed',
        'cancelled'
      ],
      default: 'confirmed'
    }
  },
  {
    timestamps: true
  }
);

/* ========================================
   Unique Seat Booking Index
======================================== */

schema.index(
  {
    flight: 1,
    seat: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      status: 'confirmed'
    }
  }
);

/* ========================================
   Export Booking Model
======================================== */

export default mongoose.model(
  'Booking',
  schema
);