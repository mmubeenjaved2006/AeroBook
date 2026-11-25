import React, { useEffect, useState } from 'react';

import {
  useParams,
  useNavigate,
  useLocation
} from 'react-router-dom';

import {
  Plane,
  Check,
  ArrowRight,
  Users
} from 'lucide-react';

import { request } from '../lib/api';
import { useAuth } from '../context/AuthContext';

/* ========================================
   Passport Validation
======================================== */

function normalizePassport(value) {
  return value.trim().toUpperCase();
}

function validPassport(value) {
  return /^[A-Z]{2}[0-9]{7}$/.test(
    normalizePassport(value)
  );
}

/* ========================================
   Passenger Form Template
======================================== */

const createPassenger = (user = null) => ({
  name: user?.name || '',
  email: user?.email || '',
  passport: '',
  seat: ''
});

/* ========================================
   Seat Selection Page
======================================== */

export default function SeatSelect() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const searchParams = new URLSearchParams(
    location.search
  );

  const requestedCount = Number(
    searchParams.get('passengers') || 1
  );

  const initialCount = Number.isInteger(requestedCount)
    ? Math.min(6, Math.max(1, requestedCount))
    : 1;

  const [count, setCount] = useState(initialCount);

  /* ========================================
     Page State
  ======================================== */

  const [flight, setFlight] = useState(null);
  const [occupied, setOccupied] = useState([]);

  const [passengers, setPassengers] = useState(
    () =>
      Array.from(
        { length: initialCount },
        (_, index) =>
          createPassenger(index === 0 ? user : null)
      )
  );

  const [activePassenger, setActivePassenger] =
    useState(0);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  /* ========================================
     Load Flight Details
  ======================================== */

  useEffect(() => {
    let cancelled = false;

    setFlight(null);
    setOccupied([]);
    setError('');

    request(`/flights/${id}`)
      .then((response) => {
        if (cancelled) return;

        setFlight(response.flight);
        setOccupied(response.occupied || []);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ========================================
     Fill First Passenger from Logged-in User
  ======================================== */

  useEffect(() => {
    if (!user) return;

    setPassengers((previous) =>
      previous.map((passenger, index) => {
        if (index !== 0) return passenger;

        return {
          ...passenger,
          name: passenger.name || user.name || '',
          email: passenger.email || user.email || ''
        };
      })
    );
  }, [user]);

  /* ========================================
     Update Passenger Count
  ======================================== */

  function changeCount(value) {
    const nextCount = Number(value);

    if (
      !Number.isInteger(nextCount) ||
      nextCount < 1 ||
      nextCount > 6
    ) {
      return;
    }

    setCount(nextCount);

    setPassengers((previous) =>
      Array.from(
        { length: nextCount },
        (_, index) =>
          previous[index] ||
          createPassenger(
            index === 0 ? user : null
          )
      )
    );

    setActivePassenger((previous) =>
      Math.min(previous, nextCount - 1)
    );

    setError('');
  }

  /* ========================================
     Update Passenger Details
  ======================================== */

  function updatePassenger(index, field, value) {
    const updatedValue =
      field === 'passport'
        ? value.toUpperCase()
        : value;

    setPassengers((previous) =>
      previous.map((passenger, i) =>
        i === index
          ? {
              ...passenger,
              [field]: updatedValue
            }
          : passenger
      )
    );

    setError('');
  }

  /* ========================================
     Select Seat for Active Passenger
  ======================================== */

  function selectSeat(seatNumber) {
    if (occupied.includes(seatNumber)) {
      return;
    }

    const selectedByAnother = passengers.some(
      (passenger, index) =>
        index !== activePassenger &&
        passenger.seat === seatNumber
    );

    if (selectedByAnother) {
      setError(
        'This seat is already selected by another passenger'
      );

      return;
    }

    updatePassenger(
      activePassenger,
      'seat',
      seatNumber
    );

    setError('');

    if (activePassenger < count - 1) {
      setActivePassenger(activePassenger + 1);
    }
  }

  /* ========================================
     Check Selected Seats
  ======================================== */

  function selectedBy(seatNumber) {
    return passengers.findIndex(
      (passenger) =>
        passenger.seat === seatNumber
    );
  }

  /* ========================================
     Confirm Group Booking
  ======================================== */

  async function book(e) {
    e.preventDefault();

    if (!user) {
      return nav('/login', {
        state: {
          from: `${location.pathname}${location.search}`
        }
      });
    }

    if (!flight) {
      return setError(
        'Flight details are unavailable'
      );
    }

    if (
      passengers.some(
        (passenger) => !passenger.seat
      )
    ) {
      return setError(
        'Please select a seat for every passenger'
      );
    }

    const selectedSeats = passengers.map(
      (passenger) => passenger.seat
    );

    if (
      new Set(selectedSeats).size !==
      passengers.length
    ) {
      return setError(
        'Each passenger must have a different seat'
      );
    }

    if (
      selectedSeats.some((seatNumber) =>
        occupied.includes(seatNumber)
      )
    ) {
      return setError(
        'One or more seats are unavailable. Please select other seats.'
      );
    }

    /* ========================================
       Passenger and Passport Validation
    ======================================== */

    const selectedPassports = new Set();

    for (
      let index = 0;
      index < passengers.length;
      index++
    ) {
      const passenger = passengers[index];

      if (
        !passenger.name.trim() ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          passenger.email.trim()
        )
      ) {
        return setError(
          `Passenger ${index + 1}: Enter a valid name and email`
        );
      }

      const passport = normalizePassport(
        passenger.passport
      );

      if (!passport) {
        return setError(
          `Passenger ${index + 1}: Passport number is required`
        );
      }

      if (!validPassport(passport)) {
        return setError(
          `Passenger ${index + 1}: Passport must contain 2 letters and 7 digits`
        );
      }

      if (selectedPassports.has(passport)) {
        return setError(
          'Each passenger must have a different passport number'
        );
      }

      selectedPassports.add(passport);
    }

    setBusy(true);
    setError('');

    try {
      const response = await request(
        '/bookings/group',
        {
          method: 'POST',

          body: JSON.stringify({
            flightId: id,

            passengers: passengers.map(
              (passenger) => ({
                name: passenger.name.trim(),

                email: passenger.email.trim(),

                passport: normalizePassport(
                  passenger.passport
                ),

                seat: passenger.seat
              })
            )
          })
        }
      );

      /* ========================================
         Group Booking Success
      ======================================== */

      nav('/bookings', {
        replace: true,

        state: {
          groupBookingSuccess: true,

          bookings: response.bookings,

          totalPassengers:
            response.totalPassengers,

          totalPrice: response.totalPrice
        }
      });

    } catch (e) {
      setError(e.message);

      request(`/flights/${id}`)
        .then((response) => {
          setOccupied(response.occupied || []);
        })
        .catch(() => {});

    } finally {
      setBusy(false);
    }
  }

  /* ========================================
     Loading State
  ======================================== */

  if (!flight) {
    return (
      <div className="container section">
        {error || 'Loading flight...'}
      </div>
    );
  }

  const totalFare = flight.price * count;

  return (
    <section className="container section">

      <div className="eyebrow">
        STEP 2 OF 3 — COMPLETE YOUR RESERVATION
      </div>

      <h1 className="page-title">
        Select Your Seats
      </h1>

      <div className="seat-layout">

        {/* ========================================
            Flight Summary
        ======================================== */}

        <aside className="panel seat-summary">

          <h3>Flight Details</h3>

          <div className="gold-text">
            <Plane size={20} />
            {flight.airline}
          </div>

          <h2>
            {flight.origin}
            {' → '}
            {flight.destination}
          </h2>

          <p>
            {flight.flightNumber}
            {' · '}
            {flight.aircraft}
          </p>

          <p>
            {new Date(
              flight.departure
            ).toLocaleString()}
          </p>

          <hr />

          <h3>
            <Users size={17} />
            {' '}Passengers
          </h3>

          <label>
            Number of Adults

            <select
              value={count}
              onChange={(e) =>
                changeCount(e.target.value)
              }
              disabled={busy}
            >
              {[1, 2, 3, 4, 5, 6].map(
                (number) => (
                  <option
                    key={number}
                    value={number}
                  >
                    {number}{' '}
                    {number === 1
                      ? 'Adult'
                      : 'Adults'}
                  </option>
                )
              )}
            </select>
          </label>

          <hr />

          <h3>Seat Legend</h3>

          <p>⬜ Available</p>
          <p>🟨 Selected</p>
          <p>⬛ Occupied</p>

          <hr />

          <h3>Fare Summary</h3>

          <p className="muted">
            PKR {flight.price.toLocaleString()}
            {' × '}
            {count} Adults
          </p>

          <h2 className="gold-text">
            PKR {totalFare.toLocaleString()}
          </h2>

          <small className="muted">
            Demo reservation. No payment collected.
          </small>

        </aside>

        {/* ========================================
            Aircraft Seat Selection
        ======================================== */}

        <div className="panel aircraft-panel">

          <h2>Choose Your Seats</h2>

          <p className="muted">
            Select a seat for each passenger.
          </p>

          {/* Passenger Selection Tabs */}

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              margin: '18px 0'
            }}
          >
            {passengers.map(
              (passenger, index) => (
                <button
                  key={index}
                  type="button"
                  disabled={busy}

                  onClick={() =>
                    setActivePassenger(index)
                  }

                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',

                    border:
                      activePassenger === index
                        ? '1px solid #D4AF58'
                        : '1px solid #34343A',

                    background:
                      activePassenger === index
                        ? '#D4AF58'
                        : '#17191F',

                    color:
                      activePassenger === index
                        ? '#090B10'
                        : '#F7F5F0',

                    fontWeight: 600
                  }}
                >
                  Passenger {index + 1}

                  {passenger.seat
                    ? ` · ${passenger.seat}`
                    : ''}
                </button>
              )
            )}
          </div>

          <p className="muted">
            Selecting seat for{' '}

            <b className="gold-text">
              Passenger {activePassenger + 1}
            </b>
          </p>

          <div className="aircraft">

            <div className="aircraft-nose">
              <Plane size={36} />
            </div>

            <div className="seat-labels">
              <span>A</span>
              <span>B</span>
              <span>C</span>

              <i />

              <span>D</span>
              <span>E</span>
              <span>F</span>
            </div>

            {Array.from(
              {
                length: Math.ceil(
                  flight.capacity / 6
                )
              },

              (_, row) => (
                <div
                  className="seat-row"
                  key={row}
                >
                  {Array.from(
                    { length: 6 },

                    (_, col) => {
                      const index =
                        row * 6 + col;

                      if (
                        index >= flight.capacity
                      ) {
                        return (
                          <span key={col} />
                        );
                      }

                      const seatNumber =
                        `${row + 1}${'ABCDEF'[col]}`;

                      const isOccupied =
                        occupied.includes(
                          seatNumber
                        );

                      const owner =
                        selectedBy(seatNumber);

                      const isSelected =
                        owner !== -1;

                      return (
                        <React.Fragment
                          key={seatNumber}
                        >

                          {col === 3 && (
                            <span className="aisle">
                              {row + 1}
                            </span>
                          )}

                          <button
                            type="button"

                            title={
                              isOccupied
                                ? `Seat ${seatNumber} occupied`
                                : isSelected
                                  ? `Seat ${seatNumber} selected for passenger ${owner + 1}`
                                  : `Seat ${seatNumber}`
                            }

                            disabled={
                              isOccupied || busy
                            }

                            className={`seat ${
                              isSelected
                                ? 'selected'
                                : ''
                            } ${
                              isOccupied
                                ? 'occupied'
                                : ''
                            }`}

                            onClick={() =>
                              selectSeat(
                                seatNumber
                              )
                            }
                          >
                            {isOccupied ? (
                              '×'
                            ) : isSelected ? (
                              <Check size={14} />
                            ) : (
                              ''
                            )}
                          </button>

                        </React.Fragment>
                      );
                    }
                  )}
                </div>
              )
            )}

          </div>

        </div>

        {/* ========================================
            Passenger Details Form
        ======================================== */}

        <form
          className="panel passenger-form"
          onSubmit={book}
        >

          <h2>Passenger Details</h2>

          <p className="muted">
            Complete details for all {count}
            {' '}
            {count === 1
              ? 'passenger'
              : 'passengers'}.
          </p>

          {passengers.map(
            (passenger, index) => (
              <div
                key={index}

                style={{
                  paddingBottom: '20px',
                  marginBottom: '22px',
                  borderBottom:
                    '1px solid #34343A'
                }}
              >

                <h3 className="gold-text">
                  Passenger {index + 1}
                </h3>

                <p className="muted">
                  Selected Seat:{' '}

                  <b className="gold-text">
                    {passenger.seat || 'None'}
                  </b>
                </p>

                <button
                  type="button"
                  className="btn outline small"
                  disabled={busy}

                  onClick={() =>
                    setActivePassenger(index)
                  }

                  style={{
                    marginBottom: '16px'
                  }}
                >
                  Choose Seat
                </button>

                {/* Full Name */}

                <label>
                  Full Name

                  <input
                    required

                    value={passenger.name}

                    onChange={(e) =>
                      updatePassenger(
                        index,
                        'name',
                        e.target.value
                      )
                    }

                    disabled={busy}
                  />
                </label>

                {/* Email Address */}

                <label>
                  Email

                  <input
                    required
                    type="email"

                    value={passenger.email}

                    onChange={(e) =>
                      updatePassenger(
                        index,
                        'email',
                        e.target.value
                      )
                    }

                    disabled={busy}
                  />
                </label>

                {/* ========================================
                    Mandatory Passport Number
                ======================================== */}

                <label>

                  Passport Number

                  <span
                    style={{
                      color: '#D4AF58',
                      marginLeft: '4px'
                    }}
                  >
                    *
                  </span>

                  <input
                    required
                    type="text"
                    maxLength={9}
                    minLength={9}
                    pattern="[A-Z]{2}[0-9]{7}"
                    placeholder="XX0000001"
                    autoComplete="off"
                    spellCheck={false}

                    title="Enter 2 letters followed by 7 digits"

                    value={passenger.passport}

                    onChange={(e) =>
                      updatePassenger(
                        index,
                        'passport',
                        e.target.value
                      )
                    }

                    disabled={busy}

                    style={{
                      textTransform: 'uppercase',
                      letterSpacing: '1px',

                      borderColor:
                        passenger.passport.length > 0
                          ? validPassport(
                              passenger.passport
                            )
                            ? '#4CAF80'
                            : '#E57373'
                          : undefined
                    }}
                  />

                </label>

                {/* Live Passport Format Feedback */}

                {passenger.passport.length > 0 ? (

                  validPassport(passenger.passport) ? (

                    <small
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        color: '#4CAF80',
                        marginTop: '6px'
                      }}
                    >
                      <Check size={15} />
                      Valid passport format
                    </small>

                  ) : (

                    <small
                      style={{
                        display: 'block',
                        color: '#E57373',
                        marginTop: '6px'
                      }}
                    >
                      Enter 2 letters followed by 7 digits.
                    </small>

                  )

                ) : (

                  <small
                    className="muted"
                    style={{
                      display: 'block',
                      marginTop: '6px'
                    }}
                  >
                    Demo format: XX0000001
                  </small>

                )}

                <small
                  className="muted"
                  style={{
                    display: 'block',
                    marginTop: '8px',
                    lineHeight: 1.5
                  }}
                >
                  Demo only. Use a dummy passport number.
                  Passport authenticity is not verified.
                </small>

              </div>
            )
          )}

          {/* ========================================
              Booking Summary
          ======================================== */}

          <h3>Booking Summary</h3>

          <p className="muted">
            Passengers: {count}
          </p>

          <p className="muted">
            Selected Seats:{' '}

            {passengers
              .map((p) => p.seat)
              .filter(Boolean)
              .join(', ') || 'None'}
          </p>

          <h2 className="gold-text">
            PKR {totalFare.toLocaleString()}
          </h2>

          {error && (
            <div className="alert">
              {error}
            </div>
          )}

          {!user && (
            <p className="muted">
              You will be asked to sign in before booking.
            </p>
          )}

          <button
            type="submit"
            className="btn gold full"
            disabled={busy}
          >
            {busy
              ? 'Confirming Bookings...'
              : count === 1
                ? 'Confirm Booking'
                : `Confirm ${count} Bookings`}

            <ArrowRight size={17} />
          </button>

          <small className="muted">
            Every passenger receives a separate
            booking reference and PDF ticket.
            Demo reservation only.
          </small>

        </form>

      </div>

    </section>
  );
}