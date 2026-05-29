import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PaymentProvider } from './contexts/PaymentContext';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';
import DisclaimerModal from './components/DisclaimerModal';
import SupportChat from './components/SupportChat';

// Lazy loading all major pages to shrink bundle size and increase initial page load speed
const Landing = lazy(() => import('./pages/Landing'));
const Models = lazy(() => import('./pages/Models'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Docs = lazy(() => import('./pages/Docs'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SignIn = lazy(() => import('./pages/SignIn'));
const SignUp = lazy(() => import('./pages/SignUp'));
const Playground = lazy(() => import('./pages/Playground'));
const Billing = lazy(() => import('./pages/Billing'));
const Admin = lazy(() => import('./pages/Admin'));
const Legal = lazy(() => import('./pages/Legal'));

function PageLoader() {
  return (
    <div style={{ 
      height: '80vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'var(--bg)', 
      color: 'var(--text)' 
    }}>
      <div className="shimmer" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', opacity: 0.8 }} />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "test";

  return (
    <PayPalScriptProvider options={{
      'client-id': paypalClientId,
      currency: 'USD',
      intent: 'capture',
    }}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <ScrollToTop />
          <div className="app-container">
            <AuthProvider>
              <PaymentProvider>
                <Navbar />
                <Suspense fallback={<PageLoader />}>
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
                    <Route path="/dashboard/keys" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/dashboard/usage" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/dashboard/logs" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/dashboard/settings" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  </Routes>
                </Suspense>
                <CookieConsent />
                <DisclaimerModal />
                <SupportChat />
              </PaymentProvider>
            </AuthProvider>
          </div>
        </ThemeProvider>
      </BrowserRouter>
    </PayPalScriptProvider>
  );
}

export default App;
