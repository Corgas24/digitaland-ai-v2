import { useState } from 'react';
import { Book, Code, Key, Terminal, MessageSquare, AlertCircle, Shield } from 'lucide-react';

export default function Docs() {
  const [activeTab, setActiveTab] = useState('introduction');

  return (
    <main style={{ paddingTop: '80px', minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>
      {/* Docs Sidebar */}
      <aside className="dash-sidebar" style={{ position: 'fixed', top: '80px', bottom: 0, overflowY: 'auto', zIndex: 100, paddingBottom: '150px' }}>
        <div style={{ padding: '0 1rem 1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Documentation</h2>
        </div>
        
        <div className="sidebar-group">
          <div className="sidebar-group-title">GETTING STARTED</div>
          <button className={`sidebar-link ${activeTab === 'introduction' ? 'active' : ''}`} onClick={() => setActiveTab('introduction')}>
            <Book size={18} /> Introduction
          </button>
          <button className={`sidebar-link ${activeTab === 'quickstart' ? 'active' : ''}`} onClick={() => setActiveTab('quickstart')}>
            <Terminal size={18} /> Quickstart
          </button>
        </div>

        <div className="sidebar-group" style={{ marginTop: '1.5rem' }}>
          <div className="sidebar-group-title">API REFERENCE</div>
          <button className={`sidebar-link ${activeTab === 'auth' ? 'active' : ''}`} onClick={() => setActiveTab('auth')}>
            <Key size={18} /> Authentication
          </button>
          <button className={`sidebar-link ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
            <MessageSquare size={18} /> Chat Completions
          </button>
          <button className={`sidebar-link ${activeTab === 'ratelimits' ? 'active' : ''}`} onClick={() => setActiveTab('ratelimits')}>
            <Shield size={18} /> Rate Limits
          </button>
          <button className={`sidebar-link ${activeTab === 'errors' ? 'active' : ''}`} onClick={() => setActiveTab('errors')}>
            <AlertCircle size={18} /> Error Codes
          </button>
        </div>
      </aside>

      {/* Docs Content */}
      <div style={{ marginLeft: '250px', padding: '3rem', flex: 1, maxWidth: '900px' }}>
        <div className="fade-in">
          
          {activeTab === 'introduction' && (
            <>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Introduction</h1>
              <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                Welcome to the Digitaland.ai API documentation. Our API provides a unified, high-performance gateway to the world's best frontier models (OpenAI, Anthropic, Google, DeepSeek, and more) through a single, OpenAI-compatible endpoint.
              </p>
              
              <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Key Features</h3>
                <ul style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingLeft: '1.2rem' }}>
                  <li><strong>100% OpenAI Compatible:</strong> Use standard OpenAI SDKs (Python, Node.js, etc.) without rewriting your codebase.</li>
                  <li><strong>Pay As You Go:</strong> No subscriptions. Pay only for the tokens you consume.</li>
                  <li><strong>240+ Models:</strong> Access models from 21 different providers via the exact same interface.</li>
                  <li><strong>Free Tier Models:</strong> Access top-tier models like Llama 3 and Gemini 2.0 Flash for free (small service fee applies).</li>
                  <li><strong>High Availability:</strong> Enterprise-grade routing and uptime.</li>
                </ul>
              </div>
            </>
          )}

          {activeTab === 'quickstart' && (
            <>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Quickstart</h1>
              <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                Get up and running with Digitaland.ai in less than 2 minutes. Since our API is compatible with OpenAI's structure, integration is practically instant.
              </p>

              <h3 style={{ marginBottom: '1rem', marginTop: '2rem' }}>1. Install the SDK</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>You can use the official OpenAI Python library:</p>
              <div className="code-window" style={{ marginBottom: '2rem' }}>
                <div className="code-body">
                  <div><span className="cv">$</span> pip install openai</div>
                </div>
              </div>

              <h3 style={{ marginBottom: '1rem' }}>2. Initialize the Client</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Replace the Base URL and add your API key generated from the Console.</p>
              <div className="code-window" style={{ marginBottom: '2rem' }}>
                <div className="code-body">
                  <div><span style={{ color: '#c678dd' }}>from</span> openai <span style={{ color: '#c678dd' }}>import</span> OpenAI</div>
                  <br />
                  <div>client = OpenAI(</div>
                  <div>  api_key=<span className="cs">"sk-dg-your-secret-key"</span>,</div>
                  <div>  base_url=<span className="cs">"https://api.digitaland.ai/v1"</span></div>
                  <div>)</div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'auth' && (
            <>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Authentication</h1>
              <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                All API requests require authentication using a Bearer token. You can generate API keys from your Console Dashboard.
              </p>

              <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '2rem' }}>
                <strong style={{ color: 'var(--red)', display: 'block', marginBottom: '0.5rem' }}>Security Warning</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Never commit your API keys to public repositories or client-side code. Always keep them secure in environment variables.</p>
              </div>

              <h3 style={{ marginBottom: '1rem' }}>HTTP Header Format</h3>
              <div className="code-window" style={{ marginBottom: '2rem' }}>
                <div className="code-body">
                  <div>Authorization: Bearer sk-dg-*************************</div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'chat' && (
            <>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Chat Completions</h1>
              <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                The <code style={{ background: 'var(--bg-alt)', padding: '2px 6px', borderRadius: '4px' }}>/v1/chat/completions</code> endpoint allows you to interact with all our supported text generation models.
              </p>

              <h3 style={{ marginBottom: '1rem' }}>Example Request (cURL)</h3>
              <div className="code-window" style={{ marginBottom: '2rem' }}>
                <div className="code-body">
                  <div>curl https://api.digitaland.ai/v1/chat/completions \</div>
                  <div>  -H <span className="cs">"Content-Type: application/json"</span> \</div>
                  <div>  -H <span className="cs">"Authorization: Bearer $DIGITALAND_API_KEY"</span> \</div>
                  <div>  -d <span className="cs">'{'{'}</span></div>
                  <div>    <span className="cs">"model"</span>: <span className="cs">"claude-3-5-sonnet"</span>,</div>
                  <div>    <span className="cs">"messages"</span>: [</div>
                  <div>      {'{'} <span className="cs">"role"</span>: <span className="cs">"user"</span>, <span className="cs">"content"</span>: <span className="cs">"Explain quantum computing in one sentence."</span> {'}'}</div>
                  <div>    ]</div>
                  <div>  <span className="cs">{'}'}'</span></div>
                </div>
              </div>

              <h3 style={{ marginBottom: '1rem' }}>Important Parameters</h3>
              <table className="key-table" style={{ width: '100%', marginBottom: '2rem', background: 'var(--bg-alt)', borderRadius: 'var(--radius)' }}>
                <thead>
                  <tr>
                    <th>PARAMETER</th>
                    <th>TYPE</th>
                    <th>DESCRIPTION</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ color: 'var(--primary)', fontWeight: 600 }}>model</td>
                    <td>string</td>
                    <td>ID of the model to use (e.g. <code>gpt-4o</code>, <code>claude-3-5-sonnet</code>). Check the Models page for a full list.</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--primary)', fontWeight: 600 }}>messages</td>
                    <td>array</td>
                    <td>A list of messages comprising the conversation so far.</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--primary)', fontWeight: 600 }}>stream</td>
                    <td>boolean</td>
                    <td>If set, partial message deltas will be sent as Server-Sent Events.</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {activeTab === 'ratelimits' && (
            <>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Rate Limits</h1>
              <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                To ensure platform stability and protect against automated abuse, Digitaland.ai enforces global rate limits on all API keys.
              </p>

              <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--primary)' }}>
                <h3 style={{ marginBottom: '1rem' }}>Burst Protection (RPM)</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  We enforce a minimum interval of <strong>500ms</strong> between requests from the same API key. This prevents rapid bot flooding.
                </p>
                <code style={{ background: 'var(--bg-alt)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                  Max 120 requests per minute (RPM)
                </code>
              </div>

              <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--green)' }}>
                <h3 style={{ marginBottom: '1rem' }}>Daily Quota</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Standard accounts have a daily request limit to prevent accidental cost overruns and security breaches.
                </p>
                <code style={{ background: 'var(--bg-alt)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                  1,000 requests per 24h (Standard Tier)
                </code>
              </div>

              <h3 style={{ marginBottom: '1rem' }}>Abuse Policy</h3>
              <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', lineHeight: 1.6 }}>
                Digitaland.ai reserves the right to suspend accounts that show patterns of systematic abuse, such as attempting to bypass rate limits using multiple accounts or conducting massive automated scanning.
              </p>
            </>
          )}

          {activeTab === 'errors' && (
            <>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Error Codes</h1>
              <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                When an API request fails, Digitaland.ai returns standard HTTP status codes along with a JSON response containing error details.
              </p>

              <table className="key-table" style={{ width: '100%', marginBottom: '2rem', background: 'var(--bg-alt)', borderRadius: 'var(--radius)' }}>
                <thead>
                  <tr>
                    <th>CODE</th>
                    <th>STATUS</th>
                    <th>DESCRIPTION</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ color: 'var(--red)', fontWeight: 600 }}>400</td>
                    <td>Bad Request</td>
                    <td>The request was unacceptable, often due to missing a required parameter or malformed JSON.</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--red)', fontWeight: 600 }}>401</td>
                    <td>Unauthorized</td>
                    <td>No valid API key provided. Check your Bearer token.</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--red)', fontWeight: 600 }}>402</td>
                    <td>Payment Required</td>
                    <td>Your account balance is insufficient to process this request. Please add credits.</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--red)', fontWeight: 600 }}>404</td>
                    <td>Not Found</td>
                    <td>The requested resource (or model ID) doesn't exist.</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--red)', fontWeight: 600 }}>429</td>
                    <td>Too Many Requests</td>
                    <td>Rate limit hit. This occurs when you exceed the 500ms burst protection or the daily quota.</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--red)', fontWeight: 600 }}>500</td>
                    <td>Server Error</td>
                    <td>Something went wrong on our end.</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

        </div>
      </div>
    </main>
  );
}
