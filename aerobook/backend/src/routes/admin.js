
import { Router } from 'express';
import mongoose from 'mongoose';

import {
  auth,
  admin
} from '../middleware/auth.js';

import User from '../models/User.js';
import Flight from '../models/Flight.js';
import Booking from '../models/Booking.js';

const r = Router();

r.use(auth, admin);

/* ========================================
   Admin Dashboard Statistics
======================================== */

r.get('/stats', async (req, res, next) => {
  try {
    const [
      flights,
      bookings,
      users,
      cancelledBookings,
      revenueResult,
      latest,
      flightList,
      bookingActivity,
      revenueActivity,
      occupancyResult
    ] = await Promise.all([
      Flight.countDocuments(),

      Booking.countDocuments({
        status: 'confirmed'
      }),

      User.countDocuments(),

      Booking.countDocuments({
        status: 'cancelled'
      }),

      Booking.aggregate([
        {
          $match: {
            status: 'confirmed'
          }
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: '$price'
            }
          }
        }
      ]),

      Booking.find()
        .populate(
          'flight',
          'flightNumber origin destination'
        )
        .populate('user', 'name')
        .sort({ createdAt: -1 })
        .limit(8),

      Flight.find()
        .select(
          'airline flightNumber origin destination capacity price departure status'
        )
        .sort({ departure: 1 })
        .lean(),

      Booking.aggregate([
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
                timezone: 'Asia/Karachi'
              }
            },
            total: { $sum: 1 },
            confirmed: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'confirmed'] },
                  1,
                  0
                ]
              }
            },
            cancelled: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'cancelled'] },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 14 },
        { $sort: { _id: 1 } }
      ]),

      Booking.aggregate([
        {
          $match: {
            status: 'confirmed'
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
                timezone: 'Asia/Karachi'
              }
            },
            revenue: { $sum: '$price' },
            bookings: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 14 },
        { $sort: { _id: 1 } }
      ]),

      Booking.aggregate([
        {
          $match: {
            status: 'confirmed'
          }
        },
        {
          $group: {
            _id: '$flight',
            bookedSeats: { $sum: 1 }
          }
        }
      ])
    ]);

    const bookedSeatMap = new Map(
      occupancyResult.map((item) => [
        String(item._id),
        item.bookedSeats
      ])
    );

    const occupancy = flightList.map((flight) => {
      const capacity = Number(flight.capacity) || 0;

      const bookedSeats =
        bookedSeatMap.get(String(flight._id)) || 0;

      return {
        _id: flight._id,
        airline: flight.airline,
        flightNumber: flight.flightNumber,
        origin: flight.origin,
        destination: flight.destination,
        departure: flight.departure,
        price: flight.price,
        status: flight.status,
        capacity,
        bookedSeats,
        availableSeats: Math.max(
          0,
          capacity - bookedSeats
        ),
        occupancyRate: capacity > 0
          ? Math.round((bookedSeats / capacity) * 100)
          : 0
      };
    });

    res.json({
      flights,
      bookings,
      users,
      revenue: revenueResult[0]?.total || 0,
      latest,
      confirmedPassengers: bookings,
      cancelledBookings,
      totalReservations: bookings + cancelledBookings,

      bookingActivity: bookingActivity.map((item) => ({
        date: item._id,
        total: item.total,
        confirmed: item.confirmed,
        cancelled: item.cancelled
      })),

      revenueActivity: revenueActivity.map((item) => ({
        date: item._id,
        revenue: item.revenue,
        bookings: item.bookings
      })),

      occupancy
    });
  } catch (e) {
    next(e);
  }
});

/* ========================================
   All Flights (Admin Only)
======================================== */

r.get('/flights', async (req, res, next) => {
  try {
    const flights = await Flight.find()
      .sort({ departure: -1 })
      .limit(500)
      .lean();

    res.json({
      flights
    });
  } catch (e) {
    next(e);
  }
});

/* ========================================
   All Bookings
======================================== */

r.get('/bookings', async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('flight')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ bookings });
  } catch (e) {
    next(e);
  }
});

/* ========================================
   All Users
======================================== */

r.get('/users', async (req, res, next) => {
  try {
    const [users, totalUsers, adminUsers] =
      await Promise.all([
        User.find()
          .select('-password -googleId')
          .sort({ createdAt: -1 })
          .limit(200)
          .lean(),

        User.countDocuments(),

        User.countDocuments({
          role: 'admin'
        })
      ]);

    res.json({
      users,
      totalUsers,
      adminUsers,
      regularUsers: totalUsers - adminUsers
    });
  } catch (e) {
    next(e);
  }
});

/* ========================================
   Update User Role (Admin Only)
======================================== */

r.patch('/users/:id/role', async (req, res, next) => {
  const { id } = req.params;
  const { role } = req.body || {};

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      message: 'Invalid user ID'
    });
  }

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({
      message: 'Role must be user or admin'
    });
  }

  if (String(req.user._id) === String(id)) {
    return res.status(403).json({
      message: 'You cannot change your own role'
    });
  }

  let session;

  try {
    session = await mongoose.startSession();

    let updatedUser;

    await session.withTransaction(async () => {
      const target = await User.findById(id).session(session);

      if (!target) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      if (target.role === role) {
        updatedUser = target;
        return;
      }

      if (target.role === 'admin' && role === 'user') {
        const adminCount = await User.countDocuments({
          role: 'admin'
        }).session(session);

        if (adminCount <= 1) {
          const error = new Error(
            'Cannot remove the last administrator'
          );
          error.statusCode = 409;
          throw error;
        }
      }

      target.role = role;

      await target.save({ session });

      updatedUser = target;
    });

    res.json({
      message: 'User role updated successfully',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (e) {
    if (e.statusCode) {
      return res.status(e.statusCode).json({
        message: e.message
      });
    }

    next(e);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

/* ========================================
   Update Flight Status (Admin Only)
======================================== */

r.patch('/flights/:id/status', async (req, res, next) => {
  const { id } = req.params;
  const { status, reason } = req.body || {};

  const allowedStatuses = [
    'scheduled',
    'delayed',
    'cancelled',
    'completed'
  ];

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      message: 'Invalid flight ID'
    });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: 'Invalid flight status'
    });
  }

  if (
    reason !== undefined &&
    typeof reason !== 'string'
  ) {
    return res.status(400).json({
      message: 'Reason must be a string'
    });
  }

  const cleanReason = (reason || '').trim();

  if (cleanReason.length > 500) {
    return res.status(400).json({
      message: 'Reason cannot exceed 500 characters'
    });
  }

  if (
    ['delayed', 'cancelled'].includes(status) &&
    !cleanReason
  ) {
    return res.status(400).json({
      message: 'Please provide a reason'
    });
  }

  try {
    const flight = await Flight.findById(id);

    if (!flight) {
      return res.status(404).json({
        message: 'Flight not found'
      });
    }

    if (flight.status === status) {
      return res.status(409).json({
        message: 'Flight already has this status'
      });
    }

    if (
      ['cancelled', 'completed'].includes(flight.status)
    ) {
      return res.status(409).json({
        message:
          'Cancelled or completed flights cannot be reopened'
      });
    }

    const previousStatus = flight.status;

    flight.status = status;

    flight.statusUpdatedAt = new Date();

    flight.delayReason =
      status === 'delayed' ? cleanReason : '';

    flight.cancellationReason =
      status === 'cancelled' ? cleanReason : '';

    await flight.save();

    const affectedBookings = await Booking.countDocuments({
      flight: flight._id,
      status: 'confirmed'
    });

    res.json({
      message: `Flight status updated to ${status}`,
      previousStatus,
      flight,
      affectedBookings
    });
  } catch (e) {
    next(e);
  }
});

export default r;
