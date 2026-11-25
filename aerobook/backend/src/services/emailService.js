import nodemailer from 'nodemailer';

/* ========================================
   SMTP Transport Configuration
======================================== */

function getTransporter() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS
  } = process.env;

  if (
    !SMTP_HOST ||
    !SMTP_PORT ||
    !SMTP_USER ||
    !SMTP_PASS
  ) {
    throw new Error(
      'SMTP configuration is incomplete'
    );
  }

  const port = Number(SMTP_PORT);

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,

    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

/* ========================================
   HTML Escaping
======================================== */

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]
  );
}

/* ========================================
   Booking Confirmation Email
======================================== */

export async function sendBookingConfirmation({
  booking,
  flight,
  pdfBuffer
}) {
  const transporter = getTransporter();

  const passengerName = escapeHtml(
    booking.passenger.name
  );

  const pnr = escapeHtml(booking.pnr);

  const seat = escapeHtml(booking.seat);

  const flightNumber = escapeHtml(
    flight.flightNumber
  );

  const route = `${escapeHtml(
    flight.origin
  )} → ${escapeHtml(flight.destination)}`;

  const departure = new Date(
    flight.departure
  ).toLocaleString('en-GB', {
    timeZone: 'UTC',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const html = `
    <div style="
      background:#090B10;
      color:#F7F5F0;
      padding:35px;
      font-family:Arial,sans-serif;
    ">
      <h1 style="color:#D4AF58">
        AEROBOOK
      </h1>

      <h2>Booking Confirmed!</h2>

      <p>Hello ${passengerName},</p>

      <p>
        Your flight reservation has been
        confirmed successfully.
      </p>

      <div style="
        background:#17191F;
        border:1px solid #D4AF58;
        border-radius:12px;
        padding:20px;
        margin:20px 0;
      ">
        <p><strong>PNR:</strong> ${pnr}</p>

        <p>
          <strong>Flight:</strong>
          ${flightNumber}
        </p>

        <p><strong>Route:</strong> ${route}</p>

        <p><strong>Seat:</strong> ${seat}</p>

        <p>
          <strong>Departure (UTC):</strong>
          ${departure}
        </p>

        <p>
          <strong>Fare:</strong>
          PKR ${Number(
            booking.price
          ).toLocaleString('en-PK')}
        </p>
      </div>

      <p>
        Your PDF e-ticket is attached
        to this email.
      </p>

      <p style="
        color:#D4AF58;
        font-size:12px;
      ">
        DEMO RESERVATION ONLY —
        NOT VALID FOR AIRLINE TRAVEL
      </p>

      <p>
        Thank you for choosing AeroBook.
      </p>
    </div>
  `;

  const attachments = pdfBuffer
    ? [
        {
          filename: `AeroBook-${booking.pnr}.pdf`,

          content: pdfBuffer,

          contentType: 'application/pdf'
        }
      ]
    : [];

  return transporter.sendMail({
    from:
      process.env.SMTP_FROM ||
      process.env.SMTP_USER,

    to: booking.passenger.email,

    subject:
      `AeroBook Booking Confirmed - ${booking.pnr}`,

    html,

    attachments
  });
}

/* ========================================
   Password Reset Email
======================================== */

export async function sendPasswordResetEmail({
  to,
  name,
  resetURL
}) {
  const transporter = getTransporter();

  /* Validate Email and Reset URL */

  if (
    typeof to !== 'string' ||
    !to.includes('@') ||
    !resetURL
  ) {
    throw new Error(
      'Password reset email information is incomplete'
    );
  }

  const parsedURL = new URL(resetURL);

  const isLocalhost = [
    'localhost',
    '127.0.0.1'
  ].includes(parsedURL.hostname);

  if (
    parsedURL.protocol !== 'https:' &&
    !(
      parsedURL.protocol === 'http:' &&
      isLocalhost &&
      process.env.NODE_ENV !== 'production'
    )
  ) {
    throw new Error(
      'Invalid password reset URL'
    );
  }

  /* Escape User Information */

  const userName = escapeHtml(
    name || 'Customer'
  );

  const safeResetURL = escapeHtml(
    parsedURL.toString()
  );

  const year = new Date().getFullYear();

  /* ========================================
     Luxury Black & Gold Email Template
  ======================================== */

  const html = `
    <!DOCTYPE html>

    <html lang="en">

    <head>

      <meta charset="UTF-8">

      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
      >

      <title>AeroBook Password Reset</title>

    </head>

    <body style="
      margin:0;
      padding:0;
      background-color:#090B10;
      font-family:Arial,Helvetica,sans-serif;
      color:#F7F5F0;
    ">

      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        role="presentation"
        style="
          background-color:#090B10;
          padding:35px 15px;
        "
      >

        <tr>

          <td align="center">

            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="
                max-width:600px;
                background-color:#111318;
                border:1px solid #D4AF58;
                border-radius:16px;
              "
            >

              <!-- AeroBook Branding -->

              <tr>

                <td style="
                  padding:35px 25px;
                  text-align:center;
                  border-bottom:1px solid #34302A;
                ">

                  <h1 style="
                    margin:0;
                    color:#D4AF58;
                    font-size:30px;
                    letter-spacing:5px;
                  ">
                    AEROBOOK
                  </h1>

                  <p style="
                    margin:10px 0 0;
                    color:#B8B8B8;
                    font-size:12px;
                    letter-spacing:2px;
                  ">
                    PREMIUM FLIGHT RESERVATIONS
                  </p>

                </td>

              </tr>

              <!-- Password Reset Content -->

              <tr>

                <td style="
                  padding:35px 30px;
                ">

                  <h2 style="
                    margin:0 0 20px;
                    color:#D4AF58;
                    font-size:25px;
                  ">
                    Reset Your Password
                  </h2>

                  <p style="
                    color:#F7F5F0;
                    font-size:16px;
                    line-height:1.7;
                  ">
                    Hello ${userName},
                  </p>

                  <p style="
                    color:#C8C8C8;
                    font-size:15px;
                    line-height:1.8;
                  ">
                    We received a request to reset
                    the password associated with
                    your AeroBook account.
                  </p>

                  <p style="
                    color:#C8C8C8;
                    font-size:15px;
                    line-height:1.8;
                  ">
                    Click the button below to create
                    a new password and securely
                    regain access to your account.
                  </p>

                  <!-- Reset Password Button -->

                  <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    role="presentation"
                  >

                    <tr>

                      <td
                        align="center"
                        style="padding:25px 0;"
                      >

                        <a
                          href="${safeResetURL}"
                          style="
                            display:inline-block;
                            background-color:#D4AF58;
                            color:#090B10;
                            padding:16px 32px;
                            border-radius:8px;
                            text-decoration:none;
                            font-size:16px;
                            font-weight:bold;
                          "
                        >
                          Reset Password
                        </a>

                      </td>

                    </tr>

                  </table>

                  <!-- Expiration Notice -->

                  <div style="
                    background-color:#1B1A17;
                    border:1px solid #6D592E;
                    border-radius:10px;
                    padding:18px;
                    margin:20px 0;
                  ">

                    <p style="
                      margin:0 0 8px;
                      color:#D4AF58;
                      font-size:15px;
                      font-weight:bold;
                    ">
                      Important Security Notice
                    </p>

                    <p style="
                      margin:0;
                      color:#C8C8C8;
                      font-size:14px;
                      line-height:1.7;
                    ">
                      This password reset link will
                      expire in 15 minutes and can
                      only be used once.
                    </p>

                  </div>

                  <!-- Alternative Reset Link -->

                  <p style="
                    color:#B8B8B8;
                    font-size:13px;
                    line-height:1.7;
                  ">
                    If the button does not work,
                    copy and paste the following
                    link into your browser:
                  </p>

                  <p style="
                    font-size:12px;
                    line-height:1.7;
                    word-break:break-all;
                    overflow-wrap:anywhere;
                  ">

                    <a
                      href="${safeResetURL}"
                      style="color:#D4AF58;"
                    >
                      ${safeResetURL}
                    </a>

                  </p>

                  <!-- Unauthorized Request Notice -->

                  <p style="
                    color:#B8B8B8;
                    font-size:13px;
                    line-height:1.7;
                    margin-top:25px;
                  ">
                    If you did not request a
                    password reset, you can safely
                    ignore this email. Your password
                    will remain unchanged.
                  </p>

                  <p style="
                    color:#F7F5F0;
                    font-size:14px;
                    line-height:1.7;
                  ">
                    Best regards,
                    <br>
                    <strong style="color:#D4AF58;">
                      AeroBook Security Team
                    </strong>
                  </p>

                </td>

              </tr>

              <!-- Email Footer -->

              <tr>

                <td style="
                  padding:25px;
                  text-align:center;
                  border-top:1px solid #34302A;
                ">

                  <p style="
                    margin:0 0 10px;
                    color:#D4AF58;
                    font-size:16px;
                    font-weight:bold;
                    letter-spacing:3px;
                  ">
                    AEROBOOK
                  </p>

                  <p style="
                    color:#999999;
                    font-size:12px;
                    line-height:1.7;
                  ">
                    This is an automated security
                    email. Please do not reply.
                  </p>

                  <p style="
                    color:#777777;
                    font-size:11px;
                  ">
                    &copy; ${year} AeroBook.
                    All rights reserved.
                  </p>

                </td>

              </tr>

            </table>

          </td>

        </tr>

      </table>

    </body>

    </html>
  `;

  /* Plain Text Email Fallback */

  const text = `
Hello ${name || 'Customer'},

We received a request to reset your AeroBook password.

Reset your password using the following link:

${parsedURL.toString()}

This link expires in 15 minutes and can only be used once.

If you did not request a password reset, please ignore this email.

Best regards,
AeroBook Security Team
  `.trim();

  /* Send Password Reset Email */

  return transporter.sendMail({
    from:
      process.env.SMTP_FROM ||
      process.env.SMTP_USER,

    to,

    subject:
      'AeroBook - Reset Your Password',

    text,

    html
  });
}