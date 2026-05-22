import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PaymentProvider } from './contexts/PaymentContext';
import { PayPalScriptProvider, usePayPalScriptReducer } from '@paypal/react-paypal-js';
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

// This inner component runs INSIDE PayPalScriptProvider so it can use the dispatch hook
function PayPalBootstrapper() {
  const [, dispatch] = usePayPalScriptReducer();

  useEffect(() => {
    fetch(`${SUPABASE_URL}/functions/v1/paypal-config`, {
      headers: { 'apikey': SUPABASE_ANON_KEY },
    })
      .then(r => r.json())
      .then(data => {
        if (data.clientId) {
          // Inject the real client ID and load the PayPal JS SDK
          dispatch({
            type: 'resetOptions',
            value: {
              'client-id': data.clientId,
              currency: 'USD',
              intent: 'capture',
            },
          });
        }
      })
      .catch(err => console.error('PayPal config fetch failed:', err));
  }, [dispatch]);

  return null;
}

function App() {
  return (
    // Always mounted — deferLoading=true means SDK won't load until we dispatch resetOptions with the real client ID
    <PayPalScriptProvider
      options={{
        'client-id': 'placeholder-loading',
        currency: 'USD',
        intent: 'capture',
      }}
      deferLoading={true}
    >
      <PayPalBootstrapper />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
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
        </ThemeProvider>
      </BrowserRouter>
    </PayPalScriptProvider>
  );
}

export default App;
