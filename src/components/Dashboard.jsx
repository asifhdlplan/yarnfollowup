import React, { useState, useEffect } from 'react';
import { Compass, Database, CheckCircle2, AlertTriangle, AlertCircle, ShoppingBag } from 'lucide-react';

export default function Dashboard({ showNotification }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching analytics:', err);
        showNotification('Failed to load dashboard statistics.', 'error');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard stats...</p>
      </div>
    );
  }

  if (!data) return null;

  const yarn = data.yarn || { demanded: 0, received: 0, yet: 0, orders: 0, status: { completed: 0, partial: 0, notStarted: 0, over: 0 } };
  const thread = data.thread || { demanded: 0, received: 0, yet: 0, orders: 0, status: { completed: 0, partial: 0, notStarted: 0, over: 0 } };

  const yarnFulfillment = yarn.demanded > 0 ? (yarn.received / yarn.demanded) * 100 : 0;
  const threadFulfillment = thread.demanded > 0 ? (thread.received / thread.demanded) * 100 : 0;

  // Defensive formatting helper
  const formatNum = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '0.00';
    return Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPct = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '0';
    return Number(val).toFixed(0);
  };

  return (
    <div>
      {/* SECTION 1: YARN FOLLOW UP */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Compass size={20} style={{ color: 'var(--primary-color)' }} />
        Yarn Procurement Metrics
      </h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Demanded</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--primary-glow)', color: 'var(--primary-color)' }}>
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="stat-value">{formatNum(yarn.demanded)} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Tons</span></div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Across {yarn.orders || 0} active orders</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Received</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--success-glow)', color: 'var(--success-color)' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-value">{formatNum(yarn.received)} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Tons</span></div>
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${Math.min(yarnFulfillment, 100)}%`, backgroundColor: 'var(--success-color)' }}></div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--success-color)', fontWeight: 600, marginTop: '0.5rem' }}>{yarnFulfillment.toFixed(1)}% Fulfillment</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Outstanding Balance</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--warning-glow)', color: 'var(--warning-color)' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="stat-value">{formatNum(Math.max(0, yarn.yet))} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Tons</span></div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Yet to be delivered by suppliers</p>
        </div>
      </div>

      {/* Yarn Orders Status Subgrid */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2.5rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Fully Received</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{yarn.status?.completed || 0}</div>
          <span className="badge badge-success" style={{ marginTop: '0.5rem' }}>{yarn.orders > 0 ? formatPct((yarn.status?.completed / yarn.orders) * 100) : 0}% of total</span>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>In Progress</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{yarn.status?.partial || 0}</div>
          <span className="badge badge-info" style={{ marginTop: '0.5rem' }}>{yarn.orders > 0 ? formatPct((yarn.status?.partial / yarn.orders) * 100) : 0}% of total</span>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Not Started</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{yarn.status?.notStarted || 0}</div>
          <span className="badge badge-warning" style={{ marginTop: '0.5rem' }}>{yarn.orders > 0 ? formatPct((yarn.status?.notStarted / yarn.orders) * 100) : 0}% of total</span>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Over Received</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{yarn.status?.over || 0}</div>
          <span className="badge badge-danger" style={{ marginTop: '0.5rem' }}>{yarn.orders > 0 ? formatPct((yarn.status?.over / yarn.orders) * 100) : 0}% of total</span>
        </div>
      </div>

      {/* SECTION 2: SEWING THREAD */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Database size={20} style={{ color: 'var(--info-color)' }} />
        Sewing Thread Metrics
      </h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Demanded</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--info-glow)', color: 'var(--info-color)' }}>
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="stat-value">{formatNum(thread.demanded)} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Kg</span></div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Across {thread.orders || 0} tracking items</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Received</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--success-glow)', color: 'var(--success-color)' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-value">{formatNum(thread.received)} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Kg</span></div>
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${Math.min(threadFulfillment, 100)}%`, backgroundColor: 'var(--info-color)' }}></div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--info-color)', fontWeight: 600, marginTop: '0.5rem' }}>{threadFulfillment.toFixed(1)}% Fulfillment</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Outstanding Balance</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--danger-glow)', color: 'var(--danger-color)' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="stat-value">{formatNum(Math.max(0, thread.yet))} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Kg</span></div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pending delivery (Action Required)</p>
        </div>
      </div>

      {/* Sewing Thread Orders Status Subgrid */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Fully Received</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{thread.status?.completed || 0}</div>
          <span className="badge badge-success" style={{ marginTop: '0.5rem' }}>{thread.orders > 0 ? formatPct((thread.status?.completed / thread.orders) * 100) : 0}% of total</span>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>In Progress</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{thread.status?.partial || 0}</div>
          <span className="badge badge-info" style={{ marginTop: '0.5rem' }}>{thread.orders > 0 ? formatPct((thread.status?.partial / thread.orders) * 100) : 0}% of total</span>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Not Started</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{thread.status?.notStarted || 0}</div>
          <span className="badge badge-warning" style={{ marginTop: '0.5rem' }}>{thread.orders > 0 ? formatPct((thread.status?.notStarted / thread.orders) * 100) : 0}% of total</span>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Over Received</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{thread.status?.over || 0}</div>
          <span className="badge badge-danger" style={{ marginTop: '0.5rem' }}>{thread.orders > 0 ? formatPct((thread.status?.over / thread.orders) * 100) : 0}% of total</span>
        </div>
      </div>
    </div>
  );
}
