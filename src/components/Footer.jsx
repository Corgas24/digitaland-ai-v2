import { Link } from 'react-router-dom';

export default function Footer({ className = '' }) {
  return (
    <footer className={`footer ${className}`}>
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="nav-logo" style={{ marginBottom: '0.5rem' }}>
              <div className="logo-dot" />
              <span>digital<strong>and</strong></span>
              <span className="logo-ext">.ai</span>
            </Link>
            <p>
              Intelligent API gateway providing high-performance access to 260+ frontier AI models with enterprise-grade reliability.
            </p>
          </div>
          
          <div className="footer-col">
            <h4>Solutions</h4>
            <Link to="/models">AI Models</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/docs">Documentation</Link>
          </div>
          
          <div className="footer-col">
            <h4>Resources</h4>
            <Link to="/docs">API Reference</Link>
            <Link to="/models">Model Catalog</Link>
            <Link to="/pricing">Cost Calculator</Link>
          </div>
          
          <div className="footer-col">
            <h4>Legal</h4>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Digitaland.ai — All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
