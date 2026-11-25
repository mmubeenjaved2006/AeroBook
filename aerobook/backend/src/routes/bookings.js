import { Router } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { waitUntil } from '@vercel/functions';

import Flight from '../models/Flight.js';
import Booking from '../models/Booking.js';
import { auth } from '../middleware/auth.js';
import { sendBookingConfirmation } from '../services/emailService.js';

// =====================================================
// AEROBOOK BOOKING ROUTES
// =====================================================

const r = Router();

r.use(auth);

// =====================================================
// HELPERS
// =====================================================

const ALLOWED_FLIGHT_STATUSES = [
  'scheduled',
  'delayed'
];

const COLORS = {
  black: '#090B10',
  dark: '#17191F',
  gold: '#D4AF58',
  goldDark: '#B99448',
  white: '#F7F5F0',
  muted: '#A6A8AD',
  border: '#34343A',
  green: '#4CAF80',
  red: '#E57373'
};

function seatList(capacity) {
  return Array.from(
    { length: capacity },
    (_, index) =>
      `${Math.floor(index / 6) + 1}${'ABCDEF'[index % 6]}`
  );
}

function bookingError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function generatePNR() {
  return crypto
    .randomBytes(5)
    .toString('hex')
    .toUpperCase();
}

function validId(id) {
  return mongoose.isValidObjectId(id);
}

function isFlightBookable(flight) {
  return Boolean(
    flight &&
    ALLOWED_FLIGHT_STATUSES.includes(flight.status) &&
    new Date(flight.departure).getTime() > Date.now()
  );
}

// =====================================================
// PASSPORT VALIDATION
// =====================================================

function normalizePassport(value) {
  return typeof value === 'string'
    ? value.trim().toUpperCase()
    : '';
}

function validPassport(value) {
  return /^[A-Z]{2}[0-9]{7}$/.test(
    normalizePassport(value)
  );
}

// =====================================================
// PASSENGER VALIDATION
// =====================================================

function validatePassenger(passenger) {
  return Boolean(
    passenger &&
    typeof passenger.name === 'string' &&
    passenger.name.trim().length > 0 &&
    typeof passenger.email === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      passenger.email.trim()
    )
  );
}

function cleanPassenger(passenger) {
  return {
    name: passenger.name.trim(),
    email: passenger.email.trim(),
    passport: normalizePassport(passenger.passport)
  };
}

// =====================================================
// PDF DRAWING HELPERS
// =====================================================

function drawText(
  doc,
  text,
  x,
  y,
  options = {}
) {
  const {
    size = 11,
    color = COLORS.white,
    font = 'Helvetica',
    width = 200,
    align = 'left'
  } = options;

  doc
    .font(font)
    .fontSize(size)
    .fillColor(color)
    .text(String(text ?? ''), x, y, {
      width,
      align,
      lineBreak: false,
      ellipsis: true
    });
}

function drawLabel(
  doc,
  label,
  x,
  y,
  width = 200
) {
  drawText(
    doc,
    label.toUpperCase(),
    x,
    y,
    {
      size: 8,
      color: COLORS.muted,
      font: 'Helvetica-Bold',
      width
    }
  );
}

function drawDivider(doc, x1, y, x2) {
  doc
    .moveTo(x1, y)
    .lineTo(x2, y)
    .lineWidth(0.8)
    .strokeColor(COLORS.border)
    .stroke();
}

function drawInfo(
  doc,
  label,
  value,
  x,
  y,
  width = 200
) {
  drawLabel(doc, label, x, y, width);

  drawText(
    doc,
    value,
    x,
    y + 17,
    {
      size: 12,
      color: COLORS.white,
      font: 'Helvetica-Bold',
      width
    }
  );
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    }
  );
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString(
    'en-GB',
    {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC'
    }
  );
}

// =====================================================
// GENERATE PREMIUM PDF TICKET
// =====================================================

async function generateTicketPdf(booking) {
  const b = booking;
  const flight = b.flight;

  if (!flight) {
    throw new Error(
      'Flight details missing for PDF ticket'
    );
  }

  const qr = await QRCode.toBuffer(
    `AEROBOOK:${b.pnr}`,
    {
      type: 'png',
      width: 300,
      margin: 1,
      color: {
        dark: '#090B10',
        light: '#FFFFFF'
      }
    }
  );

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      autoFirstPage: true,
      info: {
        Title: `AeroBook E-Ticket ${b.pnr}`,
        Author: 'AeroBook',
        Subject: 'Demo Flight Reservation',
        Creator: 'AeroBook Booking System'
      }
    });

    const chunks = [];

    doc.on('data', (chunk) => {
      chunks.push(chunk);
    });

    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on('error', reject);

    try {
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      const left = 48;
      const right = pageWidth - 48;
      const contentWidth = right - left;

      // =================================================
      // FULL BACKGROUND
      // =================================================

      doc
        .rect(0, 0, pageWidth, pageHeight)
        .fill(COLORS.black);

      doc
        .rect(0, 0, pageWidth, 9)
        .fill(COLORS.gold);

      // =================================================
      // HEADER
      // =================================================

      doc
        .roundedRect(
          32,
          35,
          pageWidth - 64,
          105,
          12
        )
        .fill(COLORS.dark);

      drawText(
        doc,
        'AEROBOOK',
        left,
        59,
        {
          size: 27,
          color: COLORS.gold,
          font: 'Helvetica-Bold',
          width: 300
        }
      );

      drawText(
        doc,
        'PREMIUM TRAVEL EXPERIENCE',
        left,
        97,
        {
          size: 9,
          color: COLORS.muted,
          width: 300
        }
      );

      drawText(
        doc,
        'E-TICKET',
        right - 115,
        65,
        {
          size: 15,
          color: COLORS.white,
          font: 'Helvetica-Bold',
          width: 115,
          align: 'right'
        }
      );

      drawText(
        doc,
        'DEMO RESERVATION',
        right - 150,
        94,
        {
          size: 8,
          color: COLORS.gold,
          width: 150,
          align: 'right'
        }
      );

      // =================================================
      // FLIGHT ROUTE CARD
      // =================================================

      doc
        .roundedRect(
          32,
          158,
          pageWidth - 64,
          185,
          12
        )
        .fill(COLORS.dark);

      drawLabel(
        doc,
        'YOUR JOURNEY',
        left,
        178,
        200
      );

      drawText(
        doc,
        flight.origin,
        left,
        207,
        {
          size: 39,
          color: COLORS.white,
          font: 'Helvetica-Bold',
          width: 160
        }
      );

      drawText(
        doc,
        flight.destination,
        right - 160,
        207,
        {
          size: 39,
          color: COLORS.white,
          font: 'Helvetica-Bold',
          width: 160,
          align: 'right'
        }
      );

      // =================================================
      // ROUTE CONNECTOR
      // =================================================

      doc
        .moveTo(220, 235)
        .lineTo(375, 235)
        .lineWidth(1.5)
        .strokeColor(COLORS.gold)
        .dash(5, { space: 5 })
        .stroke();

      doc.undash();

      doc
        .circle(220, 235, 4)
        .fill(COLORS.gold);

      doc
        .circle(375, 235, 4)
        .fill(COLORS.gold);

      drawText(
        doc,
        'FLIGHT',
        265,
        209,
        {
          size: 9,
          color: COLORS.muted,
          width: 65,
          align: 'center'
        }
      );

      drawText(
        doc,
        flight.flightNumber,
        250,
        249,
        {
          size: 13,
          color: COLORS.gold,
          font: 'Helvetica-Bold',
          width: 95,
          align: 'center'
        }
      );

      drawDivider(
        doc,
        left,
        288,
        right
      );

      drawInfo(
        doc,
        'Airline',
        flight.airline,
        left,
        301,
        250
      );

      drawInfo(
        doc,
        'Aircraft',
        flight.aircraft || 'Aircraft',
        right - 175,
        301,
        175
      );

      // =================================================
      // PASSENGER DETAILS
      // =================================================

      doc
        .roundedRect(
          32,
          360,
          pageWidth - 64,
          190,
          12
        )
        .fill(COLORS.dark);

      drawText(
        doc,
        'PASSENGER DETAILS',
        left,
        379,
        {
          size: 13,
          color: COLORS.gold,
          font: 'Helvetica-Bold',
          width: 300
        }
      );

      drawDivider(
        doc,
        left,
        410,
        right
      );

      drawInfo(
        doc,
        'Passenger Name',
        b.passenger.name,
        left,
        425,
        285
      );

      drawInfo(
        doc,
        'Seat Number',
        b.seat,
        right - 135,
        425,
        135
      );

      drawInfo(
        doc,
        'Departure Date',
        formatDate(flight.departure),
        left,
        486,
        155
      );

      drawInfo(
        doc,
        'Departure Time (UTC)',
        formatTime(flight.departure),
        220,
        486,
        160
      );

      drawInfo(
        doc,
        'Arrival Time (UTC)',
        formatTime(flight.arrival),
        right - 150,
        486,
        150
      );

      // =================================================
      // BOOKING REFERENCE CARD
      // =================================================

      doc
        .roundedRect(
          32,
          567,
          pageWidth - 64,
          96,
          12
        )
        .fill(COLORS.dark);

      drawInfo(
        doc,
        'Booking Reference',
        b.pnr,
        left,
        589,
        200
      );

      drawInfo(
        doc,
        'Booking Status',
        b.status.toUpperCase(),
        270,
        589,
        125
      );

      drawInfo(
        doc,
        'Total Fare',
        `PKR ${Number(b.price).toLocaleString(
          'en-PK'
        )}`,
        right - 145,
        589,
        145
      );

      // =================================================
      // QR CODE CARD
      // =================================================

      doc
        .roundedRect(
          32,
          680,
          pageWidth - 64,
          112,
          12
        )
        .fill(COLORS.dark);

      doc
        .roundedRect(
          left,
          690,
          92,
          92,
          6
        )
        .fill('#FFFFFF');

      doc.image(
        qr,
        left + 6,
        696,
        {
          width: 80,
          height: 80
        }
      );

      drawText(
        doc,
        'SCAN YOUR BOOKING QR',
        160,
        701,
        {
          size: 13,
          color: COLORS.gold,
          font: 'Helvetica-Bold',
          width: 310
        }
      );

      drawText(
        doc,
        `REFERENCE: ${b.pnr}`,
        160,
        728,
        {
          size: 11,
          color: COLORS.white,
          font: 'Helvetica-Bold',
          width: 310
        }
      );

      drawText(
        doc,
        'Keep this document for your records.',
        160,
        750,
        {
          size: 9,
          color: COLORS.muted,
          width: 340
        }
      );

      // =================================================
      // DEMO DISCLAIMER
      // =================================================

      drawText(
        doc,
        'DEMO RESERVATION ONLY - NOT VALID FOR AIRLINE TRAVEL',
        left,
        805,
        {
          size: 8,
          color: COLORS.gold,
          font: 'Helvetica-Bold',
          width: contentWidth,
          align: 'center'
        }
      );

      doc.end();

    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
}

// =====================================================
// AUTOMATIC BOOKING CONFIRMATION EMAILS
// =====================================================

// =====================================================
// AUTOMATIC BOOKING CONFIRMATION EMAILS
// LOCALHOST + VERCEL SUPPORT
// =====================================================

function queueBookingEmails(bookings, flight) {

  const sendEmails = async () => {
    try {

      const results = await Promise.allSettled(
        bookings.map(async (booking) => {

          const pdfBuffer =
            await generateTicketPdf({
              ...booking.toObject(),
              flight
            });

          await sendBookingConfirmation({
            booking,
            flight,
            pdfBuffer
          });

          console.log(
            `Booking confirmation sent: ${booking.pnr}`
          );

        })
      );

      results.forEach((result, index) => {

        if (result.status === 'rejected') {
          console.error(
            `Email failed for PNR ${bookings[index].pnr}:`,
            result.reason?.code || 'EMAIL_ERROR'
          );
        }

      });

    } catch (error) {

      console.error(
        'Booking email processing failed:',
        error.code || 'EMAIL_ERROR'
      );

    }
  };

  /* ========================================
     Vercel Production Environment
  ======================================== */

  if (process.env.VERCEL === '1') {

    waitUntil(sendEmails());

    return;
  }

  /* ========================================
     Local Development Environment
  ======================================== */

  setImmediate(() => {
    void sendEmails();
  });
}

// =====================================================
// SINGLE PASSENGER BOOKING
// POST /api/bookings
// =====================================================

r.post('/', async (req, res, next) => {
  try {
    const {
      flightId,
      seat,
      passenger
    } = req.body || {};

    if (!validId(flightId)) {
      return res.status(400).json({
        message: 'Invalid flight ID'
      });
    }

    // Validate passenger details

    if (!validatePassenger(passenger)) {
      return res.status(400).json({
        message:
          'Passenger name and valid email required'
      });
    }

    // Validate passport number

    if (!validPassport(passenger.passport)) {
      return res.status(400).json({
        message:
          'Passport number must contain 2 letters and 7 digits (demo format)'
      });
    }

    // Find flight

    const flight = await Flight.findById(
      flightId
    );

    // Flight status protection

    if (!isFlightBookable(flight)) {
      return res.status(400).json({
        message:
          'Flight is unavailable for booking'
      });
    }

    // Seat validation

    if (
      !seatList(flight.capacity).includes(seat)
    ) {
      return res.status(400).json({
        message: 'Invalid seat'
      });
    }

    // Capacity check

    const active =
      await Booking.countDocuments({
        flight: flight.id,
        status: 'confirmed'
      });

    if (active >= flight.capacity) {
      return res.status(409).json({
        message: 'Flight is full'
      });
    }

    // Check seat availability

    const taken = await Booking.exists({
      flight: flight.id,
      seat,
      status: 'confirmed'
    });

    if (taken) {
      return res.status(409).json({
        message:
          'Seat already booked. Select another.'
      });
    }

    // Create booking

    const booking = await Booking.create({
      user: req.user.id,
      flight: flight.id,
      seat,
      passenger: cleanPassenger(passenger),
      price: flight.price,
      pnr: generatePNR(),
      status: 'confirmed'
    });

    res.status(201).json({
      booking
    });

    // Send PDF ticket email

    queueBookingEmails(
      [booking],
      flight
    );

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          'Seat was just booked. Please select another.'
      });
    }

    next(error);
  }
});

// =====================================================
// GROUP BOOKING
// POST /api/bookings/group
// =====================================================

r.post('/group', async (req, res, next) => {
  let session;

  try {
    const {
      flightId,
      passengers
    } = req.body || {};

    if (!validId(flightId)) {
      return res.status(400).json({
        message: 'Invalid flight ID'
      });
    }

    // Passenger count validation

    if (
      !Array.isArray(passengers) ||
      passengers.length < 1 ||
      passengers.length > 6
    ) {
      return res.status(400).json({
        message:
          'Select between 1 and 6 passengers'
      });
    }

    // Find flight

    const flight = await Flight.findById(
      flightId
    );

    if (!isFlightBookable(flight)) {
      return res.status(400).json({
        message:
          'Flight is unavailable for booking'
      });
    }

    // Validate passengers

    const validSeats = seatList(
      flight.capacity
    );

    const selectedSeats = new Set();
    const selectedPassports = new Set();

    for (const passenger of passengers) {

      // Name and email validation

      if (!validatePassenger(passenger)) {
        return res.status(400).json({
          message:
            'Every passenger must have a valid name and email'
        });
      }

      // Passport format validation

      if (!validPassport(passenger.passport)) {
        return res.status(400).json({
          message:
            'Every passenger needs a passport number with 2 letters and 7 digits (demo format)'
        });
      }

      const passport = normalizePassport(
        passenger.passport
      );

      // Duplicate passport protection

      if (selectedPassports.has(passport)) {
        return res.status(400).json({
          message:
            'Each passenger must have a different passport number'
        });
      }

      selectedPassports.add(passport);

      // Seat validation

      if (
        !validSeats.includes(passenger.seat)
      ) {
        return res.status(400).json({
          message:
            `Invalid seat: ${passenger.seat}`
        });
      }

      // Duplicate seat protection

      if (
        selectedSeats.has(passenger.seat)
      ) {
        return res.status(400).json({
          message:
            'Each passenger must select a different seat'
        });
      }

      selectedSeats.add(passenger.seat);
    }

    // =================================================
    // START TRANSACTION
    // =================================================

    session = await Booking.startSession();

    let bookings = [];

    await session.withTransaction(
      async () => {
        const currentFlight =
          await Flight.findById(
            flightId
          ).session(session);

        // Flight status protection

        if (!isFlightBookable(currentFlight)) {
          throw bookingError(
            'Flight is unavailable',
            400
          );
        }

        // Capacity check

        const active =
          await Booking.countDocuments({
            flight: currentFlight.id,
            status: 'confirmed'
          }).session(session);

        if (
          active + passengers.length >
          currentFlight.capacity
        ) {
          throw bookingError(
            'Not enough seats available',
            409
          );
        }

        // Occupied seats check

        const taken = await Booking.find({
          flight: currentFlight.id,
          seat: {
            $in: [...selectedSeats]
          },
          status: 'confirmed'
        }).session(session);

        if (taken.length > 0) {
          throw bookingError(
            'One or more selected seats are already booked',
            409
          );
        }

        // Prepare booking documents

        const documents = passengers.map(
          (passenger) => ({
            user: req.user.id,
            flight: currentFlight.id,
            seat: passenger.seat,
            passenger: cleanPassenger(passenger),
            price: currentFlight.price,
            pnr: generatePNR(),
            status: 'confirmed'
          })
        );

        // Atomic booking creation

        bookings = await Booking.create(
          documents,
          {
            session,
            ordered: true
          }
        );
      }
    );

    // Booking response

    res.status(201).json({
      message: 'Group booking confirmed',
      bookings,
      totalPassengers: bookings.length,
      totalPrice: bookings.reduce(
        (sum, booking) =>
          sum + booking.price,
        0
      )
    });

    // Send individual PDF emails

    queueBookingEmails(
      bookings,
      flight
    );

  } catch (error) {
    if (
      error.code === 11000 ||
      error.code === 112 ||
      error.codeName === 'WriteConflict'
    ) {
      return res.status(409).json({
        message:
          'Seat availability changed. Please refresh and try again.'
      });
    }

    if (error.status) {
      return res.status(error.status).json({
        message: error.message
      });
    }

    next(error);

  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

// =====================================================
// GET USER BOOKINGS
// GET /api/bookings
// =====================================================

r.get('/', async (req, res, next) => {
  try {
    const bookings = await Booking.find({
      user: req.user.id
    })
      .populate('flight')
      .sort({
        createdAt: -1
      });

    res.json({
      bookings
    });

  } catch (error) {
    next(error);
  }
});

// =====================================================
// CANCEL INDIVIDUAL BOOKING
// PATCH /api/bookings/:id/cancel
// =====================================================

r.patch(
  '/:id/cancel',
  async (req, res, next) => {
    try {
      if (!validId(req.params.id)) {
        return res.status(400).json({
          message: 'Invalid booking ID'
        });
      }

      const booking =
        await Booking.findOne({
          _id: req.params.id,
          user: req.user.id
        });

      if (!booking) {
        return res.status(404).json({
          message:
            'Booking not found'
        });
      }

      if (booking.status === 'cancelled') {
        return res.json({
          message:
            'Booking is already cancelled',
          booking
        });
      }

      booking.status = 'cancelled';

      await booking.save();

      res.json({
        message:
          'Booking cancelled successfully',
        booking
      });

    } catch (error) {
      next(error);
    }
  }
);

// =====================================================
// DOWNLOAD PDF TICKET
// GET /api/bookings/:id/ticket
// =====================================================

r.get(
  '/:id/ticket',
  async (req, res, next) => {
    try {
      if (!validId(req.params.id)) {
        return res.status(400).json({
          message: 'Invalid booking ID'
        });
      }

      const booking =
        await Booking.findOne({
          _id: req.params.id,
          user: req.user.id
        }).populate('flight');

      if (!booking) {
        return res.status(404).json({
          message:
            'Booking not found'
        });
      }

      if (!booking.flight) {
        return res.status(404).json({
          message:
            'Flight details not found'
        });
      }

      const pdfBuffer =
        await generateTicketPdf(booking);

      res.setHeader(
        'Content-Type',
        'application/pdf'
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="AeroBook-${booking.pnr}.pdf"`
      );

      res.send(pdfBuffer);

    } catch (error) {
      next(error);
    }
  }
);

// =====================================================
// EXPORT ROUTER
// =====================================================

export default r;