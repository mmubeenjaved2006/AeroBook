import React, { useState } from 'react';

import {
  Link,
  useNavigate,
  useLocation
} from 'react-router-dom';

import {
  Plane,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff
} from 'lucide-react';

import { API } from '../lib/api';

import {
  useAuth
} from '../context/AuthContext';

/* ========================================
   Authentication Page
======================================== */

export default function Auth({ mode }) {

  const signup = mode === 'signup';

  const nav = useNavigate();

  const loc = useLocation();

  const {
    login,
    signup: register
  } = useAuth();

  /* ========================================
     Form States
  ======================================== */

  const [name, setName] = useState('');

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState(
    new URLSearchParams(loc.search).get('error')
      ? 'Google login failed. Check OAuth configuration.'
      : ''
  );

  const [busy, setBusy] = useState(false);

  /* ========================================
     Submit Authentication Form
  ======================================== */

  async function submit(e) {

    e.preventDefault();

    setBusy(true);

    setError('');

    try {

      if (signup) {

        await register(
          name.trim(),
          email.trim(),
          password
        );

      } else {

        await login(
          email.trim(),
          password
        );
      }

      nav('/bookings');

    } catch (e) {

      setError(e.message);

    } finally {

      setBusy(false);
    }
  }

  /* ========================================
     Authentication Interface
  ======================================== */

  return (

    <section className="auth-section">

      <div className="auth-card panel">

        {/* AeroBook Branding */}

        <div className="brand auth-brand">

          <Plane />

          Aero<span>Book</span>

        </div>

        {/* Welcome Section */}

        <div className="eyebrow">

          WELCOME {signup ? 'ABOARD' : 'BACK'}

        </div>

        <h1>

          {signup
            ? 'Create your account'
            : 'Sign in to AeroBook'}

        </h1>

        <p className="muted">

          {signup
            ? 'Begin your journey in style.'
            : 'Your next journey awaits.'}

        </p>

        {/* Google Authentication */}

        <a
          className="google-btn"
          href={`${API}/auth/google`}
        >

          <span className="google-g">

            G

          </span>

          Continue with Google

        </a>

        {/* Email Login Divider */}

        <div className="or">

          <span>

            or continue with email

          </span>

        </div>

        {/* Login / Signup Form */}

        <form onSubmit={submit}>

          {/* Full Name - Signup Only */}

          {signup && (

            <label>

              <User size={16} />

              <input
                type="text"
                placeholder="Full name"
                aria-label="Full name"
                autoComplete="name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                required
              />

            </label>

          )}

          {/* Email Address */}

          <label>

            <Mail size={16} />

            <input
              type="email"
              placeholder="Email address"
              aria-label="Email address"
              autoComplete="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />

          </label>

          {/* ========================================
              Password Field With Eye Button
          ======================================== */}

          <label
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}
          >

            <Lock size={16} />

            <input
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }

              placeholder={
                signup
                  ? 'Password (8+ characters)'
                  : 'Password'
              }

              aria-label="Password"

              autoComplete={
                signup
                  ? 'new-password'
                  : 'current-password'
              }

              value={password}

              onChange={(e) =>
                setPassword(e.target.value)
              }

              minLength={signup ? 8 : 1}

              style={{
                paddingRight: '42px',
                minWidth: 0,
                width: '100%'
              }}

              required
            />

            {/* Show / Hide Password Button */}

            <button
              type="button"

              onClick={() =>
                setShowPassword(
                  (previous) => !previous
                )
              }

              aria-label={
                showPassword
                  ? 'Hide password'
                  : 'Show password'
              }

              title={
                showPassword
                  ? 'Hide password'
                  : 'Show password'
              }

              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#D4AF58',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '5px',
                zIndex: 2
              }}
            >

              {showPassword
                ? <EyeOff size={19} />
                : <Eye size={19} />
              }

            </button>

          </label>

          {/* ========================================
              Forgot Password - Login Only
          ======================================== */}

          {!signup && (

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '4px',
                marginBottom: '16px'
              }}
            >

              <Link
                to="/forgot-password"

                style={{
                  color: '#D4AF58',
                  fontSize: '13px',
                  fontWeight: 500,
                  textDecoration: 'none'
                }}
              >

                Forgot Password?

              </Link>

            </div>

          )}

          {/* Error Message */}

          {error && (

            <div
              className="alert"
              role="alert"
            >

              {error}

            </div>

          )}

          {/* Submit Button */}

          <button
            type="submit"
            className="btn gold full"
            disabled={busy}
          >

            {busy
              ? 'Please wait...'
              : signup
                ? 'Create Account'
                : 'Log In'}

          </button>

        </form>

        {/* Switch Between Login and Signup */}

        <p className="muted auth-switch">

          {signup
            ? 'Already have an account?'
            : 'New to AeroBook?'}

          {' '}

          <Link
            to={signup ? '/login' : '/signup'}
            onClick={() => {
              setShowPassword(false);
              setPassword('');
              setError('');
            }}
          >

            {signup ? 'Log in' : 'Sign up'}

          </Link>

        </p>

      </div>

    </section>
  );
}