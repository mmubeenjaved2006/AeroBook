
import 'dotenv/config';

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import User from '../src/models/User.js';
import Flight from '../src/models/Flight.js';

/* ========================================
   MongoDB Connection
======================================== */

if (!process.env.MONGODB_URI) {
  throw Error('Set MONGODB_URI in backend/.env');
}

await mongoose.connect(process.env.MONGODB_URI);

/* ========================================
   Create Admin Account
======================================== */

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const email = process.env.ADMIN_EMAIL.toLowerCase();

  if (!(await User.exists({ email }))) {
    await User.create({
      name: 'AeroBook Admin',
      email,
      password: await bcrypt.hash(
        process.env.ADMIN_PASSWORD,
        12
      ),
      role: 'admin'
    });
  }
}

/* ========================================
   Demo Flight Routes
======================================== */

const routes = [
  [
    'Emirates',
    'EK622',
    'LHE',
    'DXB',
    188500,
    4
  ],
  [
    'Qatar Airways',
    'QR620',
    'LHE',
    'DOH',
    195000,
    6
  ],
  [
    'PIA',
    'PK203',
    'LHE',
    'DXB',
    142000,
    8
  ],
  [
    'Etihad Airways',
    'EY241',
    'LHE',
    'AUH',
    210000,
    10
  ],
  [
    'Turkish Airlines',
    'TK715',
    'LHE',
    'IST',
    225000,
    12
  ],
  [
    'Emirates',
    'EK623',
    'DXB',
    'LHE',
    172000,
    14
  ]
];

/* ========================================
   Seed Flights into Database
======================================== */

let added = 0;

for (
  const [
    airline,
    flightNumber,
    origin,
    destination,
    price,
    offset
  ] of routes
) {
  /* Check if Flight Already Exists */

  if (
    await Flight.exists({
      flightNumber,
      origin,
      destination
    })
  ) {
    continue;
  }

  /* Set Departure Date and Time */

  const departure = new Date(
    Date.now() + offset * 86400000
  );

  departure.setUTCHours(11, 30, 0, 0);

  /* Set Arrival Date and Time */

  const arrival = new Date(
    departure.getTime() + 4 * 3600000
  );

  /* Create Flight */

  await Flight.create({
    airline,
    flightNumber,
    origin,
    destination,
    price,
    departure,
    arrival,
    capacity: 48
  });

  added++;
}

/* ========================================
   Seed Completion
======================================== */

console.log(
  `Seeded ${added} flights. Admin created if configured.`
);

/* ========================================
   Disconnect MongoDB
======================================== */

await mongoose.disconnect();
