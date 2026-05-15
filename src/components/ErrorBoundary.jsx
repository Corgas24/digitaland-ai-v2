import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          padding: '2rem',
          textAlign: 'center',
          background: 'var(--bg)',
        }}>
          <div style={{
            maxWidth: '500px',
            padding: '3rem',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            background: 'var(--bg-alt)',
          }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text)' }}>
              Something went wrong
            </h1>
            <p style={{ color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: '2rem' }}>
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
