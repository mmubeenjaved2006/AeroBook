
import { Router } from 'express';
import mongoose from 'mongoose';

import Flight from '../models/Flight.js';
import Booking from '../models/Booking.js';

import {
  auth,
  admin
} from '../middleware/auth.js';

const r = Router();

/* ========================================
   Editable Flight Fields
======================================== */

const editableFields = [
  'airline',
  'flightNumber',
  'origin',
  'destination',
  'departure',
  'arrival',
  'price',
  'capacity',
  'aircraft',
  'baggage'
];

const protectedFields = [...editableFields];

const normalizeString = (value) =>
  typeof value === 'string'
    ? value.trim()
    : value;

function validId(id) {
  return mongoose.isValidObjectId(id);
}

/* ========================================
   Flight Validation
======================================== */

function validateFlight(data) {
  const requiredText = [
    'airline',
    'flightNumber',
    'origin',
    'destination'
  ];

  for (const field of requiredText) {
    if (
      typeof data[field] !== 'string' ||
      !data[field].trim()
    ) {
      return `${field} is required`;
    }
  }

  const departure = new Date(data.departure);
  const arrival = new Date(data.arrival);

  if (
    !Number.isFinite(departure.getTime()) ||
    !Number.isFinite(arrival.getTime())
  ) {
    return 'Valid departure and arrival dates are required';
  }

  if (arrival <= departure) {
    return 'Arrival must be after departure';
  }

  if (
    !Number.isFinite(Number(data.price)) ||
    Number(data.price) < 0
  ) {
    return 'Price must be zero or greater';
  }

  if (
    !Number.isInteger(Number(data.capacity)) ||
    Number(data.capacity) < 1
  ) {
    return 'Capacity must be a positive whole number';
  }

  if (
    ![
      'scheduled',
      'delayed',
      'cancelled',
      'completed'
    ].includes(data.status)
  ) {
    return 'Invalid flight status';
  }

  if (
    data.origin.trim().toUpperCase() ===
    data.destination.trim().toUpperCase()
  ) {
    return 'Origin and destination must be different';
  }

  return null;
}

/* ========================================
   Normalize Flight Data
======================================== */

function normalizeFlight(data) {
  return {
    ...data,

    airline: normalizeString(data.airline),

    flightNumber:
      normalizeString(data.flightNumber)?.toUpperCase(),

    origin:
      normalizeString(data.origin)?.toUpperCase(),

    destination:
      normalizeString(data.destination)?.toUpperCase(),

    price: Number(data.price),

    capacity: Number(data.capacity),

    aircraft: normalizeString(data.aircraft),

    baggage: normalizeString(data.baggage)
  };
}

/* ========================================
   Get All Flights / Search Flights
======================================== */

r.get('/', async (req, res, next) => {
  try {
    const { from, to, date } = req.query;

    const filter = {
      status: {
        $in: ['scheduled', 'delayed']
      }
    };

    if (from) {
      filter.origin = String(from)
        .trim()
        .toUpperCase();
    }

    if (to) {
      filter.destination = String(to)
        .trim()
        .toUpperCase();
    }

    if (date) {
      const value = String(date);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return res.status(400).json({
          message: 'Invalid date'
        });
      }

      const start = new Date(
        `${value}T00:00:00.000Z`
      );

      if (
        Number.isNaN(start.getTime()) ||
        start.toISOString().slice(0, 10) !== value
      ) {
        return res.status(400).json({
          message: 'Invalid date'
        });
      }

      filter.departure = {
        $gte: start,
        $lt: new Date(
          start.getTime() + 86400000
        )
      };
    }

    const flights = await Flight.find(filter)
      .sort({ departure: 1 })
      .limit(100)
      .lean();

    res.json({ flights });
  } catch (e) {
    next(e);
  }
});

/* ========================================
   Get Single Flight Details
======================================== */

r.get('/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid flight ID'
      });
    }

    const flight = await Flight.findById(
      req.params.id
    ).lean();

    if (!flight) {
      return res.status(404).json({
        message: 'Flight not found'
      });
    }

    const bookings = await Booking.find({
      flight: flight._id,
      status: 'confirmed'
    }).select('seat -_id');

    res.json({
      flight,
      occupied: bookings.map(
        (booking) => booking.seat
      ),
      bookable: [
        'scheduled',
        'delayed'
      ].includes(flight.status)
    });
  } catch (e) {
    next(e);
  }
});

/* ========================================
   Create New Flight
======================================== */

r.post('/', auth, admin, async (req, res, next) => {
  try {
    const data = normalizeFlight({
      airline: req.body.airline,
      flightNumber: req.body.flightNumber,
      origin: req.body.origin,
      destination: req.body.destination,
      departure: req.body.departure,
      arrival: req.body.arrival,
      price: req.body.price,
      capacity: req.body.capacity ?? 48,
      status: 'scheduled',
      aircraft:
        req.body.aircraft ?? 'Airbus A320',
      baggage:
        req.body.baggage ?? '20 kg checked'
    });

    const error = validateFlight(data);

    if (error) {
      return res.status(400).json({
        message: error
      });
    }

    const flight = await Flight.create(data);

    res.status(201).json({ flight });
  } catch (e) {
    next(e);
  }
});

/* ========================================
   Update Flight (Admin Only)
======================================== */

r.patch('/:id', auth, admin, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid flight ID'
      });
    }

    const flight = await Flight.findById(
      req.params.id
    );

    if (!flight) {
      return res.status(404).json({
        message: 'Flight not found'
      });
    }

    if (
      ['cancelled', 'completed'].includes(
        flight.status
      )
    ) {
      return res.status(409).json({
        message:
          'Cancelled or completed flights cannot be edited'
      });
    }

    const body = req.body || {};

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'status'
      )
    ) {
      return res.status(400).json({
        message:
          'Use the Admin Flight Status API to change status'
      });
    }

    const update = Object.fromEntries(
      Object.entries(body).filter(
        ([key]) => editableFields.includes(key)
      )
    );

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        message: 'No valid fields provided'
      });
    }

    const data = normalizeFlight({
      ...flight.toObject(),
      ...update
    });

    const validationError = validateFlight(data);

    if (validationError) {
      return res.status(400).json({
        message: validationError
      });
    }

    const hasConfirmedBookings =
      await Booking.exists({
        flight: flight._id,
        status: 'confirmed'
      });

    if (hasConfirmedBookings) {
      const changedProtectedFields =
        protectedFields.filter((field) => {
          if (!(field in update)) {
            return false;
          }

          if (
            ['departure', 'arrival'].includes(
              field
            )
          ) {
            return (
              new Date(data[field]).getTime() !==
              new Date(flight[field]).getTime()
            );
          }

          return (
            String(data[field]) !==
            String(flight[field])
          );
        });

      if (changedProtectedFields.length > 0) {
        return res.status(409).json({
          message:
            'This flight has confirmed bookings. Route, schedule, fare and flight details cannot be changed.',
          lockedFields: changedProtectedFields
        });
      }
    }

    Object.keys(update).forEach((field) => {
      flight[field] = data[field];
    });

    await flight.save();

    res.json({
      message: 'Flight updated successfully',
      flight
    });
  } catch (e) {
    next(e);
  }
});

/* ========================================
   Delete Flight (Admin Only)
======================================== */

r.delete('/:id', auth, admin, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid flight ID'
      });
    }

    const hasBookings = await Booking.exists({
      flight: req.params.id
    });

    if (hasBookings) {
      return res.status(409).json({
        message:
          'Cannot delete a flight with booking history'
      });
    }

    const flight = await Flight.findByIdAndDelete(
      req.params.id
    );

    if (!flight) {
      return res.status(404).json({
        message: 'Flight not found'
      });
    }

    res.json({
      message: 'Flight removed'
    });
  } catch (e) {
    next(e);
  }
});

export default r;
