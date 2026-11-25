
import React, { useEffect, useState } from 'react';
import {
  useSearchParams,
  Link
} from 'react-router-dom';

import {
  Plane,
  Clock3,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';

import { request } from '../lib/api';

export default function Flights() {
  const [params, setParams] = useSearchParams();

  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('price');

  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const date = params.get('date') || '';

  useEffect(() => {
    setLoading(true);

    request(`/flights?${params.toString()}`)
      .then((r) => setFlights(r.flights))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.toString()]);

  const sorted = [...flights].sort((a, b) =>
    sort === 'price'
      ? a.price - b.price
      : new Date(a.departure) - new Date(b.departure)
  );

  return (
    <section className="container section">

      {/* Page Heading */}
      <div className="eyebrow">
        YOUR JOURNEY BEGINS HERE
      </div>

      <h1 className="page-title">
        {from && to
          ? `Flights from ${from} to ${to}`
          : 'Explore Flights'}
      </h1>

      <p className="muted">
        Choose your perfect journey from available
        demo flights.
      </p>

      {/* Flight Search and Filters */}
      <div className="filterbar">

        {/* Departure Airport */}
        <input
          id="from"
          placeholder="From (e.g. LHE)"
          defaultValue={from}
        />

        {/* Destination Airport */}
        <input
          id="to"
          placeholder="To (e.g. DXB)"
          defaultValue={to}
        />

        {/* Departure Date */}
        <input
          id="date"
          type="date"
          defaultValue={date}
        />

        {/* Search Button */}
        <button
          className="btn gold"
          onClick={() =>
            setParams({
              from: document.getElementById('from').value,
              to: document.getElementById('to').value,
              ...(
                document.getElementById('date').value
                  ? {
                      date: document.getElementById('date').value
                    }
                  : {}
              )
            })
          }
        >
          Search
        </button>

        {/* Sort Flights */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="price">
            Lowest Price
          </option>

          <option value="time">
            Earliest Departure
          </option>
        </select>
      </div>

      {/* Loading State */}
      {loading ? (
        <p>
          Loading flights...
        </p>
      ) : error ? (

        /* Error Message */
        <div className="alert">
          {error}
        </div>

      ) : sorted.length === 0 ? (

        /* No Flights Found */
        <div className="panel empty">
          No flights found. Try different airports
          or dates, or run the seed command.
        </div>

      ) : (

        /* Available Flights */
        <div className="flight-list">
          {sorted.map((f) => (
            <article
              className="flight-card"
              key={f._id}
            >

              {/* Airline Icon */}
              <div className="airline-mark">
                <Plane />
              </div>

              {/* Airline Information */}
              <div className="airline-name">
                <b>
                  {f.airline}
                </b>

                <small>
                  {f.flightNumber}
                  {' · '}
                  {f.aircraft}
                </small>
              </div>

              {/* Flight Route */}
              <div className="flight-route">

                {/* Departure */}
                <div>
                  <b>
                    {new Date(
                      f.departure
                    ).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </b>

                  <small>
                    {f.origin}
                  </small>
                </div>

                {/* Flight Direction */}
                <div className="flight-line">
                  <span>
                    Non-stop
                  </span>

                  <ArrowRight size={24} />
                </div>

                {/* Arrival */}
                <div>
                  <b>
                    {new Date(
                      f.arrival
                    ).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </b>

                  <small>
                    {f.destination}
                  </small>
                </div>
              </div>

              {/* Flight Price */}
              <div className="fare">
                <b>
                  PKR {f.price.toLocaleString()}
                </b>

                <small>
                  {new Date(
                    f.departure
                  ).toLocaleDateString()}
                </small>
              </div>

              {/* Select Flight */}
              <Link
                className="btn gold"
                to={`/flights/${f._id}`}
              >
                Select
              </Link>

            </article>
          ))}
        </div>
      )}

    </section>
  );
}
