
import React from 'react';
import {
  Link,
  useLocation,
  useParams
} from 'react-router-dom';

import {
  CheckCircle2,
  Download
} from 'lucide-react';

import { API } from '../lib/api';

export default function Confirmation() {
  const { id } = useParams();
  const { state } = useLocation();

  return (
    <section className="container section confirmation">

      {/* Confirmation Icon */}
      <CheckCircle2
        size={75}
        className="gold-text"
      />

      {/* Page Heading */}
      <div className="eyebrow">
        YOUR JOURNEY STARTS HERE
      </div>

      <h1>
        Demo Booking Confirmed!
      </h1>

      {/* Demo Booking Notice */}
      <div className="demo-notice">
        Demo itinerary only — not a valid airline
        ticket or confirmed airline reservation.
      </div>

      {/* Confirmation Message */}
      <p>
        Your reservation has been successfully created.
      </p>

      {/* Booking Reference */}
      {state?.booking && (
        <div className="pnr">
          Booking Reference

          <strong>
            {state.booking.pnr}
          </strong>
        </div>
      )}

      {/* Additional Information */}
      <p className="muted">
        This is a demonstration reservation,
        not an airline-issued ticket.
      </p>

      {/* Action Buttons */}
      <div className="center-actions">

        {/* Download E-Ticket */}
        <a
          className="btn gold"
          href={`${API}/bookings/${id}/ticket`}
        >
          <Download size={18} />
          Download E-Ticket
        </a>

        {/* View Bookings */}
        <Link
          className="btn outline"
          to="/bookings"
        >
          View My Bookings
        </Link>

      </div>
    </section>
  );
}
