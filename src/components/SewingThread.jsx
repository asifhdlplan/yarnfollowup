import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Plus, Trash2, Edit2, X, FileSpreadsheet } from 'lucide-react';

function AutocompleteInput({ 
  value, 
  onChange, 
  suggestions = [], 
  placeholder, 
  className,
  style,
  id,
  type = 'text',
  matchType = 'contains'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!value) {
      setFiltered(suggestions.slice(0, 15));
      return;
    }
    const valLower = String(value).toLowerCase();
    const matches = suggestions.filter(item => {
      const itemStr = String(item).toLowerCase();
      return matchType === 'starts-with' 
        ? itemStr.startsWith(valLower)
        : itemStr.includes(valLower);
    });
    setFiltered(matches.slice(0, 15));
  }, [value, suggestions, matchType]);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % Math.max(filtered.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        e.preventDefault();
        onChange(filtered[activeIndex]);
        setIsOpen(false);
        setActiveIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleSelect = (item) => {
    onChange(item);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      <input
        type={type}
        id={id}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {isOpen && filtered.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color-hover)',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-lg)',
          maxHeight: '200px',
          overflowY: 'auto',
          margin: '4px 0 0 0',
          padding: '0.25rem 0',
          listStyle: 'none',
          zIndex: 1050,
          textAlign: 'left'
        }}>
          {filtered.map((item, index) => (
            <li
              key={index}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setActiveIndex(index)}
              style={{
                padding: '0.5rem 0.85rem',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                background: index === activeIndex ? 'var(--primary-glow)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.1s ease',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SewingThread({ showNotification }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [formData, setFormData] = useState({});

  // Metadata State for Autocomplete and Auto-Serial
  const [metadata, setMetadata] = useState({ uniqueValues: {}, nextSerial: 1 });
  
  // Custom Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordCallback, setPasswordCallback] = useState(null);

  const fetchRecords = (currentPage = page, currentSearch = search, currentStatus = status) => {
    setLoading(true);
    const query = new URLSearchParams({
      page: currentPage,
      limit: 50,
      search: currentSearch,
      status: currentStatus
    }).toString();

    fetch(`/api/thread?${query}`)
      .then(res => res.json())
      .then(data => {
        setRecords(data.records);
        setTotalPages(data.totalPages);
        setTotalRecords(data.total);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        showNotification('Failed to fetch sewing thread records.', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRecords(1, search, status);
    setPage(1);
  }, [search, status]);

  // Helper to open password prompt modal
  const requestPassword = (callback) => {
    setPasswordCallback(() => callback);
    setIsPasswordModalOpen(true);
    setPasswordValue('');
    setPasswordError('');
  };

  const handlePasswordSubmit = () => {
    if (passwordValue === '0707') {
      setIsPasswordModalOpen(false);
      setPasswordValue('');
      setPasswordError('');
      if (passwordCallback) passwordCallback();
    } else {
      setPasswordError('Incorrect password. Access denied.');
    }
  };

  const fetchMetadata = (isEdit, record = null) => {
    fetch('/api/thread/metadata')
      .then(res => {
        if (!res.ok) throw new Error('API returned non-OK response');
        return res.json();
      })
      .then(data => {
        setMetadata(data);
        if (!isEdit) {
          setFormData(prev => ({
            ...prev,
            "Serial": String(data.nextSerial)
          }));
        }
      })
      .catch(err => {
        console.warn('Metadata API not available, using client-side fallback:', err);
        const uniqueValues = {};
        const fields = ["Demanded Count", "Article", "Buyer", "Mkt", "Required Supplier"];
        fields.forEach(f => {
          const unique = [...new Set(records.map(item => item[f] ? String(item[f]).trim() : '').filter(Boolean))];
          uniqueValues[f] = unique.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        });

        const maxSerial = records.reduce((maxVal, r) => {
          const val = parseInt(r.Serial, 10);
          return !isNaN(val) && val > maxVal ? val : maxVal;
        }, 0);

        setMetadata({
          uniqueValues,
          nextSerial: maxSerial + 1
        });

        if (!isEdit) {
          setFormData(prev => ({
            ...prev,
            "Serial": String(maxSerial + 1)
          }));
        }
      });
  };

  const handleResetForm = () => {
    if (isEditMode && selectedRecord) {
      setFormData({ ...selectedRecord });
    } else {
      setFormData({
        "Serial": String(metadata.nextSerial || ''),
        "SPR No / SAP PR": "",
        "SPR Date": "",
        "Article": "",
        "Buyer": "",
        "Mkt": "",
        "Order Quantity": "",
        "Demanded Count": "",
        "Required Supplier": "",
        "Costing Price $": "",
        "Demand": "0",
        "Receive": "0",
        "Yet to Receive": "0",
        "PPC Asking (1st)": "",
        "Procurement 1st Cons": "",
        "Actual delivery date": "",
        "PI /Actual Supplier": "",
        "PI No/SAP PO": "",
        "PI Date": "",
        "LC Open": "",
        "LC No": "",
        "LC Kg": "",
        "Remarks": ""
      });
    }
  };

  // Open Modal for Create or Edit
  const handleOpenModal = (record = null) => {
    if (record) {
      requestPassword(() => {
        setIsEditMode(true);
        setSelectedRecord(record);
        setFormData({ ...record });
        setIsModalOpen(true);
        fetchMetadata(true, record);
      });
    } else {
      setIsEditMode(false);
      setSelectedRecord(null);
      setFormData({
        "Serial": "Loading...",
        "SPR No / SAP PR": "",
        "SPR Date": "",
        "Article": "",
        "Buyer": "",
        "Mkt": "",
        "Order Quantity": "",
        "Demanded Count": "",
        "Required Supplier": "",
        "Costing Price $": "",
        "Demand": "0",
        "Receive": "0",
        "Yet to Receive": "0",
        "PPC Asking (1st)": "",
        "Procurement 1st Cons": "",
        "Actual delivery date": "",
        "PI /Actual Supplier": "",
        "PI No/SAP PO": "",
        "PI Date": "",
        "LC Open": "",
        "LC No": "",
        "LC Kg": "",
        "Remarks": ""
      });
      setIsModalOpen(true);
      fetchMetadata(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate "Yet to Receive" if Demand or Receive changes
      if (field === "Demand" || field === "Receive") {
        const demand = parseFloat(updated["Demand"] || 0);
        const receive = parseFloat(updated["Receive"] || 0);
        updated["Yet to Receive"] = (demand - receive).toFixed(2);
      }
      return updated;
    });
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    
    const url = isEditMode ? `/api/thread/${selectedRecord.RowNumber}` : '/api/thread';
    const method = isEditMode ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
      .then(res => {
        if (!res.ok) throw new Error('Save failed');
        return res.json();
      })
      .then(() => {
        showNotification(isEditMode ? 'Record updated.' : 'Record created.');
        setIsModalOpen(false);
        fetchRecords(page);
      })
      .catch(err => {
        console.error(err);
        showNotification('Failed to save record.', 'error');
      });
  };

  const handleDelete = (rowNumber) => {
    requestPassword(() => {
      fetch(`/api/thread/${rowNumber}`, { method: 'DELETE' })
        .then(res => {
          if (!res.ok) throw new Error('Delete failed');
          showNotification('Record deleted.');
          fetchRecords(page);
        })
        .catch(err => {
          console.error(err);
          showNotification('Failed to delete record.', 'error');
        });
    });
  };

  const renderStatusBadge = (item) => {
    const d = parseFloat(item["Demand"] || 0);
    const r = parseFloat(item["Receive"] || 0);
    
    if (d === 0) {
      return r > 0 ? <span className="badge badge-danger">Over Received</span> : <span className="badge badge-success">Completed</span>;
    }
    if (r === 0) {
      return <span className="badge badge-warning">Not Started</span>;
    }
    if (r >= d) {
      return r > d ? <span className="badge badge-danger">Over Received</span> : <span className="badge badge-success">Completed</span>;
    }
    return <span className="badge badge-info">In Progress</span>;
  };

  const handleDownloadExcel = () => {
    const query = new URLSearchParams({
      search: search,
      status: status
    }).toString();
    window.open(`/api/thread/download?${query}`, '_blank');
  };

  const columns = [
    "Serial", "SPR No / SAP PR", "SPR Date", "Article", "Buyer", "Mkt", "Order Quantity", "Demanded Count", 
    "Required Supplier", "Costing Price $", "Demand", "Receive", "Yet to Receive", "PPC Asking (1st)", 
    "Procurement 1st Cons", "Actual delivery date", "PI /Actual Supplier", "PI No/SAP PO", "PI Date", 
    "LC Open", "LC No", "LC Kg", "Remarks"
  ];

  return (
    <div>
      <div className="table-controls">
        <div className="search-input-wrapper">
          <Search className="search-icon-inside" />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search sewing thread orders..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select 
            className="filter-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Fulfillment Statuses</option>
            <option value="fully_received">Fully Received</option>
            <option value="partially_received">In Progress</option>
            <option value="not_received">Not Started</option>
            <option value="over_received">Over Received</option>
          </select>
          
          <button 
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.9rem' }}
            onClick={handleDownloadExcel}
          >
            <FileSpreadsheet size={16} />
            Download Excel
          </button>
          
          <button className="btn btn-primary" onClick={() => handleOpenModal(null)}>
            <Plus size={16} />
            Add Record
          </button>
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Loading sewing thread database...</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                    <th>Status</th>
                    {columns.map(col => <th key={col}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {records.map((item) => (
                    <tr key={item.RowNumber}>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button 
                          className="btn" 
                          style={{ padding: '0.25rem 0.4rem', borderColor: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary-color)', marginRight: '0.35rem' }}
                          onClick={() => handleOpenModal(item)}
                          title="Edit Record"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn" 
                          style={{ padding: '0.25rem 0.4rem', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger-color)' }}
                          onClick={() => handleDelete(item.RowNumber)}
                          title="Delete Order"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                      <td>{renderStatusBadge(item)}</td>
                      {columns.map(col => (
                        <td key={col}>
                          <span>{item[col] !== undefined ? item[col] : ''}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination-controls">
              <span className="pagination-text">
                Showing {records.length > 0 ? (page - 1) * 50 + 1 : 0} to {Math.min(page * 50, totalRecords)} of {totalRecords} records
              </span>
              <div className="pagination-buttons">
                <button 
                  className="btn" 
                  disabled={page === 1} 
                  onClick={() => { setPage(p => p - 1); fetchRecords(page - 1); }}
                >
                  <ChevronLeft size={16} />
                  Prev
                </button>
                <button 
                  className="btn" 
                  disabled={page === totalPages} 
                  onClick={() => { setPage(p => p + 1); fetchRecords(page + 1); }}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Full Entry Form Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-window">
            <div className="modal-header">
              <h3 className="modal-title">{isEditMode ? `Edit Sewing Thread Record (Row ${selectedRecord.RowNumber})` : 'New Sewing Thread Record'}</h3>
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveModal} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
              <div className="modal-body">
                <div className="form-grid">
                  {/* Column 1: Order & Product Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ color: 'var(--primary-color)', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.3rem', marginBottom: '0.5rem' }}>
                      Order & Product Details
                    </h4>
                    
                    <div className="form-group">
                      <label className="form-label">Serial (Automatic)</label>
                      <input 
                        type="text" className="form-control" 
                        value={formData["Serial"] || ''} 
                        readOnly
                        disabled
                        style={{ background: 'rgba(0,0,0,0.03)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">SPR No / SAP PR</label>
                      <input 
                        type="text" className="form-control" 
                        value={formData["SPR No / SAP PR"] || ''} 
                        onChange={(e) => handleInputChange("SPR No / SAP PR", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">SPR Date</label>
                      <input 
                        type="date" className="form-control" 
                        value={formData["SPR Date"] || ''} 
                        onChange={(e) => handleInputChange("SPR Date", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Article</label>
                      <AutocompleteInput 
                        value={formData["Article"] || ''} 
                        onChange={(val) => handleInputChange("Article", val)}
                        suggestions={metadata.uniqueValues["Article"] || []}
                        placeholder="Search or enter article..."
                        className="form-control"
                        matchType="contains"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Buyer</label>
                      <AutocompleteInput 
                        value={formData["Buyer"] || ''} 
                        onChange={(val) => handleInputChange("Buyer", val)}
                        suggestions={metadata.uniqueValues["Buyer"] || []}
                        placeholder="Search or enter buyer..."
                        className="form-control"
                        matchType="contains"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mkt</label>
                      <AutocompleteInput 
                        value={formData["Mkt"] || ''} 
                        onChange={(val) => handleInputChange("Mkt", val)}
                        suggestions={metadata.uniqueValues["Mkt"] || []}
                        placeholder="Search or enter market..."
                        className="form-control"
                        matchType="contains"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Order Quantity</label>
                      <input 
                        type="text" className="form-control" 
                        value={formData["Order Quantity"] || ''} 
                        onChange={(e) => handleInputChange("Order Quantity", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Demanded Count</label>
                      <AutocompleteInput 
                        value={formData["Demanded Count"] || ''} 
                        onChange={(val) => handleInputChange("Demanded Count", val)}
                        suggestions={metadata.uniqueValues["Demanded Count"] || []}
                        placeholder="Search or enter demanded count..."
                        className="form-control"
                        matchType="starts-with"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Required Supplier</label>
                      <AutocompleteInput 
                        value={formData["Required Supplier"] || ''} 
                        onChange={(val) => handleInputChange("Required Supplier", val)}
                        suggestions={metadata.uniqueValues["Required Supplier"] || []}
                        placeholder="Search or enter supplier..."
                        className="form-control"
                        matchType="contains"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Costing Price $</label>
                      <input 
                        type="text" className="form-control" 
                        value={formData["Costing Price $"] || ''} 
                        onChange={(e) => handleInputChange("Costing Price $", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Column 2: Supply, Delivery & LC Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ color: 'var(--info-color)', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.3rem', marginBottom: '0.5rem' }}>
                      Supply, Delivery & LC
                    </h4>

                    <div className="form-group">
                      <label className="form-label">Demand</label>
                      <input 
                        type="number" step="any" className="form-control" 
                        value={formData["Demand"] || '0'} 
                        onChange={(e) => handleInputChange("Demand", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Receive</label>
                      <input 
                        type="number" step="any" className="form-control" 
                        value={formData["Receive"] || '0'} 
                        onChange={(e) => handleInputChange("Receive", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Yet to Receive (Auto-calculated)</label>
                      <input 
                        type="text" className="form-control" disabled 
                        value={formData["Yet to Receive"] || '0.00'} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">PPC Asking (1st)</label>
                      <input 
                        type="text" className="form-control" 
                        value={formData["PPC Asking (1st)"] || ''} 
                        onChange={(e) => handleInputChange("PPC Asking (1st)", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Procurement 1st Cons</label>
                      <input 
                        type="text" className="form-control" 
                        value={formData["Procurement 1st Cons"] || ''} 
                        onChange={(e) => handleInputChange("Procurement 1st Cons", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Actual Delivery Date</label>
                      <input 
                        type="text" className="form-control" 
                        value={formData["Actual delivery date"] || ''} 
                        onChange={(e) => handleInputChange("Actual delivery date", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">PI / Actual Supplier</label>
                      <input 
                        type="text" className="form-control" 
                        value={formData["PI /Actual Supplier"] || ''} 
                        onChange={(e) => handleInputChange("PI /Actual Supplier", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">PI No / SAP PO</label>
                      <input 
                        type="text" className="form-control" 
                        value={formData["PI No/SAP PO"] || ''} 
                        onChange={(e) => handleInputChange("PI No/SAP PO", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">PI Date</label>
                      <input 
                        type="text" className="form-control" 
                        value={formData["PI Date"] || ''} 
                        onChange={(e) => handleInputChange("PI Date", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">LC Open</label>
                      <input 
                        type="text" className="form-control" 
                        value={formData["LC Open"] || ''} 
                        onChange={(e) => handleInputChange("LC Open", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">LC No</label>
                      <input 
                        type="text" className="form-control" 
                        value={formData["LC No"] || ''} 
                        onChange={(e) => handleInputChange("LC No", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">LC Kg</label>
                      <input 
                        type="text" className="form-control" 
                        value={formData["LC Kg"] || ''} 
                        onChange={(e) => handleInputChange("LC Kg", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Remarks</label>
                      <input 
                        type="text" className="form-control" 
                        value={formData["Remarks"] || ''} 
                        onChange={(e) => handleInputChange("Remarks", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" className="btn" 
                  onClick={handleResetForm}
                  style={{ marginRight: 'auto', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                >
                  Reset Form
                </button>
                <button 
                  type="button" className="btn" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" className="btn btn-primary"
                >
                  {isEditMode ? 'Save Changes' : 'Create Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isPasswordModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-window" style={{ maxWidth: '400px', height: 'auto', padding: '2rem' }}>
            <h3 className="modal-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              🔑 Authentication Required
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', textAlign: 'left' }}>
              Please enter the administrator password to proceed.
            </p>
            <input 
              type="password" 
              className="form-control"
              placeholder="Enter password..."
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit(); }}
              autoFocus
              style={{ marginBottom: '1rem' }}
            />
            {passwordError && (
              <p style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'left' }}>
                {passwordError}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                type="button"
                className="btn" 
                onClick={() => { setIsPasswordModalOpen(false); setPasswordValue(''); setPasswordError(''); }}
              >
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handlePasswordSubmit}>
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
