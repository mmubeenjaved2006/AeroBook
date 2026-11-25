
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import { Link } from 'react-router-dom';

import {
  Plane,
  Users,
  Ticket,
  Coins,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  BarChart3,
  Search,
  RefreshCw,
  TrendingUp,
  Armchair,
  XCircle,
  CheckCircle2,
  CalendarDays,
  ShieldCheck,
  Shield,
  UserRound,
  UserRoundCheck,
  UserRoundX,
  Clock3,
  AlertTriangle,
  Check,
  Ban
} from 'lucide-react';

import { request } from '../lib/api';
import { useAuth } from '../context/AuthContext';

/* ========================================
   Theme and Configuration
======================================== */

const GOLD = '#D4AF58';

const initial = {
  airline: '',
  flightNumber: '',
  origin: 'LHE',
  destination: 'DXB',
  departure: '',
  arrival: '',
  price: '',
  capacity: 48,
  aircraft: 'Airbus A320',
  baggage: '20 kg checked'
};

const fields = [
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

const flightStatuses = [
  'scheduled',
  'delayed',
  'cancelled',
  'completed'
];

const cardStyle = {
  background: '#17191F',
  border: '1px solid rgba(212,175,88,0.16)',
  borderRadius: 16,
  padding: 22
};

const mutedStyle = {
  color: '#A7A8AD',
  fontSize: 13
};

const inputStyle = {
  width: '100%',
  background: '#101218',
  color: '#F7F5F0',
  border: '1px solid rgba(212,175,88,0.22)',
  borderRadius: 9,
  padding: '12px 14px',
  outline: 'none',
  boxSizing: 'border-box'
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: 850
};

const thStyle = {
  padding: '14px 12px',
  textAlign: 'left',
  color: GOLD,
  borderBottom: '1px solid #34343A',
  fontSize: 12,
  letterSpacing: 0.6
};

const tdStyle = {
  padding: '15px 12px',
  borderBottom: '1px solid #292B30',
  color: '#F7F5F0',
  fontSize: 13
};

/* ========================================
   Helpers
======================================== */

const money = (value) =>
  `PKR ${Number(value || 0).toLocaleString('en-PK')}`;

const number = (value) =>
  Number(value || 0).toLocaleString('en-PK');

function dateTime(value) {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-PK');
}

function toDateTimeLocal(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const local = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 16);
}

function flightToForm(flight) {
  return {
    airline: flight.airline || '',
    flightNumber: flight.flightNumber || '',
    origin: flight.origin || '',
    destination: flight.destination || '',
    departure: toDateTimeLocal(flight.departure),
    arrival: toDateTimeLocal(flight.arrival),
    price: flight.price ?? '',
    capacity: flight.capacity ?? 48,
    aircraft: flight.aircraft || 'Airbus A320',
    baggage: flight.baggage || '20 kg checked'
  };
}

function PanelTitle({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2
        style={{
          margin: '0 0 6px',
          fontSize: 20
        }}
      >
        {title}
      </h2>

      {subtitle && (
        <p style={{ ...mutedStyle, margin: 0 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle
}) {
  return (
    <div style={cardStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12
        }}
      >
        <span style={mutedStyle}>{label}</span>
        <Icon size={22} color={GOLD} />
      </div>

      <h2
        style={{
          margin: '18px 0 8px',
          fontSize: 'clamp(22px, 3vw, 30px)',
          overflowWrap: 'anywhere'
        }}
      >
        {value}
      </h2>

      <p style={{ ...mutedStyle, margin: 0 }}>
        {subtitle}
      </p>
    </div>
  );
}

/* ========================================
   Activity Chart
======================================== */

function ActivityChart({
  rows = [],
  type = 'revenue'
}) {
  const data = rows.slice(-14);

  if (!data.length) {
    return (
      <p style={mutedStyle}>
        No booking activity available yet.
      </p>
    );
  }

  const key =
    type === 'revenue' ? 'revenue' : 'total';

  const highest = Math.max(
    1,
    ...data.map((item) => Number(item[key] || 0))
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 10,
        height: 230,
        overflowX: 'auto',
        padding: '12px 0 0'
      }}
    >
      {data.map((item) => {
        const value = Number(item[key] || 0);

        const height = Math.max(
          value > 0 ? 8 : 2,
          (value / highest) * 155
        );

        return (
          <div
            key={item.date}
            title={`${item.date}: ${
              type === 'revenue'
                ? money(value)
                : `${value} bookings`
            }`}
            style={{
              flex: '1 0 34px',
              minWidth: 34,
              maxWidth: 72,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              height: '100%',
              gap: 8
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: '#F7F5F0',
                whiteSpace: 'nowrap'
              }}
            >
              {type === 'revenue'
                ? value >= 1000
                  ? `${(value / 1000).toFixed(0)}k`
                  : value
                : value}
            </span>

            <div
              style={{
                height,
                width: '100%',
                maxWidth: 38,
                background:
                  type === 'revenue'
                    ? 'linear-gradient(180deg,#F1D48A,#B58B35)'
                    : 'linear-gradient(180deg,#E2C779,#76602D)',
                borderRadius: '7px 7px 2px 2px',
                flexShrink: 0
              }}
            />

            <span
              style={{
                fontSize: 10,
                color: '#A7A8AD',
                whiteSpace: 'nowrap'
              }}
            >
              {item.date?.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ========================================
   Status Badges
======================================== */

function StatusBadge({ status }) {
  const confirmed = status === 'confirmed';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 10px',
        borderRadius: 30,
        fontSize: 11,
        fontWeight: 600,
        background: confirmed
          ? 'rgba(45,170,110,0.12)'
          : 'rgba(220,90,90,0.12)',
        color: confirmed
          ? '#78D9A3'
          : '#F39A9A'
      }}
    >
      {confirmed ? (
        <CheckCircle2 size={12} />
      ) : (
        <XCircle size={12} />
      )}

      {status || 'Unknown'}
    </span>
  );
}

function FlightStatusBadge({ status }) {
  const styles = {
    scheduled: {
      color: '#78D9A3',
      background: 'rgba(45,170,110,0.12)',
      Icon: CheckCircle2
    },
    delayed: {
      color: '#F1C66B',
      background: 'rgba(212,175,88,0.13)',
      Icon: Clock3
    },
    cancelled: {
      color: '#F39A9A',
      background: 'rgba(220,90,90,0.12)',
      Icon: Ban
    },
    completed: {
      color: '#A9B9D8',
      background: 'rgba(120,150,210,0.13)',
      Icon: Check
    }
  };

  const config =
    styles[status] || styles.scheduled;

  const Icon = config.Icon;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 11px',
        borderRadius: 30,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
        color: config.color,
        background: config.background
      }}
    >
      <Icon size={13} />
      {status || 'scheduled'}
    </span>
  );
}

/* ========================================
   Booking Table
======================================== */

function BookingTable({
  rows = [],
  empty = 'No bookings found.'
}) {
  return (
    <div
      className="table-scroll"
      style={{ overflowX: 'auto' }}
    >
      <table style={tableStyle}>
        <thead>
          <tr>
            {[
              'PNR',
              'Passenger',
              'Flight',
              'Route',
              'Seat',
              'Fare',
              'Status',
              'Booked At'
            ].map((heading) => (
              <th key={heading} style={thStyle}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                style={{
                  ...tdStyle,
                  textAlign: 'center',
                  color: '#A7A8AD',
                  padding: 35
                }}
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((booking) => (
              <tr key={booking._id}>
                <td
                  style={{
                    ...tdStyle,
                    color: GOLD,
                    fontWeight: 600
                  }}
                >
                  {booking.pnr || '—'}
                </td>

                <td style={tdStyle}>
                  <div>
                    {booking.passenger?.name || '—'}
                  </div>

                  <small style={mutedStyle}>
                    {booking.passenger?.email || ''}
                  </small>
                </td>

                <td style={tdStyle}>
                  {booking.flight?.flightNumber ||
                    'Deleted flight'}
                </td>

                <td style={tdStyle}>
                  {booking.flight
                    ? `${booking.flight.origin} → ${booking.flight.destination}`
                    : '—'}
                </td>

                <td style={tdStyle}>
                  {booking.seat || '—'}
                </td>

                <td style={tdStyle}>
                  {money(booking.price)}
                </td>

                <td style={tdStyle}>
                  <StatusBadge status={booking.status} />
                </td>

                <td style={tdStyle}>
                  {dateTime(booking.createdAt)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ========================================
   Occupancy Table
======================================== */

function OccupancyTable({ rows = [] }) {
  return (
    <div
      className="table-scroll"
      style={{ overflowX: 'auto' }}
    >
      <table style={tableStyle}>
        <thead>
          <tr>
            {[
              'Flight',
              'Route',
              'Capacity',
              'Booked',
              'Available',
              'Occupancy'
            ].map((heading) => (
              <th key={heading} style={thStyle}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                style={{
                  ...tdStyle,
                  textAlign: 'center'
                }}
              >
                No flights available.
              </td>
            </tr>
          ) : (
            rows.map((flight) => (
              <tr key={flight._id}>
                <td style={tdStyle}>
                  <strong>{flight.flightNumber}</strong>

                  <div style={mutedStyle}>
                    {flight.airline}
                  </div>
                </td>

                <td style={tdStyle}>
                  {flight.origin} → {flight.destination}
                </td>

                <td style={tdStyle}>
                  {flight.capacity}
                </td>

                <td style={tdStyle}>
                  {flight.bookedSeats}
                </td>

                <td style={tdStyle}>
                  {flight.availableSeats}
                </td>

                <td
                  style={{
                    ...tdStyle,
                    minWidth: 140
                  }}
                >
                  <div
                    style={{
                      marginBottom: 7
                    }}
                  >
                    {flight.occupancyRate}%
                  </div>

                  <div
                    style={{
                      height: 7,
                      borderRadius: 10,
                      background: '#34363D',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            flight.occupancyRate || 0
                          )
                        )}%`,
                        height: '100%',
                        background: GOLD,
                        borderRadius: 10
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ========================================
   User Components
======================================== */

function RoleBadge({ role }) {
  const isAdmin = role === 'admin';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 30,
        padding: '6px 11px',
        fontSize: 12,
        fontWeight: 600,
        background: isAdmin
          ? 'rgba(212,175,88,0.12)'
          : 'rgba(167,168,173,0.12)',
        color: isAdmin ? GOLD : '#C5C6CA'
      }}
    >
      {isAdmin ? (
        <ShieldCheck size={13} />
      ) : (
        <UserRound size={13} />
      )}

      {isAdmin ? 'Admin' : 'User'}
    </span>
  );
}

function UserAvatar({ user }) {
  const [imageFailed, setImageFailed] = useState(false);

  const initialLetter =
    user?.name?.trim()?.charAt(0)?.toUpperCase() ||
    'U';

  if (user?.avatar && !imageFailed) {
    return (
      <img
        src={user.avatar}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        style={{
          width: 38,
          height: 38,
          objectFit: 'cover',
          borderRadius: '50%',
          border: '1px solid rgba(212,175,88,0.35)'
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(212,175,88,0.12)',
        color: GOLD,
        fontWeight: 700
      }}
    >
      {initialLetter}
    </div>
  );
}

function UsersTable({
  rows = [],
  currentUserId,
  changingRoleId,
  onChangeRole
}) {
  return (
    <div
      className="table-scroll"
      style={{ overflowX: 'auto' }}
    >
      <table
        style={{
          ...tableStyle,
          minWidth: 900
        }}
      >
        <thead>
          <tr>
            {[
              'User',
              'Email',
              'Role',
              'Registered',
              'Actions'
            ].map((heading) => (
              <th key={heading} style={thStyle}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                style={{
                  ...tdStyle,
                  padding: 35,
                  textAlign: 'center'
                }}
              >
                No users found.
              </td>
            </tr>
          ) : (
            rows.map((account) => {
              const isSelf =
                String(account._id) ===
                String(currentUserId);

              const isAdmin =
                account.role === 'admin';

              return (
                <tr key={account._id}>
                  <td style={tdStyle}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                      }}
                    >
                      <UserAvatar user={account} />

                      <div>
                        <strong>
                          {account.name || 'Unknown'}
                        </strong>

                        {isSelf && (
                          <div
                            style={{
                              ...mutedStyle,
                              color: GOLD,
                              marginTop: 3
                            }}
                          >
                            Your account
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td style={tdStyle}>
                    {account.email || '—'}
                  </td>

                  <td style={tdStyle}>
                    <RoleBadge role={account.role} />
                  </td>

                  <td style={tdStyle}>
                    {dateTime(account.createdAt)}
                  </td>

                  <td style={tdStyle}>
                    <button
                      type="button"
                      className="btn"
                      disabled={
                        isSelf ||
                        Boolean(changingRoleId)
                      }
                      onClick={() =>
                        onChangeRole(
                          account,
                          isAdmin ? 'user' : 'admin'
                        )
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        color: isAdmin
                          ? '#F39A9A'
                          : GOLD,
                        border:
                          '1px solid rgba(212,175,88,0.3)'
                      }}
                    >
                      {isAdmin ? (
                        <UserRoundX size={16} />
                      ) : (
                        <UserRoundCheck size={16} />
                      )}

                      {changingRoleId === account._id
                        ? 'Updating...'
                        : isAdmin
                          ? 'Demote'
                          : 'Promote'}
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ========================================
   Flight Status Management
======================================== */

function FlightStatusControl({
  flight,
  disabled,
  onUpdated
}) {
  const currentStatus =
    flight.status || 'scheduled';

  const [status, setStatus] =
    useState(currentStatus);

  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setStatus(currentStatus);
    setReason('');
    setError('');
  }, [currentStatus, flight._id]);

  const locked = [
    'cancelled',
    'completed'
  ].includes(currentStatus);

  const changed = status !== currentStatus;

  const needsReason =
    changed &&
    ['delayed', 'cancelled'].includes(status);

  async function updateStatus() {
    if (locked || !changed || saving) return;

    if (needsReason && !reason.trim()) {
      setError('Please enter a reason.');
      return;
    }

    if (
      status === 'cancelled' &&
      !window.confirm(
        `Cancel flight ${flight.flightNumber}?\n\nThis will block new bookings. Existing confirmed bookings are not automatically refunded or cancelled by this action.`
      )
    ) {
      return;
    }

    if (
      status === 'completed' &&
      !window.confirm(
        `Mark flight ${flight.flightNumber} as completed?`
      )
    ) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await request(
        `/admin/flights/${flight._id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status,
            reason: reason.trim()
          })
        }
      );

      await onUpdated(
        `Flight ${flight.flightNumber} status updated to ${status}.`
      );
    } catch (e) {
      setError(
        e.message || 'Unable to update flight status.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gap: 9,
        minWidth: 200
      }}
    >
      <FlightStatusBadge status={currentStatus} />

      {!locked && (
        <>
          <select
            value={status}
            disabled={disabled || saving}
            onChange={(e) => {
              setStatus(e.target.value);
              setReason('');
              setError('');
            }}
            style={{
              ...inputStyle,
              padding: '9px 10px',
              fontSize: 12
            }}
          >
            {flightStatuses.map((item) => (
              <option key={item} value={item}>
                {item.charAt(0).toUpperCase() +
                  item.slice(1)}
              </option>
            ))}
          </select>

          {needsReason && (
            <textarea
              value={reason}
              disabled={disabled || saving}
              onChange={(e) =>
                setReason(e.target.value)
              }
              placeholder={
                status === 'delayed'
                  ? 'Reason for delay...'
                  : 'Reason for cancellation...'
              }
              maxLength={500}
              rows={2}
              style={{
                ...inputStyle,
                resize: 'vertical',
                fontSize: 12
              }}
            />
          )}

          <button
            type="button"
            className="btn"
            disabled={
              disabled ||
              saving ||
              !changed ||
              (needsReason && !reason.trim())
            }
            onClick={updateStatus}
            style={{
              color: GOLD,
              border:
                '1px solid rgba(212,175,88,0.35)',
              fontSize: 12,
              padding: '9px 12px'
            }}
          >
            {saving
              ? 'Updating...'
              : 'Update Status'}
          </button>
        </>
      )}

      {locked && (
        <small style={mutedStyle}>
          Final status — changes disabled
        </small>
      )}

      {currentStatus === 'delayed' &&
        flight.delayReason && (
          <small style={mutedStyle}>
            Reason: {flight.delayReason}
          </small>
        )}

      {currentStatus === 'cancelled' &&
        flight.cancellationReason && (
          <small style={mutedStyle}>
            Reason: {flight.cancellationReason}
          </small>
        )}

      {error && (
        <small style={{ color: '#F39A9A' }}>
          {error}
        </small>
      )}
    </div>
  );
}

/* ========================================
   Admin Dashboard
======================================== */

export default function Admin() {
  const { user, loading } = useAuth();

  const [stats, setStats] = useState(null);
  const [flights, setFlights] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    adminUsers: 0,
    regularUsers: 0
  });

  const [form, setForm] = useState({
    ...initial
  });

  const [editingId, setEditingId] = useState(null);
  const [editingFlight, setEditingFlight] =
    useState(null);

  const [tab, setTab] = useState('overview');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState('all');

  const [flightSearch, setFlightSearch] =
    useState('');

  const [flightStatusFilter, setFlightStatusFilter] =
    useState('all');

  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] =
    useState('all');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [changingRoleId, setChangingRoleId] =
    useState(null);

  const formRef = useRef(null);

  const isAdmin = user?.role === 'admin';

  /* ========================================
     Load Dashboard Data
  ======================================== */

  const load = useCallback(async () => {
    setFetching(true);

    try {
      const [
        statsResult,
        flightsResult,
        bookingsResult,
        usersResult
      ] = await Promise.all([
        request('/admin/stats'),
        request('/admin/flights'),
        request('/admin/bookings'),
        request('/admin/users')
      ]);

      setStats(statsResult);

      setFlights(
        flightsResult.flights || []
      );

      setAllBookings(
        bookingsResult.bookings || []
      );

      setAllUsers(
        usersResult.users || []
      );

      const users = usersResult.users || [];

      setUserStats({
        totalUsers:
          usersResult.totalUsers ??
          users.length,

        adminUsers:
          usersResult.adminUsers ??
          users.filter(
            (account) => account.role === 'admin'
          ).length,

        regularUsers:
          usersResult.regularUsers ??
          users.filter(
            (account) => account.role === 'user'
          ).length
      });

      return true;
    } catch (e) {
      setError(
        e.message || 'Failed to load dashboard.'
      );

      return false;
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      load();
    }
  }, [isAdmin, load]);

  /* ========================================
     Filtering
  ======================================== */

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase();

    return allBookings.filter((booking) => {
      const matchesStatus =
        statusFilter === 'all' ||
        booking.status === statusFilter;

      const searchable = [
        booking.pnr,
        booking.passenger?.name,
        booking.passenger?.email,
        booking.flight?.flightNumber,
        booking.flight?.airline,
        booking.flight?.origin,
        booking.flight?.destination,
        booking.seat
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        matchesStatus &&
        searchable.includes(term)
      );
    });
  }, [allBookings, search, statusFilter]);

  const filteredFlights = useMemo(() => {
    const term =
      flightSearch.trim().toLowerCase();

    return flights.filter((flight) => {
      const matchesStatus =
        flightStatusFilter === 'all' ||
        (flight.status || 'scheduled') ===
          flightStatusFilter;

      const searchable = [
        flight.flightNumber,
        flight.airline,
        flight.origin,
        flight.destination,
        flight.aircraft
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        matchesStatus &&
        searchable.includes(term)
      );
    });
  }, [
    flights,
    flightSearch,
    flightStatusFilter
  ]);

  const filteredUsers = useMemo(() => {
    const term =
      userSearch.trim().toLowerCase();

    return allUsers.filter((account) => {
      const matchesRole =
        roleFilter === 'all' ||
        account.role === roleFilter;

      const searchable = [
        account.name,
        account.email
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        matchesRole &&
        searchable.includes(term)
      );
    });
  }, [allUsers, userSearch, roleFilter]);

  /* ========================================
     Statistics
  ======================================== */

  const totalCapacity = useMemo(
    () =>
      (stats?.occupancy || []).reduce(
        (sum, flight) =>
          sum + Number(flight.capacity || 0),
        0
      ),
    [stats]
  );

  const occupiedSeats = useMemo(
    () =>
      (stats?.occupancy || []).reduce(
        (sum, flight) =>
          sum + Number(flight.bookedSeats || 0),
        0
      ),
    [stats]
  );

  const overallOccupancy = totalCapacity
    ? Math.round(
        (occupiedSeats / totalCapacity) * 100
      )
    : 0;

  const flightCounts = useMemo(() => {
    const counts = {
      scheduled: 0,
      delayed: 0,
      cancelled: 0,
      completed: 0
    };

    flights.forEach((flight) => {
      const status = flight.status || 'scheduled';

      if (Object.hasOwn(counts, status)) {
        counts[status] += 1;
      }
    });

    return counts;
  }, [flights]);

  /* ========================================
     Flight Editing
  ======================================== */

  function startEdit(flight) {
    if (
      ['cancelled', 'completed'].includes(
        flight.status
      )
    ) {
      setError(
        'Cancelled or completed flights cannot be edited.'
      );
      return;
    }

    setTab('flights');
    setEditingId(flight._id);
    setEditingFlight(flight);
    setForm(flightToForm(flight));

    setError('');
    setMessage('');

    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingFlight(null);
    setForm({ ...initial });

    setError('');
    setMessage('');
  }

  function validateForm() {
    const departure = new Date(form.departure);
    const arrival = new Date(form.arrival);

    if (
      Number.isNaN(departure.getTime()) ||
      Number.isNaN(arrival.getTime())
    ) {
      return 'Enter valid departure and arrival dates.';
    }

    if (arrival <= departure) {
      return 'Arrival must be after departure.';
    }

    if (
      form.origin.trim().toUpperCase() ===
      form.destination.trim().toUpperCase()
    ) {
      return 'Origin and destination must be different.';
    }

    if (
      form.price === '' ||
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) < 0
    ) {
      return 'Enter a valid ticket price.';
    }

    if (
      !Number.isInteger(Number(form.capacity)) ||
      Number(form.capacity) < 1
    ) {
      return 'Capacity must be a positive whole number.';
    }

    return null;
  }

  async function saveFlight(e) {
    e.preventDefault();

    setError('');
    setMessage('');

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      airline: form.airline.trim(),
      flightNumber:
        form.flightNumber.trim().toUpperCase(),
      origin: form.origin.trim().toUpperCase(),
      destination:
        form.destination.trim().toUpperCase(),
      departure:
        new Date(form.departure).toISOString(),
      arrival:
        new Date(form.arrival).toISOString(),
      price: Number(form.price),
      capacity: Number(form.capacity),
      aircraft: form.aircraft.trim(),
      baggage: form.baggage.trim()
    };

    let requestBody = payload;

    if (editingId && editingFlight) {
      const original =
        flightToForm(editingFlight);

      const changed = {};

      Object.keys(payload).forEach((key) => {
        if (
          key === 'departure' ||
          key === 'arrival'
        ) {
          const originalTime = new Date(
            editingFlight[key]
          ).getTime();

          const updatedTime = new Date(
            payload[key]
          ).getTime();

          if (originalTime !== updatedTime) {
            changed[key] = payload[key];
          }

          return;
        }

        if (
          String(payload[key]) !==
          String(original[key])
        ) {
          changed[key] = payload[key];
        }
      });

      if (Object.keys(changed).length === 0) {
        setMessage('No changes detected.');
        return;
      }

      requestBody = changed;
    }

    setBusy(true);

    try {
      if (editingId) {
        await request(`/flights/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(requestBody)
        });

        setMessage(
          'Flight updated successfully.'
        );
      } else {
        await request('/flights', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        setMessage(
          'Flight added successfully.'
        );
      }

      setEditingId(null);
      setEditingFlight(null);
      setForm({ ...initial });

      await load();
    } catch (e) {
      setError(
        e.message || 'Unable to save flight.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (
      !window.confirm(
        'Are you sure you want to delete this flight? Flights with booking history cannot be deleted.'
      )
    ) {
      return;
    }

    setError('');
    setMessage('');
    setBusy(true);

    try {
      await request(`/flights/${id}`, {
        method: 'DELETE'
      });

      if (editingId === id) {
        setEditingId(null);
        setEditingFlight(null);
        setForm({ ...initial });
      }

      setMessage(
        'Flight deleted successfully.'
      );

      await load();
    } catch (e) {
      setError(
        e.message || 'Unable to delete flight.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusUpdated(successMessage) {
    const refreshed = await load();

    if (refreshed) {
      setError('');
      setMessage(successMessage);
    }
  }

  /* ========================================
     User Role Management
  ======================================== */

  async function changeUserRole(account, newRole) {
    if (
      String(account._id) ===
      String(user?._id || user?.id)
    ) {
      setError(
        'You cannot change your own admin role.'
      );
      return;
    }

    const promoting = newRole === 'admin';

    const confirmation = promoting
      ? `Promote ${account.name} to Admin?\n\nThis user will receive administrative access to AeroBook.`
      : `Demote ${account.name} to User?\n\nThis user will lose administrative access.`;

    if (!window.confirm(confirmation)) {
      return;
    }

    setError('');
    setMessage('');
    setChangingRoleId(account._id);

    try {
      await request(
        `/admin/users/${account._id}/role`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            role: newRole
          })
        }
      );

      await load();

      setMessage(
        promoting
          ? `${account.name} promoted to Admin successfully.`
          : `${account.name} demoted to User successfully.`
      );
    } catch (e) {
      setError(
        e.message || 'Unable to update user role.'
      );
    } finally {
      setChangingRoleId(null);
    }
  }

  /* ========================================
     Access Control
  ======================================== */

  if (loading) {
    return (
      <section className="container section">
        Loading...
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="container section">
        <h1>Admin access required</h1>

        <Link to="/login">
          Sign in
        </Link>
      </section>
    );
  }

  const tabs = [
    {
      key: 'overview',
      label: 'Overview',
      Icon: BarChart3
    },
    {
      key: 'flights',
      label: 'Manage Flights',
      Icon: Plane
    },
    {
      key: 'bookings',
      label: 'All Bookings',
      Icon: Ticket
    },
    {
      key: 'users',
      label: 'Manage Users',
      Icon: Users
    }
  ];

  /* ========================================
     Dashboard UI
  ======================================== */

  return (
    <div className="admin-layout">
      {/* Sidebar */}

      <aside className="admin-sidebar">
        <div className="brand">
          <Plane />
          Aero<span>Book</span>
        </div>

        <small>ADMIN PANEL</small>

        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={
              tab === key ? 'active' : ''
            }
            onClick={() => {
              setTab(key);
              setError('');
              setMessage('');
            }}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </aside>

      {/* Main Content */}

      <section className="admin-content">
        {/* Header */}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 20
          }}
        >
          <div>
            <div className="eyebrow">
              AEROBOOK MANAGEMENT
            </div>

            <h1
              className="page-title"
              style={{ marginBottom: 0 }}
            >
              {tab === 'overview'
                ? 'Dashboard Overview'
                : tab === 'flights'
                  ? 'Manage Flights'
                  : tab === 'bookings'
                    ? 'Booking Management'
                    : 'User Management'}
            </h1>
          </div>

          <button
            type="button"
            className="btn"
            disabled={fetching}
            onClick={async () => {
              setError('');
              await load();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border:
                '1px solid rgba(212,175,88,0.35)',
              color: GOLD
            }}
          >
            <RefreshCw size={16} />

            {fetching
              ? 'Refreshing...'
              : 'Refresh'}
          </button>
        </div>

        {/* Alerts */}

        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="success" role="status">
            {message}
          </div>
        )}

        {/* ====================================
            Overview
        ==================================== */}

        {tab === 'overview' && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                gap: 18,
                marginBottom: 24
              }}
            >
              <StatCard
                icon={Plane}
                label="Total Flights"
                value={number(stats?.flights)}
                subtitle="Flights in the system"
              />

              <StatCard
                icon={Ticket}
                label="Confirmed Passengers"
                value={number(
                  stats?.confirmedPassengers
                )}
                subtitle="Active passenger bookings"
              />

              <StatCard
                icon={Coins}
                label="Booked Fare"
                value={money(stats?.revenue)}
                subtitle="Confirmed booking value"
              />

              <StatCard
                icon={Users}
                label="Registered Users"
                value={number(stats?.users)}
                subtitle="Total user accounts"
              />

              <StatCard
                icon={Armchair}
                label="Flight Occupancy"
                value={`${overallOccupancy}%`}
                subtitle={`${occupiedSeats} of ${totalCapacity} seats booked`}
              />

              <StatCard
                icon={XCircle}
                label="Cancelled Bookings"
                value={number(
                  stats?.cancelledBookings
                )}
                subtitle="Cancelled passenger reservations"
              />
            </div>

            {/* Flight Status Summary */}

            <div
              style={{
                ...cardStyle,
                marginBottom: 24
              }}
            >
              <PanelTitle
                title="Flight Status Overview"
                subtitle="Current operational status of all flights"
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
                  gap: 14
                }}
              >
                {flightStatuses.map((status) => (
                  <div
                    key={status}
                    style={{
                      background: '#101218',
                      padding: 18,
                      borderRadius: 12,
                      border:
                        '1px solid rgba(212,175,88,0.12)'
                    }}
                  >
                    <FlightStatusBadge status={status} />

                    <h2
                      style={{
                        fontSize: 28,
                        margin: '14px 0 0'
                      }}
                    >
                      {number(flightCounts[status])}
                    </h2>
                  </div>
                ))}
              </div>
            </div>

            {/* Charts */}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
                gap: 20,
                marginBottom: 24
              }}
            >
              <div style={cardStyle}>
                <PanelTitle
                  title="Revenue Activity"
                  subtitle="Confirmed booking value by creation date"
                />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: GOLD
                  }}
                >
                  <TrendingUp size={18} />

                  <strong>
                    {money(stats?.revenue)}
                  </strong>
                </div>

                <ActivityChart
                  type="revenue"
                  rows={
                    stats?.revenueActivity || []
                  }
                />
              </div>

              <div style={cardStyle}>
                <PanelTitle
                  title="Booking Activity"
                  subtitle="Daily passenger reservations"
                />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: GOLD
                  }}
                >
                  <CalendarDays size={18} />

                  <strong>
                    {number(
                      stats?.totalReservations
                    )}{' '}
                    reservations
                  </strong>
                </div>

                <ActivityChart
                  type="bookings"
                  rows={
                    stats?.bookingActivity || []
                  }
                />
              </div>
            </div>

            <div
              style={{
                ...cardStyle,
                marginBottom: 24
              }}
            >
              <PanelTitle
                title="Flight Occupancy"
                subtitle="Confirmed seats and available capacity"
              />

              <OccupancyTable
                rows={
                  stats?.occupancy || []
                }
              />
            </div>

            <div style={cardStyle}>
              <PanelTitle
                title="Recent Bookings"
                subtitle="Latest 8 passenger reservations"
              />

              <BookingTable
                rows={
                  stats?.latest || []
                }
              />
            </div>
          </>
        )}

        {/* ====================================
            Manage Flights
        ==================================== */}

        {tab === 'flights' && (
          <>
            {/* Add / Edit Flight */}

            <form
              ref={formRef}
              onSubmit={saveFlight}
              style={{
                ...cardStyle,
                marginBottom: 24,
                scrollMarginTop: 24
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <PanelTitle
                  title={
                    editingId
                      ? `Edit Flight — ${editingFlight?.flightNumber || ''}`
                      : 'Add New Flight'
                  }
                  subtitle={
                    editingId
                      ? 'Update flight information safely'
                      : 'Create a new AeroBook flight'
                  }
                />

                {editingId && (
                  <button
                    type="button"
                    className="btn"
                    onClick={cancelEdit}
                    disabled={busy}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#F39A9A',
                      border:
                        '1px solid rgba(243,154,154,0.3)'
                    }}
                  >
                    <X size={16} />
                    Cancel Editing
                  </button>
                )}
              </div>

              {editingId && (
                <div
                  style={{
                    padding: 14,
                    marginBottom: 20,
                    background:
                      'rgba(212,175,88,0.07)',
                    border:
                      '1px solid rgba(212,175,88,0.22)',
                    borderRadius: 10,
                    color: '#D8C7AD',
                    fontSize: 13,
                    lineHeight: 1.6
                  }}
                >
                  <strong style={{ color: GOLD }}>
                    Editing Mode
                  </strong>

                  <div>
                    Flights with confirmed bookings
                    have protected details. The backend
                    may reject changes to their route,
                    schedule, fare, aircraft, baggage
                    or capacity.
                  </div>
                </div>
              )}

              <div
                className="admin-fields"
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
                  gap: 16
                }}
              >
                {fields.map((key) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        textTransform: 'capitalize',
                        color: '#D8C7AD'
                      }}
                    >
                      {key === 'flightNumber'
                        ? 'Flight Number'
                        : key}
                    </span>

                    <input
                      required
                      type={
                        ['departure', 'arrival'].includes(
                          key
                        )
                          ? 'datetime-local'
                          : ['price', 'capacity'].includes(
                                key
                              )
                            ? 'number'
                            : 'text'
                      }
                      min={
                        key === 'price'
                          ? 0
                          : key === 'capacity'
                            ? 1
                            : undefined
                      }
                      step={
                        key === 'price'
                          ? '0.01'
                          : undefined
                      }
                      value={form[key]}
                      onChange={(e) =>
                        setForm((previous) => ({
                          ...previous,
                          [key]: e.target.value
                        }))
                      }
                      style={inputStyle}
                    />
                  </label>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginTop: 22
                }}
              >
                <button
                  type="submit"
                  className="btn gold"
                  disabled={busy}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  {editingId ? (
                    <Save size={18} />
                  ) : (
                    <Plus size={18} />
                  )}

                  {busy
                    ? 'Saving...'
                    : editingId
                      ? 'Save Changes'
                      : 'Add Flight'}
                </button>

                {editingId && (
                  <button
                    type="button"
                    className="btn"
                    onClick={cancelEdit}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Flight List */}

            <div style={cardStyle}>
              <PanelTitle
                title="All Flights"
                subtitle={`${flights.length} flights in the system. Manage schedules and operational status.`}
              />

              {/* Search and Filter */}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                  gap: 14,
                  marginBottom: 20
                }}
              >
                <div
                  style={{
                    position: 'relative'
                  }}
                >
                  <Search
                    size={17}
                    color={GOLD}
                    style={{
                      position: 'absolute',
                      top: 14,
                      left: 12
                    }}
                  />

                  <input
                    type="search"
                    placeholder="Search flights, routes, airlines..."
                    value={flightSearch}
                    onChange={(e) =>
                      setFlightSearch(e.target.value)
                    }
                    style={{
                      ...inputStyle,
                      paddingLeft: 40
                    }}
                  />
                </div>

                <select
                  value={flightStatusFilter}
                  onChange={(e) =>
                    setFlightStatusFilter(
                      e.target.value
                    )
                  }
                  style={inputStyle}
                >
                  <option value="all">
                    All Flight Statuses
                  </option>

                  {flightStatuses.map((status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status.charAt(0).toUpperCase() +
                        status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <p
                style={{
                  ...mutedStyle,
                  marginBottom: 18
                }}
              >
                Showing {filteredFlights.length} of{' '}
                {flights.length} loaded flights
              </p>

              <div
                className="table-scroll"
                style={{ overflowX: 'auto' }}
              >
                <table
                  style={{
                    ...tableStyle,
                    minWidth: 1100
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        'Flight',
                        'Route',
                        'Price',
                        'Departure',
                        'Capacity',
                        'Status Management',
                        'Actions'
                      ].map((heading) => (
                        <th
                          key={heading}
                          style={thStyle}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredFlights.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            ...tdStyle,
                            textAlign: 'center',
                            padding: 35
                          }}
                        >
                          No flights found.
                        </td>
                      </tr>
                    ) : (
                      filteredFlights.map((flight) => {
                        const locked = [
                          'cancelled',
                          'completed'
                        ].includes(flight.status);

                        return (
                          <tr key={flight._id}>
                            <td style={tdStyle}>
                              <strong>
                                {flight.flightNumber}
                              </strong>

                              <div style={mutedStyle}>
                                {flight.airline}
                              </div>
                            </td>

                            <td style={tdStyle}>
                              {flight.origin} →{' '}
                              {flight.destination}
                            </td>

                            <td style={tdStyle}>
                              {money(flight.price)}
                            </td>

                            <td style={tdStyle}>
                              {dateTime(
                                flight.departure
                              )}
                            </td>

                            <td style={tdStyle}>
                              {flight.capacity}
                            </td>

                            <td style={tdStyle}>
                              <FlightStatusControl
                                flight={flight}
                                disabled={busy}
                                onUpdated={
                                  handleStatusUpdated
                                }
                              />
                            </td>

                            <td style={tdStyle}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10
                                }}
                              >
                                <button
                                  type="button"
                                  className="icon-button"
                                  disabled={busy || locked}
                                  onClick={() =>
                                    startEdit(flight)
                                  }
                                  title={
                                    locked
                                      ? 'Final-status flights cannot be edited'
                                      : 'Edit flight'
                                  }
                                  aria-label={`Edit flight ${flight.flightNumber}`}
                                  style={{
                                    color: GOLD,
                                    opacity: locked
                                      ? 0.4
                                      : 1
                                  }}
                                >
                                  <Pencil size={17} />
                                </button>

                                <button
                                  type="button"
                                  className="icon-button"
                                  disabled={busy}
                                  onClick={() =>
                                    remove(flight._id)
                                  }
                                  title="Delete flight"
                                  aria-label={`Delete flight ${flight.flightNumber}`}
                                  style={{
                                    color: '#F39A9A'
                                  }}
                                >
                                  <Trash2 size={17} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Status Information */}

              <div
                style={{
                  marginTop: 22,
                  padding: 16,
                  background:
                    'rgba(212,175,88,0.06)',
                  border:
                    '1px solid rgba(212,175,88,0.18)',
                  borderRadius: 10
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    marginBottom: 10,
                    color: GOLD
                  }}
                >
                  <AlertTriangle size={18} />

                  <strong>
                    Flight Status Information
                  </strong>
                </div>

                <p
                  style={{
                    ...mutedStyle,
                    lineHeight: 1.7,
                    margin: 0
                  }}
                >
                  Scheduled and delayed flights can
                  accept new bookings. Cancelled and
                  completed flights cannot accept new
                  bookings. Cancelled and completed
                  statuses are final. Changing a flight
                  to cancelled does not automatically
                  refund passengers or cancel their
                  existing booking records.
                </p>
              </div>
            </div>
          </>
        )}

        {/* ====================================
            All Bookings
        ==================================== */}

        {tab === 'bookings' && (
          <div style={cardStyle}>
            <PanelTitle
              title="All Passenger Bookings"
              subtitle="Search and filter the latest 200 reservations"
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
                gap: 14,
                marginBottom: 18
              }}
            >
              <div
                style={{
                  position: 'relative'
                }}
              >
                <Search
                  size={17}
                  color={GOLD}
                  style={{
                    position: 'absolute',
                    top: 14,
                    left: 12
                  }}
                />

                <input
                  type="search"
                  placeholder="Search PNR, passenger, flight..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  style={{
                    ...inputStyle,
                    paddingLeft: 40
                  }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                style={inputStyle}
              >
                <option value="all">
                  All Statuses
                </option>

                <option value="confirmed">
                  Confirmed
                </option>

                <option value="cancelled">
                  Cancelled
                </option>
              </select>
            </div>

            <p
              style={{
                ...mutedStyle,
                marginBottom: 18
              }}
            >
              Showing {filteredBookings.length} of{' '}
              {allBookings.length} loaded bookings
            </p>

            <BookingTable
              rows={filteredBookings}
              empty="No bookings match your search."
            />
          </div>
        )}

        {/* ====================================
            Manage Users
        ==================================== */}

        {tab === 'users' && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                gap: 18,
                marginBottom: 24
              }}
            >
              <StatCard
                icon={Users}
                label="Total Users"
                value={number(
                  userStats.totalUsers
                )}
                subtitle="Registered AeroBook accounts"
              />

              <StatCard
                icon={ShieldCheck}
                label="Administrators"
                value={number(
                  userStats.adminUsers
                )}
                subtitle="Accounts with admin access"
              />

              <StatCard
                icon={UserRound}
                label="Regular Users"
                value={number(
                  userStats.regularUsers
                )}
                subtitle="Standard customer accounts"
              />
            </div>

            <div style={cardStyle}>
              <PanelTitle
                title="Registered Users"
                subtitle="Search accounts and manage administrative access"
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
                  gap: 14,
                  marginBottom: 18
                }}
              >
                <div
                  style={{
                    position: 'relative'
                  }}
                >
                  <Search
                    size={17}
                    color={GOLD}
                    style={{
                      position: 'absolute',
                      top: 14,
                      left: 12
                    }}
                  />

                  <input
                    type="search"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) =>
                      setUserSearch(e.target.value)
                    }
                    style={{
                      ...inputStyle,
                      paddingLeft: 40
                    }}
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) =>
                    setRoleFilter(e.target.value)
                  }
                  style={inputStyle}
                >
                  <option value="all">
                    All Roles
                  </option>

                  <option value="admin">
                    Administrators
                  </option>

                  <option value="user">
                    Regular Users
                  </option>
                </select>
              </div>

              <p
                style={{
                  ...mutedStyle,
                  marginBottom: 18
                }}
              >
                Showing {filteredUsers.length} of{' '}
                {allUsers.length} loaded users
              </p>

              <UsersTable
                rows={filteredUsers}
                currentUserId={
                  user?._id || user?.id
                }
                changingRoleId={changingRoleId}
                onChangeRole={changeUserRole}
              />

              <div
                style={{
                  marginTop: 20,
                  padding: 15,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  borderRadius: 10,
                  background:
                    'rgba(212,175,88,0.06)',
                  border:
                    '1px solid rgba(212,175,88,0.18)'
                }}
              >
                <Shield
                  size={20}
                  color={GOLD}
                  style={{
                    flexShrink: 0,
                    marginTop: 2
                  }}
                />

                <div
                  style={{
                    color: '#D8C7AD',
                    fontSize: 13,
                    lineHeight: 1.7
                  }}
                >
                  <strong style={{ color: GOLD }}>
                    Security Information
                  </strong>

                  <div>
                    Only administrators can manage
                    roles. You cannot change your own
                    role, and the backend protects the
                    last remaining administrator.
                    Role changes require confirmation.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
