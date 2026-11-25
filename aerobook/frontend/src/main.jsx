import React from 'react';

import { createRoot } from 'react-dom/client';

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import {
  AuthProvider,
  useAuth
} from './context/AuthContext';

import Layout from './components/Layout';

import Home from './pages/Home';
import Flights from './pages/Flights';
import SeatSelect from './pages/SeatSelect';
import Auth from './pages/Auth';
import Bookings from './pages/Bookings';
import Confirmation from './pages/Confirmation';
import Admin from './pages/Admin';

/* Password Recovery Pages */

import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import './styles.css';

/* ========================================
   Google OAuth Success Component
======================================== */

function OAuthSuccess() {

  const { refresh } = useAuth();

  React.useEffect(() => {

    refresh().then(() => {

      window.location.replace('/bookings');

    });

  }, []);

  return (

    <div className="container section">

      Completing Google sign-in...

    </div>

  );
}

/* ========================================
   Main Application Component
======================================== */

function App() {

  return (

    <BrowserRouter>

      <AuthProvider>

        <Layout>

          <Routes>

            {/* Home Page */}

            <Route
              path="/"
              element={<Home />}
            />

            {/* Flight Search Page */}

            <Route
              path="/flights"
              element={<Flights />}
            />

            {/* Seat Selection Page */}

            <Route
              path="/flights/:id"
              element={<SeatSelect />}
            />

            {/* Login Page */}

            <Route
              path="/login"
              element={<Auth mode="login" />}
            />

            {/* Signup Page */}

            <Route
              path="/signup"
              element={<Auth mode="signup" />}
            />

            {/* ========================================
                Forgot Password Page
            ======================================== */}

            <Route
              path="/forgot-password"
              element={<ForgotPassword />}
            />

            {/* ========================================
                Reset Password Page
            ======================================== */}

            <Route
              path="/reset-password"
              element={<ResetPassword />}
            />

            {/* Google OAuth Success */}

            <Route
              path="/auth/success"
              element={<OAuthSuccess />}
            />

            {/* My Bookings Page */}

            <Route
              path="/bookings"
              element={<Bookings />}
            />

            {/* Booking Confirmation Page */}

            <Route
              path="/confirmation/:id"
              element={<Confirmation />}
            />

            {/* Admin Dashboard */}

            <Route
              path="/admin"
              element={<Admin />}
            />

            {/* Redirect Unknown Routes */}

            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />

          </Routes>

        </Layout>

      </AuthProvider>

    </BrowserRouter>

  );
}

/* ========================================
   React Application Entry Point
======================================== */

createRoot(
  document.getElementById('root')
).render(
  <App />
);