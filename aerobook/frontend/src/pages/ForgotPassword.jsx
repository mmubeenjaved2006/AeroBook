import React, { useState } from 'react';

import { Link } from 'react-router-dom';

import {
  Plane,
  Mail,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

import { API } from '../lib/api';

/* ========================================
   Forgot Password Page
======================================== */

export default function ForgotPassword() {

  const [email, setEmail] = useState('');

  const [error, setError] = useState('');

  const [success, setSuccess] = useState(false);

  const [busy, setBusy] = useState(false);

  /* ========================================
     Send Password Reset Request
  ======================================== */

  async function submit(e) {

    e.preventDefault();

    setError('');

    setBusy(true);

    try {

      const response = await fetch(
        `${API}/auth/forgot-password`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          credentials: 'include',

          body: JSON.stringify({
            email: email.trim().toLowerCase()
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          'Unable to send password reset request'
        );
      }

      setSuccess(true);

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
     Forgot Password Interface
  ======================================== */

  return (

    <section className="auth-section">

      <div className="auth-card panel">

        {/* AeroBook Branding */}

        <div className="brand auth-brand">

          <Plane />

          Aero<span>Book</span>

        </div>

        {/* Security Heading */}

        <div className="eyebrow">

          ACCOUNT SECURITY

        </div>

        {!success ? (

          <>

            {/* Forgot Password Heading */}

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                margin: '20px 0'
              }}
            >

              <div
                style={{
                  width: '70px',
                  height: '70px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: 'rgba(212,175,88,0.08)',
                  border: '1px solid rgba(212,175,88,0.3)',
                  color: '#D4AF58'
                }}
              >

                <ShieldCheck size={32} />

              </div>

            </div>

            <h1>Forgot Password?</h1>

            <p className="muted">

              Enter your registered email address
              and we will send you a secure link
              to reset your password.

            </p>

            {/* Password Reset Form */}

            <form onSubmit={submit}>

              <label>

                <Mail size={16} />

                <input
                  type="email"
                  placeholder="Enter your email address"
                  aria-label="Email address"
                  autoComplete="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  maxLength={254}
                  disabled={busy}
                  required
                />

              </label>

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
                style={{
                  marginTop: '10px'
                }}
              >

                {busy
                  ? 'Sending Reset Link...'
                  : 'Send Reset Link'}

              </button>

            </form>

            {/* Security Notice */}

            <div
              style={{
                marginTop: '20px',
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(212,175,88,0.06)',
                border: '1px solid rgba(212,175,88,0.2)',
                fontSize: '13px',
                lineHeight: 1.7,
                color: '#B8B8B8'
              }}
            >

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#D4AF58',
                  marginBottom: '6px'
                }}
              >

                <ShieldCheck size={16} />

                <strong>Secure Password Recovery</strong>

              </div>

              Your password reset link will expire
              after 15 minutes and can only be
              used once.

            </div>

          </>

        ) : (

          <>

            {/* Success Icon */}

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                margin: '25px 0'
              }}
            >

              <div
                style={{
                  width: '80px',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: 'rgba(212,175,88,0.08)',
                  border: '1px solid #D4AF58',
                  color: '#D4AF58'
                }}
              >

                <CheckCircle2 size={40} />

              </div>

            </div>

            {/* Success Heading */}

            <h1>Check Your Email</h1>

            <p
              className="muted"
              role="status"
            >

              If an eligible account exists,
              a password reset link will be sent to:

            </p>

            {/* Email Address */}

            <p
              style={{
                color: '#D4AF58',
                fontWeight: 600,
                textAlign: 'center',
                overflowWrap: 'anywhere',
                margin: '15px 0'
              }}
            >

              {email}

            </p>

            {/* Email Instructions */}

            <div
              style={{
                padding: '18px',
                margin: '20px 0',
                borderRadius: '10px',
                background: 'rgba(212,175,88,0.06)',
                border: '1px solid rgba(212,175,88,0.2)',
                fontSize: '14px',
                lineHeight: 1.8,
                color: '#C8C8C8'
              }}
            >

              <strong
                style={{
                  color: '#D4AF58'
                }}
              >

                What to do next?

              </strong>

              <ol
                style={{
                  paddingLeft: '20px',
                  marginBottom: 0
                }}
              >

                <li>Open your email inbox.</li>

                <li>Find the AeroBook password reset email.</li>

                <li>Click the Reset Password button.</li>

                <li>Create your new password.</li>

              </ol>

            </div>

            {/* Spam Folder Notice */}

            <p
              className="muted"
              style={{
                fontSize: '13px',
                lineHeight: 1.7
              }}
            >

              Didn't receive an email? Check your
              spam or junk folder before trying again.

            </p>

            {/* Try Again Button */}

            <button
              type="button"
              className="btn gold full"
              onClick={() => {

                setSuccess(false);

                setError('');

              }}
            >

              Try Again

            </button>

          </>

        )}

        {/* Back To Login */}

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
              fontSize: '14px',
              fontWeight: 500
            }}
          >

            <ArrowLeft size={16} />

            Back to Login

          </Link>

        </div>

      </div>

    </section>
  );
}