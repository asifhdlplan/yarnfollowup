import React, { useState } from 'react';
import { LayoutDashboard, Compass, Database, RefreshCw, FileSpreadsheet, AlertCircle, CheckCircle, ShieldCheck, LogOut, X } from 'lucide-react';
import Dashboard from './components/Dashboard';
import YarnFollowUp from './components/YarnFollowUp';
import SewingThread from './components/SewingThread';
import Analytics from './components/Analytics';
import ImportExport from './components/ImportExport';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState(null);
  
  // Admin Panel authorization states
  const [adminAuthorized, setAdminAuthorized] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState('');

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleLoginSuccess = (user) => {
    localStorage.setItem('currentUser', JSON.stringify(user));
    setCurrentUser(user);
    showNotification(`Welcome back, ${user.username}!`);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setAdminAuthorized(false);
    setActiveTab('dashboard');
    showNotification('Logged out successfully.');
  };

  const handleAdminTabClick = () => {
    if (adminAuthorized) {
      setActiveTab('admin');
    } else {
      setIsAdminModalOpen(true);
      setAdminPassword('');
      setAdminPasswordError('');
    }
  };

  const handleAdminPasswordSubmit = () => {
    if (adminPassword === '0707') {
      setAdminAuthorized(true);
      setIsAdminModalOpen(false);
      setActiveTab('admin');
      showNotification('Admin Panel access granted.');
    } else {
      setAdminPasswordError('Incorrect password. Access denied.');
    }
  };

  // If the user is not logged in, render the login page
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-section" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingBottom: '1.5rem' }}>
          <img src="/logo.png" alt="Ha-meem Denim Ltd." style={{ maxWidth: '100%', maxHeight: '55px', objectFit: 'contain' }} />
        </div>
        
        <nav className="nav-links">
          <a 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard className="nav-icon" />
            Dashboard
          </a>
          <a 
            className={`nav-item ${activeTab === 'yarn' ? 'active' : ''}`}
            onClick={() => setActiveTab('yarn')}
          >
            <Compass className="nav-icon" />
            Yarn Follow-up
          </a>
          <a 
            className={`nav-item ${activeTab === 'thread' ? 'active' : ''}`}
            onClick={() => setActiveTab('thread')}
          >
            <Database className="nav-icon" />
            Sewing Thread
          </a>
          <a 
            className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <RefreshCw className="nav-icon" />
            Analytics
          </a>
          <a 
            className={`nav-item ${activeTab === 'sync' ? 'active' : ''}`}
            onClick={() => setActiveTab('sync')}
          >
            <FileSpreadsheet className="nav-icon" />
            Sync Control
          </a>
          
          {/* Admin Panel Nav Item */}
          <a 
            className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={handleAdminTabClick}
            style={{ 
              borderTop: '1px solid rgba(255,255,255,0.05)', 
              marginTop: '0.75rem', 
              paddingTop: '0.75rem' 
            }}
          >
            <ShieldCheck className="nav-icon" style={{ color: adminAuthorized ? 'var(--primary-color)' : 'rgba(255,255,255,0.4)' }} />
            Admin Panel
          </a>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981' }}></span>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Cloud Database Active</p>
          </div>
          <p style={{ marginTop: '4px', fontSize: '0.75rem', opacity: 0.6 }}>Supabase Integration • v1.2.0</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="top-bar">
          <h1 className="page-title">
            {activeTab === 'dashboard' && 'Dashboard Overview'}
            {activeTab === 'yarn' && 'Yarn Follow-up Management'}
            {activeTab === 'thread' && 'Sewing Thread Tracking'}
            {activeTab === 'analytics' && 'Operational Analytics'}
            {activeTab === 'sync' && 'Excel Data Synchronization'}
            {activeTab === 'admin' && 'System Administrator Panel'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div className="user-profile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {currentUser.username}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {activeTab === 'admin' ? 'Administrator Mode' : 'Standard User'}
              </span>
            </div>
            
            <button 
              onClick={handleLogout}
              title="Logout"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                color: 'var(--danger-color)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.15)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.08)'}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <section className="content-body">
          {activeTab === 'dashboard' && <Dashboard showNotification={showNotification} />}
          {activeTab === 'yarn' && <YarnFollowUp showNotification={showNotification} />}
          {activeTab === 'thread' && <SewingThread showNotification={showNotification} />}
          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'sync' && <ImportExport showNotification={showNotification} />}
          {activeTab === 'admin' && <AdminPanel showNotification={showNotification} />}
        </section>

        {/* Global Notifications */}
        {notification && (
          <div className="notification" style={{ borderLeftColor: notification.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)' }}>
            {notification.type === 'success' ? (
              <CheckCircle size={18} style={{ color: 'var(--success-color)' }} />
            ) : (
              <AlertCircle size={18} style={{ color: 'var(--danger-color)' }} />
            )}
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{notification.message}</span>
          </div>
        )}
      </main>

      {/* Admin Panel Password Prompt Modal */}
      {isAdminModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-window" style={{ maxWidth: '400px', height: 'auto', padding: '2rem' }}>
            <div className="modal-header" style={{ border: 'none', padding: 0, marginBottom: '1rem' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                🔑 Admin Authentication
              </h3>
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: 0 }}
                onClick={() => setIsAdminModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', textAlign: 'left' }}>
              Please enter the administrator access password to enter this section.
            </p>
            
            <input 
              type="password" 
              className="form-control"
              placeholder="Enter admin password..."
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdminPasswordSubmit(); }}
              autoFocus
              style={{ marginBottom: '1rem' }}
            />
            
            {adminPasswordError && (
              <p style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'left' }}>
                {adminPasswordError}
              </p>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                type="button"
                className="btn" 
                onClick={() => setIsAdminModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleAdminPasswordSubmit}
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
