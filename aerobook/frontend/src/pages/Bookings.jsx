
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Ticket,
  Download,
  Plane
} from 'lucide-react';

import { request, API } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Bookings() {
  const { user, loading } = useAuth();

  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    request('/bookings')
      .then((r) => setItems(r.bookings))
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user]);

  async function cancel(id) {
    if (!confirm('Cancel this reservation?')) {
      return;
    }

    try {
      await request(`/bookings/${id}/cancel`, {
        method: 'PATCH'
      });

      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) {
    return (
      <section className="container section">
        Loading...
      </section>
    );
  }

  if (!user) {
    return (
      <section className="container section">
        <h1>Please sign in</h1>

        <Link
          className="btn gold"
          to="/login"
        >
          Log In
        </Link>
      </section>
    );
  }

  return (
    <section className="container section">

      {/* Page Heading */}
      <div className="eyebrow">
        YOUR TRAVEL HISTORY
      </div>

      <h1 className="page-title">
        My Bookings
      </h1>

      {/* Error Message */}
      {error && (
        <div className="alert">
          {error}
        </div>
      )}

      {/* Empty Bookings */}
      {items.length === 0 ? (
        <div className="panel empty">
          No bookings yet.{' '}

          <Link to="/flights">
            Explore flights
          </Link>
        </div>
      ) : (
        items.map((b) => (
          <article
            className="booking-card panel"
            key={b._id}
          >

            {/* Flight Information */}
            <div>
              <div className="gold-text">
                <Plane size={18} />

                {b.flight?.airline || 'Flight'}
              </div>

              <h2>
                {b.flight?.origin}
                {' → '}
                {b.flight?.destination}
              </h2>

              <p className="muted">
                {b.flight?.flightNumber}
                {' · '}
                Seat {b.seat}
                {' · '}
                PNR {b.pnr}
              </p>

              <small>
                {new Date(
                  b.flight?.departure
                ).toLocaleString()}
              </small>
            </div>

            {/* Booking Actions */}
            <div className="booking-actions">

              {/* Booking Status */}
              <span className={`status ${b.status}`}>
                {b.status}
              </span>

              {/* Download PDF Ticket */}
              <a
                className="btn outline small"
                href={`${API}/bookings/${b._id}/ticket`}
                target="_blank"
                rel="noreferrer"
              >
                <Download size={15} />
                PDF Ticket
              </a>

              {/* Cancel Booking */}
              {b.status === 'confirmed' && (
                <button
                  className="btn danger small"
                  onClick={() => cancel(b._id)}
                >
                  Cancel
                </button>
              )}
            </div>

          </article>
        ))
      )}

    </section>
  );
}
