import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css'
import App from './App.jsx'

// Ensure you replace this with the client ID if needed or load from env
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '38857242250-k3gnd9o1eir2kb3hqnbmr85rj5c27e7m.apps.googleusercontent.com';

// ─── GLOBAL UNHANDLED REJECTION GUARD ─────────────────────────────────────────
// Catches Supabase Edge Functions / Vercel 404 errors so they don't propagate
// to the ErrorBoundary and crash the UI. The error is logged to console for
// debugging and silently absorbed.
window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event.reason?.message || event.reason || '');
  const isNotFound =
    msg.includes('NOT_FOUND') ||
    msg.includes('Requested function was not found') ||
    msg.includes('requested path is invalid') ||
    msg.includes('cdg1::') ||
    msg.includes('404');

  if (isNotFound) {
    console.warn(
      '[GlobalGuard] Suppressed 404/NOT_FOUND error to prevent UI crash.',
      event.reason
    );
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const msg = String(event.message || '');
  if (msg.includes('NOT_FOUND') || msg.includes('404')) {
    console.warn('[GlobalGuard] Suppressed uncaught 404 error.', event.message);
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
