
import mongoose from 'mongoose';

/* ========================================
   Flight Schema
======================================== */

const schema = new mongoose.Schema(
  {
    /* Airline Information */

    airline: {
      type: String,
      required: true,
      trim: true
    },

    /* Flight Number */

    flightNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },

    /* Departure Airport */

    origin: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },

    /* Destination Airport */

    destination: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },

    /* Departure Date and Time */

    departure: {
      type: Date,
      required: true
    },

    /* Arrival Date and Time */

    arrival: {
      type: Date,
      required: true
    },

    /* Flight Ticket Price */

    price: {
      type: Number,
      required: true,
      min: 0
    },

    /* Aircraft Seat Capacity */

    capacity: {
      type: Number,
      default: 48,
      min: 1
    },

    /* Flight Status */

    status: {
      type: String,
      enum: [
        'scheduled',
        'delayed',
        'cancelled',
        'completed'
      ],
      default: 'scheduled'
    },

    /* Flight Delay Reason */

    delayReason: {
      type: String,
      default: '',
      trim: true
    },

    /* Flight Cancellation Reason */

    cancellationReason: {
      type: String,
      default: '',
      trim: true
    },

    /* Status Last Updated */

    statusUpdatedAt: {
      type: Date,
      default: null
    },

    /* Baggage Allowance */

    baggage: {
      type: String,
      default: '20 kg checked'
    },

    /* Aircraft Type */

    aircraft: {
      type: String,
      default: 'Airbus A320'
    }
  },
  {
    timestamps: true
  }
);

/* ========================================
   Export Flight Model
======================================== */

export default mongoose.model(
  'Flight',
  schema
);
