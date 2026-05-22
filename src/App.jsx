import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PaymentProvider } from './contexts/PaymentContext';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';
import DisclaimerModal from './components/DisclaimerModal';

// Direct imports for maximum stability
import Landing from './pages/Landing';
import Models from './pages/Models';
import Pricing from './pages/Pricing';
import Docs from './pages/Docs';
import Dashboard from './pages/Dashboard';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Playground from './pages/Playground';
import Billing from './pages/Billing';
import Admin from './pages/Admin';
import Legal from './pages/Legal';

const SUPABASE_URL = 'https://fycqiwfbhqbltsthrpxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5Y3Fpd2ZiaHFibHRzdGhycHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MTUwMDcsImV4cCI6MjA4NTQ5MTAwN30.HecOV_tntiiL3n8I4x66nhyfjRC0iFW5qxpSU1U9BHM';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <div className="app-container">
        <AuthProvider>
          <PaymentProvider>
            <Navbar />
            <Routes>
              <Route path="/" element={<><Landing /><Footer /></>} />
              <Route path="/models" element={<><Models /><Footer /></>} />
              <Route path="/pricing" element={<><Pricing /><Footer /></>} />
              <Route path="/docs" element={<><Docs /><Footer /></>} />
              <Route path="/privacy" element={<Legal title="Privacy Policy" />} />
              <Route path="/terms" element={<Legal title="Terms of Service" />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/playground" element={<ProtectedRoute><Playground /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              <Route path="/dashboard/usage" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/logs" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/settings" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            </Routes>
            <CookieConsent />
            <DisclaimerModal />
          </PaymentProvider>
        </AuthProvider>
      </div>
    </>
  );
}

function App() {
  const [paypalClientId, setPaypalClientId] = useState(null);

  useEffect(() => {
    // Fetch PayPal client ID from our secure backend endpoint
    fetch(`${SUPABASE_URL}/functions/v1/paypal-config`, {
      headers: { 'apikey': SUPABASE_ANON_KEY },
    })
      .then(r => r.json())
      .then(data => {
        if (data.clientId) setPaypalClientId(data.clientId);
      })
      .catch(() => {
        // Fallback: use env var if available
        const fallback = import.meta.env.VITE_PAYPAL_CLIENT_ID;
        if (fallback) setPaypalClientId(fallback);
      });
  }, []);

  if (!paypalClientId) {
    // Render without PayPal until client ID loads (non-blocking)
    return (
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </BrowserRouter>
    );
  }

  return (
    <PayPalScriptProvider options={{
      'client-id': paypalClientId,
      currency: 'USD',
      intent: 'capture',
    }}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </BrowserRouter>
    </PayPalScriptProvider>
  );
}

export default App;
