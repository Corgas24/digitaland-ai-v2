import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDynamicModels, PROVIDERS, MARKUP, ourPrice, openrouterPrice, savingsPercent } from '../data/models';
import { Search, Grid3X3, List, Copy, Check, ChevronDown, SlidersHorizontal, X, Loader2, ArrowUpRight } from 'lucide-react';

const DISCOUNT = savingsPercent();

const TYPE_ICONS = {
  Chat: '💬', Reasoning: '🧠', Code: '💻', Vision: '👁', Image: '🎨',
  Audio: '🎵', Video: '🎬', Search: '🔍', Embedding: '📐', MoE: '🔀',
};

const TOP_PROVIDERS = ['OpenAI', 'Anthropic', 'Google', 'xAI', 'DeepSeek'];

export default function Models() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selProvider, setSelProvider] = useState('All');
  const [selType, setSelType] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('default');
  const [copied, setCopied] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    getDynamicModels().then(data => {
      setModels(data);
      setLoading(false);
    });
  }, []);

  const providers = useMemo(() => {
    const counts = {};
    models.forEach(m => {
      const q = search.toLowerCase();
      const matchSearch = !q || m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q) || m.type.toLowerCase().includes(q);
      const matchType = selType === 'All' || m.type === selType;
      
      if (matchSearch && matchType) {
        counts[m.provider] = (counts[m.provider] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => {
      const aTop = TOP_PROVIDERS.indexOf(a[0]);
      const bTop = TOP_PROVIDERS.indexOf(b[0]);
      if (aTop !== -1 && bTop !== -1) return aTop - bTop;
      if (aTop !== -1) return -1;
      if (bTop !== -1) return 1;
      return b[1] - a[1];
    });
  }, [models, search, selType]);

  const types = useMemo(() => {
    const counts = {};
    models.forEach(m => {
      const q = search.toLowerCase();
      const matchSearch = !q || m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q) || m.type.toLowerCase().includes(q);
      const matchProvider = selProvider === 'All' || m.provider === selProvider;
      
      if (matchSearch && matchProvider) {
        counts[m.type] = (counts[m.type] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [models, search, selProvider]);

  const filtered = useMemo(() => {
    let result = models.filter(m => {
      const q = search.toLowerCase();
      const matchSearch = !q || m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q) || m.type.toLowerCase().includes(q);
      const matchProvider = selProvider === 'All' || m.provider === selProvider;
      const matchType = selType === 'All' || m.type === selType;
      return matchSearch && matchProvider && matchType;
    });

    if (sortBy === 'price-asc') result.sort((a, b) => (a.offIn * MARKUP) - (b.offIn * MARKUP));
    else if (sortBy === 'price-desc') result.sort((a, b) => (b.offIn * MARKUP) - (a.offIn * MARKUP));
    else if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [models, search, selProvider, selType, sortBy]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const resetFilters = () => {
    setSearch('');
    setSelProvider('All');
    setSelType('All');
    setSortBy('default');
  };

  const hasFilters = search || selProvider !== 'All' || selType !== 'All';

  return (
    <main className="models-page">
      <div className="models-header">
        <div className="container">
          <div className="models-header-inner">
            <div>
              <h1>All Models</h1>
              <p className="models-subtitle">
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Loader2 size={14} className="animate-spin" /> Synchronizing with Neural Matrix...
                  </span>
                ) : (
                  <>
                    <span className="models-count">{filtered.length}</span> of {models.length} models
                    {selProvider !== 'All' && <> from <strong>{selProvider}</strong></>}
                    {selType !== 'All' && <> · {selType}</>}
                  </>
                )}
              </p>
            </div>
            <div className="models-header-actions">
              <div className="models-search-wrap">
                <Search size={16} className="models-search-icon" />
                <input
                  type="text"
                  placeholder="Search models..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="models-search"
                />
                {search && (
                  <button className="models-search-clear" onClick={() => setSearch('')}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="models-view-toggle">
                <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} title="Grid view">
                  <Grid3X3 size={16} />
                </button>
                <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')} title="Table view">
                  <List size={16} />
                </button>
              </div>
              <button className="models-mobile-filter-btn" onClick={() => setShowMobileFilters(!showMobileFilters)}>
                <SlidersHorizontal size={16} /> Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="models-layout">
          <aside className={'models-sidebar' + (showMobileFilters ? ' show' : '')}>
            <div className="sidebar-section">
              <div className="sidebar-header">
                <h3>Provider</h3>
                {hasFilters && <button className="sidebar-reset" onClick={resetFilters}>Reset</button>}
              </div>
              <button
                className={'sidebar-filter-btn' + (selProvider === 'All' ? ' active' : '')}
                onClick={() => setSelProvider('All')}
              >
                <span className="sfb-dot" style={{ background: 'var(--primary)' }} />
                All Providers
                <span className="sfb-count">{models.length}</span>
              </button>
              {providers.map(([name, count]) => (
                <button
                  key={name}
                  className={'sidebar-filter-btn' + (selProvider === name ? ' active' : '')}
                  onClick={() => setSelProvider(selProvider === name ? 'All' : name)}
                >
                  <span className="sfb-dot" style={{ background: PROVIDERS[name]?.color || '#666' }} />
                  {name}
                  <span className="sfb-count">{count}</span>
                </button>
              ))}
            </div>

            <div className="sidebar-section">
              <h3>Type</h3>
              <button
                className={'sidebar-filter-btn' + (selType === 'All' ? ' active' : '')}
                onClick={() => setSelType('All')}
              >
                <span className="sfb-emoji">🌐</span>
                All types
              </button>
              {types.map(([type, count]) => (
                <button
                  key={type}
                  className={'sidebar-filter-btn' + (selType === type ? ' active' : '')}
                  onClick={() => setSelType(selType === type ? 'All' : type)}
                >
                  <span className="sfb-emoji">{TYPE_ICONS[type] || '🤖'}</span>
                  {type}
                  <span className="sfb-count">{count}</span>
                </button>
              ))}
            </div>

            <div className="sidebar-section">
              <h3>Sort by</h3>
              <select className="sidebar-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="default">Default</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
                <option value="name">Name A → Z</option>
              </select>
            </div>
          </aside>

          <div className="models-content">
            {loading ? (
              <div className="models-empty" style={{ minHeight: '400px' }}>
                <Loader2 size={40} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                <h3>Loading Neural Matrix...</h3>
                <p>Fetching 273+ models from the encrypted database.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="models-empty">
                <h3>No models found</h3>
                <p>Try adjusting your search or filters.</p>
                <button className="btn-outline" onClick={resetFilters} style={{ marginTop: '1rem' }}>Clear filters</button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="models-grid">
                {filtered.map((m, i) => {
                  const prov = PROVIDERS[m.provider] || { color: '#666', short: m.provider[0] };
                  const ourIn = ourPrice(m.offIn);
                  const ourOut = ourPrice(m.offOut);
                  const isGeneration = ['Image', 'Video', 'Audio'].includes(m.type);

                  const isRecommended = m.name.toLowerCase().includes('mini') ||
                                      m.name.toLowerCase().includes('8b') ||
                                      m.name.toLowerCase().includes('haiku') ||
                                      m.name.toLowerCase().includes('flash');

                  return (
                    <div className="mg-card" key={i} style={{
                      position: 'relative',
                      border: '1px solid var(--border-light)',
                      borderTop: '3px solid ' + prov.color,
                      background: 'var(--surface)',
                      boxShadow: '0 10px 30px -15px ' + prov.color + '44',
                      overflow: 'hidden'
                    }}>
                      {isRecommended && (
                        <div style={{
                          position: 'absolute', top: '10px', right: '-35px',
                          background: 'var(--primary)', color: '#fff', fontSize: '0.6rem',
                          fontWeight: 900, padding: '4px 40px', transform: 'rotate(45deg)',
                          boxShadow: '0 2px 10px rgba(99,102,241,0.4)', zIndex: 1
                        }}>
                          FAST
                        </div>
                      )}

                      <div className="mg-top" style={{ marginBottom: '1.5rem' }}>
                        <div style={{
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: prov.color, boxShadow: '0 0 10px ' + prov.color
                        }} />
                        <div className="mg-meta">
                          <h4 className="mg-name" style={{ fontSize: '1rem', fontWeight: 800 }}>{m.name}</h4>
                          <span className="mg-provider-name" style={{ color: prov.color, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>{m.provider}</span>
                        </div>
                        <button
                          className="mg-copy"
                          onClick={() => handleCopy(m.name, i)}
                          style={{ background: 'var(--bg-alt)', borderRadius: '8px' }}
                          title="Copy model ID"
                        >
                          {copied === i ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                        <Link
                          to={`/playground?model=${m.id}`}
                          className="mg-copy"
                          style={{ background: 'var(--primary-soft)', color: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Try in Playground"
                        >
                          <ArrowUpRight size={13} />
                        </Link>
                      </div>

                      <div className="mg-prices" style={{ background: 'var(--bg-alt)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                        {isGeneration ? (
                          <div className="mg-price-line">
                            <span className="mg-price-label" style={{ opacity: 0.5, fontWeight: 700 }}>PER REQUEST</span>
                            <div className="mg-price-values">
                              <span className="mg-our-price" style={{ color: 'var(--text)', fontWeight: 800 }}>${ourIn.toFixed(4)}<small style={{ opacity: 0.4 }}>/ Gen</small></span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="mg-price-line">
                              <span className="mg-price-label" style={{ opacity: 0.5, fontWeight: 700 }}>INPUT</span>
                              <div className="mg-price-values">
                                <span className="mg-our-price" style={{ color: 'var(--text)', fontWeight: 800 }}>${ourIn.toFixed(4)}<small style={{ opacity: 0.4 }}>/M</small></span>
                              </div>
                            </div>
                            <div className="mg-price-line">
                              <span className="mg-price-label" style={{ opacity: 0.5, fontWeight: 700 }}>OUTPUT</span>
                              <div className="mg-price-values">
                                <span className="mg-our-price" style={{ color: 'var(--text)', fontWeight: 800 }}>${ourOut.toFixed(4)}<small style={{ opacity: 0.4 }}>/M</small></span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mg-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {m.badge && <span className={'mg-tag mg-tag-' + m.badge.toLowerCase()} style={{ fontSize: '0.65rem' }}>{m.badge}</span>}
                        <span className="mg-tag mg-tag-type" style={{ fontSize: '0.65rem', background: 'var(--bg-alt)' }}>{TYPE_ICONS[m.type] || ''} {m.type}</span>
                        {(ourIn > 0) && (
                          <span className="mg-tag mg-tag-save" style={{
                            fontSize: '0.65rem', background: 'var(--green-soft)', color: 'var(--green)', border: '1px solid var(--green)'
                          }}>
                            -{DISCOUNT}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="models-table-wrap">
                <table className="models-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Provider</th>
                      <th>Type</th>
                      <th>Price (In/Gen)</th>
                      <th>Price (Out)</th>
                      <th>OpenRouter</th>
                      <th>Save</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m, i) => {
                      const prov = PROVIDERS[m.provider] || { color: '#666', short: m.provider[0] };
                      const ourIn = ourPrice(m.offIn);
                      const ourOut = ourPrice(m.offOut);
                      const offIn = openrouterPrice(m.offIn);
                      const isGeneration = ['Image', 'Video', 'Audio'].includes(m.type);

                      return (
                        <tr key={i}>
                          <td className="mt-name">
                            <span className="mt-dot" style={{ background: prov.color }} />
                            {m.name}
                          </td>
                          <td className="mt-provider">{m.provider}</td>
                          <td><span className="mg-tag mg-tag-type" style={{ fontSize: '0.65rem' }}>{TYPE_ICONS[m.type] || ''} {m.type}</span></td>
                          <td className="mt-price">${ourIn.toFixed(4)}{isGeneration ? '/Gen' : ''}</td>
                          <td className="mt-price">{isGeneration ? '—' : '$' + ourOut.toFixed(4)}</td>
                          <td className="mt-off">{offIn > 0 ? '$' + offIn.toFixed(2) : '—'}</td>
                          <td><span className="mg-tag mg-tag-save" style={{ fontSize: '0.6rem' }}>-{DISCOUNT}%</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="mg-copy" onClick={() => handleCopy(m.name, `t${i}`)} title="Copy">
                                {copied === `t${i}` ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                              <Link to={`/playground?model=${m.id}`} className="mg-copy" style={{ color: 'var(--primary)', background: 'var(--primary-soft)' }} title="Try">
                                <ArrowUpRight size={12} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
