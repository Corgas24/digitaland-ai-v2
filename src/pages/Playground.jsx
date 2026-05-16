/**
  };


  const copyToClipboard = (text) => navigator.clipboard.writeText(text);


  // High-performance filter logic
  const filteredModelsByProvider = useMemo(() => {
    const providers = {};
    Object.keys(PROVIDERS).forEach(p => {
      const pModels = models.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.provider.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = searchQuery ? true : (filterType === 'All' || m.type === filterType);
        return m.provider === p && matchesSearch && matchesType;
      });
      if (pModels.length > 0) providers[p] = pModels;
    });
    return providers;
  }, [models, searchQuery, filterType]);


  return (
    <div className="playground-container" style={{ 
      display: 'flex', 
      flexDirection: 'column',
      width: '100%', 
      height: 'calc(100vh - 68px)', 
      background: 'var(--bg)', 
      position: 'absolute', 
      left: 0,
      top: '68px',
      overflow: 'hidden',
      zIndex: 100,
    }}>
      {isModelsLoading && (
        <div style={{
          position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: 1000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <RefreshCw size={40} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <h2 style={{ fontWeight: 900, color: 'var(--text)' }}>Neural Studio initializing...</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Synchronizing with Neural Matrix base...</p>
        </div>
      )}


      <style>{`
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .neural-pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }


        /* Responsive Improvements */
        @media (max-width: 1200px) {
          .neural-sidebar {
             transform: translateX(-100%);
          }
          .neural-sidebar.open {
             transform: translateX(0);
          }
          .sidebar-toggle {
             display: flex !important;
          }
        }


        @media (max-width: 768px) {
          .viewport-container {
             padding: 1rem !important;
          }
          .status-bar {
             padding: 0 1rem !important;
             gap: 0.5rem !important;
          }
          .status-bar-info {
             display: none !important;
          }
          .input-container {
             padding: 0.75rem !important;
          }
          .welcome-title {
             font-size: 2rem !important;
          }
          .input-box {
