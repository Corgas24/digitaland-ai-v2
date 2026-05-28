import React from 'react';
import { PROVIDERS } from '../data/models';

// ── Local PNG logos served from /public/ ──────────────────────────────────────
const LOCAL_LOGOS = {
  OpenAI:          { src: '/openai-logo.png',    bg: '#ffffff' },
  Anthropic:       { src: '/anthropic-logo.png', bg: '#cc9b7c' },
  Google:          { src: '/gemini-logo.png',    bg: '#ffffff' },
  DeepSeek:        { src: '/deepseek-logo.png',  bg: '#ffffff' },
  Alibaba:         { src: '/qwen-logo.png',      bg: '#ffffff' },
  Cohere:          { src: '/cohere-logo.png',    bg: '#ffffff' },
  'Stability AI':  { src: '/stability-logo.png', bg: '#0f0926' },
  Midjourney:      { src: '/midjourney-logo.png',bg: '#07080e' },
  ByteDance:       { src: '/bytedance-logo.png', bg: '#ffffff' },
};

/**
 * ProviderLogo — renders the correct logo for every AI provider.
 * Priority: local PNG → inline SVG → branded letter fallback.
 */
export default function ProviderLogo({ provider, name = '', size = 32, style = {} }) {
  const provName = provider ? provider.trim() : '';

  const base = {
    width: size, height: size,
    borderRadius: '25%',
    objectFit: 'contain',
    flexShrink: 0,
    display: 'inline-block',
    verticalAlign: 'middle',
    ...style,
  };

  // ── 1. Local PNGs ─────────────────────────────────────────────────
  const local = LOCAL_LOGOS[provName];
  if (local) {
    return (
      <img
        src={local.src}
        alt={provName}
        style={{
          ...base,
          background: local.bg,
          padding: size > 24 ? '4px' : '2px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.2)',
        }}
        onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }}
      />
    );
  }

  // ── 2. Inline SVGs ────────────────────────────────────────────────
  const s = { ...base };

  switch (provName) {

    case 'Meta':
      return (
        <svg viewBox="0 0 24 24" fill="none" style={s}>
          <rect width="24" height="24" rx="6" fill="#0064e0"/>
          <path d="M16.8 9.5c-.8 0-1.5.4-2 1-.5-.6-1.2-1-2-1-1.5 0-2.8 1.2-2.8 2.8 0 1.5 1.2 2.8 2.8 2.8.8 0 1.5-.4 2-1 .5.6 1.2 1 2 1 1.5 0 2.8-1.2 2.8-2.8 0-1.5-1.2-2.8-2.8-2.8zm-4.8 4.5c-.9 0-1.6-.7-1.6-1.7 0-1 .7-1.7 1.6-1.7.6 0 1.2.4 1.4 1-.2.6-.8 1.4-1.4 1.4zm4.8 0c-.6 0-1.2-.4-1.4-1 .2-.6.8-1.4 1.4-1.4.9 0 1.6.7 1.6 1.7 0 1-.7 1.7-1.6 1.7z" fill="#fff"/>
        </svg>
      );

    case 'Mistral':
      return (
        <svg viewBox="0 0 24 24" fill="none" style={s}>
          <rect width="24" height="24" rx="6" fill="#111"/>
          <rect x="5" y="7" width="3" height="10" fill="#fd7e14"/>
          <rect x="16" y="7" width="3" height="10" fill="#fd7e14"/>
          <rect x="8" y="7" width="3" height="3" fill="#fd7e14"/>
          <rect x="13" y="7" width="3" height="3" fill="#fd7e14"/>
          <rect x="8" y="13" width="8" height="2" fill="#fd7e14"/>
          <rect x="11" y="10" width="2" height="3" fill="#fd7e14"/>
        </svg>
      );

    case 'xAI':
      return (
        <svg viewBox="0 0 24 24" fill="none" style={s}>
          <rect width="24" height="24" rx="6" fill="#000"/>
          <path d="M18.2 5.5h-2.7l-4.2 5.5-4.2-5.5H4.4l5.5 7.2L4 18.5h2.7l4.5-6 4.5 6h2.7l-5.8-7.7 5.8-7.3z" fill="#fff"/>
        </svg>
      );

    case 'Microsoft':
      return (
        <svg viewBox="0 0 24 24" fill="none" style={s}>
          <rect width="24" height="24" rx="6" fill="#f2f2f2"/>
          <rect x="4" y="4" width="7.5" height="7.5" fill="#f25022"/>
          <rect x="12.5" y="4" width="7.5" height="7.5" fill="#7fba00"/>
          <rect x="4" y="12.5" width="7.5" height="7.5" fill="#00a4ef"/>
          <rect x="12.5" y="12.5" width="7.5" height="7.5" fill="#ffb900"/>
        </svg>
      );

    case 'Amazon':
      return (
        <svg viewBox="0 0 24 24" fill="none" style={s}>
          <rect width="24" height="24" rx="6" fill="#232f3e"/>
          <path d="M6 13.5c3 2 9 2 12 0 .5-.3 1 .2.7.7-1.3 1.8-6.3 3.3-12 .5-.3-.4.1-1 .3-1.2zm11.5-.7c.3.5.5.9.8 1.4-.2.2-.4.4-.7.6-.3-.5-.6-1-.8-1.4.2-.2.5-.4.7-.6z" fill="#ff9900"/>
        </svg>
      );

    case 'Perplexity':
      return (
        <svg viewBox="0 0 24 24" fill="none" style={s}>
          <rect width="24" height="24" rx="6" fill="#191a1a"/>
          <path d="M12 4v16M4 12h16" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M7 7l10 10M17 7L7 17" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      );

    case 'OpenRouter':
      return (
        <svg viewBox="0 0 24 24" fill="none" style={s}>
          <rect width="24" height="24" rx="6" fill="#0f0720"/>
          <circle cx="12" cy="12" r="3" fill="#a855f7"/>
          <path d="M12 4v5M12 15v5M4 12h5M15 12h5" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );

    case 'Moonshot':
      return (
        <svg viewBox="0 0 24 24" fill="none" style={s}>
          <rect width="24" height="24" rx="6" fill="#0a0f2e"/>
          <path d="M16 8a6 6 0 01-6 10A6 6 0 0116 8z" fill="#4058f2"/>
          <circle cx="17" cy="7" r="1.5" fill="#8899ff"/>
        </svg>
      );

    case 'MiniMax':
      return (
        <svg viewBox="0 0 24 24" fill="none" style={s}>
          <rect width="24" height="24" rx="6" fill="#082c1e"/>
          <path d="M6 17V7l6 5 6-5v10" stroke="#1dcd8d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );

    case 'Zhipu':
      return (
        <svg viewBox="0 0 24 24" fill="none" style={s}>
          <rect width="24" height="24" rx="6" fill="#0a0a2e"/>
          <circle cx="12" cy="12" r="5" stroke="#3c3ffb" strokeWidth="2.5"/>
          <circle cx="12" cy="12" r="2" fill="#3c3ffb"/>
        </svg>
      );

    case 'Kuaishou':
      return (
        <svg viewBox="0 0 24 24" fill="none" style={s}>
          <rect width="24" height="24" rx="6" fill="#1a0800"/>
          <path d="M8 7v10l8-5-8-5z" fill="#ff4d00"/>
        </svg>
      );

    case 'Xiaomi':
      return (
        <svg viewBox="0 0 24 24" fill="none" style={s}>
          <rect width="24" height="24" rx="6" fill="#ff6900"/>
          <text x="12" y="16.5" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff" fontFamily="sans-serif">mi</text>
        </svg>
      );

    default: {
      const prov = PROVIDERS[provName] || {};
      const color = prov.color || '#6366f1';
      const label = prov.short || provName?.[0]?.toUpperCase() || '?';
      return (
        <div style={{
          ...s,
          background: `${color}20`,
          border: `1.5px solid ${color}40`,
          color,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: size > 24 ? '0.7rem' : '0.55rem',
          fontFamily: 'sans-serif',
          letterSpacing: '-0.02em',
        }}>
          {label}
        </div>
      );
    }
  }
}
