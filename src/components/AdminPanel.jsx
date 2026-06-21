import React, { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2, ShieldAlert, Key, X, Check, RefreshCw } from 'lucide-react';

export default function AdminPanel({ showNotification }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
      showNotification('Failed to fetch users list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (user = null) => {
    if (user) {
      setIsEditMode(true);
      setSelectedUser(user);
      setFormData({ username: user.username, password: user.password });
    } else {
      setIsEditMode(false);
      setSelectedUser(null);
      setFormData({ username: '', password: '' });
    }
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim()) {
      showNotification('Please fill in all fields.', 'error');
      return;
    }

    setSaving(true);
    const url = isEditMode ? `/api/users/${selectedUser.id}` : '/api/users';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save user');
      }

      showNotification(isEditMode ? 'User credentials updated.' : 'New user created successfully.');
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      showNotification(err.message || 'Failed to save user credentials.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === 0 || user.isFallback) {
      showNotification('Cannot delete the default fallback administrator account.', 'error');
      return;
    }

    const confirmDelete = confirm(`Are you sure you want to delete user "${user.username}"?\n\nThis user will lose access to the dashboard immediately.`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete user');
      showNotification('User deleted successfully.');
      fetchUsers();
    } catch (err) {
      console.error(err);
      showNotification('Failed to delete user account.', 'error');
    }
  };

  return (
    <div style={{ fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="analytics-card" style={{ borderLeft: '4px solid var(--primary-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="card-label">Active Users</p>
              <h3 className="card-value">{loading ? '...' : users.length}</h3>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary-color)', padding: '0.75rem', borderRadius: '12px' }}>
              <Key size={24} />
            </div>
          </div>
          <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Authorized to log into website
          </p>
        </div>

        <div className="analytics-card" style={{ borderLeft: '4px solid var(--info-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="card-label">Access Level</p>
              <h3 className="card-value">Owner</h3>
            </div>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--info-color)', padding: '0.75rem', borderRadius: '12px' }}>
              <ShieldAlert size={24} />
            </div>
          </div>
          <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Admin Panel entries protected by password
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="table-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          User Credentials Management
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={fetchUsers} 
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.9rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => handleOpenModal(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem' }}
          >
            <UserPlus size={16} />
            Add User
          </button>
        </div>
      </div>

      <div className="table-card">
        {loading && users.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Loading user accounts...</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>User ID</th>
                  <th>Username</th>
                  <th>Password (Plain Text)</th>
                  <th>Created Date / Status</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {user.id === 0 ? 'N/A' : user.id}
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {user.username}
                      {user.isFallback && (
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning-color)', marginLeft: '0.5rem', border: '1px solid rgba(245,158,11,0.2)' }}>
                          System Fallback
                        </span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
                      {user.password}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'Built-in Credentials'}
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {user.isFallback ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', italic: true }}>Protected</span>
                      ) : (
                        <>
                          <button 
                            className="btn" 
                            style={{ padding: '0.25rem 0.4rem', borderColor: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary-color)', marginRight: '0.5rem' }}
                            onClick={() => handleOpenModal(user)}
                            title="Edit User"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="btn" 
                            style={{ padding: '0.25rem 0.4rem', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger-color)' }}
                            onClick={() => handleDeleteUser(user)}
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-window" style={{ maxWidth: '450px', height: 'auto', padding: '1.75rem' }}>
            <div className="modal-header" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
                👤 {isEditMode ? `Edit User Credentials` : 'Add New User'}
              </h3>
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: 0 }}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>Username</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Enter unique username..."
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>Password</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Enter login password..."
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Check size={16} />
                  {saving ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
