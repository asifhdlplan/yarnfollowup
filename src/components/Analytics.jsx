import React, { useState, useEffect } from 'react';
import { Compass, Database } from 'lucide-react';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('yarn'); // 'yarn' or 'thread'

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading analytics...</p>
      </div>
    );
  }

  if (!data) return null;

  const currentData = tab === 'yarn' ? data.yarn : data.thread;
  const unit = tab === 'yarn' ? 'Tons' : 'Kg';

  // Calculate percentages for donut
  const status = currentData.status;
  const totalOrders = currentData.orders;
  const completedPct = totalOrders > 0 ? (status.completed / totalOrders) * 100 : 0;
  const partialPct = totalOrders > 0 ? (status.partial / totalOrders) * 100 : 0;
  const notStartedPct = totalOrders > 0 ? (status.notStarted / totalOrders) * 100 : 0;
  const overPct = totalOrders > 0 ? (status.over / totalOrders) * 100 : 0;

  // Render Horizontal Bar Chart helper
  const renderBarChart = (title, items) => {
    if (!items || items.length === 0) return <p style={{ color: 'var(--text-muted)' }}>No data available.</p>;
    const maxDemand = Math.max(...items.map(i => i.demanded), 1);
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</h4>
        {items.slice(0, 5).map((item, idx) => {
          const barWidth = (item.demanded / maxDemand) * 100;
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 500, color: '#fff' }}>{item.name}</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {(item.demanded || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} {unit} 
                  <span style={{ fontSize: '0.75rem', opacity: 0.6 }}> ({item.count} orders)</span>
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${barWidth}%`, 
                    height: '100%', 
                    background: `linear-gradient(90deg, var(--primary-color) 0%, ${tab === 'yarn' ? 'var(--info-color)' : 'var(--success-color)'} 100%)`,
                    borderRadius: '4px',
                    transition: 'width 1s ease-in-out'
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      {/* Tab Controls */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          className={`btn ${tab === 'yarn' ? 'btn-primary' : ''}`}
          onClick={() => setTab('yarn')}
        >
          <Compass size={16} />
          Yarn Analytics
        </button>
        <button 
          className={`btn ${tab === 'thread' ? 'btn-primary' : ''}`}
          onClick={() => setTab('thread')}
        >
          <Database size={16} />
          Sewing Thread Analytics
        </button>
      </div>

      <div className="dashboard-details-grid">
        {/* Card 1: Order Status Donut Chart */}
        <div className="chart-card">
          <h3 className="chart-title">Fulfillment Distribution</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', minHeight: '220px' }}>
            {/* SVG Donut */}
            <svg width="160" height="160" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background Circle */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="3" />
              
              {/* Segment 1: Completed */}
              <circle 
                cx="18" cy="18" r="15.915" fill="none" 
                stroke="var(--success-color)" 
                strokeWidth="3.5" 
                strokeDasharray={`${completedPct} ${100 - completedPct}`} 
                strokeDashoffset="0" 
              />
              
              {/* Segment 2: In Progress */}
              <circle 
                cx="18" cy="18" r="15.915" fill="none" 
                stroke="var(--info-color)" 
                strokeWidth="3.5" 
                strokeDasharray={`${partialPct} ${100 - partialPct}`} 
                strokeDashoffset={`-${completedPct}`} 
              />
              
              {/* Segment 3: Not Started */}
              <circle 
                cx="18" cy="18" r="15.915" fill="none" 
                stroke="var(--warning-color)" 
                strokeWidth="3.5" 
                strokeDasharray={`${notStartedPct} ${100 - notStartedPct}`} 
                strokeDashoffset={`-${completedPct + partialPct}`} 
              />

              {/* Segment 4: Over Received */}
              <circle 
                cx="18" cy="18" r="15.915" fill="none" 
                stroke="var(--danger-color)" 
                strokeWidth="3.5" 
                strokeDasharray={`${overPct} ${100 - overPct}`} 
                strokeDashoffset={`-${completedPct + partialPct + notStartedPct}`} 
              />
            </svg>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--success-color)' }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Fully Received ({completedPct.toFixed(0)}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--info-color)' }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>In Progress ({partialPct.toFixed(0)}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--warning-color)' }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Not Started ({notStartedPct.toFixed(0)}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--danger-color)' }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Over Received ({overPct.toFixed(0)}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Top Buyers & Suppliers */}
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 className="chart-title">Demand Rankings</h3>
          {renderBarChart("Top Buyers", currentData.topBuyers)}
          {renderBarChart("Top Suppliers", currentData.topSuppliers)}
        </div>
      </div>
    </div>
  );
}
