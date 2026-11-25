import React, {
  useState,
  useEffect
} from 'react';

import {
  Link,
  useSearchParams
} from 'react-router-dom';

import {
  Plane,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';

import { API } from '../lib/api';

/* ========================================
   Reset Password Page
======================================== */

export default function ResetPassword() {

  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || '';

  /* ========================================
     Form States
  ======================================== */

  const [password, setPassword] = useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState('');

  const [success, setSuccess] = useState(false);

  const [busy, setBusy] = useState(false);

  const [checking, setChecking] = useState(true);

  const [validToken, setValidToken] = useState(false);

  /* ========================================
     Verify Password Reset Token
  ======================================== */

  useEffect(() => {

    const controller = new AbortController();

    async function verifyToken() {

      setChecking(true);

      setValidToken(false);

      setError('');

      if (!token) {

        setError('Invalid password reset link.');

        setChecking(false);

        return;
      }

      try {

        const response = await fetch(
          `${API}/auth/verify-reset-token?token=${encodeURIComponent(token)}`,
          {
            credentials: 'include',

            cache: 'no-store',

            signal: controller.signal
          }
        );

        const data = await response.json();

        if (!response.ok || !data.valid) {

          throw new Error(
            data.message ||
            'Password reset link is invalid or expired.'
          );
        }

        setValidToken(true);

      } catch (e) {

        if (e.name !== 'AbortError') {

          setError(e.message);

          setValidToken(false);
        }

      } finally {

        if (!controller.signal.aborted) {

          setChecking(false);
        }
      }
    }

    verifyToken();

    return () => controller.abort();

  }, [token]);

  /* ========================================
     Submit New Password
  ======================================== */

  async function submit(e) {

    e.preventDefault();

    setError('');

    if (!validToken || busy) {

      return;
    }

    /* Validate Password Length */

    if (password.length < 8) {

      setError(
        'Password must contain at least 8 characters.'
      );

      return;
    }

    if (
      new TextEncoder().encode(password).length > 72
    ) {

      setError(
        'Password must not exceed 72 bytes.'
      );

      return;
    }

    /* Confirm Password */

    if (password !== confirmPassword) {

      setError('Passwords do not match.');

      return;
    }

    setBusy(true);

    try {

      const response = await fetch(
        `${API}/auth/reset-password`,
        {
          method: 'POST',

          credentials: 'include',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            token,
            password,
            confirmPassword
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
          'Unable to reset your password.'
        );
      }

      setSuccess(true);

      setPassword('');

      setConfirmPassword('');

    } catch (e) {

      setError(
        e.message ||
        'Something went wrong. Please try again.'
      );

    } finally {

      setBusy(false);
    }
  }

  /* ========================================
     Password Eye Button Style
  ======================================== */

  const eyeButtonStyle = {
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
  };

  /* ========================================
     Password Field Style
  ======================================== */

  const passwordFieldStyle = {
    position: 'relative',

    display: 'flex',

    alignItems: 'center'
  };

  const inputStyle = {
    paddingRight: '42px',

    width: '100%',

    minWidth: 0
  };

  /* ========================================
     Security Icon Style
  ======================================== */

  const iconStyle = {
    width: '75px',

    height: '75px',

    borderRadius: '50%',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    background: 'rgba(212,175,88,0.08)',

    border: '1px solid rgba(212,175,88,0.3)',

    color: '#D4AF58',

    margin: '25px auto'
  };

  /* ========================================
     Reset Password Interface
  ======================================== */

  return (

    <section className="auth-section">

      <div className="auth-card panel">

        {/* AeroBook Branding */}

        <div className="brand auth-brand">

          <Plane />

          Aero<span>Book</span>

        </div>

        <div className="eyebrow">

          ACCOUNT SECURITY

        </div>

        {/* ========================================
            Checking Reset Token
        ======================================== */}

        {checking ? (

          <>

            <div style={iconStyle}>

              <ShieldCheck size={35} />

            </div>

            <h1>Verifying Reset Link</h1>

            <p className="muted">

              Please wait while we verify your
              password reset link.

            </p>

          </>

        ) : success ? (

          /* ========================================
             Password Reset Successful
          ======================================== */

          <>

            <div style={iconStyle}>

              <CheckCircle2 size={40} />

            </div>

            <h1>Password Reset Successful!</h1>

            <p className="muted">

              Your password has been updated
              successfully.

            </p>

            <div
              role="status"
              style={{
                padding: '18px',

                margin: '20px 0',

                borderRadius: '10px',

                background: 'rgba(212,175,88,0.06)',

                border: '1px solid rgba(212,175,88,0.2)',

                color: '#D4AF58',

                fontSize: '14px',

                lineHeight: 1.8
              }}
            >

              You can now sign in to your AeroBook
              account using your new password.

            </div>

            <Link
              to="/login"
              className="btn gold full"
              style={{
                display: 'flex',

                justifyContent: 'center',

                textDecoration: 'none'
              }}
            >

              Continue to Login

            </Link>

          </>

        ) : !validToken ? (

          /* ========================================
             Invalid or Expired Reset Token
          ======================================== */

          <>

            <div
              style={{
                ...iconStyle,

                color: '#F39A9A',

                border: '1px solid rgba(243,154,154,0.3)'
              }}
            >

              <AlertCircle size={38} />

            </div>

            <h1>Invalid or Expired Link</h1>

            <p className="muted">

              {error ||
                'Your password reset link is no longer valid.'}

            </p>

            <p className="muted">

              Please request a new password reset
              link to continue.

            </p>

            <Link
              to="/forgot-password"
              className="btn gold full"
              style={{
                display: 'flex',

                justifyContent: 'center',

                marginTop: '20px',

                textDecoration: 'none'
              }}
            >

              Request New Reset Link

            </Link>

          </>

        ) : (

          /* ========================================
             Create New Password Form
          ======================================== */

          <>

            <div style={iconStyle}>

              <Lock size={32} />

            </div>

            <h1>Create New Password</h1>

            <p className="muted">

              Choose a strong new password to
              secure your AeroBook account.

            </p>

            <form onSubmit={submit}>

              {/* New Password */}

              <label style={passwordFieldStyle}>

                <Lock size={16} />

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }

                  placeholder="New password"

                  aria-label="New password"

                  autoComplete="new-password"

                  value={password}

                  onChange={(e) =>
                    setPassword(e.target.value)
                  }

                  minLength={8}

                  style={inputStyle}

                  disabled={busy}

                  required
                />

                <button
                  type="button"

                  style={eyeButtonStyle}

                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }

                  onClick={() =>
                    setShowPassword(
                      (previous) => !previous
                    )
                  }
                >

                  {showPassword
                    ? <EyeOff size={19} />
                    : <Eye size={19} />
                  }

                </button>

              </label>

              {/* Confirm New Password */}

              <label style={passwordFieldStyle}>

                <Lock size={16} />

                <input
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }

                  placeholder="Confirm new password"

                  aria-label="Confirm new password"

                  autoComplete="new-password"

                  value={confirmPassword}

                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }

                  minLength={8}

                  style={inputStyle}

                  disabled={busy}

                  required
                />

                <button
                  type="button"

                  style={eyeButtonStyle}

                  aria-label={
                    showConfirmPassword
                      ? 'Hide confirm password'
                      : 'Show confirm password'
                  }

                  onClick={() =>
                    setShowConfirmPassword(
                      (previous) => !previous
                    )
                  }
                >

                  {showConfirmPassword
                    ? <EyeOff size={19} />
                    : <Eye size={19} />
                  }

                </button>

              </label>

              {/* Password Requirements */}

              <div
                style={{
                  padding: '14px',

                  margin: '15px 0',

                  borderRadius: '10px',

                  background: 'rgba(212,175,88,0.06)',

                  border: '1px solid rgba(212,175,88,0.2)',

                  fontSize: '13px',

                  lineHeight: 1.8,

                  color: '#B8B8B8'
                }}
              >

                <strong
                  style={{
                    color: '#D4AF58'
                  }}
                >

                  Password Requirements

                </strong>

                <div
                  style={{
                    display: 'flex',

                    alignItems: 'center',

                    gap: '8px',

                    marginTop: '8px',

                    color:
                      password.length >= 8
                        ? '#65C18C'
                        : '#B8B8B8'
                  }}
                >

                  <CheckCircle2 size={15} />

                  At least 8 characters

                </div>

                <div
                  style={{
                    display: 'flex',

                    alignItems: 'center',

                    gap: '8px',

                    color:
                      password &&
                      password === confirmPassword
                        ? '#65C18C'
                        : '#B8B8B8'
                  }}
                >

                  <CheckCircle2 size={15} />

                  Both passwords must match

                </div>

              </div>

              {/* Error Message */}

              {error && (

                <div
                  className="alert"
                  role="alert"
                >

                  {error}

                </div>

              )}

              {/* Reset Password Button */}

              <button
                type="submit"

                className="btn gold full"

                disabled={busy || !validToken}
              >

                {busy
                  ? 'Resetting Password...'
                  : 'Reset Password'}

              </button>

            </form>

          </>

        )}

        {/* Back To Login */}

        {!success && (

          <div
            style={{
              display: 'flex',

              justifyContent: 'center',

              marginTop: '25px'
            }}
          >

            <Link
              to="/login"

              style={{
                display: 'inline-flex',

                alignItems: 'center',

                gap: '8px',

                color: '#D4AF58',

                textDecoration: 'none',

                fontSize: '14px'
              }}
            >

              <ArrowLeft size={16} />

              Back to Login

            </Link>

          </div>

        )}

      </div>

    </section>
  );
}