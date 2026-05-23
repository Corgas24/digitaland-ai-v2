import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getDynamicModels, ourPrice, MINIMUM_CHARGE
} from '../data/models';
import {
  ArrowRight, ChevronDown, Shield, Zap, Globe, Loader2
} from 'lucide-react';

export default function Pricing() {
  const [models, setModels]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    getDynamicModels().then(data => { setModels(data); setLoading(false); });
  }, []);

  // ── Supabase models (no Free row shown in pricing)
  const activeModels = models.filter(m => m.badge !== 'Free');

  // ── flagships / popular for the featured cards
  const featuredModels = activeModels
    .filter(m => ['Flagship','Popular','Premium'].includes(m.badge))
    .slice(0, 3);

  /* ══════════════════════════════════════════════════════════════════════════
     PRICING ROW — no OpenRouter column, no free-catalog data
     ══════════════════════════════════════════════════════════════════════════ */
  const PricingRow = ({ m }) => {
    const ourIn  = ourPrice(m.offIn);
    const ourOut = ourPrice(m.offOut);

    return (
      <div className="pt-row">
        <div className="pt-col model">
          <div className="model-info">
            <span className="m-name">{m.name}</span>
            <span style={{ fontSize:'0.65rem',opacity:0.5,fontWeight:800,textTransform:'uppercase',marginLeft:'0.5rem' }}>
              {m.provider}
            </span>
          </div>
        </div>

        <div className="pt-col price">
          <div className="price-compare">
            <span className="our-p">${ourIn.toFixed(3)}</span>
          </div>
        </div>

        <div className="pt-col price">
          <div className="price-compare">
            <span className="our-p">${ourOut.toFixed(3)}</span>
          </div>
        </div>

        <div className="pt-col savings">
          <span className="s-badge badge-min" title={`All requests are billed at least ${MINIMUM_CHARGE}/1M tokens — gateway overhead`}>
            ≥ ${MINIMUM_CHARGE}/1M &nbsp;<span className="vs-label">min. guaranteed</span>
          </span>
        </div>
      </div>
    );
  };

  /* ══════════════════════════════════════════════════════════════════════════
     FEATURED CARD — Digitaland price only
     ══════════════════════════════════════════════════════════════════════════ */
  const PricingCard = ({ m, i }) => {
    const ourIn  = ourPrice(m.offIn);
    const p      = PROVIDERS[m.provider] || { color: 'var(--primary)' };

    return (
      <div className="pricing-card-elite fade-in-up" key={i} style={{ animationDelay:`${i*0.1}s` }}>
        <div className="p-card-header">
          <div className="p-card-icon" style={{ background:`${p.color}15`, color: p.color }}>
            <Zap size={20} />
          </div>
          <div className="p-card-title">
            <h3 style={{ textTransform:'uppercase' }}>{m.name}</h3>
            <span>{m.provider}</span>
          </div>
        </div>

        <div className="p-card-prices">
          <div className="p-price-row">
            <span className="label">Per 1M input tokens</span>
            <span className="value">${ourIn.toFixed(3)}<small>/1M</small></span>
          </div>
        </div>

        <div className="p-card-savings">
          <span className="save-tag" style={{ background: 'rgba(245,158,11,0.08)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.2)' }}>
            ≥ ${MINIMUM_CHARGE}/req &nbsp;·&nbsp; min. guaranteed
          </span>
        </div>
      </div>
    );
  };

  /* ══════════════════════════════════════════════════════════════════════════
     FAQ
     ══════════════════════════════════════════════════════════════════════════ */
  const FAQ_DATA = [
    { q: 'How is the minimum charge applied?',
      a: `Regardless of the upstream price of any model, every gateway request through Digitaland is billed at at least ${MINIMUM_CHARGE} per 1M tokens. This covers routing overhead, zero-log infrastructure, uptime SLA, and compliance — and is enforced server-side on every call.` },
    { q: 'Are credits time-limited?',
      a: `No. Credits never expire. There are no monthly minimums or lock-in contracts. Pay only for what you use, billed per request at our stated rates.` },
    { q: 'How do you calculate per-request billing?',
      a: `Each request is billed based on actual token usage (input + output), rounded up to the next cent. The per-M rate shown on this page is the unit price used to convert token counts into a billable amount.` },
  ];

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════════ */
  return (
    <main className="landing-root">

      <section className="hero">
        <div className="hero-glow" />
        <div className="container hero-center">
          <div className="status-badge fade-in-up">
            <span className="status-dot" />
            {loading ? 'Loading…' : `${activeModels.length} models live`}
            {loading && <Loader2 size={12} className="animate-spin" style={{ marginLeft:'0.5rem' }} />}
          </div>

          <h1 className="hero-headline-lg fade-in-up delay-1">
            Flat pricing.
            <br />
            <span className="hero-gradient-text">No fine print.</span>
          </h1>

          <p className="hero-sub fade-in-up delay-2"
             style={{ color:'var(--text-muted)', maxWidth:'600px', margin:'0 auto 2.5rem', lineHeight:1.8, fontSize:'1.1rem' }}>
            Transparent per-token rates from Digitaland with enterprise-grade uptime,
            zero-log routing, and a billing floor that keeps every request covered.
          </p>

          <div className="hero-btns fade-in-up delay-3" style={{ marginBottom: 0 }}>
            <Link to="/dashboard" className="btn-solid btn-lg">
              Get Started <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FEATURED — top models ─── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          {loading ? (
            <div style={{ display:'flex',justifyContent:'center',padding:'4rem' }}>
              <Loader2 className="animate-spin" size={32} color="var(--primary)" />
            </div>
          ) : (
            <div className="pricing-grid-premium">
              {featuredModels.map((m,i) => <PricingCard m={m} i={i} />)}
            </div>
          )}
        </div>
      </section>

      {/* ─── DETAILED TABLE ─── */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-title">
            <h2>Model Pricing</h2>
            <p>Per-token rates — input, output, and minimum guarantee</p>
          </div>

          <div className="pricing-table-premium fade-in-up">
            <div className="pt-header">
              <div className="pt-col model">Model</div>
              <div className="pt-col price">Input /1M</div>
              <div className="pt-col price">Output /1M</div>
              <div className="pt-col savings">Floor</div>
            </div>

            <div className="pt-body">
              {loading ? (
                <div style={{ padding:'2rem',textAlign:'center' }}>
                  <Loader2 className="animate-spin" size={24} style={{ margin:'0 auto' }} />
                </div>
              ) : (
                activeModels.map((m, i) => <PricingRow key={i} m={m} />)
              )}
            </div>
          </div>

          <p className="pt-legend" style={{ textAlign:'center',marginTop:'1.25rem',fontSize:'0.78rem',color:'var(--text-muted)' }}>
            All token prices are per 1M tokens. A per-request minimum of <strong style={{ color:'var(--green)' }}>≥ ${MINIMUM_CHARGE}</strong> is always applied,
            regardless of model or usage level.
          </p>

          <div style={{ textAlign:'center',marginTop:'3rem' }}>
            <Link to="/models" className="btn-outline">
              All 300+ Models <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── WHY PRICING IS DIFFERENT ─── */}
      <section className="section">
        <div className="container">
          <div className="section-title">
            <h2>Why our pricing is different</h2>
            <p>Honest rates, no fine print</p>
          </div>

          <div className="features-grid">
            {[
              {
                icon:  <Zap size={24} />,
                color: '#6366f1',
                bg:    'rgba(99,102,241,0.08)',
                title: 'Minimum Guaranteed',
                desc:  `No matter how cheap the upstream reference price is, your gateway call is always billed at least ${MINIMUM_CHARGE} / 1M tokens — covering routing, redundancy, uptime SLA, and your zero-log data guarantee.`,
                highlight: `≥ ${MINIMUM_CHARGE} / 1M tokens`,
              },
              {
                icon:  <Globe size={24} />,
                color: '#06b6d4',
                bg:    'rgba(6,182,212,0.08)',
                title: 'Per-Request Transparency',
                desc:  `Billing is calculated per actual request from input and output token usage — never rounded down, never hidden. Rates are expressed per 1M tokens for easy comparison.`,
                highlight: 'Billed per request',
              },
              {
                icon:  <Shield size={24} />,
                color: '#10b981',
                bg:    'rgba(16,185,129,0.08)',
                title: 'Enterprise SLAs',
                desc:  '99.9% uptime SLA with multi-region failover. Pay for reliability, not middleware. Credits never expire.',
                highlight: '99.9% uptime · Credits never expire',
              },
            ].map((f,i) => (
              <div className="feature-card" key={i}>
                <div className="feature-icon" style={{ background:f.bg, color:f.color }}><>{f.icon}</></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                {f.highlight && <span className="feature-highlight">{f.highlight}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-title">
            <h2>Frequently Asked Questions</h2>
          </div>
          <div className="faq-list">
            {FAQ_DATA.map((f,i) => (
              <div className="faq-item" key={i}>
                <button className="faq-trigger" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{f.q}</span>
                  <ChevronDown size={18}
                    style={{ transform: openFaq===i?'rotate(180deg)':'none', transition:'0.2s' }} />
                </button>
                {openFaq === i && <div className="faq-content">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
