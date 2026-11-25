
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Plane,
  MapPin,
  CalendarDays,
  Users,
  Search,
  ShieldCheck,
  Ticket,
  Armchair,
  ArrowRightLeft
} from 'lucide-react';

export default function Home() {
  const nav = useNavigate();

  /* ========================================
     State Management
  ======================================== */

  const [trip, setTrip] = useState('oneway');
  const [from, setFrom] = useState('LHE');
  const [to, setTo] = useState('DXB');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState('1');

  /* ========================================
     Flight Search Handler
  ======================================== */

  const handleSearch = (e) => {
    e.preventDefault();

    nav(
      `/flights?from=${from.toUpperCase()}&to=${to.toUpperCase()}${
        date ? `&date=${date}` : ''
      }&passengers=${passengers}`
    );
  };

  /* ========================================
     Swap Airports Handler
  ======================================== */

  const swapAirports = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <>
      {/* ========================================
          Hero Section
      ======================================== */}

      <section className="hero">
        <div className="hero-overlay">
          <div className="container">

            {/* Hero Heading */}

            <div className="eyebrow">
              EXPLORE THE WORLD IN STYLE
            </div>

            <h1>
              Book Your
              <br />
              <em>Next Flight</em>
            </h1>

            <p>
              Find the best flights, compare fares, choose your seat
              <br />
              and book with AeroBook.
            </p>

            {/* ========================================
                Flight Search Panel
            ======================================== */}

            <div className="search-panel">

              {/* Trip Type Tabs */}

              <div className="tabs">
                <button
                  type="button"
                  className={trip === 'oneway' ? 'active' : ''}
                  onClick={() => setTrip('oneway')}
                >
                  One Way
                </button>

                <button
                  type="button"
                  className={trip === 'roundtrip' ? 'active' : ''}
                  onClick={() => setTrip('roundtrip')}
                >
                  Round Trip
                </button>
              </div>

              {/* ========================================
                  Flight Search Form
              ======================================== */}

              <form
                className="search-grid"
                onSubmit={handleSearch}
              >

                {/* Departure Airport */}

                <label>
                  <span>
                    <MapPin size={14} />
                    From
                  </span>

                  <input
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    placeholder="LHE"
                    required
                  />
                </label>

                {/* Swap Airports */}

                <button
                  type="button"
                  className="swap"
                  onClick={swapAirports}
                  aria-label="Swap airports"
                >
                  <ArrowRightLeft size={18} />
                </button>

                {/* Destination Airport */}

                <label>
                  <span>
                    <Plane size={14} />
                    To
                  </span>

                  <input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="DXB"
                    required
                  />
                </label>

                {/* Departure Date */}

                <label>
                  <span>
                    <CalendarDays size={14} />
                    Departure
                  </span>

                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>

                {/* ========================================
                    Passengers Selection
                ======================================== */}

                <label>
                  <span>
                    <Users size={14} />
                    Passengers
                  </span>

                  <select
                    value={passengers}
                    onChange={(e) =>
                      setPassengers(e.target.value)
                    }
                  >
                    <option value="1">
                      1 Adult
                    </option>

                    <option value="2">
                      2 Adults
                    </option>

                    <option value="3">
                      3 Adults
                    </option>

                    <option value="4">
                      4 Adults
                    </option>

                    <option value="5">
                      5 Adults
                    </option>

                    <option value="6">
                      6 Adults
                    </option>
                  </select>
                </label>

                {/* Search Flights Button */}

                <button
                  type="submit"
                  className="btn gold search-button"
                >
                  <Search size={18} />
                  Search Flights
                </button>

              </form>

              {/* ========================================
                  Round Trip Information
              ======================================== */}

              {trip === 'roundtrip' && (
                <p className="muted mini">
                  For return flights, book the outbound and
                  inbound legs separately in this demo.
                </p>
              )}

            </div>

            {/* ========================================
                Hero Features
            ======================================== */}

            <div className="features">

              <span>
                <Plane />
                Best Flight Deals
              </span>

              <span>
                <Armchair />
                Choose Your Seat
              </span>

              <span>
                <Ticket />
                E-Ticket Instantly
              </span>

              <span>
                <ShieldCheck />
                Safe & Secure
              </span>

            </div>

          </div>
        </div>
      </section>

      {/* ========================================
          AeroBook Experience Section
      ======================================== */}

      <section className="container section">

        {/* Section Heading */}

        <div className="eyebrow">
          THE AEROBOOK EXPERIENCE
        </div>

        <h2>
          Travel beyond expectations.
        </h2>

        {/* ========================================
            Experience Cards
        ======================================== */}

        <div className="three-cards">

          {/* Worldwide Routes */}

          <article className="panel">
            <Plane />

            <h3>
              Worldwide routes
            </h3>

            <p>
              Discover routes and compare flight
              options in one place.
            </p>
          </article>

          {/* Seat Selection */}

          <article className="panel">
            <Armchair />

            <h3>
              Your seat, your choice
            </h3>

            <p>
              Explore an interactive aircraft seat
              map before you book.
            </p>
          </article>

          {/* Instant Confirmation */}

          <article className="panel">
            <Ticket />

            <h3>
              Instant confirmation
            </h3>

            <p>
              Download a beautifully designed
              reservation e-ticket.
            </p>
          </article>

        </div>
      </section>
    </>
  );
}
