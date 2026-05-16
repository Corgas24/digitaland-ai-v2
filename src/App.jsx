import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';

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

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <ScrollToTop />
        <div className="app-container">

      
        <AuthProvider>
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
            
            <Route path="/admin" element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } />
            
            {/* Dashboard Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/billing" element={
              <ProtectedRoute>
                <Billing />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/usage" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/logs" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/settings" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
          </Routes>
          <CookieConsent />
        </AuthProvider>
      </div>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
