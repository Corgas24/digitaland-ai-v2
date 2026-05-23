import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDynamicModels, PROVIDERS } from '../data/models';
import { Search, Copy, Check, X, Loader2, ArrowUpRight } from 'lucide-react';

const CATEGORIES = [
  { id: 'All', label: 'All', icon: '🌐' },
  { id: 'Chat', label: 'Chat', icon: '💬' },
  { id: 'Image', label: 'Image', icon: '🎨' },
  { id: 'Video', label: 'Video', icon: '🎬' },
  { id: 'Code', label: 'Code', icon: '💻' },
  { id: 'Voice', label: 'Voice', icon: '🗣️' },
  { id: 'Music', label: 'Music', icon: '🎵' },
  { id: 'Embedding', label: 'Embedding', icon: '📐' },
  { id: 'Language', label: 'Language', icon: '🗣️' },
  { id: '3D', label: '3D', icon: '📦' },
  { id: 'OCR', label: 'OCR', icon: '🔍' }
];

export default function Models() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);
  const [copyAlert, setCopyAlert] = useState(false);

  const ITEMS_PER_PAGE = 36;

  // 1. Fetch Dynamic Models from Supabase
  useEffect(() => {
    getDynamicModels().then(data => {
      setModels(data || []);
      setLoading(false);
    });
  }, []);

  // Reset page when filtering or searching
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeCategory]);

  // 2. Filter Models by Search and Category
  const filtered = useMemo(() => {
    return models.filter(m => {
      if (!m) return false;
      // Search logic
      const q = search ? search.toLowerCase() : '';
      const nameLower = (m.name || '').toLowerCase();
      const providerLower = (m.provider || '').toLowerCase();
      const typeLower = (m.type || '').toLowerCase();

      const matchSearch = !q || 
        nameLower.includes(q) || 
        providerLower.includes(q) || 
        typeLower.includes(q);

      if (!matchSearch) return false;

      // Category logic
      if (activeCategory === 'All') return true;
      
      if (activeCategory === 'Chat') {
        return typeLower === 'chat' || typeLower === 'reasoning' || typeLower === 'vision' || typeLower === 'moe';
      }
      if (activeCategory === 'Image') {
        return typeLower === 'image';
      }
      if (activeCategory === 'Video') {
        return typeLower === 'video';
      }
      if (activeCategory === 'Code') {
        return typeLower === 'code';
      }
      if (activeCategory === 'Voice') {
        return typeLower === 'voice' || typeLower === 'audio';
      }
      if (activeCategory === 'Music') {
        return typeLower === 'music';
      }
      if (activeCategory === 'Embedding') {
        return typeLower === 'embedding';
      }
      if (activeCategory === 'Language') {
        return typeLower === 'language' || typeLower === 'chat' || typeLower === 'reasoning';
      }
      if (activeCategory === '3D') {
        return typeLower === '3d' || typeLower.includes('3d');
      }
      if (activeCategory === 'OCR') {
        return typeLower === 'ocr';
      }

      return typeLower === activeCategory.toLowerCase();
    });
  }, [models, search, activeCategory]);

  // 3. Paginated Models
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginatedModels = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  // 4. Handle Copy Event
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setCopyAlert(true);
    setTimeout(() => {
      setCopiedId(null);
      setCopyAlert(false);
    }, 2000);
  };

  const handleResetFilters = () => {
    setSearch('');
    setActiveCategory('All');
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Provider logo renderer with smooth error boundary fallback
  const ProviderLogo = ({ m }) => {
    const [failed, setFailed] = useState(false);
    const providerName = m?.provider || 'AI';
    const prov = PROVIDERS[providerName];
    
    if (prov && prov.logo && !failed) {
      return (
        <img
          src={prov.logo}
          alt={`${providerName} logo`}
          className="model-card-provider-logo"
          onError={() => setFailed(true)}
        />
      );
    }
    
    const initial = providerName[0] ? providerName[0].toUpperCase() : 'AI';
    
    return (
      <div
        className="model-card-provider-fallback"
        style={{
          background: prov?.color || 'var(--primary)'
        }}
      >
        {prov?.short || initial}
      </div>
    );
  };

  return (
    <main className="models-premium-root">
      {/* Self-contained premium scoped styles */}
      <style>{`
        .models-premium-root {
          min-height: 100vh;
          background: var(--bg);
          position: relative;
          overflow: hidden;
          padding-top: 5rem;
          padding-bottom: 5rem;
          font-family: 'Inter', sans-serif;
        }

        .models-mesh-glow {
          position: absolute;
          top: -150px;
          right: -150px;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(255, 105, 180, 0.12) 0%, rgba(255, 222, 173, 0.04) 50%, transparent 100%);
          pointer-events: none;
          z-index: 0;
          filter: blur(80px);
        }
        [data-theme="dark"] .models-mesh-glow {
          background: radial-gradient(circle, rgba(236, 72, 153, 0.06) 0%, rgba(244, 63, 94, 0.02) 50%, transparent 100%);
        }

        .models-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
          position: relative;
          z-index: 10;
        }

        .models-breadcrumb {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: 2.5rem;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-weight: 500;
        }
        .models-breadcrumb a {
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.2s;
        }
        .models-breadcrumb a:hover {
          color: var(--primary);
        }
        .breadcrumb-separator {
          opacity: 0.5;
        }
        .breadcrumb-current {
          color: var(--text-dim);
        }

        .models-hero-centered {
          text-align: center;
          margin-bottom: 2rem;
        }

        .models-title {
          font-family: 'Outfit', sans-serif;
          font-size: 3.5rem;
          font-weight: 800;
          line-height: 1.1;
          color: var(--text);
          margin-bottom: 2.25rem;
          letter-spacing: -0.03em;
        }
        @media (max-width: 768px) {
          .models-title {
            font-size: 2.5rem;
          }
        }

        .search-bar-container {
          display: flex;
          justify-content: center;
          margin-bottom: 2rem;
          width: 100%;
        }
        .search-input-wrapper {
          position: relative;
          max-width: 680px;
          width: 100%;
          display: flex;
          align-items: center;
        }
        .search-icon-left {
          position: absolute;
          left: 1.25rem;
          color: var(--text-muted);
          pointer-events: none;
          opacity: 0.6;
        }
        .models-search-input-centered {
          width: 100%;
          background: var(--bg-alt);
          border: 1px solid var(--border-light);
          border-radius: 9999px;
          padding: 0.85rem 1.5rem 0.85rem 3.2rem;
          color: var(--text);
          font-size: 1rem;
          font-family: inherit;
          outline: none;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 10px rgba(0,0,0,0.01);
        }
        .models-search-input-centered:focus {
          border-color: var(--text-muted);
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
        }
        .search-clear-btn {
          position: absolute;
          right: 1.25rem;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .search-clear-btn:hover {
          opacity: 1;
        }

        .categories-pill-scroll {
          display: flex;
          justify-content: center;
          width: 100%;
          margin-bottom: 3.5rem;
          overflow: hidden;
        }
        .categories-pill-inner {
          display: flex;
          gap: 0.6rem;
          overflow-x: auto;
          scrollbar-width: none;
          padding: 0.25rem;
          max-width: 100%;
          justify-content: flex-start;
        }
        .categories-pill-inner::-webkit-scrollbar {
          display: none;
        }
        .category-pill-btn {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.5rem 1.1rem;
          border-radius: 9999px;
          background: var(--bg-alt);
          border: 1px solid var(--border-light);
          color: var(--text-dim);
          font-size: 0.85rem;
          font-weight: 550;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .category-pill-btn:hover {
          transform: translateY(-1px);
          border-color: var(--text-muted);
          background: var(--bg);
        }
        .category-pill-btn.active {
          background: #0f172a;
          border-color: #0f172a;
          color: #ffffff;
        }
        [data-theme="dark"] .category-pill-btn.active {
          background: #ffffff;
          border-color: #ffffff;
          color: #0f172a;
        }
        .category-pill-emoji {
          font-size: 0.95rem;
        }

        .models-grid-3col {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-bottom: 4rem;
        }
        @media (max-width: 1024px) {
          .models-grid-3col {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .models-grid-3col {
            grid-template-columns: 1fr;
          }
        }

        .model-card-premium {
          background: var(--bg-alt);
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 1.25rem 1.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 135px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }
        .model-card-premium:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.04);
          border-color: var(--border);
        }
        [data-theme="dark"] .model-card-premium:hover {
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
        }

        .model-card-top {
          display: flex;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }
        .model-card-provider-logo {
          width: 30px;
          height: 30px;
          object-fit: contain;
          border-radius: 6px;
          margin-right: 12px;
          flex-shrink: 0;
          background: var(--bg);
          padding: 2px;
        }
        .model-card-provider-fallback {
          width: 30px;
          height: 30px;
          border-radius: 6px;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 800;
          margin-right: 12px;
          flex-shrink: 0;
        }
        .model-card-meta {
          display: flex;
          flex-direction: column;
        }
        .model-card-name {
          font-family: 'Outfit', sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text);
          line-height: 1.25;
          margin-bottom: 0.15rem;
        }
        .model-card-provider {
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--text-muted);
        }

        .model-card-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .model-card-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.72rem;
          color: var(--text-muted);
          border: 1px solid var(--border-light);
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
          background: var(--bg);
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .model-card-type-prefix {
          font-weight: 400;
          opacity: 0.6;
          text-transform: lowercase;
        }
        .model-card-type-val {
          font-weight: 700;
          color: #2563eb;
        }
        [data-theme="dark"] .model-card-type-val {
          color: #60a5fa;
        }

        .model-card-actions {
          display: flex;
          gap: 0.4rem;
          opacity: 0;
          transform: translateY(4px);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .model-card-premium:hover .model-card-actions {
          opacity: 1;
          transform: translateY(0);
        }
        .card-action-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: var(--bg);
          border: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-dim);
          cursor: pointer;
          transition: all 0.2s;
        }
        .card-action-btn:hover {
          background: var(--primary-soft);
          color: var(--primary);
          border-color: var(--primary);
        }

        .pagination-container-premium {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.25rem;
          margin-top: 2rem;
          margin-bottom: 2rem;
        }
        .pagination-arrow-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid var(--border-light);
          background: var(--bg-alt);
          color: var(--text-dim);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.01);
        }
        .pagination-arrow-btn:hover:not(:disabled) {
          background: var(--bg);
          border-color: var(--text-muted);
          transform: scale(1.05);
        }
        .pagination-arrow-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .pagination-text-premium {
          font-size: 0.85rem;
          color: var(--text-muted);
          user-select: none;
        }
        .pagination-current-num {
          font-weight: 700;
          color: var(--text);
        }
        .pagination-divider {
          margin: 0 0.25rem;
          opacity: 0.5;
        }
        .pagination-total-num {
          font-weight: 400;
          opacity: 0.8;
        }

        .models-loading-state, .models-empty-state {
          text-align: center;
          padding: 6rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .models-loading-state h3, .models-empty-state h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .models-loading-state p, .models-empty-state p {
          color: var(--text-muted);
          font-size: 0.95rem;
          margin-bottom: 1.5rem;
        }
        .btn-reset {
          background: var(--primary);
          color: #ffffff;
          padding: 0.55rem 1.25rem;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-reset:hover {
          background: var(--primary-hover);
        }

        .copy-toast-premium {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          background: #0f172a;
          color: #ffffff;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.85rem;
          font-weight: 550;
          z-index: 9999;
          animation: slide-up-fade 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        [data-theme="dark"] .copy-toast-premium {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        @keyframes slide-up-fade {
          from {
            transform: translateY(10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .models-branding-footer {
          text-align: center;
          margin-top: 3rem;
          font-size: 0.78rem;
          color: var(--text-muted);
          opacity: 0.65;
          font-weight: 500;
          letter-spacing: 0.01em;
        }
      `}</style>

      {/* Decorative Warm mesh gradient orb */}
      <div className="models-mesh-glow" />

      <div className="models-container">
        {/* Breadcrumb Navigation */}
        <div className="models-breadcrumb">
          <Link to="/">Home</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Models</span>
        </div>

        {/* Centered Hero Heading */}
        <div className="models-hero-centered">
          <h1 className="models-title">
            {models.length > 0 ? `${models.length} AI models.` : '260+ AI models.'}<br />
            One API. Zero hassle.
          </h1>
        </div>

        {/* Centered Search Bar */}
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon-left" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="models-search-input-centered"
            />
            {search && (
              <button className="search-clear-btn" onClick={() => setSearch('')} aria-label="Clear search">
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Centered Category Selection */}
        <div className="categories-pill-scroll">
          <div className="categories-pill-inner">
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  className={`category-pill-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <span className="category-pill-emoji">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="models-loading-state">
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1.25rem' }} />
            <h3>Synchronizing Database</h3>
            <p>Gathering {models.length > 0 ? `${models.length}` : '260+'} frontier AI models on Digitaland...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="models-empty-state">
            <h3>No models found</h3>
            <p>We couldn't find any models matching your criteria.</p>
            <button className="btn-reset" onClick={handleResetFilters}>Clear search & filters</button>
          </div>
        ) : (
          <>
            {/* 3-Column Premium Card Grid */}
            <div className="models-grid-3col">
              {paginatedModels.map((m, i) => {
                // Determine clean model type category string for badge
                const typeStr = m.type ? m.type.toUpperCase() : 'CHAT';

                return (
                  <div className="model-card-premium" key={m.id || i}>
                    <div className="model-card-top">
                      <ProviderLogo m={m} />
                      <div className="model-card-meta">
                        <h4 className="model-card-name">{m.name}</h4>
                        <span className="model-card-provider">{m.provider}</span>
                      </div>
                    </div>

                    <div className="model-card-bottom">
                      <div className="model-card-type-badge">
                        <span className="model-card-type-prefix">Type</span>
                        <span className="model-card-type-val">{typeStr}</span>
                      </div>

                      {/* Interactive Shortcuts on Hover */}
                      <div className="model-card-actions">
                        <button
                          className="card-action-btn"
                          onClick={() => handleCopy(m.name, m.id)}
                          title="Copy Model ID"
                        >
                          {copiedId === m.id ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                        </button>
                        <Link
                          to={`/playground?model=${m.id}`}
                          className="card-action-btn"
                          title="Try in Playground"
                        >
                          <ArrowUpRight size={13} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Circular Sleek Pagination */}
            {totalPages > 1 && (
              <div className="pagination-container-premium">
                <button
                  className="pagination-arrow-btn"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  aria-label="Previous page"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <span className="pagination-text-premium">
                  <strong className="pagination-current-num">{currentPage}</strong>
                  <span className="pagination-divider">/</span>
                  <span className="pagination-total-num">{totalPages}</span>
                </span>
                <button
                  className="pagination-arrow-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  aria-label="Next page"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}

        {/* Digitaland Branding Footer Badge */}
        <div className="models-branding-footer">
          Powered by Digitaland.ai • Secure, multi-provider frontier intelligence gateway
        </div>
      </div>

      {/* Copy Alert Toast notification */}
      {copyAlert && (
        <div className="copy-toast-premium">
          <Check size={14} style={{ color: '#10b981' }} />
          <span>Model ID copied to clipboard!</span>
        </div>
      )}
    </main>
  );
}
